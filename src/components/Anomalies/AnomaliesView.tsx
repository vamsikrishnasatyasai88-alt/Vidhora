import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  Clock,
  Filter
} from 'lucide-react';
import type { AnalysisResults } from '../../types/electricity';

interface AnomaliesViewProps {
  analysisResults: AnalysisResults;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({ analysisResults }) => {
  const { anomalies, suddenSpikes, patterns } = analysisResults;
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
  const persistentCount = patterns.filter(p => p.type === 'PERSISTENT_CHANGE').length;

  const filteredAnomalies = anomalies.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Top Summary Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-white font-display text-sm">Anomalies & Spikes Overview</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Total Anomalies: <strong className="text-white">{anomalies.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-rose-300">
            High Severity: <strong className="text-rose-400">{highCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300">
            Sudden Spikes: <strong className="text-amber-400">{suddenSpikes.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
            Persistent Shifts: <strong className="text-cyan-400">{persistentCount}</strong>
          </span>
        </div>
      </div>

      {/* Section 1: Sudden Spikes */}
      {suddenSpikes.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Sudden Spikes ({suddenSpikes.length})</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Day-over-day consumption jumps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suddenSpikes.map((spike) => (
              <div key={spike.id} className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>{spike.date}</span>
                  <span className="text-amber-300">+{spike.percentIncrease}% Jump</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 rounded bg-slate-950/60 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Previous</span>
                    <span>{spike.prevDayConsumption} kWh</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Current</span>
                    <strong className="text-amber-300">{spike.consumption} kWh</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Increase</span>
                    <strong className="text-rose-400">+{spike.differenceKwh} kWh</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Persistent Patterns */}
      {patterns.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Persistent Changes ({patterns.length})</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Consecutive abnormal days</span>
          </div>

          <div className="space-y-2.5">
            {patterns.map((p) => {
              const isPersistent = p.type === 'PERSISTENT_CHANGE';

              return (
                <div key={p.id} className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isPersistent ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      }`}>
                        {isPersistent ? 'Persistent Shift' : 'Temporary Spike'}
                      </span>
                      <span className="font-bold text-white">{p.startDate} {p.durationDays > 1 ? `to ${p.endDate}` : ''}</span>
                    </div>

                    <span className="text-rose-400 font-mono">Avg Dev: +{p.averageDeviationPercent.toFixed(1)}%</span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {p.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: All Individual Anomalies */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>All Anomaly Records ({filteredAnomalies.length})</span>
          </h3>

          <div className="flex items-center gap-1 p-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded font-mono text-[11px] font-medium transition-colors ${
                  filterSeverity === sev
                    ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-mono">
            No records match selected severity filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAnomalies.map((anom) => {
              const isHigh = anom.severity === 'HIGH';
              const isMed = anom.severity === 'MEDIUM';

              return (
                <div key={anom.id} className="p-3.5 rounded bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{anom.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                      isHigh ? 'bg-rose-500/15 text-rose-300 border-rose-500/20' :
                      isMed ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' :
                      'bg-yellow-500/15 text-yellow-300 border-yellow-500/20'
                    }`}>
                      {anom.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 rounded bg-slate-950/60 text-slate-300">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Consumption</span>
                      <strong className="text-teal-300">{anom.consumption} kWh</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Baseline</span>
                      <span>{anom.baseline} kWh</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Deviation</span>
                      <strong className="text-rose-400">+{anom.deviationPercent}%</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
