// HRMS Calculation Utilities

export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('en-IN').format(num)
}

/**
 * Calculate hourly rate for an employee
 * Standard: Base Salary / 30 days / 8 hours
 */
export const calculateHourlyRate = (baseSalary, daysInMonth = 30) => {
  if (!baseSalary || baseSalary <= 0) return 0
  return baseSalary / daysInMonth / 8
}

/**
 * Calculate overtime pay with 1.5x multiplier
 */
export const calculateOtPay = (otHours, baseSalary, daysInMonth = 30) => {
  if (!otHours || otHours <= 0) return 0
  const hourly = calculateHourlyRate(baseSalary, daysInMonth)
  return Math.round(otHours * hourly * 1.5)
}

/**
 * Calculate complete payroll line for a staff member.
 *
 * daysCounted is the part of the month being paid for (full month for
 * past months, days elapsed for the current month, minus days before
 * joining). Every counted day without attendance is a leave day; up to
 * `allowed_leaves` of them are paid, the rest are cut.
 */
export const calculateEmployeePayroll = ({
  employee,
  daysInMonth = 30,
  daysCounted = daysInMonth,
  presentDays = 0,
  halfDays = 0,
  approvedOtHours = 0,
  incentives = 0,
  advanceEmi = 0
}) => {
  const baseSalary = Number(employee.base_salary) || 0
  const allowedLeaves = employee.allowed_leaves !== undefined ? Number(employee.allowed_leaves) : 4
  const perDayWage = baseSalary / daysInMonth

  const effectivePresentDays = presentDays + halfDays * 0.5
  const usedLeaves = Math.max(0, daysCounted - effectivePresentDays)
  const cutDays = Math.max(0, usedLeaves - allowedLeaves)

  const baseEarned = Math.round(perDayWage * daysCounted)
  const cutAmount = Math.round(perDayWage * cutDays)
  const otPay = calculateOtPay(approvedOtHours, baseSalary, daysInMonth)
  const grossPay = baseEarned + otPay + Number(incentives || 0)

  // Never recover more EMI than the employee actually earns this month
  const recoverableEmi = Math.min(Number(advanceEmi || 0), Math.max(0, grossPay - cutAmount))
  const totalDeductions = cutAmount + recoverableEmi
  const netPay = Math.max(0, grossPay - totalDeductions)

  return {
    baseSalary,
    daysInMonth,
    daysCounted,
    presentDays,
    effectivePresentDays,
    halfDays,
    usedLeaves,
    allowedLeaves,
    cutDays,
    cutAmount,
    baseEarned,
    otPay,
    approvedOtHours,
    incentives: Number(incentives || 0),
    advanceEmi: recoverableEmi,
    grossPay,
    totalDeductions,
    netPay
  }
}

/**
 * Map a calculation result to an hrms_payroll_records row
 */
export const payrollCalcToRecord = (calc) => ({
  days_in_month: calc.daysInMonth,
  days_counted: calc.daysCounted,
  present_days: calc.presentDays,
  half_days: calc.halfDays,
  leave_days: calc.usedLeaves,
  allowed_leaves: calc.allowedLeaves,
  unpaid_leave_days: calc.cutDays,
  base_salary: calc.baseSalary,
  base_earned: calc.baseEarned,
  ot_hours: calc.approvedOtHours,
  ot_pay: calc.otPay,
  incentives: calc.incentives,
  gross_pay: calc.grossPay,
  leave_cut_amount: calc.cutAmount,
  advance_emi_deducted: calc.advanceEmi,
  net_pay: calc.netPay
})

/**
 * Map a stored hrms_payroll_records row back to the calculation shape
 */
export const payrollRecordToCalc = (r) => {
  const n = (v) => Number(v) || 0
  return {
    baseSalary: n(r.base_salary),
    daysInMonth: n(r.days_in_month),
    daysCounted: n(r.days_counted),
    presentDays: n(r.present_days),
    effectivePresentDays: n(r.present_days) + n(r.half_days) * 0.5,
    halfDays: n(r.half_days),
    usedLeaves: n(r.leave_days),
    allowedLeaves: n(r.allowed_leaves),
    cutDays: n(r.unpaid_leave_days),
    cutAmount: n(r.leave_cut_amount),
    baseEarned: n(r.base_earned),
    otPay: n(r.ot_pay),
    approvedOtHours: n(r.ot_hours),
    incentives: n(r.incentives),
    advanceEmi: n(r.advance_emi_deducted),
    grossPay: n(r.gross_pay),
    totalDeductions: n(r.leave_cut_amount) + n(r.advance_emi_deducted),
    netPay: n(r.net_pay)
  }
}

