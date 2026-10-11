// Vidhora C++ Analysis Engine - Full Implementation
// Faithfully ported from src/engine/cppAnalysisEngine.ts and src/services/analysisEngine.ts

#include "analysis/analysis_engine.h"
#include <algorithm>
#include <cmath>
#include <numeric>
#include <sstream>
#include <iomanip>
#include <map>
#include <unordered_map>

namespace vidhora {

// ─── Helpers ─────────────────────────────────────────────────────────────────

static std::string to_lower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    return s;
}

static double round_dp(double v, int dp) {
    double factor = std::pow(10.0, dp);
    return std::round(v * factor) / factor;
}

// ─── 1. STATISTICAL ALGORITHMS ───────────────────────────────────────────────

double calculate_average(const std::vector<double>& values) {
    if (values.empty()) return 0.0;
    double sum = 0.0;
    for (double v : values) sum += v;
    return sum / static_cast<double>(values.size());
}

double calculate_minimum(const std::vector<double>& values) {
    if (values.empty()) return 0.0;
    double minVal = values[0];
    for (size_t i = 1; i < values.size(); ++i) {
        if (values[i] < minVal) minVal = values[i];
    }
    return minVal;
}

double calculate_maximum(const std::vector<double>& values) {
    if (values.empty()) return 0.0;
    double maxVal = values[0];
    for (size_t i = 1; i < values.size(); ++i) {
        if (values[i] > maxVal) maxVal = values[i];
    }
    return maxVal;
}

double calculate_standard_deviation(const std::vector<double>& values, double mean) {
    if (values.size() <= 1) return 0.0;
    double avg = (mean >= 0.0) ? mean : calculate_average(values);
    double sumSq = 0.0;
    for (double v : values) {
        double diff = v - avg;
        sumSq += diff * diff;
    }
    double variance = sumSq / static_cast<double>(values.size());
    return std::sqrt(variance);
}

// 7-day moving average baseline
double calculate_moving_average_at_index(
    const std::vector<ElectricityReading>& readings,
    int targetIndex,
    int windowSize)
{
    if (readings.empty() || targetIndex < 0) return 0.0;

    int startIndex = std::max(0, targetIndex - windowSize);
    // slice: [startIndex, targetIndex)  -- does not include targetIndex itself
    if (startIndex >= targetIndex) {
        return readings[targetIndex].totalConsumption;
    }

    double sum = 0.0;
    int count = 0;
    for (int i = startIndex; i < targetIndex; ++i) {
        sum += readings[i].totalConsumption;
        ++count;
    }
    return count > 0 ? sum / count : readings[targetIndex].totalConsumption;
}

// ─── 2. ANOMALY & SEVERITY ────────────────────────────────────────────────────

double calculate_deviation_percent(double current, double baseline) {
    if (baseline <= 0.0) return 0.0;
    return ((current - baseline) / baseline) * 100.0;
}

SeverityLevel detect_severity(double deviationPercent,
                               double lowThresh,
                               double medThresh,
                               double highThresh)
{
    if (deviationPercent < lowThresh)  return SeverityLevel::NORMAL;
    if (deviationPercent < medThresh)  return SeverityLevel::LOW;
    if (deviationPercent < highThresh) return SeverityLevel::MEDIUM;
    return SeverityLevel::HIGH;
}

// ─── 3. SUDDEN SPIKE DETECTION ───────────────────────────────────────────────

