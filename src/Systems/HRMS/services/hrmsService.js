// HRMS Supabase Service
// Staff are sourced from master_users (managed in Global Settings).
// Attendance, Advances, Overtime and Payroll live in the hrms_* tables.
import { supabase } from '../../../services/supabase'
import { toLocalDateStr, toLocalTimeStr, dateToTimestamptz, timestamptzToDate } from './hrmsCalculations'

const PHOTO_BUCKET = 'hrms-attendance'

// Fired after every write so badges and other open views can refetch
export const HRMS_DATA_CHANGED = 'hrms:data-changed'
const notifyChange = () => window.dispatchEvent(new Event(HRMS_DATA_CHANGED))

const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

// Date columns are timestamptz in the DB; the app works with 'YYYY-MM-DD' (IST)
const DATE_COLUMNS = {
  hrms_attendance: ['date'],
  hrms_advances: ['request_date'],
  hrms_overtime: ['date'],
  hrms_payroll_records: ['period_month']
}

const convertDates = (table, row, convert) => {
  if (!row) return row
  const out = { ...row }
  DATE_COLUMNS[table].forEach((col) => {
    if (out[col] !== undefined) out[col] = convert(out[col])
  })
  return out
}

const fromDb = (table, data) =>
  Array.isArray(data) ? data.map((r) => convertDates(table, r, timestamptzToDate)) : convertDates(table, data, timestamptzToDate)

const toDb = (table, row) => convertDates(table, row, dateToTimestamptz)

// Helper to map a master_users row to the HRMS staff format
export function mapMasterUserToStaff(user) {
  const profile = user.page_access?.staff_profile || user.page_access?.hrms?.staff_profile || {}
  const rawDesignation = user.designation || profile.designation
  const fallbackDesignation = rawDesignation || (user.role === 'admin' ? 'Administrator' : 'Staff Worker')
  const rawSalary = user.base_salary !== undefined && user.base_salary !== null
    ? user.base_salary
    : profile.base_salary
  const baseSalary = rawSalary !== undefined && rawSalary !== null && !isNaN(Number(rawSalary))
    ? Number(rawSalary)
    : 0

  return {
    id: user.id,
    name: user.full_name || user.username,
    username: user.username,
    mobile: user.mobile_number || '',
    department: user.department || profile.department || 'WORKER',
    designation: fallbackDesignation,
    custom_designation: user.custom_designation || profile.custom_designation || '',
    base_salary: baseSalary,
    status: user.is_active !== false ? 'active' : 'inactive',
    allowed_leaves: user.allowed_leaves !== undefined && user.allowed_leaves !== null ? Number(user.allowed_leaves) : 4,
    join_date: timestamptzToDate(user.join_date || profile.join_date) || (user.created_at ? timestamptzToDate(user.created_at) : null),
  }
}

