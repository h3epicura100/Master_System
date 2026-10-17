import React from 'react';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { DelayBadge } from '../../../components/shared/DelayBadge';
import { Button } from '../../../components/common/Button';
import { formatDateDisplay, formatDateRangeDisplay } from '../../../utils/dateUtils';
import { derivedPlannedDate, calculateDelayInfo, getEffectiveDeadline } from '../../../utils/delayUtils';
import { storageService } from '../../../services/storageService';
import { Paperclip, Calendar } from 'lucide-react';

function MenuAttachmentCell({ booking, onViewMenu }) {
  const menuAttachments = Array.isArray(booking.menu?.attachments)
    ? booking.menu.attachments
    : (booking.menu?.attachment ? [booking.menu.attachment] : []);
  const validList = menuAttachments.filter(a => a && (a.name || a.path));

  if (!validList.length) {
    if (onViewMenu) {
      return (
        <button
          type="button"
          onClick={() => onViewMenu(booking.id)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-pms-accent hover:underline cursor-pointer"
        >
          View Menu
        </button>
      );
    }
    return <span className="text-slate-400">—</span>;
  }

  if (validList.length > 1) {
    return (
      <button
        onClick={() => onViewMenu?.(booking.id)}
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        title="View All Menu Attachments"
      >
        <Paperclip className="w-3.5 h-3.5 text-pms-accent flex-shrink-0" />
        <span>Menu ({validList.length} files)</span>
      </button>
    );
  }

  const single = validList[0];
  const handleView = async (e) => {
    e.stopPropagation();
    if (single.path?.startsWith('data:') || single.path?.startsWith('http')) {
      window.open(single.path, '_blank');
      return;
    }
    const url = await storageService.getSignedUrl(single.path);
    if (url) {
      window.open(url, '_blank');
    } else if (onViewMenu) {
      onViewMenu(booking.id);
    }
  };

  return (
    <button
      onClick={handleView}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
      title={single.name || 'View Menu Attachment'}
    >
      <Paperclip className="w-3.5 h-3.5 text-pms-accent flex-shrink-0" />
      <span className="max-w-[120px] truncate">{single.name || 'Menu Doc'}</span>
    </button>
  );
}

function AttachmentCell({ attachments }) {
  const list = Array.isArray(attachments)
    ? attachments.filter(a => a && (a.name || a.path))
    : (attachments && (attachments.name || attachments.path) ? [attachments] : []);

  if (!list.length) {
    return <span className="text-slate-400">—</span>;
  }

  if (list.length === 1) {
    const single = list[0];
    const handleView = async (e) => {
      e.stopPropagation();
      if (single.path?.startsWith('data:') || single.path?.startsWith('http')) {
        window.open(single.path, '_blank');
        return;
      }
      const url = await storageService.getSignedUrl(single.path);
      if (url) window.open(url, '_blank');
    };

    return (
      <button
        onClick={handleView}
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-pms-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        title={single.name || 'View Proof'}
      >
        <Paperclip className="w-3.5 h-3.5 text-pms-accent flex-shrink-0" />
        <span className="max-w-[120px] truncate">{single.name || 'View Proof'}</span>
      </button>
    );
  }

  // Multiple files
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
            title={att.name || `Proof #${i + 1}`}
          >
            <Paperclip className="w-3 h-3 text-pms-accent flex-shrink-0" />
            <span className="max-w-[80px] truncate">{att.name || `Proof ${i + 1}`}</span>
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

export function DepartmentTable({ bookings = [], deptKey, isPendingTab, onUpdate, onViewMenu }) {
  if (!bookings.length) {
    return (
      <div className="bg-white border border-pms-border rounded-xl p-12 text-center">
        <h3 className="text-base font-semibold text-pms-text">Nothing here</h3>
        <p className="text-xs text-pms-muted mt-1">
          {isPendingTab ? 'All caught up on this department.' : 'No completed tasks yet.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout (Visible on screens < md) */}
      <div className="space-y-3.5 md:hidden">
        {bookings.map((b) => {
          const deptData = b.departments?.[deptKey] || {};
          const effectiveStatus = deptData.status || (b.status === 'closed' || b.closed ? 'Complete' : 'Pending');
          const anchorDate = b.eventStartDate || b.eventDate;
          const plannedDate = derivedPlannedDate(anchorDate);
          const delayInfo = calculateDelayInfo(b, effectiveStatus, deptData.completedAt || deptData.updatedAt);
          const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
          const sessionCount = b.eventSchedule?.length || 0;

          const effectiveDeadline = getEffectiveDeadline(b);
          const deadlineDisplay = effectiveDeadline
            ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(effectiveDeadline)
            : '—';

          const cardBorderTint = delayInfo.cls === 'delayed'
            ? 'border-red-300 bg-red-50/30'
            : delayInfo.cls === 'atrisk'
            ? 'border-amber-300 bg-amber-50/30'
            : 'border-pms-border bg-white';

          let remarksText = '—';
          let allAttachments = [];

          if ((deptKey === 'vegetables' || deptKey === 'cheeseDairy') && Array.isArray(deptData.entries) && deptData.entries.length > 0) {
            const remarksList = deptData.entries
              .map(e => e.remarks)
              .filter(Boolean);
            remarksText = remarksList.length > 0 ? remarksList.join('; ') : '—';

            allAttachments = deptData.entries.flatMap(e =>
              Array.isArray(e.attachments) ? e.attachments : (e.attachment ? [e.attachment] : [])
            ).filter(a => a && (a.name || a.path));
          } else {
            remarksText = deptData.remarks || '—';
            allAttachments = Array.isArray(deptData.attachments)
              ? deptData.attachments
              : (deptData.attachment ? [deptData.attachment] : []);
          }

          const attachmentElement = <AttachmentCell attachments={allAttachments} />;

          return (
            <div
              key={b.id}
              className={`border rounded-xl p-4 shadow-sm space-y-3 transition-all ${cardBorderTint}`}
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
                </div>
                <Button size="sm" variant="primary" onClick={() => onUpdate(b)} className="shrink-0">
                  Update
                </Button>
              </div>

              {/* Status & Delay Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={effectiveStatus} />
                <DelayBadge delayInfo={delayInfo} />
              </div>

              {/* Details Key-Value List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-start justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Event Date:</span>
                  <span className="font-medium text-pms-text text-right sm:text-left">{dateRange}</span>
                </div>

                {isPendingTab && (
                  <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Task Deadline:</span>
                    <span className="font-medium text-pms-muted font-mono">{deadlineDisplay}</span>
                  </div>
                )}

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
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Menu Doc:</span>
                  <div>
                    <MenuAttachmentCell booking={b} onViewMenu={onViewMenu} />
                  </div>
                </div>

                {!isPendingTab && (
                  <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 border-b border-slate-100/80 sm:border-0">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Proof Doc:</span>
                    <div>{attachmentElement}</div>
                  </div>
                )}
              </div>

              {/* Extra Details for Completed: Remarks & UpdatedBy */}
              {!isPendingTab && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  {remarksText && remarksText !== '—' && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Remarks:</span>
                      <p className="text-slate-700 bg-slate-50 p-2 rounded-lg text-xs leading-relaxed">{remarksText}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-pms-muted pt-1">
                    <span>Updated By:</span>
                    <span className="font-medium text-slate-700">{deptData.updatedBy || (b.status === 'closed' || b.closed ? 'Closed Event' : '—')}</span>
                  </div>
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
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Event Date</th>
                {isPendingTab && <th className="py-3 px-4">Task Deadline</th>}
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Sessions</th>
                <th className="py-3 px-4">Menu Attachment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delay Days</th>
                {!isPendingTab && <th className="py-3 px-4">Remarks</th>}
                {!isPendingTab && <th className="py-3 px-4">Dept Proof</th>}
                <th className="py-3 px-4">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pms-border">
              {bookings.map((b) => {
                const deptData = b.departments?.[deptKey] || {};
                const effectiveStatus = deptData.status || (b.status === 'closed' || b.closed ? 'Complete' : 'Pending');
                const anchorDate = b.eventStartDate || b.eventDate;
                const plannedDate = derivedPlannedDate(anchorDate);
                const delayInfo = calculateDelayInfo(b, effectiveStatus, deptData.completedAt || deptData.updatedAt);
                const dateRange = formatDateRangeDisplay(b.eventStartDate || b.eventDate, b.eventEndDate || b.eventDate);
                const sessionCount = b.eventSchedule?.length || 0;

                const effectiveDeadline = getEffectiveDeadline(b);
                const deadlineDisplay = effectiveDeadline
                  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(effectiveDeadline)
                  : '—';

                const rowTint = delayInfo.cls === 'delayed'
                  ? 'bg-red-50/40 hover:bg-red-50/70'
                  : delayInfo.cls === 'atrisk'
                  ? 'bg-amber-50/40 hover:bg-amber-50/70'
                  : 'hover:bg-slate-50/80';

                let remarksText = '—';
                let allAttachments = [];

                if ((deptKey === 'vegetables' || deptKey === 'cheeseDairy') && Array.isArray(deptData.entries) && deptData.entries.length > 0) {
                  const remarksList = deptData.entries
                    .map(e => e.remarks)
                    .filter(Boolean);
                  remarksText = remarksList.length > 0 ? remarksList.join('; ') : '—';

                  allAttachments = deptData.entries.flatMap(e =>
                    Array.isArray(e.attachments) ? e.attachments : (e.attachment ? [e.attachment] : [])
                  ).filter(a => a && (a.name || a.path));
                } else {
                  remarksText = deptData.remarks || '—';
                  allAttachments = Array.isArray(deptData.attachments)
                    ? deptData.attachments
                    : (deptData.attachment ? [deptData.attachment] : []);
                }

                const attachmentElement = <AttachmentCell attachments={allAttachments} />;

                return (
                  <tr key={b.id} className={`transition-colors ${rowTint}`}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Button size="sm" variant="primary" onClick={() => onUpdate(b)}>
                        Update
                      </Button>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-pms-primary">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-pms-text">
                      {b.customerName}
                    </td>
                    <td className="py-3 px-4 text-pms-text font-medium whitespace-nowrap">
                      {dateRange}
                    </td>
                    {isPendingTab && (
                      <td className="py-3 px-4 text-pms-muted font-medium whitespace-nowrap font-mono text-[11px]">
                        {deadlineDisplay}
                      </td>
                    )}
                    <td className="py-3 px-4 text-pms-muted">
                      {b.venueName || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <MenuAttachmentCell booking={b} onViewMenu={onViewMenu} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={effectiveStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <DelayBadge delayInfo={delayInfo} />
                    </td>
                    {!isPendingTab && (
                      <td className="py-3 px-4 max-w-[180px] truncate text-slate-700 font-normal">
                        {remarksText}
                      </td>
                    )}
                    {!isPendingTab && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {attachmentElement}
                      </td>
                    )}
                    <td className="py-3 px-4 text-pms-muted">
                      {deptData.updatedBy || (b.status === 'closed' || b.closed ? 'Closed Event' : '—')}
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
