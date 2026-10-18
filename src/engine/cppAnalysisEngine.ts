import type {
  ElectricityReading,
  SeverityLevel,
  AnomalyRecord,
  PatternRecord,
  SuddenSpikeRecord
} from '../types/electricity';

/**
 * 1. STATISTICAL ALGORITHMS
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  return sum / values.length;
}

export function calculateMinimum(values: number[]): number {
  if (values.length === 0) return 0;
  let minVal = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < minVal) {
      minVal = values[i];
    }
  }
  return minVal;
}

export function calculateMaximum(values: number[]): number {
  if (values.length === 0) return 0;
  let maxVal = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > maxVal) {
      maxVal = values[i];
    }
  }
  return maxVal;
}

export function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length <= 1) return 0;
  const avg = mean !== undefined ? mean : calculateAverage(values);
  
  let sumSquaredDiffs = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - avg;
    sumSquaredDiffs += diff * diff;
  }
  
  const variance = sumSquaredDiffs / values.length;
  return Math.sqrt(variance);
}

/**
 * 7-Day Moving Average Baseline Algorithm
 */
export function calculateMovingAverageAtIndex(
  readings: ElectricityReading[],
  targetIndex: number,
  windowSize: number = 7
): number {
  if (readings.length === 0 || targetIndex < 0) return 0;
  
  const startIndex = Math.max(0, targetIndex - windowSize);
  const slice = readings.slice(startIndex, targetIndex);
  
  if (slice.length === 0) {
    return readings[targetIndex].totalConsumption;
  }
  
  const totals = slice.map(r => r.totalConsumption);
  return calculateAverage(totals);
}

/**
 * 2. ANOMALY & SEVERITY CONDITIONAL ALGORITHMS
 */
