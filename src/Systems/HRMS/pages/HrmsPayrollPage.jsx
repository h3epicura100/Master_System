import React, { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  Percent,
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  Printer
} from 'lucide-react'
import { PayslipModal } from '../components/PayslipModal'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR, calculateEmployeePayroll } from '../services/hrmsCalculations'

export function HrmsPayrollPage() {
  const [staff, setStaff] = useState([])
  const [advances, setAdvances] = useState([])
  const [overtime, setOvertime] = useState([])
  const [payrollAdjustments, setPayrollAdjustments] = useState({})
  const [subTab, setSubTab] = useState('current') // 'current' | 'paid'

  // Modals state
  const [selectedSlipItem, setSelectedSlipItem] = useState(null)

  const refreshData = () => {
    setStaff(staffStorageService.getStaff())
    setAdvances(staffStorageService.getAdvances())
    setOvertime(staffStorageService.getOvertime())
    setPayrollAdjustments(staffStorageService.getPayrollAdjustments())
  }

  useEffect(() => {
    refreshData()
  }, [])

  // Calculate full payroll item for each employee
  const payrollList = useMemo(() => {
    return staff.map((emp) => {
      const adj = payrollAdjustments[emp.id] || {
        present_days: 30,
        half_days: 0,
        used_leaves: 0,
        incentives: 0,
        status: 'Hold'
      }

      // Find active approved advance EMI
      const activeAdvance = advances.find((a) => a.employee_id === emp.id && a.status === 'Approved')
      const advanceEmi = activeAdvance ? Number(activeAdvance.monthly_emi) || 0 : 0

      // Find approved OT hours
      const approvedOt = overtime.filter((o) => o.employee_id === emp.id && o.status === 'Approved')
      const approvedOtHours = approvedOt.reduce((acc, o) => acc + (Number(o.hours) || 0), 0)

      // Find pending OT hours for display
      const pendingOt = overtime.filter((o) => o.employee_id === emp.id && o.status === 'Pending')
      const pendingOtHours = pendingOt.reduce((acc, o) => acc + (Number(o.hours) || 0), 0)

      const calc = calculateEmployeePayroll({
        employee: emp,
        presentDays: adj.present_days !== undefined ? adj.present_days : 30,
        halfDays: adj.half_days || 0,
        usedLeaves: adj.used_leaves || 0,
        approvedOtHours,
        incentives: 0,
        advanceEmi,
        daysInMonth: 31
      })

      return {
        emp,
        adj,
        advanceEmi,
        pendingOtHours,
        calc,
        status: adj.status || 'Hold'
      }
    })
  }, [staff, advances, overtime, payrollAdjustments])

  // Filter based on subTab
  const displayedList = useMemo(() => {
    if (subTab === 'paid') {
      return payrollList.filter((item) => item.status === 'Paid')
    }
    return payrollList
  }, [payrollList, subTab])

  // Aggregate KPIs
  const totalEmployees = payrollList.length
  const totalGrossPay = payrollList.reduce((acc, item) => acc + item.calc.grossPay, 0)
  const totalNetPay = payrollList.reduce((acc, item) => acc + item.calc.netPay, 0)
  const paidCount = payrollList.filter((item) => item.status === 'Paid').length
  const paidPercent = totalEmployees > 0 ? Math.round((paidCount / totalEmployees) * 100) : 0

  const handleStatusChange = (empId, nextStatus) => {
    staffStorageService.setEmployeePayrollStatus(empId, nextStatus)
    refreshData()
  }

  const getInitials = (name) => {
    if (!name) return 'S'
    const p = name.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-hidden">
      {/* Sub Tabs: Current Month, Paid */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2">
        <button
          onClick={() => setSubTab('current')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'current'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Current Month (October 2026)
        </button>
        <button
          onClick={() => setSubTab('paid')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'paid'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Paid Disbursed ({paidCount})
        </button>
      </div>

      {/* 3 Master KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payroll Period</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">Oct 2026</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">{totalEmployees} Active staff</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Gross Pay</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{formatINR(totalGrossPay)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Before OT & deductions</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Net Pay</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">{formatINR(totalNetPay)}</span>
            <span className="text-xs text-emerald-600 font-bold mt-0.5 block">{paidPercent}% Paid</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/80 text-xs text-violet-950 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
        <span>
          Payroll calculates gross wages based on attendance, approved overtime (OT), and automatic salary advance deductions.
        </span>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Present Days</th>
                <th className="py-3 px-4">Paid Leave</th>
                <th className="py-3 px-4">Gross Wage</th>
                <th className="py-3 px-4">OT Pay</th>
                <th className="py-3 px-4">Advance EMI</th>
                <th className="py-3 px-4">Net Pay</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Monthly Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.map(({ emp, adj, advanceEmi, pendingOtHours, calc, status }) => {
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Action Submit */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusChange(emp.id, status === 'Paid' ? 'Hold' : 'Paid')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs ${
                          status === 'Paid'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {status === 'Paid' ? 'Revert' : 'Submit'}
                      </button>
                    </td>

                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 block font-medium">{emp.designation}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                        {emp.department}
                      </span>
                    </td>

                    {/* Present Days */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs">
                          {calc.effectivePresentDays} / {calc.daysInMonth}d
                        </span>
                        {pendingOtHours > 0 && (
                          <span className="text-[10px] text-amber-600 block font-bold">
                            OT {pendingOtHours}h (Pending)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Paid Leave */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-semibold text-slate-800">
                          {calc.usedLeaves} / {calc.allowedLeaves} Used
                        </span>
                        <span
                          className={`text-[10px] block font-bold ${
                            calc.cutDays > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {calc.cutDays > 0 ? `-${calc.cutDays} Days Cut` : '0 Salary Cut'}
                        </span>
                      </div>
                    </td>

                    {/* Gross */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                      {formatINR(calc.grossPay - calc.otPay)}
                    </td>

                    {/* OT Pay */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {calc.otPay > 0 ? (
                        <span className="font-bold text-emerald-700">{formatINR(calc.otPay)}</span>
                      ) : (
                        <span>₹0</span>
                      )}
                    </td>

                    {/* Advance EMI */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {calc.advanceEmi > 0 ? (
                        <span className="font-bold text-rose-600">-{formatINR(calc.advanceEmi)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Net Pay */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-slate-900 text-sm">
                      {formatINR(calc.netPay)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                          status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="Hold">Hold</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>

                    {/* Slip Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedSlipItem({ employee: emp, calc })}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Payslip Modal */}
      <PayslipModal
        isOpen={Boolean(selectedSlipItem)}
        onClose={() => setSelectedSlipItem(null)}
        payrollItem={selectedSlipItem}
      />
    </div>
  )
}

export default HrmsPayrollPage
