// Vidhora C++ Analysis Engine - Unit Tests
// Tests all major algorithms with known inputs and expected outputs.

#include "analysis/analysis_engine.h"
#include <iostream>
#include <cmath>
#include <cassert>
#include <string>
#include <vector>

using namespace vidhora;

// ─── Test harness ─────────────────────────────────────────────────────────────

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

static bool near(double a, double b, double eps = 0.01) {
    return std::fabs(a - b) < eps;
}

// ─── Helper: make a simple reading ───────────────────────────────────────────

static ElectricityReading make_reading(const std::string& id,
                                        const std::string& date,
                                        double cons,
                                        std::map<std::string,double> cats = {})
{
    ElectricityReading r;
    r.id               = id;
    r.date             = date;
    r.time             = "12:00";
    r.totalConsumption = cons;
    r.categories       = cats;
    return r;
}

// ─── Test groups ─────────────────────────────────────────────────────────────

void test_statistics() {
    std::cout << "\n[Statistics]\n";

    // Empty dataset
    check(calculate_average({}) == 0.0, "average of empty = 0");
    check(calculate_minimum({}) == 0.0, "minimum of empty = 0");
    check(calculate_maximum({}) == 0.0, "maximum of empty = 0");
    check(calculate_standard_deviation({}) == 0.0, "stddev of empty = 0");

    // Single element
    check(calculate_average({5.0}) == 5.0, "average single element");
    check(calculate_minimum({5.0}) == 5.0, "minimum single element");
    check(calculate_maximum({5.0}) == 5.0, "maximum single element");
    check(calculate_standard_deviation({5.0}) == 0.0, "stddev single element = 0");

    // Known values: [2, 4, 4, 4, 5, 5, 7, 9]
    std::vector<double> vals = {2, 4, 4, 4, 5, 5, 7, 9};
    double avg = calculate_average(vals);
    check(near(avg, 5.0), "average {2,4,4,4,5,5,7,9} = 5.0");
    check(near(calculate_minimum(vals), 2.0), "minimum = 2");
    check(near(calculate_maximum(vals), 9.0), "maximum = 9");
    // population stddev = 2.0
    double sd = calculate_standard_deviation(vals, avg);
    check(near(sd, 2.0), "stddev {2,4,4,4,5,5,7,9} = 2.0");

    // Variance = sd^2 = 4.0
    check(near(sd * sd, 4.0), "variance = 4.0");

    // Range
    check(near(calculate_maximum(vals) - calculate_minimum(vals), 7.0), "range = 7.0");
}

void test_moving_average() {
    std::cout << "\n[Moving Average]\n";

    std::vector<ElectricityReading> readings;
    for (int i = 0; i < 10; ++i) {
        std::string pad = (i < 9) ? "0" : "";
        readings.push_back(make_reading(
            "r" + std::to_string(i),
            "2024-01-" + pad + std::to_string(i + 1),
            static_cast<double>(i + 1))); // 1,2,3,...,10
    }

    // targetIndex=0, no prior readings → returns reading's own consumption
    double ma0 = calculate_moving_average_at_index(readings, 0, 7);
    check(near(ma0, 1.0), "MA at index 0 = own value (1.0)");

    // targetIndex=3, window=7: slice [0,3) = {1,2,3}, avg=2.0
    double ma3 = calculate_moving_average_at_index(readings, 3, 7);
    check(near(ma3, 2.0), "MA at index 3, w=7: avg(1,2,3)=2.0");

    // targetIndex=7, window=7: slice [0,7) = {1,2,3,4,5,6,7}, avg=4.0
    double ma7 = calculate_moving_average_at_index(readings, 7, 7);
    check(near(ma7, 4.0), "MA at index 7, w=7: avg(1..7)=4.0");

    // window=3: targetIndex=5, slice [2,5) = {3,4,5}, avg=4.0
    double ma5w3 = calculate_moving_average_at_index(readings, 5, 3);
    check(near(ma5w3, 4.0), "MA at index 5, w=3: avg(3,4,5)=4.0");

    // empty readings
    double maEmpty = calculate_moving_average_at_index({}, 0, 7);
    check(maEmpty == 0.0, "MA of empty readings = 0");
}

