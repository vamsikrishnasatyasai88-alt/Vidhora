// Vidhora C++ HTTP API Server
// Uses cpp-httplib + nlohmann/json
// Implements all required endpoints

#include "api/server.h"
#include "services/persistence.h"
#include "services/csv_importer.h"
#include "services/dataset_generator.h"
#include "analysis/analysis_engine.h"
#include "utils/json_helpers.h"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <algorithm>
#include <mutex>

namespace vidhora {

// ─── Shared in-memory state (guarded by mutex) ────────────────────────────────

static std::mutex g_mutex;
static std::vector<ElectricityReading> g_readings;
static DatasetMetadata                 g_metadata;
static AppSettings                     g_settings;

// ─── CORS helper ─────────────────────────────────────────────────────────────

static void add_cors(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin",  "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Accept");
}

static void json_response(httplib::Response& res, int status, const nlohmann::json& body) {
    add_cors(res);
    res.status = status;
    res.set_content(body.dump(), "application/json");
}

static void error_response(httplib::Response& res, int status, const std::string& message) {
    json_response(res, status, {{"error", message}});
}

// ─── Route helpers ────────────────────────────────────────────────────────────

// Parse TimeRangeMode from string
static TimeRangeMode parse_time_mode(const std::string& s) {
    if (s == "WEEKLY")  return TimeRangeMode::WEEKLY;
    if (s == "MONTHLY") return TimeRangeMode::MONTHLY;
    if (s == "CUSTOM")  return TimeRangeMode::CUSTOM;
    return TimeRangeMode::ALL;
}

// ─── Server entry point ───────────────────────────────────────────────────────

void run_server(const std::string& host, int port) {
    // Load initial state
    {
        std::lock_guard<std::mutex> lock(g_mutex);
        auto ds   = load_dataset();
        g_readings = ds.readings;
        g_metadata = ds.metadata;
        g_settings = load_settings();
        std::cout << "[vidhora] Loaded " << g_readings.size() << " readings from persistence.\n";
    }

    httplib::Server svr;

    // ── Preflight OPTIONS ────────────────────────────────────────────────────
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        add_cors(res);
        res.status = 204;
    });

    // ── GET /api/health ──────────────────────────────────────────────────────
    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        json_response(res, 200, {
            {"status", "ok"},
            {"service", "vidhora-backend"},
            {"version", "1.0.0"}
        });
    });

    // ── GET /api/dataset ─────────────────────────────────────────────────────
    svr.Get("/api/dataset", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_mutex);
        nlohmann::json body;
        body["metadata"] = metadata_to_json(g_metadata);
        body["readings"]  = nlohmann::json::array();
        for (auto& r : g_readings) body["readings"].push_back(reading_to_json(r));
        json_response(res, 200, body);
    });

    // ── POST /api/dataset/import ─────────────────────────────────────────────
    svr.Post("/api/dataset/import", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto j = nlohmann::json::parse(req.body);
            std::string csvText  = j.value("csvText",  "");
            std::string filename = j.value("filename", "imported_dataset.csv");

            if (csvText.empty()) {
                error_response(res, 400, "csvText is required");
                return;
            }

            CSVParseResult parseRes = process_csv_dataset(csvText, filename);

            if (!parseRes.success) {
                nlohmann::json errBody;
                errBody["success"] = false;
                errBody["errors"]  = parseRes.errors;
                json_response(res, 422, errBody);
                return;
            }

            {
                std::lock_guard<std::mutex> lock(g_mutex);
                g_readings = parseRes.readings;
                g_metadata = parseRes.metadata;
                save_dataset(g_readings, g_metadata);
            }

            nlohmann::json body;
            body["success"]  = true;
            body["metadata"] = metadata_to_json(parseRes.metadata);
            body["warnings"] = parseRes.warnings;
            body["errors"]   = parseRes.errors;
            body["previewRows"] = nlohmann::json::array();
            for (auto& row : parseRes.previewRows) {
                nlohmann::json rowj;
                for (auto& [k, v] : row) rowj[k] = v;
                body["previewRows"].push_back(rowj);
            }
            json_response(res, 200, body);
        } catch (const std::exception& e) {
            error_response(res, 400, std::string("Parse error: ") + e.what());
        }
    });

    // ── POST /api/analysis ───────────────────────────────────────────────────
    svr.Post("/api/analysis", [](const httplib::Request& req, httplib::Response& res) {
        try {
            nlohmann::json j;
            TimeRangeMode mode = TimeRangeMode::ALL;
            CustomDateRange customRange;
            AppSettings localSettings;

            {
                std::lock_guard<std::mutex> lock(g_mutex);
                localSettings = g_settings;
            }

            if (!req.body.empty()) {
                j = nlohmann::json::parse(req.body);
                if (j.contains("timeRangeMode"))
                    mode = parse_time_mode(j.value("timeRangeMode", "ALL"));
                if (j.contains("customRange") && j["customRange"].is_object()) {
                    customRange.startDate = j["customRange"].value("startDate", "");
                    customRange.endDate   = j["customRange"].value("endDate",   "");
                }
                if (j.contains("settings") && j["settings"].is_object()) {
                    localSettings = settings_from_json(j["settings"]);
                }
            }

            std::vector<ElectricityReading> readings;
            {
                std::lock_guard<std::mutex> lock(g_mutex);
                readings = g_readings;
            }

            AnalysisResults results = run_full_analysis(readings, localSettings, mode, customRange);
            json_response(res, 200, analysis_results_to_json(results));

        } catch (const std::exception& e) {
            error_response(res, 500, std::string("Analysis error: ") + e.what());
        }
    });

    // ── GET /api/settings ────────────────────────────────────────────────────
    svr.Get("/api/settings", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_mutex);
        json_response(res, 200, settings_to_json(g_settings));
    });

    // ── PUT /api/settings ────────────────────────────────────────────────────
    svr.Put("/api/settings", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto j = nlohmann::json::parse(req.body);
            std::lock_guard<std::mutex> lock(g_mutex);
            g_settings = settings_from_json(j);
            save_settings(g_settings);
            json_response(res, 200, settings_to_json(g_settings));
        } catch (const std::exception& e) {
            error_response(res, 400, std::string("Settings error: ") + e.what());
        }
    });

    // ── PUT /api/readings/:id ─────────────────────────────────────────────────
    svr.Put(R"(/api/readings/(.+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string id = req.matches[1];
            auto j = nlohmann::json::parse(req.body);

            std::lock_guard<std::mutex> lock(g_mutex);
            bool found = false;
            for (auto& r : g_readings) {
                if (r.id == id) {
                    if (j.contains("date"))             r.date             = j.value("date", r.date);
                    if (j.contains("time"))             r.time             = j.value("time", r.time);
                    if (j.contains("totalConsumption")) r.totalConsumption = j.value("totalConsumption", r.totalConsumption);
                    if (j.contains("notes"))            r.notes            = j.value("notes", r.notes);
                    if (j.contains("categories") && j["categories"].is_object()) {
                        for (auto& [k, v] : j["categories"].items()) {
                            r.categories[k] = v.get<double>();
                        }
                    }
                    found = true;
                    break;
                }
            }
            if (!found) { error_response(res, 404, "Reading not found"); return; }
            save_dataset(g_readings, g_metadata);
            json_response(res, 200, {{"success", true}});
        } catch (const std::exception& e) {
            error_response(res, 400, std::string("Update error: ") + e.what());
        }
    });

    // ── DELETE /api/readings/:id ──────────────────────────────────────────────
    svr.Delete(R"(/api/readings/(.+))", [](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        std::lock_guard<std::mutex> lock(g_mutex);
        auto& v = g_readings;
        auto it = std::find_if(v.begin(), v.end(), [&id](const ElectricityReading& r){ return r.id == id; });
        if (it == v.end()) { error_response(res, 404, "Reading not found"); return; }
        v.erase(it);
        g_metadata.recordCount  = static_cast<int>(v.size());
        g_metadata.validRecords = g_metadata.recordCount;
        save_dataset(v, g_metadata);
        json_response(res, 200, {{"success", true}});
    });

    // ── POST /api/dataset/reset ──────────────────────────────────────────────
    svr.Post("/api/dataset/reset", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_mutex);
        auto ds    = reset_to_pjm_dataset();
        g_readings = ds.readings;
        g_metadata = ds.metadata;
        nlohmann::json body;
        body["success"]  = true;
        body["metadata"] = metadata_to_json(g_metadata);
        body["recordCount"] = static_cast<int>(g_readings.size());
        json_response(res, 200, body);
    });

    // ── GET /api/export/csv ───────────────────────────────────────────────────
    svr.Get("/api/export/csv", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_mutex);
        std::string csvContent = export_readings_to_csv(g_readings);
        add_cors(res);
        res.status = 200;
        res.set_header("Content-Disposition", "attachment; filename=\"vidhora_export.csv\"");
        res.set_content(csvContent, "text/csv");
    });

    // ── GET /api/readings (search + sort support) ─────────────────────────────
    svr.Get("/api/readings", [](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_mutex);
        std::vector<ElectricityReading> result = g_readings;

        // Optional keyword search
        if (req.has_param("q")) {
            result = search_readings_by_keyword(result, req.get_param_value("q"));
        }

        // Optional sort
        if (req.has_param("sortField")) {
            std::string sf = req.get_param_value("sortField");
            std::string so = req.has_param("sortOrder") ? req.get_param_value("sortOrder") : "asc";

            SortField field = SortField::DATE;
            if (sf == "consumption")  field = SortField::CONSUMPTION;
            else if (sf == "ac")          field = SortField::AC;
            else if (sf == "refrigerator") field = SortField::REFRIGERATOR;
            else if (sf == "fans")        field = SortField::FANS;

            SortOrder order = (so == "desc") ? SortOrder::DESC : SortOrder::ASC;
            result = sort_readings(result, field, order);
        }

        nlohmann::json body = nlohmann::json::array();
        for (auto& r : result) body.push_back(reading_to_json(r));
        json_response(res, 200, body);
    });

    // ─────────────────────────────────────────────────────────────────────────

    std::cout << "[vidhora] C++ Backend starting on " << host << ":" << port << "\n";
    std::cout << "[vidhora] Endpoints:\n"
              << "  GET  /api/health\n"
              << "  GET  /api/dataset\n"
              << "  POST /api/dataset/import\n"
              << "  POST /api/analysis\n"
              << "  GET  /api/settings\n"
              << "  PUT  /api/settings\n"
              << "  GET  /api/readings\n"
              << "  PUT  /api/readings/:id\n"
              << "  DELETE /api/readings/:id\n"
              << "  POST /api/dataset/reset\n"
              << "  GET  /api/export/csv\n";

    svr.listen(host.c_str(), port);
}

} // namespace vidhora
