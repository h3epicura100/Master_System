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
import { staffStorageService } from '../services/hrmsStorageService'

export function HrmsAttendancePage() {
  const [attendance, setAttendance] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalEmpId, setModalEmpId] = useState(null)
  const [modalType, setModalType] = useState('in')

  const refreshData = () => {
    setStaff(staffStorageService.getStaff())
    setAttendance(staffStorageService.getAttendance())
  }

  useEffect(() => {
    refreshData()
  }, [])

  // Departments list for dropdown
  const departments = useMemo(() => {
    const depts = new Set(staff.map((s) => s.department).filter(Boolean))
    return ['All Departments', ...Array.from(depts)]
  }, [staff])

  // Filtered attendance records joined with staff profile
  const records = useMemo(() => {
    return staff.map((emp) => {
      const att = attendance.find((a) => a.employee_id === emp.id && (!dateFilter || a.date === dateFilter))
      return {
        emp,
        att: att || {
          id: `virtual-${emp.id}`,
          employee_id: emp.id,
          date: dateFilter,
          in_time: '',
          out_time: '',
          duration: '—',
          status: 'Absent',
          paid_leave_status: 'Unpaid Absent',
          location: '—',
          coordinates: ''
        }
      }
    }).filter(({ emp, att }) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = emp.name.toLowerCase().includes(q)
        const matchesDesig = emp.designation?.toLowerCase().includes(q)
        if (!matchesName && !matchesDesig) return false
      }
      // Department
      if (selectedDept !== 'All Departments' && emp.department !== selectedDept) return false
      // Status
      if (selectedStatus !== 'All Status' && att.status !== selectedStatus) return false
      return true
    })
  }, [staff, attendance, search, selectedDept, selectedStatus, dateFilter])

  // KPI Calculations
  const totalStaffCount = staff.length
  const presentCount = records.filter(({ att }) => att.status === 'Checked IN' || att.status === 'Checked OUT').length
  const absentCount = totalStaffCount - presentCount

  // Quick Action Handlers
  const handleQuickIn = (empId) => {
    staffStorageService.quickCheckIn(empId)
    refreshData()
  }

  const handleQuickOut = (empId) => {
    staffStorageService.quickCheckOut(empId)
    refreshData()
  }

  const handleOpenPunchModal = (empId, type) => {
    setModalEmpId(empId)
    setModalType(type)
    setIsModalOpen(true)
  }

  const handleDelete = (attId) => {
    if (window.confirm('Delete this attendance record?')) {
      staffStorageService.deleteAttendance(attId)
      refreshData()
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
              onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
              className="px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 font-bold hover:bg-violet-100 transition-colors"
            >
              Today
            </button>
          </div>

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
            <option value="Absent">Absent</option>
          </select>
        </div>

        {/* Right: Record Attendance Button */}
        <button
          onClick={() => handleOpenPunchModal(null, 'in')}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>+ Record Attendance</span>
        </button>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Actions</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Paid Leave</th>
                <th className="py-3 px-4">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No attendance records found</p>
                  </td>
                </tr>
              ) : (
                records.map(({ emp, att }) => {
                  const isCheckedIn = att.status === 'Checked IN'
                  const isCheckedOut = att.status === 'Checked OUT'
                  const isAbsent = att.status === 'Absent'

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isCheckedIn && (
                            <button
                              onClick={() => handleQuickOut(emp.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check OUT</span>
                            </button>
                          )}

                          {isAbsent && (
                            <button
                              onClick={() => handleQuickIn(emp.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
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

                          {att.id && !att.id.startsWith('virtual-') && (
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
                        {att.in_time || '—'}
                      </td>

                      {/* Out Time */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {att.out_time || '—'}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {att.duration || '—'}
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
                        {att.paid_leave_status?.includes('Unpaid') ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {att.paid_leave_status}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">{att.paid_leave_status || '—'}</span>
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
                            <span className="truncate max-w-[140px]">{att.location || 'Raipur'}</span>
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Attendance Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={refreshData}
        preselectedEmployeeId={modalEmpId}
        preselectedType={modalType}
      />
    </div>
  )
}

export default HrmsAttendancePage
