#pragma once
#include "models/types.h"
#include <string>
#include <vector>

namespace vidhora {

ColumnMapping detect_csv_columns(const std::vector<std::string>& headers);

CSVParseResult process_csv_dataset(const std::string& csvText,
                                    const std::string& filename = "imported_dataset.csv");

std::string export_readings_to_csv(const std::vector<ElectricityReading>& readings);

} // namespace vidhora
