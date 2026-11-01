// Vidhora C++ Bill Estimator & Savings Simulator - Unit Tests
// Comprehensive verification of all calculation, validation, and projection rules.

#include "services/bill_calculator.h"
#include <iostream>
#include <cmath>
#include <string>
#include <vector>
#include <limits>

using namespace vidhora;

static int g_passed = 0;
static int g_failed = 0;

static void check(bool condition, const std::string& name) {
    if (condition) {
        std::cout << "  [PASS] " << name << "\n";
        ++g_passed;
    } else {
        std::cout << "  [FAIL] " << name << "\n";
        ++g_failed;
    }
}

static bool near(double a, double b, double eps = 0.05) {
    return std::fabs(a - b) < eps;
}

static ElectricityReading make_reading(const std::string& id, const std::string& date, double cons) {
    ElectricityReading r;
    r.id = id;
    r.date = date;
    r.time = "12:00";
    r.totalConsumption = cons;
    return r;
}

// ─── 1. Normal bill calculation ──────────────────────────────────────────────
void test_normal_bill_calculation() {
    std::cout << "\n[1. Normal Bill Calculation]\n";
    // 30 days of 20 kWh = 600 kWh total (exactly 1 billing cycle of 30 days)
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-03-" + dayStr, 20.0));
    }

    BillCalculationInput input;
    input.tariffPerKwh = 8.0;
    input.fixedMonthlyCharge = 150.0;
    input.additionalCharges = 50.0;
    input.isAdditionalChargeMonthly = true;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    check(near(res.totalConsumption, 600.0), "Total consumption = 600.0 kWh");
    check(res.observedDays == 30, "Observed days = 30");
    check(near(res.billingCycles, 1.0), "Billing cycles = 1.0");
    check(near(res.energyCharges, 4800.0), "Energy charges = ₹4800.0 (600 * 8)");
    check(near(res.periodFixedCharges, 150.0), "Period fixed charges = ₹150.0 (150 * 1.0)");
    check(near(res.periodAdditionalCharges, 50.0), "Period additional charges = ₹50.0");
    check(near(res.estimatedBill, 5000.0), "Total estimated bill = ₹5000.0 (4800 + 150 + 50)");
    check(near(res.averageDailyCost, 160.0), "Average daily cost = ₹160.0/day (4800 / 30)");
    check(near(res.averageDailyConsumption, 20.0), "Average daily consumption = 20.0 kWh/day");
    check(near(res.projectedMonthlyConsumption, 600.0), "Projected monthly consumption = 600.0 kWh");
    check(near(res.projectedMonthlyBill, 5000.0), "Projected monthly bill = ₹5000.0");
    check(near(res.projectedYearlyBill, 60000.0), "Projected yearly bill = ₹60000.0 (5000 * 12)");
    check(res.isReliableMonthlyEstimate == true, "Reliability = true for 30 days");
}

// ─── 2. Zero consumption ─────────────────────────────────────────────────────
void test_zero_consumption() {
    std::cout << "\n[2. Zero Consumption]\n";
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-04-" + dayStr, 0.0));
    }

    BillCalculationInput input;
    input.tariffPerKwh = 7.5;
    input.fixedMonthlyCharge = 100.0;
    input.additionalCharges = 20.0;
    input.isAdditionalChargeMonthly = true;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    check(near(res.totalConsumption, 0.0), "Total consumption = 0.0 kWh");
    check(near(res.energyCharges, 0.0), "Energy charges = ₹0.0");
    check(near(res.estimatedBill, 120.0), "Estimated bill = fixed + additional = ₹120.0");
    check(near(res.averageDailyCost, 0.0), "Average daily cost = 0.0");
    check(near(res.projectedMonthlyConsumption, 0.0), "Projected monthly consumption = 0.0");
    check(near(res.projectedMonthlyBill, 120.0), "Projected monthly bill = fixed + additional = ₹120.0");
    check(near(res.projectedYearlyBill, 1440.0), "Projected yearly bill = ₹1440.0 (120 * 12)");

    for (const auto& sim : res.savingsSimulations) {
        check(near(sim.estimatedSavings, 0.0), "Simulation savings = 0.0 when consumption is 0");
    }
}

