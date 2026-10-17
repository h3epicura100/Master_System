import React from 'react';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/common/Button';
import { formatDateRangeDisplay, formatDateDisplay } from '../../utils/dateUtils';
import { Edit2, RotateCcw, Trash2, Calendar, Users } from 'lucide-react';

export function BookingTable({ bookings = [], isHistoryTab = false, onEdit, onReopen, onDelete }) {
  if (!bookings.length) {
    return (
      <div className="bg-white border border-pms-border rounded-xl p-12 text-center">
        <h3 className="text-base font-semibold text-pms-text">Nothing here</h3>
        <p className="text-xs text-pms-muted mt-1">
          {isHistoryTab ? 'No cancelled or closed bookings yet.' : 'No active bookings yet.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout (Visible on screens < md) */}
      <div className="space-y-3.5 md:hidden">
        {bookings.map((b) => {
          const menuStatus = b.menu?.status === 'Finalized' ? 'Complete' : 'Pending';
          const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
          const sessionCount = b.eventSchedule?.length || 0;

          return (
            <div
              key={b.id}
              className="bg-white border border-pms-border rounded-xl p-4 shadow-sm space-y-3"
            >
              {/* Card Header: ID, Customer & Actions */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-pms-primary">
                    {b.id}
                  </div>
                  <div className="text-sm font-bold text-pms-text truncate mt-0.5">
                    {b.customerName}
                  </div>
                  {b.customerMobile && b.customerMobile !== '—' && (
                    <div className="text-[11px] text-pms-muted font-mono">{b.customerMobile}</div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(b)}
                    title="Edit booking"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>

                  {isHistoryTab && onReopen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReopen(b.id)}
                      title="Reopen booking"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-pms-accent" />
                      <span>Reopen</span>
                    </Button>
                  )}

                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(b)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete booking permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Menu:</span>
                  <StatusBadge status={menuStatus} />
                </div>
                {b.functionType && (
                  <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded">
                    {b.functionType}
                  </span>
                )}
              </div>

              {/* Details Key-Value List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Assign Date:</span>
                  <span className="font-medium text-slate-700">{formatDateDisplay(b.bookingDate || b.createdAt)}</span>
                </div>

                <div className="flex items-start justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Event Date:</span>
                  <span className="font-medium text-pms-text text-right sm:text-left">{dateRange}</span>
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Sessions:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Venue:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">{b.venueName || '—'}</span>
                </div>

                {(b.referenceName || b.referenceNumber) && (
                  <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Reference:</span>
                    <span className="text-pms-muted">
                      {b.referenceName || ''} {b.referenceNumber ? `(${b.referenceNumber})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {b.remarks && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Remarks:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded-lg text-xs leading-relaxed">{b.remarks}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white border border-pms-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Assign Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Event Date</th>
                <th className="py-3 px-4">Sessions</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4">Menu Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pms-border">
              {bookings.map((b) => {
                const menuStatus = b.menu?.status === 'Finalized' ? 'Complete' : 'Pending';
                const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
                const sessionCount = b.eventSchedule?.length || 0;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pms-primary">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {formatDateDisplay(b.bookingDate || b.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-pms-text">{b.customerName}</div>
                      {b.customerMobile && b.customerMobile !== '—' && (
                        <div className="text-[11px] text-pms-muted font-mono">{b.customerMobile}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-pms-text">
                      <span className="font-medium">{b.functionType || '—'}</span>
                      {b.venueName && (
                        <div className="text-[11px] text-pms-muted truncate max-w-[150px]">{b.venueName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-pms-text font-medium whitespace-nowrap">
                      {dateRange}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-pms-muted">
                      <div>{b.referenceName || '—'}</div>
                      {b.referenceNumber && (
                        <div className="text-[10px] font-mono">{b.referenceNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[180px] text-slate-700 font-normal">
                      {b.remarks ? (
                        <span className="truncate block" title={b.remarks}>{b.remarks}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={menuStatus} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(b)}
                          title="Edit booking"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        {isHistoryTab && onReopen && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReopen(b.id)}
                            title="Reopen booking"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-pms-accent" />
                            <span>Reopen</span>
                          </Button>
                        )}

                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(b)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete booking permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