std::vector<SuddenSpikeRecord> detect_sudden_spikes(
    const std::vector<ElectricityReading>& sortedReadings,
    const std::vector<AnomalyRecord>&      anomalies)
{
    std::vector<SuddenSpikeRecord> spikeRecords;

    // Build anomaly lookup by date
    std::unordered_map<std::string, const AnomalyRecord*> anomalyMap;
    for (auto& a : anomalies) anomalyMap[a.date] = &a;

    for (size_t i = 1; i < sortedReadings.size(); ++i) {
        const auto& prev = sortedReadings[i - 1];
        const auto& curr = sortedReadings[i];

        double prevVal = prev.totalConsumption;
        double currVal = curr.totalConsumption;
        double diff    = currVal - prevVal;

        if (prevVal > 0.0) {
            double pctIncrease = ((currVal - prevVal) / prevVal) * 100.0;

            if (pctIncrease >= 30.0 || diff >= 3.0) {
                auto it = anomalyMap.find(curr.date);
                SeverityLevel severity = (it != anomalyMap.end())
                    ? it->second->severity
                    : detect_severity(pctIncrease);

                // check if the next reading is also anomalous (streak indicator)
                bool isStreak = false;
                if (i + 1 < sortedReadings.size()) {
                    auto nextIt = anomalyMap.find(sortedReadings[i + 1].date);
                    if (nextIt != anomalyMap.end() &&
                        nextIt->second->severity != SeverityLevel::NORMAL) {
                        isStreak = true;
                    }
                }

                std::string catDriver      = "overall";
                std::string catDriverLabel = "Overall Consumption";
                if (it != anomalyMap.end() && it->second->largestContributor) {
                    catDriver      = it->second->largestContributor->category;
                    catDriverLabel = it->second->largestContributor->categoryLabel;
                }

                SuddenSpikeRecord rec;
                rec.id                 = "spike-" + curr.date;
                rec.date               = curr.date;
                rec.time               = curr.time;
                rec.consumption        = currVal;
                rec.prevDayConsumption = prevVal;
                rec.differenceKwh      = round_dp(diff, 2);
                rec.percentIncrease    = round_dp(pctIncrease, 1);
                rec.severity           = severity;
                rec.spikeType          = isStreak ? "PERSISTENT_INCREASE" : "TEMPORARY_SPIKE";
                rec.driverCategory     = catDriver;
                rec.driverCategoryLabel= catDriverLabel;
                spikeRecords.push_back(std::move(rec));
            }
        }
    }

    return spikeRecords;
}

// ─── 4. PATTERN DETECTION ────────────────────────────────────────────────────

