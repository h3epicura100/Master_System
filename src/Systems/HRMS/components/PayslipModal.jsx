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
  const paymentStatus = status === 'Paid' ? `Paid${paidAt ? ` on ${formatSlipDate(paidAt)}` : ''}` : status

  const details = [
    ['Employee Name', employee.name],
    ['Employee Code', employee.username || '—'],
    ['Designation', employee.designation || '—'],
    ['Department', employee.department || '—'],
    ['Date of Joining', formatSlipDate(employee.join_date)],
    ['Mobile', employee.mobile || '—'],
    ['Monthly Salary', formatINR(calc.baseSalary)],
    ['Payment Status', paymentStatus]
  ]

  const attendance = [
    ['Days in Month', calc.daysInMonth],
    ['Days Payable', calc.daysCounted ?? calc.daysInMonth],
    ['Present Days', calc.effectivePresentDays],
    ['Leaves Taken', calc.usedLeaves],
    ['Paid Leaves Allowed', calc.allowedLeaves],
    ['Loss of Pay Days', calc.cutDays]
  ]

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

  const cell = 'px-2.5 sm:px-3 py-2 border border-slate-300 align-top'
  const labelCell = `${cell} bg-slate-100 font-bold text-slate-700`
  const headCell = 'px-2.5 sm:px-3 py-2 bg-slate-800 text-white font-bold border border-slate-800'

  const LineTable = ({ title, lines, totalLabel, total }) => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={`${headCell} text-left`}>{title}</th>
          <th className={`${headCell} text-right w-[38%]`}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.label}>
            <td className={cell}>{l.label}</td>
            <td className={`${cell} text-right whitespace-nowrap`}>{formatINR(l.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="font-bold bg-slate-100">
          <td className={cell}>{totalLabel}</td>
          <td className={`${cell} text-right whitespace-nowrap`}>{formatINR(total)}</td>
        </tr>
      </tfoot>
    </table>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-t-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] sm:max-h-[94vh] overflow-hidden">
        {/* Controls Bar */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 truncate">
              <span className="hidden sm:inline">Monthly Salary </span>Payslip · {month}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => run('download', downloadPayslipPdf)}
              disabled={Boolean(busy)}
              title="Download PDF"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
            >
              {busy === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>PDF</span>
            </button>
            <button
              onClick={() => run('print', printPayslipPdf)}
              disabled={Boolean(busy)}
              title="Print"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy === 'print' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Preview (same content as the PDF, reflowed for small screens) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-8 bg-white text-slate-800 text-[11px] sm:text-xs space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={COMPANY.logo} alt={`${COMPANY.name} logo`} className="w-12 h-12 sm:w-16 sm:h-16 object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">{COMPANY.name}</h1>
                <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{COMPANY.tagline}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 break-words">{COMPANY.address} | {COMPANY.email}</p>
              </div>
            </div>
            <div className="flex sm:block items-baseline justify-between gap-2 sm:text-right shrink-0">
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">PAYSLIP</p>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-600">{month}</p>
                <p className="text-[10px] text-slate-500 font-mono">{slipNo}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs sm:text-sm font-bold text-slate-900">Salary Slip for the month of {month}</p>

          {/* Employee Details: 2 columns on phones, 4 on wider screens */}
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr><th colSpan={4} className={`${headCell} text-left`}>EMPLOYEE DETAILS</th></tr>
            </thead>
            <tbody className="sm:hidden">
              {details.map(([label, value]) => (
                <tr key={label}>
                  <td colSpan={2} className={labelCell}>{label}</td>
                  <td colSpan={2} className={`${cell} break-words`}>{value}</td>
                </tr>
              ))}
            </tbody>
            <tbody className="hidden sm:table-row-group">
              {[0, 2, 4, 6].map((i) => (
                <tr key={i}>
                  <td className={labelCell}>{details[i][0]}</td>
                  <td className={`${cell} break-words`}>{details[i][1]}</td>
                  <td className={labelCell}>{details[i + 1][0]}</td>
                  <td className={`${cell} break-words`}>{details[i + 1][1]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Attendance Summary: 3 x 2 grid on phones, single row on wider screens */}
          <div className="grid grid-cols-3 sm:grid-cols-6 border-l border-t border-slate-300 text-center">
            {attendance.map(([label, value]) => (
              <div key={label} className="border-r border-b border-slate-300">
                <div className="px-1 py-1.5 bg-slate-800 text-white font-bold text-[9px] sm:text-[10px] leading-tight min-h-[2.5rem] flex items-center justify-center">
                  {label}
                </div>
                <div className="py-2 font-bold text-sm text-slate-900">{num(value)}</div>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions: stacked on phones, side by side on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LineTable title="Earnings" lines={earnings} totalLabel="Gross Earnings" total={calc.grossPay} />
            <LineTable title="Deductions" lines={deductions} totalLabel="Total Deductions" total={calc.totalDeductions} />
          </div>

          {/* Net Pay */}
          <div className="border border-slate-300 bg-indigo-50">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-slate-300">
              <span className="font-bold text-xs sm:text-sm">NET SALARY PAYABLE</span>
              <span className="font-extrabold text-base sm:text-lg whitespace-nowrap">{formatINR(calc.netPay)}</span>
            </div>
            <p className="px-3 py-2 italic text-slate-600 break-words">Amount in words: {numberToWordsINR(calc.netPay)}</p>
          </div>

          {/* Signatures */}
          <div className="pt-10 sm:pt-12 grid grid-cols-2 gap-6 sm:gap-16 text-center">
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
