#pragma once
#include "models/types.h"
#include <nlohmann/json.hpp>
#include <iomanip>
#include <sstream>
#include <cmath>

namespace vidhora {

// ─── Rounding helpers (match TypeScript's toFixed) ───────────────────────────
inline double round2(double v) {
    return std::round(v * 100.0) / 100.0;
}
inline double round1(double v) {
    return std::round(v * 10.0) / 10.0;
}
inline double round3(double v) {
    return std::round(v * 1000.0) / 1000.0;
}

// ─── ElectricityReading ───────────────────────────────────────────────────────
inline nlohmann::json reading_to_json(const ElectricityReading& r) {
    nlohmann::json j;
    j["id"] = r.id;
    j["date"] = r.date;
    j["time"] = r.time;
    j["totalConsumption"] = r.totalConsumption;
    if (!r.categories.empty()) {
        j["categories"] = r.categories;
    }
    if (!r.notes.empty()) {
        j["notes"] = r.notes;
    }
    return j;
}

inline ElectricityReading reading_from_json(const nlohmann::json& j) {
    ElectricityReading r;
    r.id = j.value("id", "");
    r.date = j.value("date", "");
    r.time = j.value("time", "");
    r.totalConsumption = j.value("totalConsumption", 0.0);
    if (j.contains("categories") && j["categories"].is_object()) {
        for (auto& [k, v] : j["categories"].items()) {
            r.categories[k] = v.get<double>();
        }
    }
    r.notes = j.value("notes", "");
    return r;
}

// ─── DatasetMetadata ──────────────────────────────────────────────────────────
inline nlohmann::json metadata_to_json(const DatasetMetadata& m) {
    nlohmann::json j;
    j["id"] = m.id;
    j["name"] = m.name;
    j["source"] = m.source;
    j["sourceUrl"] = m.sourceUrl;
    j["type"] = m.type;
    j["recordCount"] = m.recordCount;
    j["dateRange"] = { {"start", m.dateRange.start}, {"end", m.dateRange.end} };
    j["frequency"] = m.frequency;
    j["consumptionField"] = m.consumptionField;
    j["hasCategories"] = m.hasCategories;
    j["categoryFields"] = m.categoryFields;
    j["validRecords"] = m.validRecords;
    j["missingRecords"] = m.missingRecords;
    j["invalidRecords"] = m.invalidRecords;
    return j;
}

inline DatasetMetadata metadata_from_json(const nlohmann::json& j) {
    DatasetMetadata m;
    m.id = j.value("id", "");
    m.name = j.value("name", "");
    m.source = j.value("source", "");
    m.sourceUrl = j.value("sourceUrl", "");
    m.type = j.value("type", "");
    m.recordCount = j.value("recordCount", 0);
    if (j.contains("dateRange")) {
        m.dateRange.start = j["dateRange"].value("start", "");
        m.dateRange.end   = j["dateRange"].value("end", "");
    }
    m.frequency = j.value("frequency", "");
    m.consumptionField = j.value("consumptionField", "");
    m.hasCategories = j.value("hasCategories", false);
    if (j.contains("categoryFields")) m.categoryFields = j["categoryFields"].get<std::vector<std::string>>();
    m.validRecords   = j.value("validRecords", 0);
    m.missingRecords = j.value("missingRecords", 0);
    m.invalidRecords = j.value("invalidRecords", 0);
    return m;
}

// ─── AppSettings ─────────────────────────────────────────────────────────────
inline nlohmann::json settings_to_json(const AppSettings& s) {
    return {
        {"baselineMethod", baseline_to_string(s.baselineMethod)},
        {"movingAverageWindow", s.movingAverageWindow},
        {"thresholds", {
            {"low",    s.thresholds.low},
            {"medium", s.thresholds.medium},
            {"high",   s.thresholds.high}
        }},
        {"spikeThresholdPercent", s.spikeThresholdPercent}
    };
}

inline AppSettings settings_from_json(const nlohmann::json& j) {
    AppSettings s;
    s.baselineMethod = baseline_from_string(j.value("baselineMethod", "HISTORICAL_AVERAGE"));
    s.movingAverageWindow = j.value("movingAverageWindow", 7);
    if (j.contains("thresholds")) {
        s.thresholds.low    = j["thresholds"].value("low",    20.0);
        s.thresholds.medium = j["thresholds"].value("medium", 40.0);
        s.thresholds.high   = j["thresholds"].value("high",   70.0);
    }
    s.spikeThresholdPercent = j.value("spikeThresholdPercent", 30.0);
    return s;
}

// ─── AnalysisResults to JSON ─────────────────────────────────────────────────
inline nlohmann::json anomaly_to_json(const AnomalyRecord& a) {
    nlohmann::json j;
    j["id"]              = a.id;
    j["readingId"]       = a.readingId;
    j["date"]            = a.date;
    j["time"]            = a.time;
    j["consumption"]     = a.consumption;
    j["baseline"]        = a.baseline;
    j["deviationPercent"]= a.deviationPercent;
    j["severity"]        = severity_to_string(a.severity);
    j["pattern"]         = pattern_to_string(a.pattern);
    if (a.largestContributor) {
        auto& lc = *a.largestContributor;
        j["largestContributor"] = {
            {"category",                lc.category},
            {"categoryLabel",           lc.categoryLabel},
            {"baselineValue",           lc.baselineValue},
            {"currentValue",            lc.currentValue},
            {"percentChange",           lc.percentChange},
            {"contributionSharePercent",lc.contributionSharePercent}
        };
    }
    return j;
}

inline nlohmann::json spike_to_json(const SuddenSpikeRecord& s) {
    return {
        {"id",                  s.id},
        {"date",                s.date},
        {"time",                s.time},
        {"consumption",         s.consumption},
        {"prevDayConsumption",  s.prevDayConsumption},
        {"differenceKwh",       s.differenceKwh},
        {"percentIncrease",     s.percentIncrease},
        {"severity",            severity_to_string(s.severity)},
        {"spikeType",           s.spikeType},
        {"driverCategory",      s.driverCategory},
        {"driverCategoryLabel", s.driverCategoryLabel}
    };
}

inline nlohmann::json pattern_to_json(const PatternRecord& p) {
    return {
        {"id",                      p.id},
        {"type",                    pattern_to_string(p.type)},
        {"startDate",               p.startDate},
        {"endDate",                 p.endDate},
        {"durationDays",            p.durationDays},
        {"averageConsumption",      p.averageConsumption},
        {"averageBaseline",         p.averageBaseline},
        {"averageDeviationPercent", p.averageDeviationPercent},
        {"severity",                severity_to_string(p.severity)},
        {"primaryCategoryDriver",   p.primaryCategoryDriver},
        {"explanation",             p.explanation}
    };
}

inline nlohmann::json category_comparison_to_json(const CategoryComparison& c) {
    return {
        {"category",       c.category},
        {"label",          c.label},
        {"baselineValue",  c.baselineValue},
        {"currentValue",   c.currentValue},
        {"absoluteChange", c.absoluteChange},
        {"percentChange",  c.percentChange},
        {"sharePercent",   c.sharePercent}
    };
}

inline nlohmann::json analysis_results_to_json(const AnalysisResults& r) {
    nlohmann::json j;
    // metrics
    j["metrics"] = {
        {"recordCount",       r.metrics.recordCount},
        {"totalConsumption",  r.metrics.totalConsumption},
        {"averageConsumption",r.metrics.averageConsumption},
        {"minConsumption",    r.metrics.minConsumption},
        {"maxConsumption",    r.metrics.maxConsumption},
        {"standardDeviation", r.metrics.standardDeviation},
        {"variance",          r.metrics.variance},
        {"consumptionRange",  r.metrics.consumptionRange}
    };
    j["baselineValue"]  = r.baselineValue;
    j["baselineMethod"] = baseline_to_string(r.baselineMethod);
    j["normalRange"]    = { {"min", r.normalRange.min}, {"max", r.normalRange.max} };
    j["trend"] = {
        {"direction",                 trend_to_string(r.trend.direction)},
        {"slope",                     r.trend.slope},
        {"percentageChangeOverPeriod",r.trend.percentageChangeOverPeriod},
        {"description",               r.trend.description}
    };

    j["anomalies"] = nlohmann::json::array();
    for (auto& a : r.anomalies) j["anomalies"].push_back(anomaly_to_json(a));

    j["suddenSpikes"] = nlohmann::json::array();
    for (auto& s : r.suddenSpikes) j["suddenSpikes"].push_back(spike_to_json(s));

    j["patterns"] = nlohmann::json::array();
    for (auto& p : r.patterns) j["patterns"].push_back(pattern_to_json(p));

    j["categoryComparisons"] = nlohmann::json::array();
    for (auto& c : r.categoryComparisons) j["categoryComparisons"].push_back(category_comparison_to_json(c));

    j["insights"] = {
        {"summaryTitle",        r.insights.summaryTitle},
        {"explainableParagraph",r.insights.explainableParagraph},
        {"keyDrivers",          r.insights.keyDrivers},
        {"recommendations",     r.insights.recommendations},
        {"technicalSummary",    r.insights.technicalSummary}
    };

    std::string modeStr;
    switch (r.timeRangeInfo.mode) {
        case TimeRangeMode::WEEKLY:  modeStr = "WEEKLY";  break;
        case TimeRangeMode::MONTHLY: modeStr = "MONTHLY"; break;
        case TimeRangeMode::CUSTOM:  modeStr = "CUSTOM";  break;
        default:                     modeStr = "ALL";      break;
    }
    j["timeRangeInfo"] = {
        {"mode",      modeStr},
        {"label",     r.timeRangeInfo.label},
        {"startDate", r.timeRangeInfo.startDate},
        {"endDate",   r.timeRangeInfo.endDate}
    };
    j["hasCategories"] = r.hasCategories;
    return j;
}

} // namespace vidhora
