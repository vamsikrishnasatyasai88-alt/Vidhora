#pragma once
#include <string>
#include <vector>
#include <map>
#include <optional>
#include <nlohmann/json.hpp>

namespace vidhora {

// ─── Enumerations ────────────────────────────────────────────────────────────

enum class SeverityLevel { NORMAL, LOW, MEDIUM, HIGH };
enum class PatternType   { NORMAL, TEMPORARY_SPIKE, PERSISTENT_CHANGE };
enum class BaselineMethod{ HISTORICAL_AVERAGE, MOVING_AVERAGE };
enum class TimeRangeMode { ALL, WEEKLY, MONTHLY, CUSTOM };
enum class TrendDirection{ INCREASING, STABLE, DECREASING };
enum class SortField     { DATE, CONSUMPTION, AC, REFRIGERATOR, FANS };
enum class SortOrder     { ASC, DESC };

inline std::string severity_to_string(SeverityLevel s) {
    switch (s) {
        case SeverityLevel::NORMAL: return "NORMAL";
        case SeverityLevel::LOW:    return "LOW";
        case SeverityLevel::MEDIUM: return "MEDIUM";
        case SeverityLevel::HIGH:   return "HIGH";
    }
    return "NORMAL";
}

inline SeverityLevel severity_from_string(const std::string& s) {
    if (s == "HIGH")   return SeverityLevel::HIGH;
    if (s == "MEDIUM") return SeverityLevel::MEDIUM;
    if (s == "LOW")    return SeverityLevel::LOW;
    return SeverityLevel::NORMAL;
}

inline std::string pattern_to_string(PatternType p) {
    switch (p) {
        case PatternType::TEMPORARY_SPIKE:   return "TEMPORARY_SPIKE";
        case PatternType::PERSISTENT_CHANGE: return "PERSISTENT_CHANGE";
        default:                             return "NORMAL";
    }
}

inline std::string baseline_to_string(BaselineMethod m) {
    return m == BaselineMethod::MOVING_AVERAGE ? "MOVING_AVERAGE" : "HISTORICAL_AVERAGE";
}

inline BaselineMethod baseline_from_string(const std::string& s) {
    return s == "MOVING_AVERAGE" ? BaselineMethod::MOVING_AVERAGE : BaselineMethod::HISTORICAL_AVERAGE;
}

inline std::string trend_to_string(TrendDirection d) {
    switch (d) {
        case TrendDirection::INCREASING: return "INCREASING";
        case TrendDirection::DECREASING: return "DECREASING";
        default:                         return "STABLE";
    }
}

// ─── Core data structures ────────────────────────────────────────────────────

struct ElectricityReading {
    std::string id;
    std::string date;           // YYYY-MM-DD
    std::string time;           // HH:MM
    double totalConsumption;
    std::map<std::string, double> categories;  // empty if not available
    std::string notes;
};

struct DatasetMetadata {
    std::string id;
    std::string name;
    std::string source;
    std::string sourceUrl;
    std::string type;           // "Real-world Public Dataset" etc.
    int recordCount;
    struct { std::string start; std::string end; } dateRange;
    std::string frequency;
    std::string consumptionField;
    bool hasCategories;
    std::vector<std::string> categoryFields;
    int validRecords;
    int missingRecords;
    int invalidRecords;
};

struct AppSettings {
    BaselineMethod baselineMethod    = BaselineMethod::HISTORICAL_AVERAGE;
    int            movingAverageWindow = 7;
    struct {
        double low    = 20.0;
        double medium = 40.0;
        double high   = 70.0;
    } thresholds;
    double spikeThresholdPercent = 30.0;
};

// ─── Analysis result types ───────────────────────────────────────────────────

struct StatisticalMetrics {
    int    recordCount;
    double totalConsumption;
    double averageConsumption;
    double minConsumption;
    double maxConsumption;
    double standardDeviation;
    double variance;
    double consumptionRange;
};

struct TrendAnalysis {
    TrendDirection direction;
    double slope;
    double percentageChangeOverPeriod;
    std::string description;
};

struct LargestContributor {
    std::string category;
    std::string categoryLabel;
    double baselineValue;
    double currentValue;
    double percentChange;
    double contributionSharePercent;
};

struct AnomalyRecord {
    std::string id;
    std::string readingId;
    std::string date;
    std::string time;
    double consumption;
    double baseline;
    double deviationPercent;
    SeverityLevel severity;
    PatternType   pattern;
    std::optional<LargestContributor> largestContributor;
};

struct SuddenSpikeRecord {
    std::string id;
    std::string date;
    std::string time;
    double consumption;
    double prevDayConsumption;
    double differenceKwh;
    double percentIncrease;
    SeverityLevel severity;
    std::string spikeType;  // "TEMPORARY_SPIKE" | "PERSISTENT_INCREASE"
    std::string driverCategory;
    std::string driverCategoryLabel;
};

struct PatternRecord {
    std::string id;
    PatternType type;
    std::string startDate;
    std::string endDate;
    int    durationDays;
    double averageConsumption;
    double averageBaseline;
    double averageDeviationPercent;
    SeverityLevel severity;
    std::string primaryCategoryDriver;
    std::string explanation;
};

struct CategoryComparison {
    std::string category;
    std::string label;
    double baselineValue;
    double currentValue;
    double absoluteChange;
    double percentChange;
    double sharePercent;
};

struct InsightReport {
    std::string summaryTitle;
    std::string explainableParagraph;
    std::vector<std::string> keyDrivers;
    std::vector<std::string> recommendations;
    std::string technicalSummary;
};

struct TimeRangeInfo {
    TimeRangeMode mode;
    std::string   label;
    std::string   startDate;
    std::string   endDate;
};

struct CustomDateRange {
    std::string startDate;
    std::string endDate;
};

struct AnalysisResults {
    StatisticalMetrics       metrics;
    double                   baselineValue;
    BaselineMethod           baselineMethod;
    struct { double min; double max; } normalRange;
    TrendAnalysis            trend;
    std::vector<AnomalyRecord>       anomalies;
    std::vector<SuddenSpikeRecord>   suddenSpikes;
    std::vector<PatternRecord>       patterns;
    std::vector<CategoryComparison>  categoryComparisons;
    InsightReport            insights;
    TimeRangeInfo            timeRangeInfo;
    bool                     hasCategories;
};

struct ColumnMapping {
    std::string dateCol;
    std::string timeCol;
    std::string consumptionCol;
    std::map<std::string, std::string> categoryCols; // categoryKey -> originalHeader
};

struct CSVParseResult {
    bool success;
    std::vector<ElectricityReading> readings;
    DatasetMetadata metadata;
    ColumnMapping   columnMapping;
    std::vector<std::map<std::string, std::string>> previewRows;
    std::vector<std::string> errors;
    std::vector<std::string> warnings;
};

// ─── Category label helper ───────────────────────────────────────────────────
inline std::string category_label(const std::string& key) {
    if (key == "airConditioning") return "Air Conditioning";
    if (key == "refrigerator")    return "Refrigerator";
    if (key == "fans")            return "Fans";
    if (key == "lighting")        return "Lighting";
    if (key == "washingMachine")  return "Washing Machine";
    if (key == "other")           return "Other Appliances";
    return key;
}

} // namespace vidhora
