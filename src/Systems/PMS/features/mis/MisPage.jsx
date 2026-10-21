import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Gauge,
  Search,
  MessageCircle,
  Loader2,
  ExternalLink,
  UserX,
} from 'lucide-react';
import { useBookings } from '../bookings/bookingHooks';
import { useAuth } from '../../hooks/useAuth';
import { pmsRecipientService } from '../../services/pmsRecipientService';
import { whatsappService } from '../../services/whatsappService';
import { DEPT_LIST } from '../../constants/departments';
import { PMS_PAGES } from '../../../../components/ui/UserModal';
import {
  buildMisData,
  buildOverdueMessage,
  getResponsibleStaff,
  formatDeadline,
  formatEventDate,
  DEPT_LABELS,
  RATINGS,
  TIMEFRAMES,
} from './misService';
import { EmployeeTaskModal } from './EmployeeTaskModal';

const DEPT_ROUTES = Object.fromEntries(PMS_PAGES.map((p) => [p.id, p.route]));

const TABS = [
  { id: 'scorecard', label: 'Employee Scorecard' },
  { id: 'departments', label: 'Department Workload' },
  { id: 'overdue', label: 'Overdue Escalations' },
];

const RATING_FILTERS = [
  { id: 'all', label: 'All Ratings' },
  { id: 'star', label: 'Star Performers' },
  { id: 'atRisk', label: 'At Risk (Attention / Critical)' },
  { id: 'overdue', label: 'Has Overdue Tasks' },
];

const SORTS = [
  { id: 'overdue', label: 'Most Overdue' },
  { id: 'sla', label: 'Lowest SLA' },
  { id: 'name', label: 'Name' },
];

const pctBarColor = (pct) =>
  pct === null ? 'bg-slate-200' : pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';

function PctBar({ pct }) {
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${pctBarColor(pct)}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-700 w-9 text-right">{pct === null ? '—' : `${pct}%`}</span>
    </div>
  );
}

function DeptChips({ depts, max = 3 }) {
  return (
    <div className="flex flex-wrap gap-1 max-w-[260px]">
      {depts.slice(0, max).map((d) => (
        <span key={d} className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-semibold whitespace-nowrap">
          {DEPT_LABELS[d]}
        </span>
      ))}
      {depts.length > max && (
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold" title={depts.slice(max).map((d) => DEPT_LABELS[d]).join(', ')}>
          +{depts.length - max}
        </span>
      )}
    </div>
  );
}

