import React, { useState, useEffect, useMemo } from 'react'
import {
  Target, CreditCard, Calendar, Users, Loader2, X, ChevronRight, ChevronDown,
  BarChart3, Search, TrendingUp, TrendingDown, LayoutDashboard, Store, Layers,
  Wallet, ArrowLeft, FileText,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { peteService } from '../services/peteService'
import { formatExactIndian, formatAbbreviatedIndian } from '../utils/peteFormat'

const Card = ({ children, className = '', ...props }) => (
  <div {...props} className={`bg-white border border-violet-100 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }) => <div className={`px-5 py-4 border-b border-violet-100/80 bg-violet-50/70 ${className}`}>{children}</div>
const CardTitle = ({ children, className = '' }) => <h3 className={`font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>{children}</h3>
const CardContent = ({ children, className = '' }) => <div className={`p-4 sm:p-5 ${className}`}>{children}</div>

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-violet-50 text-violet-600 border border-violet-100',
    secondary: 'bg-slate-100 text-slate-500 border border-slate-200',
  }
  return <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${variants[variant] || variants.default}`}>{children}</span>
}

// --- DETAIL DRILL-DOWN VIEW ---
function ReportDetailView({ detail, onBack, admin }) {
  const [tableSearch, setTableSearch] = useState('')

  const totalIncoming = detail.data.reduce((sum, t) => sum + t.incoming, 0)
  const totalOutgoing = detail.data.reduce((sum, t) => sum + t.outgoing, 0)
  const balance = totalIncoming - totalOutgoing

  const filteredData = useMemo(() => {
    const query = tableSearch.trim().toLowerCase()
    if (!query) return detail.data
    return detail.data.filter(
      (t) =>
        t.date?.toLowerCase().includes(query) ||
        t.personName?.toLowerCase().includes(query) ||
        t.groupHead?.toLowerCase().includes(query) ||
        (t.vendorName && t.vendorName.toLowerCase().includes(query)) ||
        t.mode?.toLowerCase().includes(query) ||
        (t.remarks && t.remarks.toLowerCase().includes(query)) ||
        t.incoming?.toString().includes(query) ||
        t.outgoing?.toString().includes(query)
    )
  }, [detail.data, tableSearch])

  const typeLabel = { groupHead: 'Group: ', vendor: 'Vendor: ', mode: 'Mode: ', month: 'Month: ', person: 'Person: ' }[detail.type] || ''

  const MetricCard = ({ label, value, icon: Icon, colorClass, bgClass, iconBgClass }) => (
    <Card className={`${bgClass} border-0`}>
      <CardContent className="flex justify-between items-center">
        <div className="space-y-1">
          <div className={`text-2xl font-black ${colorClass} tracking-tight`}>{formatExactIndian(value)}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400/80">{label}</div>
        </div>
        <div className={`p-4 rounded-2xl ${iconBgClass}`}><Icon className={`h-6 w-6 ${colorClass}`} /></div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  {typeLabel}<span className="text-violet-600">{detail.value}</span>
                </h1>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-7">{detail.data.length} total transactions in this selection</p>
            </div>
            <button onClick={onBack} className="h-10 px-4 rounded-xl text-xs bg-white/70 border border-violet-200 hover:bg-violet-50 w-full sm:w-auto flex items-center justify-center font-bold text-slate-700">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reports
            </button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <MetricCard label="Total Income" value={totalIncoming} icon={TrendingUp} colorClass="text-emerald-600" bgClass="bg-emerald-50/50" iconBgClass="bg-emerald-100/50" />
        <MetricCard label="Total Expense" value={totalOutgoing} icon={TrendingDown} colorClass="text-rose-600" bgClass="bg-rose-50/50" iconBgClass="bg-rose-100/50" />
        <MetricCard
          label={balance >= 0 ? 'Net Balance' : 'Net Deficit'} value={Math.abs(balance)} icon={LayoutDashboard}
          colorClass={balance >= 0 ? 'text-violet-600' : 'text-amber-600'}
          bgClass={balance >= 0 ? 'bg-violet-50/50' : 'bg-amber-50/50'}
          iconBgClass={balance >= 0 ? 'bg-violet-100/50' : 'bg-amber-100/50'}
        />
      </div>

      <Card>
        <CardHeader className="p-3 sm:px-4 sm:py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm md:text-base">Detailed Transactions ({filteredData.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <input
                type="text" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search transactions..."
                className="w-full h-9 pl-3 pr-8 text-xs rounded-xl bg-white border border-violet-200/80 focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700"
              />
              {tableSearch && (
                <button onClick={() => setTableSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="block md:hidden p-3 space-y-3">
            {filteredData.length > 0 ? (
              filteredData.map((t) => (
                <div key={t.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm transition-colors">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{new Date(t.date).toLocaleDateString('en-GB')}</span>
                      {admin && <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">{t.personName}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.groupHead && <Badge>{t.groupHead}</Badge>}
                      {t.mode && <Badge variant="secondary">{t.mode}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Vendor</div>
                      <div className="text-xs font-bold text-slate-800 truncate">{t.vendorName || '-'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {t.incoming > 0 && <div className="text-emerald-600 font-bold text-sm">+₹{t.incoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>}
                      {t.outgoing > 0 && <div className="text-rose-600 font-bold text-sm">-₹{t.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>}
                      {t.incoming === 0 && t.outgoing === 0 && <div className="text-slate-400 text-xs font-medium">₹0</div>}
                    </div>
                  </div>
                  {t.remarks && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                      <span className="truncate">{t.remarks}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">No transactions found matching the filter criteria.</div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto w-full max-h-[500px] custom-scrollbar">
            <table className="w-full text-sm min-w-[650px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-20">
                <tr className="border-b border-violet-100">
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                  {admin && <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Incoming</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Outgoing</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4 text-slate-600 font-medium">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                      {admin && <td className="p-3 sm:p-4 text-slate-800 font-bold">{t.personName}</td>}
                      <td className="p-3 sm:p-4"><Badge>{t.groupHead || '-'}</Badge></td>
                      <td className="p-3 sm:p-4 font-medium text-slate-700">{t.vendorName || '-'}</td>
                      <td className="p-3 sm:p-4"><Badge variant="secondary">{t.mode || '-'}</Badge></td>
                      <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '-'}</td>
                      <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '-'}</td>
                      <td className="p-3 sm:p-4 text-slate-600 max-w-[160px] truncate" title={t.remarks || '-'}>{t.remarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={admin ? 8 : 7} className="p-8 sm:p-12 text-center text-slate-400 italic">No transactions found matching the filter criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- CATEGORY BREAKDOWN VIEW ---
function ReportsBreakdownView({ admin, myName, onDetailClick }) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', vendorName: 'all', mode: 'all' })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const txs = await peteService.fetchTransactions()
        setTransactions(txs)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const dropdownOptions = useMemo(() => {
    const persons = new Set()
    const groupHeads = new Set()
    const vendors = new Set()
    const modes = new Set()

    const baseTxs = admin ? transactions : transactions.filter((t) => t.personName === myName)
    baseTxs.forEach((t) => {
      if (t.personName?.trim()) persons.add(t.personName.trim())
      if (t.groupHead?.trim()) groupHeads.add(t.groupHead.trim())
      if (t.vendorName?.trim()) vendors.add(t.vendorName.trim())
      if (t.mode?.trim()) modes.add(t.mode.trim())
    })

    return {
      personNames: Array.from(persons).sort((a, b) => a.localeCompare(b)),
      groupHeads: Array.from(groupHeads).sort((a, b) => a.localeCompare(b)),
      vendorNames: Array.from(vendors).sort((a, b) => a.localeCompare(b)),
      modes: Array.from(modes).sort((a, b) => a.localeCompare(b)),
    }
  }, [transactions, admin, myName])

  const userTransactions = useMemo(() => {
    let base = admin ? transactions : transactions.filter((t) => t.personName === myName)
    return base.filter((t) => {
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo && t.date > filters.dateTo) return false
      if (filters.personName !== 'all' && t.personName !== filters.personName) return false
      if (filters.groupHead !== 'all' && t.groupHead !== filters.groupHead) return false
      if (filters.mode !== 'all' && t.mode !== filters.mode) return false
      if (filters.vendorName !== 'all' && t.vendorName !== filters.vendorName) return false
      return true
    })
  }, [transactions, admin, myName, filters])

  const handleFilterChange = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }))
  const clearFilters = () => setFilters({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', vendorName: 'all', mode: 'all' })

  const isFilterActive = useMemo(
    () => !!filters.dateFrom || !!filters.dateTo || filters.personName !== 'all' || filters.groupHead !== 'all' || filters.vendorName !== 'all' || filters.mode !== 'all',
    [filters]
  )

  const totals = useMemo(
    () => userTransactions.reduce((acc, t) => { acc.incoming += t.incoming || 0; acc.outgoing += t.outgoing || 0; acc.count++; return acc }, { incoming: 0, outgoing: 0, count: 0 }),
    [userTransactions]
  )
  const netBalance = totals.incoming - totals.outgoing

  const analysisData = useMemo(() => {
    const monthlyAcc = {}, groupHeadAcc = {}, vendorAcc = {}, modeAcc = {}, personAcc = {}

    userTransactions.forEach((t) => {
      const monthKey = t.monthName || 'Unknown Month'
      if (!monthlyAcc[monthKey]) monthlyAcc[monthKey] = { incoming: 0, outgoing: 0, count: 0 }
      monthlyAcc[monthKey].incoming += t.incoming || 0; monthlyAcc[monthKey].outgoing += t.outgoing || 0; monthlyAcc[monthKey].count++

      const groupKey = t.groupHead?.trim() || 'Uncategorized'
      if (!groupHeadAcc[groupKey]) groupHeadAcc[groupKey] = { incoming: 0, outgoing: 0, count: 0 }
      groupHeadAcc[groupKey].incoming += t.incoming || 0; groupHeadAcc[groupKey].outgoing += t.outgoing || 0; groupHeadAcc[groupKey].count++

      const vendorKey = t.vendorName?.trim() ? t.vendorName.trim() : 'No Vendor'
      if (!vendorAcc[vendorKey]) vendorAcc[vendorKey] = { incoming: 0, outgoing: 0, count: 0 }
      vendorAcc[vendorKey].incoming += t.incoming || 0; vendorAcc[vendorKey].outgoing += t.outgoing || 0; vendorAcc[vendorKey].count++

      const modeKey = t.mode?.trim() || 'Unknown'
      if (!modeAcc[modeKey]) modeAcc[modeKey] = { incoming: 0, outgoing: 0, count: 0 }
      modeAcc[modeKey].incoming += t.incoming || 0; modeAcc[modeKey].outgoing += t.outgoing || 0; modeAcc[modeKey].count++

      const personKey = t.personName?.trim() || 'Unknown User'
      if (!personAcc[personKey]) personAcc[personKey] = { incoming: 0, outgoing: 0, count: 0 }
      personAcc[personKey].incoming += t.incoming || 0; personAcc[personKey].outgoing += t.outgoing || 0; personAcc[personKey].count++
    })

    const sortByVolume = (entries) => entries.sort((a, b) => (b[1].outgoing + b[1].incoming) - (a[1].outgoing + a[1].incoming))

    return {
      monthly: sortByVolume(Object.entries(monthlyAcc)),
      groupHead: sortByVolume(Object.entries(groupHeadAcc)),
      vendor: sortByVolume(Object.entries(vendorAcc)),
      mode: sortByVolume(Object.entries(modeAcc)),
      person: sortByVolume(Object.entries(personAcc)),
    }
  }, [userTransactions])

  const handleDetailClick = (type, value) => {
    let filteredData = []
    switch (type) {
      case 'groupHead': filteredData = userTransactions.filter((t) => (t.groupHead?.trim() || 'Uncategorized') === value); break
      case 'vendor': filteredData = userTransactions.filter((t) => (t.vendorName?.trim() || 'No Vendor') === value); break
      case 'mode': filteredData = userTransactions.filter((t) => (t.mode?.trim() || 'Unknown') === value); break
      case 'month': filteredData = userTransactions.filter((t) => (t.monthName || 'Unknown Month') === value); break
      case 'person': filteredData = userTransactions.filter((t) => (t.personName?.trim() || 'Unknown User') === value); break
      default: break
    }
    onDetailClick({ type, value, data: filteredData })
  }

  const allCards = useMemo(() => {
    const list = [
      { id: 'vendor', title: 'Vendor-wise Analysis', subtitle: 'Suppliers & service providers', icon: Store, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', data: analysisData.vendor, type: 'vendor', adminOnly: false },
      { id: 'groupHead', title: 'Group Head Analysis', subtitle: 'Expense & income categories', icon: Target, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10', data: analysisData.groupHead, type: 'groupHead', adminOnly: false },
      { id: 'month', title: 'Monthly Analysis', subtitle: 'Month-by-month cash flow', icon: Calendar, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', data: analysisData.monthly, type: 'month', adminOnly: false },
      { id: 'mode', title: 'Payment Mode Analysis', subtitle: 'Cash, Bank, UPI & other modes', icon: CreditCard, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', data: analysisData.mode, type: 'mode', adminOnly: false },
      { id: 'person', title: 'Person-wise Analysis', subtitle: 'Individual entries & handling', icon: Users, colorClass: 'text-fuchsia-500', bgClass: 'bg-fuchsia-500/10', data: analysisData.person, type: 'person', adminOnly: true },
    ]
    return list.filter((c) => !c.adminOnly || admin)
  }, [analysisData, admin])

  const tabs = useMemo(
    () => [{ id: 'all', label: 'All Categories', icon: Layers, count: allCards.length }, ...allCards.map((c) => ({ id: c.id, label: c.title.replace(' Analysis', ''), icon: c.icon, count: c.data.length }))],
    [allCards]
  )

  const visibleCards = useMemo(() => (selectedTab === 'all' ? allCards : allCards.filter((c) => c.id === selectedTab)), [allCards, selectedTab])

  const AnalysisCard = ({ title, subtitle, icon: Icon, colorClass, bgClass, data, type }) => {
    const q = searchQuery.trim().toLowerCase()
    const filteredRows = q ? data.filter(([key]) => key.toLowerCase().includes(q)) : data
    const categoryTotalOutgoing = data.reduce((sum, [, item]) => sum + item.outgoing, 0)

    return (
      <Card className="hover:border-violet-200 transition-all duration-300 flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass} shrink-0`}><Icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">{title}</CardTitle>
              {subtitle && <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100/80 text-violet-700 shrink-0">{data.length} {data.length === 1 ? 'item' : 'items'}</span>
        </CardHeader>
        <CardContent className="!p-3 sm:!p-4 flex-1 flex flex-col justify-between">
          <div className="max-h-[22rem] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {filteredRows.length > 0 ? (
              filteredRows.map(([key, itemData]) => {
                const outgoingPercentage = categoryTotalOutgoing > 0 ? Math.round((itemData.outgoing / categoryTotalOutgoing) * 100) : 0
                return (
                  <div key={key} onClick={() => handleDetailClick(type, key)} title={`Click to view detailed transactions for ${key}`} className="p-3 sm:p-3.5 rounded-xl bg-slate-50/60 hover:bg-violet-50/80 border border-slate-100 hover:border-violet-200 cursor-pointer transition-all duration-200 group gap-2 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 group-hover:border-violet-200 transition-colors shrink-0">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors uppercase tracking-tight text-xs truncate">{key}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{itemData.count} {itemData.count === 1 ? 'entry' : 'entries'}</span>
                            {outgoingPercentage > 0 && <span className="text-[9px] text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">{outgoingPercentage}% of exp</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2 space-y-0.5">
                        {itemData.incoming > 0 && <div className="text-emerald-600 font-bold text-xs sm:text-sm">+₹{formatExactIndian(itemData.incoming)}</div>}
                        {itemData.outgoing > 0 && <div className="text-rose-600 font-bold text-xs sm:text-sm">-₹{formatExactIndian(itemData.outgoing)}</div>}
                        {itemData.incoming === 0 && itemData.outgoing === 0 && <div className="text-slate-400 font-medium text-xs">₹0</div>}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic space-y-1">
                <p>No matching records found</p>
                {q && <p className="text-[10px] text-slate-300">Try clearing the search filter</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" />
        <span className="text-base text-slate-600 font-bold animate-pulse">Compiling financial reports...</span>
        <span className="text-xs text-slate-400 mt-1">Aggregating vendors, groups, modes and timelines</span>
      </div>
    )
  }
  if (error) return <div className="p-8 text-center text-rose-600">Error: {error}</div>

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-violet-600 text-white rounded-xl shadow-md shadow-violet-200"><BarChart3 className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Financial Reports & Analysis</h1>
                <p className="text-[11px] text-slate-500 font-medium">Breakdowns across Vendors, Group Heads, Months, Payment Modes, and Personnel</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2.5 border-t border-violet-100/70">
              {admin && (
                <div className="relative w-full sm:w-36 md:w-40">
                  <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                  <select value={filters.personName} onChange={(e) => handleFilterChange('personName', e.target.value)} className="w-full pl-8 pr-2 rounded-xl h-10 text-xs bg-white border border-slate-200 shadow-xs">
                    <option value="all">All Persons</option>
                    {dropdownOptions.personNames.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <select value={filters.groupHead} onChange={(e) => handleFilterChange('groupHead', e.target.value)} className="w-full sm:w-36 md:w-40 rounded-xl h-10 text-xs bg-white border border-slate-200 shadow-xs px-2">
                <option value="all">All Group Heads</option>
                {dropdownOptions.groupHeads.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={filters.vendorName} onChange={(e) => handleFilterChange('vendorName', e.target.value)} className="w-full sm:w-36 md:w-40 rounded-xl h-10 text-xs bg-white border border-slate-200 shadow-xs px-2">
                <option value="all">All Vendors</option>
                {dropdownOptions.vendorNames.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filters.mode} onChange={(e) => handleFilterChange('mode', e.target.value)} className="w-full sm:w-32 rounded-xl h-10 text-xs bg-white border border-slate-200 shadow-xs px-2">
                <option value="all">All Modes</option>
                {dropdownOptions.modes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 bg-white w-full sm:w-32" title="From date" />
                <span className="text-slate-400 text-xs">to</span>
                <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="h-10 px-2.5 rounded-xl text-xs border border-slate-200 bg-white w-full sm:w-32" title="To date" />
              </div>

              <div className="relative flex-1 min-w-[150px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search in cards..." className="w-full h-10 pl-9 pr-8 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 shadow-xs" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
              </div>

              {isFilterActive && (
                <button onClick={clearFilters} className="h-10 px-3.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 shadow-xs shrink-0">
                  <X className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="border-emerald-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Incoming</p>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-600">₹{formatExactIndian(totals.incoming)}</h2>
              <p className="text-[11px] text-emerald-700/70 font-semibold">{formatAbbreviatedIndian(totals.incoming)} total collections</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0"><TrendingUp className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-rose-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outgoing</p>
              <h2 className="text-xl sm:text-2xl font-black text-rose-600">₹{formatExactIndian(totals.outgoing)}</h2>
              <p className="text-[11px] text-rose-700/70 font-semibold">{formatAbbreviatedIndian(totals.outgoing)} total expenses</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0"><TrendingDown className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card className={`${netBalance >= 0 ? 'border-violet-100' : 'border-amber-100'} hover:shadow-md transition-all duration-300`}>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{netBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}</p>
              <h2 className={`text-xl sm:text-2xl font-black ${netBalance >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>₹{formatExactIndian(Math.abs(netBalance))}</h2>
              <p className={`text-[11px] font-semibold ${netBalance >= 0 ? 'text-violet-700/70' : 'text-amber-700/70'}`}>{netBalance >= 0 ? 'Positive cash balance' : 'Expenses exceed income'}</p>
            </div>
            <div className={`p-3 rounded-2xl shrink-0 ${netBalance >= 0 ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}><Wallet className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transactions</p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">{totals.count}</h2>
              <p className="text-[11px] text-slate-400 font-semibold">Analyzed entries</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shrink-0"><LayoutDashboard className="h-6 w-6" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = selectedTab === tab.id
          return (
            <button
              key={tab.id} onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${isActive ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700 border border-violet-100/80'}`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
            </button>
          )
        })}
      </div>

      <div className={`grid gap-4 sm:gap-6 pb-8 ${visibleCards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {visibleCards.map((card, index) => (
          <div key={card.id} className={selectedTab === 'all' && index === visibleCards.length - 1 && visibleCards.length % 2 !== 0 ? 'lg:col-span-2' : ''}>
            <AnalysisCard {...card} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PeteReportsPage() {
  const { currentUser, isAdmin } = useAuth()
  const admin = isAdmin()
  const myName = currentUser?.full_name || currentUser?.username || ''
  const [detailViewData, setDetailViewData] = useState(null)

  return detailViewData ? (
    <ReportDetailView detail={detailViewData} onBack={() => setDetailViewData(null)} admin={admin} />
  ) : (
    <ReportsBreakdownView admin={admin} myName={myName} onDetailClick={setDetailViewData} />
  )
}

export default PeteReportsPage
