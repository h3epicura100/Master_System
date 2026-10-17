import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function Topbar({ setMobileOpen, title }) {
  const { currentUser, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white border-b border-slate-200/80 shadow-xs px-2.5 sm:px-6 lg:px-8 flex items-center justify-between w-full max-w-full min-w-0">
      {/* Left side: Mobile Toggle / Desktop Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo & Title */}
        <div className="flex md:hidden items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white p-0.5 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <img src="/H3-logo.svg" alt="H3" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight truncate max-w-[120px] xs:max-w-[180px]">
            {title || 'H3 Master'}
          </span>
        </div>

        {/* Desktop Breadcrumbs & Page Title */}
        <div className="hidden md:flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0">
            <span>H3 Operations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight truncate">{title}</h2>
        </div>
      </div>

      {/* Right side: User Info + Quick Logout */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs shrink-0">
            {getInitials(currentUser?.full_name || currentUser?.username)}
          </div>

          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
              {currentUser?.full_name || currentUser?.username}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                  isAdmin() ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {currentUser?.role || 'user'}
              </span>
              <span className="text-[10px] text-slate-400">@{currentUser?.username}</span>
            </div>
          </div>

          {/* Quick Logout Button */}
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar
