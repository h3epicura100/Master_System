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
import { IncentiveEditModal } from '../components/IncentiveEditModal'
import { hrmsService } from '../services/hrmsService'
import {
  formatINR,
  calculateEmployeePayroll,
  payrollCalcToRecord,
  payrollRecordToCalc,
  getMonthRange,
  getDaysCounted,
  toLocalDateStr
} from '../services/hrmsCalculations'
import { useAuth } from '../../../context/AuthContext'

const PRESENT_STATUSES = ['Checked IN', 'Checked OUT']

export function HrmsPayrollPage() {
  const { currentUser, isAdmin, getModuleRole } = useAuth()
  const isUserAdmin = isAdmin() || getModuleRole('hrms') === 'admin'

  const [month, setMonth] = useState(toLocalDateStr().slice(0, 7)) // 'YYYY-MM'
  const range = useMemo(() => getMonthRange(month), [month])

  const [staff, setStaff] = useState([])
  const [attendance, setAttendance] = useState([])
  const [advances, setAdvances] = useState([])
  const [overtime, setOvertime] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyEmpId, setBusyEmpId] = useState(null)
  const [subTab, setSubTab] = useState('current') // 'current' | 'paid'

  // Modals state
  const [selectedSlipItem, setSelectedSlipItem] = useState(null)
  const [incentiveItem, setIncentiveItem] = useState(null)

  const refreshData = async () => {
    const employeeId = isUserAdmin ? undefined : currentUser?.id
    try {
      const [staffList, att, ot, adv, recs] = await Promise.all([
        hrmsService.getStaff(),
        hrmsService.getAttendance({ from: range.from, to: range.to, employeeId }),
        hrmsService.getOvertime({ from: range.from, to: range.to, employeeId }),
        hrmsService.getAdvances({ employeeId, status: 'Approved' }),
        hrmsService.getPayrollRecords(range.periodMonth, { employeeId })
      ])
      setStaff(staffList)
      setAttendance(att)
      setOvertime(ot)
      setAdvances(adv)
      setRecords(recs)
    } catch (e) {
      console.error('Load payroll error:', e)
      alert(`Failed to load payroll: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [range, isUserAdmin, currentUser?.id])

  // Staff Data Isolation: staff only sees their own payroll
  const visibleStaff = useMemo(() => {
    if (isUserAdmin) return staff
    return staff.filter((s) => s.id === currentUser?.id)
  }, [staff, isUserAdmin, currentUser])

  // Calculate full payroll item for each employee
  const payrollList = useMemo(() => {
    const recordMap = Object.fromEntries(records.map((r) => [r.employee_id, r]))

    return visibleStaff.map((emp) => {
      const record = recordMap[emp.id] || null
      const status = record?.status || 'Hold'

      const empAtt = attendance.filter((a) => a.employee_id === emp.id)
      const presentDays = empAtt.filter((a) => PRESENT_STATUSES.includes(a.status)).length
      const halfDays = empAtt.filter((a) => a.status === 'Half Day').length

      const empOt = overtime.filter((o) => o.employee_id === emp.id)
      const sumHours = (list) => list.reduce((acc, o) => acc + (Number(o.hours) || 0), 0)
      const approvedOtHours = sumHours(empOt.filter((o) => o.status === 'Approved'))
      const pendingOtHours = sumHours(empOt.filter((o) => o.status === 'Pending'))

      // Active advance requested on/before this month: deduct EMI, capped at what's left
      const activeAdvance = advances.find((a) => a.employee_id === emp.id && a.request_date <= range.to) || null
      const advanceEmi = activeAdvance
        ? Math.min(Number(activeAdvance.monthly_emi) || 0, Number(activeAdvance.remaining_balance) || 0)
        : 0

      const inputs = {
        employee: emp,
        daysInMonth: range.daysInMonth,
        daysCounted: getDaysCounted(month, emp.join_date),
        presentDays,
        halfDays,
        approvedOtHours,
        advanceEmi
      }

      // Paid months are frozen to the stored snapshot; everything else is live
      const calc = status === 'Paid'
        ? payrollRecordToCalc(record)
        : calculateEmployeePayroll({ ...inputs, incentives: Number(record?.incentives) || 0 })

      return { emp, record, activeAdvance, inputs, pendingOtHours, calc, status }
    })
  }, [visibleStaff, attendance, overtime, advances, records, range, month])

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

  // Persist a full snapshot of the employee's payroll for this month
  const persist = async (item, { status = item.status, calc = item.calc } = {}) => {
    setBusyEmpId(item.emp.id)
    try {
      await hrmsService.savePayrollRecord({
        employee_id: item.emp.id,
        period_month: range.periodMonth,
        ...payrollCalcToRecord(calc),
        // A paid snapshot keeps the advance it recovered against
        advance_id: item.status === 'Paid' ? item.record?.advance_id || null : item.activeAdvance?.id || null,
        status
      })
      await refreshData()
    } catch (e) {
      alert(`Failed to save payroll: ${e.message}`)
    } finally {
      setBusyEmpId(null)
    }
  }

  const handleStatusChange = (item, nextStatus) => {
    if (nextStatus === item.status) return
    if (nextStatus === 'Paid' && !window.confirm(
      `Mark ${item.emp.name}'s ${range.label} salary of ${formatINR(item.calc.netPay)} as paid?` +
      (item.calc.advanceEmi > 0 ? `\n${formatINR(item.calc.advanceEmi)} will be recovered against the salary advance.` : '')
    )) return
    persist(item, { status: nextStatus })
  }

  const handleIncentiveSave = (amount) => {
    const item = incentiveItem
    return persist(item, { calc: calculateEmployeePayroll({ ...item.inputs, incentives: amount }) })
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
          {range.label}
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
        <input
          type="month"
          value={month}
          max={toLocalDateStr().slice(0, 7)}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="ml-auto px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      {/* 3 Master KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payroll Period</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{range.shortLabel}</span>
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
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Incl. OT & incentives</span>
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
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden w-full min-w-0 max-w-full">
        <div className="max-h-[340px] sm:max-h-[calc(100vh-370px)] min-h-[260px] overflow-x-auto overflow-y-auto w-full max-w-full block relative custom-scrollbar pb-2">
          <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-xs">
              <tr className="border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {isUserAdmin && <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Action</th>}
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Employee</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Department</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Present Days</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Paid Leave</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Gross Wage</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">OT Pay</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Advance EMI</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Net Pay</th>
                <th className="py-3 px-4 bg-slate-50/95 sticky top-0 z-10">Status</th>
                <th className="py-3 px-4 text-right bg-slate-50/95 sticky top-0 z-10">Monthly Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.length === 0 && (
                <tr>
                  <td colSpan={isUserAdmin ? 11 : 10} className="py-12 text-center text-slate-400">
                    <Banknote className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">
                      {loading ? 'Loading payroll...' : subTab === 'paid' ? 'No salaries paid for this month yet' : 'No active staff — add staff in Global Settings'}
                    </p>
                  </td>
                </tr>
              )}
              {displayedList.map((item) => {
                const { emp, pendingOtHours, calc, status } = item
                const isBusy = busyEmpId === emp.id
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Action Submit (Admin only) */}
                    {isUserAdmin && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          disabled={isBusy}
                          onClick={() => handleStatusChange(item, status === 'Paid' ? 'Hold' : 'Paid')}
                          className={`disabled:opacity-50 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs ${
                            status === 'Paid'
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {status === 'Paid' ? 'Revert' : 'Submit'}
                        </button>
                      </td>
                    )}

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
                          {calc.effectivePresentDays} / {calc.daysCounted}d
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
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{formatINR(calc.grossPay - calc.otPay)}</span>
                      {(calc.incentives > 0 || (isUserAdmin && status !== 'Paid')) && (
                        <button
                          type="button"
                          disabled={!isUserAdmin || status === 'Paid' || isBusy}
                          onClick={() => setIncentiveItem(item)}
                          className="text-[10px] font-bold text-violet-600 enabled:hover:underline disabled:cursor-default"
                        >
                          {calc.incentives > 0 ? `incl. ${formatINR(calc.incentives)} incentive` : '+ Incentive'}
                        </button>
                      )}
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

                    {/* Status Dropdown: Restricted to Admin */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isUserAdmin ? (
                        <select
                          value={status}
                          disabled={isBusy}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
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
                      ) : (
                        <span
                          className={`inline-block py-1 px-2.5 rounded-lg text-xs font-bold border ${
                            status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {status}
                        </span>
                      )}
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
              {/* Bottom buffer row to ensure last row has clean breathing room */}
              <tr className="h-6">
                <td colSpan={isUserAdmin ? 11 : 10} className="p-0 border-0 pointer-events-none"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Payslip Modal */}
      <PayslipModal
        isOpen={Boolean(selectedSlipItem)}
        onClose={() => setSelectedSlipItem(null)}
        payrollItem={selectedSlipItem}
        month={range.label}
        slipSuffix={month.replace('-', '')}
      />

      {/* Incentive Modal */}
      <IncentiveEditModal
        isOpen={Boolean(incentiveItem)}
        onClose={() => setIncentiveItem(null)}
        employee={incentiveItem?.emp}
        currentAmount={incentiveItem?.calc.incentives || 0}
        onSave={handleIncentiveSave}
      />
    </div>
  )
}

export default HrmsPayrollPage
