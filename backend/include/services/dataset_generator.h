#pragma once
#include "models/types.h"
#include <vector>

namespace vidhora {

extern const DatasetMetadata PJM_REAL_DATASET_METADATA;

std::vector<ElectricityReading> load_pjm_real_dataset();

} // namespace vidhora
