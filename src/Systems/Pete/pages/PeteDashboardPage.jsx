import React, { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  FileText, TrendingUp, TrendingDown, LayoutDashboard, Loader2, List, Search, X,
  ChevronDown, Calendar as CalendarIcon, Users, Target, Wallet,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { peteService } from '../services/peteService'

const formatXAxisDate = (tickItem) => {
  if (!tickItem) return ''
  const date = new Date(tickItem)
  if (isNaN(date.getTime())) return tickItem
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
}

const formatExactIndian = (value) => (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const formatAbbreviatedIndian = (value) => {
  const abs = Math.abs(value)
  if (abs >= 10000000) return (value / 10000000).toFixed(2) + ' Cr'
  if (abs >= 100000) return (value / 100000).toFixed(2) + ' L'
  if (abs >= 1000) return (value / 1000).toFixed(1) + ' K'
  return (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-violet-100 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-violet-100/80 bg-violet-50/70 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>{children}</h3>
)
const CardContent = ({ children, className = '' }) => <div className={`p-4 sm:p-5 ${className}`}>{children}</div>

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-violet-50 text-violet-600 border border-violet-100',
    secondary: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${variants[variant] || variants.default}`}>{children}</span>
}

export function PeteDashboardPage() {
  const { currentUser, isAdmin } = useAuth()
  const admin = isAdmin()
  const myName = currentUser?.full_name || currentUser?.username || ''

  const [allTransactions, setAllTransactions] = useState([])
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', vendorName: 'all', mode: 'all', search: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const txs = await peteService.fetchTransactions()
        setAllTransactions(txs)
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

    const baseTxs = admin ? allTransactions : allTransactions.filter((t) => t.personName === myName)

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
  }, [allTransactions, admin, myName])

  const filteredTransactions = useMemo(() => {
    let rows = admin ? allTransactions : allTransactions.filter((t) => t.personName === myName)

    return rows.filter((t) => {
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo && t.date > filters.dateTo) return false
      if (filters.personName !== 'all' && t.personName !== filters.personName) return false
      if (filters.groupHead !== 'all' && t.groupHead !== filters.groupHead) return false
      if (filters.mode !== 'all' && t.mode !== filters.mode) return false
      if (filters.vendorName !== 'all' && t.vendorName !== filters.vendorName) return false
      if (filters.search.trim()) {
        const query = filters.search.trim().toLowerCase()
        const matches = [t.personName, t.groupHead, t.vendorName, t.remarks, t.mode, t.monthName, t.formattedDate, t.date].some((v) => v?.toLowerCase().includes(query))
        if (!matches) return false
      }
      return true
    })
  }, [allTransactions, filters, admin, myName])

  const handleFilterChange = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }))
  const clearFilters = () => setFilters({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', vendorName: 'all', mode: 'all', search: '' })

  const isFilterActive = useMemo(
    () => filters.dateFrom !== '' || filters.dateTo !== '' || filters.personName !== 'all' || filters.groupHead !== 'all' || filters.vendorName !== 'all' || filters.mode !== 'all' || filters.search.trim() !== '',
    [filters]
  )

  const totalIncoming = useMemo(() => filteredTransactions.reduce((sum, t) => sum + (t.incoming || 0), 0), [filteredTransactions])
  const totalOutgoing = useMemo(() => filteredTransactions.reduce((sum, t) => sum + (t.outgoing || 0), 0), [filteredTransactions])
  const balance = totalIncoming - totalOutgoing

  const timeSeriesData = useMemo(() => {
    const dailyData = new Map()
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let cumulativeBalance = 0
    sorted.forEach((t) => {
      const dateKey = t.date
      if (!dailyData.has(dateKey)) dailyData.set(dateKey, { date: dateKey, income: 0, expense: 0 })
      const entry = dailyData.get(dateKey)
      entry.income += t.incoming || 0
      entry.expense += t.outgoing || 0
    })
    return Array.from(dailyData.values()).map((d) => {
      cumulativeBalance += d.income - d.expense
      return { ...d, balance: cumulativeBalance }
    })
  }, [filteredTransactions])

  const expenseByGroupHeadData = useMemo(() => {
    const groupMap = new Map()
    filteredTransactions.forEach((t) => {
      if (t.outgoing > 0 && t.groupHead) {
        groupMap.set(t.groupHead, (groupMap.get(t.groupHead) || 0) + t.outgoing)
      }
    })
    return Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredTransactions])

  const totalExpenseByGroupHead = useMemo(() => expenseByGroupHeadData.reduce((sum, d) => sum + d.value, 0), [expenseByGroupHeadData])

  const pieExpenseData = useMemo(() => {
    if (totalExpenseByGroupHead <= 0) return []
    return [...expenseByGroupHeadData].sort((a, b) => b.value - a.value).map((item) => ({ ...item, percent: (item.value / totalExpenseByGroupHead) * 100 }))
  }, [expenseByGroupHeadData, totalExpenseByGroupHead])

  const MAX_VISIBLE_LEGEND_ITEMS = 5
  const majorExpenseItems = useMemo(() => pieExpenseData.slice(0, MAX_VISIBLE_LEGEND_ITEMS), [pieExpenseData])
  const minorExpenseItems = useMemo(() => pieExpenseData.slice(MAX_VISIBLE_LEGEND_ITEMS), [pieExpenseData])
  const minorExpensePercentTotal = useMemo(() => minorExpenseItems.reduce((sum, item) => sum + item.percent, 0), [minorExpenseItems])

  const recentTransactions = useMemo(() => filteredTransactions.slice(0, 8), [filteredTransactions])

  const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1']
  const getPieColor = (index) => PIE_COLORS[index % PIE_COLORS.length]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-violet-600 mb-4" />
        <span className="text-base text-slate-600 font-bold animate-pulse">Loading Dashboard...</span>
        <span className="text-xs text-slate-400 mt-1">Fetching metrics and financial charts</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 text-center bg-rose-50 border border-rose-100 rounded-2xl">
        <p className="font-bold text-rose-800 text-lg mb-2">Dashboard Error</p>
        <p className="text-rose-600/80 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full">
      {/* Header Banner with Inline Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-violet-600 text-white rounded-xl shadow-md shadow-violet-200"><LayoutDashboard className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pete Dashboard</h1>
                <p className="text-[11px] text-slate-500 font-medium">Live summary of income, expenses, cash balances and activity</p>
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
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search entries..."
                  className="w-full h-10 pl-9 pr-8 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 shadow-xs"
                />
                {filters.search && (
                  <button onClick={() => handleFilterChange('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                )}
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="border-emerald-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Income</p>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-600">₹{formatExactIndian(totalIncoming)}</h2>
              <p className="text-[11px] text-emerald-700/70 font-semibold">{formatAbbreviatedIndian(totalIncoming)} collections</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0"><TrendingUp className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expense</p>
              <h2 className="text-xl sm:text-2xl font-black text-rose-600">₹{formatExactIndian(totalOutgoing)}</h2>
              <p className="text-[11px] text-rose-700/70 font-semibold">{formatAbbreviatedIndian(totalOutgoing)} disbursements</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0"><TrendingDown className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className={`${balance >= 0 ? 'border-violet-100' : 'border-amber-100'} hover:shadow-md transition-all duration-300`}>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{balance >= 0 ? 'Net Surplus' : 'Net Deficit'}</p>
              <h2 className={`text-xl sm:text-2xl font-black ${balance >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>₹{formatExactIndian(Math.abs(balance))}</h2>
              <p className={`text-[11px] font-semibold ${balance >= 0 ? 'text-violet-700/70' : 'text-amber-700/70'}`}>{balance >= 0 ? 'Positive cash flow' : 'Expenses exceed income'}</p>
            </div>
            <div className={`p-3 rounded-2xl shrink-0 ${balance >= 0 ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}><Wallet className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 hover:shadow-md transition-all duration-300">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transactions</p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">{filteredTransactions.length}</h2>
              <p className="text-[11px] text-slate-400 font-semibold">{allTransactions.length} total recorded</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shrink-0"><FileText className="h-6 w-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-3 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle><TrendingUp className="w-4 h-4 text-violet-600" /> Income, Expense & Balance Trend</CardTitle>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timeSeriesData.length} timeline points</span>
          </CardHeader>
          <CardContent className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={formatXAxisDate} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  width={60}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => (Math.abs(value) >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : Math.abs(value) >= 1000 ? `₹${(value / 1000).toFixed(0)}K` : `₹${value}`)}
                />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="balance" name="Balance" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle><Target className="w-4 h-4 text-violet-600" /> Expense by Group Head</CardTitle>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pieExpenseData.length} categories</span>
          </CardHeader>
          <CardContent className="h-72 sm:h-80 flex flex-col items-center justify-center">
            {pieExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie data={pieExpenseData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {pieExpenseData.map((_, i) => <Cell key={`cell-${i}`} fill={getPieColor(i)} />)}
                  </Pie>
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                    content={() => (
                      <ul className="ml-2 sm:ml-4 text-[11px] sm:text-xs text-slate-600 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {majorExpenseItems.map((item, i) => (
                          <li key={`legend-major-${item.name}-${i}`} className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: getPieColor(i) }} />
                            <span className="truncate max-w-[90px] sm:max-w-[110px] font-medium">
                              {item.name}<span className="ml-1 text-slate-400 font-bold">({Math.round(item.percent)}%)</span>
                            </span>
                          </li>
                        ))}
                        {minorExpenseItems.length > 0 && (
                          <li className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 shrink-0" />
                            <span className="truncate max-w-[90px] sm:max-w-[110px] font-medium">
                              Others ({minorExpenseItems.length})<span className="ml-1 font-bold">({Math.round(minorExpensePercentTotal)}%)</span>
                            </span>
                          </li>
                        )}
                      </ul>
                    )}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs italic space-y-1">
                <Target className="h-8 w-8 text-slate-300" />
                <p>No expense data for the selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle><List className="w-4 h-4 text-violet-500" /> Recent Transactions</CardTitle>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-violet-100/70 text-violet-700 px-2.5 py-1 rounded-full">Showing latest {recentTransactions.length} entries</span>
        </CardHeader>
        <CardContent className="!p-0">
          {/* Mobile */}
          <div className="block md:hidden p-3 space-y-2.5">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <div key={t.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/50 border border-slate-200/80 rounded-xl space-y-2.5 shadow-sm transition-colors">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{t.formattedDate}</span>
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
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                      <span className="truncate">{t.remarks}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">No recent transactions found matching the filter criteria.</div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto w-full max-h-[420px] custom-scrollbar">
            <table className="w-full text-sm min-w-[650px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-violet-100">
                <tr>
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
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4 text-slate-600 font-medium">{t.formattedDate}</td>
                      {admin && <td className="p-3 sm:p-4 text-slate-800 font-bold">{t.personName}</td>}
                      <td className="p-3 sm:p-4"><Badge>{t.groupHead || '-'}</Badge></td>
                      <td className="p-3 sm:p-4 font-medium text-slate-700">{t.vendorName || '-'}</td>
                      <td className="p-3 sm:p-4"><Badge variant="secondary">{t.mode || '-'}</Badge></td>
                      <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '-'}</td>
                      <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '-'}</td>
                      <td className="p-3 sm:p-4 text-slate-600 max-w-[160px] truncate" title={t.remarks}>{t.remarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={admin ? 8 : 7} className="p-8 text-center text-slate-400 italic">No recent transactions found matching the filter criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PeteDashboardPage
