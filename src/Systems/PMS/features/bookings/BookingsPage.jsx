import React, { useState } from 'react';
import { useBookings, useReopenBooking, useDeleteBooking } from './bookingHooks';
import { BookingTable } from './BookingTable';
import { BookingModal } from './BookingModal';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Plus, AlertTriangle } from 'lucide-react';

export function BookingsPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  const { data: bookings = [], isLoading } = useBookings();
  const reopenMutation = useReopenBooking();
  const deleteMutation = useDeleteBooking();

  const pendingBookings = bookings.filter(b => b.status === 'active' || (!b.status && !b.closed && !b.cancelled));
  const historyBookings = bookings.filter(b => b.status === 'closed' || b.status === 'cancelled' || b.closed || b.cancelled);

  const currentList = activeTab === 'pending' ? pendingBookings : historyBookings;

  const handleOpenNew = () => {
    setSelectedBooking(null);
    setIsModalOpen(true);
  };

  const handleEdit = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleReopen = (id) => {
    reopenMutation.mutate(id);
  };

  const handleDelete = (booking) => {
    setBookingToDelete(booking);
  };

  const handleConfirmDelete = async () => {
    if (!bookingToDelete) return;
    try {
      await deleteMutation.mutateAsync(bookingToDelete.id);
      setBookingToDelete(null);
    } catch (err) {
      // Handled in mutation onError
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-pms-muted">Loading bookings rail...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pms-border pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
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
              {pendingBookings.length}
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
              {historyBookings.length}
            </span>
          </button>
        </div>

        <Button variant="primary" onClick={handleOpenNew}>
          <Plus className="w-4 h-4" />
          <span>New Booking</span>
        </Button>
      </div>

      {/* Table */}
      <BookingTable
        bookings={currentList}
        isHistoryTab={activeTab === 'history'}
        onEdit={handleEdit}
        onReopen={handleReopen}
        onDelete={handleDelete}
      />

      {/* Booking Form Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialValues={selectedBooking}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!bookingToDelete}
        onClose={() => !deleteMutation.isPending && setBookingToDelete(null)}
        title={`Delete Booking — ${bookingToDelete?.id || ''}`}
        subtitle="Permanently delete this booking and all associated records everywhere."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs text-red-800 space-y-1 leading-relaxed">
              <p className="font-bold text-red-900">This action cannot be undone.</p>
              <p>
                Deleting <span className="font-mono font-semibold">{bookingToDelete?.id}</span> for <span className="font-semibold">{bookingToDelete?.customerName}</span> will permanently erase:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700 pt-1">
                <li>All department task records & proofs</li>
                <li>Menu decisions & attachments</li>
                <li>Vegetable and dairy entry lists</li>
                <li>Event schedules and Pax headcounts</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBookingToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Everywhere'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
