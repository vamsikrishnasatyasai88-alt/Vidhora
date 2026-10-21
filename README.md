Vidhora — Smart Electricity Usage & Anomaly Analytics
C++ Concepts and Where to Find Them
Vidhora uses a C++17 backend for electricity-data processing, analytics, and API handling. This section maps the main C++ concepts to the relevant parts of the codebase. File names can vary between project versions, so verify the paths in the current repository before presenting them during a review.
C++ concept	Where to look in this repository	How it relates to Vidhora
Classes and objects	C++ source and header files under `backend/` and `include/`	Backend components can group related data and operations into classes, with objects created when the application runs.
Encapsulation	Class declarations in `include/` and their implementations in `backend/`	Class interfaces can keep internal data and implementation details separate from the code that uses them.
Abstraction	Backend API handlers under `backend/`; frontend API client at `src/services/api.ts`	The frontend requests results through API endpoints without needing to know how the C++ analysis is implemented internally.
Functions and modular programming	C++ implementation files (`.cpp`) and declarations in headers (`.h` / `.hpp`) under `backend/` and `include/`	Separate functions and modules can handle analysis, validation, data processing, and request handling.
STL containers and algorithms	C++ analysis and data-processing files under `backend/`	Standard-library containers and algorithms can support storing, filtering, and sorting readings. Check the actual source for the specific containers and algorithms used.
File handling	C++ persistence/data-management files under `backend/`; runtime data under `data/` or the configured backend data directory	The application reads or writes persistent data and processes CSV imports/exports.
Input validation and error handling	Backend API handlers and analysis functions under `backend/`	Validation helps handle invalid requests or readings; describe only the checks present in the code.
HTTP and JSON	Backend HTTP/API implementation under `backend/`; `src/services/api.ts` on the frontend	`cpp-httplib` handles HTTP requests, while `nlohmann/json` can parse or produce JSON data.
Testing	C++ test sources and the `vidhora_tests.exe` test target	Tests exercise backend behavior. Run the test executable to verify the current pass/fail result.
The Four Common OOP Principles
Encapsulation: grouping data and the operations that work on it, with controlled access.
Abstraction: exposing a simple interface while hiding implementation details.
Inheritance: defining a class based on another class.
Polymorphism: allowing a common interface to have different implementations, commonly through virtual functions and overriding in C++.
C++ supports all four principles, but the use of C++ does not automatically mean the project implements all four. Claim inheritance or polymorphism only if the actual source contains examples. During a code review, open the relevant class declarations and methods to demonstrate each concept.
---
Project Overview
Vidhora is a full-stack electricity consumption analytics application that helps users analyze energy usage, identify anomalies, and understand consumption patterns.
The application uses a React + TypeScript frontend and a C++17 backend. Core analysis, anomaly detection, data processing, and persistence are handled by the C++ backend, while the frontend provides the user interface and visualization.
Features
Statistical analysis: Calculate averages, minimums, maximums, variance, and standard deviation.
Anomaly detection: Identify unusual consumption and classify anomaly severity.
Trend analysis: Use linear regression to analyze consumption trends.
Pattern recognition: Detect sudden spikes and temporary or persistent usage patterns.
Baseline calculation: Compare readings against historical averages and moving averages.
Category comparison: Analyze consumption across appliance categories.
Data management: Import and export datasets using CSV.
Search and sorting: Filter and sort readings through server-side API requests.
Time-range filtering: Analyze all data or select weekly, monthly, and custom date ranges.
Persistent storage: Save datasets and analysis settings in JSON files.
Architecture
```text
React + TypeScript Frontend
          |
          v
   API Service (HTTP/JSON)
          |
          v
     C++17 Backend
          |
          v
    Analysis Engine
          |
          v
   JSON File Storage
          |
          v
    JSON API Response
          |
          v
  Frontend Visualization
```
The frontend communicates with the backend through HTTP requests. Core analytics and data-processing operations run in C++, rather than in the browser.
Technology Stack
Component	Technology
Frontend	React, TypeScript, Vite
Backend	C++17
HTTP server	cpp-httplib
JSON processing	nlohmann/json
Build system	CMake
Data storage	JSON files
Dataset import/export	CSV
Prerequisites
Dependency	Minimum version
Visual Studio / MSVC	Visual Studio 2019 or 2022
CMake	3.20+
Node.js	18+
npm	9+
The C++ dependencies, `cpp-httplib` and `nlohmann/json`, are included in `backend/third_party/`.
Getting Started
1. Build the C++ Backend
Run these commands from the project root in PowerShell.
Configure the project (first-time setup):
```powershell
cmake -S backend -B backend/build -G "Visual Studio 17 2022" -A x64
```
Build the Release version:
```powershell
cmake --build backend/build --config Release
```
The build produces the backend and test executables at:
```text
backend/build/bin/Release/vidhora_backend.exe
backend/build/bin/Release/vidhora_tests.exe
```
2. Run the Backend Tests
```powershell
backend/build/bin/Release/vidhora_tests.exe
```
Expected result, if unchanged from the current project setup:
```text
Results: 96 passed, 0 failed
```
3. Start the Backend
```powershell
backend/build/bin/Release/vidhora_backend.exe
```
The server listens on port 8080. The expected startup message is:
```text
Vidhora C++ Backend listening on port 8080
```
The default persistent data directory is:
```text
backend/build/bin/Release/data/
```
Keep the backend running while using the frontend.
4. Install and Start the Frontend
Open a second terminal in the project root and run:
```powershell
npm install
npm run dev
```
Open http://localhost:5173.
The Vite development server forwards `/api/*` requests to `http://localhost:8080`.
5. Build the Frontend for Production
```powershell
npm run build
```
The production frontend build is generated in `dist/`.
API Reference
All endpoints are prefixed with `/api`.
Method	Endpoint	Description
GET	`/api/health`	Check backend availability
GET	`/api/dataset`	Retrieve the dataset and metadata
POST	`/api/dataset/import`	Import a CSV dataset
POST	`/api/dataset/reset`	Restore the default dataset
POST	`/api/analysis`	Run the C++ analysis pipeline
GET	`/api/settings`	Retrieve analysis settings
PUT	`/api/settings`	Update analysis settings
GET	`/api/readings`	Retrieve readings with optional search and sorting
PUT	`/api/readings/:id`	Update a reading
DELETE	`/api/readings/:id`	Delete a reading
GET	`/api/export/csv`	Export the dataset as a CSV file
The readings endpoint supports the query parameters `q`, `sortField`, and `sortOrder`.
Default Dataset
Vidhora includes the PJM Open Energy Dataset, containing daily electricity readings for 2024.
Records: 365
Date range: January 1 – December 30, 2024
Appliance categories: Air conditioning (AC), refrigerator, fans, lighting, washing machine, and other
The default dataset can be restored through Settings → Restore Included PJM Dataset or by sending a `POST` request to `/api/dataset/reset`.
Legacy TypeScript Files
These files were described as migration references in the previous README. Confirm that no active components or build scripts depend on them before removing them.
File	Purpose
`src/services/analysisEngine.ts`	Legacy analysis engine
`src/engine/cppAnalysisEngine.ts`	Legacy C++ integration reference
`src/services/csvImporter.ts`	Legacy CSV importer
`src/services/dataStorage.ts`	Legacy data storage
`src/services/realDataset.ts`	Legacy dataset reference
`src/components/ImportDataset/ImportDatasetView.tsx`	Legacy dataset import interface
Project Goal
Vidhora aims to make electricity consumption easier to understand by combining data analysis, anomaly detection, and interactive visualization in a single application.
The project demonstrates how a modern web frontend can communicate with a C++ backend to process data and return analytical results through an HTTP API.
