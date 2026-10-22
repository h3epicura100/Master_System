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
  PhoneCall,
  Lock,
  Sparkles,
  AlertCircle,
  Calendar,
  CreditCard,
  Upload,
  FileCheck,
  Briefcase,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { authService } from '../../services/authService'
import { timestamptzToDate } from '../../Systems/HRMS/services/hrmsCalculations'

export const HRMS_DEPARTMENTS = [
  'WORKER',
  'KITCHEN',
  'LOGISTICS',
  'SERVICE / WAITERS',
  'MANAGEMENT',
  'PPF',
  'SALES',
  'HOUSEKEEPING',
]

export const HRMS_DESIGNATIONS = [
  'Staff Worker',
  'Head Chef',
  'Cook / Chef Helper',
  'Transport Driver',
  'Staff Attendant',
  'Floor Manager',
  'Executive Assistant',
  'General Helper',
  'Other',
]

function FileUploadField({ label, fieldName, fileData, fileName, onFileSelect, onFileRemove, isUploading = false }) {
  const inputId = `file-input-${fieldName}`
  const isImage = fileData && typeof fileData === 'string' && (
    fileData.startsWith('data:image') || 
    fileData.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || 
    fileData.includes('aadhar-attachments')
  )
  const isUrl = fileData && typeof fileData === 'string' && fileData.startsWith('http')

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-600 transition-all">
        <label
          htmlFor={inputId}
          className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 ${
            isUploading
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-700'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>{fileName ? 'Change' : 'Upload File'}</span>
            </>
          )}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => onFileSelect(e, fieldName)}
        />

        {fileName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isImage && (
              <img
                src={fileData}
                alt="preview"
                className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {isUrl ? (
              <a
                href={fileData}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-700 hover:text-violet-900 font-semibold truncate flex-1 min-w-0 inline-flex items-center gap-1 hover:underline"
                title="Click to view file in new tab"
              >
                <span className="truncate">{fileName}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              </a>
            ) : (
              <span className="text-xs text-slate-800 font-semibold truncate flex-1 min-w-0" title={fileName}>
                {fileName}
              </span>
            )}
            <button
              type="button"
              onClick={() => onFileRemove(fieldName)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 truncate flex-1 min-w-0 font-medium">
            No file chosen
          </span>
        )}
      </div>
    </div>
  )
}

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
  { id: 'mis', name: 'Employee MIS & Performance', route: '/pms/mis', desc: 'Staff task scorecard, department workload & overdue escalations' },
]

// Page Definitions for Crockery IMS module (4 pages)
export const IMS_PAGES = [
  { id: 'dashboard', name: 'IMS Dashboard', route: '/crockery/dashboard', desc: 'Live inventory stock, status & daily overview' },
  { id: 'stock', name: 'Stock Transactions', route: '/crockery/stock', desc: 'Purchase & re-purchase entry with bills & images' },
  { id: 'inventory', name: 'Party Inventory & Issues', route: '/crockery/inventory', desc: 'Issue crockery, track party returns & damages' },
  { id: 'master', name: 'Item Master & Dropdowns', route: '/crockery/master', desc: 'Manage catalogue, rental prices & categories' },
]

