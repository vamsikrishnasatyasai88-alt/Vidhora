#pragma once
#include "models/types.h"
#include <string>
#include <vector>

namespace vidhora {

extern const AppSettings DEFAULT_SETTINGS;

struct LoadDatasetResult {
    std::vector<ElectricityReading> readings;
    DatasetMetadata metadata;
};

// Initialise the data directory path (called once at startup)
void persistence_init(const std::string& dataDir);

LoadDatasetResult load_dataset();
void save_dataset(const std::vector<ElectricityReading>& readings,
                  const DatasetMetadata& metadata);

AppSettings load_settings();
void save_settings(const AppSettings& settings);

LoadDatasetResult reset_to_pjm_dataset();

} // namespace vidhora
