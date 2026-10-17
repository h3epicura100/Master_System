import { supabase } from './supabase';
import { authService } from '../features/auth/authService';
import { normalizePhoneNumber } from './whatsappService';

export const whatsappMessagesService = {
  /**
   * Fetches all conversations ordered by most recent message, with joined contact details.
   */
  async getConversations() {
    try {
      const { data, error } = await supabase
        .from('pms_wa_conversations')
        .select(`
          *,
          contact:pms_wa_contacts(*)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[WhatsApp Messages] Error fetching conversations:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.warn('[WhatsApp Messages] Fallback or empty conversations:', err);
      return [];
    }
  },

  /**
   * Fetches the full message history for a given conversation thread.
   */
  async getThread(conversationId) {
    if (!conversationId) return [];

    try {
      const { data, error } = await supabase
        .from('pms_wa_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('[WhatsApp Messages] Error fetching thread:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.warn('[WhatsApp Messages] Error in getThread:', err);
      return [];
    }
  },

  /**
   * Gets or creates a contact record by normalized phone number.
   */
  async getOrCreateContact({ phone, displayName, userId, isStaff = false }) {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    try {
      // 1. Check existing contact
      const { data: existing, error: findError } = await supabase
        .from('pms_wa_contacts')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existing) {
        // Update display_name / user_id if newly provided
        const updates = {};
        if (displayName && (!existing.display_name || existing.display_name !== displayName)) {
          updates.display_name = displayName;
        }
        if (userId && !existing.user_id) {
          updates.user_id = userId;
        }
        if (isStaff !== undefined && existing.is_staff !== isStaff) {
          updates.is_staff = isStaff;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { data: updated } = await supabase
            .from('pms_wa_contacts')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single();
          return updated || existing;
        }

        return existing;
      }

      // 2. Insert new contact
      const newContact = {
        phone: cleanPhone,
        display_name: displayName || cleanPhone,
        user_id: userId || null,
        is_staff: Boolean(isStaff),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: insertError } = await supabase
        .from('pms_wa_contacts')
        .insert([newContact])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return created;
    } catch (err) {
      console.error('[WhatsApp Messages] getOrCreateContact error:', err);
      throw err;
    }
  },

  /**
   * Gets or creates a conversation entry for the given contactId.
   */
  async getOrCreateConversation(contactId) {
    if (!contactId) throw new Error('contactId is required');

    try {
      const { data: existing, error: findError } = await supabase
        .from('pms_wa_conversations')
        .select('*, contact:pms_wa_contacts(*)')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existing) return existing;

      const newConv = {
        contact_id: contactId,
        last_message: null,
        last_message_at: new Date().toISOString(),
        last_message_status: 'Sent',
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: insertError } = await supabase
        .from('pms_wa_conversations')
        .insert([newConv])
        .select('*, contact:pms_wa_contacts(*)')
        .single();

      if (insertError) throw insertError;
      return created;
    } catch (err) {
      console.error('[WhatsApp Messages] getOrCreateConversation error:', err);
      throw err;
    }
  },

  /**
   * Loads all system users who have a configured whatsapp_number.
   */
  async getStaffContacts() {
    try {
      const users = await authService.loadUsers();
      if (!users || !Array.isArray(users)) return [];

      return users
        .filter(u => Boolean(u.whatsapp_number || u.whatsappNumber))
        .map(u => ({
          id: u.id,
          userId: u.id,
          displayName: u.display_name || u.name || u.id,
          whatsappNumber: u.whatsapp_number || u.whatsappNumber,
          role: u.role || 'staff',
        }));
    } catch (err) {
      console.warn('[WhatsApp Messages] Could not load staff contacts:', err);
      return [];
    }
  },

  /**
   * Helper to record any dispatched automated message (Menu Finalize, Delay Alerts, Reminders)
   * into contacts, conversations, and messages.
   * Auto-links to staff if the phone number matches a staff user.
   */
  async recordDispatchedMessage({
    phone,
    message = '',
    mediaUrl = null,
    mediaName = null,
    mediaType = null,
    status = 'Sent',
    errorMessage = null,
    sentBy = 'system',
    sentByName = 'System',
    bookingId = null,
    maytapiResponse = null,
    displayName = null,
    userId = null,
    isStaff = null,
  }) {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || (!message && !mediaUrl)) return null;

    const textContent = (message || '').trim();
    const summaryText = textContent || (mediaName ? `📎 ${mediaName}` : '📎 Attachment');

    try {
      // 1. Resolve contact details if not fully provided
      let finalName = displayName;
      let finalUserId = userId;
      let finalIsStaff = isStaff;

      if (!finalName || finalIsStaff === null || finalIsStaff === undefined) {
        try {
          const staffList = await this.getStaffContacts();
          const match = staffList.find(s => normalizePhoneNumber(s.whatsappNumber) === cleanPhone);
          if (match) {
            if (!finalName) finalName = match.displayName;
            if (!finalUserId) finalUserId = match.userId;
            if (finalIsStaff === null || finalIsStaff === undefined) finalIsStaff = true;
          }
        } catch (_) {}
      }

      if (finalIsStaff === null || finalIsStaff === undefined) {
        finalIsStaff = false;
      }

      // 2. Get or create Contact
      const contact = await this.getOrCreateContact({
        phone: cleanPhone,
        displayName: finalName || cleanPhone,
        userId: finalUserId,
        isStaff: finalIsStaff,
      });

      // 3. Get or create Conversation
      const conversation = await this.getOrCreateConversation(contact.id);

      // 4. Insert Message
      const { data: msgData, error: msgErr } = await supabase
        .from('pms_wa_messages')
        .insert([{
          conversation_id: conversation.id,
          contact_id: contact.id,
          message: textContent,
          direction: 'outgoing',
          media_url: mediaUrl || null,
          media_name: mediaName || null,
          media_type: mediaType || null,
          status: status || 'Sent',
          error_message: errorMessage || null,
          sent_by: sentBy,
          sent_by_name: sentByName,
          sent_at: new Date().toISOString(),
          booking_id: bookingId || null,
          maytapi_response: maytapiResponse || null,
        }])
        .select()
        .single();

      if (msgErr) {
        console.warn('[WhatsApp Messages] Could not record message log:', msgErr);
      }

      // 5. Update Conversation Summary
      await supabase
        .from('pms_wa_conversations')
        .update({
          last_message: summaryText,
          last_message_at: new Date().toISOString(),
          last_message_status: status || 'Sent',
          message_count: (conversation.message_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);

      return msgData;
    } catch (err) {
      console.warn('[WhatsApp Messages] Error in recordDispatchedMessage:', err);
      return null;
    }
  },

  /**
   * Resets the unread count of a conversation to 0.
   */
  async markAsRead(conversationId) {
    if (!conversationId) return false;

    try {
      const { error } = await supabase
        .from('pms_wa_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.warn('[WhatsApp Messages] Failed to mark conversation as read:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[WhatsApp Messages] Error in markAsRead:', err);
      return false;
    }
  },
};

