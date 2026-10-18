import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import type { CategoryComparison } from '../../types/electricity';

interface CategoryBreakdownChartProps {
  categories: CategoryComparison[];
}

const COLORS = [
  '#06b6d4', // AC - Cyan
  '#10b981', // Fridge - Emerald
  '#f59e0b', // Fans - Amber
  '#8b5cf6', // Lighting - Purple
  '#ec4899', // Washing Machine - Pink
  '#64748b', // Other - Slate
];

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categories,
}) => {
  const data = categories.map((cat, idx) => ({
    name: cat.label,
    value: cat.currentValue,
    share: cat.sharePercent,
    change: cat.percentChange,
    color: COLORS[idx % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-lg border border-slate-700 text-xs font-sans space-y-1">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="text-slate-300">
            Current Avg: <strong className="text-teal-300 font-mono">{item.value} kWh/day</strong>
          </div>
          <div className="text-slate-400 text-[11px]">
            Share of Total: <span className="font-mono text-slate-200">{item.share}%</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Baseline Change: <span className={`font-mono ${item.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {item.change >= 0 ? `+${item.change}%` : `${item.change}%`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value: any) => {
              const item = data.find(d => d.name === value);
              return (
                <span className="text-xs text-slate-300 font-sans">
                  {value} <strong className="text-slate-400 font-mono text-[11px]">({item?.share}%)</strong>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