void test_deviation_and_severity() {
    std::cout << "\n[Deviation & Severity]\n";

    // deviation percent
    check(near(calculate_deviation_percent(12.0, 10.0), 20.0), "deviation 12 vs 10 = +20%");
    check(near(calculate_deviation_percent(8.0,  10.0), -20.0), "deviation 8 vs 10 = -20%");
    check(near(calculate_deviation_percent(10.0, 10.0),  0.0),  "deviation 10 vs 10 = 0%");
    check(calculate_deviation_percent(5.0, 0.0) == 0.0, "baseline 0 → deviation = 0");

    // severity thresholds: low=20, medium=40, high=70
    check(detect_severity(0.0)  == SeverityLevel::NORMAL, "0% → NORMAL");
    check(detect_severity(19.9) == SeverityLevel::NORMAL, "19.9% → NORMAL");
    check(detect_severity(20.0) == SeverityLevel::LOW,    "20% → LOW");
    check(detect_severity(25.0) == SeverityLevel::LOW,    "25% → LOW");
    check(detect_severity(39.9) == SeverityLevel::LOW,    "39.9% → LOW");
    check(detect_severity(40.0) == SeverityLevel::MEDIUM, "40% → MEDIUM");
    check(detect_severity(55.0) == SeverityLevel::MEDIUM, "55% → MEDIUM");
    check(detect_severity(69.9) == SeverityLevel::MEDIUM, "69.9% → MEDIUM");
    check(detect_severity(70.0) == SeverityLevel::HIGH,   "70% → HIGH");
    check(detect_severity(200.0)== SeverityLevel::HIGH,   "200% → HIGH");
}

void test_sudden_spikes() {
    std::cout << "\n[Sudden Spike Detection]\n";

    // 3 readings: 5, 8, 5 → spike at index 1 (60% increase, diff=3.0)
    std::vector<ElectricityReading> readings = {
        make_reading("r1", "2024-01-01", 5.0),
        make_reading("r2", "2024-01-02", 8.0),
        make_reading("r3", "2024-01-03", 5.0),
    };
    std::vector<AnomalyRecord> anomalies; // empty
    auto spikes = detect_sudden_spikes(readings, anomalies);
    check(spikes.size() == 1, "spike count = 1 (8 vs 5 = 60% increase)");
    if (!spikes.empty()) {
        check(spikes[0].date == "2024-01-02", "spike date = 2024-01-02");
        check(near(spikes[0].percentIncrease, 60.0), "spike pct = 60%");
        check(near(spikes[0].differenceKwh,   3.0),  "spike diff = 3.0 kWh");
        check(spikes[0].spikeType == "TEMPORARY_SPIKE", "spikeType = TEMPORARY_SPIKE");
    }

    // No spike: 5, 6 (20% increase < 30% threshold, diff < 3)
    std::vector<ElectricityReading> noSpike = {
        make_reading("a", "2024-01-01", 5.0),
        make_reading("b", "2024-01-02", 6.0),
    };
    auto ns = detect_sudden_spikes(noSpike, anomalies);
    check(ns.empty(), "no spike when increase < 30% and diff < 3.0 kWh");

    // Empty dataset → no spikes
    auto emptySpikes = detect_sudden_spikes({}, anomalies);
    check(emptySpikes.empty(), "empty dataset → no spikes");
}

