import React, { useState, useEffect, useMemo } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Banknote,
  Percent,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { AdvanceRequestModal } from '../components/AdvanceRequestModal'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR } from '../services/hrmsCalculations'

export function HrmsAdvancesPage() {
  const [advances, setAdvances] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [modalOpen, setModalOpen] = useState(false)

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

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const emp = staffMap[adv.employee_id]
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = emp?.name?.toLowerCase().includes(q)
        const matchReason = adv.reason?.toLowerCase().includes(q)
        if (!matchName && !matchReason) return false
      }
      if (statusFilter !== 'All Status' && adv.status !== statusFilter) return false
      return true
    })
  }, [advances, staffMap, search, statusFilter])

  // KPIs
  const totalAdvanced = advances.reduce((acc, a) => acc + (a.status !== 'Rejected' ? Number(a.amount) || 0 : 0), 0)
  const totalRecovered = advances.reduce((acc, a) => acc + (Number(a.total_recovered) || 0), 0)
  const remainingBalance = Math.max(0, totalAdvanced - totalRecovered)
  const recoveryPercent = totalAdvanced > 0 ? ((totalRecovered / totalAdvanced) * 100).toFixed(1) : 0

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
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Advanced</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{formatINR(totalAdvanced)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Approved staff loans</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Paid / Recovered</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">{formatINR(totalRecovered)}</span>
            <span className="text-xs text-emerald-600 font-bold mt-0.5 block">+{recoveryPercent}% Recovered</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Balance</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">{formatINR(remainingBalance)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Outstanding balance ledger</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recovery Progress</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-violet-600 mt-1 block">{recoveryPercent}%</span>
            <div className="w-24 h-2 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
              <div className="h-full bg-violet-600 rounded-full" style={{ width: `${recoveryPercent}%` }} />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Percent className="w-6 h-6" />
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
              placeholder="Search by staff name or reason..."
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
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved / Active</option>
            <option value="Rejected">Rejected</option>
            <option value="Closed">Fully Recovered</option>
          </select>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Advance Request</span>
        </button>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Advance Amount</th>
                <th className="py-3 px-4">Monthly EMI</th>
                <th className="py-3 px-4">Recovered</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No salary advance requests found</p>
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => {
                  const emp = staffMap[adv.employee_id] || { name: 'Unknown', department: 'WORKER' }

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {emp.department} • Base: {formatINR(emp.base_salary)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Request Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                        {adv.request_date}
                      </td>

                      {/* Advance Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-slate-900 text-sm">
                        {formatINR(adv.amount)}
                      </td>

                      {/* Monthly EMI */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-violet-700">
                        {formatINR(adv.monthly_emi)} / mo
                      </td>

                      {/* Recovered */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-600">
                        {formatINR(adv.total_recovered)}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-slate-900">
                        {formatINR(adv.remaining_balance)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            adv.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : adv.status === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : adv.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              adv.status === 'Approved'
                                ? 'bg-emerald-500'
                                : adv.status === 'Pending'
                                ? 'bg-amber-500'
                                : adv.status === 'Rejected'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {adv.status}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium">
                        {adv.reason || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance Request Modal */}
      <AdvanceRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={refreshData}
      />
    </div>
  )
}

export default HrmsAdvancesPage
