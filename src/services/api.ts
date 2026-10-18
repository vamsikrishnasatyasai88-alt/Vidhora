/**
 * Vidhora API Service
 * All production data flows through this module → C++ backend HTTP API.
 * The TypeScript analysis engine (analysisEngine.ts, cppAnalysisEngine.ts)
 * is NO LONGER the production source of truth.
 */

import type {
  ElectricityReading,
  DatasetMetadata,
  AppSettings,
  AnalysisResults,
  TimeRangeMode,
  CustomDateRange,
  CSVParseResult,
} from '../types/electricity';

// Vite dev proxy maps /api/* → http://localhost:8080/api/*
// In production the C++ backend serves on the configured base URL.
const API_BASE = '/api';

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.error || message;
    } catch (_) {}
    throw new Error(`Vidhora API error (${path}): ${message}`);
  }

  return res.json() as Promise<T>;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; service: string; version: string }> {
  return apiFetch('/health');
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

export interface DatasetResponse {
  metadata: DatasetMetadata;
  readings: ElectricityReading[];
}

export async function fetchDataset(): Promise<DatasetResponse> {
  return apiFetch<DatasetResponse>('/dataset');
}

export async function importCSVDataset(csvText: string, filename: string): Promise<{
  success: boolean;
  metadata: DatasetMetadata;
  warnings: string[];
  errors: string[];
  previewRows: Record<string, string>[];
}> {
  return apiFetch('/dataset/import', {
    method: 'POST',
    body: JSON.stringify({ csvText, filename }),
  });
}

export async function resetDataset(): Promise<{
  success: boolean;
  metadata: DatasetMetadata;
  recordCount: number;
}> {
  return apiFetch('/dataset/reset', { method: 'POST' });
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export async function runAnalysis(
  timeRangeMode: TimeRangeMode = 'ALL',
  customRange?: CustomDateRange,
  settings?: AppSettings
): Promise<AnalysisResults> {
  return apiFetch<AnalysisResults>('/analysis', {
    method: 'POST',
    body: JSON.stringify({
      timeRangeMode,
      customRange,
      settings,
    }),
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<AppSettings> {
  return apiFetch<AppSettings>('/settings');
}

export async function saveSettingsToBackend(settings: AppSettings): Promise<AppSettings> {
  return apiFetch<AppSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ─── Readings (CRUD) ─────────────────────────────────────────────────────────

export async function fetchReadings(options?: {
  q?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ElectricityReading[]> {
  const params = new URLSearchParams();
  if (options?.q)          params.set('q',         options.q);
  if (options?.sortField)  params.set('sortField',  options.sortField);
  if (options?.sortOrder)  params.set('sortOrder',  options.sortOrder ?? 'asc');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ElectricityReading[]>(`/readings${qs}`);
}

export async function updateReading(id: string, patch: Partial<ElectricityReading>): Promise<void> {
  await apiFetch(`/readings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteReading(id: string): Promise<void> {
  await apiFetch(`/readings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function getExportCSVUrl(): string {
  return `${API_BASE}/export/csv`;
}

export async function downloadExportCSV(): Promise<void> {
  const res = await fetch(`${API_BASE}/export/csv`);
  if (!res.ok) throw new Error('CSV export failed');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'vidhora_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Fallback: produce a CSVParseResult shape from backend import response ────

export function buildCSVParseResultFromBackend(backendResponse: {
  success: boolean;
  metadata: DatasetMetadata;
  warnings: string[];
  errors: string[];
  previewRows: Record<string, string>[];
}): Pick<CSVParseResult, 'success' | 'metadata' | 'warnings' | 'errors' | 'previewRows'> {
  return {
    success:     backendResponse.success,
    metadata:    backendResponse.metadata,
    warnings:    backendResponse.warnings,
    errors:      backendResponse.errors,
    previewRows: backendResponse.previewRows,
  };
}
