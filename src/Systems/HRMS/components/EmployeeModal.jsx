import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  UserPlus,
  Phone,
  PhoneCall,
  UserCheck,
  Briefcase,
  Layers,
  Calendar,
  CreditCard,
  Shield,
  Upload,
  Check,
  AlertCircle,
  FileCheck
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'

const DEPARTMENTS = [
  'PPF',
  'WORKER',
  'SALES',
  'MANAGEMENT',
  'KITCHEN',
  'LOGISTICS',
  'HOUSEKEEPING',
  'SERVICE / WAITERS'
]

const COMMON_DESIGNATIONS = [
  'JR. PPF APPLICATOR / DETAILER',
  'PPF HELPER / CAR WASHER',
  'PPF Applicator',
  'SENIOR PPF APPLICATOR',
  'SENIOR DETAILER',
  'EXECUTIVE',
  'Floor Manager',
  'JR. DETAILER',
  'Executive Assistant (PC)',
  'Head Chef',
  'Transport Driver',
  'Staff Attendant',
  'General Helper'
]

function FileUploadField({ label, fieldName, fileData, fileName, onFileSelect, onFileRemove }) {
  const inputId = `file-input-${fieldName}`
  const isImage = fileData && typeof fileData === 'string' && fileData.startsWith('data:image')

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-600 transition-all">
        {/* Upload Trigger Button */}
        <label
          htmlFor={inputId}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 text-xs font-bold transition-all shadow-2xs shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{fileName ? 'Change' : 'Upload File'}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => onFileSelect(e, fieldName)}
        />

        {/* File Name / Status Display */}
        {fileName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isImage && (
              <img
                src={fileData}
                alt="preview"
                className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
              />
            )}
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs text-slate-800 font-semibold truncate flex-1 min-w-0" title={fileName}>
              {fileName}
            </span>
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

