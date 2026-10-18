import type {
  ElectricityReading,
  AppSettings,
  AnalysisResults,
  StatisticalMetrics,
  TrendAnalysis,
  AnomalyRecord,
  CategoryComparison,
  InsightReport,
  TimeRangeMode,
  CustomDateRange,
  PatternRecord
} from '../types/electricity';

import {
  calculateAverage,
  calculateMinimum,
  calculateMaximum,
  calculateStandardDeviation,
  calculateMovingAverageAtIndex,
  calculateDeviationPercent,
  detectSeverity,
  detectSuddenSpikes,
  detectPatterns
} from '../engine/cppAnalysisEngine';

/**
 * Filter readings by selected Time Range Scope (All Time, Weekly, Monthly, Custom Range)
 */
export function filterReadingsByTimeRange(
  readings: ElectricityReading[],
  mode: TimeRangeMode,
  customRange?: CustomDateRange
): { filteredReadings: ElectricityReading[]; label: string; startDate: string; endDate: string } {
  if (readings.length === 0) {
    return { filteredReadings: [], label: 'All Time (0 Records)', startDate: '', endDate: '' };
  }

  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const latestDateStr = sorted[sorted.length - 1].date;
  const latestDate = new Date(latestDateStr);

  let filtered: ElectricityReading[] = sorted;
  let label = 'All Time';
  let startDate = sorted[0].date;
  let endDate = latestDateStr;

  if (mode === 'WEEKLY') {
    // Last 7 days relative to latest dataset date
    const sevenDaysPrior = new Date(latestDate);
    sevenDaysPrior.setDate(latestDate.getDate() - 6);
    const minDateStr = sevenDaysPrior.toISOString().split('T')[0];

    filtered = sorted.filter(r => r.date >= minDateStr && r.date <= latestDateStr);
    startDate = minDateStr;
    endDate = latestDateStr;
    label = `Weekly (Last 7 Days: ${startDate} to ${endDate})`;
  } else if (mode === 'MONTHLY') {
    // Current month relative to latest dataset date
    const yearMonth = latestDateStr.substring(0, 7); // YYYY-MM
    filtered = sorted.filter(r => r.date.startsWith(yearMonth));
    startDate = `${yearMonth}-01`;
    endDate = latestDateStr;
    label = `Monthly (${yearMonth})`;
  } else if (mode === 'CUSTOM' && customRange && customRange.startDate && customRange.endDate) {
    filtered = sorted.filter(
      r => r.date >= customRange.startDate && r.date <= customRange.endDate
    );
    startDate = customRange.startDate;
    endDate = customRange.endDate;
    label = `Custom Range (${startDate} to ${endDate})`;
  } else {
    label = `All Time (${startDate} to ${endDate})`;
  }

  return {
    filteredReadings: filtered.length > 0 ? filtered : sorted,
    label,
    startDate,
    endDate,
  };
}

/**
 * Executes standard linear regression slope calculation
 */
export function calculateLinearRegressionTrend(readings: ElectricityReading[]): TrendAnalysis {
  if (readings.length < 2) {
    return {
      direction: 'STABLE',
      slope: 0,
      percentageChangeOverPeriod: 0,
      description: 'Insufficient dataset points to calculate trend slope.',
    };
  }

  const n = readings.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = readings[i].totalConsumption;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const rawSlope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const slope = Number(rawSlope.toFixed(3));

  const firstY = readings[0].totalConsumption;
  const lastY = readings[n - 1].totalConsumption;
  const pctChange = firstY > 0 ? Number((((lastY - firstY) / firstY) * 100).toFixed(1)) : 0;

  let direction: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
  let description = '';

  if (slope > 0.05) {
    direction = 'INCREASING';
    description = `Electricity consumption displays a upward slope (+${slope} kWh/period) across the selected dataset.`;
  } else if (slope < -0.05) {
    direction = 'DECREASING';
    description = `Electricity consumption displays a downward slope (${slope} kWh/period) across the selected dataset.`;
  } else {
    direction = 'STABLE';
    description = `Electricity consumption remains stable with a near-zero slope (${slope} kWh/period).`;
  }

  return {
    direction,
    slope,
    percentageChangeOverPeriod: pctChange,
    description,
  };
}