void test_pattern_detection() {
    std::cout << "\n[Pattern Detection]\n";

    // Single anomaly day → TEMPORARY_SPIKE
    std::vector<ElectricityReading> readings = {
        make_reading("r1","2024-01-01", 5.0),
        make_reading("r2","2024-01-02",15.0), // anomaly
        make_reading("r3","2024-01-03", 5.0),
    };
    AnomalyRecord a;
    a.id = "anom-r2"; a.readingId = "r2"; a.date = "2024-01-02";
    a.consumption = 15.0; a.baseline = 5.0; a.deviationPercent = 200.0;
    a.severity = SeverityLevel::HIGH; a.pattern = PatternType::TEMPORARY_SPIKE;

    std::vector<AnomalyRecord> anomalies = {a};
    auto patterns = detect_patterns(readings, anomalies);
    check(patterns.size() == 1, "single anomaly → 1 pattern");
    check(patterns[0].type == PatternType::TEMPORARY_SPIKE, "single anomaly → TEMPORARY_SPIKE");
    check(patterns[0].durationDays == 1, "single day duration = 1");

    // 3 consecutive anomaly days → PERSISTENT_CHANGE
    std::vector<ElectricityReading> readings2 = {
        make_reading("r1","2024-02-01", 5.0),
        make_reading("r2","2024-02-02",15.0),
        make_reading("r3","2024-02-03",14.0),
        make_reading("r4","2024-02-04",13.0),
        make_reading("r5","2024-02-05", 5.0),
    };
    auto makeAnomaly = [](const std::string& date, const std::string& rid) {
        AnomalyRecord x;
        x.id = "anom-" + rid; x.readingId = rid; x.date = date;
        x.consumption = 14.0; x.baseline = 5.0; x.deviationPercent = 180.0;
        x.severity = SeverityLevel::HIGH; x.pattern = PatternType::TEMPORARY_SPIKE;
        return x;
    };
    std::vector<AnomalyRecord> anom2 = {
        makeAnomaly("2024-02-02","r2"),
        makeAnomaly("2024-02-03","r3"),
        makeAnomaly("2024-02-04","r4"),
    };
    auto patterns2 = detect_patterns(readings2, anom2);
    check(patterns2.size() == 1, "3 consecutive anomalies → 1 pattern");
    check(patterns2[0].type == PatternType::PERSISTENT_CHANGE, "3 consecutive → PERSISTENT_CHANGE");
    check(patterns2[0].durationDays == 3, "duration = 3");
    check(patterns2[0].startDate == "2024-02-02", "startDate correct");
    check(patterns2[0].endDate   == "2024-02-04", "endDate correct");

    // No anomalies → no patterns
    auto p0 = detect_patterns(readings, {});
    check(p0.empty(), "no anomalies → no patterns");
}

void test_linear_regression() {
    std::cout << "\n[Linear Regression Trend]\n";

    // Perfectly increasing: 1,2,3,4,5
    std::vector<ElectricityReading> up;
    for (int i = 0; i < 5; ++i)
        up.push_back(make_reading("r" + std::to_string(i),
            "2024-01-0" + std::to_string(i+1),
            static_cast<double>(i + 1)));
    auto tUp = calculate_linear_regression_trend(up);
    check(tUp.direction == TrendDirection::INCREASING, "increasing trend detected");
    check(near(tUp.slope, 1.0), "slope = 1.0 for y=x+1");

    // Perfectly decreasing: 5,4,3,2,1
    std::vector<ElectricityReading> down;
    for (int i = 0; i < 5; ++i)
        down.push_back(make_reading("d" + std::to_string(i),
            "2024-01-0" + std::to_string(i+1),
            static_cast<double>(5 - i)));
    auto tDown = calculate_linear_regression_trend(down);
    check(tDown.direction == TrendDirection::DECREASING, "decreasing trend detected");
    check(near(tDown.slope, -1.0), "slope = -1.0 for decreasing");

    // Flat: all 5.0
    std::vector<ElectricityReading> flat;
    for (int i = 0; i < 5; ++i)
        flat.push_back(make_reading("f" + std::to_string(i),
            "2024-01-0" + std::to_string(i+1),
            5.0));
    auto tFlat = calculate_linear_regression_trend(flat);
    check(tFlat.direction == TrendDirection::STABLE, "flat trend = STABLE");
    check(near(tFlat.slope, 0.0, 0.001), "slope ~= 0 for flat");

    // Single reading → STABLE
    auto tSingle = calculate_linear_regression_trend({up[0]});
    check(tSingle.direction == TrendDirection::STABLE, "single reading → STABLE");

    // Percentage change
    check(near(tUp.percentageChangeOverPeriod, 400.0), "% change 1->5 = +400%");
    check(near(tDown.percentageChangeOverPeriod, -80.0), "% change 5->1 = -80%");
}

