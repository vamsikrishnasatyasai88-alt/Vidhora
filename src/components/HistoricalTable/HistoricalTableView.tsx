import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { ElectricityReading, SeverityLevel, AnalysisResults } from '../../types/electricity';
import { fetchReadings } from '../../services/api';

// Sort field values must match what the C++ backend expects
export type SortField = 'date' | 'consumption' | 'ac' | 'refrigerator' | 'fans';
export type SortOrder = 'asc' | 'desc';

interface HistoricalTableViewProps {
  readings: ElectricityReading[];
  analysisResults: AnalysisResults;
  onUpdateReading: (reading: ElectricityReading) => void;
  onDeleteReading: (readingId: string) => void;
}

export const HistoricalTableView: React.FC<HistoricalTableViewProps> = ({
  readings,
  analysisResults,
  onUpdateReading,
  onDeleteReading,
}) => {
  const [searchQuery, setSearchQuery]       = useState<string>('');
  const [sortField, setSortField]           = useState<SortField>('date');
  const [sortOrder, setSortOrder]           = useState<SortOrder>('desc');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize]       = useState<number>(25);

  // Readings fetched from C++ backend (search + sort applied server-side)
  const [displayReadings, setDisplayReadings] = useState<ElectricityReading[]>(readings);
  const [isFetching, setIsFetching]           = useState<boolean>(false);

  const [viewingReading, setViewingReading] = useState<ElectricityReading | null>(null);
  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);

  // Debounce timer for search input
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anomaly severity lookup (derived from parent analysis results)
  const anomalyMap = new Map<string, SeverityLevel>();
  analysisResults.anomalies.forEach(a => anomalyMap.set(a.date, a.severity));

  // ─── Fetch from C++ backend whenever search/sort changes ──────────────────

  const fetchFromBackend = useCallback(
    async (q: string, field: SortField, order: SortOrder) => {
      setIsFetching(true);
      try {
        const results = await fetchReadings({
          q:         q.trim() || undefined,
          sortField: field,
          sortOrder: order,
        });
        setDisplayReadings(results);
        setCurrentPage(1);
      } catch (err) {
        console.error('[HistoricalTable] C++ search/sort error:', err);
        // Fallback: show unfiltered parent readings
        setDisplayReadings(readings);
      } finally {
        setIsFetching(false);
      }
    },
    [readings]
  );

  // Initial load — fetch sorted by date desc
  useEffect(() => {
    fetchFromBackend('', 'date', 'desc');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchFromBackend(searchQuery, sortField, sortOrder);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, sortField, sortOrder, fetchFromBackend]);

  // ─── Sort toggle ──────────────────────────────────────────────────────────

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // ─── Severity filter (applied client-side on already-fetched results) ─────

  const filteredBySeverity = displayReadings.filter(r => {
    if (severityFilter === 'ALL') return true;
    const sev = anomalyMap.get(r.date) || 'NORMAL';
    return sev === severityFilter;
  });

  const totalRecords = filteredBySeverity.length;
  const totalPages   = Math.ceil(totalRecords / pageSize) || 1;
  const validPage    = Math.min(currentPage, totalPages);
  const startIndex   = (validPage - 1) * pageSize;
  const paginatedReadings = filteredBySeverity.slice(startIndex, startIndex + pageSize);

  // ─── Edit & Delete handlers ───────────────────────────────────────────────

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReading) {
      onUpdateReading(editingReading);
      // Optimistically update local display
      setDisplayReadings(prev =>
        prev.map(r => (r.id === editingReading.id ? editingReading : r))
      );
      setEditingReading(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      onDeleteReading(deletingId);
      setDisplayReadings(prev => prev.filter(r => r.id !== deletingId));
      setDeletingId(null);
    }
  };

  const hasCategories = analysisResults.hasCategories;

  return (
    <div className="space-y-4 pb-10">
      {/* Search & Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records by date, kWh value, or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isFetching && (
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-teal-400 font-mono">
              C++…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => {
                setSeverityFilter(sev);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-mono text-[11px] font-medium transition-colors ${
                severityFilter === sev
                  ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Main Professional Data Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-medium">
                <th
                  onClick={() => handleSortToggle('date')}
                  className="p-3 cursor-pointer hover:text-teal-400 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'date' ? 'text-teal-400' : 'text-slate-500'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('consumption')}
                  className="p-3 cursor-pointer hover:text-teal-400 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Consumption (kWh)</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'consumption' ? 'text-teal-400' : 'text-slate-500'}`} />
                  </div>
                </th>

                {hasCategories && (
                  <>
                    <th
                      onClick={() => handleSortToggle('ac')}
                      className="p-3 cursor-pointer hover:text-teal-400 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>AC</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'ac' ? 'text-teal-400' : 'text-slate-500'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortToggle('refrigerator')}
                      className="p-3 cursor-pointer hover:text-teal-400 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>Fridge</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'refrigerator' ? 'text-teal-400' : 'text-slate-500'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortToggle('fans')}
                      className="p-3 cursor-pointer hover:text-teal-400 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>Fans</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'fans' ? 'text-teal-400' : 'text-slate-500'}`} />
                      </div>
                    </th>
                    <th className="p-3 whitespace-nowrap">Lighting</th>
                  </>
                )}

                <th className="p-3 whitespace-nowrap">Severity</th>
                <th className="p-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {paginatedReadings.length === 0 ? (
                <tr>
                  <td colSpan={hasCategories ? 8 : 4} className="p-6 text-center text-slate-500">
                    {isFetching ? 'Loading from C++ backend…' : 'No matching records found.'}
                  </td>
                </tr>
              ) : (
                paginatedReadings.map((r) => {
                  const severity = anomalyMap.get(r.date) || 'NORMAL';
                  const isHigh   = severity === 'HIGH';
                  const isMed    = severity === 'MEDIUM';
                  const isLow    = severity === 'LOW';

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-white whitespace-nowrap">{r.date}</td>
                      <td className="p-3 text-teal-300 font-bold whitespace-nowrap">{r.totalConsumption} kWh</td>

                      {hasCategories && (
                        <>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.categories?.airConditioning ?? '-'}</td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.categories?.refrigerator ?? '-'}</td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.categories?.fans ?? '-'}</td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.categories?.lighting ?? '-'}</td>
                        </>
                      )}

                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          isHigh ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' :
                          isMed  ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' :
                          isLow  ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20' :
                                   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        }`}>
                          {severity}
                        </span>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingReading(r)}
                            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                            title="View Record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingReading({ ...r })}
                            className="p-1 text-slate-400 hover:text-teal-300 rounded transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Showing{' '}
            <strong className="text-slate-200">{startIndex + 1}</strong>–
            <strong className="text-slate-200">{Math.min(startIndex + pageSize, totalRecords)}</strong>{' '}
            of <strong className="text-white">{totalRecords.toLocaleString()}</strong> records
            {isFetching && <span className="ml-2 text-teal-400">↻</span>}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded focus:outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-slate-300">Page {validPage} of {totalPages}</span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {viewingReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#111723] p-5 rounded-xl max-w-sm w-full border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white font-display">
                Record Details ({viewingReading.date})
              </h3>
              <button onClick={() => setViewingReading(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-900">
                <span className="text-slate-400">Total Consumption:</span>
                <strong className="text-teal-300">{viewingReading.totalConsumption} kWh</strong>
              </div>

              {viewingReading.categories && (
                <div className="p-2.5 rounded bg-slate-900 space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Appliance Split:</span>
                  {Object.entries(viewingReading.categories).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-slate-300">
                      <span>{k}:</span>
                      <strong className="text-cyan-300">{v} kWh</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setViewingReading(null)}
              className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#111723] p-5 rounded-xl max-w-sm w-full border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white font-display">
                Edit Record ({editingReading.date})
              </h3>
              <button
                type="button"
                onClick={() => setEditingReading(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Total Consumption (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingReading.totalConsumption}
                  onChange={(e) =>
                    setEditingReading({
                      ...editingReading,
                      totalConsumption: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingReading(null)}
                className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#111723] p-5 rounded-xl max-w-xs w-full border border-rose-500/20 space-y-3 text-center">
            <h3 className="text-sm font-bold text-white font-display">Delete Record?</h3>
            <p className="text-xs text-slate-400">
              This will remove the reading from the active dataset vector.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