// ─── 3. Invalid negative tariff ───────────────────────────────────────────────
void test_invalid_negative_tariff() {
    std::cout << "\n[3. Invalid Negative Tariff]\n";
    BillCalculationInput input;
    input.tariffPerKwh = -5.0;

    std::string err;
    bool valid = BillCalculator::validate_input(input, err);
    check(!valid, "Negative tariff rejected by validation");
    check(!err.empty(), "Error message returned for negative tariff");

    bool tariffValid = BillCalculator::validate_tariff(-0.01, err);
    check(!tariffValid, "-0.01 tariff rejected");
}

// ─── 4. Missing / corrupt readings ───────────────────────────────────────────
void test_missing_readings() {
    std::cout << "\n[4. Missing or Corrupt Readings]\n";
    std::vector<ElectricityReading> readings;
    readings.push_back(make_reading("r1", "2024-05-01", 15.0));
    readings.push_back(make_reading("r2", "2024-05-02", -99.0)); // Negative (invalid)
    readings.push_back(make_reading("r3", "", 20.0));            // Missing date
    readings.push_back(make_reading("r4", "2024-05-03", std::numeric_limits<double>::quiet_NaN())); // NaN
    readings.push_back(make_reading("r5", "2024-05-04", std::numeric_limits<double>::infinity()));  // Inf
    readings.push_back(make_reading("r6", "2024-05-05", 25.0)); // Valid

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    check(res.validReadingsCount == 2, "Only 2 valid readings counted");
    check(near(res.totalConsumption, 40.0), "Total consumption = 40.0 kWh (15 + 25)");
    check(res.observedDays == 2, "Observed days = 2");
}

// ─── 5. Empty dataset ────────────────────────────────────────────────────────
void test_empty_dataset() {
    std::cout << "\n[5. Empty Dataset]\n";
    std::vector<ElectricityReading> empty;

    BillCalculationInput input;
    input.tariffPerKwh = 8.0;
    input.fixedMonthlyCharge = 100.0;
    input.additionalCharges = 25.0;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(empty, input);

    check(res.observedDays == 0, "Empty dataset observed days = 0");
    check(near(res.totalConsumption, 0.0), "Empty dataset total consumption = 0.0");
    check(near(res.estimatedBill, 0.0), "Empty dataset bill = 0.0");
    check(near(res.averageDailyCost, 0.0), "Empty dataset avg daily cost = 0.0");
    check(near(res.projectedMonthlyBill, 0.0), "Empty dataset projected monthly bill = 0.0");
    check(near(res.projectedYearlyBill, 0.0), "Empty dataset projected yearly bill = 0.0");
    check(res.isReliableMonthlyEstimate == false, "Empty dataset isReliable = false");
    check(!res.reliabilityReason.empty(), "Reliability reason explains no readings");
}

// ─── 6. Fixed monthly charges & billing cycles multiplication ────────────────
void test_fixed_monthly_charges() {
    std::cout << "\n[6. Fixed Monthly Charges & Billing Cycles]\n";
    // Test dataset with 60 days (exactly 2 billing cycles of 30 days)
    std::vector<ElectricityReading> readings60;
    for (int i = 1; i <= 60; ++i) {
        std::string d = "2024-06-" + std::string(i < 10 ? "0" : "") + std::to_string(i);
        readings60.push_back(make_reading("r" + std::to_string(i), d, 10.0));
    } // 600 kWh total over 60 days = 10 kWh/day

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.fixedMonthlyCharge = 200.0; // ₹200 / month
    input.additionalCharges = 0.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings60, input);

    // 60 days / 30 = 2.0 cycles
    check(near(res.billingCycles, 2.0), "Billing cycles = 2.0 for 60 days");
    check(near(res.periodFixedCharges, 400.0), "Period fixed charges multiplied by 2 cycles = ₹400.0");
    check(near(res.energyCharges, 6000.0), "Energy charges = ₹6000.0");
    check(near(res.estimatedBill, 6400.0), "Estimated bill = ₹6400.0 (6000 + 400)");
    check(near(res.projectedMonthlyBill, 3200.0), "Projected monthly bill = ₹3200.0 (300*10 + 200)");
    check(near(res.projectedYearlyBill, 38400.0), "Projected yearly bill = ₹38400.0 (3200 * 12)");

    // Savings for 10% reduction: only energy charge reduces, period fixed charges stay ₹400
    const auto& sim10 = res.savingsSimulations[0];
    check(near(sim10.reducedConsumption, 540.0), "Reduced consumption = 540 kWh");
    check(near(sim10.newEstimatedBill, 5800.0), "New estimated bill = ₹5800.0 (5400 + 400)");
    check(near(sim10.estimatedSavings, 600.0), "Estimated savings = ₹600.0 (only energy savings)");
}