export function EmployeeModal({ isOpen, onClose, onSave, editingEmployee = null }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    department: '',
    designation: '',
    custom_designation: '',
    join_date: new Date().toISOString().split('T')[0],
    base_salary: 0,
    allowed_leaves: 4,

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',

    // Aadhar & Address
    aadhar_number: '',
    aadhar_attachment: '',
    aadhar_attachment_name: '',
    aadhar_address: '',
    current_address: ''
  })

  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (editingEmployee) {
      const isKnownDesig = COMMON_DESIGNATIONS.includes(editingEmployee.designation)
      setFormData({
        name: editingEmployee.name || '',
        mobile: editingEmployee.mobile || '',
        department: editingEmployee.department || '',
        designation: isKnownDesig ? editingEmployee.designation : (editingEmployee.designation ? 'OTHER' : ''),
        custom_designation: !isKnownDesig ? (editingEmployee.designation || '') : '',
        join_date: editingEmployee.join_date || new Date().toISOString().split('T')[0],
        base_salary: editingEmployee.base_salary !== undefined ? editingEmployee.base_salary : 0,
        allowed_leaves: editingEmployee.allowed_leaves !== undefined ? editingEmployee.allowed_leaves : 4,

        emergency_contact_name: editingEmployee.emergency_contact_name || '',
        emergency_contact_phone: editingEmployee.emergency_contact_phone || '',

        aadhar_number: editingEmployee.aadhar_number || '',
        aadhar_attachment: editingEmployee.aadhar_attachment || '',
        aadhar_attachment_name: editingEmployee.aadhar_attachment_name || '',
        aadhar_address: editingEmployee.aadhar_address || '',
        current_address: editingEmployee.current_address || ''
      })
    } else {
      setFormData({
        name: '',
        mobile: '',
        department: '',
        designation: '',
        custom_designation: '',
        join_date: new Date().toISOString().split('T')[0],
        base_salary: 0,
        allowed_leaves: 4,

        emergency_contact_name: '',
        emergency_contact_phone: '',

        aadhar_number: '',
        aadhar_attachment: '',
        aadhar_attachment_name: '',
        aadhar_address: '',
        current_address: ''
      })
    }
    setErrorMsg('')
  }, [editingEmployee, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        [field]: reader.result,
        [`${field}_name`]: file.name
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleFileRemove = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: '',
      [`${field}_name`]: ''
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrorMsg('Employee Name is required.')
      return
    }

    const finalDesignation =
      formData.designation === 'OTHER'
        ? formData.custom_designation.trim() || 'Staff Worker'
        : formData.designation || 'Staff Worker'

    const payload = {
      ...(editingEmployee ? { id: editingEmployee.id } : {}),
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      department: formData.department || 'WORKER',
      designation: finalDesignation,
      base_salary: Number(formData.base_salary) || 0,
      allowed_leaves: Number(formData.allowed_leaves) || 4,
      join_date: formData.join_date,
      status: editingEmployee?.status || 'active',
      inactive_reason: editingEmployee?.inactive_reason || '',

      // Emergency Contact
      emergency_contact_name: formData.emergency_contact_name.trim(),
      emergency_contact_phone: formData.emergency_contact_phone.trim(),

      // Aadhar & Address
      aadhar_number: formData.aadhar_number.trim(),
      aadhar_attachment: formData.aadhar_attachment,
      aadhar_attachment_name: formData.aadhar_attachment_name,
      aadhar_address: formData.aadhar_address.trim(),
      current_address: formData.current_address.trim()
    }

    staffStorageService.saveEmployee(payload)
    if (onSave) onSave()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header - Master System Style */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                {editingEmployee ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {editingEmployee
                  ? `Update personal details, emergency contact and identity documents for ${editingEmployee.name}`
                  : 'Configure personal info, emergency contact & identity documents'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body - Single Scroll Master System Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Basic Information
                </h4>
                <p className="text-[11px] text-slate-400">Employee identity, role and compensation</p>
              </div>
            </div>

            {/* Row 1: Employee Name & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Adil Khan"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    name="mobile"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Department & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all appearance-none"
                  >
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all appearance-none"
                  >
                    <option value="">-- Select Designation --</option>
                    {COMMON_DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig}>
                        {desig}
                      </option>
                    ))}
                    <option value="OTHER">Other / Custom</option>
                  </select>
                </div>
                {formData.designation === 'OTHER' && (
                  <input
                    type="text"
                    name="custom_designation"
                    placeholder="Enter custom designation"
                    value={formData.custom_designation}
                    onChange={handleChange}
                    className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                )}
              </div>
            </div>

            {/* Row 3: Joining Date & Salary Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Joining Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Salary Amount (Monthly)
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">₹</span>
                  <input
                    type="number"
                    name="base_salary"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={formData.base_salary}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Emergency Contact */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Emergency Contact
                </h4>
                <p className="text-[11px] text-slate-400">Reach-out information in case of workplace emergency</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Person Name
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="emergency_contact_name"
                    placeholder="Emergency contact person name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  10-Digit Mobile
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Identity Documents & Address (Aadhar & Addresses) */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Identity Documents & Address
                </h4>
                <p className="text-[11px] text-slate-400">Government ID numbers and verified addresses</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Aadhar Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Aadhar Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="aadhar_number"
                      maxLength={14}
                      placeholder="12-digit Aadhar number"
                      value={formData.aadhar_number}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                    />
                  </div>
                </div>

                <FileUploadField
                  label="Aadhar Card Attachment"
                  fieldName="aadhar_attachment"
                  fileData={formData.aadhar_attachment}
                  fileName={formData.aadhar_attachment_name}
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                />
              </div>

              {/* Aadhar Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Aadhar Address
                </label>
                <textarea
                  name="aadhar_address"
                  rows={2}
                  placeholder="Enter address as per Aadhar card"
                  value={formData.aadhar_address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all resize-y"
                />
              </div>

              {/* Current Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Residential Address
                </label>
                <textarea
                  name="current_address"
                  rows={2}
                  placeholder="Enter current residential address"
                  value={formData.current_address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all resize-y"
                />
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingEmployee ? 'Update Profile' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeModal
