// Vidhora C++ Persistence Layer
// JSON-file based storage replacing browser localStorage

#include "services/persistence.h"
#include "services/dataset_generator.h"
#include "utils/json_helpers.h"
#include <fstream>
#include <iostream>
#include <filesystem>

namespace vidhora {
namespace fs = std::filesystem;

// ─── Constants ────────────────────────────────────────────────────────────────

const AppSettings DEFAULT_SETTINGS = []() {
    AppSettings s;
    s.baselineMethod      = BaselineMethod::HISTORICAL_AVERAGE;
    s.movingAverageWindow = 7;
    s.thresholds.low      = 20.0;
    s.thresholds.medium   = 40.0;
    s.thresholds.high     = 70.0;
    s.spikeThresholdPercent = 30.0;
    return s;
}();

static std::string g_dataDir;

static std::string readings_path()  { return g_dataDir + "/readings.json";  }
static std::string metadata_path()  { return g_dataDir + "/metadata.json";  }
static std::string settings_path()  { return g_dataDir + "/settings.json";  }

// ─── Init ─────────────────────────────────────────────────────────────────────

void persistence_init(const std::string& dataDir) {
    g_dataDir = dataDir;
    std::error_code ec;
    fs::create_directories(dataDir, ec);
    if (ec) {
        std::cerr << "[persistence] Warning: could not create data dir: " << ec.message() << "\n";
    }
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

LoadDatasetResult load_dataset() {
    try {
        std::ifstream rf(readings_path());
        std::ifstream mf(metadata_path());
        if (rf.is_open() && mf.is_open()) {
            nlohmann::json rj, mj;
            rf >> rj; mf >> mj;

            std::vector<ElectricityReading> readings;
            for (auto& item : rj) {
                readings.push_back(reading_from_json(item));
            }
            DatasetMetadata meta = metadata_from_json(mj);
            return {readings, meta};
        }
    } catch (const std::exception& e) {
        std::cerr << "[persistence] load_dataset error: " << e.what() << "\n";
    }

    // Fall back to PJM default dataset
    auto readings = load_pjm_real_dataset();
    auto meta     = PJM_REAL_DATASET_METADATA;
    save_dataset(readings, meta);
    return {readings, meta};
}

void save_dataset(const std::vector<ElectricityReading>& readings, const DatasetMetadata& metadata) {
    try {
        nlohmann::json rj = nlohmann::json::array();
        for (auto& r : readings) rj.push_back(reading_to_json(r));

        std::ofstream rf(readings_path());
        rf << rj.dump(2);

        std::ofstream mf(metadata_path());
        mf << metadata_to_json(metadata).dump(2);
    } catch (const std::exception& e) {
        std::cerr << "[persistence] save_dataset error: " << e.what() << "\n";
    }
}

// ─── Settings ────────────────────────────────────────────────────────────────

AppSettings load_settings() {
    try {
        std::ifstream sf(settings_path());
        if (sf.is_open()) {
            nlohmann::json j;
            sf >> j;
            return settings_from_json(j);
        }
    } catch (const std::exception& e) {
        std::cerr << "[persistence] load_settings error: " << e.what() << "\n";
    }
    save_settings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
}

void save_settings(const AppSettings& settings) {
    try {
        std::ofstream sf(settings_path());
        sf << settings_to_json(settings).dump(2);
    } catch (const std::exception& e) {
        std::cerr << "[persistence] save_settings error: " << e.what() << "\n";
    }
}

// ─── Reset ───────────────────────────────────────────────────────────────────

LoadDatasetResult reset_to_pjm_dataset() {
    auto readings = load_pjm_real_dataset();
    auto meta     = PJM_REAL_DATASET_METADATA;
    save_dataset(readings, meta);
    return {readings, meta};
}

} // namespace vidhora
