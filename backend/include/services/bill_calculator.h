#pragma once
#include "models/types.h"
#include "models/bill_models.h"
#include <vector>
#include <string>

namespace vidhora {

/**
 * BillCalculator
 * Object-Oriented service class responsible for electricity bill estimation,
 * input validation, period aggregation, and energy savings simulations.
 */
class BillCalculator {
public:
    BillCalculator() = default;
    ~BillCalculator() = default;

    /**
     * Validates input tariff per kWh.
     * Tariff must be non-negative and finite.
     */
    static bool validate_tariff(double tariff, std::string& outError);

    /**
     * Validates fixed monthly charges and additional charges.
     * Values must be non-negative and finite.
     */
    static bool validate_charges(double fixedCharge, double additionalCharges, std::string& outError);

    /**
     * Validates a reduction percentage (0.0 to 100.0).
     */
    static bool validate_reduction_percent(double percent, std::string& outError);

    /**
     * Validates the complete BillCalculationInput object.
     * Returns true if valid, or false with an explanation in outError.
     */
    static bool validate_input(const BillCalculationInput& input, std::string& outError);

    /**
     * Extracts and validates consumption metrics from raw electricity readings:
     * - Filters out negative, NaN, or non-finite readings.
     * - Determines distinct calendar days.
     * - Determines observation date bounds.
     */
    static void extract_consumption_summary(
        const std::vector<ElectricityReading>& readings,
        double& outTotalConsumption,
        int& outObservedDays,
        int& outValidReadingsCount,
        std::string& outStartDate,
        std::string& outEndDate
    );

    /**
     * Calculates the estimated bill, daily costs, and monthly projections
     * for the provided readings and calculation input parameters.
     */
    BillCalculationResult calculate(
        const std::vector<ElectricityReading>& readings,
        const BillCalculationInput& input
    ) const;

    /**
     * Simulates consumption reduction and calculates savings.
     * Fixed charges are strictly maintained and NOT treated as variable savings.
     */
    SavingsSimulationResult simulate_savings(
        double originalConsumption,
        double tariff,
        double fixedCharges,
        double additionalCharges,
        double reductionPercent,
        int observedDays,
        int daysInBillingMonth
    ) const;

private:
    /**
     * Generates human-readable, transparent calculation assumptions.
     */
    std::vector<std::string> generate_assumptions(
        const BillCalculationInput& input,
        const BillCalculationResult& result
    ) const;
};

} // namespace vidhora
