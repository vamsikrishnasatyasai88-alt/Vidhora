import React from 'react';
import {
  LayoutDashboard,
  FolderUp,
  Table,
  LineChart,
  AlertTriangle,
  FileText,
  Settings as SettingsIcon,
  Zap,
  X
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'import-dataset'
  | 'historical-data'
  | 'analysis'
  | 'anomalies'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  anomalyCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  anomalyCount,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'import-dataset', label: 'Import Dataset', icon: FolderUp },
    { id: 'historical-data', label: 'Historical Data', icon: Table },
    { id: 'analysis', label: 'Usage Analysis', icon: LineChart },
    {
      id: 'anomalies',
      label: 'Anomalies & Spikes',
      icon: AlertTriangle,
      badge: anomalyCount > 0 ? anomalyCount : undefined,
    },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0d121d] border-r border-slate-800/80">
      {/* Brand Header — Clean without PRO badge */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display tracking-tight">Vidhora</h1>
            <p className="text-[11px] text-slate-400 font-sans">Electricity Usage Analyzer</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Menu — Restrained Icons & Subtle Active Highlight */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group ${
                isActive
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              
              {item.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Lower Sidebar Area — Clean Empty Spacing */}
      <div className="p-4" />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 h-screen sticky top-0 shrink-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
