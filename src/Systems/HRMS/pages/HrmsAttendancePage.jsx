import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Calendar,
  Filter,
  Camera,
  LogIn,
  LogOut,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react'
import { AttendanceModal } from '../components/AttendanceModal'
import { hrmsService } from '../services/hrmsService'
import {
  toLocalDateStr,
  formatTime12h,
  formatDuration,
  formatMinutes,
  getLateMinutes,
  getEarlyExitMinutes,
  OFFICE_HOURS_LABEL
} from '../services/hrmsCalculations'
import { useAuth } from '../../../context/AuthContext'

export function HrmsAttendancePage() {
  const { currentUser, isAdmin, getModuleRole } = useAuth()
  const isUserAdmin = isAdmin() || getModuleRole('hrms') === 'admin'

  const [attendance, setAttendance] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [dateFilter, setDateFilter] = useState(toLocalDateStr())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalEmpId, setModalEmpId] = useState(null)
  const [modalType, setModalType] = useState('in')

  const [loading, setLoading] = useState(true)
  const [busyEmpId, setBusyEmpId] = useState(null)

  const refreshData = async () => {
    try {
      const [staffList, att] = await Promise.all([
        hrmsService.getStaff(),
        hrmsService.getAttendance({ date: dateFilter, employeeId: isUserAdmin ? undefined : currentUser?.id })
      ])
      setStaff(staffList)
      setAttendance(att)
    } catch (e) {
      console.error('Load attendance error:', e)
      alert(`Failed to load attendance: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [dateFilter, isUserAdmin, currentUser?.id])

  // Staff Data Isolation: staff only sees their own employee profile
  const visibleStaff = useMemo(() => {
    if (isUserAdmin) return staff
    const userMatches = staff.filter(
      (s) => s.id === currentUser?.id || s.username === currentUser?.username
    )
    if (userMatches.length > 0) return userMatches
    if (currentUser) {
      return [{
        id: currentUser.id,
        name: currentUser.full_name || currentUser.username,
        username: currentUser.username,
        department: currentUser.department || 'WORKER',
        designation: currentUser.designation || 'Staff Worker',
        base_salary: currentUser.base_salary || 0,
        status: 'active'
      }]
    }
    return []
  }, [staff, isUserAdmin, currentUser])

  // Departments list for dropdown
  const departments = useMemo(() => {
    const depts = new Set(visibleStaff.map((s) => s.department).filter(Boolean))
    return ['All Departments', ...Array.from(depts)]
  }, [visibleStaff])

  // Filtered attendance records joined with staff profile
  const records = useMemo(() => {
    return visibleStaff.map((emp) => {
      const att = attendance.find((a) => a.employee_id === emp.id && a.date === dateFilter)
      return {
        emp,
        att: att || {
          id: null,
          employee_id: emp.id,
          date: dateFilter,
          in_time: null,
          out_time: null,
          status: 'Absent',
          location: '',
          coordinates: ''
        }
      }
    }).filter(({ emp, att }) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = emp.name?.toLowerCase().includes(q)
        const matchesDesig = emp.designation?.toLowerCase().includes(q)
        if (!matchesName && !matchesDesig) return false
      }
      // Department
      if (selectedDept !== 'All Departments' && emp.department !== selectedDept) return false
      // Status
      if (selectedStatus !== 'All Status' && att.status !== selectedStatus) return false
      return true
    })
  }, [visibleStaff, attendance, search, selectedDept, selectedStatus, dateFilter])

  // KPI Calculations
  const totalStaffCount = visibleStaff.length
  const presentCount = records.filter(({ att }) => ['Checked IN', 'Checked OUT', 'Half Day'].includes(att.status)).length
  const isToday = dateFilter === toLocalDateStr()
  const absentCount = Math.max(0, totalStaffCount - presentCount)

  // Quick Action Handlers
  const runPunch = async (empId, action) => {
    setBusyEmpId(empId)
    try {
      await action(empId, currentUser?.id)
      await refreshData()
    } catch (e) {
      alert(`Failed to record punch: ${e.message}`)
    } finally {
      setBusyEmpId(null)
    }
  }

  const handleQuickIn = (empId) => runPunch(empId, (id, by) => hrmsService.quickCheckIn(id, by))
  const handleQuickOut = (empId) => runPunch(empId, (id, by) => hrmsService.quickCheckOut(id, by))

  const handleOpenPunchModal = (empId, type) => {
    setModalEmpId(empId)
    setModalType(type)
    setIsModalOpen(true)
  }

  const handleDelete = async (attId) => {
    if (!window.confirm('Delete this attendance record?')) return
    try {
      await hrmsService.deleteAttendance(attId)
      await refreshData()
    } catch (e) {
      alert(`Failed to delete record: ${e.message}`)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'S'
    const p = name.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-hidden">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        {/* Total Staff */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Staff
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">
              {totalStaffCount}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Registered employees
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Present Today
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">
              {presentCount}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Staff recorded today
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Absent / Not In */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Absent / Not In
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 block">
              {absentCount}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Pending / Absent
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search & Date & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400 font-bold">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-xs"
            />
            <button
              onClick={() => setDateFilter(toLocalDateStr())}
              className="px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 font-bold hover:bg-violet-100 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Office Hours */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Office: {OFFICE_HOURS_LABEL}
          </span>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="All Status">All Status</option>
            <option value="Checked IN">Checked IN</option>
            <option value="Checked OUT">Checked OUT</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {/* Right: Record Attendance Button */}
        <button
          onClick={() => handleOpenPunchModal(isUserAdmin ? null : visibleStaff[0]?.id, 'in')}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>+ Record Attendance</span>
        </button>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden w-full min-w-0 max-w-full">
        <div className="max-h-[340px] sm:max-h-[calc(100vh-370px)] min-h-[260px] overflow-x-auto overflow-y-auto w-full max-w-full block relative custom-scrollbar pb-2">
          <table className="w-full text-left border-collapse text-xs min-w-[950px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-xs">
              <tr className="border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Actions</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Employee</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Department</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Date</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">In Time</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Out Time</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Duration</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Status</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Paid Leave</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">
                      {loading ? 'Loading attendance...' : staff.length === 0 ? 'No active staff — add staff in Global Settings' : 'No attendance records found'}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map(({ emp, att }) => {
                  const isCheckedIn = att.status === 'Checked IN'
                  const isCheckedOut = att.status === 'Checked OUT'
                  const isAbsent = att.status === 'Absent'
                  const lateMins = getLateMinutes(att.in_time)
                  const earlyMins = getEarlyExitMinutes(att.in_time, att.out_time)

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isCheckedIn && isToday && (
                            <button
                              disabled={busyEmpId === emp.id}
                              onClick={() => handleQuickOut(emp.id)}
                              className="disabled:opacity-50 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check OUT</span>
                            </button>
                          )}

                          {isAbsent && isToday && (
                            <button
                              disabled={busyEmpId === emp.id}
                              onClick={() => handleQuickIn(emp.id)}
                              className="disabled:opacity-50 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Check IN</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenPunchModal(emp.id, isCheckedIn ? 'out' : 'in')}
                            title="Edit or log punch with camera/location"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isUserAdmin && att.id && (
                            <button
                              onClick={() => handleDelete(att.id)}
                              title="Delete punch"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {emp.designation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                          {emp.department}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                        {att.date || dateFilter}
                      </td>

                      {/* In Time */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {formatTime12h(att.in_time) || '—'}
                        {lateMins > 0 && (
                          <span className="block text-[10px] font-bold text-amber-600">
                            Late by {formatMinutes(lateMins)}
                          </span>
                        )}
                      </td>

                      {/* Out Time */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {formatTime12h(att.out_time) || '—'}
                        {earlyMins > 0 && (
                          <span className="block text-[10px] font-bold text-rose-600">
                            Left {formatMinutes(earlyMins)} early
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {formatDuration(att.in_time, att.out_time, isToday)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isCheckedIn
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCheckedOut
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCheckedIn ? 'bg-emerald-500' : isCheckedOut ? 'bg-indigo-500' : 'bg-slate-400'
                            }`}
                          />
                          {att.status}
                        </span>
                      </td>

                      {/* Paid Leave Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isAbsent || att.status === 'On Leave' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Leave Day
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">
                            {att.status === 'Half Day' ? 'Half Leave' : '— (Present)'}
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {att.coordinates ? (
                          <a
                            href={`https://www.google.com/maps?q=${att.coordinates}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-violet-600 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{att.location || att.coordinates}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
              {/* Bottom buffer row to ensure last row has clean breathing room */}
              <tr className="h-6">
                <td colSpan={10} className="p-0 border-0 pointer-events-none"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Attendance Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={refreshData}
        staff={visibleStaff}
        preselectedEmployeeId={modalEmpId}
        preselectedType={modalType}
      />
    </div>
  )
}

export default HrmsAttendancePage
