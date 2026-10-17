import React, { useState, useEffect } from 'react';
import {
  Download,
  Paperclip,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Loader2,
  Eye,
  FileCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { menuPdfService } from './menuPdfService';
import { H3_DEFAULT_RULES } from './chatbotPrompts';
import { useBookings } from '../bookings/bookingHooks';
import { menuService } from '../menu/menuService';
import { storageService } from '../../services/storageService';
import { toast } from 'sonner';

export function MenuPreviewPanel({ menuData, onResetMenu }) {
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' (iframe) | 'tabs' (session cards)
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [isAttaching, setIsAttaching] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [showPdfToolbar, setShowPdfToolbar] = useState(false);

  const { data: bookings = [] } = useBookings();
  const activeBookings = bookings.filter(
    (b) => b.status === 'active' || (!b.status && !b.closed && !b.cancelled)
  );

  const hasData = Boolean(menuData && (menuData.sessions?.length > 0 || menuData.clientName));

  // Generate PDF blob URL for the embedded iframe when PDF view is active
  useEffect(() => {
    let isCancelled = false;
    let createdUrl = null;

    if (viewMode === 'pdf' && hasData) {
      menuPdfService.getPdfBlobUrl(menuData)
        .then((url) => {
          if (isCancelled) {
            if (url) URL.revokeObjectURL(url);
          } else {
            createdUrl = url;
            setPdfBlobUrl(url);
          }
        })
        .catch((err) => {
          console.warn('Failed to generate PDF blob URL:', err);
        });
    } else {
      setPdfBlobUrl(null);
    }

    return () => {
      isCancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [viewMode, menuData, hasData]);

  const handleDownload = async () => {
    if (!hasData) {
      toast.error('No menu data to generate PDF.');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      await menuPdfService.downloadPdf(menuData);
      toast.success('H3 Catering Menu PDF downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF: ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAttachToBooking = async () => {
    if (!selectedBookingId) {
      toast.error('Please select a booking.');
      return;
    }

    const booking = bookings.find((b) => b.id === selectedBookingId);
    if (!booking) return;

    try {
      setIsAttaching(true);

      const pdfFile = await menuPdfService.getPdfFile(menuData);
      const uploadedAttachment = await storageService.uploadAttachment(
        `menu/${selectedBookingId}`,
        pdfFile
      );

      if (!uploadedAttachment) {
        throw new Error('Failed to upload PDF attachment to storage.');
      }

      const existingAttachments = booking.menu?.attachments || [];
      const updatedAttachments = [...existingAttachments, uploadedAttachment];

      await menuService.updateMenuDecision(selectedBookingId, {
        status: 'Finalized',
        remarks: booking.menu?.remarks || '',
        attachments: updatedAttachments,
        bookingData: booking,
      });

      toast.success(`Menu attached & finalized for Booking ${selectedBookingId}!`);
      setShowAttachModal(false);
    } catch (e) {
      console.error('Attach error:', e);
      toast.error('Failed to attach menu: ' + e.message);
    } finally {
      setIsAttaching(false);
    }
  };

  if (!hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-pms-primary mb-3 shadow-xs">
          <ChefHat className="w-6 h-6 text-pms-primary" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">Live Menu Blueprint</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Your structured sessions, live counters, and catering PDF preview will appear here automatically.
        </p>
      </div>
    );
  }

  const sessions = menuData.sessions || [];
  const currentSession = sessions[selectedSessionIdx] || sessions[0];
  const staffMeals = menuData.staffMeals || [];
  const rules = (menuData.rules && menuData.rules.length > 0) ? menuData.rules : H3_DEFAULT_RULES;

  return (
    <div className="h-full flex flex-col bg-slate-100/70 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-hidden">
      {/* Top Action & View Switcher Bar */}
      <div className="p-2.5 sm:p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
        <div className="min-w-0 flex-1">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {menuData.eventName || 'H3 Catering Proposal'}
          </h2>
          <p className="text-[11px] text-slate-500 truncate">
            {menuData.city ? `${menuData.city} • ` : ''}{menuData.dates || ''} {menuData.clientName ? `(${menuData.clientName})` : ''}
          </p>
        </div>

        {/* View Mode Segmented Control (Compact inline pill) */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('pdf')}
            className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'pdf'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Embedded PDF Viewer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('tabs')}
            className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'tabs'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Interactive Session Tabs"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Session Tabs</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGeneratingPdf}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download PDF"
          >
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAttachModal(true)}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            title="Attach to PMS Booking"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Attach</span>
          </button>

          <button
            type="button"
            onClick={onResetMenu}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Clear Blueprint"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 min-h-0 ${
        viewMode === 'pdf'
          ? 'p-2 sm:p-3 flex flex-col overflow-hidden bg-slate-200/50'
          : 'overflow-y-auto p-2.5 sm:p-4'
      }`}>
        {/* ======================================================== */}
        {/* MODE 1: LIVE PDF EMBED VIEW (Direct iframe to jsPDF)     */}
        {/* ======================================================== */}
        {viewMode === 'pdf' && (
          <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-300 min-h-0">
            {/* Dedicated PDF Top Control Bar */}
            <div className="bg-slate-800 text-slate-200 px-3 py-1.5 flex items-center justify-between border-b border-slate-700 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white text-[11px] sm:text-xs">Live PDF • A4 Fit</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setShowPdfToolbar(!showPdfToolbar)}
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] sm:text-[11px] text-slate-200 transition-colors"
                  title="Toggle built-in browser PDF tool controls"
                >
                  {showPdfToolbar ? 'Hide Tools' : 'Show Tools'}
                </button>
              </div>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 w-full h-full min-h-0 relative bg-slate-900">
              {pdfBlobUrl ? (
                <iframe
                  key={`${pdfBlobUrl}-${showPdfToolbar}`}
                  src={`${pdfBlobUrl}#view=FitH&navpanes=0${showPdfToolbar ? '' : '&toolbar=0'}`}
                  className="w-full h-full border-0 absolute inset-0"
                  title="Live PDF Document Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                  <span className="text-xs">Rendering live PDF preview...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 3: SESSION TABS (Card view)                         */}
        {/* ======================================================== */}
        {viewMode === 'tabs' && (
          <div className="space-y-3">
            {/* Sessions Tab Bar */}
            {sessions.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {sessions.map((session, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSessionIdx(idx)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        selectedSessionIdx === idx
                          ? 'bg-pms-primary text-white border-pms-primary shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedSessionIdx === idx ? 'bg-amber-300' : 'bg-blue-500'}`} />
                        <span>{session.name || `Session ${idx + 1}`}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected Session Viewer */}
                {currentSession && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
                    {/* Session Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {currentSession.name}
                        </h3>
                        {currentSession.date && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                            {currentSession.date}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {currentSession.timings && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {currentSession.timings}
                          </span>
                        )}
                        {currentSession.pax && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {currentSession.pax} Pax
                          </span>
                        )}
                        {currentSession.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {currentSession.venue}
                          </span>
                        )}
                      </div>
                    </div>

                    {currentSession.notes && (
                      <div className="bg-amber-50 border border-amber-200/70 text-amber-900 px-2.5 py-1.5 rounded-lg text-xs">
                        <span className="font-bold">Setup:</span> {currentSession.notes}
                      </div>
                    )}

                    {/* Categories & Dishes */}
                    <div className="space-y-2.5">
                      {(currentSession.categories || []).map((cat, catIdx) => {
                        const isLive = cat.isLiveCounter || cat.name?.toUpperCase().includes('LIVE') || cat.name?.toUpperCase().includes('CHAAT');

                        return (
                          <div
                            key={catIdx}
                            className={`rounded-lg border overflow-hidden ${
                              isLive ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                            }`}
                          >
                            {/* Category Title */}
                            <div className={`px-2.5 py-1.5 flex items-center justify-between font-bold text-xs ${
                              isLive ? 'bg-amber-100/70 text-amber-900' : 'bg-slate-100/80 text-slate-800'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                {isLive && <Sparkles className="w-3 h-3 text-amber-600" />}
                                {cat.name}
                              </span>
                              {isLive && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold">
                                  LIVE COUNTER
                                </span>
                              )}
                            </div>

                            {/* Items */}
                            <div className="p-2.5 divide-y divide-slate-100 bg-white">
                              {(cat.items || []).map((item, itemIdx) => (
                                <div key={itemIdx} className="py-1.5 first:pt-0 last:pb-0">
                                  <span className="font-semibold text-xs text-slate-900">
                                    {item.name}
                                  </span>
                                  {item.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Staff Meal Counts */}
            {staffMeals.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Staff Meal Allocation
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5 text-center">B</th>
                        <th className="p-1.5 text-center">L</th>
                        <th className="p-1.5 text-center">Hi-Tea</th>
                        <th className="p-1.5 text-center">D</th>
                        <th className="p-1.5 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffMeals.map((sm, smIdx) => {
                        const total =
                          Number(sm.breakfast || 0) +
                          Number(sm.lunch || 0) +
                          Number(sm.hiTea || 0) +
                          Number(sm.dinner || 0);

                        return (
                          <tr key={smIdx}>
                            <td className="p-1.5 font-medium text-slate-900">{sm.date}</td>
                            <td className="p-1.5 text-center text-slate-600">{sm.breakfast || 0}</td>
                            <td className="p-1.5 text-center text-slate-600">{sm.lunch || 0}</td>
                            <td className="p-1.5 text-center text-slate-600">{sm.hiTea || 0}</td>
                            <td className="p-1.5 text-center text-slate-600">{sm.dinner || 0}</td>
                            <td className="p-1.5 text-center font-bold text-blue-700">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Operational Rules */}
            {rules.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200/70 p-3 shadow-2xs space-y-1.5">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Operational Rules
                </h3>
                <ul className="space-y-1 text-xs text-amber-950">
                  {rules.map((rule, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-700">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Attach to Booking */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                Attach PDF to Booking
              </h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Select an active booking from H3MS. The generated menu PDF will be uploaded to Supabase Storage and marked as <span className="font-bold text-emerald-600">Finalized</span> for all department workflows.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Choose Booking:</label>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Active Booking --</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.client_name || b.name || 'Client'} ({b.event_date || 'Date'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBookingId || isAttaching}
                onClick={handleAttachToBooking}
                className="px-4 py-1.5 text-xs font-bold bg-pms-primary hover:bg-pms-primary-hover text-white rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isAttaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Attach & Finalize</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