/**
 * Main Full C++ Analysis Execution Pipeline
 */
export function runFullAnalysis(
  readings: ElectricityReading[],
  settings: AppSettings,
  timeRangeMode: TimeRangeMode = 'ALL',
  customRange?: CustomDateRange
): AnalysisResults {
  // 1. Time Scope Filter
  const { filteredReadings, label: timeRangeLabel, startDate, endDate } = filterReadingsByTimeRange(
    readings,
    timeRangeMode,
    customRange
  );

  const sorted = [...filteredReadings].sort((a, b) => a.date.localeCompare(b.date));
  const totals = sorted.map(r => r.totalConsumption);
  const recordCount = sorted.length;

  // 2. Statistical Baseline Metrics
  const totalConsumption = totals.reduce((sum, val) => sum + val, 0);
  const averageConsumption = calculateAverage(totals);
  const minConsumption = calculateMinimum(totals);
  const maxConsumption = calculateMaximum(totals);
  const standardDeviation = calculateStandardDeviation(totals, averageConsumption);
  const variance = standardDeviation * standardDeviation;
  const consumptionRange = maxConsumption - minConsumption;

  const metrics: StatisticalMetrics = {
    recordCount,
    totalConsumption: Number(totalConsumption.toFixed(2)),
    averageConsumption: Number(averageConsumption.toFixed(2)),
    minConsumption: Number(minConsumption.toFixed(2)),
    maxConsumption: Number(maxConsumption.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    consumptionRange: Number(consumptionRange.toFixed(2)),
  };

  // 3. Baseline Selection (Historical Mean vs 7-Day Moving Average)
  const baselineValue = metrics.averageConsumption;
  const normalMin = Number(Math.max(0, baselineValue - standardDeviation).toFixed(2));
  const normalMax = Number((baselineValue + standardDeviation).toFixed(2));

  // Check if appliance categories exist in dataset
  const firstReadingWithCats = sorted.find(r => r.categories && Object.keys(r.categories).length > 0);
  const hasCategories = !!firstReadingWithCats;

  // Baseline category split
  const categoryBaselines: Record<string, number> = {};
  if (hasCategories) {
    sorted.forEach(r => {
      if (r.categories) {
        Object.entries(r.categories).forEach(([cat, val]) => {
          categoryBaselines[cat] = (categoryBaselines[cat] || 0) + val;
        });
      }
    });
    Object.keys(categoryBaselines).forEach(cat => {
      categoryBaselines[cat] = Number((categoryBaselines[cat] / recordCount).toFixed(2));
    });
  }

  // 4. Anomaly Detection Engine
  const anomalies: AnomalyRecord[] = [];
  sorted.forEach((r, idx) => {
    let readingBaseline = baselineValue;
    if (settings.baselineMethod === 'MOVING_AVERAGE') {
      readingBaseline = calculateMovingAverageAtIndex(sorted, idx, settings.movingAverageWindow);
    }

    const devPercent = calculateDeviationPercent(r.totalConsumption, readingBaseline);
    const severity = detectSeverity(devPercent, settings.thresholds);

    if (severity !== 'NORMAL') {
      let largestContributor = undefined;

      if (hasCategories && r.categories && Object.keys(r.categories).length > 0) {
        const catKeys = Object.keys(r.categories);
        let maxIncrease = -Infinity;
        let largestCatKey = catKeys[0];
        let largestBaseVal = 0;
        let largestCurrVal = 0;

        catKeys.forEach(catKey => {
          const baseVal = categoryBaselines[catKey] || 0;
          const currVal = r.categories?.[catKey] || 0;
          const inc = currVal - baseVal;
          if (inc > maxIncrease) {
            maxIncrease = inc;
            largestCatKey = catKey;
            largestBaseVal = baseVal;
            largestCurrVal = currVal;
          }
        });

        const labels: Record<string, string> = {
          airConditioning: 'Air Conditioning',
          refrigerator: 'Refrigerator',
          fans: 'Fans',
          lighting: 'Lighting',
          washingMachine: 'Washing Machine',
          other: 'Other Appliances',
        };

        const pctChange = largestBaseVal > 0 ? ((largestCurrVal - largestBaseVal) / largestBaseVal) * 100 : 0;
        const share = r.totalConsumption > 0 ? (largestCurrVal / r.totalConsumption) * 100 : 0;

        largestContributor = {
          category: largestCatKey,
          categoryLabel: labels[largestCatKey] || largestCatKey,
          baselineValue: largestBaseVal,
          currentValue: largestCurrVal,
          percentChange: Number(pctChange.toFixed(1)),
          contributionSharePercent: Number(share.toFixed(1)),
        };
      }

      anomalies.push({
        id: `anom-${r.id}`,
        readingId: r.id,
        date: r.date,
        time: r.time,
        consumption: r.totalConsumption,
        baseline: Number(readingBaseline.toFixed(2)),
        deviationPercent: Number(devPercent.toFixed(1)),
        severity,
        pattern: 'TEMPORARY_SPIKE',
        largestContributor,
      });
    }
  });

  // 5. Sudden Spike Detection
  const suddenSpikes = detectSuddenSpikes(sorted, anomalies);

  // 6. Pattern Event Recognition (Temporary vs Persistent)
  const patterns = detectPatterns(sorted, anomalies);

  const patternMap = new Map<string, 'TEMPORARY_SPIKE' | 'PERSISTENT_CHANGE'>();
  patterns.forEach(p => {
    if (p.type === 'PERSISTENT_CHANGE') {
      const idxStart = sorted.findIndex(r => r.date === p.startDate);
      const idxEnd = sorted.findIndex(r => r.date === p.endDate);
      if (idxStart !== -1 && idxEnd !== -1) {
        for (let k = idxStart; k <= idxEnd; k++) {
          patternMap.set(sorted[k].date, 'PERSISTENT_CHANGE');
        }
      }
    }
  });

  anomalies.forEach(a => {
    if (patternMap.get(a.date) === 'PERSISTENT_CHANGE') {
      a.pattern = 'PERSISTENT_CHANGE';
    }
  });

  // 7. Trend Analysis (Linear Regression)
  const trend = calculateLinearRegressionTrend(sorted);

  // 8. Category Comparison Matrix
  const categoryComparisons: CategoryComparison[] = [];
  if (hasCategories) {
    const labels: Record<string, string> = {
      airConditioning: 'Air Conditioning',
      refrigerator: 'Refrigerator',
      fans: 'Fans',
      lighting: 'Lighting',
      washingMachine: 'Washing Machine',
      other: 'Other Appliances',
    };

    const categoryRecentSums: Record<string, number> = {};
    sorted.forEach(r => {
      if (r.categories) {
        Object.entries(r.categories).forEach(([cat, val]) => {
          categoryRecentSums[cat] = (categoryRecentSums[cat] || 0) + val;
        });
      }
    });

    Object.keys(categoryBaselines).forEach(cat => {
      const baseVal = categoryBaselines[cat] || 0;
      const currAvg = Number(((categoryRecentSums[cat] || 0) / recordCount).toFixed(2));
      const absChange = Number((currAvg - baseVal).toFixed(2));
      const pctChange = baseVal > 0 ? Number((((currAvg - baseVal) / baseVal) * 100).toFixed(1)) : 0;
      const share = metrics.averageConsumption > 0 ? Number(((currAvg / metrics.averageConsumption) * 100).toFixed(1)) : 0;

      categoryComparisons.push({
        category: cat,
        label: labels[cat] || cat,
        baselineValue: baseVal,
        currentValue: currAvg,
        absoluteChange: absChange,
        percentChange: pctChange,
        sharePercent: share,
      });
    });
  }

  // 9. Generate Explainable Insights
  const insights = generateInsightReport({
    metrics,
    baselineValue,
    trend,
    anomalies,
    patterns,
    categoryComparisons,
    hasCategories,
    timeRangeLabel,
  });

  return {
    metrics,
    baselineValue,
    baselineMethod: settings.baselineMethod,
    normalRange: { min: normalMin, max: normalMax },
    trend,
    anomalies,
    suddenSpikes,
    patterns,
    categoryComparisons,
    insights,
    timeRangeInfo: {
      mode: timeRangeMode,
      label: timeRangeLabel,
      startDate,
      endDate,
    },
    hasCategories,
  };
}

/**
 * Deterministic Explainable Insight Generator
 */
function generateInsightReport(params: {
  metrics: StatisticalMetrics;
  baselineValue: number;
  trend: TrendAnalysis;
  anomalies: AnomalyRecord[];
  patterns: PatternRecord[];
  categoryComparisons: CategoryComparison[];
  hasCategories: boolean;
  timeRangeLabel: string;
}): InsightReport {
  const { metrics, baselineValue, trend, anomalies, patterns, categoryComparisons, hasCategories, timeRangeLabel } = params;

  const totalAnomalies = anomalies.length;
  const persistentCount = patterns.filter(p => p.type === 'PERSISTENT_CHANGE').length;
  const tempCount = patterns.filter(p => p.type === 'TEMPORARY_SPIKE').length;

  let summaryTitle = 'Normal Electricity Usage Pattern Detected';
  if (totalAnomalies > 0) {
    summaryTitle = persistentCount > 0
      ? `Persistent Usage Shifts Detected (${persistentCount} Event${persistentCount > 1 ? 's' : ''})`
      : `Temporary Usage Spikes Identified (${tempCount} Event${tempCount > 1 ? 's' : ''})`;
  }

  let driverText = '';
  if (hasCategories && categoryComparisons.length > 0) {
    const topCat = [...categoryComparisons].sort((a, b) => b.percentChange - a.percentChange)[0];
    if (topCat && topCat.percentChange > 10) {
      driverText = ` The primary driver behind higher usage was ${topCat.label}, which showed a +${topCat.percentChange}% increase over baseline.`;
    }
  }

  let explainableParagraph = '';
  if (totalAnomalies === 0) {
    explainableParagraph = `During ${timeRangeLabel}, electricity consumption averaged ${metrics.averageConsumption} kWh/day with zero high-severity anomalies detected. Consumption remained within normal expected baseline boundaries (${baselineValue} kWh).`;
  } else if (persistentCount > 0) {
    explainableParagraph = `Analysis of ${timeRangeLabel} revealed ${totalAnomalies} anomaly reading points including ${persistentCount} multi-day persistent shift(s). Electricity usage trended ${trend.direction.toLowerCase()} with a slope of ${trend.slope} kWh/period.${driverText}`;
  } else {
    explainableParagraph = `During ${timeRangeLabel}, ${totalAnomalies} temporary usage spike(s) were identified. Electricity consumption returned to normal baseline levels (${baselineValue} kWh) following each isolated spike.${driverText}`;
  }

  const keyDrivers: string[] = [];
  if (hasCategories) {
    categoryComparisons.forEach(c => {
      if (c.percentChange > 15) {
        keyDrivers.push(`${c.label} (+${c.percentChange}% vs baseline)`);
      }
    });
  }

  const recommendations: string[] = [
    `Compare identified peak usage days (${metrics.maxConsumption} kWh max) with normal days (${baselineValue} kWh baseline) to understand consumption drivers.`,
  ];

  if (hasCategories && keyDrivers.length > 0) {
    recommendations.push(`Review operating schedules and runtime for high-consumption appliances (${keyDrivers.join(', ')}).`);
  }

  if (persistentCount > 0) {
    recommendations.push('Investigate persistent multi-day shifts in electricity consumption to ensure operating schedules align with household requirements.');
  } else {
    recommendations.push('Review high-consumption periods to determine if temporary spikes correlate with specific household activities.');
  }

  const technicalSummary = `Processed ${metrics.recordCount} dataset records. Baseline Mean: ${baselineValue} kWh | StdDev (σ): ${metrics.standardDeviation} kWh | Trend Slope: ${trend.slope} kWh/period | Anomalies: ${totalAnomalies} (${persistentCount} persistent, ${tempCount} temporary).`;

  return {
    summaryTitle,
    explainableParagraph,
    keyDrivers,
    recommendations,
    technicalSummary,
  };
}
