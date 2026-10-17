import React, { useState } from 'react';
import { formatDateRangeDisplay } from '../../utils/dateUtils';
import { EventScheduleTable } from './EventScheduleTable';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export function BookingSummary({ booking, onViewMenu, defaultOpenSchedule = false }) {
  const [showSchedule, setShowSchedule] = useState(defaultOpenSchedule);

  if (!booking) return null;

  const customerName = booking.customer_name || booking.customerName || '—';
  const startDate = booking.event_start_date || booking.eventStartDate || booking.event_date || booking.eventDate;
  const endDate = booking.event_end_date || booking.eventEndDate || booking.event_date || booking.eventDate;
  const dateRange = formatDateRangeDisplay(startDate, endDate);
  const venue = booking.venue_name || booking.venueName || '—';
  const schedule = booking.pms_event_schedule || booking.eventSchedule || [];

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 sm:p-4 mb-3.5 sm:mb-4 text-xs space-y-2.5 shadow-2xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            Customer
          </span>
          <span className="font-semibold text-pms-text text-xs sm:text-sm block truncate" title={customerName}>
            {customerName}
          </span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            Event Period
          </span>
          <span className="font-semibold text-pms-text text-xs block truncate" title={dateRange}>
            {dateRange}
          </span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            Venue
          </span>
          <span className="font-semibold text-pms-text text-xs block truncate" title={venue}>
            {venue}
          </span>
        </div>

        <div className="flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Sessions
            </span>
            {schedule.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-semibold transition-colors border border-blue-100 cursor-pointer"
              >
                <span>{schedule.length} {schedule.length === 1 ? 'session' : 'sessions'}</span>
                {showSchedule ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <span className="text-slate-400 font-medium">1 session</span>
            )}
          </div>
          {onViewMenu && (
            <button
              type="button"
              onClick={() => onViewMenu(booking.id)}
              className="text-xs text-pms-accent hover:underline font-semibold cursor-pointer ml-2 flex-shrink-0"
            >
              View Menu
            </button>
          )}
        </div>
      </div>

      {showSchedule && schedule.length > 0 && (
        <div className="pt-2.5 border-t border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-pms-accent" />
            <span>Event Schedule Breakdown</span>
          </div>
          <EventScheduleTable schedule={schedule} showTotal={false} />
        </div>
      )}
    </div>
  );
}
