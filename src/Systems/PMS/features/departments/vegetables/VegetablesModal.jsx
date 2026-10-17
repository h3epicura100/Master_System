import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../components/common/Modal';
import { BookingSummary } from '../../../components/shared/BookingSummary';
import { VegetableEntry } from './VegetableEntry';
import { Button } from '../../../components/common/Button';
import { vegetablesService } from './vegetablesService';
import { storageService } from '../../../services/storageService';
import { useAuth } from '../../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function VegetablesModal({ isOpen, onClose, booking, onViewMenu }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialPathsRef = useRef([]);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deptData = booking?.departments?.vegetables;

  useEffect(() => {
    if (deptData?.entries) {
      const loadedEntries = deptData.entries.map(e => ({
        ...e,
        attachments: Array.isArray(e.attachments) ? e.attachments : (e.attachment ? [e.attachment] : []),
        deletedPaths: [],
      }));
      setEntries(loadedEntries);

      const allInitPaths = [];
      loadedEntries.forEach(e => {
        (e.attachments || []).forEach(a => {
          if (a.path) allInitPaths.push(a.path);
        });
      });
      initialPathsRef.current = allInitPaths;
    } else {
      setEntries([]);
      initialPathsRef.current = [];
    }
    setError('');
  }, [deptData, booking]);

  if (!booking) return null;

  const handleClose = () => {
    // Delete uncommitted draft attachments
    const currentPaths = [];
    entries.forEach(e => {
      (e.attachments || []).forEach(a => {
        if (a.path) currentPaths.push(a.path);
      });
    });

    const draftPaths = currentPaths.filter(p => !initialPathsRef.current.includes(p));
    if (draftPaths.length > 0) {
      storageService.deleteAttachments(draftPaths);
    }
    onClose();
  };

  const handleAddEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        vegType: 'Normal',
        source: 'Local',
        status: 'Pending',
        remarks: '',
        attachments: [],
        deletedPaths: [],
      }
    ]);
  };

  const handleEntryChange = (index, updated) => {
    setEntries(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleRemoveEntry = (index) => {
    const entry = entries[index];
    if (entry && entry.attachments) {
      // Clean up any drafts in the removed entry
      const draftPaths = entry.attachments
        .filter(a => a.path && !initialPathsRef.current.includes(a.path))
        .map(a => a.path);
      if (draftPaths.length > 0) {
        storageService.deleteAttachments(draftPaths);
      }
    }
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!entries.length) {
      setError('Please add at least one vegetable entry before saving.');
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status === 'Pending' && !entry.remarks?.trim()) {
        setError(`Item #${i + 1}: Remarks are required while status is Pending.`);
        return;
      }
      const totalAtts = (entry.attachments?.length || 0);
      if (entry.status === 'Complete' && totalAtts === 0) {
        setError(`Item #${i + 1}: Attachment proof is required to mark it Complete.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await vegetablesService.saveVegetables(
        booking.id,
        entries,
        currentUser?.id || 'admin'
      );

      const allSavedPaths = [];
      entries.forEach(e => {
        (e.attachments || []).forEach(a => {
          if (a.path) allSavedPaths.push(a.path);
        });
      });
      initialPathsRef.current = allSavedPaths;

      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success('Vegetables entries saved successfully!');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save vegetable entries.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Vegetables — ${booking.id}`}
      subtitle="Manage normal and English vegetable requirements."
      maxWidth="max-w-2xl"
    >
      <BookingSummary booking={booking} onViewMenu={onViewMenu} defaultOpenSchedule={false} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3.5 sm:space-y-4">
          {entries.map((entry, idx) => (
            <VegetableEntry
              key={idx}
              entry={entry}
              index={idx}
              bookingId={booking.id}
              initialPaths={initialPathsRef.current}
              onChange={handleEntryChange}
              onRemove={handleRemoveEntry}
            />
          ))}

          {!entries.length && (
            <div className="p-6 sm:p-8 text-center text-xs text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No vegetable entries added yet. Click "+ Add Vegetable Item" below.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddEntry}
          className="w-full py-2.5 px-4 border-2 border-dashed border-pms-accent text-pms-primary font-semibold text-xs rounded-xl hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vegetable Item</span>
        </button>

        {error && (
          <div className="text-xs font-medium text-red-600 bg-red-50 p-2.5 sm:p-3 rounded-xl border border-red-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center justify-end gap-3 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 mt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Vegetables'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
