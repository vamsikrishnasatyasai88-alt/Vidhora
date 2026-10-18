import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Dot
} from 'recharts';
import type { AnalysisResults, AnomalyRecord, SuddenSpikeRecord, ElectricityReading } from '../../types/electricity';

interface ConsumptionChartProps {
  analysisResults: AnalysisResults;
  readings: ElectricityReading[];
}

export const ConsumptionChart: React.FC<ConsumptionChartProps> = ({
  analysisResults,
  readings,
}) => {
  const anomalyMap = new Map<string, AnomalyRecord>();
  analysisResults.anomalies.forEach(a => anomalyMap.set(a.date, a));

  const spikeMap = new Map<string, SuddenSpikeRecord>();
  analysisResults.suddenSpikes.forEach(s => spikeMap.set(s.date, s));

  const sortedReadings = [...readings].sort((a, b) => a.date.localeCompare(b.date));

  const chartData = sortedReadings.map(r => {
    const anomaly = anomalyMap.get(r.date);
    const spike = spikeMap.get(r.date);

    return {
      rawDate: r.date,
      date: r.date,
      consumption: r.totalConsumption,
      baseline: analysisResults.baselineValue,
      isAnomaly: !!anomaly && anomaly.severity !== 'NORMAL',
      isSpike: !!spike,
      spikeInfo: spike,
      severity: anomaly ? anomaly.severity : 'NORMAL',
      deviationPercent: anomaly ? anomaly.deviationPercent : 0,
      pattern: anomaly ? anomaly.pattern : 'NORMAL',
      driver: anomaly?.largestContributor?.categoryLabel || 'Overall Consumption',
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isAnom = data.isAnomaly;
      const dev = data.deviationPercent;

      const severityColors: Record<string, string> = {
        NORMAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        LOW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        MEDIUM: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      };

      return (
        <div className="bg-[#111723] p-3 rounded-lg border border-slate-800 text-xs font-mono max-w-xs space-y-2 z-50 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-white">
            <span>{data.rawDate}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${severityColors[data.severity]}`}>
              {data.severity}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500 text-[10px] block">Consumption</span>
              <strong className="text-teal-300 font-bold">{data.consumption} kWh</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Baseline</span>
              <span className="text-slate-300">{data.baseline} kWh</span>
            </div>
          </div>

          {isAnom && (
            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Deviation:</span>
              <strong className="text-rose-400">+{dev}%</strong>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload && payload.isAnomaly) {
      const isHigh = payload.severity === 'HIGH';
      return (
        <circle
          key={`dot-${payload.rawDate}`}
          cx={cx}
          cy={cy}
          r={isHigh ? 5 : 4}
          fill={isHigh ? '#f43f5e' : '#f59e0b'}
          stroke="#0b0f17"
          strokeWidth={1.5}
        />
      );
    }
    return <Dot {...props} r={2} fill="#14b8a6" stroke="none" />;
  };

  return (
    <div className="w-full h-[320px] pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
          
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          
          <YAxis
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            unit=" kWh"
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={analysisResults.baselineValue}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{
              value: `Baseline: ${analysisResults.baselineValue} kWh`,
              fill: '#f59e0b',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />

          <Area
            type="monotone"
            dataKey="consumption"
            stroke="#14b8a6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#consumptionGradient)"
            dot={renderCustomDot}
            activeDot={{ r: 5, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 1.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
