import React, { useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  Utensils,
  Sliders,
  Database,
  ArrowLeftRight,
  CalendarDays,
  ClipboardList,
  Sparkles,
  MessageSquare,
  ChefHat,
  Tag,
  Shirt,
  Wheat,
  Apple,
  Milk,
  Store,
  Croissant,
  GlassWater,
  Users2,
  Truck,
  Flame,
  Flower2,
  ConciergeBell,
  Briefcase,
  BellRing,
  CalendarCheck,
  CreditCard,
  CheckSquare,
  Banknote,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePendingCounts } from '../../Systems/PMS/hooks/usePendingCounts'
import { staffStorageService } from '../../Systems/HRMS/services/hrmsStorageService'

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const { currentUser, isAdmin, canAccessSystem, canAccessPage, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pendingCounts = usePendingCounts()

  const hrmsPendingCounts = useMemo(() => {
    try {
      const advances = staffStorageService.getAdvances()
      const pendingAdv = advances.filter((a) => a.status === 'Pending').length
      const ot = staffStorageService.getOvertime()
      const pendingOt = ot.filter((o) => o.status === 'Pending').length
      return {
        approval: pendingAdv,
        overtime: pendingOt
      }
    } catch {
      return {}
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Get user initials
  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const hasPms = canAccessSystem('pms')
  const hasCrockery = canAccessSystem('ims')
  const hasHrms = canAccessSystem('hrms')

  const hrmsNavItems = [
    { name: 'Daily Attendance', path: '/hrms/attendance', icon: CalendarCheck, show: canAccessPage('hrms', 'attendance'), key: 'attendance' },
    { name: 'Staff Directory', path: '/hrms/directory', icon: Users, show: canAccessPage('hrms', 'directory'), key: 'directory' },
    { name: 'Performance & TAT', path: '/hrms/performance', icon: TrendingUp, show: canAccessPage('hrms', 'performance'), key: 'performance' },
    { name: 'Salary Advances', path: '/hrms/advances', icon: CreditCard, show: canAccessPage('hrms', 'advances'), key: 'advances' },
    { name: 'Advance Approval', path: '/hrms/approval', icon: CheckSquare, show: canAccessPage('hrms', 'approval'), key: 'approval' },
    { name: 'Overtime (OT)', path: '/hrms/overtime', icon: Clock, show: canAccessPage('hrms', 'overtime'), key: 'overtime' },
    { name: 'Monthly Payroll', path: '/hrms/payroll', icon: Banknote, show: canAccessPage('hrms', 'payroll'), key: 'payroll' },
  ].filter((item) => item.show)

  const pmsNavItems = [
    { name: 'H3MS Dashboard', path: '/pms/dashboard', icon: LayoutDashboard, show: canAccessPage('pms', 'dashboard'), key: 'dashboard' },
    { name: 'Booking Master', path: '/pms/bookings', icon: CalendarDays, show: canAccessPage('pms', 'bookings'), key: 'bookings' },
    { name: 'Menu Finalize', path: '/pms/menu-finalize', icon: ClipboardList, show: canAccessPage('pms', 'menuFinalize'), key: 'menuFinalize' },
    { name: 'Menu AI Chatbot', path: '/pms/menu-chatbot', icon: Sparkles, show: canAccessPage('pms', 'menuChatbot'), key: 'menuChatbot' },
    { name: 'WhatsApp Hub', path: '/pms/whatsapp', icon: MessageSquare, show: canAccessPage('pms', 'whatsapp'), key: 'whatsapp' },
    { name: 'Kitchen Prep', path: '/pms/kitchen-preparation', icon: ChefHat, show: canAccessPage('pms', 'chef'), key: 'chef' },
    { name: 'Tag Print', path: '/pms/tag-print', icon: Tag, show: canAccessPage('pms', 'tagPrints'), key: 'tagPrints' },
    { name: 'Dress', path: '/pms/dress', icon: Shirt, show: canAccessPage('pms', 'dress'), key: 'dress' },
    { name: 'Decor List', path: '/pms/decor-list', icon: Flower2, show: canAccessPage('pms', 'decor'), key: 'decor' },
    { name: 'Crockery Requisition', path: '/pms/crockery-list', icon: Utensils, show: canAccessPage('pms', 'crockery'), key: 'crockery' },
    { name: 'Kitchen Raw Material', path: '/pms/menu-kitchen-requirement', icon: Wheat, show: canAccessPage('pms', 'kitchenRawMaterial'), key: 'kitchenRawMaterial' },
    { name: 'Vegetables', path: '/pms/vegetables', icon: Apple, show: canAccessPage('pms', 'vegetables'), key: 'vegetables' },
    { name: 'Cheese & Dairy', path: '/pms/cheese-dairy-products', icon: Milk, show: canAccessPage('pms', 'cheeseDairy'), key: 'cheeseDairy' },
    { name: 'Vendor Coordination', path: '/pms/vendor-coordination', icon: Store, show: canAccessPage('pms', 'vendorOrders'), key: 'vendorOrders' },
    { name: 'Bakery', path: '/pms/bakery', icon: Croissant, show: canAccessPage('pms', 'bakery'), key: 'bakery' },
    { name: 'Ice & Water', path: '/pms/ice-water-requirement', icon: GlassWater, show: canAccessPage('pms', 'iceWaterRequirement'), key: 'iceWaterRequirement' },
    { name: 'Loading Crew', path: '/pms/loading-boys-aunties', icon: Users2, show: canAccessPage('pms', 'loadingBoysAunties'), key: 'loadingBoysAunties' },
    { name: 'Vehicle', path: '/pms/vehicle-requirement', icon: Truck, show: canAccessPage('pms', 'vehicleRequirement'), key: 'vehicleRequirement' },
    { name: 'Gas Cylinder', path: '/pms/gas-cylinder', icon: Flame, show: canAccessPage('pms', 'gasCylinder'), key: 'gasCylinder' },
    { name: 'Fresh Flowers', path: '/pms/fresh-flowers', icon: Flower2, show: canAccessPage('pms', 'freshFlowers'), key: 'freshFlowers' },
    { name: 'Waiters', path: '/pms/waiters', icon: ConciergeBell, show: canAccessPage('pms', 'waiters'), key: 'waiters' },
    { name: 'Outsourcing Team', path: '/pms/outsourcing-team', icon: Briefcase, show: canAccessPage('pms', 'outsourcingTeam'), key: 'outsourcingTeam' },
    { name: 'Master Data', path: '/pms/masters', icon: Sliders, show: canAccessPage('pms', 'masters'), key: 'masters' },
    { name: 'Delay & Logs', path: '/pms/notifications', icon: BellRing, show: canAccessPage('pms', 'notifications') || isAdmin(), key: 'notifications' },
  ].filter((item) => item.show)

  const crockeryNavItems = [
    {
      name: 'IMS Dashboard',
      path: '/crockery/dashboard',
      icon: LayoutDashboard,
      show: canAccessPage('ims', 'dashboard'),
    },
    {
      name: 'Stock Entry',
      path: '/crockery/stock',
      icon: Database,
      show: canAccessPage('ims', 'stock'),
    },
    {
      name: 'Party Inventory',
      path: '/crockery/inventory',
      icon: ArrowLeftRight,
      show: canAccessPage('ims', 'inventory'),
    },
    {
      name: 'Item Master',
      path: '/crockery/master',
      icon: Sliders,
      show: canAccessPage('ims', 'master'),
    },
  ].filter((item) => item.show)

  const navItems = [
    {
      name: 'Portal Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
  ]

  const adminNavItems = [
    {
      name: 'Global Settings',
      path: '/global-settings',
      icon: Settings,
      show: isAdmin(),
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
            <img src="/H3-logo.svg" alt="H3 Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-base leading-tight tracking-tight">H3 Epicura</h1>
            <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider">Master System</p>
          </div>
        </div>

        {/* Mobile close button */}
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {/* Main Portal Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Main Navigation
          </div>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
        </div>

        {/* H3MS System Section */}
        {hasPms && pmsNavItems.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="px-3 pb-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-widest">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              <span>H3MS System</span>
            </div>
            {pmsNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-semibold'
                        : 'text-slate-600 hover:bg-blue-50/60 hover:text-blue-900'
                    }`
                  }
                >
                  {({ isActive }) => {
                    const count = item.key ? pendingCounts?.[item.key] : undefined
                    const hasCount = typeof count === 'number'

                    return (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>

                        {hasCount && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs rounded-full shrink-0 font-bold transition-all ${
                              count > 0
                                ? isActive
                                  ? 'bg-white text-blue-600 shadow-xs'
                                  : 'bg-blue-600 text-white shadow-xs'
                                : isActive
                                ? 'bg-blue-500 text-blue-100 font-medium'
                                : 'bg-slate-100 text-slate-500 font-medium group-hover:bg-slate-200 group-hover:text-slate-700'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </>
                    )
                  }}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* Crockery IMS Section */}
        {hasCrockery && crockeryNavItems.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="px-3 pb-1 flex items-center gap-1.5 text-[10px] font-bold text-violet-700 uppercase tracking-widest">
              <Utensils className="w-3.5 h-3.5 text-violet-600" />
              <span>Crockery IMS</span>
            </div>
            {crockeryNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200 font-semibold'
                        : 'text-slate-600 hover:bg-violet-50/60 hover:text-violet-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* HRMS System Section */}
        {hasHrms && hrmsNavItems.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="px-3 pb-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-700 uppercase tracking-widest">
              <CalendarCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>HRMS System</span>
            </div>
            {hrmsNavItems.map((item) => {
              const Icon = item.icon
              const count = item.key ? hrmsPendingCounts?.[item.key] : undefined
              const hasCount = typeof count === 'number' && count > 0

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-200 font-semibold'
                        : 'text-slate-600 hover:bg-rose-50/60 hover:text-rose-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-rose-600'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {hasCount && (
                        <span
                          className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs rounded-full shrink-0 font-bold transition-all ${
                            isActive
                              ? 'bg-white text-rose-600 shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* System Management Section (Admin) */}
        {isAdmin() && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Administration
            </div>
            {adminNavItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen && setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-200 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
        </div>
      )}
    </div>

    {/* User Profile & Logout Bottom Section */}
    <div className="p-3 border-t border-slate-100 bg-slate-50/70">
      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {getInitials(currentUser?.full_name || currentUser?.username)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate leading-snug">
              {currentUser?.full_name || currentUser?.username || 'User'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin()
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {currentUser?.role || 'user'}
              </span>
              <span className="text-[11px] text-slate-400 truncate">@{currentUser?.username}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Log Out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
)

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
