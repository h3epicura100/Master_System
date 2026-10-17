import React from 'react';
import { CalendarDays, Archive, Clock, CheckCircle2, ListTodo, AlertTriangle, PartyPopper } from 'lucide-react';

export function DashboardStats({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Active Bookings', value: stats.totalActive, color: 'border-l-pms-primary text-pms-primary', icon: CalendarDays },
    { label: 'Closed Bookings', value: stats.closedBookings, color: 'border-l-slate-500 text-slate-700', icon: Archive },
    { label: 'Menu Pending', value: stats.menuPending, color: 'border-l-amber-500 text-amber-700', icon: Clock },
    { label: 'Menu Finalized', value: stats.menuFinalized, color: 'border-l-emerald-500 text-emerald-700', icon: CheckCircle2 },
    { label: 'Dept Pending', value: stats.deptPending, color: 'border-l-amber-500 text-amber-700', icon: ListTodo },
    { label: 'Delayed Tasks', value: stats.delayed, color: 'border-l-red-500 text-red-600', icon: AlertTriangle },
    { label: 'Event Ready', value: stats.eventReady, color: 'border-l-emerald-500 text-emerald-600', icon: PartyPopper },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((c, i) => {
        const IconComponent = c.icon;
        return (
          <div
            key={i}
            className={`bg-white border border-pms-border rounded-xl p-3.5 border-l-4 shadow-sm ${c.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-tight">{c.value}</span>
              <IconComponent className="w-4 h-4 opacity-50" />
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-pms-muted mt-1">
              {c.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
