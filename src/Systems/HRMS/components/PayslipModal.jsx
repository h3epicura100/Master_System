import React, { useState } from 'react'
import { X, Printer, Download, Loader2 } from 'lucide-react'
import { formatINR, numberToWordsINR } from '../services/hrmsCalculations'
import {
  COMPANY,
  formatSlipDate,
  getPayslipLines,
  downloadPayslipPdf,
  printPayslipPdf
} from '../services/payslipPdf'

const num = (n) => {
  const v = Number(n) || 0
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function PayslipModal({ isOpen, onClose, payrollItem, month = '', slipSuffix = '' }) {
  const [busy, setBusy] = useState(null) // 'download' | 'print'

  if (!isOpen || !payrollItem) return null

  const { employee, calc, status = 'Hold', paidAt = null } = payrollItem
  const slipNo = `SLIP-${employee.id.slice(0, 8).toUpperCase()}-${slipSuffix}`
  const slip = { employee, calc, month, slipNo, status, paidAt }
  const { earnings, deductions } = getPayslipLines(calc)
  const lineRows = Array.from({ length: Math.max(earnings.length, deductions.length) }, (_, i) => [earnings[i], deductions[i]])
  const paymentStatus = status === 'Paid' ? `Paid${paidAt ? ` on ${formatSlipDate(paidAt)}` : ''}` : status

  const run = async (kind, action) => {
    setBusy(kind)
    try {
      await action(slip)
    } catch (e) {
      alert(`Failed to generate payslip PDF: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const labelCell = 'px-3 py-2 bg-slate-100 font-bold text-slate-700 border border-slate-300 w-[22%]'
  const valueCell = 'px-3 py-2 text-slate-900 border border-slate-300'
  const headCell = 'px-3 py-2 bg-slate-800 text-white font-bold border border-slate-800'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span className="text-xs font-bold text-slate-700">Monthly Salary Payslip · {month}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => run('download', downloadPayslipPdf)}
              disabled={Boolean(busy)}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => run('print', printPayslipPdf)}
              disabled={Boolean(busy)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy === 'print' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Preview (mirrors the PDF layout) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-white text-slate-800 text-xs space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={COMPANY.logo} alt={`${COMPANY.name} logo`} className="w-16 h-16 object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">{COMPANY.name}</h1>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{COMPANY.tagline}</p>
                <p className="text-[10px] text-slate-500">{COMPANY.address} | {COMPANY.email}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-extrabold text-slate-900 leading-tight">PAYSLIP</p>
              <p className="text-[11px] font-semibold text-slate-600">{month}</p>
              <p className="text-[10px] text-slate-500 font-mono">{slipNo}</p>
            </div>
          </div>

          <p className="text-center text-sm font-bold text-slate-900">Salary Slip for the month of {month}</p>

          {/* Employee Details */}
          <table className="w-full border-collapse">
            <thead>
              <tr><th colSpan={4} className={`${headCell} text-left`}>EMPLOYEE DETAILS</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className={labelCell}>Employee Name</td><td className={valueCell}>{employee.name}</td>
                <td className={labelCell}>Employee Code</td><td className={valueCell}>{employee.username || '—'}</td>
              </tr>
              <tr>
                <td className={labelCell}>Designation</td><td className={valueCell}>{employee.designation || '—'}</td>
                <td className={labelCell}>Department</td><td className={valueCell}>{employee.department || '—'}</td>
              </tr>
              <tr>
                <td className={labelCell}>Date of Joining</td><td className={valueCell}>{formatSlipDate(employee.join_date)}</td>
                <td className={labelCell}>Mobile</td><td className={valueCell}>{employee.mobile || '—'}</td>
              </tr>
              <tr>
                <td className={labelCell}>Monthly Salary</td><td className={valueCell}>{formatINR(calc.baseSalary)}</td>
                <td className={labelCell}>Payment Status</td><td className={valueCell}>{paymentStatus}</td>
              </tr>
            </tbody>
          </table>

          {/* Attendance Summary */}
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                {['Days in Month', 'Days Payable Period', 'Present Days', 'Leaves Taken', 'Paid Leaves Allowed', 'Loss of Pay Days'].map((h) => (
                  <th key={h} className={`${headCell} text-[10px]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold">
                {[calc.daysInMonth, calc.daysCounted ?? calc.daysInMonth, calc.effectivePresentDays, calc.usedLeaves, calc.allowedLeaves, calc.cutDays].map((v, i) => (
                  <td key={i} className="px-2 py-2 border border-slate-300">{num(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Earnings | Deductions */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${headCell} text-left`}>Earnings</th>
                <th className={`${headCell} text-right w-[18%]`}>Amount</th>
                <th className={`${headCell} text-left`}>Deductions</th>
                <th className={`${headCell} text-right w-[18%]`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map(([e, d], i) => (
                <tr key={i}>
                  <td className={valueCell}>{e?.label}</td>
                  <td className={`${valueCell} text-right`}>{e ? formatINR(e.amount) : ''}</td>
                  <td className={valueCell}>{d?.label}</td>
                  <td className={`${valueCell} text-right`}>{d ? formatINR(d.amount) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-slate-100">
                <td className={valueCell}>Gross Earnings</td>
                <td className={`${valueCell} text-right`}>{formatINR(calc.grossPay)}</td>
                <td className={valueCell}>Total Deductions</td>
                <td className={`${valueCell} text-right`}>{formatINR(calc.totalDeductions)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Net Pay */}
          <table className="w-full border-collapse bg-indigo-50">
            <tbody>
              <tr>
                <td className={`${valueCell} font-bold text-sm`}>NET SALARY PAYABLE</td>
                <td className={`${valueCell} text-right font-extrabold text-base w-[30%]`}>{formatINR(calc.netPay)}</td>
              </tr>
              <tr>
                <td colSpan={2} className={`${valueCell} italic text-slate-600`}>
                  Amount in words: {numberToWordsINR(calc.netPay)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-16 text-center">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-800">Employee Signature</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-800">Authorised Signatory</p>
              <p className="text-[10px] text-slate-500">For {COMPANY.name}</p>
            </div>
          </div>

          <p className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
            This is a computer-generated payslip and does not require a physical signature.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PayslipModal