// Base64 data URL (from the camera canvas) -> public Storage URL
async function uploadAttendancePhoto(dataUrl, employeeId, date, type) {
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${date}/${employeeId}_${type}_${Date.now()}.jpg`
  unwrap(await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false
  }))
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

export const hrmsService = {
  // 1. STAFF (read-only here; managed via Global Settings)
  async getStaff() {
    const data = unwrap(await supabase
      .from('master_users')
      .select('*')
      .eq('is_active', true)
      .order('full_name'))
    return data.map(mapMasterUserToStaff)
  },

  // 2. ATTENDANCE
  async getAttendance({ date, from, to, employeeId } = {}) {
    let q = supabase.from('hrms_attendance').select('*').order('date', { ascending: false })
    if (date) q = q.eq('date', dateToTimestamptz(date))
    if (from) q = q.gte('date', dateToTimestamptz(from))
    if (to) q = q.lte('date', dateToTimestamptz(to))
    if (employeeId) q = q.eq('employee_id', employeeId)
    return fromDb('hrms_attendance', unwrap(await q))
  },

  /**
   * Record an IN or OUT punch. One row per employee per day; a second
   * punch on the same day updates that row.
   * `photo` may be a data URL (uploaded to Storage) or an existing URL.
   */
  async recordPunch({
    employee_id,
    type = 'in', // 'in' | 'out'
    date = toLocalDateStr(),
    time = toLocalTimeStr(),
    location = '',
    coordinates = '',
    photo = '',
    marked_by = null
  }) {
    const existing = unwrap(await supabase
      .from('hrms_attendance')
      .select('id, out_time')
      .eq('employee_id', employee_id)
      .eq('date', dateToTimestamptz(date))
      .maybeSingle())

    const row = { employee_id, date, marked_by }
    if (type === 'out') {
      row.out_time = time
      row.status = 'Checked OUT'
    } else {
      row.in_time = time
      row.status = existing?.out_time ? 'Checked OUT' : 'Checked IN'
    }
    if (location) row.location = location
    if (coordinates) row.coordinates = coordinates
    if (photo) {
      const url = photo.startsWith('data:')
        ? await uploadAttendancePhoto(photo, employee_id, date, type)
        : photo
      row[type === 'out' ? 'out_photo_url' : 'in_photo_url'] = url
    }

    const saved = unwrap(await supabase
      .from('hrms_attendance')
      .upsert(toDb('hrms_attendance', row), { onConflict: 'employee_id,date' })
      .select()
      .single())
    notifyChange()
    return fromDb('hrms_attendance', saved)
  },

  async deleteAttendance(id) {
    unwrap(await supabase.from('hrms_attendance').delete().eq('id', id))
    notifyChange()
  },

  // 3. ADVANCES
  async getAdvances({ employeeId, status } = {}) {
    let q = supabase.from('hrms_advances').select('*').order('created_at', { ascending: false })
    if (employeeId) q = q.eq('employee_id', employeeId)
    if (status) q = Array.isArray(status) ? q.in('status', status) : q.eq('status', status)
    return fromDb('hrms_advances', unwrap(await q))
  },

  async requestAdvance({ employee_id, amount, monthly_emi, reason }) {
    const { data, error } = await supabase
      .from('hrms_advances')
      .insert({
        employee_id,
        amount: Number(amount),
        monthly_emi: Number(monthly_emi),
        reason: reason || '',
        request_date: dateToTimestamptz(toLocalDateStr())
      })
      .select()
      .single()
    if (error?.code === '23505') {
      throw new Error('This employee already has a pending or active advance. It must be closed before requesting another.')
    }
    if (error) throw error
    notifyChange()
    return fromDb('hrms_advances', data)
  },

  async reviewAdvance(id, status, { monthly_emi = null, reviewed_by = null } = {}) {
    const patch = { status, reviewed_by }
    if (monthly_emi !== null) patch.monthly_emi = Number(monthly_emi)
    const data = unwrap(await supabase.from('hrms_advances').update(patch).eq('id', id).select().single())
    notifyChange()
    return fromDb('hrms_advances', data)
  },

  // 4. OVERTIME
  async getOvertime({ employeeId, from, to } = {}) {
    let q = supabase.from('hrms_overtime').select('*').order('date', { ascending: false })
    if (employeeId) q = q.eq('employee_id', employeeId)
    if (from) q = q.gte('date', dateToTimestamptz(from))
    if (to) q = q.lte('date', dateToTimestamptz(to))
    return fromDb('hrms_overtime', unwrap(await q))
  },

  async logOvertime({ employee_id, date = toLocalDateStr(), hours, reason = '', logged_by = null }) {
    const data = unwrap(await supabase
      .from('hrms_overtime')
      .insert(toDb('hrms_overtime', { employee_id, date, hours: Number(hours), reason, logged_by }))
      .select()
      .single())
    notifyChange()
    return fromDb('hrms_overtime', data)
  },

  async reviewOvertime(id, status, reviewed_by = null) {
    const data = unwrap(await supabase
      .from('hrms_overtime')
      .update({ status, reviewed_by, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single())
    notifyChange()
    return fromDb('hrms_overtime', data)
  },

  // 5. PAYROLL RECORDS (period_month = 'YYYY-MM-01')
  async getPayrollRecords(periodMonth, { employeeId } = {}) {
    let q = supabase.from('hrms_payroll_records').select('*').eq('period_month', dateToTimestamptz(periodMonth))
    if (employeeId) q = q.eq('employee_id', employeeId)
    return fromDb('hrms_payroll_records', unwrap(await q))
  },

  /** Upsert a full payroll snapshot for one employee/month */
  async savePayrollRecord(record) {
    const data = unwrap(await supabase
      .from('hrms_payroll_records')
      .upsert(toDb('hrms_payroll_records', record), { onConflict: 'employee_id,period_month' })
      .select()
      .single())
    notifyChange()
    return fromDb('hrms_payroll_records', data)
  },

  // 6. BADGES
  async getPendingCounts(employeeId = null) {
    const count = (table) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'Pending')
      if (employeeId) q = q.eq('employee_id', employeeId)
      return q
    }
    const [adv, ot] = await Promise.all([count('hrms_advances'), count('hrms_overtime')])
    return { approval: adv.count || 0, overtime: ot.count || 0 }
  }
}