// ─── 7. Additional charges (monthly vs one-time clarification) ───────────────
void test_additional_charges() {
    std::cout << "\n[7. Additional Charges (Monthly vs One-Time)]\n";
    std::vector<ElectricityReading> readings60;
    for (int i = 1; i <= 60; ++i) {
        readings60.push_back(make_reading("r" + std::to_string(i), "2024-07-" + std::to_string(i), 10.0));
    }

    // Case A: Additional charge is monthly (e.g. ₹50/month)
    BillCalculationInput inputMonthly;
    inputMonthly.tariffPerKwh = 5.0;
    inputMonthly.fixedMonthlyCharge = 100.0;
    inputMonthly.additionalCharges = 50.0;
    inputMonthly.isAdditionalChargeMonthly = true;
    inputMonthly.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult resMonthly = calc.calculate(readings60, inputMonthly);
    // 60 days = 2 cycles -> additional = 50 * 2 = 100
    check(near(resMonthly.periodAdditionalCharges, 100.0), "Monthly additional charges multiplied across cycles = ₹100.0");

    // Case B: Additional charge is one-time (e.g. ₹50 one-time connection fee)
    BillCalculationInput inputOneTime = inputMonthly;
    inputOneTime.isAdditionalChargeMonthly = false;

    BillCalculationResult resOneTime = calc.calculate(readings60, inputOneTime);
    check(near(resOneTime.periodAdditionalCharges, 50.0), "One-time additional charges applied as ₹50.0 flat");
}

// ─── 8. 10% savings calculation ──────────────────────────────────────────────
void test_savings_10_percent() {
    std::cout << "\n[8. 10% Savings Calculation]\n";
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-08-" + dayStr, 10.0));
    } // 300 kWh total, 30 days -> 10 kWh/day

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.fixedMonthlyCharge = 100.0;
    input.additionalCharges = 0.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    const auto& sim10 = res.savingsSimulations[0];
    check(near(sim10.reductionPercentage, 10.0), "10% reduction simulation");
    check(near(sim10.reducedConsumption, 270.0), "Reduced consumption = 270.0 kWh (300 * 0.9)");
    check(near(sim10.newEstimatedBill, 2800.0), "New estimated bill = ₹2800.0 (270*10 + 100)");
    check(near(sim10.estimatedSavings, 300.0), "Observed savings = ₹300.0 ((3000+100) - 2800)");
    check(near(sim10.projectedMonthlySavings, 300.0), "Projected monthly savings = ₹300.0");
    check(near(sim10.projectedYearlySavings, 3600.0), "Projected yearly savings = ₹3600.0 (300 * 12)");
}

// ─── 9. 20% savings calculation ──────────────────────────────────────────────
void test_savings_20_percent() {
    std::cout << "\n[9. 20% Savings Calculation]\n";
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-08-" + dayStr, 10.0));
    }

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.fixedMonthlyCharge = 100.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    const auto& sim20 = res.savingsSimulations[1];
    check(near(sim20.reductionPercentage, 20.0), "20% reduction simulation");
    check(near(sim20.reducedConsumption, 240.0), "Reduced consumption = 240.0 kWh (300 * 0.8)");
    check(near(sim20.newEstimatedBill, 2500.0), "New estimated bill = ₹2500.0 (240*10 + 100)");
    check(near(sim20.estimatedSavings, 600.0), "Observed savings = ₹600.0");
    check(near(sim20.projectedMonthlySavings, 600.0), "Projected monthly savings = ₹600.0");
    check(near(sim20.projectedYearlySavings, 7200.0), "Projected yearly savings = ₹7200.0");
}

