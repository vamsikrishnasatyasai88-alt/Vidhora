/**
 * Vidhora — App.tsx (C++ backend edition)
 *
 * Production data flow:
 *   React UI → api.ts → HTTP → C++ backend → C++ analysis engine → JSON → React UI
 *
 * The TypeScript analysis engine (analysisEngine.ts / cppAnalysisEngine.ts) is
 * kept for reference only and is NOT called in this file.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { TimeRangeFilter } from './components/TimeRangeFilter';
import { DashboardView } from './components/Dashboard/DashboardView';
// ImportDatasetView (legacy TS CSV component) is intentionally not imported.
// The active import UI is ImportDatasetViewBackend (inline in this file) which routes through the C++ API.
import { HistoricalTableView } from './components/HistoricalTable/HistoricalTableView';
import { AnalysisView } from './components/Analysis/AnalysisView';
import { AnomaliesView } from './components/Anomalies/AnomaliesView';
import { ReportsView } from './components/Reports/ReportsView';
import { SettingsView } from './components/Settings/SettingsView';

import type {
  ElectricityReading,
  DatasetMetadata,
  AppSettings,
  AnalysisResults,
  TimeRangeMode,
  CustomDateRange,
} from './types/electricity';

import {
  fetchDataset,
  runAnalysis,
  fetchSettings,
  saveSettingsToBackend,
  resetDataset,
  updateReading,
  deleteReading,
  importCSVDataset,
} from './services/api';

// Default analysis results shown while loading
const EMPTY_ANALYSIS: AnalysisResults = {
  metrics: {
    recordCount: 0,
    totalConsumption: 0,
    averageConsumption: 0,
    minConsumption: 0,
    maxConsumption: 0,
    standardDeviation: 0,
    variance: 0,
    consumptionRange: 0,
  },
  baselineValue: 0,
  baselineMethod: 'HISTORICAL_AVERAGE',
  normalRange: { min: 0, max: 0 },
  trend: { direction: 'STABLE', slope: 0, percentageChangeOverPeriod: 0, description: '' },
  anomalies: [],
  suddenSpikes: [],
  patterns: [],
  categoryComparisons: [],
  insights: {
    summaryTitle: 'Loading…',
    explainableParagraph: '',
    keyDrivers: [],
    recommendations: [],
    technicalSummary: '',
  },
  timeRangeInfo: { mode: 'ALL', label: 'All Time', startDate: '', endDate: '' },
  hasCategories: false,
};

// Default settings while loading
const DEFAULT_SETTINGS: AppSettings = {
  baselineMethod: 'HISTORICAL_AVERAGE',
  movingAverageWindow: 7,
  thresholds: { low: 20, medium: 40, high: 70 },
  spikeThresholdPercent: 30,
};

export function App() {
  const [activeTab, setActiveTab]             = useState<ActiveTab>('dashboard');
  const [readings, setReadings]               = useState<ElectricityReading[]>([]);
  const [metadata, setMetadata]               = useState<DatasetMetadata>({
    id: '', name: 'Loading…', source: '', type: 'Real-world Public Dataset',
    recordCount: 0, dateRange: { start: '', end: '' }, frequency: '',
    consumptionField: '', hasCategories: false, categoryFields: [],
    validRecords: 0, missingRecords: 0, invalidRecords: 0,
  });
  const [settings, setSettings]               = useState<AppSettings>(DEFAULT_SETTINGS);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>(EMPTY_ANALYSIS);
  const [mobileOpen, setMobileOpen]           = useState<boolean>(false);
  const [isLoading, setIsLoading]             = useState<boolean>(true);
  const [backendError, setBackendError]       = useState<string | null>(null);

  // Time Range
  const [timeMode, setTimeMode]       = useState<TimeRangeMode>('ALL');
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  });

  // Debounce analysis re-runs
  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        setBackendError(null);
        const [dsRes, settingsRes] = await Promise.all([
          fetchDataset(),
          fetchSettings(),
        ]);

        setReadings(dsRes.readings);
        setMetadata(dsRes.metadata);
        setSettings(settingsRes);

        // Set custom range to dataset bounds
        if (dsRes.readings.length > 0) {
          const sorted = [...dsRes.readings].sort((a, b) => a.date.localeCompare(b.date));
          setCustomRange({
            startDate: sorted[0].date,
            endDate:   sorted[sorted.length - 1].date,
          });
        }
      } catch (err: any) {
        setBackendError(
          `Cannot reach C++ backend. Make sure vidhora_backend.exe is running on port 8080.\n\n${err?.message ?? err}`
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── Re-run analysis whenever time mode / settings change ─────────────────

  const triggerAnalysis = useCallback(
    (mode: TimeRangeMode, range: CustomDateRange, currentSettings: AppSettings) => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
      analysisTimer.current = setTimeout(async () => {
        try {
          const result = await runAnalysis(mode, range, currentSettings);
          setAnalysisResults(result);
        } catch (err: any) {
          console.error('Analysis error:', err);
        }
      }, 200);
    },
    []
  );

  useEffect(() => {
    if (!isLoading && readings.length > 0) {
      triggerAnalysis(timeMode, customRange, settings);
    }
  }, [timeMode, customRange, settings, isLoading, readings.length, triggerAnalysis]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleConfirmDatasetImport = useCallback(
    async (importedReadings: ElectricityReading[], importedMetadata: DatasetMetadata) => {
      setReadings(importedReadings);
      setMetadata(importedMetadata);
      if (importedReadings.length > 0) {
        const sorted = [...importedReadings].sort((a, b) => a.date.localeCompare(b.date));
        const newRange = { startDate: sorted[0].date, endDate: sorted[sorted.length - 1].date };
        setCustomRange(newRange);
        triggerAnalysis(timeMode, newRange, settings);
      }
      setActiveTab('dashboard');
    },
    [timeMode, settings, triggerAnalysis]
  );

  const handleRestorePJMDataset = useCallback(async () => {
    try {
      await resetDataset();
      // Reload fresh dataset
      const dsRes = await fetchDataset();
      setReadings(dsRes.readings);
      setMetadata(dsRes.metadata);
      if (dsRes.readings.length > 0) {
        const sorted = [...dsRes.readings].sort((a, b) => a.date.localeCompare(b.date));
        const newRange = { startDate: sorted[0].date, endDate: sorted[sorted.length - 1].date };
        setCustomRange(newRange);
        triggerAnalysis(timeMode, newRange, settings);
      }
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to restore PJM dataset:', err);
    }
  }, [timeMode, settings, triggerAnalysis]);

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      const saved = await saveSettingsToBackend(newSettings);
      setSettings(saved);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSettings(newSettings); // optimistic update
    }
  }, []);

  const handleUpdateReading = useCallback(async (updated: ElectricityReading) => {
    try {
      await updateReading(updated.id, updated);
      setReadings(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error('Failed to update reading:', err);
    }
  }, []);

  const handleDeleteReading = useCallback(async (readingId: string) => {
    try {
      await deleteReading(readingId);
      setReadings(prev => {
        const filtered = prev.filter(r => r.id !== readingId);
        setMetadata(m => ({ ...m, recordCount: filtered.length, validRecords: filtered.length }));
        return filtered;
      });
    } catch (err) {
      console.error('Failed to delete reading:', err);
    }
  }, []);

  const showTimeFilter = ['dashboard', 'analysis', 'anomalies', 'reports'].includes(activeTab);

  // ─── Backend error screen ─────────────────────────────────────────────────

  if (backendError) {
    return (
      <div className="flex min-h-screen bg-[#0b0f17] text-slate-100 font-sans items-center justify-center p-8">
        <div className="max-w-lg space-y-4 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-rose-400">C++ Backend Unreachable</h1>
          <pre className="text-xs text-slate-400 bg-slate-900 p-4 rounded-lg text-left whitespace-pre-wrap border border-slate-800">
            {backendError}
          </pre>
          <p className="text-sm text-slate-400">
            Start the backend with:<br/>
            <code className="text-teal-300 font-mono">C:\vbuild\bin\Release\vidhora_backend.exe</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading screen ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0b0f17] text-slate-100 font-sans items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400 font-mono">Connecting to C++ backend…</p>
        </div>
      </div>
    );
  }

  // ─── Main app ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        anomalyCount={analysisResults.anomalies.length}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          metadata={metadata}
          onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
          onRestoreDataset={handleRestorePJMDataset}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {showTimeFilter && (
            <TimeRangeFilter
              timeMode={timeMode}
              setTimeMode={setTimeMode}
              customRange={customRange}
              setCustomRange={setCustomRange}
              rangeLabel={analysisResults.timeRangeInfo.label}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              analysisResults={analysisResults}
              readings={readings}
              metadata={metadata}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'import-dataset' && (
            <ImportDatasetViewBackend
              currentMetadata={metadata}
              onConfirmDatasetImport={handleConfirmDatasetImport}
              onRestorePJMDataset={handleRestorePJMDataset}
            />
          )}

          {activeTab === 'historical-data' && (
            <HistoricalTableView
              readings={readings}
              analysisResults={analysisResults}
              onUpdateReading={handleUpdateReading}
              onDeleteReading={handleDeleteReading}
            />
          )}

          {activeTab === 'analysis' && (
            <AnalysisView analysisResults={analysisResults} />
          )}

          {activeTab === 'anomalies' && (
            <AnomaliesView analysisResults={analysisResults} />
          )}

          {activeTab === 'reports' && (
            <ReportsView analysisResults={analysisResults} readings={readings} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onRestorePJMDataset={handleRestorePJMDataset}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Backend-aware ImportDatasetView wrapper ──────────────────────────────────

import React, { useState as useReactState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Database,
  RefreshCcw,
  Info,
} from 'lucide-react';

interface BackendImportProps {
  currentMetadata: DatasetMetadata;
  onConfirmDatasetImport: (readings: ElectricityReading[], metadata: DatasetMetadata) => void;
  onRestorePJMDataset: () => void;
}

function ImportDatasetViewBackend({
  currentMetadata,
  onConfirmDatasetImport,
  onRestorePJMDataset,
}: BackendImportProps) {
  const [fileName, setFileName]               = useReactState<string | null>(null);
  const [pendingCsvText, setPendingCsvText]   = useReactState<string | null>(null);
  const [previewRows, setPreviewRows]         = useReactState<Record<string, string>[]>([]);
  const [pendingMeta, setPendingMeta]         = useReactState<DatasetMetadata | null>(null);
  const [warnings, setWarnings]               = useReactState<string[]>([]);
  const [errors, setErrors]                   = useReactState<string[]>([]);
  const [importMsg, setImportMsg]             = useReactState<string | null>(null);
  const [uploading, setUploading]             = useReactState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      const text = await file.text();
      setPendingCsvText(text);
      // Send to C++ backend for parsing
      const res = await importCSVDataset(text, file.name);
      if (res.success) {
        setPendingMeta(res.metadata);
        setPreviewRows(res.previewRows ?? []);
        setWarnings(res.warnings ?? []);
        setErrors([]);
      } else {
        setErrors(res.errors ?? ['Import failed']);
        setPendingMeta(null);
        setPreviewRows([]);
      }
    } catch (err: any) {
      setErrors([err?.message ?? 'Upload error']);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingCsvText || !fileName) return;
    setUploading(true);
    try {
      // Full import already done on backend side; reload dataset
      const dsRes = await fetchDataset();
      onConfirmDatasetImport(dsRes.readings, dsRes.metadata);
      setImportMsg(`Successfully imported "${dsRes.metadata.name}" (${dsRes.readings.length.toLocaleString()} records).`);
      setPendingMeta(null);
      setFileName(null);
      setTimeout(() => setImportMsg(null), 4000);
    } catch (err: any) {
      setErrors([err?.message ?? 'Confirm failed']);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-5xl">
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white font-display">Active Dataset</h3>
              <p className="text-xs text-slate-400 font-mono">{currentMetadata.name}</p>
            </div>
          </div>
          <button
            onClick={onRestorePJMDataset}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Restore PJM Dataset</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Records</span>
            <strong className="text-white">{currentMetadata.recordCount.toLocaleString()}</strong>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Date Range</span>
            <strong className="text-slate-200">{currentMetadata.dateRange.start} — {currentMetadata.dateRange.end}</strong>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Consumption Field</span>
            <strong className="text-teal-300">{currentMetadata.consumptionField}</strong>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Appliance Fields</span>
            <strong className="text-cyan-300">{currentMetadata.hasCategories ? `${currentMetadata.categoryFields.length} Fields` : 'None'}</strong>
          </div>
        </div>
      </div>

      {importMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{importMsg}</span>
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-8 text-center transition-colors bg-slate-900/30">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-dataset-input"
            disabled={uploading}
          />
          <label htmlFor="csv-file-dataset-input" className="cursor-pointer space-y-2 block">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <span className="text-sm font-bold text-white block">
                {uploading ? 'Processing…' : 'Drop your CSV file here'}
              </span>
              <span className="text-xs text-slate-400">
                or <strong className="text-teal-400 hover:underline">Browse Files</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono block pt-1">Supported format: CSV</span>
            {fileName && (
              <span className="inline-block px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 text-xs font-mono border border-teal-500/20 mt-2">
                Selected: {fileName}
              </span>
            )}
          </label>
        </div>

        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {pendingMeta && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-300 font-bold">
                Dataset Detected: <strong className="text-teal-300">{pendingMeta.recordCount.toLocaleString()} records</strong> ({pendingMeta.dateRange.start} to {pendingMeta.dateRange.end})
              </span>
              <span className="text-slate-400">
                {pendingMeta.hasCategories ? `${pendingMeta.categoryFields.length} Category Columns` : 'No category columns'}
              </span>
            </div>

            {warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{warnings[0]}</div>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-white font-display block">Preview Dataset (First 20 Records)</span>
                <div className="max-h-60 overflow-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        {Object.keys(previewRows[0] ?? {}).map((h, i) => (
                          <th key={i} className="p-2.5 whitespace-nowrap font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-800/40">
                          {Object.values(row).map((v, ci) => (
                            <td key={ci} className="p-2.5 whitespace-nowrap">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmImport}
              disabled={uploading}
              className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              {uploading ? 'Loading…' : 'Confirm & Load Dataset'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