export function calculateDeviationPercent(current: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function detectSeverity(
  deviationPercent: number,
  thresholds: { low: number; medium: number; high: number } = { low: 20, medium: 40, high: 70 }
): SeverityLevel {
  if (deviationPercent < thresholds.low) {
    return 'NORMAL';
  } else if (deviationPercent < thresholds.medium) {
    return 'LOW';
  } else if (deviationPercent < thresholds.high) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
}

/**
 * 3. SUDDEN USAGE SPIKE DETECTION ALGORITHM
 */
export function detectSuddenSpikes(
  readings: ElectricityReading[],
  anomalies: AnomalyRecord[]
): SuddenSpikeRecord[] {
  const sortedReadings = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const spikeRecords: SuddenSpikeRecord[] = [];
  const anomalyMap = new Map<string, AnomalyRecord>();
  anomalies.forEach(a => anomalyMap.set(a.date, a));

  for (let i = 1; i < sortedReadings.length; i++) {
    const prev = sortedReadings[i - 1];
    const curr = sortedReadings[i];
    
    const prevVal = prev.totalConsumption;
    const currVal = curr.totalConsumption;
    const diff = currVal - prevVal;
    
    if (prevVal > 0) {
      const pctIncrease = ((currVal - prevVal) / prevVal) * 100;
      
      if (pctIncrease >= 30 || diff >= 3.0) {
        const anomaly = anomalyMap.get(curr.date);
        const severity = anomaly ? anomaly.severity : detectSeverity(pctIncrease);
        
        let isStreak = false;
        if (
          i + 1 < sortedReadings.length &&
          anomalyMap.has(sortedReadings[i + 1].date) &&
          anomalyMap.get(sortedReadings[i + 1].date)!.severity !== 'NORMAL'
        ) {
          isStreak = true;
        }

        const categoryDriver = anomaly?.largestContributor?.category || 'overall';
        const categoryDriverLabel = anomaly?.largestContributor?.categoryLabel || 'Overall Consumption';

        spikeRecords.push({
          id: `spike-${curr.date}`,
          date: curr.date,
          time: curr.time,
          consumption: currVal,
          prevDayConsumption: prevVal,
          differenceKwh: Number(diff.toFixed(2)),
          percentIncrease: Number(pctIncrease.toFixed(1)),
          severity: severity,
          spikeType: isStreak ? 'PERSISTENT_INCREASE' : 'TEMPORARY_SPIKE',
          driverCategory: categoryDriver,
          driverCategoryLabel: categoryDriverLabel,
        });
      }
    }
  }

  return spikeRecords;
}

/**
 * 4. TEMPORARY VS PERSISTENT PATTERN RECOGNITION ALGORITHM
 */
export function detectPatterns(
  readings: ElectricityReading[],
  anomalies: AnomalyRecord[]
): PatternRecord[] {
  const patterns: PatternRecord[] = [];
  const sortedReadings = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const anomalyMap = new Map<string, AnomalyRecord>();
  anomalies.forEach(a => anomalyMap.set(a.date, a));

  let i = 0;
  while (i < sortedReadings.length) {
    const r = sortedReadings[i];
    const anomaly = anomalyMap.get(r.date);

    if (anomaly && anomaly.severity !== 'NORMAL') {
      const streakStart = i;
      let streakEnd = i;

      while (
        streakEnd + 1 < sortedReadings.length &&
        anomalyMap.has(sortedReadings[streakEnd + 1].date) &&
        anomalyMap.get(sortedReadings[streakEnd + 1].date)!.severity !== 'NORMAL'
      ) {
        streakEnd++;
      }

      const durationDays = streakEnd - streakStart + 1;
      const streakReadings = sortedReadings.slice(streakStart, streakEnd + 1);
      const streakAnomalies = streakReadings.map(sr => anomalyMap.get(sr.date)!);

      const avgCons = calculateAverage(streakReadings.map(sr => sr.totalConsumption));
      const avgBase = calculateAverage(streakAnomalies.map(sa => sa.baseline));
      const avgDev = calculateAverage(streakAnomalies.map(sa => sa.deviationPercent));

      const categoryTotals: Record<string, number> = {};
      streakReadings.forEach(sr => {
        if (sr.categories) {
          Object.entries(sr.categories).forEach(([cat, val]) => {
            categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
          });
        }
      });

      let primaryCategory = 'overall';
      let maxCatVal = -1;
      Object.entries(categoryTotals).forEach(([cat, val]) => {
        if (val > maxCatVal) {
          maxCatVal = val;
          primaryCategory = cat;
        }
      });

      const maxSeverity = streakAnomalies.reduce<SeverityLevel>((max, sa) => {
        const order: Record<SeverityLevel, number> = { NORMAL: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
        return order[sa.severity] > order[max] ? sa.severity : max;
      }, 'NORMAL');

      if (durationDays === 1) {
        patterns.push({
          id: `pattern-temp-${r.date}`,
          type: 'TEMPORARY_SPIKE',
          startDate: r.date,
          endDate: r.date,
          durationDays: 1,
          averageConsumption: avgCons,
          averageBaseline: avgBase,
          averageDeviationPercent: avgDev,
          severity: maxSeverity,
          primaryCategoryDriver: primaryCategory,
          explanation: `Electricity consumption spiked significantly on ${r.date} (+${avgDev.toFixed(1)}% above baseline), but returned to normal range shortly afterward. This represents a temporary usage spike.`,
        });
      } else {
        patterns.push({
          id: `pattern-persist-${sortedReadings[streakStart].date}`,
          type: 'PERSISTENT_CHANGE',
          startDate: sortedReadings[streakStart].date,
          endDate: sortedReadings[streakEnd].date,
          durationDays: durationDays,
          averageConsumption: avgCons,
          averageBaseline: avgBase,
          averageDeviationPercent: avgDev,
          severity: maxSeverity,
          primaryCategoryDriver: primaryCategory,
          explanation: `Electricity consumption remained consistently elevated (+${avgDev.toFixed(1)}% avg deviation) for ${durationDays} consecutive days (from ${sortedReadings[streakStart].date} to ${sortedReadings[streakEnd].date}). This indicates a persistent shift in electricity consumption patterns.`,
        });
      }

      i = streakEnd + 1;
    } else {
      i++;
    }
  }

  return patterns;
}

/**
 * 5. SEARCHING & SORTING ALGORITHMS
 */
export function linearSearchByDate(readings: ElectricityReading[], targetDate: string): ElectricityReading | null {
  for (let i = 0; i < readings.length; i++) {
    if (readings[i].date === targetDate) {
      return readings[i];
    }
  }
  return null;
}

export function searchReadingsByKeyword(readings: ElectricityReading[], query: string): ElectricityReading[] {
  if (!query.trim()) return readings;
  const q = query.toLowerCase().trim();
  
  return readings.filter(r => {
    const dateMatch = r.date.toLowerCase().includes(q);
    const consMatch = r.totalConsumption.toString().includes(q);
    const noteMatch = r.notes ? r.notes.toLowerCase().includes(q) : false;
    return dateMatch || consMatch || noteMatch;
  });
}

export type SortField = 'date' | 'consumption' | 'ac' | 'refrigerator' | 'fans';
export type SortOrder = 'asc' | 'desc';

export function vectorSortReadings(
  readings: ElectricityReading[],
  field: SortField,
  order: SortOrder = 'asc'
): ElectricityReading[] {
  const result = [...readings];
  
  result.sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'consumption':
        comparison = a.totalConsumption - b.totalConsumption;
        break;
      case 'ac':
        comparison = (a.categories?.airConditioning || 0) - (b.categories?.airConditioning || 0);
        break;
      case 'refrigerator':
        comparison = (a.categories?.refrigerator || 0) - (b.categories?.refrigerator || 0);
        break;
      case 'fans':
        comparison = (a.categories?.fans || 0) - (b.categories?.fans || 0);
        break;
      default:
        comparison = 0;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return result;
}

/**
 * 6. CATEGORY CONTRIBUTION & LARGEST CONTRIBUTOR ALGORITHM
 */
export function findLargestCategoryDriver(
  baselineCategories: Record<string, number>,
  currentCategories?: Record<string, number>
) {
  if (!currentCategories || Object.keys(currentCategories).length === 0) {
    return undefined;
  }

  const categoryKeys = Object.keys(currentCategories);
  const labels: Record<string, string> = {
    airConditioning: 'Air Conditioning',
    refrigerator: 'Refrigerator',
    fans: 'Fans',
    lighting: 'Lighting',
    washingMachine: 'Washing Machine',
    other: 'Other Appliances',
  };

  let maxIncrease = -Infinity;
  let largestCategory = categoryKeys[0] || 'overall';
  let largestBase = 0;
  let largestCurrent = 0;

  const totalCurrent = Object.values(currentCategories).reduce((a, b) => a + b, 0);

  categoryKeys.forEach(cat => {
    const baseVal = baselineCategories[cat] || 0;
    const currVal = currentCategories[cat] || 0;
    const increase = currVal - baseVal;

    if (increase > maxIncrease) {
      maxIncrease = increase;
      largestCategory = cat;
      largestBase = baseVal;
      largestCurrent = currVal;
    }
  });

  const percentChange = largestBase > 0 ? ((largestCurrent - largestBase) / largestBase) * 100 : 0;
  const share = totalCurrent > 0 ? (largestCurrent / totalCurrent) * 100 : 0;

  return {
    category: largestCategory,
    categoryLabel: labels[largestCategory] || largestCategory,
    baselineValue: largestBase,
    currentValue: largestCurrent,
    absoluteIncrease: maxIncrease,
    percentChange: percentChange,
    contributionSharePercent: share,
  };
}
