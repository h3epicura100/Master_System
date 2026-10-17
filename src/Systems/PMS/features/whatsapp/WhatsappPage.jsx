import React, { useState, useEffect, useCallback } from 'react';
import { ConversationsPanel } from './ConversationsPanel';
import { ConversationThread, getCleanMediaName } from './ConversationThread';
import { NewChatModal } from './NewChatModal';
import { supabase } from '../../services/supabase';
import { whatsappMessagesService } from '../../services/whatsappMessagesService';
import { whatsappService } from '../../services/whatsappService';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

export function WhatsappPage() {
  const { currentUser } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await whatsappMessagesService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('Could not load WhatsApp conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Initial load - do not auto select any chat, and backfill any missing staff contact names
  useEffect(() => {
    loadConversations();
    whatsappService.backfillStaffContactNames().then((updated) => {
      if (updated) {
        loadConversations();
      }
    });
  }, [loadConversations]);

  // Load thread messages whenever selected conversation changes
  const loadThread = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const msgs = await whatsappMessagesService.getThread(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load thread messages:', err);
      toast.error('Failed to load thread messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      loadThread(selectedConvId);
    }
  }, [selectedConvId, loadThread]);

  // Handle selecting a conversation and clearing unread count
  const handleSelectConversation = (convId) => {
    setSelectedConvId(convId);
    whatsappMessagesService.markAsRead(convId);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  };

  // Realtime subscription for incoming/outgoing WhatsApp messages
  useEffect(() => {
    const channel = supabase
      .channel('wa-realtime-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pms_wa_messages',
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // If message is in the currently selected conversation, reload thread
          if (newMsg.conversation_id === selectedConvId) {
            loadThread(selectedConvId);
            if (newMsg.direction === 'incoming') {
              whatsappMessagesService.markAsRead(selectedConvId);
            }
          }

          // Refresh conversation list summaries
          loadConversations(false);

          // Trigger visual toast notification on new incoming reply
          if (payload.eventType === 'INSERT' && newMsg.direction === 'incoming') {
            const sender = newMsg.sent_by_name || 'Contact';
            let snippet = newMsg.message || '';
            if (/@lid_|@s\.whatsapp\.net|^false_\d+|^true_\d+|^\[(IMAGE|DOCUMENT|VIDEO|AUDIO)\]/i.test(snippet) || !snippet) {
              snippet = newMsg.media_name ? `Attachment: ${getCleanMediaName(newMsg.media_name, newMsg.media_type)}` : 'Received media';
            }
            toast.info(`WhatsApp reply from ${sender}: "${snippet.slice(0, 60)}"`, {
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pms_wa_conversations',
        },
        () => {
          loadConversations(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId, loadThread, loadConversations]);

  const selectedConversation = conversations.find((c) => c.id === selectedConvId) || null;

  // Handle sending a message in the active thread (with optional attachment)
  const handleSendMessage = async (payload) => {
    const text = typeof payload === 'string' ? payload : (payload?.text || '');
    const file = typeof payload === 'object' ? payload?.file : null;

    if (!selectedConversation || (!text.trim() && !file)) return;

    const contact = selectedConversation.contact || {};
    if (!contact.phone) {
      toast.error('Selected conversation has no valid phone number.');
      return;
    }

    setSending(true);
    try {
      let uploadedMediaUrl = null;
      let mediaName = null;
      let mediaType = null;

      if (file) {
        toast.info(`Uploading "${file.name}"...`);
        const uploadRes = await storageService.uploadAttachment('whatsapp/direct', file);
        if (uploadRes?.path) {
          uploadedMediaUrl = storageService.getPublicUrl(uploadRes.path);
          mediaName = file.name;
          mediaType = file.type;
        }
      }

      await whatsappService.sendDirectMessage({
        phone: contact.phone,
        message: text.trim(),
        mediaUrl: uploadedMediaUrl,
        mediaName,
        mediaType,
        displayName: contact.display_name,
        userId: contact.user_id,
        isStaff: contact.is_staff,
        sentBy: currentUser?.id || 'system',
        sentByName: currentUser?.display_name || currentUser?.name || currentUser?.id || 'Staff',
      });

      toast.success(file ? 'Message with attachment sent!' : 'Message sent via WhatsApp!');
      // Refresh current thread and conversation list
      await Promise.all([
        loadThread(selectedConvId),
        loadConversations(false),
      ]);
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
      toast.error(err.message || 'Failed to dispatch WhatsApp message.');
      // Refresh thread to display the failed message status
      await Promise.all([
        loadThread(selectedConvId),
        loadConversations(false),
      ]);
    } finally {
      setSending(false);
    }
  };

  // Handle retrying a failed message
  const handleRetryMessage = async (messageId) => {
    if (!messageId) return;

    try {
      toast.info('Retrying WhatsApp message dispatch...');
      await whatsappService.retryDirectMessage(messageId);
      toast.success('Message successfully dispatched!');
      await Promise.all([
        loadThread(selectedConvId),
        loadConversations(false),
      ]);
    } catch (err) {
      console.error('Retry failed:', err);
      toast.error(`Retry failed: ${err.message}`);
      await loadThread(selectedConvId);
    }
  };

  // Calculate summary metrics
  const totalChats = conversations.length;
  const failedCount = conversations.filter((c) => c.last_message_status === 'Failed').length;
  const staffCount = conversations.filter((c) => c.contact?.is_staff).length;
  const totalUnread = conversations.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden space-y-2 sm:space-y-3">
      {/* Top Header & Overview */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-slate-200 shrink-0 ${
          selectedConvId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                WhatsApp Messenger
              </h1>
              <p className="text-xs text-slate-500">
                Direct WhatsApp messaging, live incoming replies, and delivery tracking
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-2xs">
            <div>
              <span className="text-slate-400">Total Chats: </span>
              <span className="font-bold text-slate-900">{totalChats}</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400">Staff: </span>
              <span className="font-bold text-blue-600">{staffCount}</span>
            </div>
            {totalUnread > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span>{totalUnread} unread</span>
                </div>
              </>
            )}
            {failedCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1 text-rose-600 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{failedCount} failed</span>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              loadConversations();
              if (selectedConvId) loadThread(selectedConvId);
            }}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-2xs"
            title="Refresh all"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConversations ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Messenger Container */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden flex">
        {/* Left Panel: Conversations (hidden on small screen if a chat is active) */}
        <div
          className={`w-full lg:w-[380px] shrink-0 h-full flex flex-col min-h-0 ${
            selectedConvId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ConversationsPanel
            conversations={conversations}
            selectedConversationId={selectedConvId}
            onSelectConversation={handleSelectConversation}
            onOpenNewChat={() => setIsNewChatOpen(true)}
            loading={loadingConversations}
          />
        </div>

        {/* Right Panel: Active Thread (hidden on small screen if no chat is active) */}
        <div
          className={`flex-1 h-full min-w-0 flex flex-col min-h-0 ${
            !selectedConvId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ConversationThread
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            sending={sending}
            onSendMessage={handleSendMessage}
            onRetryMessage={handleRetryMessage}
            onRefresh={() => loadThread(selectedConvId)}
            onBackMobile={() => setSelectedConvId(null)}
          />
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onConversationStarted={async (convId) => {
          await loadConversations();
          setSelectedConvId(convId);
        }}
      />
    </div>
  );
}