// Page Definitions for HRMS module (5 pages)
export const HRMS_PAGES = [
  { id: 'attendance', name: 'Daily Attendance', route: '/hrms/attendance', desc: 'Real-time punch in/out, face photo capture with live GPS stamp' },
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
  const [uploadingFile, setUploadingFile] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'staff',
    mobile_number: '',
    is_active: true,
    // HRMS Staff Profile & Document Fields
    join_date: new Date().toISOString().split('T')[0],
    base_salary: '',
    department: 'WORKER',
    designation: 'Staff Worker',
    custom_designation: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    aadhar_number: '',
    aadhar_attachment: '',
    aadhar_attachment_name: '',
    aadhar_address: '',
    current_address: '',
    page_access: {
      pete: { access: false, role: 'staff', pages: [] },
      ims: { access: false, role: 'staff', full_access: false, pages: [] },
      pms: { access: false, role: 'staff', full_access: false, pages: [] },
      hrms: { access: false, role: 'staff', full_access: false, pages: [] },
    }
  })

  // Reset or initialize on modal open/edit
  useEffect(() => {
    if (editingUser) {
      const pAccess = editingUser.page_access || {}
      const profile = pAccess.staff_profile || pAccess.hrms?.staff_profile || {}
      const userRole = editingUser.role === 'admin' ? 'admin' : 'staff'
      const rawDesignation = editingUser.designation || profile.designation
      const isKnownDesignation = HRMS_DESIGNATIONS.includes(rawDesignation)
      const designationVal = rawDesignation
        ? (isKnownDesignation ? rawDesignation : 'Other')
        : (userRole === 'admin' ? 'Floor Manager' : 'Staff Worker')
      const customDesigVal = isKnownDesignation
        ? (editingUser.custom_designation || profile.custom_designation || '')
        : (rawDesignation || '')

      setFormData({
        username: editingUser.username || '',
        full_name: editingUser.full_name || '',
        password: '', // Blank by default on edit
        role: userRole,
        mobile_number: editingUser.mobile_number || '',
        is_active: editingUser.is_active !== false,
        join_date: timestamptzToDate(editingUser.join_date || profile.join_date) || (editingUser.created_at ? timestamptzToDate(editingUser.created_at) : ''),
        base_salary: (editingUser.base_salary !== undefined && editingUser.base_salary !== null)
          ? editingUser.base_salary
          : (profile.base_salary !== undefined && profile.base_salary !== null ? profile.base_salary : ''),
        department: editingUser.department || profile.department || 'WORKER',
        designation: designationVal,
        custom_designation: customDesigVal,
        emergency_contact_name: editingUser.emergency_contact_name || profile.emergency_contact_name || '',
        emergency_contact_phone: editingUser.emergency_contact_phone || profile.emergency_contact_phone || '',
        aadhar_number: editingUser.aadhar_number || profile.aadhar_number || '',
        aadhar_attachment: editingUser.aadhar_attachment || profile.aadhar_attachment || '',
        aadhar_attachment_name: editingUser.aadhar_attachment_name || profile.aadhar_attachment_name || '',
        aadhar_address: editingUser.aadhar_address || profile.aadhar_address || '',
        current_address: editingUser.current_address || profile.current_address || '',
        page_access: {
          pete: {
            access: pAccess.pete?.access || false,
            role: userRole,
            pages: Array.isArray(pAccess.pete?.pages) ? pAccess.pete.pages : [],
          },
          ims: {
            access: pAccess.ims?.access || false,
            role: userRole,
            full_access: pAccess.ims?.full_access || false,
            pages: Array.isArray(pAccess.ims?.pages) ? pAccess.ims.pages : [],
          },
          pms: {
            access: pAccess.pms?.access || false,
            role: userRole,
            full_access: pAccess.pms?.full_access || false,
            pages: Array.isArray(pAccess.pms?.pages) ? pAccess.pms.pages : [],
          },
          hrms: {
            access: pAccess.hrms?.access || false,
            role: userRole,
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
        role: 'staff',
        mobile_number: '',
        is_active: true,
        join_date: new Date().toISOString().split('T')[0],
        base_salary: '',
        department: 'WORKER',
        designation: 'Staff Worker',
        custom_designation: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        aadhar_number: '',
        aadhar_attachment: '',
        aadhar_attachment_name: '',
        aadhar_address: '',
        current_address: '',
        page_access: {
          pete: { access: false, role: 'staff', pages: [] },
          ims: { access: false, role: 'staff', full_access: false, pages: [] },
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

    if (pa.ims?.full_access) {
      count += IMS_PAGES.length
    } else {
      count += (pa.ims?.pages || []).length
    }

    if (pa.pms?.full_access) {
      count += PMS_PAGES.length
    } else {
      count += (pa.pms?.pages || []).length
    }

    if (pa.hrms?.full_access) {
      count += HRMS_PAGES.length
    } else {
      count += (pa.hrms?.pages || []).length
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

  const handleFileSelect = async (e, fieldName) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit.')
      return
    }

    setUploadingFile(true)
    setErrorMsg('')

    try {
      const uploadRes = await authService.uploadAadharAttachment(file, formData.username || 'staff')
      if (uploadRes?.success && uploadRes.publicUrl) {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: uploadRes.publicUrl,
          [`${fieldName}_name`]: uploadRes.fileName,
        }))
      } else {
        // Fallback to local Base64 Data URL if storage bucket is not configured yet
        const reader = new FileReader()
        reader.onload = () => {
          setFormData((prev) => ({
            ...prev,
            [fieldName]: reader.result,
            [`${fieldName}_name`]: file.name,
          }))
        }
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: reader.result,
          [`${fieldName}_name`]: file.name,
        }))
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFileRemove = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: '',
      [`${fieldName}_name`]: '',
    }))
  }

  const handleCopyAadharAddress = () => {
    if (formData.aadhar_address) {
      setFormData((prev) => ({
        ...prev,
        current_address: prev.aadhar_address,
      }))
    }
  }

  // Handlers for Permissions
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
            access: newFullAccess,
            full_access: newFullAccess,
            pages: newFullAccess ? IMS_PAGES.map((p) => p.id) : [],
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
            access: newFullAccess,
            full_access: newFullAccess,
            pages: newFullAccess ? PMS_PAGES.map((p) => p.id) : [],
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
            access: newFullAccess,
            full_access: newFullAccess,
            pages: newFullAccess ? HRMS_PAGES.map((p) => p.id) : [],
          },
        },
      }
    })
  }

  const handlePageToggle = (moduleKey, pageId) => {
    setFormData((prev) => {
      const currentModule = prev.page_access[moduleKey] || {}
      let currentPages = currentModule.pages || []

      // If currently in full_access mode, start from all pages
      if (currentModule.full_access) {
        if (moduleKey === 'ims') currentPages = IMS_PAGES.map((p) => p.id)
        if (moduleKey === 'pms') currentPages = PMS_PAGES.map((p) => p.id)
        if (moduleKey === 'hrms') currentPages = HRMS_PAGES.map((p) => p.id)
      }

      const exists = currentPages.includes(pageId)
      const newPages = exists
        ? currentPages.filter((id) => id !== pageId)
        : [...currentPages, pageId]

      let totalPagesInModule = 0
      if (moduleKey === 'ims') totalPagesInModule = IMS_PAGES.length
      if (moduleKey === 'pms') totalPagesInModule = PMS_PAGES.length
      if (moduleKey === 'hrms') totalPagesInModule = HRMS_PAGES.length

      const isAllSelected = newPages.length === totalPagesInModule

      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          [moduleKey]: {
            ...currentModule,
            access: newPages.length > 0,
            full_access: isAllSelected,
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
      const currentPages = currentModule.full_access ? allPageIds : (currentModule.pages || [])
      const allSelected = allPageIds.length > 0 && allPageIds.every((id) => currentPages.includes(id))

      return {
        ...prev,
        page_access: {
          ...prev.page_access,
          [moduleKey]: {
            ...currentModule,
            access: !allSelected,
            full_access: !allSelected,
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
      const userRole = isAdmin ? 'admin' : 'staff'

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
        : {
            ims: {
              ...formData.page_access.ims,
              access: Boolean(formData.page_access.ims?.full_access || (formData.page_access.ims?.pages || []).length > 0),
              role: 'staff',
            },
            pms: {
              ...formData.page_access.pms,
              access: Boolean(formData.page_access.pms?.full_access || (formData.page_access.pms?.pages || []).length > 0),
              role: 'staff',
            },
            hrms: {
              ...formData.page_access.hrms,
              access: Boolean(formData.page_access.hrms?.full_access || (formData.page_access.hrms?.pages || []).length > 0),
              role: 'staff',
            },
          }

      const effectiveDesignation = formData.designation === 'Other' && formData.custom_designation?.trim()
        ? formData.custom_designation.trim()
        : (formData.designation || 'Staff Worker')

      const payload = {
        username: formData.username.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        role: userRole,
        mobile_number: formData.mobile_number?.trim() || '',
        is_active: formData.is_active,
        page_access: pageAccessPayload,
        join_date: formData.join_date || null,
        base_salary: formData.base_salary !== '' && !isNaN(Number(formData.base_salary)) ? Number(formData.base_salary) : 0,
        department: formData.department || 'WORKER',
        designation: effectiveDesignation,
        custom_designation: formData.custom_designation || '',
        emergency_contact_name: formData.emergency_contact_name?.trim() || '',
        emergency_contact_phone: formData.emergency_contact_phone?.trim() || '',
        aadhar_number: formData.aadhar_number?.trim() || '',
        aadhar_attachment: formData.aadhar_attachment || '',
        aadhar_attachment_name: formData.aadhar_attachment_name || '',
        aadhar_address: formData.aadhar_address?.trim() || '',
        current_address: formData.current_address?.trim() || '',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[95dvh] sm:h-auto sm:max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70">
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
        <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-slate-200 bg-white">
          <div className={`grid ${formData.role !== 'admin' ? 'grid-cols-2' : 'grid-cols-1'} gap-1 p-1 rounded-xl bg-slate-100`}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all min-w-0 ${
              activeTab === 'details'
                ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate"><span className="hidden sm:inline">User </span>Details</span>
            {formData.role === 'admin' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                Full Access (Admin)
              </span>
            )}
          </button>

          {formData.role !== 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all min-w-0 ${
                activeTab === 'permissions'
                  ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span className="truncate"><span className="hidden sm:inline">Page </span>Permissions</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-violet-100 text-violet-700 shrink-0">
                {totalEnabledPages}/{TOTAL_PAGE_COUNT}
              </span>
            </button>
          )}
          </div>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="shrink-0 mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-6">
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
                      <option value="admin">Admin (Full System & User Management)</option>
                      <option value="staff">Staff (Standard Page Access)</option>
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
                      Admins get unrestricted access. Staff members require page permissions configured in the next tab.
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

              {/* SECTION: EMPLOYMENT & COMPENSATION (HRMS) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded-lg bg-violet-100 text-violet-700">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Employment & Salary Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Joining Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        name="join_date"
                        value={formData.join_date}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Salary Amount (Monthly) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Salary Amount (Monthly)
                    </label>
                    <div className="relative">
                      <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">₹</span>
                      <input
                        type="number"
                        name="base_salary"
                        min="0"
                        step="100"
                        placeholder="e.g. 15000"
                        value={formData.base_salary}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Department
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all appearance-none"
                      >
                        {HRMS_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Designation
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all appearance-none"
                      >
                        {HRMS_DESIGNATIONS.map((desig) => (
                          <option key={desig} value={desig}>
                            {desig}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Designation if Other */}
                  {formData.designation === 'Other' && (
                    <div className="sm:col-span-2 animate-in fade-in duration-150">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Specify Custom Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="custom_designation"
                        placeholder="e.g. Master Barista / Site Supervisor"
                        value={formData.custom_designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: EMERGENCY CONTACT */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-rose-100 text-rose-700">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Emergency Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Contact Person Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Person Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="emergency_contact_name"
                        placeholder="e.g. Ramesh Kumar (Father / Spouse)"
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* 10-Digit Mobile */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      10-Digit Mobile
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        maxLength="14"
                        placeholder="e.g. 9876543210"
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: IDENTITY DOCUMENTS & ADDRESS */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Identity Documents & Address
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Aadhar Card Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Aadhar Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="aadhar_number"
                        maxLength="14"
                        placeholder="12-digit UIDAI number"
                        value={formData.aadhar_number}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Aadhar Card Attachment */}
                  <div>
                    <FileUploadField
                      label="Aadhar Card Attachment"
                      fieldName="aadhar_attachment"
                      fileData={formData.aadhar_attachment}
                      fileName={formData.aadhar_attachment_name}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                      isUploading={uploadingFile}
                    />
                  </div>
                </div>

                {/* Aadhar Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Aadhar Address
                  </label>
                  <textarea
                    name="aadhar_address"
                    rows="2"
                    placeholder="Permanent address as printed on Aadhar card"
                    value={formData.aadhar_address}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all resize-y"
                  />
                </div>

                {/* Current Residential Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Current Residential Address
                    </label>
                    {formData.aadhar_address && (
                      <button
                        type="button"
                        onClick={handleCopyAadharAddress}
                        className="text-violet-600 hover:text-violet-700 hover:underline text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                      >
                        Same as Aadhar Address
                      </button>
                    )}
                  </div>
                  <textarea
                    name="current_address"
                    rows="2"
                    placeholder="Current residential living address"
                    value={formData.current_address}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium transition-all resize-y"
                  />
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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">H3MS System</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                          Production & Catering
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (formData.page_access.pms?.full_access ? PMS_PAGES.length : (formData.page_access.pms?.pages || []).length) > 0
                            ? 'bg-amber-200/80 text-amber-900'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {formData.page_access.pms?.full_access ? PMS_PAGES.length : (formData.page_access.pms?.pages || []).length}/{PMS_PAGES.length} Selected
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">17 Departments, Menu Finalize, Bookings, AI Chatbot & Delay Logs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Full Access Switch */}
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.page_access.pms?.full_access || false}
                        onChange={handlePmsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Full Access</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSelectAllInModule('pms')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      {(formData.page_access.pms?.full_access ? PMS_PAGES.length : (formData.page_access.pms?.pages || []).length) === PMS_PAGES.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white max-h-72 overflow-y-auto">
                  {filterPages(PMS_PAGES).map((page) => {
                    const isChecked = Boolean(
                      formData.page_access.pms?.full_access ||
                        (formData.page_access.pms?.pages || []).includes(page.id)
                    )

                    return (
                      <label
                        key={page.id}
                        className="flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle('pms', page.id)}
                            className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">Crockery & Cutlery IMS</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800">
                          Inventory & Ware
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (formData.page_access.ims?.full_access ? IMS_PAGES.length : (formData.page_access.ims?.pages || []).length) > 0
                            ? 'bg-violet-200/80 text-violet-900'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {formData.page_access.ims?.full_access ? IMS_PAGES.length : (formData.page_access.ims?.pages || []).length}/{IMS_PAGES.length} Selected
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Stock purchases, party issues, returns & damages</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Full Access Switch */}
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.page_access.ims?.full_access || false}
                        onChange={handleImsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>Full Access</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSelectAllInModule('ims')}
                      className="text-xs font-bold text-violet-700 hover:text-violet-800 transition-colors"
                    >
                      {(formData.page_access.ims?.full_access ? IMS_PAGES.length : (formData.page_access.ims?.pages || []).length) === IMS_PAGES.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white">
                  {filterPages(IMS_PAGES).map((page) => {
                    const isChecked = Boolean(
                      formData.page_access.ims?.full_access ||
                        (formData.page_access.ims?.pages || []).includes(page.id)
                    )

                    return (
                      <label
                        key={page.id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle('ims', page.id)}
                            className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500"
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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">HRMS System</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
                          Staff & Operations
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (formData.page_access.hrms?.full_access ? HRMS_PAGES.length : (formData.page_access.hrms?.pages || []).length) > 0
                            ? 'bg-rose-200/80 text-rose-900'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {formData.page_access.hrms?.full_access ? HRMS_PAGES.length : (formData.page_access.hrms?.pages || []).length}/{HRMS_PAGES.length} Selected
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Daily Attendance, Salary Advances, Advance Approval, OT & Monthly Payroll</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.page_access.hrms?.full_access || false}
                        onChange={handleHrmsFullAccessToggle}
                        className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Full Access</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSelectAllInModule('hrms')}
                      className="text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors"
                    >
                      {(formData.page_access.hrms?.full_access ? HRMS_PAGES.length : (formData.page_access.hrms?.pages || []).length) === HRMS_PAGES.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Page List */}
                <div className="divide-y divide-slate-100 bg-white">
                  {filterPages(HRMS_PAGES).map((page) => {
                    const isChecked = Boolean(
                      formData.page_access.hrms?.full_access ||
                        (formData.page_access.hrms?.pages || []).includes(page.id)
                    )

                    return (
                      <label
                        key={page.id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle('hrms', page.id)}
                            className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
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
                                ? 'bg-rose-100 text-rose-800'
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

          </div>

          {/* Modal Actions Footer (outside the scroller so it never covers content) */}
          <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2 disabled:opacity-50"
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
