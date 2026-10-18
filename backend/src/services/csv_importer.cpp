// Vidhora C++ CSV Importer
// Faithfully ported from src/services/csvImporter.ts

#include "services/csv_importer.h"
#include <algorithm>
#include <sstream>
#include <regex>
#include <chrono>
#include <cmath>
#include <ctime>

namespace vidhora {

// ─── Helpers ──────────────────────────────────────────────────────────────────

static std::string normalize_header(const std::string& h) {
    std::string s = h;
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    // replace non-alphanumeric/underscore with _
    for (char& c : s) {
        if (!std::isalnum(static_cast<unsigned char>(c)) && c != '_') c = '_';
    }
    return s;
}

static std::vector<std::string> split_csv_line(const std::string& line) {
    std::vector<std::string> tokens;
    std::string token;
    bool inQuote = false;
    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if ((c == '"' || c == '\'') && !inQuote) {
            inQuote = true;
        } else if ((c == '"' || c == '\'') && inQuote) {
            inQuote = false;
        } else if (c == ',' && !inQuote) {
            // trim whitespace and surrounding quotes
            auto start = token.find_first_not_of(" \t\"'");
            auto end   = token.find_last_not_of(" \t\"'");
            tokens.push_back((start == std::string::npos) ? "" : token.substr(start, end - start + 1));
            token.clear();
        } else {
            token += c;
        }
    }
    // last token
    auto start = token.find_first_not_of(" \t\"'");
    auto end   = token.find_last_not_of(" \t\"'");
    tokens.push_back((start == std::string::npos) ? "" : token.substr(start, end - start + 1));
    return tokens;
}

static std::string trim(const std::string& s) {
    auto start = s.find_first_not_of(" \t\r\n\"'");
    auto end   = s.find_last_not_of(" \t\r\n\"'");
    return (start == std::string::npos) ? "" : s.substr(start, end - start + 1);
}

// ─── Header column auto-detection ─────────────────────────────────────────────