std::vector<PatternRecord> detect_patterns(
    const std::vector<ElectricityReading>& sortedReadings,
    const std::vector<AnomalyRecord>&      anomalies)
{
    std::vector<PatternRecord> patterns;

    std::unordered_map<std::string, const AnomalyRecord*> anomalyMap;
    for (auto& a : anomalies) anomalyMap[a.date] = &a;

    size_t i = 0;
    while (i < sortedReadings.size()) {
        const auto& r = sortedReadings[i];
        auto it = anomalyMap.find(r.date);

        if (it != anomalyMap.end() && it->second->severity != SeverityLevel::NORMAL) {
            size_t streakStart = i;
            size_t streakEnd   = i;

            // extend streak while consecutive readings are also anomalous
            while (streakEnd + 1 < sortedReadings.size()) {
                auto nextIt = anomalyMap.find(sortedReadings[streakEnd + 1].date);
                if (nextIt != anomalyMap.end() &&
                    nextIt->second->severity != SeverityLevel::NORMAL) {
                    ++streakEnd;
                } else {
                    break;
                }
            }

            int durationDays = static_cast<int>(streakEnd - streakStart + 1);

            // collect values for this streak
            std::vector<double> streakCons, streakBaselines, streakDevs;
            for (size_t k = streakStart; k <= streakEnd; ++k) {
                streakCons.push_back(sortedReadings[k].totalConsumption);
                auto ka = anomalyMap.find(sortedReadings[k].date);
                if (ka != anomalyMap.end()) {
                    streakBaselines.push_back(ka->second->baseline);
                    streakDevs.push_back(ka->second->deviationPercent);
                }
            }

            double avgCons = calculate_average(streakCons);
            double avgBase = streakBaselines.empty() ? 0.0 : calculate_average(streakBaselines);
            double avgDev  = streakDevs.empty()      ? 0.0 : calculate_average(streakDevs);

            // primary category driver: category with most total consumption in streak
            std::map<std::string, double> categoryTotals;
            for (size_t k = streakStart; k <= streakEnd; ++k) {
                for (auto& [cat, val] : sortedReadings[k].categories) {
                    categoryTotals[cat] += val;
                }
            }
            std::string primaryCategory = "overall";
            double maxCatVal = -1.0;
            for (auto& [cat, val] : categoryTotals) {
                if (val > maxCatVal) { maxCatVal = val; primaryCategory = cat; }
            }

            // max severity in streak
            SeverityLevel maxSeverity = SeverityLevel::NORMAL;
            static const int severityOrder[] = {0, 1, 2, 3}; // NORMAL, LOW, MEDIUM, HIGH
            for (size_t k = streakStart; k <= streakEnd; ++k) {
                auto ka = anomalyMap.find(sortedReadings[k].date);
                if (ka != anomalyMap.end()) {
                    int curr_ord = static_cast<int>(ka->second->severity);
                    int max_ord  = static_cast<int>(maxSeverity);
                    if (curr_ord > max_ord) maxSeverity = ka->second->severity;
                }
            }

            // format deviation display
            std::ostringstream devStr;
            devStr << std::fixed << std::setprecision(1) << avgDev;

            PatternRecord pat;
            if (durationDays == 1) {
                pat.id                       = "pattern-temp-" + r.date;
                pat.type                     = PatternType::TEMPORARY_SPIKE;
                pat.startDate                = r.date;
                pat.endDate                  = r.date;
                pat.durationDays             = 1;
                pat.averageConsumption       = avgCons;
                pat.averageBaseline          = avgBase;
                pat.averageDeviationPercent  = avgDev;
                pat.severity                 = maxSeverity;
                pat.primaryCategoryDriver    = primaryCategory;
                pat.explanation = "Electricity consumption spiked significantly on " + r.date +
                    " (+" + devStr.str() + "% above baseline), but returned to normal range shortly afterward. "
                    "This represents a temporary usage spike.";
            } else {
                pat.id                       = "pattern-persist-" + sortedReadings[streakStart].date;
                pat.type                     = PatternType::PERSISTENT_CHANGE;
                pat.startDate                = sortedReadings[streakStart].date;
                pat.endDate                  = sortedReadings[streakEnd].date;
                pat.durationDays             = durationDays;
                pat.averageConsumption       = avgCons;
                pat.averageBaseline          = avgBase;
                pat.averageDeviationPercent  = avgDev;
                pat.severity                 = maxSeverity;
                pat.primaryCategoryDriver    = primaryCategory;
                pat.explanation = "Electricity consumption remained consistently elevated (+" +
                    devStr.str() + "% avg deviation) for " + std::to_string(durationDays) +
                    " consecutive days (from " + sortedReadings[streakStart].date +
                    " to " + sortedReadings[streakEnd].date +
                    "). This indicates a persistent shift in electricity consumption patterns.";
            }
            patterns.push_back(std::move(pat));

            i = streakEnd + 1;
        } else {
            ++i;
        }
    }

    return patterns;
}

// ─── 5. SEARCH & SORT ────────────────────────────────────────────────────────

std::vector<ElectricityReading> search_readings_by_keyword(
    const std::vector<ElectricityReading>& readings,
    const std::string& query)
{
    if (query.empty()) return readings;
    std::string q = to_lower(query);
    // trim whitespace
    q.erase(0, q.find_first_not_of(" \t\r\n"));
    q.erase(q.find_last_not_of(" \t\r\n") + 1);
    if (q.empty()) return readings;

    std::vector<ElectricityReading> result;
    for (auto& r : readings) {
        bool dateMatch = to_lower(r.date).find(q) != std::string::npos;

        std::ostringstream consStr;
        consStr << r.totalConsumption;
        bool consMatch = consStr.str().find(q) != std::string::npos;

        bool noteMatch = !r.notes.empty() && to_lower(r.notes).find(q) != std::string::npos;

        if (dateMatch || consMatch || noteMatch) {
            result.push_back(r);
        }
    }
    return result;
}

