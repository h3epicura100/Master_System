import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { BookingSummary } from '../../components/shared/BookingSummary';
import { Textarea } from '../../components/common/Textarea';
import { Button } from '../../components/common/Button';
import { AttachmentUploader } from '../../components/common/AttachmentUploader';
import { storageService } from '../../services/storageService';
import { useUpdateMenuDecision } from './menuHooks';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export function MenuDecisionModal({ isOpen, onClose, booking }) {
  const [status, setStatus] = useState('Pending');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const initialPathsRef = useRef([]);
  const updateMenuMutation = useUpdateMenuDecision();
  const folderPath = booking?.id ? `menu/${booking.id}` : 'menu';

  useEffect(() => {
    if (booking?.menu) {
      setStatus(booking.menu.status || 'Pending');
      setReason(booking.menu.reason || '');
      setRemarks(booking.menu.remarks || '');
      const existing = Array.isArray(booking.menu.attachments)
        ? booking.menu.attachments
        : (booking.menu.attachment ? [booking.menu.attachment] : []);
      setAttachments(existing);
      initialPathsRef.current = existing.map(a => a.path).filter(Boolean);
      setDeletedPaths([]);
      setError('');
    }
  }, [booking]);

  if (!booking) return null;

  const handleAddAttachment = (newAtt) => {
    if (!newAtt) return;
    setAttachments(prev => [...prev, newAtt]);
  };

  const handleDeleteAttachment = async (idx, att) => {
    if (!att) return;
    const isInitial = initialPathsRef.current.includes(att.path);
    if (isInitial) {
      if (att.path) {
        setDeletedPaths(prev => [...prev, att.path]);
      }
    } else {
      if (att.path) {
        await storageService.deleteAttachment(att.path);
      }
    }
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    const draftPaths = attachments
      .filter(a => a.path && !initialPathsRef.current.includes(a.path))
      .map(a => a.path);

    if (draftPaths.length > 0) {
      storageService.deleteAttachments(draftPaths);
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (status !== 'Finalized' && !reason.trim()) {
      setError('Reason is required when menu is Pending or Rejected.');
      return;
    }

    if (status === 'Finalized' && attachments.length === 0) {
      setError('Please attach at least one menu document (PDF / Image / Video) to finalize.');
      return;
    }

    if (isUploading) {
      setError('Please wait for file upload to complete before saving.');
      return;
    }

    try {
      await updateMenuMutation.mutateAsync({
        bookingId: booking.id,
        payload: {
          status,
          reason,
          remarks,
          attachments,
          deletedPaths,
          bookingData: booking,
        },
      });

      initialPathsRef.current = attachments.map(a => a.path).filter(Boolean);
      setDeletedPaths([]);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save menu decision.');
    }
  };

  const statusOptions = [
    { key: 'Pending', label: 'Pending', icon: Clock, activeBorder: 'border-amber-500 bg-amber-50/50 text-amber-700' },
    { key: 'Rejected', label: 'Rejected', icon: XCircle, activeBorder: 'border-red-500 bg-red-50/50 text-red-700' },
    { key: 'Finalized', label: 'Finalized', icon: CheckCircle2, activeBorder: 'border-emerald-500 bg-emerald-50/50 text-emerald-700' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Menu Decision — ${booking.id}`}
      subtitle="Lock or reject the menu for this booking."
      maxWidth="max-w-3xl"
    >
      <BookingSummary booking={booking} defaultOpenSchedule={false} />

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Status Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Select Menu Status <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {statusOptions.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = status === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setStatus(opt.key)}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border transition-all text-xs font-semibold cursor-pointer gap-1 sm:gap-1.5 ${
                    isSelected
                      ? `${opt.activeBorder} shadow-sm ring-2 ring-pms-accent/20`
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-50'}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {status !== 'Finalized' ? (
          <Textarea
            label="Reason"
            required
            placeholder="Why is the menu pending or rejected?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        ) : (
          <div className="space-y-3.5">
            <div className="pt-1 border-t border-slate-100">
              <AttachmentUploader
                label="Menu Document"
                folderPath={folderPath}
                required={true}
                maxFiles={1}
                maxSizeMb={50}
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onDeleteAttachment={handleDeleteAttachment}
                onUploadingChange={setIsUploading}
                hint="Upload confirmed menu PDF, image, or doc to attach to WhatsApp notification (up to 50 MB, 1 file)"
              />
            </div>

            <Textarea
              label="Remarks"
              optional
              placeholder="Additional instructions for kitchen and logistics team..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="text-xs font-medium text-red-600 bg-red-50 p-2.5 sm:p-3 rounded-xl border border-red-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center justify-end gap-3 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateMenuMutation.isPending || isUploading}
          >
            {updateMenuMutation.isPending ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Decision'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
