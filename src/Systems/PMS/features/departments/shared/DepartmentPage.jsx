import React, { useState } from 'react';
import { useBookings } from '../../bookings/bookingHooks';
import { DepartmentTable } from './DepartmentTable';
import { DepartmentModal } from './DepartmentModal';
import { ViewMenuModal } from '../../shared/ViewMenuModal';

export function DepartmentPage({ deptConfig }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewMenuBookingId, setViewMenuBookingId] = useState(null);

  const { data: bookings = [], isLoading } = useBookings();

  const deptKey = deptConfig.key;

  // Pending: Active bookings with Finalized menu where department task is not complete
  const activePool = bookings.filter(
    b => (b.status === 'active' || (!b.status && !b.closed && !b.cancelled)) && b.menu?.status === 'Finalized'
  );
  const pendingTasks = activePool.filter(b => b.departments?.[deptKey]?.status !== 'Complete');

  // History: All completed department tasks (active or closed) and closed/archived events
  const historyTasks = bookings.filter(
    b => b.departments?.[deptKey]?.status === 'Complete' || b.status === 'closed' || b.closed
  );

  const currentList = activeTab === 'pending' ? pendingTasks : historyTasks;
  const viewMenuBooking = bookings.find(b => b.id === viewMenuBookingId);

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-pms-muted">Loading department tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-pms-border pb-4 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'pending'
              ? 'bg-pms-primary text-white shadow-sm'
              : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
          }`}
        >
          <span>Pending</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {pendingTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'history'
              ? 'bg-pms-primary text-white shadow-sm'
              : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
          }`}
        >
          <span>History</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {historyTasks.length}
          </span>
        </button>
      </div>

      <DepartmentTable
        bookings={currentList}
        deptKey={deptKey}
        isPendingTab={activeTab === 'pending'}
        onUpdate={(b) => setSelectedBooking(b)}
        onViewMenu={(id) => setViewMenuBookingId(id)}
      />

      <DepartmentModal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        deptConfig={deptConfig}
        onViewMenu={(id) => setViewMenuBookingId(id)}
      />

      <ViewMenuModal
        isOpen={Boolean(viewMenuBookingId)}
        onClose={() => setViewMenuBookingId(null)}
        booking={viewMenuBooking}
      />
    </div>
  );
}
