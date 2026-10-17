import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { formatDateDisplay, formatDateRangeDisplay } from '../../utils/dateUtils';
import { EventScheduleTable } from '../../components/shared/EventScheduleTable';
import { storageService } from '../../services/storageService';
import {
  Paperclip,
  Calendar,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Play
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getFileCategory(att) {
  const mime = att.mimeType || '';
  const name = att.name || att.path || '';
  const ext = name.split('.').pop()?.toLowerCase();

  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  return 'document';
}

function AttachmentPreviewItem({ attachment }) {
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const category = getFileCategory(attachment);

  useEffect(() => {
    let isMounted = true;
    async function loadUrl() {
      if (!attachment?.path) {
        setIsLoading(false);
        return;
      }
      if (attachment.path.startsWith('data:') || attachment.path.startsWith('http://') || attachment.path.startsWith('https://')) {
        if (isMounted) {
          setResolvedUrl(attachment.path);
          setIsLoading(false);
        }
        return;
      }
      try {
        const url = await storageService.getSignedUrl(attachment.path);
        if (isMounted) {
          setResolvedUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error loading attachment signed URL:', err);
        if (isMounted) setIsLoading(false);
      }
    }
    loadUrl();
    return () => { isMounted = false; };
  }, [attachment]);

  const handleOpen = () => {
    if (resolvedUrl) window.open(resolvedUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 animate-pulse">
        Loading media...
      </div>
    );
  }

  // 1. Video with Inline Player
  if (category === 'video' && resolvedUrl) {
    return (
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm space-y-2 p-3 text-white">
        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <VideoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold truncate text-slate-200" title={attachment.name}>
              {attachment.name || 'Video Proof'}
            </span>
            {attachment.size ? (
              <span className="text-[10px] text-slate-400 font-mono">({formatBytes(attachment.size)})</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </div>

        <video
          src={resolvedUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-72 rounded-lg bg-black object-contain"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // 2. Image with Inline Thumbnail & Quick View
  if (category === 'image' && resolvedUrl) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs group hover:border-slate-300 transition-all p-2.5 space-y-2">
        <div className="relative rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center max-h-60">
          <img
            src={resolvedUrl}
            alt={attachment.name || 'Menu Attachment'}
            className="w-full max-h-60 object-contain rounded-lg transition-transform group-hover:scale-[1.01]"
          />
          <button
            type="button"
            onClick={handleOpen}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-slate-800 truncate" title={attachment.name}>
              {attachment.name || 'Image File'}
            </span>
          </div>
          {attachment.size ? (
            <span className="text-[10px] text-slate-400 font-mono">{formatBytes(attachment.size)}</span>
          ) : null}
        </div>
      </div>
    );
  }

  // 3. Document / PDF / Fallback Item Card
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-pms-accent flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-800 truncate" title={attachment.name}>
            {attachment.name || 'Menu Document'}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            {attachment.size ? <span>{formatBytes(attachment.size)}</span> : null}
            {category === 'pdf' && <span className="font-semibold text-rose-500 uppercase">PDF</span>}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpen}
        disabled={!resolvedUrl}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer flex-shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5 text-pms-accent" />
        <span>View</span>
      </button>
    </div>
  );
}

export function ViewMenuModal({ isOpen, onClose, booking }) {
  if (!booking) return null;

  const menu = booking.menu || {};
  const dateRange = formatDateRangeDisplay(
    booking.eventStartDate || booking.event_start_date || booking.eventDate || booking.event_date,
    booking.eventEndDate || booking.event_end_date || booking.eventDate || booking.event_date
  );
  const schedule = booking.eventSchedule || booking.pms_event_schedule || [];

  const rawAttachments = Array.isArray(menu.attachments)
    ? menu.attachments
    : (menu.attachment ? [menu.attachment] : []);
  const attachments = rawAttachments.filter(a => a && (a.name || a.path));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Finalized Menu — ${booking.id}`}
      subtitle="Read-only menu details, proofs, and event schedule locked by admin."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Booking Meta Summary */}
        <div className="bg-slate-50 border border-pms-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Customer
            </span>
            <span className="font-semibold text-pms-text">
              {booking.customerName || booking.customer_name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Event Period
            </span>
            <span className="font-semibold text-pms-text">
              {dateRange}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Finalized On
            </span>
            <span className="font-semibold text-pms-text">
              {formatDateDisplay(menu.finalizationDate)}
            </span>
          </div>
        </div>

        {/* Event Schedule Section */}
        {schedule.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pms-primary">
              <Calendar className="w-3.5 h-3.5 text-pms-accent" />
              <span>Event Schedule & Headcount</span>
            </div>
            <EventScheduleTable schedule={schedule} showTotal={false} />
          </div>
        )}

        {/* Menu Attachments Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pms-primary flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-pms-accent" />
              <span>Menu Attachments & Proofs ({attachments.length})</span>
            </span>
          </div>

          {attachments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {attachments.map((att, idx) => (
                <AttachmentPreviewItem key={att.path || idx} attachment={att} />
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic text-center">
              No menu attachments uploaded for this booking.
            </div>
          )}
        </div>

        {/* Remarks */}
        {menu.remarks && (
          <div className="text-xs space-y-1">
            <span className="font-semibold text-pms-muted uppercase text-[10px] tracking-wider">Remarks & Instructions:</span>
            <p className="p-3 bg-white border border-pms-border rounded-xl text-pms-text whitespace-pre-line leading-relaxed">
              {menu.remarks}
            </p>
          </div>
        )}

        <div className="pt-4 sm:pt-5 border-t border-pms-border flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-pms-text rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
