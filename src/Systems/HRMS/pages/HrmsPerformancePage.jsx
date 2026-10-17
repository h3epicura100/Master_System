import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
  Search,
  Filter,
  Star,
  Users,
  Zap
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'

export function HrmsPerformancePage() {
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')

  useEffect(() => {
    setStaff(staffStorageService.getStaff())
  }, [])

  const departments = useMemo(() => {
    const depts = new Set(staff.map((s) => s.department).filter(Boolean))
    return ['All Departments', ...Array.from(depts)]
  }, [staff])

  // Calculated Mock Performance Metrics for Staff
  const performanceRecords = useMemo(() => {
    return staff.map((emp, index) => {
      // Deterministic realistic numbers based on employee
      const punctualityScore = 90 + ((index * 3) % 9)
      const avgHours = (8.0 + ((index * 0.4) % 1.5)).toFixed(1)
      const otHours = ((index * 2.8) % 12).toFixed(1)
      const tatIndex = (92 + ((index * 2) % 8)).toFixed(0)
      const rating = punctualityScore >= 96 ? 'Exceptional' : punctualityScore >= 92 ? 'High Performer' : 'Standard'

      return {
        emp,
        punctualityScore,
        avgHours,
        otHours,
        tatIndex,
        rating
      }
    }).filter(({ emp }) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = emp.name.toLowerCase().includes(q)
        const matchDesig = emp.designation?.toLowerCase().includes(q)
        if (!matchName && !matchDesig) return false
      }
      if (selectedDept !== 'All Departments' && emp.department !== selectedDept) return false
      return true
    })
  }, [staff, search, selectedDept])

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
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Working Hours</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">8.4 hrs</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Daily per staff member</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Punctuality</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">94.8%</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Morning shift adherence</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Turnaround Time (TAT)</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">96.2%</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Task execution index</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">High Performers</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-violet-600 mt-1 block">11 / 14</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Rating ≥ 92%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
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
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Performance Analytics Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Daily Avg Hours</th>
                <th className="py-3 px-4">Punctuality Score</th>
                <th className="py-3 px-4">TAT Compliance</th>
                <th className="py-3 px-4">OT Contribution</th>
                <th className="py-3 px-4 text-right">Performance Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {performanceRecords.map(({ emp, punctualityScore, avgHours, otHours, tatIndex, rating }) => {
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {emp.designation}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                        {emp.department}
                      </span>
                    </td>

                    {/* Daily Avg Hours */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                      {avgHours} hrs / day
                    </td>

                    {/* Punctuality Score */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${punctualityScore}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-900">{punctualityScore}%</span>
                      </div>
                    </td>

                    {/* TAT Compliance */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-violet-600 rounded-full"
                            style={{ width: `${tatIndex}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-900">{tatIndex}%</span>
                      </div>
                    </td>

                    {/* OT Hours */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {otHours} hrs
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          rating === 'Exceptional'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : rating === 'High Performer'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        {rating}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HrmsPerformancePage
