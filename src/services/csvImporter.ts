import type { ElectricityReading, DatasetMetadata, ColumnMapping, CSVParseResult } from '../types/electricity';

/**
 * Header Column Auto-Detection Engine
 */
export function detectCSVColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));

  let dateIdx = normalized.findIndex(h => h.includes('date') || h.includes('day') || h.includes('timestamp'));
  if (dateIdx === -1) dateIdx = 0;

  let timeIdx = normalized.findIndex(h => h.includes('time') || h.includes('hour') || h.includes('clock'));

  let consIdx = normalized.findIndex(h => 
    h.includes('consumption') || h.includes('total') || h.includes('kwh') || h.includes('energy') || h.includes('usage') || h.includes('power')
  );
  if (consIdx === -1) {
    consIdx = normalized.findIndex((_, idx) => idx !== dateIdx && idx !== timeIdx);
  }
  if (consIdx === -1) consIdx = 1;

  const categoryCols: Record<string, string> = {};
  headers.forEach((originalHeader, idx) => {
    if (idx === dateIdx || idx === timeIdx || idx === consIdx) return;
    const h = normalized[idx];

    if (h.includes('ac') || h.includes('air')) categoryCols['airConditioning'] = originalHeader;
    else if (h.includes('fridge') || h.includes('refrigerator')) categoryCols['refrigerator'] = originalHeader;
    else if (h.includes('fan')) categoryCols['fans'] = originalHeader;
    else if (h.includes('light')) categoryCols['lighting'] = originalHeader;
    else if (h.includes('wash')) categoryCols['washingMachine'] = originalHeader;
    else if (h.includes('other')) categoryCols['other'] = originalHeader;
    else {
      const key = originalHeader.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      categoryCols[key] = originalHeader;
    }
  });

  return {
    dateCol: headers[dateIdx] || 'date',
    timeCol: timeIdx !== -1 ? headers[timeIdx] : undefined,
    consumptionCol: headers[consIdx] || 'total_consumption',
    categoryCols,
  };
}

/**
 * Parses real-world CSV electricity datasets
 */
export function processCSVDataset(csvText: string, filename: string = 'imported_dataset.csv'): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length <= 1) {
    return {
      success: false,
      readings: [],
      metadata: {
        id: 'error-empty',
        name: filename,
        source: 'User Upload',
        type: 'Imported CSV Dataset',
        recordCount: 0,
        dateRange: { start: '', end: '' },
        frequency: 'Unknown',
        consumptionField: 'N/A',
        hasCategories: false,
        categoryFields: [],
        validRecords: 0,
        missingRecords: 0,
        invalidRecords: 0,
      },
      columnMapping: { dateCol: '', consumptionCol: '', categoryCols: {} },
      previewRows: [],
      errors: ['CSV file is empty or missing data rows.'],
      warnings: [],
    };
  }

  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const columnMapping = detectCSVColumns(rawHeaders);

  const dateColIdx = rawHeaders.indexOf(columnMapping.dateCol);
  const timeColIdx = columnMapping.timeCol ? rawHeaders.indexOf(columnMapping.timeCol) : -1;
  const consColIdx = rawHeaders.indexOf(columnMapping.consumptionCol);

  const categoryColIndices: Record<string, number> = {};
  Object.entries(columnMapping.categoryCols).forEach(([key, originalHeader]) => {
    const idx = rawHeaders.indexOf(originalHeader);
    if (idx !== -1) categoryColIndices[key] = idx;
  });

  const parsedReadings: ElectricityReading[] = [];
  const previewRows: Record<string, any>[] = [];
  let missingCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const tokens = lines[i].split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
    if (tokens.length < 2) continue;

    if (previewRows.length < 20) {
      const rowObj: Record<string, any> = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = tokens[idx] || '';
      });
      previewRows.push(rowObj);
    }

    const dateVal = dateColIdx !== -1 ? tokens[dateColIdx] : '';
    const timeVal = timeColIdx !== -1 ? tokens[timeColIdx] : undefined;
    const rawCons = consColIdx !== -1 ? tokens[consColIdx] : '';

    if (!dateVal) {
      missingCount++;
      continue;
    }

    const parsedCons = parseFloat(rawCons);
    if (isNaN(parsedCons) || parsedCons < 0) {
      invalidCount++;
      continue;
    }

    let categories: Record<string, number> | undefined = undefined;
    if (Object.keys(categoryColIndices).length > 0) {
      categories = {};
      Object.entries(categoryColIndices).forEach(([key, idx]) => {
        const val = parseFloat(tokens[idx]);
        categories![key] = !isNaN(val) && val >= 0 ? val : 0;
      });
    }

    parsedReadings.push({
      id: `imported-${dateVal}-${i}`,
      date: dateVal,
      time: timeVal,
      totalConsumption: Number(parsedCons.toFixed(2)),
      categories,
    });
  }

  const sortedReadings = [...parsedReadings].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sortedReadings.length > 0 ? sortedReadings[0].date : '';
  const endDate = sortedReadings.length > 0 ? sortedReadings[sortedReadings.length - 1].date : '';

  const hasCategories = Object.keys(columnMapping.categoryCols).length > 0;

  const metadata: DatasetMetadata = {
    id: `csv-${Date.now()}`,
    name: filename,
    source: 'User Imported CSV Dataset',
    type: 'Imported CSV Dataset',
    recordCount: parsedReadings.length,
    dateRange: { start: startDate, end: endDate },
    frequency: timeColIdx !== -1 ? 'Hourly / Interval' : 'Daily',
    consumptionField: columnMapping.consumptionCol,
    hasCategories: hasCategories,
    categoryFields: Object.values(columnMapping.categoryCols),
    validRecords: parsedReadings.length,
    missingRecords: missingCount,
    invalidRecords: invalidCount,
  };

  if (!hasCategories) {
    warnings.push('No appliance/category fields detected. Vidhora will analyze overall electricity consumption, but appliance category contribution matrix will be disabled.');
  }

  return {
    success: parsedReadings.length > 0,
    readings: parsedReadings,
    metadata,
    columnMapping,
    previewRows,
    errors,
    warnings,
  };
}

export function exportReadingsToCSV(readings: ElectricityReading[]): string {
  if (readings.length === 0) return 'date,total_consumption\n';
  
  const sample = readings[0];
  const categoryKeys = sample.categories ? Object.keys(sample.categories) : [];
  
  const header = `date,time,total_consumption${categoryKeys.length > 0 ? ',' + categoryKeys.join(',') : ''},notes\n`;
  
  const rows = readings.map(r => {
    const catVals = categoryKeys.map(k => r.categories?.[k] ?? 0).join(',');
    return `${r.date},"${r.time || ''}",${r.totalConsumption}${categoryKeys.length > 0 ? ',' + catVals : ''},"${r.notes || ''}"`;
  }).join('\n');

  return header + rows;
}
