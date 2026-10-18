# Vidhora — Smart Electricity Usage & Anomaly Analytics

Vidhora is a full-stack electricity consumption analytics application. A **React/TypeScript frontend** communicates exclusively with a **C++17 backend** that performs all statistical analysis, anomaly detection, pattern recognition, persistence, CSV processing, and search/sort logic.

---

## Architecture

```
React UI (Vite + TypeScript)
        ↓
  src/services/api.ts
        ↓
   HTTP/JSON (:8080)
        ↓
  C++ Backend (httplib)
        ↓
  C++ Analysis Engine
        ↓
  C++ Persistence (JSON file)
        ↓
   JSON response
        ↓
   React rendering
```

All of the following execute **inside C++**, never in the browser:

- Statistical metrics (average, min, max, std deviation, variance)
- Baseline calculation (historical average / moving average)
- Anomaly detection + severity classification
- Sudden spike detection
- Temporary vs persistent pattern recognition
- Linear regression trend analysis
- Category comparison matrix
- Time-range filtering (ALL / WEEKLY / MONTHLY / CUSTOM)
- Dataset processing and CSV import/export
- Search and sort (server-side, via query params)
- Settings and dataset persistence (JSON files on disk)

---

## Prerequisites

| Dependency | Minimum Version | Notes |
|---|---|---|
| MSVC (Visual Studio) | 2019 or 2022 | C++17, `/std:c++17` |
| CMake | 3.20+ | |
| Node.js | 18+ | |
| npm | 9+ | |

Third-party C++ libraries are **vendored** under `backend/third_party/` — no external package manager needed:
- `nlohmann/json` (single header)
- `cpp-httplib` (single header)

---

## Backend: Build & Run

### Configure (first time only)

```powershell
cmake -S backend -B backend/build -G "Visual Studio 17 2022" -A x64
```

### Build Release

```powershell
cmake --build backend/build --config Release
```

Output executables:
```
backend/build/bin/Release/vidhora_backend.exe
backend/build/bin/Release/vidhora_tests.exe
```

### Run Tests

```powershell
backend/build/bin/Release/vidhora_tests.exe
```

Expected: `Results: 96 passed, 0 failed`

### Start Backend

```powershell
backend/build/bin/Release/vidhora_backend.exe
```

The server listens on **port 8080** and prints:
```
Vidhora C++ Backend listening on port 8080
```

Data files are persisted at:
```
backend/build/bin/Release/data/
```

---

## Frontend: Install & Run

```powershell
npm install
npm run dev
```

The Vite dev server starts on **port 5173**.

The Vite proxy (`vite.config.ts`) forwards all `/api/*` requests to `http://localhost:8080`.

Open: [http://localhost:5173](http://localhost:5173)

### Production Build

```powershell
npm run build
```

Output goes to `dist/`.

---

## Ports

| Service | Port |
|---|---|
| C++ Backend | 8080 |
| Vite Dev Server | 5173 |

The backend must be running before starting the frontend. If the backend is unreachable, the app displays a clear error screen with restart instructions.

---

## API Overview

All endpoints are under `/api/`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend liveness check |
| GET | `/api/dataset` | Full dataset + metadata |
| POST | `/api/dataset/import` | Import CSV dataset |
| POST | `/api/dataset/reset` | Restore default PJM dataset |
| POST | `/api/analysis` | Run full C++ analysis pipeline |
| GET | `/api/settings` | Fetch analysis settings |
| PUT | `/api/settings` | Save analysis settings |
| GET | `/api/readings` | Fetch readings (supports `?q=`, `?sortField=`, `?sortOrder=`) |
| PUT | `/api/readings/:id` | Update a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/export/csv` | Export dataset as CSV download |

---

## Default Dataset

The included dataset is the **PJM Open Energy Dataset** — 365 daily electricity readings covering 2024-01-01 to 2024-12-30.

- 365 records
- 6 appliance category columns (AC, refrigerator, fans, lighting, washing machine, other)
- The dataset can be reset at any time via Settings → "Restore Included PJM Dataset" or `POST /api/dataset/reset`

---

## Legacy TypeScript Files

The following files remain in `src/` as migration reference material. They are **not imported by any production component** and do not execute at runtime:

| File | Status |
|---|---|
| `src/services/analysisEngine.ts` | Reference only — superseded by C++ |
| `src/engine/cppAnalysisEngine.ts` | Reference only — superseded by C++ |
| `src/services/csvImporter.ts` | Reference only — superseded by C++ |
| `src/services/dataStorage.ts` | Reference only — superseded by C++ |
| `src/services/realDataset.ts` | Reference only — superseded by C++ |
| `src/components/ImportDataset/ImportDatasetView.tsx` | Reference only — superseded by backend import UI in App.tsx |

These can be deleted once the migration reference period is over.