void test_search_and_sort() {
    std::cout << "\n[Search & Sort]\n";

    std::vector<ElectricityReading> readings = {
        make_reading("r1","2024-03-01", 8.0),
        make_reading("r2","2024-01-15", 3.0),
        make_reading("r3","2024-02-10", 5.0),
    };

    // Sort by date ASC
    auto sortedDate = sort_readings(readings, SortField::DATE, SortOrder::ASC);
    check(sortedDate[0].date == "2024-01-15", "sort date ASC [0]");
    check(sortedDate[1].date == "2024-02-10", "sort date ASC [1]");
    check(sortedDate[2].date == "2024-03-01", "sort date ASC [2]");

    // Sort by date DESC
    auto sortedDateDesc = sort_readings(readings, SortField::DATE, SortOrder::DESC);
    check(sortedDateDesc[0].date == "2024-03-01", "sort date DESC [0]");

    // Sort by consumption ASC
    auto sortedCons = sort_readings(readings, SortField::CONSUMPTION, SortOrder::ASC);
    check(near(sortedCons[0].totalConsumption, 3.0), "sort cons ASC [0] = 3.0");
    check(near(sortedCons[2].totalConsumption, 8.0), "sort cons ASC [2] = 8.0");

    // Sort by consumption DESC
    auto sortedConsDesc = sort_readings(readings, SortField::CONSUMPTION, SortOrder::DESC);
    check(near(sortedConsDesc[0].totalConsumption, 8.0), "sort cons DESC [0] = 8.0");

    // Search by date keyword
    auto found = search_readings_by_keyword(readings, "2024-01");
    check(found.size() == 1 && found[0].id == "r2", "search '2024-01' finds r2");

    // Search by consumption value
    auto foundCons = search_readings_by_keyword(readings, "5");
    bool hasR3 = false;
    for (auto& r : foundCons) if (r.id == "r3") hasR3 = true;
    check(hasR3, "search '5' finds r3 (consumption=5.0)");

    // Empty query → all readings returned
    auto all = search_readings_by_keyword(readings, "");
    check(all.size() == 3, "empty query returns all readings");

    // No match
    auto noMatch = search_readings_by_keyword(readings, "xyz-no-match");
    check(noMatch.empty(), "no match returns empty");
}

void test_empty_and_single_record() {
    std::cout << "\n[Empty & Single Record]\n";

    AppSettings settings;
    settings.baselineMethod = BaselineMethod::HISTORICAL_AVERAGE;
    settings.movingAverageWindow = 7;
    settings.thresholds.low = 20.0;
    settings.thresholds.medium = 40.0;
    settings.thresholds.high = 70.0;

    // Empty dataset
    auto emptyRes = run_full_analysis({}, settings);
    check(emptyRes.metrics.recordCount == 0,    "empty: recordCount = 0");
    check(emptyRes.anomalies.empty(),            "empty: no anomalies");
    check(emptyRes.suddenSpikes.empty(),         "empty: no spikes");
    check(emptyRes.patterns.empty(),             "empty: no patterns");

    // Single reading
    std::vector<ElectricityReading> one = {
        make_reading("s1","2024-06-15", 7.5)
    };
    auto oneRes = run_full_analysis(one, settings);
    check(oneRes.metrics.recordCount == 1,       "single: recordCount = 1");
    check(near(oneRes.metrics.totalConsumption, 7.5),   "single: totalConsumption = 7.5");
    check(near(oneRes.metrics.averageConsumption, 7.5), "single: average = 7.5");
    check(near(oneRes.metrics.minConsumption, 7.5),     "single: min = 7.5");
    check(near(oneRes.metrics.maxConsumption, 7.5),     "single: max = 7.5");
    check(oneRes.metrics.standardDeviation == 0.0,      "single: stddev = 0");
    check(oneRes.anomalies.empty(),              "single: no anomalies (0 deviation)");
    check(oneRes.suddenSpikes.empty(),           "single: no spikes");
}

