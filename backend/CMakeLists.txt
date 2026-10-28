cmake_minimum_required(VERSION 3.20)
project(vidhora_backend VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# MSVC-specific flags
if(MSVC)
  add_compile_options(/W3 /EHsc /MP)
  add_compile_definitions(_CRT_SECURE_NO_WARNINGS NOMINMAX WIN32_LEAN_AND_MEAN)
endif()

# ─────────────────────────────────────────────────────────────
# Vendored third-party header-only libraries
# ─────────────────────────────────────────────────────────────
set(THIRD_PARTY_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# nlohmann/json — single header at third_party/nlohmann/json.hpp
# Expose as interface target so code can #include <nlohmann/json.hpp>
add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE ${THIRD_PARTY_DIR})

# cpp-httplib — single header at third_party/httplib/httplib.h
# Expose as interface target so code can #include <httplib.h>
add_library(httplib INTERFACE)
target_include_directories(httplib INTERFACE ${THIRD_PARTY_DIR}/httplib)

# ─────────────────────────────────────────────────────────────
# Common include directories
# ─────────────────────────────────────────────────────────────
set(VIDHORA_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/include)

# ─────────────────────────────────────────────────────────────
# Shared static library (analysis + services, no server/main)
# ─────────────────────────────────────────────────────────────
set(VIDHORA_LIB_SOURCES
  src/analysis/analysis_engine.cpp
  src/services/dataset_generator.cpp
  src/services/csv_importer.cpp
  src/services/persistence.cpp
  src/utils/json_helpers.cpp
)

add_library(vidhora_lib STATIC ${VIDHORA_LIB_SOURCES})

target_include_directories(vidhora_lib PUBLIC ${VIDHORA_INCLUDE_DIR})
target_link_libraries(vidhora_lib PUBLIC nlohmann_json)

# ─────────────────────────────────────────────────────────────
# Main backend executable
# ─────────────────────────────────────────────────────────────
add_executable(vidhora_backend
  src/api/server.cpp
  src/main.cpp
)

target_include_directories(vidhora_backend PRIVATE ${VIDHORA_INCLUDE_DIR})

target_link_libraries(vidhora_backend PRIVATE
  vidhora_lib
  httplib
  nlohmann_json
)

if(WIN32)
  target_link_libraries(vidhora_backend PRIVATE ws2_32)
endif()

set_target_properties(vidhora_backend PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

# Ensure data directory exists alongside executable
add_custom_command(TARGET vidhora_backend POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:vidhora_backend>/data"
  COMMENT "Ensure data directory exists"
)

# ─────────────────────────────────────────────────────────────
# Unit tests executable
# ─────────────────────────────────────────────────────────────
add_executable(vidhora_tests
  tests/test_analysis.cpp
)

target_include_directories(vidhora_tests PRIVATE ${VIDHORA_INCLUDE_DIR})

target_link_libraries(vidhora_tests PRIVATE
  vidhora_lib
  nlohmann_json
)

if(WIN32)
  target_link_libraries(vidhora_tests PRIVATE ws2_32)
endif()

set_target_properties(vidhora_tests PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)


# ─────────────────────────────────────────────────────────────
# Week 1 validation tests executable
# ─────────────────────────────────────────────────────────────
add_executable(week1_tests
  tests/week1_validation_tests.cpp
)

target_include_directories(week1_tests PRIVATE ${VIDHORA_INCLUDE_DIR})

if(WIN32)
  target_link_libraries(week1_tests PRIVATE ws2_32)
endif()

set_target_properties(week1_tests PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

# ─────────────────────────────────────────────────────────────
enable_testing()
add_test(NAME vidhora_unit_tests COMMAND vidhora_tests)
add_test(NAME week1_validation_tests COMMAND week1_tests)

message(STATUS "Vidhora C++ Backend configured (C++17, vendored httplib + nlohmann/json)")
message(STATUS "  Backend exe : vidhora_backend")
message(STATUS "  Tests exe   : vidhora_tests, week1_tests")
