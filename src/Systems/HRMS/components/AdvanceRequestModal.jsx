import React, { useState } from 'react'
import {
  X,
  CreditCard,
  User,
  Banknote,
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR } from '../services/hrmsCalculations'

export function AdvanceRequestModal({ isOpen, onClose, onSave }) {
  const staff = staffStorageService.getStaff()
  const activeStaff = staff

  const [employeeId, setEmployeeId] = useState(activeStaff[0]?.id || '')
  const [amount, setAmount] = useState(5000)
  const [monthlyEmi, setMonthlyEmi] = useState(1000)
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const selectedEmp = staff.find((s) => s.id === employeeId)
  const monthlySalary = selectedEmp ? Number(selectedEmp.base_salary) || 0 : 0
  const maxAdvance = monthlySalary

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!employeeId) {
      setErrorMsg('Please select an employee.')
      return
    }
    if (amount <= 0) {
      setErrorMsg('Advance amount must be greater than zero.')
      return
    }
    if (amount > maxAdvance) {
      setErrorMsg(`Advance cannot exceed monthly salary (${formatINR(maxAdvance)}).`)
      return
    }
    if (monthlyEmi <= 0 || monthlyEmi > amount) {
      setErrorMsg('Monthly deduction must be between ₹100 and the requested advance amount.')
      return
    }

    staffStorageService.requestAdvance({
      employee_id: employeeId,
      amount,
      monthly_emi: monthlyEmi,
      reason
    })

    if (onSave) onSave()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                New Salary Advance Request
              </h3>
              <p className="text-xs text-slate-500">
                Staff loan application with monthly recovery EMI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Employee <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-semibold transition-all appearance-none"
              >
                {activeStaff.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department} - {formatINR(emp.base_salary)}/mo)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advance Amount & EMI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Advance Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  min="500"
                  max={maxAdvance}
                  step="500"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Monthly Deduction (EMI) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  min="200"
                  max={amount}
                  step="250"
                  value={monthlyEmi}
                  onChange={(e) => setMonthlyEmi(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason for Advance
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Family medical emergency, festival expense..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
            />
          </div>

          {/* Rule banner */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <span className="text-base leading-none">💰</span>
            <div>
              <span className="font-bold">Monthly salary: {formatINR(monthlySalary)}</span>
              <span className="mx-1.5">—</span>
              <span>Max advance allowed: <strong>{formatINR(maxAdvance)}</strong></span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdvanceRequestModal
