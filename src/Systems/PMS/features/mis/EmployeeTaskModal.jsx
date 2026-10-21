import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, MessageCircle, Loader2 } from 'lucide-react';
import { TASK_STATES, RATINGS, DEPT_LABELS, isMine, formatDeadline, formatEventDate } from './misService';
import { PMS_PAGES } from '../../../../components/ui/UserModal';

const DEPT_ROUTES = Object.fromEntries(PMS_PAGES.map((p) => [p.id, p.route]));
const STATE_ORDER = ['overdue', 'dueSoon', 'pending', 'doneLate', 'doneOnTime'];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue', match: (t) => t.state === 'overdue' },
  { id: 'open', label: 'Pending', match: (t) => !t.isDone },
  { id: 'done', label: 'Done', match: (t) => t.isDone },
];

export function EmployeeTaskModal({ employee, onClose, onPing, canPing = false, pingingId }) {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    if (!employee) return [];
    const match = FILTERS.find((f) => f.id === filter)?.match || (() => true);
    return employee.tasks
      .filter(match)
      .sort((a, b) =>
        STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
        b.delay.hoursOverdue - a.delay.hoursOverdue
      );
  }, [employee, filter]);

  if (!employee) return null;
  const { user, stats, rating } = employee;

  const statCards = [
    { label: 'Assigned', value: stats.assigned, cls: 'text-slate-900' },
    { label: 'Done', value: stats.done, cls: 'text-emerald-600' },
    { label: 'Done by me', value: stats.doneByMe, cls: 'text-emerald-700' },
    { label: 'Pending', value: stats.pending, cls: 'text-slate-700' },
    { label: 'Overdue', value: stats.overdue, cls: 'text-rose-600' },
    { label: 'SLA', value: stats.slaPct === null ? '—' : `${stats.slaPct}%`, cls: 'text-violet-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">{user.displayName}</h3>
              <span className="text-xs text-slate-400">@{user.username}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${RATINGS[rating].cls}`}>
                {RATINGS[rating].label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.depts.map((d) => (
                <span key={d} className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-semibold">
                  {DEPT_LABELS[d]}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-5 py-3 border-b border-slate-100">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-200 px-3 py-2">
              <div className={`text-lg font-extrabold ${c.cls}`}>{c.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filter === f.id ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{rows.length} task(s)</span>
        </div>

        {/* Tasks */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs min-w-[860px]">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4">Booking</th>
                <th className="py-2.5 px-4">Event Date</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Deadline</th>
                <th className="py-2.5 px-4">Completed By</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No tasks in this view.</td>
                </tr>
              ) : rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4">
                    <span className="font-bold text-slate-900 block">{t.booking.id}</span>
                    <span className="text-[11px] text-slate-500">{t.booking.customerName}</span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                    {formatEventDate(t.booking.eventStartDate || t.booking.eventDate)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-700">{t.deptLabel}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${TASK_STATES[t.state].cls}`}>
                      {TASK_STATES[t.state].label}
                    </span>
                    {(t.state === 'overdue' || t.state === 'doneLate' || t.state === 'dueSoon') && (
                      <span className="block text-[10px] text-slate-500 mt-0.5">{t.delay.label}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                    {t.delay.effectiveDeadline ? formatDeadline(t.delay.effectiveDeadline) : (
                      <span className="text-slate-400" title="Delay clock starts when the finalized menu is sent on WhatsApp">
                        Not started
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {t.isDone ? (
                      <span className={isMine(t, user) ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                        {isMine(t, user) ? 'Self' : (t.updatedBy ? `@${t.updatedBy}` : '—')}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {canPing && t.state === 'overdue' && user.phone && (
                        <button
                          onClick={() => onPing(t, user)}
                          disabled={pingingId === `${t.id}:${user.id}`}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-60"
                        >
                          {pingingId === `${t.id}:${user.id}`
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <MessageCircle className="w-3 h-3" />}
                          Ping
                        </button>
                      )}
                      {DEPT_ROUTES[t.deptKey] && (
                        <Link
                          to={DEPT_ROUTES[t.deptKey]}
                          onClick={onClose}
                          title="Open department page"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmployeeTaskModal;
