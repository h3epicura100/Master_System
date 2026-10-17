import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  User,
  Shield,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  KeyRound,
  Phone,
  Lock,
  Sparkles,
  AlertCircle
} from 'lucide-react'

// Page Definitions for PMS module (24 total: 5 core, 17 departments, 2 master & logs)
export const PMS_PAGES = [
  // Core / Management
  { id: 'dashboard', name: 'H3MS Dashboard', route: '/pms/dashboard', desc: 'Active bookings pipeline & real-time delay tracking' },
  { id: 'bookings', name: 'Booking Master', route: '/pms/bookings', desc: 'Create, modify and manage event bookings' },
  { id: 'menuFinalize', name: 'Menu Finalize', route: '/pms/menu-finalize', desc: 'Customer menu finalization and decision logs' },
  { id: 'menuChatbot', name: 'Menu AI Chatbot', route: '/pms/menu-chatbot', desc: 'AI-assisted menu query assistant' },
  { id: 'whatsapp', name: 'WhatsApp Chat Hub', route: '/pms/whatsapp', desc: 'Interactive chat & department coordination' },
  
  // 17 Departments
  { id: 'chef', name: 'Kitchen Preparation', route: '/pms/kitchen-preparation', desc: 'Kitchen prep and chef task coordination' },
  { id: 'tagPrints', name: 'Tag Print', route: '/pms/tag-print', desc: 'Buffet & item display tag generation' },
  { id: 'dress', name: 'Dress Requirements', route: '/pms/dress', desc: 'Staff uniforms, theme and dress codes' },
  { id: 'decor', name: 'Decor List', route: '/pms/decor-list', desc: 'Setup, props, theme styling and decor checklist' },
  { id: 'crockery', name: 'Crockery List', route: '/pms/crockery-list', desc: 'Crockery items requirement for catering' },
  { id: 'kitchenRawMaterial', name: 'Menu Kitchen Requirement', route: '/pms/menu-kitchen-requirement', desc: 'Raw ingredients and kitchen supply checklist' },
  { id: 'vegetables', name: 'Vegetables', route: '/pms/vegetables', desc: 'Vegetables sourcing, procurement and quantities' },
  { id: 'cheeseDairy', name: 'Cheese & Dairy Products', route: '/pms/cheese-dairy-products', desc: 'Milk, cheese, butter and dairy procurement' },
  { id: 'vendorOrders', name: 'Vendor Coordination', route: '/pms/vendor-coordination', desc: 'External supplier order dispatch & tracking' },
  { id: 'bakery', name: 'Bakery', route: '/pms/bakery', desc: 'Breads, desserts and confectioneries' },
  { id: 'iceWaterRequirement', name: 'Ice & Water Requirement', route: '/pms/ice-water-requirement', desc: 'Ice blocks, cubes and packaged drinking water' },
  { id: 'loadingBoysAunties', name: 'Loading Boys & Aunties', route: '/pms/loading-boys-aunties', desc: 'Logistics, loaders and helper workforce' },
  { id: 'vehicleRequirement', name: 'Vehicle Requirement', route: '/pms/vehicle-requirement', desc: 'Transport logistics, trucks and vehicle allocation' },
  { id: 'gasCylinder', name: 'Gas Cylinder', route: '/pms/gas-cylinder', desc: 'Commercial cooking gas cylinders inventory' },
  { id: 'freshFlowers', name: 'Fresh Flowers', route: '/pms/fresh-flowers', desc: 'Floral decoration and fresh bouquet arrangements' },
  { id: 'waiters', name: 'Waiters', route: '/pms/waiters', desc: 'Service staff, captain and steward assignments' },
  { id: 'outsourcingTeam', name: 'Outsourcing Team Requirement', route: '/pms/outsourcing-team', desc: 'Third-party specialized staff and agencies' },
  
  // Masters & Delay Logs
  { id: 'masters', name: 'Master Data', route: '/pms/masters', desc: 'System configuration, items, units & categories' },
  { id: 'notifications', name: 'Delay & Notification Logs', route: '/pms/notifications', desc: 'System delay logs and automated WhatsApp alerts' },
]

