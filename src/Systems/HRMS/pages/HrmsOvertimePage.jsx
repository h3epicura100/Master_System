import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Banknote,
  AlertCircle
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR, calculateOtPay, calculateHourlyRate } from '../services/hrmsCalculations'

export function HrmsOvertimePage() {
  const [overtime, setOvertime] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')

  // Log OT state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [otHoursInput, setOtHoursInput] = useState(2.5)
  const [otReason, setOtReason] = useState('')

  const refreshData = () => {
    setOvertime(staffStorageService.getOvertime())
    setStaff(staffStorageService.getStaff())
  }

  useEffect(() => {
    refreshData()
  }, [])

  const staffMap = useMemo(() => {
    const map = {}
    staff.forEach((s) => {
      map[s.id] = s
    })
    return map
  }, [staff])

  const filteredOt = useMemo(() => {
    return overtime.filter((ot) => {
      const emp = staffMap[ot.employee_id]
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = emp?.name?.toLowerCase().includes(q)
        const matchReason = ot.reason?.toLowerCase().includes(q)
        if (!matchName && !matchReason) return false
      }
      if (statusFilter !== 'All Status' && ot.status !== statusFilter) return false
      return true
    })
  }, [overtime, staffMap, search, statusFilter])

  // KPIs
  const totalOtHours = overtime.reduce((acc, o) => acc + (Number(o.hours) || 0), 0)
  const approvedOt = overtime.filter((o) => o.status === 'Approved')
  const pendingOtCount = overtime.filter((o) => o.status === 'Pending').length
  const totalApprovedPayout = approvedOt.reduce((acc, o) => {
    const emp = staffMap[o.employee_id] || { base_salary: 12000 }
    return acc + calculateOtPay(o.hours, emp.base_salary)
  }, 0)

  const handleApprove = (id) => {
    staffStorageService.updateOvertimeStatus(id, 'Approved')
    refreshData()
  }

  const handleReject = (id) => {
    if (window.confirm('Reject this overtime entry?')) {
      staffStorageService.updateOvertimeStatus(id, 'Rejected')
      refreshData()
    }
  }

  const handleLogOt = (e) => {
    e.preventDefault()
    if (!selectedEmpId || otHoursInput <= 0) return
    staffStorageService.logOvertime({
      employee_id: selectedEmpId,
      hours: otHoursInput,
      reason: otReason
    })
    setModalOpen(false)
    setOtReason('')
    refreshData()
  }

  const getInitials = (name) => {
    if (!name) return 'S'
    const p = name.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-hidden">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Logged OT</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{totalOtHours.toFixed(1)} hrs</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Across all departments</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approval</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">{pendingOtCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Hours awaiting review</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approved OT Payout</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">{formatINR(totalApprovedPayout)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Disbursed with payroll</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Standard Rate</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-violet-600 mt-1 block">1.5x</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Hourly wage multiplier</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search overtime entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="All Status">All Status</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSelectedEmpId(staff[0]?.id || '')
            setModalOpen(true)
          }}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Log Overtime Hours</span>
        </button>
      </div>

      {/* Overtime Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">OT Hours</th>
                <th className="py-3 px-4">Base Hourly</th>
                <th className="py-3 px-4">Calculated Pay</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Task Reason</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOt.map((ot) => {
                const emp = staffMap[ot.employee_id] || { name: 'Staff Member', department: 'WORKER', base_salary: 12000 }
                const hourlyRate = calculateHourlyRate(emp.base_salary)
                const computedOtPay = calculateOtPay(ot.hours, emp.base_salary)
                const isPending = ot.status === 'Pending'

                return (
                  <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {emp.department} • Base: {formatINR(emp.base_salary)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {ot.date}
                    </td>

                    {/* OT Hours */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-slate-900 text-sm">
                      {ot.hours} hrs
                    </td>

                    {/* Base Hourly Rate */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {formatINR(hourlyRate)} / hr
                    </td>

                    {/* Calculated Pay */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-700 text-sm">
                      {formatINR(computedOtPay)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          ot.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ot.status === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ot.status === 'Approved' ? 'bg-emerald-500' : ot.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        />
                        {ot.status}
                      </span>
                    </td>

                    {/* Task Reason */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium">
                      {ot.reason || 'Overtime support'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(ot.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(ot.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic">Reviewed</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log OT Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Staff Overtime</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogOt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Member
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  {staff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={otHoursInput}
                  onChange={(e) => setOtHoursInput(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task / Event Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wedding buffet live counter extension..."
                  value={otReason}
                  onChange={(e) => setOtReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HrmsOvertimePage