std::vector<ElectricityReading> sort_readings(
    const std::vector<ElectricityReading>& readings,
    SortField field,
    SortOrder order)
{
    std::vector<ElectricityReading> result = readings;

    std::sort(result.begin(), result.end(),
        [field, order](const ElectricityReading& a, const ElectricityReading& b) {
            double comparison = 0.0;
            switch (field) {
                case SortField::DATE:
                    comparison = a.date < b.date ? -1.0 : (a.date > b.date ? 1.0 : 0.0);
                    break;
                case SortField::CONSUMPTION:
                    comparison = a.totalConsumption - b.totalConsumption;
                    break;
                case SortField::AC: {
                    auto ia = a.categories.find("airConditioning");
                    auto ib = b.categories.find("airConditioning");
                    double va = (ia != a.categories.end()) ? ia->second : 0.0;
                    double vb = (ib != b.categories.end()) ? ib->second : 0.0;
                    comparison = va - vb;
                    break;
                }
                case SortField::REFRIGERATOR: {
                    auto ia = a.categories.find("refrigerator");
                    auto ib = b.categories.find("refrigerator");
                    double va = (ia != a.categories.end()) ? ia->second : 0.0;
                    double vb = (ib != b.categories.end()) ? ib->second : 0.0;
                    comparison = va - vb;
                    break;
                }
                case SortField::FANS: {
                    auto ia = a.categories.find("fans");
                    auto ib = b.categories.find("fans");
                    double va = (ia != a.categories.end()) ? ia->second : 0.0;
                    double vb = (ib != b.categories.end()) ? ib->second : 0.0;
                    comparison = va - vb;
                    break;
                }
            }
            if (order == SortOrder::ASC) return comparison < 0.0;
            return comparison > 0.0;
        }
    );
    return result;
}

// ─── 6. TIME RANGE FILTERING ─────────────────────────────────────────────────

FilterResult filter_readings_by_time_range(
    const std::vector<ElectricityReading>& readings,
    TimeRangeMode mode,
    const CustomDateRange& customRange)
{
    FilterResult result;
    if (readings.empty()) {
        result.label = "All Time (0 Records)";
        return result;
    }

    // Sort a copy
    std::vector<ElectricityReading> sorted = readings;
    std::sort(sorted.begin(), sorted.end(),
        [](const ElectricityReading& a, const ElectricityReading& b) {
            return a.date < b.date;
        });

    const std::string& latestDateStr = sorted.back().date;
    result.startDate = sorted.front().date;
    result.endDate   = latestDateStr;

    if (mode == TimeRangeMode::WEEKLY) {
        // Last 7 days relative to latest dataset date
        // Subtract 6 days to get 7-day window inclusive
        // Parse latestDateStr YYYY-MM-DD manually
        int yr = std::stoi(latestDateStr.substr(0, 4));
        int mo = std::stoi(latestDateStr.substr(5, 2));
        int dy = std::stoi(latestDateStr.substr(8, 2));

        // Build tm, subtract 6 days
        struct tm t = {};
        t.tm_year = yr - 1900; t.tm_mon = mo - 1; t.tm_mday = dy - 6;
        mktime(&t);
        char buf[11];
        snprintf(buf, sizeof(buf), "%04d-%02d-%02d",
                 t.tm_year + 1900, t.tm_mon + 1, t.tm_mday);
        std::string minDateStr(buf);

        std::vector<ElectricityReading> filtered;
        for (auto& r : sorted) {
            if (r.date >= minDateStr && r.date <= latestDateStr)
                filtered.push_back(r);
        }
        result.startDate = minDateStr;
        result.endDate   = latestDateStr;
        result.label     = "Weekly (Last 7 Days: " + minDateStr + " to " + latestDateStr + ")";
        result.filteredReadings = filtered.empty() ? sorted : filtered;
    }
    else if (mode == TimeRangeMode::MONTHLY) {
        // Current month relative to latest dataset date
        std::string yearMonth = latestDateStr.substr(0, 7); // YYYY-MM
        std::vector<ElectricityReading> filtered;
        for (auto& r : sorted) {
            if (r.date.substr(0, 7) == yearMonth)
                filtered.push_back(r);
        }
        result.startDate = yearMonth + "-01";
        result.endDate   = latestDateStr;
        result.label     = "Monthly (" + yearMonth + ")";
        result.filteredReadings = filtered.empty() ? sorted : filtered;
    }
    else if (mode == TimeRangeMode::CUSTOM &&
             !customRange.startDate.empty() && !customRange.endDate.empty())
    {
        std::vector<ElectricityReading> filtered;
        for (auto& r : sorted) {
            if (r.date >= customRange.startDate && r.date <= customRange.endDate)
                filtered.push_back(r);
        }
        result.startDate = customRange.startDate;
        result.endDate   = customRange.endDate;
        result.label     = "Custom Range (" + customRange.startDate + " to " + customRange.endDate + ")";
        result.filteredReadings = filtered.empty() ? sorted : filtered;
    }
    else {
        // ALL
        result.label            = "All Time (" + result.startDate + " to " + result.endDate + ")";
        result.filteredReadings = sorted;
    }

    return result;
}

