import React from 'react';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/common/Button';
import { formatDateRangeDisplay, formatDateTimeDisplay, formatDateDisplay } from '../../utils/dateUtils';
import { storageService } from '../../services/storageService';
import { Paperclip, Calendar, CheckCircle2, AlertTriangle, XCircle, MinusCircle, MessageCircle } from 'lucide-react';

function AttachmentCell({ attachments }) {
  const list = Array.isArray(attachments)
    ? attachments.filter(a => a && (a.name || a.path))
    : (attachments && (attachments.name || attachments.path) ? [attachments] : []);

  if (!list.length) {
    return <span className="text-slate-400">—</span>;
  }

  if (list.length === 1) {
    const single = list[0];
    const handleView = async () => {
      if (single.path?.startsWith('data:') || single.path?.startsWith('http')) {
        window.open(single.path, '_blank');
        return;
      }
      const url = await storageService.getSignedUrl(single.path);
      if (url) {
        window.open(url, '_blank');
      }
    };

    return (
      <button
        onClick={handleView}
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        title={single.name || 'View Attachment'}
      >
        <Paperclip className="w-3.5 h-3.5 text-pms-accent flex-shrink-0" />
        <span className="max-w-[130px] truncate">{single.name || 'View Attachment'}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {list.slice(0, 2).map((att, i) => {
        const handleView = async (e) => {
          e.stopPropagation();
          if (att.path?.startsWith('data:') || att.path?.startsWith('http')) {
            window.open(att.path, '_blank');
            return;
          }
          const url = await storageService.getSignedUrl(att.path);
          if (url) window.open(url, '_blank');
        };
        return (
          <button
            key={att.path || i}
            onClick={handleView}
            type="button"
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
            title={att.name || `Attachment #${i + 1}`}
          >
            <Paperclip className="w-3 h-3 text-pms-accent flex-shrink-0" />
            <span className="max-w-[80px] truncate">{att.name || `File ${i + 1}`}</span>
          </button>
        );
      })}
      {list.length > 2 && (
        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
          +{list.length - 2} more
        </span>
      )}
    </div>
  );
}

function WhatsAppStatusCell({ isFinalized, status, sentAt }) {
  if (!isFinalized || !status) {
    return <span className="text-slate-400">—</span>;
  }

  let config = {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    icon: CheckCircle2,
    label: 'Sent',
  };

  if (status === 'Partial') {
    config = {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: AlertTriangle,
      label: 'Partial',
    };
  } else if (status === 'Failed') {
    config = {
      bg: 'bg-red-50 border-red-200 text-red-700',
      icon: XCircle,
      label: 'Failed',
    };
  } else if (status === 'Skipped') {
    config = {
      bg: 'bg-slate-50 border-slate-200 text-slate-600',
      icon: MinusCircle,
      label: 'Skipped',
    };
  }

  const IconComp = config.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold w-fit ${config.bg}`}>
        <IconComp className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
      {sentAt && (
        <span className="text-[10px] text-slate-400">
          {formatDateTimeDisplay(sentAt)}
        </span>
      )}
    </div>
  );
}

export function MenuTable({ bookings = [], onUpdateMenu }) {
  if (!bookings.length) {
    return (
      <div className="bg-white border border-pms-border rounded-xl p-12 text-center">
        <h3 className="text-base font-semibold text-pms-text">Nothing here</h3>
        <p className="text-xs text-pms-muted mt-1">No bookings found in this view.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout (Visible on screens < md) */}
      <div className="space-y-3.5 md:hidden">
        {bookings.map((b) => {
          const menuStatus = b.menu?.status || (b.status === 'closed' || b.closed ? 'Finalized' : 'Pending');
          const isFinalized = menuStatus === 'Finalized';
          const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
          const sessionCount = b.eventSchedule?.length || 0;
          const menuAttachments = Array.isArray(b.menu?.attachments) ? b.menu.attachments : (b.menu?.attachment ? [b.menu.attachment] : []);

          return (
            <div
              key={b.id}
              className="bg-white border border-pms-border rounded-xl p-4 shadow-sm space-y-3"
            >
              {/* Card Header: ID, Customer & Update button */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-pms-primary">
                    {b.id}
                  </div>
                  <div className="text-sm font-bold text-pms-text truncate mt-0.5">
                    {b.customerName}
                  </div>
                  {b.customerMobile && b.customerMobile !== '—' && (
                    <div className="text-[11px] text-pms-muted font-mono">{b.customerMobile}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onUpdateMenu(b)}
                  className="shrink-0"
                >
                  Update
                </Button>
              </div>

              {/* Status & WhatsApp Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Status:</span>
                  <StatusBadge status={menuStatus} />
                </div>
                <WhatsAppStatusCell
                  isFinalized={isFinalized}
                  status={b.menu?.whatsappStatus}
                  sentAt={b.menu?.whatsappSentAt}
                />
              </div>

              {/* Details Key-Value List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Assign Date:</span>
                  <span className="font-medium text-slate-700">{formatDateDisplay(b.bookingDate || b.createdAt)}</span>
                </div>

                <div className="flex items-start justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Event Date:</span>
                  <span className="font-medium text-pms-text text-right sm:text-left">{dateRange}</span>
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Venue:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">{b.venueName || '—'}</span>
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Sessions:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Attachment:</span>
                  <div>
                    <AttachmentCell attachments={menuAttachments} />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {(b.menu?.remarks || b.menu?.reason || b.remarks) && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  {b.menu?.remarks && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Menu Remarks:</span>
                      <p className="text-slate-700 bg-slate-50 p-2 rounded-lg text-xs leading-relaxed">{b.menu.remarks}</p>
                    </div>
                  )}
                  {b.menu?.reason && !b.menu?.remarks && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-amber-600 block mb-0.5">Pending Reason:</span>
                      <p className="text-amber-800 bg-amber-50 p-2 rounded-lg text-xs leading-relaxed">{b.menu.reason}</p>
                    </div>
                  )}
                  {b.remarks && b.remarks !== b.menu?.remarks && (
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      <span className="font-semibold text-slate-400">Booking Note: </span>
                      {b.remarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white border border-pms-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Assign Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Event Date</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Sessions</th>
                <th className="py-3 px-4">Menu Status</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4">Attachment</th>
                <th className="py-3 px-4">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pms-border">
              {bookings.map((b) => {
                const menuStatus = b.menu?.status || (b.status === 'closed' || b.closed ? 'Finalized' : 'Pending');
                const isFinalized = menuStatus === 'Finalized';
                const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
                const sessionCount = b.eventSchedule?.length || 0;
                const menuAttachments = Array.isArray(b.menu?.attachments) ? b.menu.attachments : (b.menu?.attachment ? [b.menu.attachment] : []);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onUpdateMenu(b)}
                      >
                        Update
                      </Button>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-pms-primary">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {formatDateDisplay(b.bookingDate || b.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-pms-text">{b.customerName}</div>
                      {b.customerMobile && b.customerMobile !== '—' && (
                        <div className="text-[11px] text-pms-muted font-mono">{b.customerMobile}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-pms-text font-medium whitespace-nowrap">
                      {dateRange}
                    </td>
                    <td className="py-3 px-4 text-pms-muted">
                      {b.venueName || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={menuStatus} />
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      {b.menu?.remarks ? (
                        <div>
                          <div className="truncate text-slate-800 font-normal" title={b.menu.remarks}>
                            {b.menu.remarks}
                          </div>
                          {b.remarks && b.remarks !== b.menu.remarks && (
                            <div className="text-[10px] text-slate-400 truncate" title={`Booking note: ${b.remarks}`}>
                              Booking: {b.remarks}
                            </div>
                          )}
                        </div>
                      ) : b.menu?.reason ? (
                        <div className="truncate text-amber-700 font-normal" title={b.menu.reason}>
                          {b.menu.reason}
                        </div>
                      ) : b.remarks ? (
                        <div className="truncate text-slate-600 font-normal" title={b.remarks}>
                          {b.remarks}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AttachmentCell attachments={menuAttachments} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <WhatsAppStatusCell
                        isFinalized={isFinalized}
                        status={b.menu?.whatsappStatus}
                        sentAt={b.menu?.whatsappSentAt}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
