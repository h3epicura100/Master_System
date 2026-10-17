import React, { useState, useMemo } from 'react';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DelayBadge } from '../../components/shared/DelayBadge';
import { formatDateDisplay, formatDateRangeDisplay } from '../../utils/dateUtils';
import { Search, Layers, List, ChevronLeft, ChevronRight, AlertTriangle, Clock, Calendar, Users } from 'lucide-react';

export function PriorityTable({ items = [] }) {
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'delayed' | 'dueToday'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = viewMode === 'grouped' ? 6 : 8;

  // 1. Filter items by search & status
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const b = item.booking;
      const term = searchTerm.trim().toLowerCase();

      if (term) {
        const matchesId = b.id?.toLowerCase().includes(term);
        const matchesCustomer = b.customerName?.toLowerCase().includes(term);
        const matchesDept = item.deptConfig?.label?.toLowerCase().includes(term);
        if (!matchesId && !matchesCustomer && !matchesDept) return false;
      }

      if (statusFilter === 'delayed' && !item.delayInfo?.isDelayed) return false;
      if (statusFilter === 'dueToday' && !item.delayInfo?.isDueToday) return false;

      return true;
    });
  }, [items, searchTerm, statusFilter]);

  // 2. Group items by Booking for Grouped View
  const groupedBookings = useMemo(() => {
    const map = new Map();

    filteredItems.forEach(item => {
      const bId = item.booking.id;
      if (!map.has(bId)) {
        map.set(bId, {
          booking: item.booking,
          tasks: [],
          delayedCount: 0,
          dueTodayCount: 0,
          onTimeCount: 0,
        });
      }
      const group = map.get(bId);
      group.tasks.push(item);
      if (item.delayInfo?.isDelayed) group.delayedCount++;
      else if (item.delayInfo?.isDueToday) group.dueTodayCount++;
      else group.onTimeCount++;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.delayedCount > 0 && b.delayedCount === 0) return -1;
      if (a.delayedCount === 0 && b.delayedCount > 0) return 1;
      return b.tasks.length - a.tasks.length;
    });
  }, [filteredItems]);

  // Stats for filter badges
  const totalDelayed = useMemo(() => items.filter(i => i.delayInfo?.isDelayed).length, [items]);
  const totalDueToday = useMemo(() => items.filter(i => i.delayInfo?.isDueToday).length, [items]);

  // Pagination slice
  const totalRecords = viewMode === 'grouped' ? groupedBookings.length : filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return viewMode === 'grouped'
      ? groupedBookings.slice(start, start + pageSize)
      : filteredItems.slice(start, start + pageSize);
  }, [viewMode, groupedBookings, filteredItems, currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-pms-border rounded-xl shadow-xs overflow-hidden space-y-0">
      {/* Header Controls Bar */}
      <div className="p-3.5 sm:p-4 border-b border-pms-border bg-slate-50/70 space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
            <h3 className="text-sm font-bold text-pms-text">Today's Priority</h3>
          </div>
          <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200 shrink-0">
            {items.length} {items.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search booking or customer..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-pms-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pms-primary"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-0.5 sm:pb-0">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs shrink-0">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-pms-text shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => handleFilterChange('delayed')}
                className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'delayed'
                    ? 'bg-red-500 text-white shadow-2xs'
                    : 'text-red-700 hover:text-red-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Delayed ({totalDelayed})
              </button>
              {totalDueToday > 0 && (
                <button
                  onClick={() => handleFilterChange('dueToday')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'dueToday'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Due ({totalDueToday})
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs shrink-0">
              <button
                onClick={() => { setViewMode('grouped'); setCurrentPage(1); }}
                title="Group by Booking (Clean Cards)"
                className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-pms-primary text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden xs:inline text-[11px]">Grouped</span>
              </button>
              <button
                onClick={() => { setViewMode('flat'); setCurrentPage(1); }}
                title="Detailed Task List"
                className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-pms-primary text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline text-[11px]">Flat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!items.length ? (
        <div className="p-8 text-center text-xs text-pms-muted">
          Nothing due today, and nothing delayed. All clear.
        </div>
      ) : !filteredItems.length ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No priority tasks match your search or filter.
        </div>
      ) : viewMode === 'grouped' ? (
        /* ======================================================== */
        /* VIEW 1: GROUPED BY BOOKING (CLEAN & COMPACT CARDS)       */
        /* ======================================================== */
        <div className="p-3 sm:p-4 space-y-3 max-h-[460px] overflow-y-auto">
          {currentRecords.map(({ booking, tasks, delayedCount, dueTodayCount }) => {
            const dateRange = formatDateRangeDisplay(
              booking.eventStartDate || booking.eventDate,
              booking.eventEndDate || booking.eventDate
            );
            const sessionCount = booking.eventSchedule?.length || 0;

            return (
              <div
                key={booking.id}
                className="bg-white border border-pms-border rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
              >
                {/* Booking Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-pms-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {booking.id}
                    </span>
                    <span className="text-sm font-bold text-pms-text">
                      {booking.customerName}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium whitespace-nowrap">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {dateRange}
                    </span>
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                    </span>
                  </div>

                  {/* Summary Status Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                    {delayedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        {delayedCount} Delayed
                      </span>
                    )}
                    {dueTodayCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {dueTodayCount} Due
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Department Tasks Chips */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {tasks.map(({ deptConfig, delayInfo }) => {
                      const isDelay = delayInfo?.isDelayed;
                      const isDue = delayInfo?.isDueToday;

                      const chipStyle = isDelay
                        ? 'bg-red-50 text-red-900 border-red-200'
                        : isDue
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-slate-50 text-slate-800 border-slate-200';

                      return (
                        <div
                          key={deptConfig.key}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border whitespace-nowrap shadow-2xs ${chipStyle}`}
                        >
                          <span className="font-semibold">{deptConfig.label}</span>
                          <span className="text-[9px] opacity-40">|</span>
                          <span className="font-mono text-[10px] font-bold">
                            {delayInfo?.label || 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW 2: FLAT DETAILED VIEW (CARDS ON MOBILE, TABLE ON DESK) */
        /* ======================================================== */
        <>
          {/* Mobile Card List (Screen < md) */}
          <div className="p-3 space-y-2.5 md:hidden max-h-[440px] overflow-y-auto">
            {currentRecords.map(({ booking, deptConfig, deptData, plannedDate, delayInfo }) => {
              const cardBorder = delayInfo?.cls === 'delayed'
                ? 'border-red-200 bg-red-50/30'
                : 'border-amber-200 bg-amber-50/30';
              const dateRange = formatDateRangeDisplay(
                booking.eventStartDate || booking.eventDate,
                booking.eventEndDate || booking.eventDate
              );

              return (
                <div
                  key={`${booking.id}_${deptConfig.key}`}
                  className={`border rounded-xl p-3 space-y-2 shadow-2xs ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-pms-primary block">
                        {booking.id}
                      </span>
                      <span className="text-sm font-bold text-pms-text block mt-0.5">
                        {booking.customerName}
                      </span>
                    </div>
                    <span className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs whitespace-nowrap">
                      {deptConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <div className="text-[11px] text-slate-500">
                      <span>Event: </span>
                      <span className="font-medium text-slate-700">{dateRange}</span>
                    </div>
                    <DelayBadge delayInfo={delayInfo} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Screen >= md) */}
          <div className="hidden md:block overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Booking ID</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Customer</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Department</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Event Date</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Planned Date</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 bg-slate-50 whitespace-nowrap">Delay Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pms-border">
                {currentRecords.map(({ booking, deptConfig, deptData, plannedDate, delayInfo }) => {
                  const rowTint = delayInfo?.cls === 'delayed' ? 'bg-red-50/40' : 'bg-amber-50/40';
                  const dateRange = formatDateRangeDisplay(
                    booking.eventStartDate || booking.eventDate,
                    booking.eventEndDate || booking.eventDate
                  );

                  return (
                    <tr key={`${booking.id}_${deptConfig.key}`} className={`${rowTint} hover:bg-slate-100/80 transition-colors`}>
                      <td className="py-2.5 px-4 font-mono font-semibold text-pms-primary whitespace-nowrap">
                        {booking.id}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-pms-text whitespace-nowrap">
                        {booking.customerName}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-pms-text whitespace-nowrap">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-semibold text-[11px] shadow-2xs">
                          {deptConfig.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-pms-text font-medium whitespace-nowrap">
                        {dateRange}
                      </td>
                      <td className="py-2.5 px-4 text-pms-muted font-medium whitespace-nowrap">
                        {formatDateDisplay(plannedDate)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <StatusBadge status={deptData.status || 'Pending'} />
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <DelayBadge delayInfo={delayInfo} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination Footer */}
      <div className="p-3 border-t border-pms-border bg-slate-50/70 flex items-center justify-between text-xs text-pms-muted">
        <span>
          Showing <strong>{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
          <strong>{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
          <strong>{totalRecords}</strong> {viewMode === 'grouped' ? 'bookings' : 'tasks'}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="px-2 font-mono font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
