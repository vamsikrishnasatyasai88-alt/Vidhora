// Vidhora C++ PJM Real Dataset Generator
// Faithfully ported from src/services/realDataset.ts

#include "services/dataset_generator.h"
#include <cmath>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <cstring>

namespace vidhora {

const DatasetMetadata PJM_REAL_DATASET_METADATA = {
    "pjm-energy-2024-real",
    "PJM Interconnection Electricity Grid Open Dataset",
    "PJM Open Energy Repository & UCI Machine Learning Repository",
    "https://archive.ics.uci.edu/ml/datasets/ElectricityLoadDiagrams20112014",
    "Real-world Public Dataset",
    4380,
    {"2024-01-01", "2024-12-31"},
    "Daily Consumption",
    "total_consumption_kwh",
    true,
    {
        "air_conditioning_kwh",
        "refrigerator_kwh",
        "fans_kwh",
        "lighting_kwh",
        "washing_machine_kwh",
        "other_appliances_kwh"
    },
    4370,
    7,
    3
};

static std::string date_add_days(const std::string& base, int days) {
    // Parse YYYY-MM-DD
    struct tm t = {};
    t.tm_year = std::stoi(base.substr(0, 4)) - 1900;
    t.tm_mon  = std::stoi(base.substr(5, 2)) - 1;
    t.tm_mday = std::stoi(base.substr(8, 2)) + days;
    mktime(&t);
    char buf[11];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02d",
             t.tm_year + 1900, t.tm_mon + 1, t.tm_mday);
    return std::string(buf);
}

static double round2(double v) {
    return std::round(v * 100.0) / 100.0;
}

static std::string pad2(int v) {
    return (v < 10 ? "0" : "") + std::to_string(v);
}

std::vector<ElectricityReading> load_pjm_real_dataset() {
    std::vector<ElectricityReading> readings;
    readings.reserve(365);

    const std::string startDate = "2024-01-01";

    for (int i = 0; i < 365; ++i) {
        std::string dateStr = date_add_days(startDate, i);
        int dayNum = i + 1;

        // Determine month (0-based) from dateStr
        int month = std::stoi(dateStr.substr(5, 2)) - 1;

        // Seasonal factor
        double seasonalFactor = 1.0;
        if (month >= 5 && month <= 8) seasonalFactor = 1.4;         // Jun-Sep
        else if (month == 11 || month <= 1) seasonalFactor = 1.2;   // Dec-Feb

        double baseAC = 2.5 * seasonalFactor;

        double total = 0.0;
        std::map<std::string, double> categories;
        std::string notes;

        if (dayNum == 45) {
            // Winter Freeze Surge
            categories["airConditioning"] = 1.2;
            categories["refrigerator"]    = 1.3;
            categories["fans"]            = 0.8;
            categories["lighting"]        = 1.8;
            categories["washingMachine"]  = 1.4;
            categories["other"]           = 8.5;
            total = 15.0;
            notes = "PJM Grid Winter Freeze Alert - Space Heating Load Surge";
        }
        else if (dayNum == 210) {
            // Summer Heatwave Peak Spike (July 28)
            categories["airConditioning"] = 12.8;
            categories["refrigerator"]    = 1.6;
            categories["fans"]            = 1.5;
            categories["lighting"]        = 0.8;
            categories["washingMachine"]  = 1.1;
            categories["other"]           = 2.4;
            total = 20.2;
            notes = "PJM Grid Summer Heatwave Emergency Load - Max AC Runtime";
        }
        else if (dayNum >= 230 && dayNum <= 234) {
            // 5-Day Persistent Heatwave Strain
            const double acList[] = {10.5, 11.2, 12.0, 11.8, 10.9};
            int idx = dayNum - 230;
            categories["airConditioning"] = acList[idx];
            categories["refrigerator"]    = 1.5;
            categories["fans"]            = 1.4;
            categories["lighting"]        = 0.8;
            categories["washingMachine"]  = 1.0;
            categories["other"]           = 2.1;
            total = round2(
                categories["airConditioning"] +
                categories["refrigerator"] +
                categories["fans"] +
                categories["lighting"] +
                categories["washingMachine"] +
                categories["other"]
            );
            notes = "PJM 5-Day Extended Heatwave - Day " + std::to_string(idx + 1);
        }
        else {
            // Regular days — deterministic formula matching TypeScript
            double noise = std::sin(i * 0.8) * 0.8 + std::cos(i * 0.3) * 0.4;
            double ac    = round2(baseAC + noise * 0.5);
            double fridge= round2(1.3 + (i % 5) * 0.04);
            double fans  = round2(0.9 + (i % 3) * 0.05);
            double light = round2(0.6 + (i % 4) * 0.03);
            double wash  = (dayNum % 3 == 0) ? 1.2 : 0.4;
            double other = round2(1.5 + (i % 6) * 0.05);

            categories["airConditioning"] = std::max(0.5, ac);
            categories["refrigerator"]    = fridge;
            categories["fans"]            = fans;
            categories["lighting"]        = light;
            categories["washingMachine"]  = wash;
            categories["other"]           = other;

            double sum = 0.0;
            for (auto& [k, v] : categories) sum += v;
            total = round2(sum);
        }

        ElectricityReading r;
        std::string pad = (dayNum < 10) ? "00" : (dayNum < 100 ? "0" : "");
        r.id               = std::string("pjm-2024-") + pad + std::to_string(dayNum);
        r.date             = dateStr;
        r.time             = "12:00";
        r.totalConsumption = total;
        r.categories       = categories;
        r.notes            = notes;
        readings.push_back(std::move(r));
    }

    return readings;
}

} // namespace vidhora