ColumnMapping detect_csv_columns(const std::vector<std::string>& headers) {
    std::vector<std::string> normalized;
    for (auto& h : headers) normalized.push_back(normalize_header(h));

    // Find date column
    int dateIdx = -1;
    for (int i = 0; i < static_cast<int>(normalized.size()); ++i) {
        const auto& n = normalized[i];
        if (n.find("date") != std::string::npos ||
            n.find("day")  != std::string::npos ||
            n.find("timestamp") != std::string::npos) {
            dateIdx = i; break;
        }
    }
    if (dateIdx == -1) dateIdx = 0;

    // Find time column
    int timeIdx = -1;
    for (int i = 0; i < static_cast<int>(normalized.size()); ++i) {
        const auto& n = normalized[i];
        if (n.find("time") != std::string::npos ||
            n.find("hour") != std::string::npos ||
            n.find("clock") != std::string::npos) {
            timeIdx = i; break;
        }
    }

    // Find consumption column
    int consIdx = -1;
    for (int i = 0; i < static_cast<int>(normalized.size()); ++i) {
        const auto& n = normalized[i];
        if (n.find("consumption") != std::string::npos ||
            n.find("total")       != std::string::npos ||
            n.find("kwh")         != std::string::npos ||
            n.find("energy")      != std::string::npos ||
            n.find("usage")       != std::string::npos ||
            n.find("power")       != std::string::npos) {
            consIdx = i; break;
        }
    }
    if (consIdx == -1) {
        // fallback: first column that is not date/time
        for (int i = 0; i < static_cast<int>(normalized.size()); ++i) {
            if (i != dateIdx && i != timeIdx) { consIdx = i; break; }
        }
    }
    if (consIdx == -1) consIdx = 1;

    // Category columns
    std::map<std::string, std::string> categoryCols;
    for (int i = 0; i < static_cast<int>(headers.size()); ++i) {
        if (i == dateIdx || i == timeIdx || i == consIdx) continue;
        const auto& n = normalized[i];
        const auto& orig = headers[i];

        if (n.find("ac") != std::string::npos || n.find("air") != std::string::npos)
            categoryCols["airConditioning"] = orig;
        else if (n.find("fridge") != std::string::npos || n.find("refrigerator") != std::string::npos)
            categoryCols["refrigerator"] = orig;
        else if (n.find("fan") != std::string::npos)
            categoryCols["fans"] = orig;
        else if (n.find("light") != std::string::npos)
            categoryCols["lighting"] = orig;
        else if (n.find("wash") != std::string::npos)
            categoryCols["washingMachine"] = orig;
        else if (n.find("other") != std::string::npos)
            categoryCols["other"] = orig;
        else {
            // generic mapping
            std::string key = orig;
            for (char& c : key) {
                if (!std::isalnum(static_cast<unsigned char>(c))) c = '_';
            }
            // lowercase
            std::transform(key.begin(), key.end(), key.begin(), ::tolower);
            categoryCols[key] = orig;
        }
    }

    ColumnMapping cm;
    cm.dateCol        = (dateIdx >= 0 && dateIdx < static_cast<int>(headers.size())) ? headers[dateIdx] : "date";
    cm.timeCol        = (timeIdx >= 0 && timeIdx < static_cast<int>(headers.size())) ? headers[timeIdx] : "";
    cm.consumptionCol = (consIdx >= 0 && consIdx < static_cast<int>(headers.size())) ? headers[consIdx] : "total_consumption";
    cm.categoryCols   = categoryCols;
    return cm;
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

CSVParseResult process_csv_dataset(const std::string& csvText, const std::string& filename) {
    CSVParseResult result;
    result.success = false;

    // Split into lines
    std::vector<std::string> lines;
    std::istringstream iss(csvText);
    std::string line;
    while (std::getline(iss, line)) {
        // strip \r
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (!line.empty()) lines.push_back(line);
    }

    if (lines.size() <= 1) {
        DatasetMetadata m;
        m.id = "error-empty"; m.name = filename; m.source = "User Upload";
        m.type = "Imported CSV Dataset"; m.recordCount = 0;
        m.dateRange = {"", ""}; m.frequency = "Unknown";
        m.consumptionField = "N/A"; m.hasCategories = false;
        m.validRecords = 0; m.missingRecords = 0; m.invalidRecords = 0;
        result.metadata = m;
        result.columnMapping = {"", "", "", {}};
        result.errors.push_back("CSV file is empty or missing data rows.");
        return result;
    }

    // Parse header
    std::vector<std::string> rawHeaders = split_csv_line(lines[0]);
    for (auto& h : rawHeaders) h = trim(h);

    ColumnMapping cm = detect_csv_columns(rawHeaders);

    // Build index maps
    int dateColIdx = -1, timeColIdx = -1, consColIdx = -1;
    for (int i = 0; i < static_cast<int>(rawHeaders.size()); ++i) {
        if (rawHeaders[i] == cm.dateCol)        dateColIdx = i;
        if (!cm.timeCol.empty() && rawHeaders[i] == cm.timeCol) timeColIdx = i;
        if (rawHeaders[i] == cm.consumptionCol) consColIdx = i;
    }

    std::map<std::string, int> categoryColIndices;
    for (auto& [key, origHeader] : cm.categoryCols) {
        for (int i = 0; i < static_cast<int>(rawHeaders.size()); ++i) {
            if (rawHeaders[i] == origHeader) { categoryColIndices[key] = i; break; }
        }
    }

    std::vector<ElectricityReading> parsedReadings;
    int missingCount = 0, invalidCount = 0;

    for (size_t i = 1; i < lines.size(); ++i) {
        std::vector<std::string> tokens = split_csv_line(lines[i]);
        if (tokens.size() < 2) continue;

        // Collect preview rows (up to 20)
        if (result.previewRows.size() < 20) {
            std::map<std::string, std::string> row;
            for (size_t j = 0; j < rawHeaders.size() && j < tokens.size(); ++j) {
                row[rawHeaders[j]] = tokens[j];
            }
            result.previewRows.push_back(row);
        }

        std::string dateVal = (dateColIdx >= 0 && dateColIdx < static_cast<int>(tokens.size()))
            ? trim(tokens[dateColIdx]) : "";
        std::string timeVal = (timeColIdx >= 0 && timeColIdx < static_cast<int>(tokens.size()))
            ? trim(tokens[timeColIdx]) : "";
        std::string rawCons = (consColIdx >= 0 && consColIdx < static_cast<int>(tokens.size()))
            ? trim(tokens[consColIdx]) : "";

        if (dateVal.empty()) { ++missingCount; continue; }

        double parsedCons = 0.0;
        try { parsedCons = std::stod(rawCons); }
        catch (...) { ++invalidCount; continue; }

        if (std::isnan(parsedCons) || parsedCons < 0.0) { ++invalidCount; continue; }

        std::map<std::string, double> categories;
        if (!categoryColIndices.empty()) {
            for (auto& [key, idx] : categoryColIndices) {
                if (idx < static_cast<int>(tokens.size())) {
                    double val = 0.0;
                    try { val = std::stod(trim(tokens[idx])); } catch (...) {}
                    categories[key] = (!std::isnan(val) && val >= 0.0) ? val : 0.0;
                }
            }
        }

        ElectricityReading r;
        r.id               = "imported-" + dateVal + "-" + std::to_string(i);
        r.date             = dateVal;
        r.time             = timeVal;
        r.totalConsumption = std::round(parsedCons * 100.0) / 100.0;
        r.categories       = categories;
        parsedReadings.push_back(std::move(r));
    }

    // Sort
    std::sort(parsedReadings.begin(), parsedReadings.end(),
        [](const ElectricityReading& a, const ElectricityReading& b) {
            return a.date < b.date;
        });

    std::string startDate = parsedReadings.empty() ? "" : parsedReadings.front().date;
    std::string endDate   = parsedReadings.empty() ? "" : parsedReadings.back().date;

    bool hasCategories = !cm.categoryCols.empty();

    DatasetMetadata meta;
    meta.id               = "csv-" + std::to_string(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());
    meta.name             = filename;
    meta.source           = "User Imported CSV Dataset";
    meta.type             = "Imported CSV Dataset";
    meta.recordCount      = static_cast<int>(parsedReadings.size());
    meta.dateRange        = {startDate, endDate};
    meta.frequency        = (timeColIdx >= 0) ? "Hourly / Interval" : "Daily";
    meta.consumptionField = cm.consumptionCol;
    meta.hasCategories    = hasCategories;
    for (auto& [k, v] : cm.categoryCols) meta.categoryFields.push_back(v);
    meta.validRecords     = static_cast<int>(parsedReadings.size());
    meta.missingRecords   = missingCount;
    meta.invalidRecords   = invalidCount;

    if (!hasCategories) {
        result.warnings.push_back(
            "No appliance/category fields detected. Vidhora will analyze overall electricity "
            "consumption, but appliance category contribution matrix will be disabled.");
    }

    result.success     = !parsedReadings.empty();
    result.readings    = std::move(parsedReadings);
    result.metadata    = std::move(meta);
    result.columnMapping = cm;
    return result;
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

std::string export_readings_to_csv(const std::vector<ElectricityReading>& readings) {
    if (readings.empty()) return "date,total_consumption\n";

    // Collect all category keys from first reading that has categories
    std::vector<std::string> categoryKeys;
    for (auto& r : readings) {
        if (!r.categories.empty()) {
            for (auto& [k, v] : r.categories) categoryKeys.push_back(k);
            break;
        }
    }

    std::ostringstream out;
    out << "date,time,total_consumption";
    for (auto& k : categoryKeys) out << "," << k;
    out << ",notes\n";

    for (auto& r : readings) {
        out << r.date << ",\"" << r.time << "\"," << r.totalConsumption;
        for (auto& k : categoryKeys) {
            auto it = r.categories.find(k);
            out << "," << (it != r.categories.end() ? it->second : 0.0);
        }
        out << ",\"" << r.notes << "\"\n";
    }

    return out.str();
}

} // namespace vidhora
