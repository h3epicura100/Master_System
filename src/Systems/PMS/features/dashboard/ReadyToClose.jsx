import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { formatDateRangeDisplay } from '../../utils/dateUtils';
import { CheckCircle2, Archive, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ReadyToClose({ bookings = [], closedBookings = [], onCloseBooking }) {
  const [activeTab, setActiveTab] = useState('ready'); // 'ready' | 'closed'
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.has_full_access;

  return (
    <div className="bg-white border border-pms-border rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-pms-border bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <h3 className="text-sm font-bold text-pms-text">Wrapped Up & Closed Events</h3>
        </div>

        <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'ready'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready to Close ({bookings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'closed'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>History ({closedBookings.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 max-h-[350px] overflow-y-auto space-y-2.5">
        {activeTab === 'ready' ? (
          !bookings.length ? (
            <div className="py-8 text-center text-xs text-pms-muted">
              No active events waiting to be closed. When all department tasks finish, they appear here.
            </div>
          ) : (
            bookings.map((b) => {
              const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);

              return (
                <div
                  key={b.id}
                  className="bg-white border border-emerald-200/80 bg-emerald-50/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-pms-text">
                        <span className="font-mono text-pms-primary mr-2">{b.id}</span>
                        <span>{b.customerName}</span>
                        <span className="text-pms-muted font-normal text-xs ml-2">
                          · {dateRange}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-700 font-medium mt-0.5">
                        All department tasks complete — Ready for archive
                      </div>
                    </div>
                  </div>

                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onCloseBooking(b.id)}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Move to History
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/60 border border-emerald-200 px-2.5 py-1 rounded-md shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Event Ready
                    </span>
                  )}
                </div>
              );
            })
          )
        ) : (
          !closedBookings.length ? (
            <div className="py-8 text-center text-xs text-pms-muted">
              No archived events in history yet.
            </div>
          ) : (
            closedBookings.map((b) => {
              const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);

              return (
                <div
                  key={b.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Archive className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">
                        <span className="font-mono text-slate-500 mr-2">{b.id}</span>
                        <span>{b.customerName}</span>
                        <span className="text-slate-400 font-normal text-[11px] ml-2">
                          · {dateRange}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto">
                    Archived
                  </span>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
