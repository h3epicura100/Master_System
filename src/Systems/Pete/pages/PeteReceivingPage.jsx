import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import {
  Loader2, PlusCircle, ExternalLink, FilePlus, List, Search, Users,
  Filter, X, Image as ImageIcon, FileText, Pencil, Trash2,
} from 'lucide-react'
import { masterDataService } from '../../../services/masterDataService'
import { peteService } from '../services/peteService'
import { formatAmountWithCommas, parseFormattedAmount, isPdfFile } from '../utils/peteFormat'

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  vendorName: '',
  invoiceAmt: '',
  invoiceNumber: '',
  mode: '',
  remarks: '',
})

export function PeteReceivingPage() {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState(emptyForm())
  const [imageFile, setImageFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [dropdownOptions, setDropdownOptions] = useState({ vendorNames: [], modes: [] })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isAddingVendor, setIsAddingVendor] = useState(false)

  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [hasPreviewError, setHasPreviewError] = useState(false)

  const [vendorFilter, setVendorFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [tableSearch, setTableSearch] = useState('')

  const loadDropdownOptions = async () => {
    try {
      const options = await peteService.fetchDropdownOptions()
      setDropdownOptions({ vendorNames: options.vendorNames, modes: options.mode })
    } catch (err) {
      console.error(err)
    }
  }

  const loadRecords = async () => {
    setIsRecordsLoading(true)
    try {
      const recs = await peteService.fetchReceivingRecords()
      setRecords(recs)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsRecordsLoading(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDropdownOptions()
    loadRecords()
  }, [])

  const visibleRecords = useMemo(() => {
    let base = records
    if (vendorFilter !== 'all') base = base.filter((r) => r.vendorName === vendorFilter)
    if (dateRange.from || dateRange.to) {
      const start = dateRange.from ? startOfDay(new Date(dateRange.from)) : null
      const end = dateRange.to ? endOfDay(new Date(dateRange.to)) : null
      base = base.filter((r) => {
        if (!r.date) return false
        const rDate = parseISO(r.date)
        if (!rDate || isNaN(rDate.getTime())) return false
        if (start && end) return isWithinInterval(rDate, { start, end })
        if (start) return rDate >= start
        if (end) return rDate <= end
        return true
      })
    }
    const query = tableSearch.trim().toLowerCase()
    if (!query) return base
    return base.filter(
      (r) =>
        r.vendorName.toLowerCase().includes(query) ||
        r.invoiceNumber.toLowerCase().includes(query) ||
        r.mode.toLowerCase().includes(query) ||
        (r.remarks && r.remarks.toLowerCase().includes(query))
    )
  }, [records, vendorFilter, dateRange, tableSearch])

  const isFilterActive = useMemo(() => vendorFilter !== 'all' || !!dateRange.from || !!dateRange.to || tableSearch.trim() !== '', [vendorFilter, dateRange, tableSearch])

  const tableVendors = useMemo(() => {
    const set = new Set()
    records.forEach((r) => {
      if (r.vendorName?.trim()) set.add(r.vendorName.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [records])

  const handleClearAllFilters = () => {
    setVendorFilter('all')
    setDateRange({ from: '', to: '' })
    setTableSearch('')
  }

  const handleOpenAddModal = () => {
    setEditRecord(null)
    setFormData(emptyForm())
    setImageFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  const handleOpenEditModal = (rec) => {
    setEditRecord(rec)
    setFormData({
      date: rec.date || new Date().toISOString().split('T')[0],
      vendorName: rec.vendorName,
      invoiceAmt: rec.invoiceAmt > 0 ? formatAmountWithCommas(rec.invoiceAmt) : '',
      invoiceNumber: rec.invoiceNumber,
      mode: rec.mode,
      remarks: rec.remarks || '',
    })
    setImageFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  const handleInvoiceAmtChange = (rawValue) => {
    const cleaned = rawValue.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
    setFormData((prev) => ({ ...prev, invoiceAmt: formatAmountWithCommas(sanitized) }))
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

  const openPreviewModal = (url) => {
    setHasPreviewError(false)
    setPreviewImageUrl(url)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const loadingId = toast.loading(editRecord ? 'Updating Receiving Entry...' : 'Submitting Receiving Entry...')
    try {
      const payload = {
        date: formData.date,
        vendorName: formData.vendorName,
        invoiceAmt: parseFormattedAmount(formData.invoiceAmt),
        invoiceNumber: formData.invoiceNumber,
        mode: formData.mode,
        remarks: formData.remarks,
      }

      if (editRecord) {
        await peteService.updateReceivingEntry(editRecord.id, payload, imageFile, editRecord.imageLink)
        toast.success('Receiving Entry Updated!')
      } else {
        await peteService.insertReceivingEntry(payload, imageFile)
        toast.success('Receiving Entry Added!')
      }

      setFormData(emptyForm())
      setEditRecord(null)
      setImageFile(null)
      setFileInputKey(Date.now())
      setIsFormOpen(false)
      await loadRecords()
    } catch (err) {
      toast.error(err.message || (editRecord ? 'Update Failed' : 'Submission Failed'))
      console.error(err)
    } finally {
      toast.dismiss(loadingId)
      setIsSubmitting(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await peteService.deleteReceivingEntry(deleteTarget.id)
      toast.success('Receiving record removed successfully.')
      setDeleteTarget(null)
      await loadRecords()
    } catch (err) {
      toast.error(err.message || 'Delete Failed')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatEntryDate = (d) => {
    if (!d) return '-'
    try {
      const parsed = parseISO(d)
      if (!parsed || isNaN(parsed.getTime())) return d
      return format(parsed, 'dd/MM/yyyy')
    } catch {
      return d
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" />
        <p className="mt-2 text-slate-500">Loading receiving records...</p>
      </div>
    )
  }
  if (error) return <div className="p-8 text-center text-rose-600">Error: {error}</div>

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl font-bold">
            <List className="h-5 w-5 text-violet-600" /> Receiving Records
          </h2>
          <button onClick={handleOpenAddModal} className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-violet-200 w-full sm:w-auto flex items-center justify-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Receiving Entry
          </button>
        </div>
      </div>

      {/* Add / Edit Receiving Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden">
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                <FilePlus className="h-5 w-5 text-violet-500" />
                {editRecord ? 'Edit Receiving Entry' : 'New Receiving Entry'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} required className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</label>
                  <div className="flex gap-2">
                    <select value={formData.vendorName} onChange={(e) => setFormData((p) => ({ ...p, vendorName: e.target.value }))} className="flex-1 rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium">
                      <option value="">Select Vendor</option>
                      {dropdownOptions.vendorNames.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsVendorModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><PlusCircle className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm pointer-events-none">₹</span>
                    <input type="text" inputMode="decimal" placeholder="0.00" value={formData.invoiceAmt} onChange={(e) => handleInvoiceAmtChange(e.target.value)} className="w-full pl-8 pr-3 rounded-xl h-11 border border-slate-200 font-mono font-bold text-slate-800 text-sm" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Number</label>
                  <input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData((p) => ({ ...p, invoiceNumber: e.target.value }))} className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm font-medium" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Mode</label>
                  <select value={formData.mode} onChange={(e) => setFormData((p) => ({ ...p, mode: e.target.value }))} className="w-full rounded-xl h-11 px-3 border border-slate-200 bg-white text-sm font-medium">
                    <option value="">Select Mode</option>
                    {dropdownOptions.modes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</label>
                  <input type="text" value={formData.remarks} onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))} className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm font-medium" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {editRecord?.imageLink ? 'Replace Attachment File (Optional)' : 'Attachment File (Optional)'}
                  </label>
                  <input key={fileInputKey} type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full rounded-xl h-11 px-3 border border-slate-200 text-sm" />
                  {editRecord?.imageLink && <p className="text-[11px] text-slate-400 mt-1">Current attachment document is preserved unless replaced.</p>}
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-md shadow-violet-200 w-full sm:w-auto disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : editRecord ? 'Save Changes' : 'Add Entry'}
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
            <p className="text-sm text-slate-600 mb-3">Are you sure you want to delete this receiving record?</p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-medium mb-3">
              <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-slate-700">{formatEntryDate(deleteTarget.date)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Vendor:</span><span className="text-slate-700 font-bold">{deleteTarget.vendorName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Invoice #:</span><span className="text-slate-700">{deleteTarget.invoiceNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount:</span><span className="text-violet-700 font-bold font-mono">₹{deleteTarget.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <p className="text-rose-600 text-xs font-semibold mb-5">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteRecord} disabled={isDeleting} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Delete Record'}
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
                <span className="truncate">{isPdfFile(previewImageUrl) ? 'Receiving Invoice PDF Document' : 'Receiving Invoice Attachment'}</span>
              </h3>
              <button onClick={() => setPreviewImageUrl(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="py-2 flex justify-center items-center bg-slate-50/80 rounded-xl border border-slate-100 min-h-[220px] max-h-[60vh] overflow-hidden">
              {isPdfFile(previewImageUrl) ? (
                <iframe src={previewImageUrl} className="w-full h-[55vh] rounded-lg border border-slate-200 bg-white" title="PDF Document Preview" />
              ) : !hasPreviewError ? (
                <img src={previewImageUrl} alt="Receiving Attachment" onError={() => setHasPreviewError(true)} className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-200" />
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

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden p-3 sm:p-6 space-y-4">
        <div className="bg-violet-50/70 border border-violet-100/80 rounded-xl p-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-slate-800 text-sm md:text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-500" /> History ({visibleRecords.length})
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="relative w-full sm:w-44">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="w-full pl-9 pr-2 rounded-xl h-10 text-sm border border-slate-200 bg-white">
                  <option value="all">All Vendors</option>
                  {tableVendors.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 w-full sm:w-32" title="From date" />
                <span className="text-slate-400 text-xs">to</span>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 w-full sm:w-32" title="To date" />
              </div>

              <div className="relative w-full sm:flex-1 sm:min-w-[180px] lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-2 rounded-xl h-10 border border-slate-200 text-sm" />
              </div>

              {isFilterActive && (
                <button onClick={handleClearAllFilters} className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-2 border border-rose-100 bg-rose-50/30 w-full sm:w-auto">
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {isRecordsLoading ? (
            <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /><p className="text-xs text-slate-400 mt-2">Loading receiving records...</p></div>
          ) : visibleRecords.length > 0 ? (
            visibleRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm transition-colors">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{formatEntryDate(rec.date)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{rec.timestamp || '-'}</span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">{rec.mode}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate">{rec.vendorName}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Invoice: <span className="font-semibold text-slate-700">{rec.invoiceNumber || '-'}</span></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs uppercase font-black tracking-widest text-slate-400">Amount</div>
                    <div className="text-sm sm:text-base font-mono font-black text-violet-700">₹{rec.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
                {rec.remarks && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                    <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                    <span className="truncate">{rec.remarks}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                  <div>
                    {rec.imageLink ? (
                      <button type="button" onClick={() => openPreviewModal(rec.imageLink)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200/60 shadow-sm shrink-0">
                        {isPdfFile(rec.imageLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        <span>View Doc</span>
                      </button>
                    ) : <span className="text-[10px] text-slate-300 italic">No doc</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleOpenEditModal(rec)} title="Edit record" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-100">
                      <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(rec)} title="Delete record" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100">
                      <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">No records found matching your filters.</div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto w-full max-h-[600px]">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
              <tr className="border-b border-violet-100">
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Timestamp</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Entry Date</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Invoice #</th>
                <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Amount</th>
                <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
                <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {isRecordsLoading ? (
                <tr><td colSpan={8} className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /></td></tr>
              ) : visibleRecords.length > 0 ? (
                visibleRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 sm:p-4 text-slate-500 text-xs">{rec.timestamp || '-'}</td>
                    <td className="p-3 sm:p-4 text-slate-600 font-medium">{formatEntryDate(rec.date)}</td>
                    <td className="p-3 sm:p-4 font-bold text-slate-800">{rec.vendorName}</td>
                    <td className="p-3 sm:p-4 text-slate-600">{rec.invoiceNumber}</td>
                    <td className="p-3 sm:p-4 text-right font-mono font-bold text-violet-700">₹{rec.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 sm:p-4"><span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">{rec.mode}</span></td>
                    <td className="p-3 sm:p-4 text-center">
                      {rec.imageLink ? (
                        <button type="button" onClick={() => openPreviewModal(rec.imageLink)} title="Click to view attachment" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200/60 shadow-sm">
                          {isPdfFile(rec.imageLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <span>View</span>
                        </button>
                      ) : <span className="text-slate-300 text-xs">-</span>}
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => handleOpenEditModal(rec)} title="Edit record" className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(rec)} title="Delete record" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">No records found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PeteReceivingPage
