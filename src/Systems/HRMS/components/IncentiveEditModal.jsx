import React, { useState, useEffect } from 'react'
import { X, Sparkles, Check } from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR } from '../services/hrmsCalculations'

export function IncentiveEditModal({ isOpen, onClose, employee, currentAmount = 0, onSave }) {
  const [amount, setAmount] = useState(currentAmount)

  useEffect(() => {
    if (isOpen) {
      setAmount(currentAmount || 0)
    }
  }, [isOpen, currentAmount])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!employee) return
    staffStorageService.setEmployeeIncentive(employee.id, amount)
    if (onSave) onSave()
    onClose()
  }

  if (!isOpen || !employee) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Sales Incentive
              </h3>
              <p className="text-[11px] text-slate-500">{employee.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Incentive Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="250"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Base salary: {formatINR(employee.base_salary)}/mo
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Incentive</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IncentiveEditModal