// Page Definitions for Crockery IMS module (4 pages)
export const IMS_PAGES = [
  { id: 'dashboard', name: 'IMS Dashboard', route: '/crockery/dashboard', desc: 'Live inventory stock, status & daily overview' },
  { id: 'stock', name: 'Stock Transactions', route: '/crockery/stock', desc: 'Purchase & re-purchase entry with bills & images' },
  { id: 'inventory', name: 'Party Inventory & Issues', route: '/crockery/inventory', desc: 'Issue crockery, track party returns & damages' },
  { id: 'master', name: 'Item Master & Dropdowns', route: '/crockery/master', desc: 'Manage catalogue, rental prices & categories' },
]

// Page Definitions for HRMS module (7 pages)
export const HRMS_PAGES = [
  { id: 'attendance', name: 'Daily Attendance', route: '/hrms/attendance', desc: 'Real-time punch in/out, face photo capture with live GPS stamp' },
  { id: 'directory', name: 'Staff Directory', route: '/hrms/directory', desc: 'Registered staff profiles, salaries, designations & active status' },
  { id: 'performance', name: 'Performance & TAT', route: '/hrms/performance', desc: 'Employee turnaround times, shift hours, punctuality & consistency' },
  { id: 'advances', name: 'Salary Advances', route: '/hrms/advances', desc: 'Advance disbursement ledger, balance tracking & monthly deductions' },
  { id: 'approval', name: 'Advance Approval', route: '/hrms/approval', desc: 'Manager review & approval pipeline for staff salary loan requests' },
  { id: 'overtime', name: 'Overtime (OT)', route: '/hrms/overtime', desc: 'Extra work hours tracking, OT verification, approval & hourly pay' },
  { id: 'payroll', name: 'Monthly Payroll', route: '/hrms/payroll', desc: 'Attendance wage calculations, leave cuts, OT, EMIs & salary slips' },
]

export const TOTAL_PAGE_COUNT = PMS_PAGES.length + IMS_PAGES.length + HRMS_PAGES.length