void test_category_contributor() {
    std::cout << "\n[Category Contributor]\n";

    // Reading with AC dominating
    ElectricityReading r = make_reading("c1","2024-05-01", 15.0, {
        {"airConditioning", 10.0},
        {"refrigerator",     2.0},
        {"fans",             1.0},
        {"lighting",         1.0},
        {"other",            1.0},
    });

    // Baseline: all categories average = r's values (single record)
    std::vector<ElectricityReading> readings = {r};
    AppSettings settings;
    settings.baselineMethod = BaselineMethod::HISTORICAL_AVERAGE;
    settings.thresholds.low = 20.0; settings.thresholds.medium = 40.0; settings.thresholds.high = 70.0;

    auto res = run_full_analysis(readings, settings);
    check(res.hasCategories, "categories detected");
    check(!res.categoryComparisons.empty(), "category comparisons produced");

    // Check AC share with single record (it's the dominant category)
    bool foundAC = false;
    for (auto& cc : res.categoryComparisons) {
        if (cc.category == "airConditioning") {
            foundAC = true;
            // AC = 10/15 = 66.67% share
            check(near(cc.sharePercent, 66.7, 0.5), "AC sharePercent ~66.7%");
        }
    }
    check(foundAC, "AC category found in comparisons");
}

void test_full_analysis_pipeline() {
    std::cout << "\n[Full Analysis Pipeline]\n";

    // Build a small known dataset: 10 days, mostly normal, 1 spike
    std::vector<ElectricityReading> readings;
    for (int i = 1; i <= 9; ++i) {
        std::string pad = (i < 10) ? "0" : "";
        readings.push_back(make_reading(
            "r" + std::to_string(i),
            "2024-04-" + pad + std::to_string(i),
            5.0
        ));
    }
    // Day 10: massive spike
    readings.push_back(make_reading("r10","2024-04-10", 20.0));

    AppSettings settings;
    settings.baselineMethod = BaselineMethod::HISTORICAL_AVERAGE;
    settings.movingAverageWindow = 7;
    settings.thresholds.low = 20.0; settings.thresholds.medium = 40.0; settings.thresholds.high = 70.0;
    settings.spikeThresholdPercent = 30.0;

    auto res = run_full_analysis(readings, settings);

    check(res.metrics.recordCount == 10, "pipeline: 10 records");

    // Average = (9*5 + 20) / 10 = 65/10 = 6.5
    check(near(res.metrics.averageConsumption, 6.5), "pipeline: average = 6.5");
    check(near(res.metrics.minConsumption, 5.0),     "pipeline: min = 5.0");
    check(near(res.metrics.maxConsumption, 20.0),    "pipeline: max = 20.0");

    // Day 10 deviation from baseline 6.5: (20-6.5)/6.5 * 100 = 207.7% → HIGH
    check(!res.anomalies.empty(), "pipeline: anomaly detected on spike day");
    bool foundHighAnomaly = false;
    for (auto& a : res.anomalies) {
        if (a.date == "2024-04-10" && a.severity == SeverityLevel::HIGH)
            foundHighAnomaly = true;
    }
    check(foundHighAnomaly, "pipeline: day 10 is HIGH severity anomaly");

    // Sudden spike: day 9→10: 5→20 = 300% increase ≥ 30% threshold
    check(!res.suddenSpikes.empty(), "pipeline: sudden spike detected");

    // Trend: 9 fives then a 20 → slightly increasing
    check(res.trend.direction != TrendDirection::DECREASING, "pipeline: trend not decreasing");

    // Time range info
    check(res.timeRangeInfo.mode == TimeRangeMode::ALL, "pipeline: timeRange mode = ALL");
    check(res.timeRangeInfo.startDate == "2024-04-01", "pipeline: startDate correct");
    check(res.timeRangeInfo.endDate   == "2024-04-10", "pipeline: endDate correct");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

int main() {
    std::cout << "========================================\n";
    std::cout << " Vidhora C++ Analysis Engine Unit Tests\n";
    std::cout << "========================================\n";

    test_statistics();
    test_moving_average();
    test_deviation_and_severity();
    test_sudden_spikes();
    test_pattern_detection();
    test_linear_regression();
    test_search_and_sort();
    test_empty_and_single_record();
    test_category_contributor();
    test_full_analysis_pipeline();

    std::cout << "\n========================================\n";
    std::cout << " Results: " << g_passed << " passed, " << g_failed << " failed\n";
    std::cout << "========================================\n";

    return g_failed > 0 ? 1 : 0;
}
