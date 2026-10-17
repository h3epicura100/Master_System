import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  CheckSquare,
  Clock,
  Banknote,
  RotateCcw
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'

export function HrmsSubNav({ onDataReset }) {
  // Check pending counts for badges
  const advances = staffStorageService.getAdvances()
  const pendingAdvances = advances.filter((a) => a.status === 'Pending').length

  const overtime = staffStorageService.getOvertime()
  const pendingOt = overtime.filter((o) => o.status === 'Pending').length

  const tabs = [
    { name: 'Staff Directory', path: '/hrms/directory', icon: Users },
    { name: 'Daily Attendance', path: '/hrms/attendance', icon: CalendarCheck },
    { name: 'Performance & TAT', path: '/hrms/performance', icon: TrendingUp },
    { name: 'Salary Advances', path: '/hrms/advances', icon: CreditCard },
    {
      name: 'Advance Approval',
      path: '/hrms/approval',
      icon: CheckSquare,
      badge: pendingAdvances > 0 ? pendingAdvances : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'Overtime (OT)',
      path: '/hrms/overtime',
      icon: Clock,
      badge: pendingOt > 0 ? pendingOt : null,
      badgeColor: 'bg-violet-100 text-violet-700'
    },
    { name: 'Monthly Payroll', path: '/hrms/payroll', icon: Banknote },
  ]

  const handleReset = () => {
    if (window.confirm('Reset HRMS demo data to initial sample staff, attendance & payroll records?')) {
      staffStorageService.resetAll()
      if (onDataReset) onDataReset()
      else window.location.reload()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.name}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white/20 text-white' : tab.badgeColor
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>

      <button
        onClick={handleReset}
        title="Reset demo data to default sample records"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-violet-700 hover:bg-violet-50 hover:border-violet-200 transition-colors shrink-0"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Reset Demo Data</span>
      </button>
    </div>
  )
}

export default HrmsSubNav
