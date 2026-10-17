// HRMS Local Storage Service
// Handles persistence for Staff, Attendance, Advances, Overtime, and Payroll

const KEYS = {
  STAFF: 'h3_hrms_staff',
  ATTENDANCE: 'h3_hrms_attendance',
  ADVANCES: 'h3_hrms_advances',
  OVERTIME: 'h3_hrms_overtime',
  PAYROLL_ADJUSTMENTS: 'h3_hrms_payroll_adjustments'
}

const SEED_VERSION_KEY = 'h3_hrms_seed_version'
const CURRENT_SEED_VERSION = 'v4_no_status'

// 1 Seed Employee (Staff Directory stage)
const SEED_STAFF = [
  {
    id: 'emp-1',
    name: 'ADIL KHAN',
    mobile: '7367332172',
    department: 'WORKER',
    designation: 'JR. PPF APPLICATOR / DETAILER',
    base_salary: 15000,
    status: 'active',
    allowed_leaves: 4,
    join_date: '2025-01-10'
  }
]

// Current Date formatted (e.g. 2026-10-17)
const getTodayDateStr = () => {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

// 1 Initial Attendance Record (Daily Attendance stage)
const getInitialAttendance = (today) => [
  {
    id: 'att-1',
    employee_id: 'emp-1',
    date: today,
    in_time: '10:00 am',
    out_time: '',
    duration: 'Active (2h 15m)',
    status: 'Checked IN',
    paid_leave_status: '— (Present)',
    location: 'Raipur, Chhattisgarh',
    coordinates: '21.256°, 81.643°',
    photo_url: ''
  }
]

// 1 Initial Advance Request (Advance Approval stage - Pending)
const SEED_ADVANCES = [
  {
    id: 'adv-1',
    employee_id: 'emp-1',
    amount: 5000,
    monthly_emi: 1000,
    total_recovered: 0,
    remaining_balance: 5000,
    reason: 'Family medical expense emergency',
    request_date: '2026-10-15',
    status: 'Pending' // Pending | Approved | Rejected | Closed
  }
]

// 1 Initial Overtime Record (Overtime stage - Pending)
const SEED_OVERTIME = [
  {
    id: 'ot-1',
    employee_id: 'emp-1',
    date: '2026-10-16',
    hours: 4.0,
    rate_multiplier: 1.5,
    status: 'Pending', // Pending | Approved | Rejected
    reason: 'Buffet live counter overtime setup'
  }
]

// 1 Initial Payroll Adjustment (Monthly Payroll stage)
const SEED_PAYROLL_ADJUSTMENTS = {
  'emp-1': { present_days: 26.0, half_days: 0, used_leaves: 1.0, incentives: 0, status: 'Hold' }
}

export const staffStorageService = {
  // Initialization check
  init() {
    try {
      const storedVersion = localStorage.getItem(SEED_VERSION_KEY)
      if (storedVersion !== CURRENT_SEED_VERSION) {
        // Automatically migrate to 1 dummy record per stage
        this.resetAll()
        return
      }

      if (!localStorage.getItem(KEYS.STAFF)) {
        localStorage.setItem(KEYS.STAFF, JSON.stringify(SEED_STAFF))
      }
      const today = getTodayDateStr()
      if (!localStorage.getItem(KEYS.ATTENDANCE)) {
        localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(getInitialAttendance(today)))
      }
      if (!localStorage.getItem(KEYS.ADVANCES)) {
        localStorage.setItem(KEYS.ADVANCES, JSON.stringify(SEED_ADVANCES))
      }
      if (!localStorage.getItem(KEYS.OVERTIME)) {
        localStorage.setItem(KEYS.OVERTIME, JSON.stringify(SEED_OVERTIME))
      }
      if (!localStorage.getItem(KEYS.PAYROLL_ADJUSTMENTS)) {
        localStorage.setItem(KEYS.PAYROLL_ADJUSTMENTS, JSON.stringify(SEED_PAYROLL_ADJUSTMENTS))
      }
    } catch (e) {
      console.error('HRMS storage init error:', e)
    }
  },

  // 1. STAFF DIRECTORY
  getStaff() {
    try {
      const data = localStorage.getItem(KEYS.STAFF)
      return data ? JSON.parse(data) : SEED_STAFF
    } catch {
      return SEED_STAFF
    }
  },

  getStaffById(id) {
    const all = this.getStaff()
    return all.find((s) => s.id === id) || null
  },

  saveEmployee(employee) {
    const all = this.getStaff()
    let updated
    if (employee.id) {
      updated = all.map((s) => (s.id === employee.id ? { ...s, ...employee } : s))
    } else {
      const newEmp = {
        ...employee,
        id: `emp-${Date.now()}`,
        status: employee.status || 'active',
        allowed_leaves: employee.allowed_leaves !== undefined ? Number(employee.allowed_leaves) : 4,
        join_date: employee.join_date || getTodayDateStr()
      }
      updated = [newEmp, ...all]
    }
    localStorage.setItem(KEYS.STAFF, JSON.stringify(updated))
    return updated
  },

  updateEmployeeStatus(id, newStatus, reason = '') {
    const all = this.getStaff()
    const updated = all.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          status: newStatus,
          inactive_reason: newStatus === 'inactive' ? (reason || 'Left company') : ''
        }
      }
      return s
    })
    localStorage.setItem(KEYS.STAFF, JSON.stringify(updated))
    return updated
  },

  deleteEmployee(id) {
    const all = this.getStaff()
    const updated = all.filter((s) => s.id !== id)
    localStorage.setItem(KEYS.STAFF, JSON.stringify(updated))
    return updated
  },

  // 2. ATTENDANCE
  getAttendance(dateFilter = null) {
    try {
      const data = localStorage.getItem(KEYS.ATTENDANCE)
      let list = data ? JSON.parse(data) : getInitialAttendance(getTodayDateStr())
      if (dateFilter) {
        list = list.filter((a) => a.date === dateFilter)
      }
      return list
    } catch {
      return []
    }
  },

  recordPunch({
    employee_id,
    type = 'in', // 'in' | 'out'
    date = getTodayDateStr(),
    time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location = 'NH30, Raipur, Chhattisgarh',
    coordinates = '21.2647°N, 81.6367°E',
    photo_url = ''
  }) {
    const all = this.getAttendance()
    const existingIndex = all.findIndex((a) => a.employee_id === employee_id && a.date === date)

    if (existingIndex >= 0) {
      const existing = all[existingIndex]
      if (type === 'out') {
        existing.out_time = time
        existing.status = 'Checked OUT'
        existing.duration = 'Completed Shift'
      } else {
        existing.in_time = time
        existing.status = 'Checked IN'
        existing.duration = 'Active (Just checked in)'
      }
      if (photo_url) existing.photo_url = photo_url
      if (coordinates) existing.coordinates = coordinates
      if (location) existing.location = location

      all[existingIndex] = existing
    } else {
      const newRec = {
        id: `att-${Date.now()}`,
        employee_id,
        date,
        in_time: type === 'in' ? time : '',
        out_time: type === 'out' ? time : '',
        duration: type === 'in' ? 'Active' : 'Completed',
        status: type === 'in' ? 'Checked IN' : 'Checked OUT',
        paid_leave_status: '— (Present)',
        location,
        coordinates,
        photo_url
      }
      all.unshift(newRec)
    }

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(all))
    return all
  },

  quickCheckIn(employee_id) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return this.recordPunch({
      employee_id,
      type: 'in',
      date: getTodayDateStr(),
      time: timeStr
    })
  },

  quickCheckOut(employee_id) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return this.recordPunch({
      employee_id,
      type: 'out',
      date: getTodayDateStr(),
      time: timeStr
    })
  },

  deleteAttendance(id) {
    const all = this.getAttendance()
    const updated = all.filter((a) => a.id !== id)
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updated))
    return updated
  },

  // 3. ADVANCES
  getAdvances() {
    try {
      const data = localStorage.getItem(KEYS.ADVANCES)
      return data ? JSON.parse(data) : SEED_ADVANCES
    } catch {
      return SEED_ADVANCES
    }
  },

  requestAdvance({ employee_id, amount, monthly_emi, reason }) {
    const all = this.getAdvances()
    const newAdv = {
      id: `adv-${Date.now()}`,
      employee_id,
      amount: Number(amount),
      monthly_emi: Number(monthly_emi),
      total_recovered: 0,
      remaining_balance: Number(amount),
      reason: reason || '',
      request_date: getTodayDateStr(),
      status: 'Pending'
    }
    const updated = [newAdv, ...all]
    localStorage.setItem(KEYS.ADVANCES, JSON.stringify(updated))
    return updated
  },

  updateAdvanceStatus(id, newStatus, emiAdjustment = null) {
    const all = this.getAdvances()
    const updated = all.map((adv) => {
      if (adv.id === id) {
        return {
          ...adv,
          status: newStatus,
          monthly_emi: emiAdjustment !== null ? Number(emiAdjustment) : adv.monthly_emi
        }
      }
      return adv
    })
    localStorage.setItem(KEYS.ADVANCES, JSON.stringify(updated))
    return updated
  },

  // 4. OVERTIME
  getOvertime() {
    try {
      const data = localStorage.getItem(KEYS.OVERTIME)
      return data ? JSON.parse(data) : SEED_OVERTIME
    } catch {
      return SEED_OVERTIME
    }
  },

  logOvertime({ employee_id, date = getTodayDateStr(), hours, reason = '' }) {
    const all = this.getOvertime()
    const newOt = {
      id: `ot-${Date.now()}`,
      employee_id,
      date,
      hours: Number(hours),
      rate_multiplier: 1.5,
      status: 'Pending',
      reason
    }
    const updated = [newOt, ...all]
    localStorage.setItem(KEYS.OVERTIME, JSON.stringify(updated))
    return updated
  },

  updateOvertimeStatus(id, status) {
    const all = this.getOvertime()
    const updated = all.map((ot) => (ot.id === id ? { ...ot, status } : ot))
    localStorage.setItem(KEYS.OVERTIME, JSON.stringify(updated))
    return updated
  },

  // 5. PAYROLL ADJUSTMENTS
  getPayrollAdjustments() {
    try {
      const data = localStorage.getItem(KEYS.PAYROLL_ADJUSTMENTS)
      return data ? JSON.parse(data) : SEED_PAYROLL_ADJUSTMENTS
    } catch {
      return SEED_PAYROLL_ADJUSTMENTS
    }
  },

  setEmployeeIncentive(employee_id, amount) {
    const all = this.getPayrollAdjustments()
    const current = all[employee_id] || { present_days: 30, half_days: 0, used_leaves: 0, incentives: 0, status: 'Hold' }
    all[employee_id] = {
      ...current,
      incentives: Number(amount)
    }
    localStorage.setItem(KEYS.PAYROLL_ADJUSTMENTS, JSON.stringify(all))
    return all
  },

  setEmployeePayrollStatus(employee_id, status) {
    const all = this.getPayrollAdjustments()
    const current = all[employee_id] || { present_days: 30, half_days: 0, used_leaves: 0, incentives: 0, status: 'Hold' }
    all[employee_id] = {
      ...current,
      status
    }
    localStorage.setItem(KEYS.PAYROLL_ADJUSTMENTS, JSON.stringify(all))
    return all
  },

  // Reset to default seed data
  resetAll() {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(SEED_STAFF))
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(getInitialAttendance(getTodayDateStr())))
    localStorage.setItem(KEYS.ADVANCES, JSON.stringify(SEED_ADVANCES))
    localStorage.setItem(KEYS.OVERTIME, JSON.stringify(SEED_OVERTIME))
    localStorage.setItem(KEYS.PAYROLL_ADJUSTMENTS, JSON.stringify(SEED_PAYROLL_ADJUSTMENTS))
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  }
}

// Auto-run init on load
staffStorageService.init()
