import React, { useState, useEffect } from 'react'
import {
  X,
  CreditCard,
  User,
  AlertCircle,
  Check,
  CalendarClock
} from 'lucide-react'
import { hrmsService } from '../services/hrmsService'
import { formatINR } from '../services/hrmsCalculations'
import { useAuth } from '../../../context/AuthContext'

// Quick EMI options: recover the advance over this many months
const RECOVERY_MONTHS = [1, 2, 3, 4, 6]

// Keep only digits so the field accepts any whole-rupee amount (no browser step warnings)
const toDigits = (value) => value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 7)

export function AdvanceRequestModal({ isOpen, onClose, onSave, staff = [] }) {
  const { currentUser, isAdmin, getModuleRole } = useAuth()
  const isUserAdmin = isAdmin() || getModuleRole('hrms') === 'admin'
  const activeStaff = staff

  const [employeeId, setEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [emiInput, setEmiInput] = useState('')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [touched, setTouched] = useState({ amount: false, emi: false })

  // Default the selection once staff has loaded / the modal opens
  useEffect(() => {
    if (isOpen && !activeStaff.some((s) => s.id === employeeId)) {
      setEmployeeId(activeStaff[0]?.id || currentUser?.id || '')
    }
  }, [isOpen, activeStaff, employeeId, currentUser])

  // Start each request with a clean form
  useEffect(() => {
    if (isOpen) {
      setAmountInput('')
      setEmiInput('')
      setReason('')
      setErrorMsg('')
      setTouched({ amount: false, emi: false })
    }
  }, [isOpen])

  const selectedEmp = staff.find((s) => s.id === employeeId)
  const monthlySalary = selectedEmp ? Number(selectedEmp.base_salary) || 0 : 0
  const maxAdvance = monthlySalary

  const amount = Number(amountInput) || 0
  const emi = Number(emiInput) || 0

  const amountError = !employeeId
    ? ''
    : monthlySalary <= 0
    ? 'This employee has no monthly salary set. Add it in Global Settings first.'
    : !amountInput
    ? 'Enter the advance amount.'
    : amount > maxAdvance
    ? `Cannot be more than one month's salary (${formatINR(maxAdvance)}).`
    : ''

  const emiError = !emiInput
    ? 'Enter how much to deduct each month.'
    : amount > 0 && emi > amount
    ? `Cannot be more than the advance (${formatINR(amount)}).`
    : ''

  const months = amount > 0 && emi > 0 && emi <= amount ? Math.ceil(amount / emi) : 0
  const lastInstalment = months > 1 ? amount - emi * (months - 1) : 0
  const isValid = Boolean(employeeId) && !amountError && !emiError

  const setRecoveryMonths = (n) => {
    if (!amount) return
    setEmiInput(String(Math.ceil(amount / n)))
    setTouched((t) => ({ ...t, emi: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setErrorMsg('')
    setTouched({ amount: true, emi: true })
    if (!employeeId) {
      setErrorMsg('Please select an employee.')
      return
    }
    if (!isValid) return

    setSaving(true)
    try {
      await hrmsService.requestAdvance({
        employee_id: employeeId,
        amount,
        monthly_emi: emi,
        reason
      })
      if (onSave) onSave()
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit advance request.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const inputCls = (hasError) =>
    `w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-500'
        : 'border-slate-200 focus:ring-violet-500/20 focus:border-violet-600'
    }`
  const showAmountError = touched.amount && amountError
  const showEmiError = touched.emi && emiError

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] sm:max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                New Salary Advance Request
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Staff loan with monthly salary deduction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* noValidate: we show our own friendly messages instead of browser pop-ups */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Employee Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  disabled={!isUserAdmin}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold transition-all appearance-none ${
                    !isUserAdmin ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600'
                  }`}
                >
                  {activeStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} - {formatINR(emp.base_salary)}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Monthly salary <strong className="text-slate-700">{formatINR(monthlySalary)}</strong>
                <span className="mx-1">·</span>
                Max advance <strong className="text-slate-700">{formatINR(maxAdvance)}</strong>
              </p>
            </div>

            {/* Advance Amount & EMI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label htmlFor="adv-amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Advance Amount <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    id="adv-amount"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="e.g. 5000"
                    value={amountInput}
                    onChange={(e) => setAmountInput(toDigits(e.target.value))}
                    onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                    className={inputCls(showAmountError)}
                  />
                </div>
                {showAmountError ? (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">{amountError}</p>
                ) : amount > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-500">{formatINR(amount)}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="adv-emi" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monthly Deduction (EMI) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    id="adv-emi"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="e.g. 1000"
                    value={emiInput}
                    onChange={(e) => setEmiInput(toDigits(e.target.value))}
                    onBlur={() => setTouched((t) => ({ ...t, emi: true }))}
                    className={inputCls(showEmiError)}
                  />
                </div>
                {showEmiError ? (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">{emiError}</p>
                ) : emi > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-500">{formatINR(emi)} per month</p>
                ) : null}
              </div>
            </div>

            {/* Quick EMI: recover over N months */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick EMI — recover in
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RECOVERY_MONTHS.map((n) => {
                  const active = amount > 0 && emi === Math.ceil(amount / n)
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={!amount}
                      onClick={() => setRecoveryMonths(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        active
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                      }`}
                    >
                      {n} {n === 1 ? 'month' : 'months'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Live recovery summary */}
            {months > 0 && !amountError && (
              <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-200/80 text-xs text-violet-950 flex items-start gap-2">
                <CalendarClock className="w-4 h-4 shrink-0 text-violet-600 mt-0.5" />
                <span>
                  {formatINR(amount)} will be recovered in <strong>{months} {months === 1 ? 'month' : 'months'}</strong>
                  {' '}at {formatINR(emi)}/month
                  {lastInstalment > 0 && lastInstalment !== emi && (
                    <> (last instalment {formatINR(lastInstalment)})</>
                  )}
                  , deducted from salary after approval.
                </span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="adv-reason" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Advance
              </label>
              <textarea
                id="adv-reason"
                rows={3}
                placeholder="e.g. Family medical emergency, festival expense..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
              />
            </div>
          </div>

          {/* Footer Actions (outside the scroller so it never covers content) */}
          <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdvanceRequestModal
