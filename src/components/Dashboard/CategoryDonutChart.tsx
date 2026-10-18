import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { Info, Layers } from 'lucide-react';
import type { ElectricityReading, CategoryComparison } from '../../types/electricity';

interface CategoryDonutChartProps {
  categories: CategoryComparison[];
  readings: ElectricityReading[];
  hasCategories: boolean;
}

const CATEGORY_COLORS = [
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#64748b', // Slate
];

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  readings,
  hasCategories,
}) => {
  if (!hasCategories || categories.length === 0) {
    return (
      <div className="glass-card p-5 space-y-3 flex flex-col justify-between h-full">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Category Contribution</span>
          </h3>
          <p className="text-xs text-slate-400 font-sans">Electricity consumption by category</p>
        </div>

        <div className="p-5 rounded bg-slate-900/60 border border-slate-800 text-center space-y-1.5 my-auto">
          <Info className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-200 block font-display">Category-level analysis unavailable</span>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed max-w-xs mx-auto">
            The imported dataset does not contain appliance/category fields.
          </p>
        </div>
      </div>
    );
  }

  // 1. Calculate category total consumption across all readings
  const categoryTotals: Record<string, { label: string; totalKwh: number }> = {};
  let overallCategorySum = 0;

  readings.forEach((r) => {
    if (r.categories) {
      Object.entries(r.categories).forEach(([catKey, val]) => {
        if (!categoryTotals[catKey]) {
          const comp = categories.find((c) => c.category === catKey);
          categoryTotals[catKey] = {
            label: comp ? comp.label : catKey,
            totalKwh: 0,
          };
        }
        categoryTotals[catKey].totalKwh += val;
        overallCategorySum += val;
      });
    }
  });

  // If overall sum is 0, fallback to categoryComparisons
  if (overallCategorySum === 0) {
    categories.forEach((cat) => {
      categoryTotals[cat.category] = {
        label: cat.label,
        totalKwh: cat.currentValue,
      };
      overallCategorySum += cat.currentValue;
    });
  }

  // 2. Sort categories from highest contribution to lowest
  const sortedList = Object.entries(categoryTotals)
    .map(([key, data]) => ({
      key,
      label: data.label,
      consumption: Number(data.totalKwh.toFixed(1)),
      percentage: overallCategorySum > 0 ? Number(((data.totalKwh / overallCategorySum) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.consumption - a.consumption);

  // 3. Limit to top 5 categories + "Other"
  let chartSegments = sortedList;
  if (sortedList.length > 5) {
    const top5 = sortedList.slice(0, 5);
    const remaining = sortedList.slice(5);
    const otherSum = remaining.reduce((acc, curr) => acc + curr.consumption, 0);
    const otherPct = overallCategorySum > 0 ? Number(((otherSum / overallCategorySum) * 100).toFixed(1)) : 0;

    chartSegments = [
      ...top5,
      {
        key: 'other_combined',
        label: 'Other',
        consumption: Number(otherSum.toFixed(1)),
        percentage: otherPct,
      },
    ];
  }

  const chartData = chartSegments.map((item, idx) => ({
    name: item.label,
    value: item.consumption,
    percentage: item.percentage,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#111723] p-3 rounded-lg border border-slate-800 text-xs font-mono shadow-xl space-y-1 z-50">
          <div className="flex items-center gap-2 font-bold text-white border-b border-slate-800 pb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="text-slate-300">
            Consumption: <strong className="text-teal-300">{item.value.toLocaleString()} kWh</strong>
          </div>
          <div className="text-slate-400">
            Contribution: <strong className="text-white">{item.percentage}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  const formattedTotal = Number(overallCategorySum.toFixed(0)).toLocaleString();

  return (
    <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-3">
        <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Category Contribution</span>
        </h3>
        <p className="text-xs text-slate-400 font-sans">Electricity consumption by category</p>
      </div>

      {/* Donut Chart + Center Overlay + Side Legend Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Interactive Donut Ring with Central Summary Text */}
        <div className="relative w-full h-[180px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Central Summary Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Total</span>
            <span className="text-base font-extrabold font-mono text-white tracking-tight">{formattedTotal} <span className="text-[10px] text-slate-400 font-normal font-sans">kWh</span></span>
          </div>
        </div>

        {/* Muted Sorted Legend List */}
        <div className="space-y-2 text-xs font-mono">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-1.5 rounded bg-slate-900/50 border border-slate-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}</span>
              </div>
              <span className="font-bold text-white shrink-0 ml-2">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