export function MisPage() {
  const { currentUser } = useAuth();
  // Admins / full-access see every employee; staff see only their own MIS
  const isMisAdmin = currentUser?.role === 'admin' || currentUser?.has_full_access === true;
  const onlyUsername = isMisAdmin ? null : currentUser?.username || '__none__';
  const { data: bookings = [], isLoading: loadingBookings } = useBookings();
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['pms_mis_staff'],
    queryFn: () => pmsRecipientService.loadActiveGlobalUsers(),
  });

  const [tab, setTab] = useState('scorecard');
  const [timeframe, setTimeframe] = useState('active');
  const [deptFilter, setDeptFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('overdue');
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [pingingId, setPingingId] = useState(null);

  const mis = useMemo(
    () => buildMisData({ bookings, users, timeframe, deptKey: deptFilter === 'all' ? null : deptFilter, onlyUsername }),
    [bookings, users, timeframe, deptFilter, onlyUsername]
  );

  // Department options: all for admins, only assigned ones for staff
  const deptOptions = useMemo(() => {
    if (isMisAdmin) return DEPT_LIST;
    const me = getResponsibleStaff(users).find((u) => u.username === onlyUsername);
    return DEPT_LIST.filter((d) => me?.depts.includes(d.key));
  }, [isMisAdmin, users, onlyUsername]);

  const employees = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    const list = mis.employees.filter((e) => {
      if (q && !e.user.displayName.toLowerCase().includes(q) && !e.user.username.toLowerCase().includes(q)) return false;
      if (ratingFilter === 'star') return e.rating === 'star';
      if (ratingFilter === 'atRisk') return e.rating === 'attention' || e.rating === 'critical';
      if (ratingFilter === 'overdue') return e.stats.overdue > 0;
      return true;
    });
    const byName = (a, b) => a.user.displayName.localeCompare(b.user.displayName);
    if (sortBy === 'name') return list.sort(byName);
    if (sortBy === 'sla') return list.sort((a, b) => (a.stats.slaPct ?? 101) - (b.stats.slaPct ?? 101) || byName(a, b));
    return list.sort((a, b) => b.stats.overdue - a.stats.overdue || b.stats.maxOverdueHours - a.stats.maxOverdueHours || byName(a, b));
  }, [mis.employees, search, ratingFilter, sortBy]);

  const selectedEmployee = mis.employees.find((e) => e.user.id === selectedEmpId) || null;

  const handlePing = async (task, user) => {
    if (!isMisAdmin) return;
    if (!whatsappService.isConfigured()) {
      toast.error('WhatsApp (Maytapi) is not configured.');
      return;
    }
    const message = buildOverdueMessage(task, user);
    if (!window.confirm(`Send this WhatsApp reminder to ${user.displayName} (+${user.phone})?\n\n${message}`)) return;

    const key = `${task.id}:${user.id}`;
    setPingingId(key);
    try {
      await whatsappService.sendDirectMessage({
        phone: user.phone,
        message,
        displayName: user.displayName,
        userId: user.id,
        isStaff: true,
        sentBy: currentUser?.id || 'system',
        sentByName: currentUser?.display_name || 'Admin',
        bookingId: task.booking.id,
      });
      toast.success(`Reminder sent to ${user.displayName}`);
    } catch (e) {
      toast.error(e.message || 'Failed to send WhatsApp reminder.');
    } finally {
      setPingingId(null);
    }
  };

  if (loadingBookings || loadingUsers) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading Employee MIS...</div>;
  }

  const { totals } = mis;
  const kpis = [
    isMisAdmin
      ? { label: 'Responsible Staff', value: totals.staffCount, sub: totals.unownedDepts ? `${totals.unownedDepts} dept(s) unassigned` : 'All depts covered', icon: Users, cls: 'border-l-violet-500 text-violet-700', subCls: totals.unownedDepts ? 'text-rose-600' : '' }
      : { label: 'My Departments', value: deptOptions.length, sub: 'Assigned in Global Settings', icon: Users, cls: 'border-l-violet-500 text-violet-700' },
    { label: 'Total Tasks', value: totals.assigned, sub: 'Finalized-menu bookings', icon: ListTodo, cls: 'border-l-slate-500 text-slate-800' },
    { label: 'Done On Time', value: totals.doneOnTime, sub: `${totals.doneLate} done late`, icon: CheckCircle2, cls: 'border-l-emerald-500 text-emerald-700' },
    { label: 'Pending', value: totals.pending, sub: `${totals.dueSoon} due within 12h`, icon: Clock, cls: 'border-l-amber-500 text-amber-700' },
    { label: 'Overdue', value: totals.overdue, sub: 'Past 48h deadline', icon: AlertTriangle, cls: 'border-l-rose-500 text-rose-600' },
    { label: 'SLA Score', value: totals.slaPct === null ? '—' : `${totals.slaPct}%`, sub: 'On-time ÷ tasks due', icon: Gauge, cls: 'border-l-blue-500 text-blue-700' },
  ];

  const selectCls = 'px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20';

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`bg-white border border-pms-border rounded-xl p-3.5 border-l-4 shadow-sm ${k.cls}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tracking-tight">{k.value}</span>
                <Icon className="w-4 h-4 opacity-50" />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-pms-muted mt-1">{k.label}</div>
              <div className={`text-[10px] mt-0.5 ${k.subCls || 'text-slate-400'}`}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-pms-border p-3 shadow-xs flex flex-wrap items-center gap-2">
        {isMisAdmin && (
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name or @username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        )}
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={selectCls}>
          {TIMEFRAMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls}>
          <option value="all">{isMisAdmin ? 'All Departments' : 'All My Departments'}</option>
          {deptOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        {isMisAdmin ? (
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className={selectCls}>
            {RATING_FILTERS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500 ml-auto">Showing your own tasks only</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-pms-border pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              tab === t.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.id === 'scorecard' && !isMisAdmin ? 'My Scorecard' : t.label}
            {t.id === 'overdue' && mis.overdueTasks.length > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${tab === t.id ? 'bg-white/20' : 'bg-rose-100 text-rose-700'}`}>
                {mis.overdueTasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Employee Scorecard */}
      {tab === 'scorecard' && (
        <div className="bg-white rounded-xl border border-pms-border shadow-xs overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-pms-border bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">
              {isMisAdmin ? `${employees.length} staff member(s)` : 'Your performance'}
            </span>
            {isMisAdmin && (
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold bg-white">
                {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
              </select>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Departments</th>
                  <th className="py-2.5 px-4 text-center">Assigned</th>
                  <th className="py-2.5 px-4 text-center">Done</th>
                  <th className="py-2.5 px-4 text-center">Pending</th>
                  <th className="py-2.5 px-4 text-center">Overdue</th>
                  <th className="py-2.5 px-4">SLA Score</th>
                  <th className="py-2.5 px-4">Rating</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {!isMisAdmin
                        ? 'No H3MS departments are assigned to you. Ask an admin to assign them in Global Settings.'
                        : mis.employees.length === 0
                        ? 'No staff have H3MS department pages assigned. Assign departments in Global Settings.'
                        : 'No staff match these filters.'}
                    </td>
                  </tr>
                ) : employees.map((e) => (
                  <tr key={e.user.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setSelectedEmpId(e.user.id)}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{e.user.displayName}</span>
                      <span className="text-[11px] text-slate-400">@{e.user.username}</span>
                    </td>
                    <td className="py-3 px-4"><DeptChips depts={e.user.depts} /></td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{e.stats.assigned}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-emerald-700">{e.stats.done}</span>
                      <span className="block text-[10px] text-slate-400" title="Tasks this person marked Complete">{e.stats.doneByMe} by self</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">{e.stats.pending}</td>
                    <td className="py-3 px-4 text-center">
                      {e.stats.overdue > 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-extrabold text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {e.stats.overdue}
                          </span>
                          <span className="block text-[10px] text-rose-500">max {e.stats.maxOverdueHours}h</span>
                        </>
                      ) : <span className="text-slate-300 font-bold">0</span>}
                    </td>
                    <td className="py-3 px-4"><PctBar pct={e.stats.slaPct} /></td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${RATINGS[e.rating].cls}`}>
                        {RATINGS[e.rating].label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold hover:bg-violet-100">
                        View Breakdown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Department Workload Matrix */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {mis.departments.map((d) => (
            <div key={d.key} className={`bg-white rounded-xl border shadow-xs p-4 space-y-3 ${d.staff.length ? 'border-pms-border' : 'border-rose-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{d.label}</h4>
                  {d.staff.length ? (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2" title={d.staff.map((s) => s.displayName).join(', ')}>
                      {d.staff.map((s) => s.displayName).join(', ')}
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-rose-600 mt-0.5 inline-flex items-center gap-1">
                      <UserX className="w-3 h-3" /> No staff assigned
                    </p>
                  )}
                </div>
                {DEPT_ROUTES[d.key] && (
                  <Link to={DEPT_ROUTES[d.key]} title="Open department page" className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { l: 'Total', v: d.stats.assigned, c: 'text-slate-800' },
                  { l: 'Done', v: d.stats.done, c: 'text-emerald-700' },
                  { l: 'Pending', v: d.stats.pending, c: 'text-slate-700' },
                  { l: 'Overdue', v: d.stats.overdue, c: d.stats.overdue ? 'text-rose-600' : 'text-slate-300' },
                ].map((x) => (
                  <div key={x.l} className="rounded-lg bg-slate-50 border border-slate-100 py-1.5">
                    <div className={`text-sm font-extrabold ${x.c}`}>{x.v}</div>
                    <div className="text-[9px] uppercase font-semibold text-slate-400">{x.l}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                  <span>Completion</span>
                  <span>{d.staff.length} staff</span>
                </div>
                <PctBar pct={d.stats.completionPct} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Overdue Escalation Tracker */}
      {tab === 'overdue' && (
        <div className="bg-white rounded-xl border border-pms-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Overdue By</th>
                  <th className="py-2.5 px-4">Booking</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Event Date</th>
                  <th className="py-2.5 px-4">Deadline</th>
                  <th className="py-2.5 px-4">{isMisAdmin ? 'Responsible Staff (WhatsApp Ping)' : 'Responsible'}</th>
                  <th className="py-2.5 px-4 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mis.overdueTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      No overdue tasks. Every department is within its deadline.
                    </td>
                  </tr>
                ) : mis.overdueTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {t.delay.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{t.booking.id}</span>
                      <span className="text-[11px] text-slate-500">{t.booking.customerName}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">{t.deptLabel}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{formatEventDate(t.booking.eventStartDate || t.booking.eventDate)}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{formatDeadline(t.delay.effectiveDeadline)}</td>
                    <td className="py-3 px-4">
                      {t.owners.length === 0 ? (
                        <span className="text-[11px] font-bold text-rose-600 inline-flex items-center gap-1">
                          <UserX className="w-3 h-3" /> No staff assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {t.owners.map((u) => {
                            const key = `${t.id}:${u.id}`;
                            if (!isMisAdmin) {
                              return (
                                <span key={u.id} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                                  {u.displayName}
                                </span>
                              );
                            }
                            return (
                              <button
                                key={u.id}
                                onClick={() => handlePing(t, u)}
                                disabled={!u.phone || pingingId === key}
                                title={u.phone ? `Send WhatsApp reminder to +${u.phone}` : 'No mobile number in Global Settings'}
                                className="px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {pingingId === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                                {u.displayName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {DEPT_ROUTES[t.deptKey] && (
                        <Link to={DEPT_ROUTES[t.deptKey]} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 inline-flex">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EmployeeTaskModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmpId(null)}
        onPing={handlePing}
        canPing={isMisAdmin}
        pingingId={pingingId}
      />
    </div>
  );
}

export default MisPage;
