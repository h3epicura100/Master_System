import React, { useState } from 'react';
import { useBookings } from '../bookings/bookingHooks';
import { MenuTable } from './MenuTable';
import { MenuDecisionModal } from './MenuDecisionModal';

export function MenuFinalizePage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { data: bookings = [], isLoading } = useBookings();

  // Pending: Active bookings with unfinalized menu
  const activeBookings = bookings.filter(
    b => b.status === 'active' || (!b.status && !b.closed && !b.cancelled)
  );
  const pendingMenus = activeBookings.filter(b => b.menu?.status !== 'Finalized');

  // History: All finalized menus (both active and closed/archived events)
  const finalizedMenus = bookings.filter(
    b => b.menu?.status === 'Finalized' || b.status === 'closed' || b.closed
  );

  const currentList = activeTab === 'pending' ? pendingMenus : finalizedMenus;

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-pms-muted">Loading menu status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-pms-border pb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-pms-primary text-white shadow-sm'
              : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
          }`}
        >
          <span>Pending</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {pendingMenus.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-pms-primary text-white shadow-sm'
              : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
          }`}
        >
          <span>History</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {finalizedMenus.length}
          </span>
        </button>
      </div>

      <MenuTable
        bookings={currentList}
        onUpdateMenu={(b) => setSelectedBooking(b)}
      />

      <MenuDecisionModal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </div>
  );
}
