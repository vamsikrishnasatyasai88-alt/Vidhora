import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  IndianRupee,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Loader2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { calculateBillEstimate } from '../../services/api';
import type { BillEstimateResponse, BillEstimateRequest } from '../../types/bill';
import type { DatasetMetadata, CustomDateRange } from '../../types/electricity';

interface BillEstimatorViewProps {
  metadata: DatasetMetadata;
  customRange: CustomDateRange;
}

export const BillEstimatorView: React.FC<BillEstimatorViewProps> = ({
  metadata,
  customRange,
}) => {
  // ─── Input State ────────────────────────────────────────────────────────────
  const [tariff, setTariff] = useState<number>(8.0);
  const [fixedCharge, setFixedCharge] = useState<number>(100.0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(50.0);
  const [isAdditionalMonthly, setIsAdditionalMonthly] = useState<boolean>(true);
  const [billingPeriod, setBillingPeriod] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(customRange.startDate || '2024-01-01');
  const [endDate, setEndDate] = useState<string>(customRange.endDate || '2024-12-31');
  const [daysInMonth, setDaysInMonth] = useState<number>(30);
  const [customPercent, setCustomPercent] = useState<number>(15.0);

  // ─── API State ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BillEstimateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Fetch calculation from C++ backend ────────────────────────────────────
  const runCalculation = useCallback(
    async (
      currentTariff = tariff,
      currentFixed = fixedCharge,
      currentAdd = additionalCharges,
      currentAddMonthly = isAdditionalMonthly,
      currentPeriod = billingPeriod,
      currentStart = startDate,
      currentEnd = endDate,
      currentDays = daysInMonth,
      currentCustom = customPercent
    ) => {
      if (currentTariff < 0) {
        setErrorMessage('Tariff per kWh cannot be negative.');
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const payload: BillEstimateRequest = {
          tariffPerKwh: Number(currentTariff),
          fixedMonthlyCharge: Number(currentFixed),
          additionalCharges: Number(currentAdd),
          isAdditionalChargeMonthly: Boolean(currentAddMonthly),
          reductionPercentages: [10, 20, 30],
          customReductionPercent: Number(currentCustom),
          timeRangeMode: currentPeriod,
          startDate: currentPeriod === 'CUSTOM' ? currentStart : undefined,
          endDate: currentPeriod === 'CUSTOM' ? currentEnd : undefined,
          daysInBillingMonth: Number(currentDays),
        };

        const response = await calculateBillEstimate(payload);
        setResult(response);
      } catch (err: any) {
        console.error('Bill calculation error:', err);
        setErrorMessage(err?.message || 'Failed to calculate bill estimate from backend.');
      } finally {
        setLoading(false);
      }
    },
    [tariff, fixedCharge, additionalCharges, isAdditionalMonthly, billingPeriod, startDate, endDate, daysInMonth, customPercent]
  );

  // Run calculation on initial mount and when billingPeriod changes
  useEffect(() => {
    runCalculation();
  }, [billingPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick preset tariffs
  const tariffPresets = [5.0, 7.0, 8.0, 10.0, 12.5];

  // Helper for currency formatting in Indian Rupees
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ─── Hero / Header Card ────────────────────────────────────────────── */}
      <div className="glass-card p-6 border-slate-800/80 bg-gradient-to-r from-[#0d1527] to-[#0b101c] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> C++ Native Calculation Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Vidhora v1.0</span>
            </div>
            <h2 className="text-xl font-bold text-white font-display tracking-tight flex items-center gap-2">
              Electricity Bill Estimator & Savings Simulator
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl font-sans leading-relaxed">
              Real-time electricity billing calculations powered by the C++ backend. Estimate actual energy costs,
              project accurate monthly and yearly budgets, and simulate conservation savings without guesswork.
            </p>
          </div>

          <button
            onClick={() => runCalculation()}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors self-start md:self-auto shrink-0 shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span>{loading ? 'Calculating…' : 'Calculate Bill'}</span>
          </button>
        </div>
      </div>

      {/* ─── Error Alert ───────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-3 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <strong className="block font-semibold">Calculation Engine Notice:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* ─── Input Configuration Form ──────────────────────────────────────── */}
      <div className="glass-card p-5 space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <span>Tariff & Billing Parameters</span>
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTariff(8.0);
                setFixedCharge(100.0);
                setAdditionalCharges(50.0);
                setIsAdditionalMonthly(true);
                setBillingPeriod('ALL');
                setDaysInMonth(30);
                setCustomPercent(15.0);
                runCalculation(8.0, 100.0, 50.0, true, 'ALL', startDate, endDate, 30, 15.0);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
              <span>Reset Defaults</span>
            </button>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Active Dataset: <strong className="text-slate-200">{metadata.name}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-sans">
          {/* Tariff Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 block uppercase font-medium">
              Electricity Tariff (₹/kWh) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono">₹</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={tariff}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTariff(isNaN(val) ? 0 : val);
                }}
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="e.g. 8.00"
              />
            </div>
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tariffPresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setTariff(p);
                    runCalculation(p, fixedCharge, additionalCharges, isAdditionalMonthly, billingPeriod, startDate, endDate, daysInMonth, customPercent);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    tariff === p
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ₹{p.toFixed(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed Monthly Charge */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 block uppercase font-medium">
              Fixed Monthly Charge (₹/mo)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono">₹</span>
              <input
                type="number"
                step="1"
                min="0"
                value={fixedCharge}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFixedCharge(isNaN(val) ? 0 : val);
                }}
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="e.g. 100"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Meter rent / sanctioned demand charge per monthly cycle.
            </p>
          </div>

          {/* Additional Charges with Monthly/One-time toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-medium">
                Additional Charges (₹)
              </label>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdditionalMonthly(true);
                    runCalculation(tariff, fixedCharge, additionalCharges, true, billingPeriod, startDate, endDate, daysInMonth, customPercent);
                  }}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    isAdditionalMonthly
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Charge repeats each monthly billing cycle"
                >
                  Monthly
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdditionalMonthly(false);
                    runCalculation(tariff, fixedCharge, additionalCharges, false, billingPeriod, startDate, endDate, daysInMonth, customPercent);
                  }}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    !isAdditionalMonthly
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Charge applied once for the entire period"
                >
                  One-Time
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono">₹</span>
              <input
                type="number"
                step="1"
                min="0"
                value={additionalCharges}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAdditionalCharges(isNaN(val) ? 0 : val);
                }}
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="e.g. 50"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              {isAdditionalMonthly
                ? 'Recurring monthly regulatory charges, taxes, or duty.'
                : 'One-time flat charges applied once per bill period.'}
            </p>
          </div>

          {/* Billing Period Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 block uppercase font-medium">
              Billing Period Mode
            </label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            >
              <option value="ALL">All Time (Dataset Range)</option>
              <option value="WEEKLY">Weekly (Last 7 Days)</option>
              <option value="MONTHLY">Monthly (Latest Month)</option>
              <option value="CUSTOM">Custom Date Window</option>
            </select>
            <p className="text-[10px] text-slate-500 font-sans">
              Filters actual readings before evaluating consumption.
            </p>
          </div>

          {/* Billing Cycle Days */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 block uppercase font-medium">
              Billing Cycle (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                max="365"
                value={daysInMonth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDaysInMonth(isNaN(val) || val <= 0 ? 30 : val);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="30"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Standard cycle length for monthly projection (default 30).
            </p>
          </div>
        </div>

        {/* Custom Date Range Row (if mode === CUSTOM) */}
        {billingPeriod === 'CUSTOM' && (
          <div className="pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-[10px] text-slate-500 block uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Reliability / Limitation Banner ────────────────────────────────── */}
      {result && (
        result.isReliableMonthlyEstimate ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{result.reliabilityReason}</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Projection Confidence: High</span>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5">
              <strong className="font-semibold block">Observation Period Limitation:</strong>
              <p className="text-slate-300 font-sans text-xs">{result.reliabilityReason}</p>
            </div>
          </div>
        )
      )}

      {/* ─── Top KPI Metric Cards ───────────────────────────────────────────── */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: PROJECTED MONTHLY BILL (PRIMARY HIGHLIGHTED RESULT) */}
          <div className="glass-card p-4 space-y-1 relative overflow-hidden border-teal-500/40 bg-gradient-to-br from-[#0a232b] via-[#0d1c26] to-[#0b101c] shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-300">
                  Projected Monthly Bill
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                  Primary Result
                </span>
              </div>
              <span className="p-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight pt-1">
              {formatINR(result.projectedMonthlyBill)}
              <span className="text-xs font-sans text-teal-300/80 font-normal ml-1">/ month</span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono pt-1">
              Based on {result.projectedMonthlyConsumption} kWh ({result.daysInBillingMonth}-day cycle)
            </div>
          </div>

          {/* Card 2: PROJECTED YEARLY BILL (SEPARATE ANNUAL BUDGET) */}
          <div className="glass-card p-4 space-y-1 relative overflow-hidden border-cyan-500/25 bg-gradient-to-br from-[#091a29] to-[#0a101d]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-300">
                Projected Yearly Bill
              </span>
              <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <CalendarDays className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {formatINR(result.projectedYearlyBill)}
              <span className="text-xs font-sans text-cyan-300/80 font-normal ml-1">/ year</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              12 billing cycles ({result.projectedYearlyConsumption.toLocaleString()} kWh)
            </p>
          </div>

          {/* Card 3: TOTAL ESTIMATED BILL FOR DATASET / SELECTED PERIOD */}
          <div className="glass-card p-4 space-y-1 relative overflow-hidden border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                {billingPeriod === 'ALL'
                  ? 'Total Estimated Bill for Dataset Period'
                  : 'Total Estimated Bill for Selected Period'}
              </span>
              <span className="p-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                <IndianRupee className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-0.5">
              <div className="text-2xl font-bold text-white font-mono tracking-tight">
                {formatINR(result.estimatedBill)}
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {result.observedDays} Days
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono pt-1 truncate">
              Energy: {formatINR(result.energyCharges)} + Fixed: {formatINR(result.periodFixedCharges)} ({result.billingCycles.toFixed(2)} cycles)
            </div>
          </div>

          {/* Card 4: CONSUMPTION & AVERAGE DAILY METRICS */}
          <div className="glass-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                Consumption & Daily Rate
              </span>
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Calendar className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-300 font-mono tracking-tight">
              {formatINR(result.averageDailyCost)}{' '}
              <span className="text-xs font-sans text-slate-400 font-normal">/ day</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Total {result.totalConsumption.toLocaleString()} kWh ({result.averageDailyConsumption} kWh/day)
            </p>
          </div>
        </div>
      )}

      {/* ─── Savings Simulator Section ───────────────────────────────────────── */}
      {result && (
        <div className="glass-card p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-teal-400" />
                <span>Energy Savings Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Simulate potential bill reductions through energy efficiency. Note: Fixed monthly charges ({formatINR(result.fixedCharges)}/mo)
                and applicable additional charges are non-variable and remain completely unchanged.
              </p>
            </div>

            {/* Custom Percentage Quick Adjuster */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              <span className="text-xs font-mono text-slate-400 font-medium">Custom Reduction:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={customPercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const clamped = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                  setCustomPercent(clamped);
                }}
                onBlur={() => runCalculation()}
                className="w-14 px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-xs text-center border border-slate-700 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-mono text-slate-400">%</span>
              <button
                onClick={() => runCalculation()}
                className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Savings Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.savingsSimulations.map((sim, idx) => {
              const isCustom = idx === result.savingsSimulations.length - 1 && sim.reductionPercentage === customPercent;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl space-y-3 font-mono transition-all ${
                    isCustom
                      ? 'bg-gradient-to-b from-teal-950/20 to-slate-900/70 border-2 border-teal-500/40 shadow-lg shadow-teal-500/5'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badge & Target */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isCustom
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {sim.reductionPercentage}% Reduction {isCustom ? '(Custom)' : ''}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      -{((result.totalConsumption * sim.reductionPercentage) / 100).toFixed(1)} kWh
                    </span>
                  </div>

                  {/* New Estimated Period Bill */}
                  <div className="space-y-0.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">New Estimated Bill</span>
                    <div className="text-xl font-bold text-white tracking-tight">
                      {formatINR(sim.newEstimatedBill)}
                    </div>
                  </div>

                  {/* Savings Figures */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Period Savings:</span>
                      <strong className="text-emerald-400 font-bold">{formatINR(sim.estimatedSavings)}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Monthly Savings:</span>
                      <strong className="text-teal-300 font-bold">{formatINR(sim.projectedMonthlySavings)}/mo</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Yearly Savings:</span>
                      <strong className="text-cyan-300 font-bold">{formatINR(sim.projectedYearlySavings)}/yr</strong>
                    </div>
                  </div>

                  {/* Target Consumption */}
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Target Usage:</span>
                    <strong className="text-slate-200">{sim.reducedConsumption.toLocaleString()} kWh</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Calculation Assumptions & Transparency Panel ────────────────────── */}
      {result && result.calculationAssumptions.length > 0 && (
        <div className="glass-card p-5 space-y-3 font-mono text-xs">
          <div className="border-b border-slate-800/80 pb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>Calculation Assumptions & Verified Formulas</span>
            </h3>
            <span className="text-[11px] text-slate-500">C++ Backend Audit Trail</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-slate-300">
            {result.calculationAssumptions.map((assumption, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <span className="font-sans leading-relaxed text-xs">{assumption}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 text-[11px] text-slate-500 font-sans flex flex-wrap items-center justify-between gap-4">
            <span>
              Monthly Formula: <code className="text-teal-300 font-mono">Monthly Bill = (Monthly kWh × Tariff) + Fixed + Additional</code>
            </span>
            <span>
              Yearly Formula: <code className="text-cyan-300 font-mono">Yearly Bill = 12 × Monthly Bill</code>
            </span>
            <span>
              Fixed Multiplier: <code className="text-amber-300 font-mono">Period Fixed = Monthly Fixed × (Days ÷ Cycle)</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
