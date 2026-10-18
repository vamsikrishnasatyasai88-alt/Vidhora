import React from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Zap,
  Clock
} from 'lucide-react';
import type { AnalysisResults, ElectricityReading } from '../../types/electricity';
import { downloadExportCSV } from '../../services/api';

interface ReportsViewProps {
  analysisResults: AnalysisResults;
  readings: ElectricityReading[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  analysisResults,
  readings: _readings, // kept in props signature for API compatibility; CSV export uses backend endpoint
}) => {
  const { metrics, trend, anomalies, suddenSpikes, patterns, insights, timeRangeInfo } = analysisResults;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = async () => {
    try {
      await downloadExportCSV();
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
  const medCount = anomalies.filter(a => a.severity === 'MEDIUM').length;
  const lowCount = anomalies.filter(a => a.severity === 'LOW').length;
  const persistentCount = patterns.filter(p => p.type === 'PERSISTENT_CHANGE').length;
  const temporaryCount = patterns.filter(p => p.type === 'TEMPORARY_SPIKE').length;

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* Action Controls Header */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-sm font-bold text-white font-display">Electricity Usage Report</h3>
            <p className="text-xs text-slate-400">Generate executive summary report for {timeRangeInfo.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Document Sheet */}
      <div className="glass-card p-6 space-y-6 print:bg-white print:text-black print:border-none print:shadow-none font-sans">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-800 print:border-gray-300 pb-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white print:text-black tracking-tight">
              Vidhora Electricity Usage Report
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              Smart Electricity Usage & Anomaly Analytics
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-400 print:text-gray-600 space-y-0.5">
            <div>Generated: <strong>{new Date().toLocaleDateString()}</strong></div>
            <div>Time Scope: <strong>{timeRangeInfo.label}</strong></div>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <span className="text-[10px] uppercase text-slate-500 print:text-gray-600 block">Total Consumption</span>
            <div className="text-lg font-bold text-white print:text-black">{metrics.totalConsumption} kWh</div>
            <span className="text-[10px] text-slate-400 print:text-gray-600 block">{metrics.recordCount} Records</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <span className="text-[10px] uppercase text-slate-500 print:text-gray-600 block">Daily Average</span>
            <div className="text-lg font-bold text-teal-300 print:text-teal-700">{metrics.averageConsumption} kWh</div>
            <span className="text-[10px] text-slate-400 print:text-gray-600 block">Baseline: {analysisResults.baselineValue} kWh</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <span className="text-[10px] uppercase text-slate-500 print:text-gray-600 block">Total Anomalies</span>
            <div className="text-lg font-bold text-rose-400 print:text-rose-700">{anomalies.length}</div>
            <span className="text-[10px] text-slate-400 print:text-gray-600 block">{highCount} High, {medCount} Med, {lowCount} Low</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <span className="text-[10px] uppercase text-slate-500 print:text-gray-600 block">Usage Trend</span>
            <div className="text-lg font-bold text-white print:text-black">{trend.direction}</div>
            <span className="text-[10px] text-slate-400 print:text-gray-600 block">Slope: {trend.slope} kWh/d</span>
          </div>
        </div>

        {/* Sudden Spike & Pattern Audit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 print:text-amber-700 font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Spike & Pattern Audit</span>
            </div>
            <div className="text-slate-300 print:text-gray-800 space-y-0.5 pt-1">
              <div>Sudden Spikes: <strong>{suddenSpikes.length}</strong></div>
              <div>Temporary Events: <strong>{temporaryCount}</strong></div>
              <div>Persistent Shifts: <strong>{persistentCount}</strong></div>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 print:text-cyan-700 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Extreme Range Bounds</span>
            </div>
            <div className="text-slate-300 print:text-gray-800 space-y-0.5 pt-1">
              <div>Minimum Usage: <strong>{metrics.minConsumption} kWh</strong></div>
              <div>Maximum Usage: <strong>{metrics.maxConsumption} kWh</strong></div>
              <div>Range Span: <strong>{metrics.consumptionRange} kWh</strong></div>
            </div>
          </div>
        </div>

        {/* Explainable Insights Paragraph */}
        <div className="p-4 rounded bg-slate-900/60 print:bg-gray-50 border border-slate-800 print:border-gray-300 space-y-1.5">
          <h4 className="text-xs font-bold text-white print:text-black font-display uppercase tracking-wider">
            Key Analytical Findings
          </h4>
          <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
            {insights.explainableParagraph}
          </p>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white print:text-black font-display uppercase tracking-wider">
            Recommendations
          </h4>
          <div className="space-y-1.5 text-xs">
            {insights.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-slate-300 print:text-gray-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