// ─── 10. 30% savings calculation ─────────────────────────────────────────────
void test_savings_30_percent() {
    std::cout << "\n[10. 30% Savings Calculation]\n";
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-08-" + dayStr, 10.0));
    }

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.fixedMonthlyCharge = 100.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    const auto& sim30 = res.savingsSimulations[2];
    check(near(sim30.reductionPercentage, 30.0), "30% reduction simulation");
    check(near(sim30.reducedConsumption, 210.0), "Reduced consumption = 210.0 kWh (300 * 0.7)");
    check(near(sim30.newEstimatedBill, 2200.0), "New estimated bill = ₹2200.0 (210*10 + 100)");
    check(near(sim30.estimatedSavings, 900.0), "Observed savings = ₹900.0");
    check(near(sim30.projectedMonthlySavings, 900.0), "Projected monthly savings = ₹900.0");
    check(near(sim30.projectedYearlySavings, 10800.0), "Projected yearly savings = ₹10800.0");
}

// ─── 11. Custom reduction percentage ─────────────────────────────────────────
void test_custom_reduction_percentage() {
    std::cout << "\n[11. Custom Reduction Percentage]\n";
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 30; ++i) {
        std::string dayStr = (i < 10 ? "0" : "") + std::to_string(i);
        readings.push_back(make_reading("r" + std::to_string(i), "2024-09-" + dayStr, 10.0));
    } // 300 kWh across 30 days = 10 kWh/day

    BillCalculationInput input;
    input.tariffPerKwh = 8.0;
    input.fixedMonthlyCharge = 50.0;
    input.customReductionPercent = 15.0; // Custom 15%
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(readings, input);

    check(res.savingsSimulations.size() == 4, "4 simulation scenarios present");

    bool foundCustom = false;
    for (const auto& sim : res.savingsSimulations) {
        if (near(sim.reductionPercentage, 15.0)) {
            foundCustom = true;
            check(near(sim.reducedConsumption, 255.0), "Custom 15% reduced consumption = 255.0 kWh");
            check(near(sim.estimatedSavings, 360.0), "Custom 15% observed savings = ₹360.0 (45 kWh * 8)");
            check(near(sim.projectedMonthlySavings, 360.0), "Custom 15% monthly savings = ₹360.0");
            check(near(sim.projectedYearlySavings, 4320.0), "Custom 15% yearly savings = ₹4320.0");
        }
    }
    check(foundCustom, "Custom 15% simulation found in results");
}

// ─── 12. Invalid reduction percentage ────────────────────────────────────────
void test_invalid_reduction_percentage() {
    std::cout << "\n[12. Invalid Reduction Percentage]\n";
    std::string err;

    check(!BillCalculator::validate_reduction_percent(-5.0, err), "Negative percentage rejected");
    check(!BillCalculator::validate_reduction_percent(105.0, err), "Percentage > 100 rejected");
    check(BillCalculator::validate_reduction_percent(0.0, err), "0% is valid");
    check(BillCalculator::validate_reduction_percent(100.0, err), "100% is valid");

    BillCalculationInput input;
    input.customReductionPercent = 150.0;
    check(!BillCalculator::validate_input(input, err), "Custom percent > 100 rejected by validate_input");
}

// ─── 13. Division-by-zero protection ─────────────────────────────────────────
void test_division_by_zero_protection() {
    std::cout << "\n[13. Division-by-Zero Protection]\n";
    std::vector<ElectricityReading> empty;

    BillCalculationInput input;
    input.tariffPerKwh = 10.0;
    input.daysInBillingMonth = 30;

    BillCalculator calc;
    BillCalculationResult res = calc.calculate(empty, input);

    check(std::isfinite(res.averageDailyCost), "Average daily cost is finite (not NaN/Inf)");
    check(res.averageDailyCost == 0.0, "Average daily cost is 0.0 when 0 days");
    check(std::isfinite(res.averageDailyConsumption), "Average daily consumption is finite");
    check(res.averageDailyConsumption == 0.0, "Average daily consumption is 0.0 when 0 days");
    check(std::isfinite(res.projectedMonthlyConsumption), "Projected monthly consumption is finite");
    check(res.projectedMonthlyConsumption == 0.0, "Projected monthly consumption is 0.0 when 0 days");
    check(std::isfinite(res.projectedMonthlyBill), "Projected monthly bill is finite");
    check(std::isfinite(res.projectedYearlyBill), "Projected yearly bill is finite");
}

