import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import {
  FileText, Loader2, PlusCircle, Search, Users, Filter, X,
  Image as ImageIcon, ExternalLink, Pencil, Trash2,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { masterDataService } from '../../../services/masterDataService'
import { peteService } from '../services/peteService'
import { formatAmountWithCommas, parseFormattedAmount, isPdfFile } from '../utils/peteFormat'

const emptyForm = (personName) => ({
  personName,
  date: new Date().toISOString().split('T')[0],
  incoming: '',
  outgoing: '',
  mode: '',
  groupHead: '',
  vendorName: '',
  remarks: '',
})

export function PeteFormPage() {
  const { currentUser, isAdmin } = useAuth()
  const admin = isAdmin()
  const myName = currentUser?.full_name || currentUser?.username || ''

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [formData, setFormData] = useState(emptyForm(myName))
  const [photoFile, setPhotoFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [dropdownOptions, setDropdownOptions] = useState({ personName: [], mode: [], groupHead: [], vendorNames: [] })

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [isGroupHeadModalOpen, setIsGroupHeadModalOpen] = useState(false)
  const [newGroupHead, setNewGroupHead] = useState('')
  const [isAddingGroupHead, setIsAddingGroupHead] = useState(false)

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isAddingVendor, setIsAddingVendor] = useState(false)

  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [hasPreviewError, setHasPreviewError] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [allTransactions, setAllTransactions] = useState([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [personFilter, setPersonFilter] = useState('all')
  const [groupHeadFilter, setGroupHeadFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const loadDropdownOptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const options = await peteService.fetchDropdownOptions()
      setDropdownOptions(options)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTransactions = async () => {
    setIsTransactionsLoading(true)
    try {
      const rows = await peteService.fetchTransactions()
      setAllTransactions(rows)
    } catch (err) {
      console.error(err)
    } finally {
      setIsTransactionsLoading(false)
    }
  }

  useEffect(() => {
    loadDropdownOptions()
    loadTransactions()
  }, [])

  const isFilterActive = useMemo(() => {
    return (
      personFilter !== 'all' ||
      groupHeadFilter !== 'all' ||
      vendorFilter !== 'all' ||
      modeFilter !== 'all' ||
      !!dateRange.from ||
      !!dateRange.to ||
      tableSearch.trim() !== ''
    )
  }, [personFilter, groupHeadFilter, vendorFilter, modeFilter, dateRange, tableSearch])

  const tableFilterOptions = useMemo(() => {
    const persons = new Set()
    const groupHeads = new Set()
    const vendors = new Set()
    const modes = new Set()

    allTransactions.forEach((t) => {
      if (t.personName?.trim()) persons.add(t.personName.trim())
      if (t.groupHead?.trim()) groupHeads.add(t.groupHead.trim())
      if (t.vendorName?.trim()) vendors.add(t.vendorName.trim())
      if (t.mode?.trim()) modes.add(t.mode.trim())
    })

    return {
      persons: Array.from(persons).sort((a, b) => a.localeCompare(b)),
      groupHeads: Array.from(groupHeads).sort((a, b) => a.localeCompare(b)),
      vendors: Array.from(vendors).sort((a, b) => a.localeCompare(b)),
      modes: Array.from(modes).sort((a, b) => a.localeCompare(b)),
    }
  }, [allTransactions])

  const handleClearAllFilters = () => {
    setPersonFilter('all')
    setGroupHeadFilter('all')
    setVendorFilter('all')
    setModeFilter('all')
    setDateRange({ from: '', to: '' })
    setTableSearch('')
  }

  const visibleTransactions = useMemo(() => {
    let rows = allTransactions
    if (personFilter !== 'all') rows = rows.filter((t) => t.personName === personFilter)
    if (groupHeadFilter !== 'all') rows = rows.filter((t) => t.groupHead === groupHeadFilter)
    if (vendorFilter !== 'all') rows = rows.filter((t) => t.vendorName === vendorFilter)
    if (modeFilter !== 'all') rows = rows.filter((t) => t.mode === modeFilter)
    if (dateRange.from || dateRange.to) {
      const start = dateRange.from ? startOfDay(new Date(dateRange.from)) : null
      const end = dateRange.to ? endOfDay(new Date(dateRange.to)) : null
      rows = rows.filter((t) => {
        if (!t.date) return false
        const tDate = parseISO(t.date)
        if (start && end) return isWithinInterval(tDate, { start, end })
        if (start) return tDate >= start
        if (end) return tDate <= end
        return true
      })
    }
    const query = tableSearch.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((t) => [t.personName, t.groupHead, t.vendorName, t.remarks, t.mode].some((v) => v?.toLowerCase().includes(query)))
  }, [allTransactions, tableSearch, personFilter, groupHeadFilter, vendorFilter, modeFilter, dateRange])

  const handleOpenAddModal = () => {
    setEditTransaction(null)
    setFormData(emptyForm(myName))
    setPhotoFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  const handleOpenEditModal = (t) => {
    setEditTransaction(t)
    setFormData({
      personName: t.personName,
      date: t.date,
      incoming: t.incoming > 0 ? formatAmountWithCommas(t.incoming) : '',
      outgoing: t.outgoing > 0 ? formatAmountWithCommas(t.outgoing) : '',
      mode: t.mode,
      groupHead: t.groupHead,
      vendorName: t.vendorName,
      remarks: t.remarks,
    })
    setPhotoFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  const handleAddNewGroupHead = async () => {
    const trimmed = newGroupHead.trim()
    if (!trimmed) return
    setIsAddingGroupHead(true)
    const res = await masterDataService.addPeteMaster('group_head', trimmed)
    if (res.success) {
      setNewGroupHead('')
      setIsGroupHeadModalOpen(false)
      await loadDropdownOptions()
      setFormData((prev) => ({ ...prev, groupHead: trimmed }))
      toast.success(`Group Head "${trimmed}" added successfully.`)
    } else {
      toast.error(res.error || 'Failed to add group head')
    }
    setIsAddingGroupHead(false)
  }

  const handleAddNewVendor = async () => {
    const trimmed = newVendorName.trim()
    if (!trimmed) return
    setIsAddingVendor(true)
    const res = await masterDataService.addPeteMaster('vendor', trimmed)
    if (res.success) {
      setNewVendorName('')
      setIsVendorModalOpen(false)
      await loadDropdownOptions()
      setFormData((prev) => ({ ...prev, vendorName: trimmed }))
      toast.success(`Vendor "${trimmed}" added successfully.`)
    } else {
      toast.error(res.error || 'Failed to add vendor')
    }
    setIsAddingVendor(false)
  }

  const handleInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleSelectChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }))
  const handleFileChange = (e) => setPhotoFile(e.target.files?.[0] || null)

  const handleAmountInputChange = (field, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
    setFormData((prev) => ({ ...prev, [field]: formatAmountWithCommas(sanitized) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const loadingId = toast.loading(editTransaction ? 'Updating Transaction...' : 'Submitting Transaction...')
    try {
      const payload = {
        personName: formData.personName,
        date: formData.date,
        incoming: parseFormattedAmount(formData.incoming),
        outgoing: parseFormattedAmount(formData.outgoing),
        mode: formData.mode,
        groupHead: formData.groupHead,
        vendorName: formData.vendorName,
        remarks: formData.remarks,
      }

      if (editTransaction) {
        await peteService.updateTransaction(editTransaction.id, payload, photoFile, editTransaction.photoLink)
        toast.success('Transaction Updated!')
      } else {
        await peteService.insertTransaction(payload, photoFile)
        toast.success('Transaction Added!')
      }

      setFormData(emptyForm(myName))
      setEditTransaction(null)
      setPhotoFile(null)
      setFileInputKey(Date.now())
      setIsFormOpen(false)
      await loadTransactions()
    } catch (err) {
      toast.error(err.message || (editTransaction ? 'Update Failed' : 'Submission Failed'))
      console.error(err)
    } finally {
      toast.dismiss(loadingId)
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await peteService.deleteTransaction(deleteTarget.id)
      toast.success('Transaction removed successfully.')
      setDeleteTarget(null)
      await loadTransactions()
    } catch (err) {
      toast.error(err.message || 'Delete Failed')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openPreviewModal = (url) => {
    setHasPreviewError(false)
    setPreviewImageUrl(url)
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" />
        <p className="mt-2 text-slate-500">Loading transactions...</p>
      </div>
    )
  }
  if (error) return <div className="p-8 text-center text-rose-600">Error: {error}</div>

  const totalColumns = admin ? 10 : 9

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl font-bold">
            <FileText className="h-5 w-5 text-violet-600" /> Transactions
          </h2>
          <button
            onClick={handleOpenAddModal}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-violet-200 w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden">
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">{editTransaction ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Person</label>
                  <select
                    value={formData.personName}
                    onChange={(e) => handleSelectChange('personName', e.target.value)}
                    disabled={!admin}
                    className="w-full rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Select Person</option>
                    {dropdownOptions.personName.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm font-medium" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incoming Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm pointer-events-none">₹</span>
                    <input
                      type="text" inputMode="decimal" name="incoming" placeholder="0.00"
                      value={formData.incoming} onChange={(e) => handleAmountInputChange('incoming', e.target.value)}
                      className="w-full pl-8 pr-3 rounded-xl h-11 border border-slate-200 font-mono font-bold text-slate-800 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outgoing Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm pointer-events-none">₹</span>
                    <input
                      type="text" inputMode="decimal" name="outgoing" placeholder="0.00"
                      value={formData.outgoing} onChange={(e) => handleAmountInputChange('outgoing', e.target.value)}
                      className="w-full pl-8 pr-3 rounded-xl h-11 border border-slate-200 font-mono font-bold text-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</label>
                  <select value={formData.mode} onChange={(e) => handleSelectChange('mode', e.target.value)} className="w-full rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium">
                    <option value="">Select Mode</option>
                    {dropdownOptions.mode.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Group Head</label>
                  <div className="flex gap-2">
                    <select value={formData.groupHead} onChange={(e) => handleSelectChange('groupHead', e.target.value)} className="flex-1 rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium">
                      <option value="">Select Group Head</option>
                      {dropdownOptions.groupHead.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsGroupHeadModalOpen(true)} title="Add New Group Head" className="rounded-xl h-11 w-11 shrink-0 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</label>
                  <div className="flex gap-2">
                    <select value={formData.vendorName} onChange={(e) => handleSelectChange('vendorName', e.target.value)} className="flex-1 rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium">
                      <option value="">Select Vendor</option>
                      {dropdownOptions.vendorNames.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsVendorModalOpen(true)} title="Add New Vendor" className="rounded-xl h-11 w-11 shrink-0 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</label>
                  <input type="text" name="remarks" placeholder="Add remarks..." value={formData.remarks} onChange={handleInputChange} className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm font-medium" />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {editTransaction?.photoLink ? 'Replace Attachment File (Optional)' : 'Attachment File (Optional)'}
                  </label>
                  <input key={fileInputKey} type="file" onChange={handleFileChange} className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm" />
                  {editTransaction?.photoLink && <p className="text-[11px] text-slate-400 mt-1">Current attachment file is preserved unless replaced.</p>}
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-2.5 rounded-xl w-full sm:w-auto shadow-md shadow-violet-200 disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : editTransaction ? 'Save Changes' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Group Head Modal */}
      {isGroupHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-slate-800 font-bold mb-3">New Group Head</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddNewGroupHead() }}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Group Head Name</label>
              <input value={newGroupHead} onChange={(e) => setNewGroupHead(e.target.value)} placeholder="e.g. Office Expenses" className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm" autoFocus />
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 mt-5 justify-end">
                <button type="button" onClick={() => setIsGroupHeadModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 w-full sm:w-auto">Cancel</button>
                <button type="submit" disabled={isAddingGroupHead || !newGroupHead.trim()} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 disabled:opacity-50 w-full sm:w-auto">
                  {isAddingGroupHead ? 'Adding...' : 'Add Group Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-slate-800 font-bold mb-3">New Vendor</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddNewVendor() }}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Vendor Name</label>
              <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="e.g. Apex Traders" className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm" autoFocus />
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 mt-5 justify-end">
                <button type="button" onClick={() => setIsVendorModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 w-full sm:w-auto">Cancel</button>
                <button type="submit" disabled={isAddingVendor || !newVendorName.trim()} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 disabled:opacity-50 w-full sm:w-auto">
                  {isAddingVendor ? 'Adding...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-slate-600 mb-3">Are you sure you want to delete this transaction entry?</p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-medium mb-3">
              <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-slate-700">{deleteTarget.formattedDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Person:</span><span className="text-slate-700">{deleteTarget.personName}</span></div>
              {deleteTarget.groupHead && <div className="flex justify-between"><span className="text-slate-400">Group Head:</span><span className="text-slate-700">{deleteTarget.groupHead}</span></div>}
              {deleteTarget.vendorName && <div className="flex justify-between"><span className="text-slate-400">Vendor:</span><span className="text-slate-700">{deleteTarget.vendorName}</span></div>}
              {deleteTarget.incoming > 0 && <div className="flex justify-between"><span className="text-slate-400">Incoming:</span><span className="text-emerald-600 font-bold">₹{deleteTarget.incoming.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
              {deleteTarget.outgoing > 0 && <div className="flex justify-between"><span className="text-slate-400">Outgoing:</span><span className="text-rose-600 font-bold">₹{deleteTarget.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
            </div>
            <p className="text-xs text-slate-400 mb-5">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2.5">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteTransaction} disabled={isDeleting} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Delete Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <h3 className="text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2">
                {isPdfFile(previewImageUrl) ? <FileText className="w-4 h-4 text-violet-600" /> : <ImageIcon className="w-4 h-4 text-violet-600" />}
                <span className="truncate">{isPdfFile(previewImageUrl) ? 'PDF Attachment Document' : 'Attachment Proof'}</span>
              </h3>
              <button onClick={() => setPreviewImageUrl(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="py-2 flex justify-center items-center bg-slate-50/80 rounded-xl border border-slate-100 min-h-[220px] max-h-[60vh] overflow-hidden">
              {isPdfFile(previewImageUrl) ? (
                <iframe src={previewImageUrl} className="w-full h-[55vh] rounded-lg border border-slate-200 bg-white" title="PDF Document Preview" />
              ) : !hasPreviewError ? (
                <img src={previewImageUrl} alt="Attachment Proof" onError={() => setHasPreviewError(true)} className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-200" />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-3">
                  <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl"><FileText className="w-10 h-10" /></div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Attachment Document</h4>
                    <p className="text-xs text-slate-500 mt-1">PDF or non-image file attached.</p>
                  </div>
                  <a href={previewImageUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-md shadow-violet-200">
                    <span>Open / Download File</span><ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-3">
              <a href={previewImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 font-semibold flex items-center gap-1 hover:underline">
                <span>Open File</span><ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setPreviewImageUrl(null)} className="rounded-xl text-xs font-semibold h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Records Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden p-3 sm:p-6 space-y-4">
        <div className="bg-violet-50/70 border border-violet-100/80 rounded-xl p-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-slate-800 text-sm md:text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-600" /> All Transactions ({visibleTransactions.length})
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="relative w-full sm:w-36 md:w-40">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="w-full pl-8 pr-2 rounded-xl h-10 text-xs border border-slate-200 bg-white">
                  <option value="all">All Persons</option>
                  {tableFilterOptions.persons.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <select value={groupHeadFilter} onChange={(e) => setGroupHeadFilter(e.target.value)} className="w-full sm:w-36 md:w-40 rounded-xl h-10 text-xs border border-slate-200 bg-white px-2">
                <option value="all">All Group Heads</option>
                {tableFilterOptions.groupHeads.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="w-full sm:w-36 md:w-40 rounded-xl h-10 text-xs border border-slate-200 bg-white px-2">
                <option value="all">All Vendors</option>
                {tableFilterOptions.vendors.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-full sm:w-28 md:w-32 rounded-xl h-10 text-xs border border-slate-200 bg-white px-2">
                <option value="all">All Modes</option>
                {tableFilterOptions.modes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 w-full sm:w-32" title="From date" />
                <span className="text-slate-400 text-xs">to</span>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 w-full sm:w-32" title="To date" />
              </div>

              <div className="relative w-full sm:flex-1 sm:min-w-[150px] lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-8 pr-2 rounded-xl h-10 border border-slate-200 text-xs" />
              </div>

              {isFilterActive && (
                <button onClick={handleClearAllFilters} className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-1.5 border border-rose-100 bg-rose-50/30 w-full sm:w-auto">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {isTransactionsLoading ? (
            <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /><p className="text-xs text-slate-400 mt-2">Loading transactions...</p></div>
          ) : visibleTransactions.length > 0 ? (
            visibleTransactions.map((t) => (
              <div key={t.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm transition-colors">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{t.formattedDate}</span>
                    {admin && <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">{t.personName}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.groupHead && <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-violet-50 text-violet-600 border border-violet-100">{t.groupHead}</span>}
                    {t.mode && <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 border border-slate-200">{t.mode}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Vendor</div>
                    <div className="text-xs font-bold text-slate-800 truncate">{t.vendorName || '-'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {t.incoming > 0 && <div className="text-emerald-600 font-bold text-sm">+₹{t.incoming.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                    {t.outgoing > 0 && <div className="text-rose-600 font-bold text-sm">-₹{t.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                    {t.incoming === 0 && t.outgoing === 0 && <div className="text-slate-400 text-xs font-medium">₹0.00</div>}
                  </div>
                </div>
                {t.remarks && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                    <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                    <span className="truncate">{t.remarks}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                  <div>
                    {t.photoLink ? (
                      <button type="button" onClick={() => openPreviewModal(t.photoLink)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200/60">
                        {isPdfFile(t.photoLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        <span>View Doc</span>
                      </button>
                    ) : <span className="text-[10px] text-slate-300 italic">No attachment</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleOpenEditModal(t)} title="Edit transaction" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-100">
                      <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(t)} title="Delete transaction" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100">
                      <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">No transactions found.</div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto w-full max-h-[500px]">
          <table className="w-full text-sm min-w-[850px]">
            <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
              <tr className="border-b border-violet-100">
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                {admin && <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Incoming</th>
                <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Outgoing</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Remarks</th>
                <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
                <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {isTransactionsLoading ? (
                <tr><td colSpan={totalColumns} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-violet-600" /></td></tr>
              ) : visibleTransactions.length > 0 ? (
                visibleTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 sm:p-4 text-slate-600">{t.formattedDate}</td>
                    {admin && <td className="p-3 sm:p-4 text-slate-700 font-medium">{t.personName}</td>}
                    <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-violet-50 text-violet-600">{t.groupHead || '-'}</span></td>
                    <td className="p-3 sm:p-4 font-medium text-slate-700">{t.vendorName || '-'}</td>
                    <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500">{t.mode || '-'}</span></td>
                    <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td className="p-3 sm:p-4 text-slate-600 max-w-[180px] truncate" title={t.remarks}>{t.remarks || '-'}</td>
                    <td className="p-3 sm:p-4 text-center">
                      {t.photoLink ? (
                        <button type="button" onClick={() => openPreviewModal(t.photoLink)} title="Click to view attachment" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200/60 shadow-sm">
                          {isPdfFile(t.photoLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <span>View</span>
                        </button>
                      ) : <span className="text-slate-300 text-xs">-</span>}
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => handleOpenEditModal(t)} title="Edit transaction" className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(t)} title="Delete transaction" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={totalColumns} className="p-6 text-center text-slate-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PeteFormPage
