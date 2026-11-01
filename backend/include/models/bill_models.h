#pragma once
#include <string>
#include <vector>
#include <optional>
#include <nlohmann/json.hpp>

namespace vidhora {

/**
 * BillCalculationInput
 * Input parameters for electricity bill estimation and savings simulation.
 */
struct BillCalculationInput {
    double tariffPerKwh = 0.0;                  // Tariff in ₹/kWh (must be >= 0)
    double fixedMonthlyCharge = 0.0;            // Fixed monthly meter/connection charge in ₹
    double additionalCharges = 0.0;             // Taxes, fuel surcharges, regulatory fees in ₹
    bool isAdditionalChargeMonthly = true;      // Clarification: true if monthly recurring, false if one-time
    std::vector<double> reductionPercentages = {10.0, 20.0, 30.0}; // Default reduction scenarios
    std::optional<double> customReductionPercent = std::nullopt;   // Optional user-specified %
    std::string timeRangeMode = "ALL";          // "ALL", "WEEKLY", "MONTHLY", "CUSTOM"
    std::string startDate;                      // Optional custom start date (YYYY-MM-DD)
    std::string endDate;                        // Optional custom end date (YYYY-MM-DD)
    int daysInBillingMonth = 30;                // Billing cycle days (default 30)
};

/**
 * SavingsSimulationResult
 * Simulated bill and projected savings for a single consumption reduction percentage.
 */
struct SavingsSimulationResult {
    double reductionPercentage = 0.0;           // Percentage reduction (e.g. 10.0 for 10%)
    double reducedConsumption = 0.0;            // Consumption after reduction (kWh)
    double newEstimatedBill = 0.0;              // Total period bill with reduced consumption (₹)
    double estimatedSavings = 0.0;              // Savings in observed period (₹)
    double projectedMonthlySavings = 0.0;       // Projected savings per billing month (₹)
    double projectedYearlySavings = 0.0;        // Projected savings per year (12 months) (₹)
};

/**
 * BillCalculationResult
 * Comprehensive bill calculation and savings simulation response.
 */
struct BillCalculationResult {
    double totalConsumption = 0.0;              // Observed total consumption (kWh)
    int observedDays = 0;                       // Count of distinct observed calendar days
    int validReadingsCount = 0;                 // Count of valid readings processed
    double tariffPerKwh = 0.0;                  // Electricity tariff applied (₹/kWh)
    double energyCharges = 0.0;                 // Total consumption * tariff (₹)
    double fixedCharges = 0.0;                  // Monthly fixed charge parameter (₹/mo)
    double additionalCharges = 0.0;             // Additional charge parameter (₹)
    bool isAdditionalChargeMonthly = true;      // Clarified charge frequency
    double billingCycles = 0.0;                 // Number of billing cycles in observed period (observedDays / daysInBillingMonth)
    double periodFixedCharges = 0.0;            // Fixed charges prorated for observed period (₹)
    double periodAdditionalCharges = 0.0;       // Additional charges prorated for observed period (₹)
    double estimatedBill = 0.0;                 // Total Estimated Bill for Dataset Period (₹)
    double averageDailyConsumption = 0.0;       // Total consumption / observed days (kWh/day)
    double averageDailyCost = 0.0;              // Energy charges / observed days (₹/day)
    double projectedMonthlyConsumption = 0.0;   // Avg daily consumption * billing days (kWh)
    double projectedMonthlyBill = 0.0;          // Projected Monthly Bill (Primary Highlighted Result) (₹)
    double projectedYearlyConsumption = 0.0;    // Projected yearly consumption (kWh)
    double projectedYearlyBill = 0.0;           // Projected Yearly Bill (12 months) (₹)
    int daysInBillingMonth = 30;                // Billing cycle days used for projection
    bool isReliableMonthlyEstimate = false;     // True if >= 7 days of data observed
    std::string reliabilityReason;              // Clear message explaining reliability or limitations
    std::string billingPeriodLabel;             // Descriptive label of the evaluated period
    std::string startDate;                      // Start date of observation period
    std::string endDate;                        // End date of observation period
    std::vector<SavingsSimulationResult> savingsSimulations; // Simulation scenarios (10%, 20%, 30%, custom)
    std::vector<std::string> calculationAssumptions;         // Explicit list of calculation assumptions
};

} // namespace vidhora
