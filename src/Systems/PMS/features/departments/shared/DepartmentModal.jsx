import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../components/common/Modal';
import { BookingSummary } from '../../../components/shared/BookingSummary';
import { Textarea } from '../../../components/common/Textarea';
import { Button } from '../../../components/common/Button';
import { AttachmentUploader } from '../../../components/common/AttachmentUploader';
import { departmentService } from './departmentService';
import { storageService } from '../../../services/storageService';
import { useAuth } from '../../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock } from 'lucide-react';

export function DepartmentModal({ isOpen, onClose, booking, deptConfig, onViewMenu }) {
  const [status, setStatus] = useState('Pending');
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialPathsRef = useRef([]);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deptKey = deptConfig?.key;
  const deptData = booking?.departments?.[deptKey];
  const folderPath = booking?.id && deptKey ? `departments/${booking.id}/${deptKey}` : 'departments';

  useEffect(() => {
    if (deptData) {
      setStatus(deptData.status || 'Pending');
      setRemarks(deptData.remarks || '');
      const existing = Array.isArray(deptData.attachments)
        ? deptData.attachments
        : (deptData.attachment ? [deptData.attachment] : []);
      setAttachments(existing);
      initialPathsRef.current = existing.map(a => a.path).filter(Boolean);
      setDeletedPaths([]);
      setError('');
    }
  }, [deptData, booking]);

  if (!booking || !deptConfig) return null;

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
      // Draft uploaded during this session
      if (att.path) {
        await storageService.deleteAttachment(att.path);
      }
    }
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    // Delete any uncommitted draft attachments
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

    if (status === 'Pending' && !remarks.trim()) {
      setError('Remarks are required while status is Pending.');
      return;
    }

    if (status === 'Complete' && attachments.length === 0) {
      setError('Please attach at least one file (photo, video or document) to mark this Complete.');
      return;
    }

    if (isUploading) {
      setError('Please wait for file uploads to complete before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      await departmentService.updateDeptTask(booking.id, deptKey, {
        status,
        remarks,
        attachments,
        deletedPaths,
        updatedBy: currentUser?.id || 'admin',
      });

      initialPathsRef.current = attachments.map(a => a.path).filter(Boolean);
      setDeletedPaths([]);

      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success(`${deptConfig.label} status updated!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update department task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${deptConfig.label} — ${booking.id}`}
      subtitle="Update status, remarks and upload proof of task completion."
      maxWidth="max-w-2xl"
    >
      <BookingSummary booking={booking} onViewMenu={onViewMenu} defaultOpenSchedule={false} />

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Status Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Status <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setStatus('Pending')}
              className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                status === 'Pending'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Clock className="w-4 h-4 opacity-70" />
              <span>Pending</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('Complete')}
              className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                status === 'Complete'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 opacity-70" />
              <span>Complete</span>
            </button>
          </div>
        </div>

        <Textarea
          label="Remarks"
          required={status === 'Pending'}
          optional={status === 'Complete'}
          placeholder="Notes or status explanation..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        {status === 'Complete' && (
          <div className="pt-1 border-t border-slate-100">
            <AttachmentUploader
              label="Attachment Proof (Photos / Videos / Docs)"
              folderPath={folderPath}
              required={true}
              maxFiles={30}
              maxSizeMb={50}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              onUploadingChange={setIsUploading}
              hint="Upload photos, videos of completed work, or receipts (up to 50 MB each, max 30 files)"
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
          <Button type="submit" variant="primary" disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
