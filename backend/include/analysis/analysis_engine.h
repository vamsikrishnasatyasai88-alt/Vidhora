#pragma once
#include "models/types.h"
#include <vector>
#include <string>

namespace vidhora {

// ─── Statistical algorithms ───────────────────────────────────────────────────
double calculate_average(const std::vector<double>& values);
double calculate_minimum(const std::vector<double>& values);
double calculate_maximum(const std::vector<double>& values);
double calculate_standard_deviation(const std::vector<double>& values, double mean = -1.0);
double calculate_moving_average_at_index(
    const std::vector<ElectricityReading>& readings,
    int targetIndex,
    int windowSize = 7
);
double calculate_deviation_percent(double current, double baseline);
SeverityLevel detect_severity(
    double deviationPercent,
    double lowThresh   = 20.0,
    double medThresh   = 40.0,
    double highThresh  = 70.0
);

// ─── Spike / pattern detection ────────────────────────────────────────────────
std::vector<SuddenSpikeRecord> detect_sudden_spikes(
    const std::vector<ElectricityReading>& sortedReadings,
    const std::vector<AnomalyRecord>&      anomalies
);

std::vector<PatternRecord> detect_patterns(
    const std::vector<ElectricityReading>& sortedReadings,
    const std::vector<AnomalyRecord>&      anomalies
);

// ─── Search / Sort ────────────────────────────────────────────────────────────
std::vector<ElectricityReading> search_readings_by_keyword(
    const std::vector<ElectricityReading>& readings,
    const std::string& query
);

std::vector<ElectricityReading> sort_readings(
    const std::vector<ElectricityReading>& readings,
    SortField field,
    SortOrder order
);

// ─── Time range filtering ─────────────────────────────────────────────────────
struct FilterResult {
    std::vector<ElectricityReading> filteredReadings;
    std::string label;
    std::string startDate;
    std::string endDate;
};

FilterResult filter_readings_by_time_range(
    const std::vector<ElectricityReading>& readings,
    TimeRangeMode mode,
    const CustomDateRange& customRange = {}
);

// ─── Trend analysis ───────────────────────────────────────────────────────────
TrendAnalysis calculate_linear_regression_trend(
    const std::vector<ElectricityReading>& sortedReadings
);

// ─── Insight generation ───────────────────────────────────────────────────────
InsightReport generate_insight_report(
    const StatisticalMetrics&          metrics,
    double                             baselineValue,
    const TrendAnalysis&               trend,
    const std::vector<AnomalyRecord>&  anomalies,
    const std::vector<PatternRecord>&  patterns,
    const std::vector<CategoryComparison>& categoryComparisons,
    bool                               hasCategories,
    const std::string&                 timeRangeLabel
);

// ─── Main analysis pipeline ───────────────────────────────────────────────────
AnalysisResults run_full_analysis(
    const std::vector<ElectricityReading>& readings,
    const AppSettings&                     settings,
    TimeRangeMode                          timeMode   = TimeRangeMode::ALL,
    const CustomDateRange&                 customRange = {}
);

} // namespace vidhora