// ─── 7. TREND ANALYSIS (LINEAR REGRESSION) ────────────────────────────────────

TrendAnalysis calculate_linear_regression_trend(
    const std::vector<ElectricityReading>& sortedReadings)
{
    TrendAnalysis trend;
    trend.direction = TrendDirection::STABLE;
    trend.slope     = 0.0;
    trend.percentageChangeOverPeriod = 0.0;

    if (sortedReadings.size() < 2) {
        trend.description = "Insufficient dataset points to calculate trend slope.";
        return trend;
    }

    int n = static_cast<int>(sortedReadings.size());
    double sumX = 0.0, sumY = 0.0, sumXY = 0.0, sumXX = 0.0;

    for (int i = 0; i < n; ++i) {
        double x = static_cast<double>(i);
        double y = sortedReadings[i].totalConsumption;
        sumX  += x;
        sumY  += y;
        sumXY += x * y;
        sumXX += x * x;
    }

    double denom    = static_cast<double>(n) * sumXX - sumX * sumX;
    double rawSlope = (denom != 0.0)
        ? (static_cast<double>(n) * sumXY - sumX * sumY) / denom
        : 0.0;

    double slope = round_dp(rawSlope, 3);

    double firstY   = sortedReadings[0].totalConsumption;
    double lastY    = sortedReadings[n - 1].totalConsumption;
    double pctChange = (firstY > 0.0)
        ? round_dp(((lastY - firstY) / firstY) * 100.0, 1)
        : 0.0;

    trend.slope = slope;
    trend.percentageChangeOverPeriod = pctChange;

    std::ostringstream slopeStr;
    slopeStr << std::fixed << std::setprecision(3) << slope;
    std::string slopeDisplay = slopeStr.str();

    if (slope > 0.05) {
        trend.direction = TrendDirection::INCREASING;
        trend.description = "Electricity consumption displays a upward slope (+" +
            slopeDisplay + " kWh/period) across the selected dataset.";
    } else if (slope < -0.05) {
        trend.direction = TrendDirection::DECREASING;
        trend.description = "Electricity consumption displays a downward slope (" +
            slopeDisplay + " kWh/period) across the selected dataset.";
    } else {
        trend.direction = TrendDirection::STABLE;
        trend.description = "Electricity consumption remains stable with a near-zero slope (" +
            slopeDisplay + " kWh/period).";
    }

    return trend;
}

// ─── 8. INSIGHT REPORT GENERATION ────────────────────────────────────────────

