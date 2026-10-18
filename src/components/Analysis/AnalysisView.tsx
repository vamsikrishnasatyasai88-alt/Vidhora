import React from 'react';
import {
  Calculator,
  Layers,
  TrendingUp,
  Info
} from 'lucide-react';
import type { AnalysisResults } from '../../types/electricity';

interface AnalysisViewProps {
  analysisResults: AnalysisResults;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysisResults }) => {
  const { metrics, baselineValue, baselineMethod, normalRange, trend, categoryComparisons, hasCategories, timeRangeInfo } = analysisResults;

  const sortedCategories = [...categoryComparisons].sort((a, b) => b.percentChange - a.percentChange);
  const topContributor = sortedCategories[0];

  return (
    <div className="space-y-6 pb-10">
      {/* Section 1: Statistical Summary */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Calculator className="w-4 h-4 text-teal-400" />
            <span>Section 1: Statistical Summary ({timeRangeInfo.label})</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Record count: {metrics.recordCount.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Mean Baseline</span>
            <strong className="text-white text-base font-bold block">{baselineValue} kWh</strong>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Minimum</span>
            <strong className="text-teal-300 text-base font-bold block">{metrics.minConsumption} kWh</strong>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Maximum</span>
            <strong className="text-rose-400 text-base font-bold block">{metrics.maxConsumption} kWh</strong>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Range</span>
            <strong className="text-amber-300 text-base font-bold block">{metrics.consumptionRange} kWh</strong>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Variance (σ²)</span>
            <strong className="text-cyan-300 text-base font-bold block">{metrics.variance} kWh²</strong>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block uppercase">Std Deviation (σ)</span>
            <strong className="text-cyan-300 text-base font-bold block">±{metrics.standardDeviation} kWh</strong>
          </div>
        </div>
      </div>

      {/* Section 2: Baseline & Deviation */}
      <div className="glass-card p-5 space-y-3 font-mono text-xs">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between font-sans">
          <h3 className="text-sm font-bold text-white font-display">Section 2: Baseline & Deviation Boundaries</h3>
          <span className="text-xs text-slate-400 font-mono">Algorithm: {baselineMethod === 'HISTORICAL_AVERAGE' ? 'Historical Mean' : 'Moving Window'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">Normal Expected Range (Mean ± σ):</span>
            <strong className="text-emerald-300 text-sm">{normalRange.min} kWh — {normalRange.max} kWh</strong>
            <p className="text-[11px] text-slate-500 font-sans pt-0.5">Readings outside this band trigger anomaly status</p>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">Established Baseline Value:</span>
            <strong className="text-teal-300 text-sm">{baselineValue} kWh</strong>
            <p className="text-[11px] text-slate-500 font-sans pt-0.5">Central reference point for percentage deviation calculations</p>
          </div>
        </div>
      </div>

      {/* Section 3: Trend Analysis */}
      <div className="glass-card p-5 space-y-3">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Section 3: Trend Analysis</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Linear regression slope</span>
        </div>

        <div className="p-4 rounded bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white font-display">
              {trend.direction === 'INCREASING' ? '↗ Increasing Trend' : trend.direction === 'DECREASING' ? '↘ Decreasing Trend' : '→ Stable Trend'}
            </span>
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
              Slope: {trend.slope} kWh/period
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {trend.description}
          </p>
        </div>
      </div>

      {/* Section 4: Category Contribution (If supported by dataset) */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Section 4: Category Contribution</span>
          </h3>
          <p className="text-xs text-slate-400">Comparing baseline appliance averages against current dataset averages</p>
        </div>

        {hasCategories ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Baseline Avg</th>
                  <th className="p-3 font-semibold">Dataset Avg</th>
                  <th className="p-3 font-semibold">Change</th>
                  <th className="p-3 font-semibold">% Deviation</th>
                  <th className="p-3 font-semibold text-right">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {categoryComparisons.map((cat) => {
                  const isPositive = cat.percentChange > 0;
                  const isLargest = topContributor && topContributor.category === cat.category;

                  return (
                    <tr key={cat.category} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span>{cat.label}</span>
                        {isLargest && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/20 font-bold uppercase">
                            Top Driver
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{cat.baselineValue} kWh</td>
                      <td className="p-3 font-bold text-teal-300">{cat.currentValue} kWh</td>
                      <td className={`p-3 font-bold ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isPositive ? `+${cat.absoluteChange}` : cat.absoluteChange} kWh
                      </td>
                      <td className={`p-3 font-bold ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isPositive ? `+${cat.percentChange}%` : `${cat.percentChange}%`}
                      </td>
                      <td className="p-3 text-right text-slate-300">{cat.sharePercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 rounded bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <Info className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <span className="text-xs font-bold text-slate-200 block font-display">Category analysis unavailable</span>
            <p className="text-xs text-slate-400 font-sans max-w-lg mx-auto">
              The imported dataset does not contain appliance-level fields.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