export function UserModal({ isOpen, onClose, onSave, editingUser = null }) {
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'permissions'
  const [showPassword, setShowPassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'user',
    mobile_number: '',
    is_active: true,
    page_access: {
      pete: { access: false, role: 'user', pages: [] },
      ims: { access: false, role: 'user', full_access: false, pages: [] },
      pms: { access: false, role: 'staff', full_access: false, pages: [] },
      hrms: { access: false, role: 'staff', full_access: false, pages: [] },
    }
  })

  // Reset or initialize on modal open/edit
  useEffect(() => {
    if (editingUser) {
      const pAccess = editingUser.page_access || {}
      setFormData({
        username: editingUser.username || '',
        full_name: editingUser.full_name || '',
        password: '', // Blank by default on edit
        role: editingUser.role || 'user',
        mobile_number: editingUser.mobile_number || '',
        is_active: editingUser.is_active !== false,
        page_access: {
          pete: {
            access: pAccess.pete?.access || false,
            role: pAccess.pete?.role || 'user',
            pages: Array.isArray(pAccess.pete?.pages) ? pAccess.pete.pages : [],
          },
          ims: {
            access: pAccess.ims?.access || false,
            role: pAccess.ims?.role || 'user',
            full_access: pAccess.ims?.full_access || false,
            pages: Array.isArray(pAccess.ims?.pages) ? pAccess.ims.pages : [],
          },
          pms: {
            access: pAccess.pms?.access || false,
            role: pAccess.pms?.role || 'staff',
            full_access: pAccess.pms?.full_access || false,
            pages: Array.isArray(pAccess.pms?.pages) ? pAccess.pms.pages : [],
          },
          hrms: {
            access: pAccess.hrms?.access || false,
            role: pAccess.hrms?.role || 'staff',
            full_access: pAccess.hrms?.full_access || false,
            pages: Array.isArray(pAccess.hrms?.pages) ? pAccess.hrms.pages : [],
          },
        }
      })
    } else {
      setFormData({
        username: '',
        full_name: '',
        password: '',
        role: 'user',
        mobile_number: '',
        is_active: true,
        page_access: {
          pete: { access: false, role: 'user', pages: [] },
          ims: { access: false, role: 'user', full_access: false, pages: [] },
          pms: { access: false, role: 'staff', full_access: false, pages: [] },
          hrms: { access: false, role: 'staff', full_access: false, pages: [] },
        }
      })
    }
    setActiveTab('details')
    setErrorMsg('')
    setShowPassword(false)
    setSearchQuery('')
  }, [editingUser, isOpen])

  // Calculate total enabled pages across all active modules
  const totalEnabledPages = useMemo(() => {
    let count = 0
    const pa = formData.page_access

    if (pa.ims?.access) {
      if (pa.ims.full_access) {
        count += IMS_PAGES.length
      } else {
        count += (pa.ims.pages || []).length
      }
    }
    if (pa.pms?.access) {
      if (pa.pms.full_access) {
        count += PMS_PAGES.length
      } else {
        count += (pa.pms.pages || []).length
      }
    }
    if (pa.hrms?.access) {
      if (pa.hrms.full_access) {
        count += HRMS_PAGES.length
      } else {
        count += (pa.hrms.pages || []).length
      }
    }
    return count
  }, [formData.page_access])

  if (!isOpen) return null

  // Handlers for Details Tab
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'role' && value === 'admin') {
      setActiveTab('details')
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Handlers for Permissions
  const handleModuleAccessToggle = (moduleKey) => {
    setFormData((prev) => {
      const current = prev.page_access[moduleKey] || {}
      const newAccess = !current.access
      let newPages = current.pages || []

      // If turning on and pages are empty, default to all pages for convenience
      if (newAccess && (!newPages || newPages.length === 0)) {
        if (moduleKey === 'ims') newPages = IMS_PAGES.map((p) => p.id)
        if (moduleKey === 'pms') newPages = PMS_PAGES.map((p) => p.id)
        if (moduleKey === 'hrms') newPages = HRMS_PAGES.map((p) => p.id)
      }

      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          [moduleKey]: {
            ...current,
            access: newAccess,
            pages: newPages,
          },
        },
      }
    })
  }

  const handleModuleRoleChange = (moduleKey, roleValue) => {
    setFormData((prev) => ({
      ...prev,
      page_access: {
        ...prev.page_access,
        [moduleKey]: {
          ...prev.page_access[moduleKey],
          role: roleValue,
        },
      },
    }))
  }

  const handleImsFullAccessToggle = () => {
    setFormData((prev) => {
      const current = prev.page_access.ims || {}
      const newFullAccess = !current.full_access
      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          ims: {
            ...current,
            full_access: newFullAccess,
            pages: newFullAccess ? IMS_PAGES.map((p) => p.id) : current.pages,
          },
        },
      }
    })
  }

  const handlePmsFullAccessToggle = () => {
    setFormData((prev) => {
      const current = prev.page_access.pms || {}
      const newFullAccess = !current.full_access
      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          pms: {
            ...current,
            full_access: newFullAccess,
            pages: newFullAccess ? PMS_PAGES.map((p) => p.id) : current.pages,
          },
        },
      }
    })
  }

  const handleHrmsFullAccessToggle = () => {
    setFormData((prev) => {
      const current = prev.page_access.hrms || {}
      const newFullAccess = !current.full_access
      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          hrms: {
            ...current,
            full_access: newFullAccess,
            pages: newFullAccess ? HRMS_PAGES.map((p) => p.id) : current.pages,
          },
        },
      }
    })
  }

  const handlePageToggle = (moduleKey, pageId) => {
    setFormData((prev) => {
      const currentModule = prev.page_access[moduleKey] || { access: true, pages: [] }
      const currentPages = currentModule.pages || []
      const exists = currentPages.includes(pageId)

      const newPages = exists
        ? currentPages.filter((id) => id !== pageId)
        : [...currentPages, pageId]

      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          [moduleKey]: {
            ...currentModule,
            access: newPages.length > 0 ? true : currentModule.access,
            pages: newPages,
          },
        },
      }
    })
  }

  const handleSelectAllInModule = (moduleKey) => {
    let allPageIds = []
    if (moduleKey === 'ims') allPageIds = IMS_PAGES.map((p) => p.id)
    if (moduleKey === 'pms') allPageIds = PMS_PAGES.map((p) => p.id)
    if (moduleKey === 'hrms') allPageIds = HRMS_PAGES.map((p) => p.id)

    setFormData((prev) => {
      const currentModule = prev.page_access[moduleKey] || {}
      const allSelected = allPageIds.every((id) => (currentModule.pages || []).includes(id))

      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          [moduleKey]: {
            ...currentModule,
            access: !allSelected ? true : currentModule.access,
            pages: allSelected ? [] : allPageIds,
          },
        },
      }
    })
  }

  const handleGrantAll = () => {
    setFormData((prev) => ({
      ...prev,
      page_access: {
        ...prev.page_access,
        ims: { access: true, role: 'admin', full_access: true, pages: IMS_PAGES.map((p) => p.id) },
        pms: { access: true, role: 'admin', full_access: true, pages: PMS_PAGES.map((p) => p.id) },
        hrms: { access: true, role: 'admin', full_access: true, pages: HRMS_PAGES.map((p) => p.id) },
      },
    }))
  }

  const handleRevokeAll = () => {
    setFormData((prev) => ({
      ...prev,
      page_access: {
        ...prev.page_access,
        ims: { access: false, role: 'user', full_access: false, pages: [] },
        pms: { access: false, role: 'staff', full_access: false, pages: [] },
        hrms: { access: false, role: 'staff', full_access: false, pages: [] },
      },
    }))
  }

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.full_name?.trim()) {
      setErrorMsg('Full Name is required.')
      setActiveTab('details')
      return
    }

    if (!formData.username?.trim()) {
      setErrorMsg('Username is required.')
      setActiveTab('details')
      return
    }

    if (!editingUser && !formData.password?.trim()) {
      setErrorMsg('Password is required for new users.')
      setActiveTab('details')
      return
    }

    setSaving(true)
    try {
      const isAdmin = formData.role === 'admin'

      const pageAccessPayload = isAdmin
        ? {
            ims: {
              access: true,
              role: 'admin',
              full_access: true,
              pages: IMS_PAGES.map((p) => p.id),
            },
            pms: {
              access: true,
              role: 'admin',
              full_access: true,
              pages: PMS_PAGES.map((p) => p.id),
            },
            hrms: {
              access: true,
              role: 'admin',
              full_access: true,
              pages: HRMS_PAGES.map((p) => p.id),
            },
          }
        : formData.page_access

      const payload = {
        username: formData.username.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        role: formData.role,
        mobile_number: formData.mobile_number?.trim() || '',
        is_active: formData.is_active,
        page_access: pageAccessPayload,
      }

      if (formData.password?.trim()) {
        payload.password = formData.password.trim()
      }

      const res = await onSave(payload, editingUser?.id)
      if (res?.success) {
        onClose()
      } else {
        setErrorMsg(res?.error || 'Failed to save user.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  // Filter pages for permissions search
  const filterPages = (pages) => {
    if (!searchQuery.trim()) return pages
    const q = searchQuery.toLowerCase()
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.route.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q)
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
                {editingUser ? 'Edit Master User' : 'Create New User'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                {editingUser
                  ? `Update credentials and system access for @${editingUser.username}`
                  : 'Add a new member to H3 Master System and configure permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-200 bg-white overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'details'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>User Details</span>
            {formData.role === 'admin' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 ml-1">
                Full Access (Admin)
              </span>
            )}
          </button>

          {formData.role !== 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'permissions'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Page Permissions</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-violet-100 text-violet-700">
                {totalEnabledPages}/{TOTAL_PAGE_COUNT}
              </span>
            </button>
          )}
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* TAB 1: USER DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">@</span>
                    <input
                      type="text"
                      name="username"
                      required
                      disabled={!!editingUser}
                      placeholder="e.g. ramesh_c"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        editingUser
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600'
                      }`}
                    />
                  </div>
                  {editingUser && (
                    <p className="text-[11px] text-slate-400 mt-1">Username cannot be changed after creation.</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password {!editingUser && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder={editingUser ? 'Leave blank to keep current' : 'Enter login password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Mobile / WhatsApp Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number (WhatsApp)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="mobile_number"
                      placeholder="e.g. 9876543210"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Master System Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Master Role
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all appearance-none"
                    >
                      <option value="user">User (Standard Access)</option>
                      <option value="admin">Admin (Full System & User Management)</option>
                    </select>
                  </div>
                  {formData.role === 'admin' ? (
                    <div className="mt-2.5 p-3 rounded-xl bg-violet-50/80 border border-violet-200/80 flex items-start gap-2.5 text-xs text-violet-900 animate-in fade-in duration-200">
                      <Shield className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-violet-950 block">Full Administrator Access Granted</span>
                        <p className="text-violet-700 text-[11px] mt-0.5 leading-relaxed">
                          Admins automatically receive unrestricted access to all current and future modules (<strong>H3MS</strong>, <strong>Crockery IMS</strong> & <strong>HRMS</strong>) and all {TOTAL_PAGE_COUNT} pages. Page permission configuration is not required.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Admins get unrestricted access. Standard users require page permissions configuration.
                    </p>
                  )}
                </div>

                {/* Account Status Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-semibold text-slate-700">
                      {formData.is_active ? (
                        <span className="text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Active Account
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> Inactive (Login Blocked)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAGE PERMISSIONS */}
          {activeTab === 'permissions' && formData.role !== 'admin' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Permission Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search pages or routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGrantAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Revoke All
                  </button>
                </div>
              </div>

              {/* H3MS MODULE */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
                {/* Section Header */}
                <div className="p-4 bg-amber-50/60 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleModuleAccessToggle('pms')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.page_access.pms?.access ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.page_access.pms?.access ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">H3MS System</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                          Production & Catering
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">17 Departments, Menu Finalize, Bookings, AI Chatbot & Delay Logs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Full Access Switch */}
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!formData.page_access.pms?.access}
                        checked={formData.page_access.pms?.full_access || false}
                        onChange={handlePmsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Full Access</span>
                    </label>

                    {/* Role Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span>Role:</span>
                      <select
                        disabled={!formData.page_access.pms?.access}
                        value={formData.page_access.pms?.role || 'staff'}
                        onChange={(e) => handleModuleRoleChange('pms', e.target.value)}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="chef">Chef</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!formData.page_access.pms?.access || formData.page_access.pms?.full_access}
                      onClick={() => handleSelectAllInModule('pms')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 disabled:text-slate-300 transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white max-h-72 overflow-y-auto">
                  {filterPages(PMS_PAGES).map((page) => {
                    const isChecked =
                      formData.page_access.pms?.access &&
                      (formData.page_access.pms?.full_access ||
                        (formData.page_access.pms?.pages || []).includes(page.id))

                    return (
                      <label
                        key={page.id}
                        className={`flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          !formData.page_access.pms?.access ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={formData.page_access.pms?.full_access}
                            checked={isChecked}
                            onChange={() => handlePageToggle('pms', page.id)}
                            className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 disabled:opacity-50"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">{page.name}</span>
                            <span className="text-[11px] text-slate-400 block">{page.desc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">{page.route}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isChecked
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isChecked ? 'Granted' : 'Restricted'}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* CROCKERY IMS MODULE */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
                {/* Section Header */}
                <div className="p-4 bg-violet-50/50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleModuleAccessToggle('ims')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.page_access.ims?.access ? 'bg-violet-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.page_access.ims?.access ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">Crockery & Cutlery IMS</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800">
                          Inventory & Ware
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Stock purchases, party issues, returns & damages</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Full Access Switch */}
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!formData.page_access.ims?.access}
                        checked={formData.page_access.ims?.full_access || false}
                        onChange={handleImsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>Full Access</span>
                    </label>

                    {/* Role Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span>Role:</span>
                      <select
                        disabled={!formData.page_access.ims?.access}
                        value={formData.page_access.ims?.role || 'user'}
                        onChange={(e) => handleModuleRoleChange('ims', e.target.value)}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!formData.page_access.ims?.access || formData.page_access.ims?.full_access}
                      onClick={() => handleSelectAllInModule('ims')}
                      className="text-xs font-bold text-violet-700 hover:text-violet-800 disabled:text-slate-300 transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white">
                  {filterPages(IMS_PAGES).map((page) => {
                    const isChecked =
                      formData.page_access.ims?.access &&
                      (formData.page_access.ims?.full_access ||
                        (formData.page_access.ims?.pages || []).includes(page.id))

                    return (
                      <label
                        key={page.id}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          !formData.page_access.ims?.access ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={formData.page_access.ims?.full_access}
                            checked={isChecked}
                            onChange={() => handlePageToggle('ims', page.id)}
                            className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 disabled:opacity-50"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">{page.name}</span>
                            <span className="text-[11px] text-slate-400 block">{page.desc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">{page.route}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isChecked
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isChecked ? 'Granted' : 'Restricted'}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* HRMS MODULE */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
                {/* Section Header */}
                <div className="p-4 bg-rose-50/50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleModuleAccessToggle('hrms')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData.page_access.hrms?.access ? 'bg-rose-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.page_access.hrms?.access ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">HRMS System</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
                          Staff & Operations
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Daily Attendance, Directory, Performance TAT, Advances & Payroll</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!formData.page_access.hrms?.access}
                        checked={formData.page_access.hrms?.full_access || false}
                        onChange={handleHrmsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Full Access</span>
                    </label>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span>Role:</span>
                      <select
                        disabled={!formData.page_access.hrms?.access}
                        value={formData.page_access.hrms?.role || 'staff'}
                        onChange={(e) => handleModuleRoleChange('hrms', e.target.value)}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!formData.page_access.hrms?.access || formData.page_access.hrms?.full_access}
                      onClick={() => handleSelectAllInModule('hrms')}
                      className="text-xs font-bold text-rose-700 hover:text-rose-800 disabled:text-slate-300 transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white">
                  {filterPages(HRMS_PAGES).map((page) => {
                    const isChecked =
                      formData.page_access.hrms?.access &&
                      (formData.page_access.hrms?.full_access ||
                        (formData.page_access.hrms?.pages || []).includes(page.id))

                    return (
                      <label
                        key={page.id}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          !formData.page_access.hrms?.access ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={formData.page_access.hrms?.full_access}
                            checked={isChecked}
                            onChange={() => handlePageToggle('hrms', page.id)}
                            className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 disabled:opacity-50"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">{page.name}</span>
                            <span className="text-[11px] text-slate-400 block">{page.desc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">{page.route}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isChecked
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isChecked ? 'Granted' : 'Restricted'}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? 'Update User' : 'Create User'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserModal
