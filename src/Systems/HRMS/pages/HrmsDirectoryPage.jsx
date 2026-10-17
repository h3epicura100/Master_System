import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Layers,
  CreditCard,
  Banknote,
  Search,
  Plus,
  Phone,
  Edit2,
  Trash2
} from 'lucide-react'
import { EmployeeModal } from '../components/EmployeeModal'
import { staffStorageService } from '../services/hrmsStorageService'
import { formatINR } from '../services/hrmsCalculations'

export function HrmsDirectoryPage() {
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)

  const refreshData = () => {
    setStaff(staffStorageService.getStaff())
  }

  useEffect(() => {
    refreshData()
  }, [])

  const departments = useMemo(() => {
    const depts = new Set(staff.map((s) => s.department).filter(Boolean))
    return ['All Departments', ...Array.from(depts)]
  }, [staff])

  const filteredStaff = useMemo(() => {
    return staff.filter((emp) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = emp.name.toLowerCase().includes(q)
        const matchesDesig = emp.designation?.toLowerCase().includes(q)
        const matchesMobile = emp.mobile?.includes(q)
        if (!matchesName && !matchesDesig && !matchesMobile) return false
      }
      if (selectedDept !== 'All Departments' && emp.department !== selectedDept) return false
      return true
    })
  }, [staff, search, selectedDept])

  // KPIs
  const totalCount = staff.length
  const uniqueDeptCount = Math.max(0, departments.length - 1)
  const totalBaseSalary = staff.reduce((acc, s) => acc + (Number(s.base_salary) || 0), 0)
  const avgBaseSalary = totalCount > 0 ? Math.round(totalBaseSalary / totalCount) : 0

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete staff member ${name}? This action cannot be undone.`)) {
      staffStorageService.deleteEmployee(id)
      refreshData()
    }
  }

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
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Staff</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Registered employees</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Departments</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1 block">{uniqueDeptCount}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Functional teams</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Base</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">{formatINR(totalBaseSalary)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Base wages per month</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Monthly</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">{formatINR(avgBaseSalary)}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Mean wage per member</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
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
              placeholder="Search by name, designation, mobile..."
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

        <button
          onClick={() => {
            setEditingEmp(null)
            setModalOpen(true)
          }}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Employee</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Base Salary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No staff members found</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((emp) => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name */}
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
                              Joined: {emp.join_date || '2025-01-01'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {emp.mobile}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                          {emp.department}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">
                        {emp.designation}
                      </td>

                      {/* Salary */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900 text-sm">
                        {formatINR(emp.base_salary)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingEmp(emp)
                              setModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={refreshData}
        editingEmployee={editingEmp}
      />
    </div>
  )
}

export default HrmsDirectoryPage
