import React, { useState } from 'react';
import { useBookings } from '../../bookings/bookingHooks';
import { DepartmentTable } from '../shared/DepartmentTable';
import { CheeseDairyModal } from './CheeseDairyModal';
import { ViewMenuModal } from '../../shared/ViewMenuModal';
import { Button } from '../../../components/common/Button';
import { RefreshCw } from 'lucide-react';

export function CheeseDairyPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewMenuBookingId, setViewMenuBookingId] = useState(null);

  const { data: bookings = [], isLoading, refetch } = useBookings();

  // Pending: Active bookings with Finalized menu only where cheeseDairy status !== 'Complete'
  const activePool = bookings.filter(
    b => (b.status === 'active' || (!b.status && !b.closed && !b.cancelled)) && b.menu?.status === 'Finalized'
  );
  const pendingBookings = activePool.filter(
    b => b.departments?.cheeseDairy?.status !== 'Complete'
  );

  // History: All completed cheeseDairy tasks (active or closed) and closed/archived events
  const completedBookings = bookings.filter(
    b => b.departments?.cheeseDairy?.status === 'Complete' || b.status === 'closed' || b.closed
  );

  const currentList = activeTab === 'pending' ? pendingBookings : completedBookings;
  const viewMenuBooking = bookings.find(b => b.id === viewMenuBookingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-pms-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cheese & Dairy Products</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and complete cheese & dairy procurement for upcoming catering events.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

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
            {pendingBookings.length}
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
            {completedBookings.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
          Loading Cheese & Dairy records...
        </div>
      ) : (
        <DepartmentTable
          bookings={currentList}
          deptKey="cheeseDairy"
          isPendingTab={activeTab === 'pending'}
          onUpdate={(b) => setSelectedBooking(b)}
          onViewMenu={(id) => setViewMenuBookingId(id)}
        />
      )}

      {selectedBooking && (
        <CheeseDairyModal
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          booking={selectedBooking}
          onViewMenu={(id) => setViewMenuBookingId(id)}
        />
      )}

      <ViewMenuModal
        isOpen={Boolean(viewMenuBookingId)}
        onClose={() => setViewMenuBookingId(null)}
        booking={viewMenuBooking}
      />
    </div>
  );
}
