import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageContainer } from './PageContainer';
import { Footer } from './Footer';
import { NAVIGATION } from '../../constants/permissions';
import { useRealtime } from '../../hooks/useRealtime';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout() {
  useRealtime(); // Enable live Supabase PostgreSQL real-time synchronization

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  let currentNav = null;
  for (const group of NAVIGATION) {
    const item = group.items.find(i => i.route === location.pathname);
    if (item) {
      currentNav = item;
      break;
    }
  }

  const isFullHeightPage = location.pathname === '/whatsapp' || location.pathname === '/menu-chatbot';

  return (
    <div className="h-screen flex bg-pms-bg overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col min-w-0 h-screen ${isFullHeightPage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} app-main-content`}>
        <Topbar
          title={currentNav?.label || 'Dashboard'}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />

        <main className={`flex-1 flex flex-col min-w-0 min-h-0 ${isFullHeightPage ? 'overflow-hidden p-2 sm:p-3 lg:p-3.5' : 'justify-between overflow-x-hidden'}`}>
          {isFullHeightPage ? (
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          ) : (
            <PageContainer>
              <Outlet />
            </PageContainer>
          )}

          <Footer className="border-t border-slate-200/60 bg-white/40 shrink-0 mt-auto" />
        </main>
      </div>
    </div>
  );
}

