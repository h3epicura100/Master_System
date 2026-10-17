import React, { useState, useMemo } from 'react';
import { formatDateRangeDisplay } from '../../utils/dateUtils';
import { calculatePipelineInfo } from '../../utils/bookingUtils';
import { Calendar, Search, ChevronLeft, ChevronRight, Users, CheckCircle2 } from 'lucide-react';

export function UpcomingEvents({ bookings = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter(b => 
      b.id?.toLowerCase().includes(term) ||
      b.customerName?.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  const totalRecords = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white border border-pms-border rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header Controls Bar */}
      <div className="p-4 border-b border-pms-border bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
          <h3 className="text-sm font-bold text-pms-text">Upcoming Events</h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
            {bookings.length}
          </span>
        </div>

        {bookings.length > 3 && (
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-pms-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pms-primary"
            />
          </div>
        )}
      </div>

      {!bookings.length ? (
        <div className="p-8 text-center text-xs text-pms-muted">
          Nothing scheduled yet — finalize a menu to see it here.
        </div>
      ) : !filteredBookings.length ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No upcoming events match "{searchTerm}".
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="p-4 space-y-3 md:hidden max-h-[360px] overflow-y-auto">
            {currentRecords.map((b) => {
              const info = calculatePipelineInfo(b);
              const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
              const sessionCount = b.eventSchedule?.length || 0;

              return (
                <div
                  key={b.id}
                  className="bg-white border border-pms-border rounded-xl p-3.5 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-pms-primary block">
                        {b.id}
                      </span>
                      <span className="text-sm font-bold text-pms-text block mt-0.5">
                        {b.customerName}
                      </span>
                    </div>
                    <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Event Date:</span>
                    <span className="font-medium text-pms-text">{dateRange}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400 text-[10px] uppercase">Progress</span>
                      <span className="font-bold text-pms-primary font-mono">{info.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-pms-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${info.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Pending Depts */}
                  <div className="pt-1.5 border-t border-slate-100 text-xs">
                    {info.pending.length ? (
                      <div className="flex flex-wrap gap-1">
                        {info.pending.map((p, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All clear
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table with Sticky Headers */}
          <div className="hidden md:block overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4 bg-slate-50">Booking ID</th>
                  <th className="py-2.5 px-4 bg-slate-50">Customer</th>
                  <th className="py-2.5 px-4 bg-slate-50">Event Date</th>
                  <th className="py-2.5 px-4 bg-slate-50">Sessions</th>
                  <th className="py-2.5 px-4 bg-slate-50">Overall Progress</th>
                  <th className="py-2.5 px-4 bg-slate-50">Pending Departments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pms-border">
                {currentRecords.map((b) => {
                  const info = calculatePipelineInfo(b);
                  const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
                  const sessionCount = b.eventSchedule?.length || 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-pms-primary whitespace-nowrap">
                        {b.id}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-pms-text whitespace-nowrap">
                        {b.customerName}
                      </td>
                      <td className="py-2.5 px-4 text-pms-text font-medium whitespace-nowrap">
                        {dateRange}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 min-w-[130px]">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                          <div
                            className="bg-pms-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${info.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-pms-muted font-medium">
                          {info.pct}% ({info.done}/{info.total})
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {info.pending.length ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {info.pending.slice(0, 3).map((p, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                                {p}
                              </span>
                            ))}
                            {info.pending.length > 3 && (
                              <span
                                title={info.pending.slice(3).join(', ')}
                                className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold cursor-help"
                              >
                                +{info.pending.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> All clear
                          </span>
                        )}
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
      {totalPages > 1 && (
        <div className="p-2.5 border-t border-pms-border bg-slate-50/70 flex items-center justify-between text-xs text-pms-muted mt-auto">
          <span>
            {Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}–{Math.min(totalRecords, currentPage * pageSize)} of {totalRecords}
          </span>
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
        </div>
      )}
    </div>
  );
}
