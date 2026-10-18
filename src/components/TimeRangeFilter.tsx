import React from 'react';
import { Calendar, Filter } from 'lucide-react';
import type { TimeRangeMode, CustomDateRange } from '../types/electricity';

interface TimeRangeFilterProps {
  timeMode: TimeRangeMode;
  setTimeMode: (mode: TimeRangeMode) => void;
  customRange: CustomDateRange;
  setCustomRange: (range: CustomDateRange) => void;
  rangeLabel: string;
}

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  timeMode,
  setTimeMode,
  customRange,
  setCustomRange,
  rangeLabel,
}) => {
  return (
    <div className="glass-panel p-2.5 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center gap-1 p-1 rounded bg-slate-900 border border-slate-800">
        <span className="text-slate-500 font-mono text-[11px] px-1.5 flex items-center gap-1">
          <Filter className="w-3 h-3 text-teal-400" />
          <span>Period:</span>
        </span>

        <button
          onClick={() => setTimeMode('ALL')}
          className={`px-2.5 py-1 rounded font-mono text-xs font-medium transition-colors ${
            timeMode === 'ALL'
              ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Time
        </button>

        <button
          onClick={() => setTimeMode('WEEKLY')}
          className={`px-2.5 py-1 rounded font-mono text-xs font-medium transition-colors ${
            timeMode === 'WEEKLY'
              ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Weekly (7D)
        </button>

        <button
          onClick={() => setTimeMode('MONTHLY')}
          className={`px-2.5 py-1 rounded font-mono text-xs font-medium transition-colors ${
            timeMode === 'MONTHLY'
              ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Monthly
        </button>

        <button
          onClick={() => setTimeMode('CUSTOM')}
          className={`px-2.5 py-1 rounded font-mono text-xs font-medium transition-colors ${
            timeMode === 'CUSTOM'
              ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Pickers or Scope Label */}
      {timeMode === 'CUSTOM' ? (
        <div className="flex items-center gap-2 font-mono">
          <input
            type="date"
            value={customRange.startDate}
            onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500/50"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customRange.endDate}
            onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500/50"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] px-2">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>Active Scope: <strong className="text-slate-200 font-semibold">{rangeLabel}</strong></span>
        </div>
      )}
    </div>
  );
};
