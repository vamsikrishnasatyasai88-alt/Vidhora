import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Database,
  RefreshCcw,
  Info
} from 'lucide-react';
import type { ElectricityReading, DatasetMetadata, CSVParseResult } from '../../types/electricity';
import { processCSVDataset } from '../../services/csvImporter';

interface ImportDatasetViewProps {
  currentMetadata: DatasetMetadata;
  onConfirmDatasetImport: (readings: ElectricityReading[], metadata: DatasetMetadata) => void;
  onRestorePJMDataset: () => void;
}

export const ImportDatasetView: React.FC<ImportDatasetViewProps> = ({
  currentMetadata,
  onConfirmDatasetImport,
  onRestorePJMDataset,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = processCSVDataset(text, file.name);
        setCsvResult(result);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (csvResult && csvResult.readings.length > 0) {
      onConfirmDatasetImport(csvResult.readings, csvResult.metadata);
      setImportSuccessMsg(`Successfully imported "${csvResult.metadata.name}" (${csvResult.readings.length.toLocaleString()} records).`);
      setCsvResult(null);
      setFileName(null);
      setTimeout(() => setImportSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-5xl">
      {/* Active Dataset Overview */}
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

      {importSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Main Upload Dropzone Area */}
      <div className="glass-card p-6 space-y-6">
        <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-8 text-center transition-colors bg-slate-900/30">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-dataset-input"
          />
          <label htmlFor="csv-file-dataset-input" className="cursor-pointer space-y-2 block">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <span className="text-sm font-bold text-white block">Drop your CSV file here</span>
              <span className="text-xs text-slate-400">or <strong className="text-teal-400 hover:underline">Browse Files</strong></span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono block pt-1">Supported format: CSV</span>
            {fileName && (
              <span className="inline-block px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 text-xs font-mono border border-teal-500/20 mt-2">
                Selected: {fileName}
              </span>
            )}
          </label>
        </div>

        {/* Dataset Detected & 20-Row Preview */}
        {csvResult && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-300 font-bold">
                Dataset Detected: <strong className="text-teal-300">{csvResult.readings.length.toLocaleString()} records</strong> ({csvResult.metadata.dateRange.start} to {csvResult.metadata.dateRange.end})
              </span>
              <span className="text-slate-400">
                {csvResult.metadata.hasCategories ? `${Object.keys(csvResult.columnMapping.categoryCols).length} Category Columns` : 'No category columns'}
              </span>
            </div>

            {csvResult.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{csvResult.warnings[0]}</div>
              </div>
            )}

            {/* Preview Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white font-display block">Preview Dataset (First 20 Records)</span>
              <div className="max-h-60 overflow-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      {Object.keys(csvResult.previewRows[0] || {}).map((header, idx) => (
                        <th key={idx} className="p-2.5 whitespace-nowrap font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {csvResult.previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-800/40">
                        {Object.values(row).map((val: any, colIdx) => (
                          <td key={colIdx} className="p-2.5 whitespace-nowrap">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleConfirmImport}
              className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Confirm & Load Dataset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