InsightReport generate_insight_report(
    const StatisticalMetrics&              metrics,
    double                                 baselineValue,
    const TrendAnalysis&                   trend,
    const std::vector<AnomalyRecord>&      anomalies,
    const std::vector<PatternRecord>&      patterns,
    const std::vector<CategoryComparison>& categoryComparisons,
    bool                                   hasCategories,
    const std::string&                     timeRangeLabel)
{
    InsightReport report;

    int totalAnomalies   = static_cast<int>(anomalies.size());
    int persistentCount  = 0;
    int tempCount        = 0;
    for (auto& p : patterns) {
        if (p.type == PatternType::PERSISTENT_CHANGE) ++persistentCount;
        else ++tempCount;
    }

    // Summary title
    if (totalAnomalies == 0) {
        report.summaryTitle = "Normal Electricity Usage Pattern Detected";
    } else if (persistentCount > 0) {
        report.summaryTitle = "Persistent Usage Shifts Detected (" +
            std::to_string(persistentCount) + " Event" +
            (persistentCount > 1 ? "s" : "") + ")";
    } else {
        report.summaryTitle = "Temporary Usage Spikes Identified (" +
            std::to_string(tempCount) + " Event" +
            (tempCount > 1 ? "s" : "") + ")";
    }

    // Driver text from categories
    std::string driverText;
    if (hasCategories && !categoryComparisons.empty()) {
        // find category with highest percentChange
        const CategoryComparison* topCat = nullptr;
        for (auto& c : categoryComparisons) {
            if (!topCat || c.percentChange > topCat->percentChange)
                topCat = &c;
        }
        if (topCat && topCat->percentChange > 10.0) {
            std::ostringstream pctStr;
            pctStr << std::fixed << std::setprecision(1) << topCat->percentChange;
            driverText = " The primary driver behind higher usage was " + topCat->label +
                ", which showed a +" + pctStr.str() + "% increase over baseline.";
        }
    }

    // Format doubles for display
    auto fmt2 = [](double v) -> std::string {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2) << v;
        return ss.str();
    };
    auto fmt3 = [](double v) -> std::string {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(3) << v;
        return ss.str();
    };

    // Explainable paragraph
    if (totalAnomalies == 0) {
        report.explainableParagraph =
            "During " + timeRangeLabel + ", electricity consumption averaged " +
            fmt2(metrics.averageConsumption) + " kWh/day with zero high-severity anomalies detected. "
            "Consumption remained within normal expected baseline boundaries (" +
            fmt2(baselineValue) + " kWh).";
    } else if (persistentCount > 0) {
        std::string trendDir = trend_to_string(trend.direction);
        std::transform(trendDir.begin(), trendDir.end(), trendDir.begin(), ::tolower);
        report.explainableParagraph =
            "Analysis of " + timeRangeLabel + " revealed " + std::to_string(totalAnomalies) +
            " anomaly reading points including " + std::to_string(persistentCount) +
            " multi-day persistent shift(s). Electricity usage trended " + trendDir +
            " with a slope of " + fmt3(trend.slope) + " kWh/period." + driverText;
    } else {
        report.explainableParagraph =
            "During " + timeRangeLabel + ", " + std::to_string(totalAnomalies) +
            " temporary usage spike(s) were identified. Electricity consumption returned to "
            "normal baseline levels (" + fmt2(baselineValue) + " kWh) following each isolated spike." +
            driverText;
    }

    // Key drivers
    if (hasCategories) {
        for (auto& c : categoryComparisons) {
            if (c.percentChange > 15.0) {
                std::ostringstream ss;
                ss << std::fixed << std::setprecision(1) << c.percentChange;
                report.keyDrivers.push_back(c.label + " (+" + ss.str() + "% vs baseline)");
            }
        }
    }

    // Recommendations
    report.recommendations.push_back(
        "Compare identified peak usage days (" + fmt2(metrics.maxConsumption) +
        " kWh max) with normal days (" + fmt2(baselineValue) + " kWh baseline) "
        "to understand consumption drivers."
    );

    if (hasCategories && !report.keyDrivers.empty()) {
        std::string driverList;
        for (size_t i = 0; i < report.keyDrivers.size(); ++i) {
            if (i > 0) driverList += ", ";
            driverList += report.keyDrivers[i];
        }
        report.recommendations.push_back(
            "Review operating schedules and runtime for high-consumption appliances (" +
            driverList + ")."
        );
    }

    if (persistentCount > 0) {
        report.recommendations.push_back(
            "Investigate persistent multi-day shifts in electricity consumption to ensure "
            "operating schedules align with household requirements."
        );
    } else {
        report.recommendations.push_back(
            "Review high-consumption periods to determine if temporary spikes correlate "
            "with specific household activities."
        );
    }

    // Technical summary
    {
        std::ostringstream ts;
        ts << "Processed " << metrics.recordCount << " dataset records. "
           << "Baseline Mean: " << fmt2(baselineValue) << " kWh | "
           << "StdDev (\xCF\x83): " << fmt2(metrics.standardDeviation) << " kWh | "
           << "Trend Slope: " << fmt3(trend.slope) << " kWh/period | "
           << "Anomalies: " << totalAnomalies
           << " (" << persistentCount << " persistent, " << tempCount << " temporary).";
        report.technicalSummary = ts.str();
    }

    return report;
}

// ─── 9. MAIN ANALYSIS PIPELINE ───────────────────────────────────────────────

