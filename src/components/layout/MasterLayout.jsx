import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useRealtime } from '../../Systems/PMS/hooks/useRealtime'

export function MasterLayout() {
  useRealtime()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Dynamic header title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Portal Dashboard'
      case '/global-settings':
        return 'Global Settings'
      case '/pms/dashboard':
        return 'H3MS · Dashboard'
      case '/pms/bookings':
        return 'H3MS · Booking Master'
      case '/pms/menu-finalize':
        return 'H3MS · Menu Finalize'
      case '/pms/menu-chatbot':
        return 'H3MS · Menu AI Chatbot'
      case '/pms/whatsapp':
        return 'H3MS · WhatsApp Hub'
      case '/pms/kitchen-preparation':
        return 'H3MS · Kitchen Preparation'
      case '/pms/tag-print':
        return 'H3MS · Tag Print'
      case '/pms/dress':
        return 'H3MS · Dress Department'
      case '/pms/decor-list':
        return 'H3MS · Decor List'
      case '/pms/crockery-list':
        return 'H3MS · Crockery Requisition'
      case '/pms/menu-kitchen-requirement':
        return 'H3MS · Kitchen Requirement'
      case '/pms/vegetables':
        return 'H3MS · Vegetables'
      case '/pms/cheese-dairy-products':
        return 'H3MS · Cheese & Dairy Products'
      case '/pms/vendor-coordination':
        return 'H3MS · Vendor Coordination'
      case '/pms/bakery':
        return 'H3MS · Bakery'
      case '/pms/ice-water-requirement':
        return 'H3MS · Ice & Water'
      case '/pms/loading-boys-aunties':
        return 'H3MS · Loading Boys & Aunties'
      case '/pms/vehicle-requirement':
        return 'H3MS · Vehicle Requirement'
      case '/pms/gas-cylinder':
        return 'H3MS · Gas Cylinder'
      case '/pms/fresh-flowers':
        return 'H3MS · Fresh Flowers'
      case '/pms/waiters':
        return 'H3MS · Waiters'
      case '/pms/outsourcing-team':
        return 'H3MS · Outsourcing Team'
      case '/pms/masters':
        return 'H3MS · Master Data'
      case '/pms/notifications':
        return 'H3MS · Delay & Notification Logs'
      case '/pms/mis':
        return 'H3MS · Employee MIS'
      case '/crockery/dashboard':
        return 'Crockery · Dashboard'
      case '/crockery/stock':
        return 'Crockery · Stock Management'
      case '/crockery/inventory':
        return 'Crockery · Inventory & Party Issue'
      case '/crockery/master':
        return 'Crockery · Master Catalog'
      case '/hrms/attendance':
        return 'HRMS · Daily Attendance'
      case '/hrms/advances':
        return 'HRMS · Salary Advances'
      case '/hrms/approval':
        return 'HRMS · Advance Approval'
      case '/hrms/overtime':
        return 'HRMS · Overtime (OT)'
      case '/hrms/payroll':
        return 'HRMS · Monthly Payroll'
      default:
        if (location.pathname.startsWith('/pms')) return 'H3MS System'
        if (location.pathname.startsWith('/crockery')) return 'Crockery IMS'
        if (location.pathname.startsWith('/hrms')) return 'HRMS System'
        return 'H3 Epicura'
    }
  }

  const isFullHeightPage =
    location.pathname.startsWith('/pms/whatsapp') ||
    location.pathname.startsWith('/pms/menu-chatbot')

  return (
    // h-dvh: on phones 100vh includes the area behind the browser address bar
    <div className="h-screen h-dvh bg-[#f8fafc] flex selection:bg-violet-500 selection:text-white w-full max-w-full overflow-hidden relative">
      {/* Sidebar for Desktop & Mobile Overlay */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main App Container (the single page scroller) */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full max-w-full md:pl-64 h-screen h-dvh ${
          isFullHeightPage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden overscroll-contain'
        }`}
      >
        {/* Topbar Header */}
        <Topbar setMobileOpen={setMobileOpen} title={getPageTitle()} />

        {/* Page Content Outlet.
            Regular pages: plain block that grows with its content so the container
            above scrolls. (A flex column here let page roots with overflow-hidden
            shrink to screen height and clip on phones.) */}
        <main
          className={`flex-1 min-w-0 w-full ${
            isFullHeightPage
              ? 'flex flex-col min-h-0 overflow-hidden px-2 sm:px-4 lg:px-6 py-2 sm:py-3 max-w-[1680px] mx-auto'
              : 'shrink-0 px-3 py-3.5 sm:px-6 sm:py-5 lg:px-8 pb-4 sm:pb-6'
          }`}
        >
          {isFullHeightPage ? (
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* Clean Fixed/Sticky Footer */}
        <footer className="h-8 sm:h-9 bg-white/90 backdrop-blur-xs border-t border-slate-200/80 px-3 sm:px-6 flex items-center justify-center z-20 shrink-0 w-full max-w-full mt-auto">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest select-none">
            <span className="text-slate-400 font-semibold">POWERED BY</span>
            <a
              href="https://www.botivate.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-slate-700 hover:text-violet-600 transition-colors"
            >
              BOTIVATE
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default MasterLayout
