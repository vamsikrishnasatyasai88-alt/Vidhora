import React, { useState } from 'react';
import {
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders,
  Layers,
  RefreshCw
} from 'lucide-react';
import type { AppSettings, BaselineMethod } from '../../types/electricity';

// Default settings constant — mirrors the C++ backend defaults (no localStorage dependency)
const DEFAULT_SETTINGS: AppSettings = {
  baselineMethod: 'HISTORICAL_AVERAGE',
  movingAverageWindow: 7,
  thresholds: { low: 20, medium: 40, high: 70 },
  spikeThresholdPercent: 30,
};

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRestorePJMDataset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRestorePJMDataset,
}) => {
  const [baselineMethod, setBaselineMethod] = useState<BaselineMethod>(settings.baselineMethod);
  const [movingWindow, setMovingWindow] = useState<number>(settings.movingAverageWindow);
  const [lowThresh, setLowThresh] = useState<number>(settings.thresholds.low);
  const [medThresh, setMedThresh] = useState<number>(settings.thresholds.medium);
  const [highThresh, setHighThresh] = useState<number>(settings.thresholds.high);
  const [spikeThresh, setSpikeThresh] = useState<number>(settings.spikeThresholdPercent || 30);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: AppSettings = {
      baselineMethod,
      movingAverageWindow: Math.max(3, Math.min(30, Number(movingWindow) || 7)),
      thresholds: {
        low: Number(lowThresh) || 20,
        medium: Number(medThresh) || 40,
        high: Number(highThresh) || 70,
      },
      spikeThresholdPercent: Number(spikeThresh) || 30,
    };

    onSaveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetToDefaults = () => {
    setBaselineMethod(DEFAULT_SETTINGS.baselineMethod);
    setMovingWindow(DEFAULT_SETTINGS.movingAverageWindow);
    setLowThresh(DEFAULT_SETTINGS.thresholds.low);
    setMedThresh(DEFAULT_SETTINGS.thresholds.medium);
    setHighThresh(DEFAULT_SETTINGS.thresholds.high);
    setSpikeThresh(DEFAULT_SETTINGS.spikeThresholdPercent);
    onSaveSettings(DEFAULT_SETTINGS);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12 max-w-3xl">
      {savedSuccess && (
        <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Section 1: Baseline Calculation Method */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>Analysis: Baseline Method</span>
          </h3>
          <p className="text-xs text-slate-400">Select algorithm for baseline calculation</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className={`p-3 rounded border cursor-pointer transition-colors ${
            baselineMethod === 'HISTORICAL_AVERAGE'
              ? 'bg-teal-500/10 border-teal-500/30 text-white font-semibold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="baselineMethod"
                checked={baselineMethod === 'HISTORICAL_AVERAGE'}
                onChange={() => setBaselineMethod('HISTORICAL_AVERAGE')}
                className="accent-teal-400"
              />
              <div>
                <strong className="block text-white">Historical Average</strong>
                <span className="text-[11px] text-slate-400 font-sans">Averages entire dataset history</span>
              </div>
            </div>
          </label>

          <label className={`p-3 rounded border cursor-pointer transition-colors ${
            baselineMethod === 'MOVING_AVERAGE'
              ? 'bg-teal-500/10 border-teal-500/30 text-white font-semibold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="baselineMethod"
                checked={baselineMethod === 'MOVING_AVERAGE'}
                onChange={() => setBaselineMethod('MOVING_AVERAGE')}
                className="accent-teal-400"
              />
              <div>
                <strong className="block text-white">Moving Average Window</strong>
                <span className="text-[11px] text-slate-400 font-sans">Sliding window of recent N periods</span>
              </div>
            </div>
          </label>
        </div>

        {baselineMethod === 'MOVING_AVERAGE' && (
          <div className="pt-2 text-xs font-mono">
            <label className="block text-slate-400 mb-1">Window Size (Periods):</label>
            <input
              type="number"
              min="3"
              max="30"
              value={movingWindow}
              onChange={(e) => setMovingWindow(parseInt(e.target.value) || 7)}
              className="w-28 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300 font-bold"
            />
          </div>
        )}
      </div>

      {/* Section 2: Anomaly Detection Thresholds */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Anomaly Detection: Percentage Thresholds</span>
          </h3>
          <p className="text-xs text-slate-400">Configure deviation percentage boundaries for severity classification</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="block text-yellow-400 font-bold">Low Severity (%)</label>
            <input
              type="number"
              min="5"
              max="50"
              value={lowThresh}
              onChange={(e) => setLowThresh(parseFloat(e.target.value) || 20)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-bold"
            />
            <span className="text-[10px] text-slate-500 block">Default: 20%</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="block text-orange-400 font-bold">Medium Severity (%)</label>
            <input
              type="number"
              min="20"
              max="100"
              value={medThresh}
              onChange={(e) => setMedThresh(parseFloat(e.target.value) || 40)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-bold"
            />
            <span className="text-[10px] text-slate-500 block">Default: 40%</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="block text-rose-400 font-bold">High Severity (%)</label>
            <input
              type="number"
              min="40"
              max="200"
              value={highThresh}
              onChange={(e) => setHighThresh(parseFloat(e.target.value) || 70)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-bold"
            />
            <span className="text-[10px] text-slate-500 block">Default: 70%</span>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="block text-amber-300 font-bold">Spike Jump (%)</label>
            <input
              type="number"
              min="10"
              max="100"
              value={spikeThresh}
              onChange={(e) => setSpikeThresh(parseFloat(e.target.value) || 30)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-bold"
            />
            <span className="text-[10px] text-slate-500 block">Default: 30%</span>
          </div>
        </div>
      </div>

      {/* Section 3: Dataset Control */}
      <div className="glass-card p-5 space-y-3 text-xs">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display">Dataset Management</h3>
          <span className="text-slate-400 font-mono">PJM Open Energy Dataset</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRestorePJMDataset}
            className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Restore Included PJM Dataset</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2.5 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4 stroke-[2.5]" />
          <span>Save Settings</span>
        </button>

        <button
          type="button"
          onClick={handleResetToDefaults}
          className="px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </form>
  );
};
