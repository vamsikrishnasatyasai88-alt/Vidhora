// Vidhora C++ Backend - Main Entry Point

#include "api/server.h"
#include "services/persistence.h"
#include <iostream>
#include <filesystem>
#include <string>

int main(int argc, char* argv[]) {
    std::cout << "╔══════════════════════════════════════╗\n";
    std::cout << "║   Vidhora C++ Backend v1.0.0         ║\n";
    std::cout << "╚══════════════════════════════════════╝\n";

    // Determine data directory relative to executable
    std::filesystem::path exePath = std::filesystem::current_path();

    // argv[0] gives us the exe path; data/ sits alongside it
    if (argc > 0) {
        try {
            exePath = std::filesystem::absolute(argv[0]).parent_path();
        } catch (...) {}
    }

    std::string dataDir = (exePath / "data").string();

    // Allow override via command-line argument
    std::string host = "0.0.0.0";
    int port = 8080;
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--port" && i + 1 < argc) {
            try { port = std::stoi(argv[++i]); } catch (...) {}
        } else if (arg == "--host" && i + 1 < argc) {
            host = argv[++i];
        } else if (arg == "--data" && i + 1 < argc) {
            dataDir = argv[++i];
        }
    }

    std::cout << "[vidhora] Data directory: " << dataDir << "\n";

    vidhora::persistence_init(dataDir);
    vidhora::run_server(host, port);

    return 0;
}
