import React from 'react';
import {
  ChevronRight,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import type { AnalysisResults, ElectricityReading, DatasetMetadata } from '../../types/electricity';
import { ConsumptionChart } from './ConsumptionChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import type { ActiveTab } from '../Sidebar';

interface DashboardViewProps {
  analysisResults: AnalysisResults;
  readings: ElectricityReading[];
  metadata: DatasetMetadata;
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analysisResults,
  readings,
  setActiveTab,
}) => {
  const { metrics, baselineValue, trend, anomalies, categoryComparisons, hasCategories } = analysisResults;

  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;

  return (
    <div className="space-y-6 pb-10">
      {/* 4 Compact KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Consumption */}
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Total Consumption</span>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {metrics.totalConsumption.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-normal">kWh</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Sum across {metrics.recordCount.toLocaleString()} records</p>
        </div>

        {/* Daily Average */}
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Average Daily</span>
          <div className="text-2xl font-bold text-teal-300 font-mono tracking-tight">
            {metrics.averageConsumption} <span className="text-xs font-sans text-slate-400 font-normal">kWh</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Baseline: {baselineValue} kWh</p>
        </div>

        {/* Total Anomalies */}
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Anomalies</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 font-mono tracking-tight">{anomalies.length}</span>
            {highCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/20">
                {highCount} High
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Out of normal range</p>
        </div>

        {/* Current Trend */}
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Current Trend</span>
          <div className="text-xl font-bold text-white tracking-tight">
            {trend.direction === 'INCREASING' ? '↗ Increasing' : trend.direction === 'DECREASING' ? '↘ Decreasing' : '→ Stable'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Slope: {trend.slope} kWh/period</p>
        </div>
      </div>

      {/* Main Visual Focus: Electricity Consumption Timeline Chart */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white font-display">Electricity Consumption</h3>
            <p className="text-xs text-slate-400 font-sans">Actual usage compared with calculated baseline</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-teal-400 rounded"></span>
              <span className="text-slate-300">Consumption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed border-amber-400"></span>
              <span className="text-slate-300">Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-slate-300">Anomaly</span>
            </div>
          </div>
        </div>

        <ConsumptionChart analysisResults={analysisResults} readings={readings} />
      </div>

      {/* Secondary Analytics 2-Column Row: Usage Pattern + Category Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Usage Pattern Summary */}
        <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>Usage Pattern Summary</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">Statistical bounds</span>
            </div>

            <div className="space-y-2 text-xs font-mono mt-3">
              <div className="flex justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400">Overall Trend Direction:</span>
                <strong className="text-white">{trend.direction} ({trend.slope} kWh/period)</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400">Daily Mean Average:</span>
                <strong className="text-teal-300">{metrics.averageConsumption} kWh</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400">Minimum Consumption:</span>
                <span className="text-slate-200">{metrics.minConsumption} kWh</span>
              </div>

              <div className="flex justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400">Maximum Consumption:</span>
                <span className="text-slate-200">{metrics.maxConsumption} kWh</span>
              </div>

              <div className="flex justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400">Standard Deviation (σ):</span>
                <span className="text-cyan-300">±{metrics.standardDeviation} kWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Category Donut Chart */}
        <CategoryDonutChart
          categories={categoryComparisons}
          readings={readings}
          hasCategories={hasCategories}
        />
      </div>

      {/* Bottom Section: Recent Anomalies & Spikes */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Recent Anomalies & Spikes</span>
          </h3>
          <button
            onClick={() => setActiveTab('anomalies')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
          >
            <span>View all anomalies</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {anomalies.length === 0 ? (
            <div className="col-span-3 p-6 text-center text-xs text-slate-400 font-mono">
              No abnormal consumption points detected in current dataset view.
            </div>
          ) : (
            anomalies.slice(0, 3).map((anom) => {
              const isHigh = anom.severity === 'HIGH';
              const isMed = anom.severity === 'MEDIUM';

              return (
                <div
                  key={anom.id}
                  className="p-3.5 rounded bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{anom.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                      isHigh ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' :
                      isMed ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' :
                      'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20'
                    }`}>
                      {anom.severity}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{anom.consumption} kWh vs {anom.baseline} kWh</span>
                    <strong className="text-rose-400">+{anom.deviationPercent}%</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
