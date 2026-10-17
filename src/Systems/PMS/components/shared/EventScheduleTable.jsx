import React from 'react';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Users, Calendar } from 'lucide-react';

export function EventScheduleTable({ schedule = [], showTotal = false, className = '' }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2 text-center">
        No schedule sessions recorded.
      </div>
    );
  }

  // Normalize schedule entries
  const normalized = schedule.map((item, idx) => ({
    id: item.id || idx,
    date: item.event_date || item.date || '',
    timeLabel: item.time_label || item.timeLabel || '—',
    guestCount: Number(item.guest_count ?? item.guestCount ?? 0),
    sortOrder: item.sort_order ?? item.sortOrder ?? idx,
  }));

  // Sort by sortOrder or date
  normalized.sort((a, b) => a.sortOrder - b.sortOrder);

  // Compute total pax
  const totalPax = normalized.reduce((sum, item) => sum + (item.guestCount || 0), 0);

  return (
    <div className={`border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="py-2 px-2.5 sm:px-3.5 whitespace-nowrap">
              <div className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-pms-accent flex-shrink-0" />
                <span>Date</span>
              </div>
            </th>
            <th className="py-2 px-2 sm:px-3">
              <span>Session / Time</span>
            </th>
            <th className="py-2 px-2.5 sm:px-3.5 text-right whitespace-nowrap">
              <div className="inline-flex items-center justify-end gap-1">
                <Users className="w-3 h-3 text-pms-accent flex-shrink-0" />
                <span>Guest Count</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {normalized.map((item, idx) => (
            <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-2 px-2.5 sm:px-3.5 font-medium whitespace-nowrap">
                <span className="font-semibold text-pms-primary text-[11px] sm:text-xs">
                  {formatDateDisplay(item.date)}
                </span>
              </td>
              <td className="py-2 px-2 sm:px-3 font-medium text-slate-700 text-[11px] sm:text-xs">
                {item.timeLabel}
              </td>
              <td className="py-2 px-2.5 sm:px-3.5 text-right font-mono font-bold text-slate-900 text-[11px] sm:text-xs whitespace-nowrap">
                {item.guestCount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        {showTotal && (
          <tfoot>
            <tr className="bg-slate-50/90 border-t border-slate-200 font-bold text-xs text-slate-800">
              <td colSpan={2} className="py-2 px-2.5 sm:px-3.5 text-right uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-500">
                Total Guest Count:
              </td>
              <td className="py-2 px-2.5 sm:px-3.5 text-right font-mono text-xs sm:text-sm text-pms-primary whitespace-nowrap">
                {totalPax.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