// ─── 14. Monthly and yearly projection with different observation periods ────
void test_monthly_projection_observation_periods() {
    std::cout << "\n[14. Observation Periods & Projections]\n";
    BillCalculator calc;
    BillCalculationInput input;
    input.tariffPerKwh = 8.0;
    input.fixedMonthlyCharge = 100.0;
    input.additionalCharges = 20.0;
    input.isAdditionalChargeMonthly = true;
    input.daysInBillingMonth = 30;

    // Period A: 3 days (10 kWh/day -> total 30 kWh)
    std::vector<ElectricityReading> readings3;
    for (int i = 1; i <= 3; ++i) {
        readings3.push_back(make_reading("r" + std::to_string(i), "2024-10-0" + std::to_string(i), 10.0));
    }
    BillCalculationResult res3 = calc.calculate(readings3, input);

    // Period B: 14 days (10 kWh/day -> total 140 kWh)
    std::vector<ElectricityReading> readings14;
    for (int i = 1; i <= 14; ++i) {
        std::string d = (i < 10 ? "0" : "") + std::to_string(i);
        readings14.push_back(make_reading("r" + std::to_string(i), "2024-10-" + d, 10.0));
    }
    BillCalculationResult res14 = calc.calculate(readings14, input);

    // Period C: 30 days (10 kWh/day -> total 300 kWh)
    std::vector<ElectricityReading> readings30;
    for (int i = 1; i <= 30; ++i) {
        std::string d = (i < 10 ? "0" : "") + std::to_string(i);
        readings30.push_back(make_reading("r" + std::to_string(i), "2024-11-" + d, 10.0));
    }
    BillCalculationResult res30 = calc.calculate(readings30, input);

    // All should project to 300.0 kWh monthly consumption (10 kWh/day * 30 days)
    check(near(res3.projectedMonthlyConsumption, 300.0), "3-day observation projects to 300 kWh");
    check(near(res14.projectedMonthlyConsumption, 300.0), "14-day observation projects to 300 kWh");
    check(near(res30.projectedMonthlyConsumption, 300.0), "30-day observation projects to 300 kWh");

    // Monthly bill: 300 * 8 + 100 + 20 = 2520
    check(near(res3.projectedMonthlyBill, 2520.0), "3-day projected monthly bill = ₹2520.0");
    check(near(res14.projectedMonthlyBill, 2520.0), "14-day projected monthly bill = ₹2520.0");
    check(near(res30.projectedMonthlyBill, 2520.0), "30-day projected monthly bill = ₹2520.0");

    // Yearly bill: 2520 * 12 = 30240
    check(near(res3.projectedYearlyBill, 30240.0), "3-day projected yearly bill = ₹30240.0 (2520 * 12)");
    check(near(res14.projectedYearlyBill, 30240.0), "14-day projected yearly bill = ₹30240.0");
    check(near(res30.projectedYearlyBill, 30240.0), "30-day projected yearly bill = ₹30240.0");

    // Reliability distinction:
    check(res3.isReliableMonthlyEstimate == false, "3 days (< 7) is NOT marked reliable");
    check(res14.isReliableMonthlyEstimate == true, "14 days (>= 7) is marked reliable");
    check(res30.isReliableMonthlyEstimate == true, "30 days (>= 7) is marked reliable");
}

int main() {
    std::cout << "=====================================================\n";
    std::cout << " Vidhora - Electricity Bill & Savings Unit Tests\n";
    std::cout << "=====================================================\n";

    test_normal_bill_calculation();
    test_zero_consumption();
    test_invalid_negative_tariff();
    test_missing_readings();
    test_empty_dataset();
    test_fixed_monthly_charges();
    test_additional_charges();
    test_savings_10_percent();
    test_savings_20_percent();
    test_savings_30_percent();
    test_custom_reduction_percentage();
    test_invalid_reduction_percentage();
    test_division_by_zero_protection();
    test_monthly_projection_observation_periods();

    std::cout << "\n=====================================================\n";
    std::cout << " Results: " << g_passed << " Passed, " << g_failed << " Failed\n";
    std::cout << "=====================================================\n";

    return (g_failed == 0) ? 0 : 1;
}
