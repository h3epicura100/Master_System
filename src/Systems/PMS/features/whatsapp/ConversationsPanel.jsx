import React, { useState } from 'react';
import { formatTimeDisplay, formatShortDateDisplay } from '../../utils/dateUtils';
import {
  Search,
  Plus,
  MessageSquare,
  CheckCheck,
  AlertCircle,
  Clock,
  User,
  Users,
  Phone,
  Filter,
} from 'lucide-react';

function formatLastMessageSnippet(lastMsg) {
  if (!lastMsg) return 'No messages yet';
  const trimmed = String(lastMsg).trim();
  if (
    /^\[(IMAGE|DOCUMENT|VIDEO|AUDIO|VOICE|PTT|MEDIA)\]/i.test(trimmed) ||
    /false_\d+@lid_/i.test(trimmed) ||
    /@s\.whatsapp\.net/i.test(trimmed) ||
    /@lid_/i.test(trimmed)
  ) {
    if (/image|\.jpg|\.jpeg|\.png|\.webp/i.test(trimmed)) return '📷 Photo';
    if (/video|\.mp4/i.test(trimmed)) return '🎥 Video';
    if (/audio|voice|ptt|\.mp3|\.ogg/i.test(trimmed)) return '🎵 Voice message';
    return '📎 Attachment';
  }
  return trimmed;
}

export function ConversationsPanel({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onOpenNewChat,
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'staff' | 'direct'

  const filteredConversations = conversations.filter((conv) => {
    const contact = conv.contact || {};
    const name = (contact.display_name || '').toLowerCase();
    const phone = (contact.phone || '').toLowerCase();
    const lastMsg = (conv.last_message || '').toLowerCase();
    const q = search.toLowerCase().trim();

    // Search filter
    const matchesSearch = !q || name.includes(q) || phone.includes(q) || lastMsg.includes(q);
    if (!matchesSearch) return false;

    // Tab filter
    if (tab === 'staff') return Boolean(contact.is_staff);
    if (tab === 'direct') return !contact.is_staff;
    return true;
  });

  const getRelativeTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return formatTimeDisplay(isoString);
      }
      return formatShortDateDisplay(isoString);
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 min-h-0 overflow-hidden">
      {/* Panel Top Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 space-y-2.5 sm:space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Chats</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {conversations.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            New Message
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats or phone numbers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              tab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              tab === 'staff'
                ? 'bg-pms-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              tab === 'direct'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Direct
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
        {loading && conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600">No chats found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {search
                ? 'Try a different search term'
                : 'Click "New Message" above to start your first WhatsApp conversation.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            const contact = conv.contact || {};
            const isStaff = contact.is_staff;
            const name = contact.display_name || contact.phone || 'Contact';
            const timeStr = getRelativeTime(conv.last_message_at);
            const status = conv.last_message_status;
            const unreadCount = Number(conv.unread_count || 0);
            const isReceived = status === 'Received';

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-pms-primary shadow-xs'
                    : unreadCount > 0
                      ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                      isStaff
                        ? 'bg-blue-100 text-pms-primary border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {name[0]?.toUpperCase() || 'C'}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className={`text-xs truncate ${unreadCount > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {name}
                    </h3>
                    <span className={`text-[10px] shrink-0 ${unreadCount > 0 ? 'font-bold text-emerald-600' : 'text-slate-400 font-medium'}`}>
                      {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[11px] truncate flex-1 ${unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-500 font-normal'}`}>
                      {formatLastMessageSnippet(conv.last_message)}
                    </p>

                    {/* Unread badge or Status icon */}
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white min-w-4 text-center shrink-0 shadow-xs">
                        {unreadCount}
                      </span>
                    ) : status === 'Failed' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Delivery failed" />
                    ) : status === 'Pending' ? (
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Pending" />
                    ) : isReceived ? (
                      <span className="text-[10px] font-semibold text-emerald-600 shrink-0">Reply</span>
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Sent" />
                    )}
                  </div>

                  {/* Sub-label */}
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                    <span>+{contact.phone}</span>
                    {isStaff && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-sans font-medium text-[9px]">
                        Staff
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