// ---------- Date & time helpers (local time, not UTC) ----------

const pad2 = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' in the browser's local timezone */
export const toLocalDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Date columns are timestamptz stored at midnight IST (see 04_hrms_database_schema.sql)
const IST_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })

/** 'YYYY-MM-DD' -> timestamptz literal at midnight IST */
export const dateToTimestamptz = (d) => (d ? `${d.slice(0, 10)}T00:00:00+05:30` : null)

/** timestamptz from the database -> 'YYYY-MM-DD' calendar day in IST */
export const timestamptzToDate = (ts) => {
  if (!ts) return ts
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts
  return IST_DATE_FORMAT.format(new Date(ts))
}

/** 'HH:MM' (24h) in the browser's local timezone */
export const toLocalTimeStr = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

/** '14:05' or '14:05:00' -> '02:05 pm' */
export const formatTime12h = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${pad2(h % 12 || 12)}:${pad2(m)} ${suffix}`
}

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Official office shift used to flag late arrivals and early exits */
export const OFFICE_HOURS = { start: '11:00', end: '20:00' }
export const OFFICE_HOURS_LABEL = `${formatTime12h(OFFICE_HOURS.start)} – ${formatTime12h(OFFICE_HOURS.end)}`

/** Minutes after office start, or 0 if on time */
export const getLateMinutes = (inTime) => {
  if (!inTime) return 0
  return Math.max(0, toMinutes(inTime) - toMinutes(OFFICE_HOURS.start))
}

/**
 * Minutes before office end, or 0 if the shift was completed.
 * An out time earlier than the in time means the shift ran past midnight.
 */
export const getEarlyExitMinutes = (inTime, outTime) => {
  if (!outTime) return 0
  if (inTime && toMinutes(outTime) < toMinutes(inTime)) return 0
  return Math.max(0, toMinutes(OFFICE_HOURS.end) - toMinutes(outTime))
}

/** 95 -> '1h 35m', 20 -> '20m' */
export const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

/**
 * Human duration between in/out times. Without an out time, measures
 * to now (only meaningful for today's record). Handles shifts past midnight.
 */
export const formatDuration = (inTime, outTime, isToday = false) => {
  if (!inTime) return '—'
  if (!outTime && !isToday) return '—'
  const end = outTime ? toMinutes(outTime) : toMinutes(toLocalTimeStr())
  let mins = end - toMinutes(inTime)
  if (mins < 0) mins += 24 * 60
  const text = `${Math.floor(mins / 60)}h ${mins % 60}m`
  return outTime ? text : `Active (${text})`
}

/** 'YYYY-MM' -> { from: 'YYYY-MM-01', to: 'YYYY-MM-DD', daysInMonth, periodMonth, label } */
export const getMonthRange = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  return {
    from: `${y}-${pad2(m)}-01`,
    to: `${y}-${pad2(m)}-${pad2(daysInMonth)}`,
    periodMonth: `${y}-${pad2(m)}-01`,
    daysInMonth,
    label: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    shortLabel: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }
}

/**
 * Number of days of the month to pay for: stops at today for the current
 * month and starts at the join date for employees who joined mid-month.
 */
export const getDaysCounted = (monthStr, joinDate) => {
  const { from, to } = getMonthRange(monthStr)
  const today = toLocalDateStr()
  const start = joinDate && joinDate > from ? joinDate : from
  const end = today < to ? today : to
  if (end < start) return 0
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1
}

/**
 * Convert number to words in Indian numbering system for Payslip
 */
export const numberToWordsINR = (num) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n) => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100)
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000)
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000)
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000)
  }

  const rounded = Math.round(num)
  if (rounded === 0) return 'Zero Rupees Only'
  return inWords(rounded).trim() + ' Rupees Only'
}
