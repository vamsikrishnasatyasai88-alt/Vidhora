// Vidhora Real Dataset-Driven Analytics System Types

export interface ElectricityReading {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM or HH:MM:SS
  totalConsumption: number; // kWh
  categories?: Record<string, number>; // appliance breakdown if available
  notes?: string;
}

export interface ColumnMapping {
  dateCol: string;
  timeCol?: string;
  consumptionCol: string;
  categoryCols: Record<string, string>; // categoryKey -> originalColumnHeader
}

export interface DatasetMetadata {
  id: string;
  name: string;
  source: string;
  sourceUrl?: string;
  type: 'Real-world Public Dataset' | 'Imported CSV Dataset' | 'Demo/Test Dataset';
  recordCount: number;
  dateRange: { start: string; end: string };
  frequency: string;
  consumptionField: string;
  hasCategories: boolean;
  categoryFields: string[];
  validRecords: number;
  missingRecords: number;
  invalidRecords: number;
}

export interface CSVParseResult {
  success: boolean;
  readings: ElectricityReading[];
  metadata: DatasetMetadata;
  columnMapping: ColumnMapping;
  previewRows: Record<string, any>[];
  errors: string[];
  warnings: string[];
}

export type SeverityLevel = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export type PatternType = 'NORMAL' | 'TEMPORARY_SPIKE' | 'PERSISTENT_CHANGE';

export type BaselineMethod = 'HISTORICAL_AVERAGE' | 'MOVING_AVERAGE';

export type TimeRangeMode = 'ALL' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

export interface AnomalyRecord {
  id: string;
  readingId: string;
  date: string;
  time?: string;
  consumption: number;
  baseline: number;
  deviationPercent: number;
  severity: SeverityLevel;
  pattern: PatternType;
  largestContributor?: {
    category: string;
    categoryLabel: string;
    baselineValue: number;
    currentValue: number;
    percentChange: number;
    contributionSharePercent: number;
  };
}

export interface SuddenSpikeRecord {
  id: string;
  date: string;
  time?: string;
  consumption: number;
  prevDayConsumption: number;
  differenceKwh: number;
  percentIncrease: number;
  severity: SeverityLevel;
  spikeType: 'TEMPORARY_SPIKE' | 'PERSISTENT_INCREASE';
  driverCategory?: string;
  driverCategoryLabel?: string;
}

export interface PatternRecord {
  id: string;
  type: PatternType;
  startDate: string;
  endDate: string;
  durationDays: number;
  averageConsumption: number;
  averageBaseline: number;
  averageDeviationPercent: number;
  severity: SeverityLevel;
  primaryCategoryDriver?: string;
  explanation: string;
}

export interface CategoryComparison {
  category: string;
  label: string;
  baselineValue: number;
  currentValue: number;
  absoluteChange: number;
  percentChange: number;
  sharePercent: number;
}

export interface StatisticalMetrics {
  recordCount: number;
  totalConsumption: number;
  averageConsumption: number;
  minConsumption: number;
  maxConsumption: number;
  standardDeviation: number;
  variance: number;
  consumptionRange: number;
}

export interface TrendAnalysis {
  direction: 'INCREASING' | 'STABLE' | 'DECREASING';
  slope: number;
  percentageChangeOverPeriod: number;
  description: string;
}

export interface InsightReport {
  summaryTitle: string;
  explainableParagraph: string;
  keyDrivers: string[];
  recommendations: string[];
  technicalSummary: string;
}

export interface AnalysisResults {
  metrics: StatisticalMetrics;
  baselineValue: number;
  baselineMethod: BaselineMethod;
  normalRange: { min: number; max: number };
  trend: TrendAnalysis;
  anomalies: AnomalyRecord[];
  suddenSpikes: SuddenSpikeRecord[];
  patterns: PatternRecord[];
  categoryComparisons: CategoryComparison[];
  insights: InsightReport;
  timeRangeInfo: {
    mode: TimeRangeMode;
    label: string;
    startDate: string;
    endDate: string;
  };
  hasCategories: boolean;
}

export interface AppSettings {
  baselineMethod: BaselineMethod;
  movingAverageWindow: number; // default 7 periods
  thresholds: {
    low: number;    // default 20%
    medium: number; // default 40%
    high: number;   // default 70%
  };
  spikeThresholdPercent: number; // default 30%
}
