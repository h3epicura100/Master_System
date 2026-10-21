/**
 * Employee MIS calculation engine for H3MS.
 *
 * A "task" is one department's work on one booking whose menu is Finalized.
 * Staff are responsible for every task in the department pages assigned to
 * them in Global Settings (page_access.pms.pages); departments can be shared.
 * Overdue logic reuses calculateTaskDelayInfo (48h after the menu WhatsApp,
 * or the booking's priority override).
 */
import { DEPT_LIST } from '../../constants/departments';
import { calculateTaskDelayInfo } from '../../utils/delayUtils';

export const DEPT_LABELS = Object.fromEntries(DEPT_LIST.map((d) => [d.key, d.label]));
const DEPT_KEYS = new Set(DEPT_LIST.map((d) => d.key));

export const TIMEFRAMES = [
  { id: 'active', label: 'Active Bookings' },
  { id: 'thisMonth', label: 'This Month (event date)' },
  { id: 'lastMonth', label: 'Last Month (event date)' },
  { id: 'all', label: 'All Time' },
];

// Task states, worst first
export const TASK_STATES = {
  overdue: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  dueSoon: { label: 'Due Soon', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  doneLate: { label: 'Done Late', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  doneOnTime: { label: 'Done On Time', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const RATINGS = {
  star: { label: 'Star Performer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'Good', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  onTrack: { label: 'On Track', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  attention: { label: 'Needs Attention', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  critical: { label: 'Critical Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  none: { label: 'No Tasks', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const isClosed = (b) => b.status === 'closed' || b.closed;

const monthBounds = (offset) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [iso(start), iso(end)];
};

function inTimeframe(booking, timeframe) {
  if (timeframe === 'active') return !isClosed(booking);
  if (timeframe === 'all') return true;
  const [from, to] = monthBounds(timeframe === 'lastMonth' ? -1 : 0);
  const date = (booking.eventStartDate || booking.eventDate || '').slice(0, 10);
  return Boolean(date) && date >= from && date <= to;
}

function taskState(isDone, delay) {
  if (isDone) return delay.isDelayed ? 'doneLate' : 'doneOnTime';
  if (delay.isDelayed) return 'overdue';
  if (delay.isDueToday) return 'dueSoon';
  return 'pending';
}

/** Flattens bookings into department tasks for the chosen timeframe */
export function buildTasks(bookings, timeframe) {
  const tasks = [];
  bookings.forEach((booking) => {
    if (booking.menu?.status !== 'Finalized' || !inTimeframe(booking, timeframe)) return;
    const closed = isClosed(booking);

    DEPT_LIST.forEach((cfg) => {
      const dept = booking.departments?.[cfg.key] || {};
      const isDone = dept.status === 'Complete';
      // An unfinished task on a closed booking is no longer actionable
      if (closed && !isDone) return;

      const delay = calculateTaskDelayInfo(booking, dept.status, dept.completedAt || dept.updatedAt);
      tasks.push({
        id: `${booking.id}:${cfg.key}`,
        booking,
        deptKey: cfg.key,
        deptLabel: cfg.label,
        isDone,
        completedAt: dept.completedAt || null,
        updatedBy: dept.updatedBy || null,
        delay,
        state: taskState(isDone, delay),
      });
    });
  });
  return tasks;
}

/** Staff responsible for H3MS departments (same rule as delay reminders) */
export function getResponsibleStaff(users) {
  return users
    .filter((u) => u.isStaff && u.hasPmsAccess)
    .map((u) => ({ ...u, depts: [...new Set(u.assignedPages.filter((p) => DEPT_KEYS.has(p)))] }))
    .filter((u) => u.depts.length > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// updated_by holds the PMS username (see PMS useAuth adapter); older rows may hold the id
export const isMine = (task, user) =>
  Boolean(task.updatedBy) && (task.updatedBy === user.username || task.updatedBy === user.id);

function summarize(tasks, user = null) {
  const count = (state) => tasks.filter((t) => t.state === state).length;
  const doneOnTime = count('doneOnTime');
  const doneLate = count('doneLate');
  const overdue = count('overdue');
  const dueSoon = count('dueSoon');
  const done = doneOnTime + doneLate;
  const assigned = tasks.length;
  // Only tasks whose deadline has passed (or that are finished) count towards SLA
  const due = done + overdue;

  return {
    assigned,
    done,
    doneOnTime,
    doneLate,
    pending: assigned - done,
    overdue,
    dueSoon,
    doneByMe: user ? tasks.filter((t) => t.isDone && isMine(t, user)).length : 0,
    completionPct: assigned ? Math.round((done / assigned) * 100) : null,
    slaPct: due ? Math.round((doneOnTime / due) * 100) : null,
    maxOverdueHours: tasks.reduce((m, t) => (t.state === 'overdue' ? Math.max(m, t.delay.hoursOverdue) : m), 0),
  };
}

export function getRating(s) {
  if (!s.assigned) return 'none';
  if (s.overdue >= 4 || (s.slaPct !== null && s.slaPct < 40)) return 'critical';
  if (s.overdue >= 2 || (s.slaPct !== null && s.slaPct < 65)) return 'attention';
  if (s.slaPct === null) return 'onTrack';
  if (s.slaPct >= 85 && s.overdue === 0) return 'star';
  return 'good';
}

/**
 * @returns {{ tasks, employees, departments, overdueTasks, totals }}
 */
export function buildMisData({ bookings = [], users = [], timeframe = 'active', deptKey = null, onlyUsername = null }) {
  // Staff view: only this user, and only the departments assigned to them
  const responsible = getResponsibleStaff(users).filter((u) => !onlyUsername || u.username === onlyUsername);
  const visibleDepts = onlyUsername ? new Set(responsible.flatMap((u) => u.depts)) : null;
  const deptVisible = (key) => (!deptKey || key === deptKey) && (!visibleDepts || visibleDepts.has(key));

  // A department filter narrows both the task pool and the staff list
  const tasks = buildTasks(bookings, timeframe).filter((t) => deptVisible(t.deptKey));
  const staff = responsible.filter((u) => !deptKey || u.depts.includes(deptKey));

  const tasksByDept = {};
  tasks.forEach((t) => {
    (tasksByDept[t.deptKey] ||= []).push(t);
  });

  const staffByDept = {};
  staff.forEach((u) => u.depts.forEach((d) => (staffByDept[d] ||= []).push(u)));

  const employees = staff.map((u) => {
    const myTasks = u.depts.flatMap((d) => tasksByDept[d] || []);
    const stats = summarize(myTasks, u);
    return { user: u, tasks: myTasks, stats, rating: getRating(stats) };
  });

  const departments = DEPT_LIST.filter((cfg) => deptVisible(cfg.key)).map((cfg) => {
    const deptTasks = tasksByDept[cfg.key] || [];
    const stats = summarize(deptTasks);
    return { key: cfg.key, label: cfg.label, staff: staffByDept[cfg.key] || [], tasks: deptTasks, stats, rating: getRating(stats) };
  });

  const overdueTasks = tasks
    .filter((t) => t.state === 'overdue')
    .map((t) => ({ ...t, owners: staffByDept[t.deptKey] || [] }))
    .sort((a, b) => b.delay.hoursOverdue - a.delay.hoursOverdue);

  return {
    tasks,
    employees,
    departments,
    overdueTasks,
    totals: { ...summarize(tasks), staffCount: staff.length, unownedDepts: departments.filter((d) => !d.staff.length).length },
  };
}

export const formatDeadline = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

export const formatEventDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** WhatsApp text for an overdue task reminder */
export function buildOverdueMessage(task, user) {
  const b = task.booking;
  return [
    '⚠️ *Overdue Task Reminder*',
    '',
    `Hi ${user.displayName},`,
    `The *${task.deptLabel}* task for booking *${b.id}* (${b.customerName}) is overdue by *${task.delay.label.replace(' Delayed', '')}*.`,
    '',
    `📅 Event: ${formatEventDate(b.eventStartDate || b.eventDate)}`,
    `⏰ Deadline was: ${formatDeadline(task.delay.effectiveDeadline)}`,
    '',
    'Please complete it in H3MS and mark it *Complete*.',
    '— H3 Epicura',
  ].join('\n');
}
