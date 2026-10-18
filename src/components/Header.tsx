import React from 'react';
import { Menu, FolderUp, RefreshCw, Database } from 'lucide-react';
import type { ActiveTab } from './Sidebar';
import type { DatasetMetadata } from '../types/electricity';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  metadata: DatasetMetadata;
  onMobileMenuToggle: () => void;
  onRestoreDataset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  metadata,
  onMobileMenuToggle,
  onRestoreDataset,
}) => {
  const pageTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Electricity consumption overview and anomaly analysis',
    },
    'import-dataset': {
      title: 'Import Dataset',
      subtitle: 'Load electricity consumption data for analysis',
    },
    'historical-data': {
      title: 'Historical Data',
      subtitle: 'Browse and search imported dataset records',
    },
    analysis: {
      title: 'Usage Analysis',
      subtitle: 'Statistical summary, baseline deviation, and category matrix',
    },
    anomalies: {
      title: 'Anomalies & Spikes',
      subtitle: 'Detected consumption anomalies, sudden spikes, and persistent shifts',
    },
    reports: {
      title: 'Reports',
      subtitle: 'Generate summary reports for executive presentation or export',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Configure baseline algorithms and detection thresholds',
    },
  };

  const current = pageTitles[activeTab] || { title: 'Vidhora', subtitle: '' };

  return (
    <header className="sticky top-0 z-20 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Menu + Page Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-display">
            {current.title}
          </h2>
          <p className="text-xs text-slate-400 line-clamp-1 font-sans">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Compact Dataset Context & Controls */}
      <div className="flex items-center gap-3 text-xs font-mono">
        {/* Dataset Context Chip */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111723] border border-slate-800 text-slate-300">
          <Database className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            Dataset: <strong className="text-white font-semibold">{metadata.name}</strong> ({metadata.dateRange.start} — {metadata.dateRange.end})
          </span>
        </div>

        {/* Import Action Button */}
        <button
          onClick={() => setActiveTab('import-dataset')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors"
        >
          <FolderUp className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Import Dataset</span>
        </button>

        {/* Restore Button */}
        <button
          onClick={onRestoreDataset}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Restore PJM Open Energy Dataset"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
