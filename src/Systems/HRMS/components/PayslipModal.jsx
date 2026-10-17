import React, { useRef } from 'react'
import { X, Printer, Download, Banknote, Building2 } from 'lucide-react'
import { formatINR, numberToWordsINR } from '../services/hrmsCalculations'

export function PayslipModal({ isOpen, onClose, payrollItem, month = 'October 2026' }) {
  const printRef = useRef(null)

  if (!isOpen || !payrollItem) return null

  const { employee, calc } = payrollItem

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span className="text-xs font-bold text-slate-700">Monthly Salary Payslip · {month}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white space-y-6 text-slate-800 font-sans print:p-0">
          {/* Company Branding Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm">
                  H3
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                    H3 EPICURA
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                    Production, Catering & Operations Management
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Raipur Operations Center, Chhattisgarh • Contact: info@h3epicura.com
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-xs font-extrabold uppercase tracking-wider inline-block">
                Payslip
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1.5">{month}</p>
              <p className="text-[11px] text-slate-400 font-mono">SLIP-{employee.id.toUpperCase()}-OCT26</p>
            </div>
          </div>

          {/* Employee & Attendance Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Name</span>
              <span className="font-extrabold text-slate-900 block mt-0.5">{employee.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
              <span className="font-semibold text-slate-700 block mt-0.5">{employee.designation}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
              <span className="font-semibold text-slate-700 block mt-0.5">{employee.department}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile / WhatsApp</span>
              <span className="font-semibold text-slate-700 block mt-0.5">{employee.mobile}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Days in Month</span>
              <span className="font-bold text-slate-800 block mt-0.5">{calc.daysInMonth} Days</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present Days</span>
              <span className="font-bold text-emerald-700 block mt-0.5">{calc.effectivePresentDays} Days</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leaves Taken</span>
              <span className="font-bold text-slate-800 block mt-0.5">{calc.usedLeaves} / {calc.allowedLeaves} Days</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unpaid Cut Days</span>
              <span className={`font-bold block mt-0.5 ${calc.cutDays > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {calc.cutDays} Days
              </span>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-slate-200 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Earnings
              </div>
              <div className="p-3.5 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Base Earned Wage</span>
                  <span className="font-bold text-slate-900">{formatINR(calc.grossPay - calc.otPay - (calc.incentives || 0))}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-600">Overtime Pay ({calc.approvedOtHours}h)</span>
                  <span className="font-bold text-slate-900">{formatINR(calc.otPay)}</span>
                </div>
                {calc.incentives > 0 && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-600">Sales / Performance Incentive</span>
                    <span className="font-bold text-slate-900">{formatINR(calc.incentives)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 font-bold text-slate-900 text-sm">
                  <span>Gross Earnings</span>
                  <span className="text-emerald-700">{formatINR(calc.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-rose-50/70 border-b border-slate-200 text-xs font-bold text-rose-800 uppercase tracking-wider">
                Deductions
              </div>
              <div className="p-3.5 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Unpaid Leave Cut ({calc.cutDays}d)</span>
                  <span className="font-bold text-rose-600">{formatINR(calc.cutAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-600">Salary Advance Recovery EMI</span>
                  <span className="font-bold text-rose-600">{formatINR(calc.advanceEmi)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-slate-400">
                  <span>Statutory Deductions (TDS / PF)</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold text-slate-900 text-sm">
                  <span>Total Deductions</span>
                  <span className="text-rose-700">{formatINR(calc.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-200 block">
                Net Salary Payable
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {formatINR(calc.netPay)}
              </p>
              <p className="text-xs text-violet-100 mt-1 italic">
                In words: {numberToWordsINR(calc.netPay)}
              </p>
            </div>
            <div className="text-xs text-violet-200 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl sm:text-right border border-white/10">
              <span className="block font-semibold">Status: Authorized Payout</span>
              <span className="block text-[11px] text-violet-300 mt-0.5">Disbursement Mode: Bank Transfer / Cash</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold text-slate-800">Employee Signature</p>
              <p className="text-[10px] text-slate-400">Received & Confirmed</p>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">For H3 Epicura Management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PayslipModal
