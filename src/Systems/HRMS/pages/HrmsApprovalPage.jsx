import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  User,
  CreditCard
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR } from '../services/hrmsCalculations'

export function HrmsApprovalPage() {
  const [advances, setAdvances] = useState([])
  const [staff, setStaff] = useState([])

  const refreshData = () => {
    setAdvances(staffStorageService.getAdvances())
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

  const pendingRequests = useMemo(() => {
    return advances.filter((a) => a.status === 'Pending')
  }, [advances])

  const handledRequests = useMemo(() => {
    return advances.filter((a) => a.status !== 'Pending')
  }, [advances])

  // KPIs
  const pendingCount = pendingRequests.length
  const totalPendingAmount = pendingRequests.reduce((acc, a) => acc + (Number(a.amount) || 0), 0)
  const approvedCount = advances.filter((a) => a.status === 'Approved').length
  const rejectedCount = advances.filter((a) => a.status === 'Rejected').length

  const handleApprove = (id) => {
    staffStorageService.updateAdvanceStatus(id, 'Approved')
    refreshData()
  }

  const handleReject = (id) => {
    if (window.confirm('Reject this salary advance request?')) {
      staffStorageService.updateAdvanceStatus(id, 'Rejected')
      refreshData()
    }
  }

  const handleAdjustAndApprove = (adv) => {
    const newEmi = window.prompt(`Adjust monthly deduction EMI for ${formatINR(adv.amount)} advance:`, adv.monthly_emi)
    if (newEmi && !isNaN(newEmi) && Number(newEmi) > 0) {
      staffStorageService.updateAdvanceStatus(adv.id, 'Approved', Number(newEmi))
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">{pendingCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Awaiting review</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Requested Amount</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{formatINR(totalPendingAmount)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Total pending loans</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approved Loans</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">{approvedCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Active recovery schedules</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rejected Requests</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 block">{rejectedCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Declined applications</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pending Approval Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Pending Salary Advance Applications ({pendingCount})
            </h3>
            <p className="text-xs text-slate-500">
              Review and disburse staff loans with automatic payroll deduction schedules
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-10 border border-slate-200/90 text-center text-slate-400">
            <CheckSquare className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="font-bold text-slate-700 text-sm">All advance requests reviewed!</p>
            <p className="text-xs text-slate-400 mt-0.5">There are no pending applications awaiting manager approval.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((adv) => {
              const emp = staffMap[adv.employee_id] || { name: 'Staff Member', department: 'WORKER', base_salary: 12000 }

              return (
                <div
                  key={adv.id}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-violet-300 transition-all"
                >
                  <div>
                    {/* Header: Staff Info & Amount */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">{emp.name}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {emp.department} • Base: {formatINR(emp.base_salary)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-slate-900 block leading-tight">
                          {formatINR(adv.amount)}
                        </span>
                        <span className="text-[10px] text-violet-700 font-bold block">
                          EMI: {formatINR(adv.monthly_emi)} / mo
                        </span>
                      </div>
                    </div>

                    {/* Reason & Date */}
                    <div className="mt-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                          Stated Reason:
                        </span>
                        <p className="text-slate-700 font-medium mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {adv.reason || 'No specific reason provided.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px]">
                        <span>Applied on: <strong>{adv.request_date}</strong></span>
                        <span className="text-emerald-600 font-bold">Max Limit: {formatINR(emp.base_salary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(adv.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleAdjustAndApprove(adv)}
                      className="py-2 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-violet-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Adjust EMI</span>
                    </button>

                    <button
                      onClick={() => handleReject(adv.id)}
                      className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Handled History Table */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-slate-800">Review History ({handledRequests.length})</h4>
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Monthly EMI</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handledRequests.map((adv) => {
                  const emp = staffMap[adv.employee_id] || { name: 'Staff Member' }
                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{formatINR(adv.amount)}</td>
                      <td className="py-3 px-4 font-bold text-violet-700">{formatINR(adv.monthly_emi)}/mo</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            adv.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {adv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">{adv.request_date}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{adv.reason || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HrmsApprovalPage
