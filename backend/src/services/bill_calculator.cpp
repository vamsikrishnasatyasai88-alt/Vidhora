#include "services/bill_calculator.h"
#include "utils/json_helpers.h"
#include <cmath>
#include <set>
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace vidhora {

// ─── Input Validation ────────────────────────────────────────────────────────

bool BillCalculator::validate_tariff(double tariff, std::string& outError) {
    if (!std::isfinite(tariff)) {
        outError = "Tariff per kWh must be a valid finite number.";
        return false;
    }
    if (tariff < 0.0) {
        outError = "Tariff per kWh cannot be negative.";
        return false;
    }
    return true;
}

bool BillCalculator::validate_charges(double fixedCharge, double additionalCharges, std::string& outError) {
    if (!std::isfinite(fixedCharge) || fixedCharge < 0.0) {
        outError = "Fixed monthly charge must be a non-negative finite number.";
        return false;
    }
    if (!std::isfinite(additionalCharges) || additionalCharges < 0.0) {
        outError = "Additional charges must be a non-negative finite number.";
        return false;
    }
    return true;
}

bool BillCalculator::validate_reduction_percent(double percent, std::string& outError) {
    if (!std::isfinite(percent)) {
        outError = "Reduction percentage must be a valid finite number.";
        return false;
    }
    if (percent < 0.0 || percent > 100.0) {
        outError = "Reduction percentage must be between 0% and 100%.";
        return false;
    }
    return true;
}

bool BillCalculator::validate_input(const BillCalculationInput& input, std::string& outError) {
    if (!validate_tariff(input.tariffPerKwh, outError)) {
        return false;
    }
    if (!validate_charges(input.fixedMonthlyCharge, input.additionalCharges, outError)) {
        return false;
    }
    for (double p : input.reductionPercentages) {
        if (!validate_reduction_percent(p, outError)) {
            return false;
        }
    }
    if (input.customReductionPercent.has_value()) {
        if (!validate_reduction_percent(*input.customReductionPercent, outError)) {
            return false;
        }
    }
    if (input.daysInBillingMonth <= 0) {
        outError = "Days in billing month must be greater than zero.";
        return false;
    }
    return true;
}

// ─── Consumption Aggregation ──────────────────────────────────────────────────

void BillCalculator::extract_consumption_summary(
    const std::vector<ElectricityReading>& readings,
    double& outTotalConsumption,
    int& outObservedDays,
    int& outValidReadingsCount,
    std::string& outStartDate,
    std::string& outEndDate)
{
    outTotalConsumption = 0.0;
    outObservedDays = 0;
    outValidReadingsCount = 0;
    outStartDate.clear();
    outEndDate.clear();

    if (readings.empty()) {
        return;
    }

    std::set<std::string> uniqueDates;

    for (const auto& r : readings) {
        // Safe check for valid, non-negative, finite consumption
        if (!std::isfinite(r.totalConsumption) || r.totalConsumption < 0.0) {
            continue; // Skip invalid or corrupt reading
        }
        if (r.date.empty()) {
            continue; // Skip reading with missing date
        }

        outTotalConsumption += r.totalConsumption;
        uniqueDates.insert(r.date);
        ++outValidReadingsCount;
    }

    outTotalConsumption = round2(outTotalConsumption);
    outObservedDays = static_cast<int>(uniqueDates.size());

    if (!uniqueDates.empty()) {
        outStartDate = *uniqueDates.begin();
        outEndDate = *uniqueDates.rbegin();
    }
}

// ─── Savings Simulation ───────────────────────────────────────────────────────

SavingsSimulationResult BillCalculator::simulate_savings(
    double originalConsumption,
    double tariff,
    double periodFixedCharges,
    double periodAdditionalCharges,
    double reductionPercent,
    int observedDays,
    int daysInBillingMonth) const
{
    SavingsSimulationResult sim;
    sim.reductionPercentage = round1(reductionPercent);

    // Reduced consumption = Original * (1 - Reduction / 100)
    double factor = std::max(0.0, 1.0 - (reductionPercent / 100.0));
    sim.reducedConsumption = round2(originalConsumption * factor);

    // Energy charge for reduced consumption (only variable portion decreases)
    double newEnergyCharge = round2(sim.reducedConsumption * tariff);

    // Fixed charges and additional charges remain strictly unchanged
    sim.newEstimatedBill = round2(newEnergyCharge + periodFixedCharges + periodAdditionalCharges);

    // Estimated savings in observed period:
    // Original Estimated Bill - New Estimated Bill
    double originalEnergyCharge = round2(originalConsumption * tariff);
    double originalBill = round2(originalEnergyCharge + periodFixedCharges + periodAdditionalCharges);
    sim.estimatedSavings = round2(std::max(0.0, originalBill - sim.newEstimatedBill));

    // Projected Monthly and Yearly Savings:
    // Fixed charges do not scale with consumption, so savings purely derive from reduced energy units.
    if (observedDays > 0 && daysInBillingMonth > 0) {
        double avgDailyConsumption = originalConsumption / static_cast<double>(observedDays);
        double projMonthlyConsumption = avgDailyConsumption * static_cast<double>(daysInBillingMonth);
        double monthlyEnergySavingsUnits = projMonthlyConsumption * (reductionPercent / 100.0);
        sim.projectedMonthlySavings = round2(std::max(0.0, monthlyEnergySavingsUnits * tariff));
        sim.projectedYearlySavings = round2(sim.projectedMonthlySavings * 12.0);
    } else {
        sim.projectedMonthlySavings = 0.0;
        sim.projectedYearlySavings = 0.0;
    }

    return sim;
}

// ─── Main Calculation Pipeline ────────────────────────────────────────────────

BillCalculationResult BillCalculator::calculate(
    const std::vector<ElectricityReading>& readings,
    const BillCalculationInput& input) const
{
    BillCalculationResult res;
    res.tariffPerKwh = input.tariffPerKwh;
    res.fixedCharges = input.fixedMonthlyCharge;
    res.additionalCharges = input.additionalCharges;
    res.isAdditionalChargeMonthly = input.isAdditionalChargeMonthly;
    res.daysInBillingMonth = input.daysInBillingMonth > 0 ? input.daysInBillingMonth : 30;

    // 1. Extract valid consumption and observation timeline
    extract_consumption_summary(
        readings,
        res.totalConsumption,
        res.observedDays,
        res.validReadingsCount,
        res.startDate,
        res.endDate
    );

    // Format billing period label
    if (res.observedDays == 0) {
        res.billingPeriodLabel = "No Data";
        res.billingCycles = 0.0;
    } else if (res.startDate == res.endDate) {
        res.billingPeriodLabel = res.startDate + " (1 Day)";
        res.billingCycles = round2(1.0 / static_cast<double>(res.daysInBillingMonth));
    } else {
        res.billingPeriodLabel = res.startDate + " to " + res.endDate +
                                 " (" + std::to_string(res.observedDays) + " Days)";
        res.billingCycles = round2(static_cast<double>(res.observedDays) / static_cast<double>(res.daysInBillingMonth));
    }

    // 2. Multiplied fixed charges for the selected period
    // Fixed monthly charge multiplied by the exact number of billing cycles in the observed period
    double exactCycles = (res.observedDays > 0 && res.daysInBillingMonth > 0)
        ? (static_cast<double>(res.observedDays) / static_cast<double>(res.daysInBillingMonth))
        : 0.0;

    if (res.observedDays > 0) {
        res.periodFixedCharges = round2(input.fixedMonthlyCharge * exactCycles);
        if (input.isAdditionalChargeMonthly) {
            res.periodAdditionalCharges = round2(input.additionalCharges * exactCycles);
        } else {
            res.periodAdditionalCharges = round2(input.additionalCharges);
        }
    } else {
        res.periodFixedCharges = 0.0;
        res.periodAdditionalCharges = 0.0;
    }

    // 3. Observed Energy Charges & Total Estimated Bill for Dataset Period
    res.energyCharges = round2(res.totalConsumption * input.tariffPerKwh);
    if (res.observedDays > 0) {
        res.estimatedBill = round2(res.energyCharges + res.periodFixedCharges + res.periodAdditionalCharges);
    } else {
        res.estimatedBill = 0.0;
    }

    // 4. Daily consumption and cost averages (division-by-zero protected)
    if (res.observedDays > 0) {
        res.averageDailyConsumption = round2(res.totalConsumption / static_cast<double>(res.observedDays));
        res.averageDailyCost = round2(res.energyCharges / static_cast<double>(res.observedDays));

        // Projected Monthly Calculations (Primary Highlighted Result)
        res.projectedMonthlyConsumption = round2(res.averageDailyConsumption * static_cast<double>(res.daysInBillingMonth));
        double projMonthlyEnergyCharge = round2(res.projectedMonthlyConsumption * input.tariffPerKwh);
        double monthlyAdditional = input.isAdditionalChargeMonthly ? input.additionalCharges : (exactCycles > 0.0 ? round2(input.additionalCharges / exactCycles) : 0.0);
        res.projectedMonthlyBill = round2(projMonthlyEnergyCharge + input.fixedMonthlyCharge + monthlyAdditional);

        // Projected Yearly Calculations (Separate 12-month projection)
        res.projectedYearlyConsumption = round2(res.projectedMonthlyConsumption * 12.0);
        double projYearlyEnergyCharge = round2(res.projectedYearlyConsumption * input.tariffPerKwh);
        double yearlyFixedCharges = round2(input.fixedMonthlyCharge * 12.0);
        double yearlyAdditionalCharges = input.isAdditionalChargeMonthly ? round2(input.additionalCharges * 12.0) : round2(input.additionalCharges);
        res.projectedYearlyBill = round2(projYearlyEnergyCharge + yearlyFixedCharges + yearlyAdditionalCharges);
    } else {
        res.averageDailyConsumption = 0.0;
        res.averageDailyCost = 0.0;
        res.projectedMonthlyConsumption = 0.0;
        res.projectedMonthlyBill = 0.0;
        res.projectedYearlyConsumption = 0.0;
        res.projectedYearlyBill = 0.0;
    }

    // 5. Data sufficiency & reliability evaluation
    if (res.observedDays == 0) {
        res.isReliableMonthlyEstimate = false;
        res.reliabilityReason = "No readings available in the selected period to calculate a monthly estimate.";
    } else if (res.observedDays < 7) {
        res.isReliableMonthlyEstimate = false;
        res.reliabilityReason = "Dataset contains only " + std::to_string(res.observedDays) +
                                (res.observedDays == 1 ? " day" : " days") +
                                " of data. A minimum of 7 days is recommended for a reliable monthly projection.";
    } else {
        res.isReliableMonthlyEstimate = true;
        res.reliabilityReason = "Sufficient observation period (" + std::to_string(res.observedDays) +
                                " days) for reliable monthly projection.";
    }

    // 6. Savings simulations (10%, 20%, 30% and optional custom %)
    std::vector<double> percentagesToSimulate = input.reductionPercentages;
    if (input.customReductionPercent.has_value()) {
        double customP = *input.customReductionPercent;
        bool alreadyPresent = false;
        for (double p : percentagesToSimulate) {
            if (std::fabs(p - customP) < 0.01) {
                alreadyPresent = true;
                break;
            }
        }
        if (!alreadyPresent) {
            percentagesToSimulate.push_back(customP);
        }
    }

    for (double pct : percentagesToSimulate) {
        res.savingsSimulations.push_back(
            simulate_savings(
                res.totalConsumption,
                input.tariffPerKwh,
                res.periodFixedCharges,
                res.periodAdditionalCharges,
                pct,
                res.observedDays,
                res.daysInBillingMonth
            )
        );
    }

    // 7. Explicit calculation assumptions & audit trail
    res.calculationAssumptions = generate_assumptions(input, res);

    return res;
}

// ─── Assumptions Generator ────────────────────────────────────────────────────

std::vector<std::string> BillCalculator::generate_assumptions(
    const BillCalculationInput& input,
    const BillCalculationResult& result) const
{
    std::vector<std::string> assumptions;

    std::ostringstream ssTariff;
    ssTariff << std::fixed << std::setprecision(2) << input.tariffPerKwh;
    assumptions.push_back("Flat electricity tariff of ₹" + ssTariff.str() + " per kWh applied across all consumption units.");

    std::ostringstream ssFixed, ssPeriodFixed;
    ssFixed << std::fixed << std::setprecision(2) << input.fixedMonthlyCharge;
    ssPeriodFixed << std::fixed << std::setprecision(2) << result.periodFixedCharges;

    std::ostringstream ssCycles;
    ssCycles << std::fixed << std::setprecision(2) << result.billingCycles;

    assumptions.push_back("Fixed monthly charge is ₹" + ssFixed.str() + "/month. For the " +
                          std::to_string(result.observedDays) + "-day period (" + ssCycles.str() +
                          " billing cycles of " + std::to_string(result.daysInBillingMonth) +
                          " days), total prorated fixed charges are ₹" + ssPeriodFixed.str() + ".");

    std::ostringstream ssAdd, ssPeriodAdd;
    ssAdd << std::fixed << std::setprecision(2) << input.additionalCharges;
    ssPeriodAdd << std::fixed << std::setprecision(2) << result.periodAdditionalCharges;
    if (input.isAdditionalChargeMonthly) {
        assumptions.push_back("Additional charges of ₹" + ssAdd.str() + "/month are treated as monthly recurring regulatory charges (totaling ₹" + ssPeriodAdd.str() + " for observed period).");
    } else {
        assumptions.push_back("Additional charges of ₹" + ssAdd.str() + " are treated as one-time charges for this billing period.");
    }

    assumptions.push_back("Monthly projection assumes a standard " + std::to_string(result.daysInBillingMonth) + "-day cycle: Projected Monthly Bill = (Average Daily Usage × Days in Month × Tariff) + Monthly Fixed Charge + Monthly Additional Charge.");
    assumptions.push_back("Projected Yearly Bill is calculated as 12 × Projected Monthly Bill.");

    if (result.observedDays > 0) {
        std::ostringstream ssAvg;
        ssAvg << std::fixed << std::setprecision(2) << result.averageDailyConsumption;
        assumptions.push_back("Daily consumption average (" + ssAvg.str() + " kWh/day) is derived from " +
                              std::to_string(result.observedDays) + " observed calendar days (" +
                              result.startDate + " to " + result.endDate + ") across " +
                              std::to_string(result.validReadingsCount) + " valid readings.");
    } else {
        assumptions.push_back("No valid readings detected in dataset period; zero consumption assumed.");
    }

    assumptions.push_back("Savings Simulator: Fixed charges are strictly maintained and NOT treated as variable savings; only energy charges decrease when consumption is reduced.");

    if (!result.isReliableMonthlyEstimate && result.observedDays > 0) {
        assumptions.push_back("Notice: " + result.reliabilityReason);
    }

    return assumptions;
}

} // namespace vidhora
