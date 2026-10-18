import type { ElectricityReading, AppSettings, DatasetMetadata } from '../types/electricity';
import { loadPJMRealDataset, PJM_REAL_DATASET_METADATA } from './realDataset';

const STORAGE_KEY_READINGS = 'vidhora_real_dataset_readings_v2';
const STORAGE_KEY_METADATA = 'vidhora_dataset_metadata_v2';
const STORAGE_KEY_SETTINGS = 'vidhora_app_settings_v2';

export const DEFAULT_SETTINGS: AppSettings = {
  baselineMethod: 'HISTORICAL_AVERAGE',
  movingAverageWindow: 7,
  thresholds: {
    low: 20,
    medium: 40,
    high: 70,
  },
  spikeThresholdPercent: 30,
};

export function loadDataset(): { readings: ElectricityReading[]; metadata: DatasetMetadata } {
  try {
    const rawReadings = localStorage.getItem(STORAGE_KEY_READINGS);
    const rawMetadata = localStorage.getItem(STORAGE_KEY_METADATA);

    if (!rawReadings || !rawMetadata) {
      const initialReadings = loadPJMRealDataset();
      const initialMetadata = PJM_REAL_DATASET_METADATA;
      saveDataset(initialReadings, initialMetadata);
      return { readings: initialReadings, metadata: initialMetadata };
    }

    return {
      readings: JSON.parse(rawReadings),
      metadata: JSON.parse(rawMetadata),
    };
  } catch (err) {
    console.error('Failed to load dataset from localStorage:', err);
    const initialReadings = loadPJMRealDataset();
    const initialMetadata = PJM_REAL_DATASET_METADATA;
    return { readings: initialReadings, metadata: initialMetadata };
  }
}

export function saveDataset(readings: ElectricityReading[], metadata: DatasetMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEY_READINGS, JSON.stringify(readings));
    localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(metadata));
  } catch (err) {
    console.error('Failed to save dataset to localStorage:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function resetToPJMRealDataset(): { readings: ElectricityReading[]; metadata: DatasetMetadata } {
  const readings = loadPJMRealDataset();
  const metadata = PJM_REAL_DATASET_METADATA;
  saveDataset(readings, metadata);
  return { readings, metadata };
}