AnalysisResults run_full_analysis(
    const std::vector<ElectricityReading>& readings,
    const AppSettings&                     settings,
    TimeRangeMode                          timeMode,
    const CustomDateRange&                 customRange)
{
    AnalysisResults results;

    // 1. Time scope filter
    FilterResult filterRes = filter_readings_by_time_range(readings, timeMode, customRange);
    std::vector<ElectricityReading>& sorted = filterRes.filteredReadings;

    // Already sorted inside filter_readings_by_time_range

    int recordCount = static_cast<int>(sorted.size());

    // 2. Compute totals vector
    std::vector<double> totals;
    totals.reserve(recordCount);
    for (auto& r : sorted) totals.push_back(r.totalConsumption);

    // 3. Statistical metrics
    double totalConsumption  = 0.0;
    for (double v : totals) totalConsumption += v;
    double averageConsumption = calculate_average(totals);
    double minConsumption     = calculate_minimum(totals);
    double maxConsumption     = calculate_maximum(totals);
    double stdDev             = calculate_standard_deviation(totals, averageConsumption);
    double variance           = stdDev * stdDev;
    double consRange          = maxConsumption - minConsumption;

    results.metrics.recordCount         = recordCount;
    results.metrics.totalConsumption    = round_dp(totalConsumption,  2);
    results.metrics.averageConsumption  = round_dp(averageConsumption,2);
    results.metrics.minConsumption      = round_dp(minConsumption,    2);
    results.metrics.maxConsumption      = round_dp(maxConsumption,    2);
    results.metrics.standardDeviation   = round_dp(stdDev,           2);
    results.metrics.variance            = round_dp(variance,         2);
    results.metrics.consumptionRange    = round_dp(consRange,        2);

    // 4. Baseline
    double baselineValue = results.metrics.averageConsumption;
    double normalMin = round_dp(std::max(0.0, baselineValue - stdDev), 2);
    double normalMax = round_dp(baselineValue + stdDev, 2);

    results.baselineValue       = baselineValue;
    results.baselineMethod      = settings.baselineMethod;
    results.normalRange.min     = normalMin;
    results.normalRange.max     = normalMax;

    // 5. Check category availability
    bool hasCategories = false;
    for (auto& r : sorted) {
        if (!r.categories.empty()) { hasCategories = true; break; }
    }
    results.hasCategories = hasCategories;

    // 6. Category baselines (mean per category across all readings)
    std::map<std::string, double> categoryBaselines;
    if (hasCategories) {
        std::map<std::string, double> catSums;
        for (auto& r : sorted) {
            for (auto& [cat, val] : r.categories)
                catSums[cat] += val;
        }
        for (auto& [cat, sum] : catSums) {
            categoryBaselines[cat] = round_dp(sum / recordCount, 2);
        }
    }

    // 7. Anomaly detection
    std::vector<AnomalyRecord> anomalies;
    for (int idx = 0; idx < recordCount; ++idx) {
        const auto& r = sorted[idx];
        double readingBaseline = baselineValue;
        if (settings.baselineMethod == BaselineMethod::MOVING_AVERAGE) {
            readingBaseline = calculate_moving_average_at_index(
                sorted, idx, settings.movingAverageWindow);
        }

        double devPercent = calculate_deviation_percent(r.totalConsumption, readingBaseline);
        SeverityLevel severity = detect_severity(
            devPercent,
            settings.thresholds.low,
            settings.thresholds.medium,
            settings.thresholds.high
        );

        if (severity != SeverityLevel::NORMAL) {
            AnomalyRecord anom;
            anom.id            = "anom-" + r.id;
            anom.readingId     = r.id;
            anom.date          = r.date;
            anom.time          = r.time;
            anom.consumption   = r.totalConsumption;
            anom.baseline      = round_dp(readingBaseline, 2);
            anom.deviationPercent = round_dp(devPercent, 1);
            anom.severity      = severity;
            anom.pattern       = PatternType::TEMPORARY_SPIKE; // default, updated later

            // Largest contributor
            if (hasCategories && !r.categories.empty()) {
                double maxIncrease = -1e18;
                std::string largestCatKey;
                double largestBaseVal = 0.0;
                double largestCurrVal = 0.0;

                for (auto& [catKey, currVal] : r.categories) {
                    double baseVal = 0.0;
                    auto it = categoryBaselines.find(catKey);
                    if (it != categoryBaselines.end()) baseVal = it->second;
                    double inc = currVal - baseVal;
                    if (inc > maxIncrease) {
                        maxIncrease    = inc;
                        largestCatKey  = catKey;
                        largestBaseVal = baseVal;
                        largestCurrVal = currVal;
                    }
                }

                if (!largestCatKey.empty()) {
                    double pctChange = (largestBaseVal > 0.0)
                        ? ((largestCurrVal - largestBaseVal) / largestBaseVal) * 100.0
                        : 0.0;
                    double share = (r.totalConsumption > 0.0)
                        ? (largestCurrVal / r.totalConsumption) * 100.0
                        : 0.0;

                    LargestContributor lc;
                    lc.category                 = largestCatKey;
                    lc.categoryLabel            = category_label(largestCatKey);
                    lc.baselineValue            = largestBaseVal;
                    lc.currentValue             = largestCurrVal;
                    lc.percentChange            = round_dp(pctChange, 1);
                    lc.contributionSharePercent = round_dp(share,     1);
                    anom.largestContributor     = lc;
                }
            }

            anomalies.push_back(std::move(anom));
        }
    }

    // 8. Sudden spikes
    results.suddenSpikes = detect_sudden_spikes(sorted, anomalies);

    // 9. Patterns
    results.patterns = detect_patterns(sorted, anomalies);

    // 10. Update anomaly pattern field from detected patterns
    std::unordered_map<std::string, PatternType> patternMap;
    for (auto& p : results.patterns) {
        if (p.type == PatternType::PERSISTENT_CHANGE) {
            // mark all dates in range
            for (auto& r : sorted) {
                if (r.date >= p.startDate && r.date <= p.endDate) {
                    patternMap[r.date] = PatternType::PERSISTENT_CHANGE;
                }
            }
        }
    }
    for (auto& a : anomalies) {
        auto it = patternMap.find(a.date);
        if (it != patternMap.end()) {
            a.pattern = it->second;
        }
    }
    results.anomalies = std::move(anomalies);

    // 11. Trend
    results.trend = calculate_linear_regression_trend(sorted);

    // 12. Category comparisons
    if (hasCategories) {
        // current averages = same as baselines (they're computed over same window)
        // match TS: categoryRecentSums / recordCount == categoryBaselines already
        for (auto& [cat, baseVal] : categoryBaselines) {
            double currAvg   = baseVal; // same dataset window
            double absChange = round_dp(currAvg - baseVal, 2); // 0
            double pctChange = (baseVal > 0.0)
                ? round_dp(((currAvg - baseVal) / baseVal) * 100.0, 1)
                : 0.0;
            double share = (results.metrics.averageConsumption > 0.0)
                ? round_dp((currAvg / results.metrics.averageConsumption) * 100.0, 1)
                : 0.0;

            CategoryComparison cc;
            cc.category      = cat;
            cc.label         = category_label(cat);
            cc.baselineValue = baseVal;
            cc.currentValue  = currAvg;
            cc.absoluteChange= absChange;
            cc.percentChange = pctChange;
            cc.sharePercent  = share;
            results.categoryComparisons.push_back(std::move(cc));
        }
    }

    // 13. Insights
    results.insights = generate_insight_report(
        results.metrics,
        results.baselineValue,
        results.trend,
        results.anomalies,
        results.patterns,
        results.categoryComparisons,
        hasCategories,
        filterRes.label
    );

    // 14. Time range info
    std::string modeStr;
    switch (timeMode) {
        case TimeRangeMode::WEEKLY:  modeStr = "WEEKLY";  break;
        case TimeRangeMode::MONTHLY: modeStr = "MONTHLY"; break;
        case TimeRangeMode::CUSTOM:  modeStr = "CUSTOM";  break;
        default:                     modeStr = "ALL";     break;
    }
    results.timeRangeInfo.mode      = timeMode;
    results.timeRangeInfo.label     = filterRes.label;
    results.timeRangeInfo.startDate = filterRes.startDate;
    results.timeRangeInfo.endDate   = filterRes.endDate;

    return results;
}

} // namespace vidhora
