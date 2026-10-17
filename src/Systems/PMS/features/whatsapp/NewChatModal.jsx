import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { whatsappMessagesService } from '../../services/whatsappMessagesService';
import { whatsappService, normalizePhoneNumber } from '../../services/whatsappService';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { User, Phone, Send, Search, Users, Paperclip, X, FileText } from 'lucide-react';

export function NewChatModal({ isOpen, onClose, onConversationStarted }) {
  const { currentUser } = useAuth();

  const [mode, setMode] = useState('staff'); // 'staff' | 'custom'
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [searchStaff, setSearchStaff] = useState('');

  // Selected staff user
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Custom contact inputs
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');

  // Message content
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      // Reset state
      setSelectedStaff(null);
      setCustomPhone('');
      setCustomName('');
      setMessage('');
      setBookingId('');
      setAttachment(null);
      setMode('staff');
    }
  }, [isOpen]);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const list = await whatsappMessagesService.getStaffContacts();
      setStaffList(list);
    } catch (err) {
      console.warn('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchStaff.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.displayName && s.displayName.toLowerCase().includes(q)) ||
      (s.whatsappNumber && s.whatsappNumber.includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q))
    );
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds 30 MB size limit.`);
      return;
    }

    setAttachment(file);
    e.target.value = '';
  };

  const handleSend = async (e) => {
    e?.preventDefault();

    let targetPhone = '';
    let targetDisplayName = '';
    let targetUserId = null;
    let isStaff = false;

    if (mode === 'staff') {
      if (!selectedStaff) {
        toast.error('Please select a staff member.');
        return;
      }
      targetPhone = selectedStaff.whatsappNumber;
      targetDisplayName = selectedStaff.displayName;
      targetUserId = selectedStaff.userId;
      isStaff = true;
    } else {
      if (!customPhone.trim()) {
        toast.error('Please enter a valid phone number.');
        return;
      }
      targetPhone = customPhone.trim();
      targetDisplayName = customName.trim() || customPhone.trim();
      isStaff = false;
    }

    if (!message.trim() && !attachment) {
      toast.error('Please write a message or attach a file before sending.');
      return;
    }

    const clean = normalizePhoneNumber(targetPhone);
    if (!clean) {
      toast.error('Invalid phone number format. Must contain at least 10 digits.');
      return;
    }

    setSending(true);
    try {
      let uploadedMediaUrl = null;
      let mediaName = null;
      let mediaType = null;

      if (attachment) {
        const uploadRes = await storageService.uploadAttachment('whatsapp/direct', attachment);
        if (uploadRes?.path) {
          uploadedMediaUrl = storageService.getPublicUrl(uploadRes.path);
          mediaName = attachment.name;
          mediaType = attachment.type;
        }
      }

      const res = await whatsappService.sendDirectMessage({
        phone: targetPhone,
        message: message.trim(),
        mediaUrl: uploadedMediaUrl,
        mediaName,
        mediaType,
        displayName: targetDisplayName,
        userId: targetUserId,
        isStaff,
        sentBy: currentUser?.id || 'system',
        sentByName: currentUser?.display_name || currentUser?.name || currentUser?.id || 'Staff',
        bookingId: bookingId.trim() || null,
      });

      toast.success(`Message sent to ${targetDisplayName}!`);
      onClose();
      if (onConversationStarted && res.conversationId) {
        onConversationStarted(res.conversationId);
      }
    } catch (err) {
      console.error('Failed to send new chat message:', err);
      toast.error(err.message || 'Failed to dispatch WhatsApp message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New WhatsApp Message"
      subtitle="Send a direct WhatsApp message to staff or any customer phone number"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSend} className="space-y-4">
        {/* Recipient Mode Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'staff'
                ? 'bg-white text-pms-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Registered Staff ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'custom'
                ? 'bg-white text-pms-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Custom Phone Number
          </button>
        </div>

        {/* Staff Selection Mode */}
        {mode === 'staff' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name or phone..."
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pms-primary/20 focus:border-pms-primary"
              />
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {loadingStaff ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading staff contacts...</div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {staffList.length === 0
                    ? 'No staff members have a WhatsApp number set in Settings.'
                    : 'No matching staff found.'}
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelected = selectedStaff?.userId === staff.userId;
                  return (
                    <div
                      key={staff.userId}
                      onClick={() => setSelectedStaff(staff)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-pms-primary'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-pms-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {staff.displayName?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {staff.displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {staff.whatsappNumber}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 capitalize">
                        {staff.role}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            {selectedStaff && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
                <span>Selected: <strong>{selectedStaff.displayName}</strong> ({selectedStaff.whatsappNumber})</span>
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="text-emerald-900 text-[11px] font-semibold hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Phone Mode */}
        {mode === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Recipient Phone Number"
              placeholder="e.g. 9876543210 or 919876543210"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              required
              hint="Indian 10-digit mobile numbers are automatically formatted with country code."
            />
            <Input
              label="Contact / Customer Name"
              placeholder="e.g. Rahul Sharma"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              hint="Optional name for chat thread reference."
            />
          </div>
        )}

        {/* Optional Booking ID Tag */}
        <div>
          <Input
            label="Booking ID Reference (Optional)"
            placeholder="e.g. BK-2026-001"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            hint="Associate this message conversation with a specific catering booking."
          />
        </div>

        {/* Message Box */}
        <div>
          <Textarea
            label="Message Content"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            hint={`${message.length} characters`}
          />
        </div>

        {/* File Attachment input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Attachment (Optional)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
          />
          {attachment ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 truncate">{attachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-slate-400 hover:text-rose-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl text-xs text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-2 bg-slate-50 hover:bg-emerald-50/40 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <span>Choose Image or Document (up to 30 MB)</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={sending} disabled={sending || (!message.trim() && !attachment)}>
            <Send className="w-4 h-4 mr-1.5" />
            Send WhatsApp
          </Button>
        </div>
      </form>
    </Modal>
  );
}
