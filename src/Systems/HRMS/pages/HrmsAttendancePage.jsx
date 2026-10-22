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
  Plus,
  X
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
  const [previewPhoto, setPreviewPhoto] = useState(null) // { url, title }

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

  // Check IN / OUT always goes through the punch dialog (face photo + GPS)
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

  // Shared cell renderers for the desktop table and the mobile cards
  const getRowFlags = (att) => ({
    isCheckedIn: att.status === 'Checked IN',
    isCheckedOut: att.status === 'Checked OUT',
    isAbsent: att.status === 'Absent',
    lateMins: getLateMinutes(att.in_time),
    earlyMins: getEarlyExitMinutes(att.in_time, att.out_time)
  })

  const renderActions = (emp, att, f, mobile = false) => {
    const btn = mobile ? 'flex-1 justify-center px-3 py-2 text-xs' : 'px-2.5 py-1 text-[11px]'
    return (
      <div className={`flex items-center gap-1.5 ${mobile ? 'w-full' : ''}`}>
        {f.isCheckedIn && isToday && (
          <button
            onClick={() => handleOpenPunchModal(emp.id, 'out')}
            className={`${btn} rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-xs transition-colors flex items-center gap-1`}
          >
            <LogOut className="w-3 h-3" />
            <span>Check OUT</span>
          </button>
        )}

        {f.isAbsent && isToday && (
          <button
            onClick={() => handleOpenPunchModal(emp.id, 'in')}
            className={`${btn} rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1`}
          >
            <LogIn className="w-3 h-3" />
            <span>Check IN</span>
          </button>
        )}

        <button
          onClick={() => handleOpenPunchModal(emp.id, f.isCheckedIn ? 'out' : 'in')}
          title="Edit or log punch with camera/location"
          className={`${mobile ? 'p-2 border border-slate-200' : 'p-1.5'} rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {isUserAdmin && att.id && (
          <button
            onClick={() => handleDelete(att.id)}
            title="Delete punch"
            className={`${mobile ? 'p-2 border border-slate-200' : 'p-1.5'} rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  const renderStatus = (att, f) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${
        f.isCheckedIn
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : f.isCheckedOut
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          f.isCheckedIn ? 'bg-emerald-500' : f.isCheckedOut ? 'bg-indigo-500' : 'bg-slate-400'
        }`}
      />
      {att.status}
    </span>
  )

  const renderPhotos = (emp, att) => {
    const photos = [
      { url: att.in_photo_url, label: 'IN', time: att.in_time },
      { url: att.out_photo_url, label: 'OUT', time: att.out_time }
    ].filter((ph) => ph.url)
    if (photos.length === 0) return <span className="text-slate-300">—</span>
    return (
      <div className="flex items-center gap-1.5">
        {photos.map((ph) => (
          <button
            key={ph.label}
            type="button"
            onClick={() => setPreviewPhoto({
              url: ph.url,
              title: `${emp.name} • ${ph.label} ${formatTime12h(ph.time)} • ${att.date}`
            })}
            title={`View ${ph.label} photo`}
            className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-violet-400 transition-all"
          >
            <img src={ph.url} alt={`${ph.label} punch`} loading="lazy" className="w-full h-full object-cover" />
            <span className={`absolute bottom-0 inset-x-0 text-[8px] font-extrabold text-white text-center leading-tight ${ph.label === 'IN' ? 'bg-emerald-600/90' : 'bg-slate-800/90'}`}>
              {ph.label}
            </span>
          </button>
        ))}
      </div>
    )
  }

  const renderPaidLeave = (att, f) =>
    f.isAbsent || att.status === 'On Leave' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        Leave Day
      </span>
    ) : (
      <span className="text-slate-400 font-medium whitespace-nowrap">
        {att.status === 'Half Day' ? 'Half Leave' : '— (Present)'}
      </span>
    )

  const renderLocation = (att, mobile = false) =>
    att.coordinates ? (
      <a
        href={`https://www.google.com/maps?q=${att.coordinates}`}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex ${mobile ? 'items-start' : 'items-center'} gap-1 text-[11px] font-medium text-slate-700 hover:text-violet-600 transition-colors min-w-0`}
      >
        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span className={mobile ? 'break-words' : 'truncate max-w-[140px]'}>{att.location || att.coordinates}</span>
        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
      </a>
    ) : (
      <span className="text-slate-300">—</span>
    )

  const renderTime = (time, flagMins, flagText, flagCls) => (
    <>
      {formatTime12h(time) || '—'}
      {flagMins > 0 && (
        <span className={`block text-[10px] font-bold ${flagCls}`}>{flagText(formatMinutes(flagMins))}</span>
      )}
    </>
  )

  const emptyMessage = loading
    ? 'Loading attendance...'
    : staff.length === 0
    ? 'No active staff — add staff in Global Settings'
    : 'No attendance records found'

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-hidden">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        {/* Total Staff */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2 min-w-0">
          <div>
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
              Total Staff
            </span>
            <span className="text-base sm:text-3xl font-extrabold text-slate-900 mt-1 block truncate">
              {totalStaffCount}
            </span>
            <span className="hidden sm:block text-xs text-slate-500 font-medium mt-0.5">
              Registered employees
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 items-center justify-center font-bold shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2 min-w-0">
          <div>
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
              Present Today
            </span>
            <span className="text-base sm:text-3xl font-extrabold text-emerald-600 mt-1 block truncate">
              {presentCount}
            </span>
            <span className="hidden sm:block text-xs text-slate-500 font-medium mt-0.5">
              Staff recorded today
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Absent / Not In */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2 min-w-0">
          <div>
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
              Absent / Not In
            </span>
            <span className="text-base sm:text-3xl font-extrabold text-rose-600 mt-1 block truncate">
              {absentCount}
            </span>
            <span className="hidden sm:block text-xs text-slate-500 font-medium mt-0.5">
              Pending / Absent
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 items-center justify-center font-bold shrink-0">
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

      {/* Attendance — mobile cards */}
      <div className="md:hidden space-y-2.5">
        {records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-10 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          records.map(({ emp, att }) => {
            const f = getRowFlags(att)
            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
                {/* Header: employee + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 text-sm block leading-tight truncate">{emp.name}</span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {emp.designation} · {emp.department}
                      </span>
                    </div>
                  </div>
                  {renderStatus(att, f)}
                </div>

                {/* Times */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">In</span>
                    <span className="font-bold text-slate-800">
                      {renderTime(att.in_time, f.lateMins, (m) => `Late ${m}`, 'text-amber-600')}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Out</span>
                    <span className="font-bold text-slate-800">
                      {renderTime(att.out_time, f.earlyMins, (m) => `${m} early`, 'text-rose-600')}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Duration</span>
                    <span className="font-bold text-slate-800 break-words">{formatDuration(att.in_time, att.out_time, isToday)}</span>
                  </div>
                </div>

                {/* Leave + photos */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid Leave</span>
                    {renderPaidLeave(att, f)}
                  </div>
                  {renderPhotos(emp, att)}
                </div>

                {/* Location */}
                {att.coordinates && <div className="min-w-0">{renderLocation(att, true)}</div>}

                {/* Actions */}
                <div className="pt-2.5 border-t border-slate-100">{renderActions(emp, att, f, true)}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Attendance — table (tablet & desktop) */}
      <div className="hidden md:block bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden w-full min-w-0 max-w-full">
        <div className="sm:max-h-[calc(100vh-370px)] sm:min-h-[260px] overflow-x-auto overflow-y-auto w-full max-w-full block relative custom-scrollbar pb-2">
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
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Photo</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Paid Leave</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                records.map(({ emp, att }) => {
                  const f = getRowFlags(att)
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">{renderActions(emp, att, f)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">{emp.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                          {emp.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">{att.date || dateFilter}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {renderTime(att.in_time, f.lateMins, (m) => `Late by ${m}`, 'text-amber-600')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {renderTime(att.out_time, f.earlyMins, (m) => `Left ${m} early`, 'text-rose-600')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {formatDuration(att.in_time, att.out_time, isToday)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{renderStatus(att, f)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{renderPhotos(emp, att)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{renderPaidLeave(att, f)}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{renderLocation(att)}</td>
                    </tr>
                  )
                })
              )}
              {/* Bottom buffer row to ensure last row has clean breathing room */}
              <tr className="h-6">
                <td colSpan={11} className="p-0 border-0 pointer-events-none"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Punch Photo Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhoto.url} alt="Attendance punch" className="w-full rounded-2xl shadow-2xl bg-slate-900" />
            <div className="mt-2 flex items-center justify-between text-xs text-white/90 font-semibold">
              <span>{previewPhoto.title}</span>
              <a href={previewPhoto.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                Open original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

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
