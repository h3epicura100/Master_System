import React, { useState, useEffect, useMemo } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  FolderTree,
  HelpCircle,
  Store,
} from 'lucide-react'
import { masterDataService } from '../../../services/masterDataService'

const CATEGORIES = [
  { id: 'person', label: 'Persons', icon: Users, desc: 'Team members & employees' },
  { id: 'mode', label: 'Payment Modes', icon: CreditCard, desc: 'Cash, Bank, Credit, etc.' },
  { id: 'group_head', label: 'Group Heads', icon: FolderTree, desc: 'Account heads & categories' },
  { id: 'reason', label: 'Reasons', icon: HelpCircle, desc: 'Transaction purposes & remarks' },
  { id: 'vendor', label: 'Vendors', icon: Store, desc: 'Suppliers & business partners' },
]

export function PeteMasterPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('person')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [message, setMessage] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const res = await masterDataService.getPeteMasters()
    if (res.success) {
      setItems(res.data)
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to load master items' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.category === activeTab &&
        item.value.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
  }, [items, activeTab, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts = {}
    CATEGORIES.forEach((c) => {
      counts[c.id] = items.filter((i) => i.category === c.id).length
    })
    return counts
  }, [items])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newValue.trim()) return

    setAdding(true)
    setMessage(null)

    const res = await masterDataService.addPeteMaster(activeTab, newValue.trim())
    if (res.success) {
      setMessage({ type: 'success', text: `Added "${newValue.trim()}" successfully!` })
      setNewValue('')
      await loadData()
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to add item' })
    }
    setAdding(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setMessage(null)

    const res = await masterDataService.deletePeteMaster(deleteTarget.id)
    if (res.success) {
      setMessage({ type: 'success', text: `Deleted "${deleteTarget.value}" successfully!` })
      setDeleteTarget(null)
      await loadData()
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to delete item' })
    }
    setDeleting(false)
  }

  const currentCategoryObj = CATEGORIES.find((c) => c.id === activeTab)

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-teal-100 rounded-2xl text-teal-700 shrink-0">
            <Database className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Pete Master Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Manage persons, payment modes, group heads, reasons & vendors
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline opacity-80 shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeTab === cat.id
          const count = categoryCounts[cat.id] || 0

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id)
                setSearchQuery('')
              }}
              className={`flex flex-col items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 ${
                isActive
                  ? 'bg-white border-teal-500 shadow-md shadow-teal-500/10 ring-2 ring-teal-500/20'
                  : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5 sm:mb-2">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                    isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </div>
              <span className={`font-bold text-xs sm:text-sm ${isActive ? 'text-teal-900' : 'text-slate-700'}`}>
                {cat.label}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Active Tab Header + Add Form */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{currentCategoryObj?.label}</span>
              <span className="text-xs font-normal text-slate-400">({filteredItems.length} items)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">{currentCategoryObj?.desc}</p>
          </div>

          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <input
              type="text"
              placeholder={`Add new ${currentCategoryObj?.label.slice(0, -1) || 'item'}...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 lg:w-72 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-medium"
            />
            <button
              type="submit"
              disabled={adding || !newValue.trim()}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-200 shrink-0"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Option
            </button>
          </form>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
          />
        </div>

        {/* Items List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            <span className="text-sm font-semibold">Loading master options...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 sm:py-16 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <p className="text-sm sm:text-base font-semibold text-slate-600">No items found</p>
            <p className="text-xs sm:text-sm text-slate-400">
              {searchQuery ? `No items match "${searchQuery}"` : `No items added to ${currentCategoryObj?.label} yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-violet-50/40 hover:border-violet-200 transition-all gap-2"
              >
                <span className="font-semibold text-slate-800 text-sm truncate">{item.value}</span>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{deleteTarget.value}</strong> from{' '}
              <strong className="text-violet-700 capitalize">{deleteTarget.category}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-2 mb-5">
              Existing entries using this value will keep their recorded text, but this option will no longer appear in dropdown selection lists.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeteMasterPage
