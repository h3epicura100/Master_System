import { supabase } from './supabase';
import { storageService } from './storageService';
import { authService } from '../features/auth/authService';
import { formatDateRangeDisplay, formatDateDisplay, formatShortDateDisplay } from '../utils/dateUtils';

const MAYTAPI_PRODUCT_ID = import.meta.env.VITE_MAYTAPI_PRODUCT_ID;
const MAYTAPI_PHONE_ID = import.meta.env.VITE_MAYTAPI_PHONE_ID;
const MAYTAPI_TOKEN = import.meta.env.VITE_MAYTAPI_TOKEN;
const DEFAULT_NUMBER = import.meta.env.VITE_WHATSAPP_DEFAULT_NUMBER || '917000206500';

/**
 * Normalizes phone number into digits without '+' or spaces (e.g. 917000206500).
 */
export function normalizePhoneNumber(rawNumber) {
  if (!rawNumber) return null;
  let digits = String(rawNumber).replace(/\D/g, '');
  if (!digits) return null;

  // If leading 0 with 11 digits (e.g. 07000206500), strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // 10 digits Indian mobile number (e.g. 7000206500) -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export const whatsappService = {
  /**
   * Checks if Maytapi credentials are configured in environment variables.
   */
  isConfigured() {
    return Boolean(
      MAYTAPI_PRODUCT_ID &&
      MAYTAPI_PHONE_ID &&
      MAYTAPI_TOKEN &&
      MAYTAPI_PRODUCT_ID.trim() !== '' &&
      MAYTAPI_PHONE_ID.trim() !== '' &&
      MAYTAPI_TOKEN.trim() !== ''
    );
  },

  /**
   * Checks if WhatsApp Test Mode is active (VITE_WHATSAPP_TEST_MODE === 'true').
   * In Test Mode, messages are routed EXCLUSIVELY to VITE_WHATSAPP_DEFAULT_NUMBER (917000206500)
   * and real staff department numbers are suppressed.
   */
  isTestMode() {
    const val = import.meta.env.VITE_WHATSAPP_TEST_MODE;
    if (val === undefined || val === null) return false;
    const clean = String(val).trim().toLowerCase();
    return clean === 'true' || clean === '1' || clean === 'yes';
  },

  /**
   * Returns the normalized default/tester WhatsApp number.
   */
  getDefaultNumber() {
    return normalizePhoneNumber(DEFAULT_NUMBER);
  },

  /**
   * Internal helper to send a text message via Maytapi.
   */
  async _sendText(toNumber, text) {
    const endpoint = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID.trim()}/${MAYTAPI_PHONE_ID.trim()}/sendMessage`;
    const payload = {
      to_number: toNumber,
      type: 'text',
      message: text,
    };

    console.log(`[WhatsApp Service] Sending text to ${toNumber}...`, payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-maytapi-key': MAYTAPI_TOKEN.trim(),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[WhatsApp Service] Text response for ${toNumber}:`, { status: response.status, ok: response.ok, data });

    if (!response.ok || data.success === false) {
      const errMsg = data.message || data.error || `HTTP ${response.status}: Failed to send text message`;
      throw new Error(errMsg);
    }

    return data;
  },

  /**
   * Internal helper to send media/attachment with caption via Maytapi.
   * Maytapi type 'media' expects the direct public URL in the 'message' field
   * and the caption/text in the 'caption' / 'text' fields.
   */
  async _sendMedia(toNumber, mediaUrl, caption = '') {
    const endpoint = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID.trim()}/${MAYTAPI_PHONE_ID.trim()}/sendMessage`;
    const payload = {
      to_number: toNumber,
      type: 'media',
      message: mediaUrl,
      caption: caption || '',
      text: caption || '',
    };

    console.log(`[WhatsApp Service] Sending media with caption to ${toNumber}...`, payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-maytapi-key': MAYTAPI_TOKEN.trim(),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[WhatsApp Service] Media response for ${toNumber}:`, { status: response.status, ok: response.ok, data });

    if (!response.ok || data.success === false) {
      const errMsg = data.message || data.error || `HTTP ${response.status}: Failed to send media`;
      throw new Error(errMsg);
    }

    return data;
  },

  /**
   * Sends a WhatsApp message (with attachment as single message if documentUrl is provided).
   */
  async sendMessage({ toNumber, message, documentUrl, caption }) {
    if (!this.isConfigured()) {
      throw new Error('Maytapi credentials are not configured in .env');
    }

    const cleanTo = normalizePhoneNumber(toNumber);
    if (!cleanTo) {
      throw new Error(`Invalid recipient phone number: ${toNumber}`);
    }

    if (documentUrl) {
      return await this._sendMedia(cleanTo, documentUrl, caption || message);
    } else {
      return await this._sendText(cleanTo, message);
    }
  },

  /**
   * Builds a clean, mobile-optimized WhatsApp message for a finalized menu.
   */
  buildMenuFinalizedMessage(booking, remarks, schedule = []) {
    const bookingId = booking?.id || '—';
    const customer = booking?.customerName || booking?.customer?.name || booking?.customer_name || '—';
    const functionType = booking?.functionType || booking?.function_type || '—';
    
    const startDate = booking?.eventStartDate || booking?.event_start_date || booking?.eventDate || booking?.event_date;
    const endDate = booking?.eventEndDate || booking?.event_end_date || booking?.eventDate || booking?.event_date;
    const dateRange = formatDateRangeDisplay(startDate, endDate);

    const remarksText = remarks || booking?.menu?.remarks || booking?.remarks || '';
    const refName = booking?.referenceName || booking?.reference_name || '';
    const refNum = booking?.referenceNumber || booking?.reference_number || '';

    const divider = `────────────────`;

    const lines = [
      `🎉 *MENU FINALIZED*`,
      divider,
      `📋 *Booking ID:* ${bookingId}`,
      `👤 *Customer:* ${customer}`,
      `🎊 *Function:* ${functionType}`,
      `📅 *Date:* ${dateRange}`,
    ];

    if (refName) {
      lines.push(`🤝 *Reference:* ${refName}${refNum ? ` (${refNum})` : ''}`);
    }

    // Schedule breakdown
    const activeSchedule = (schedule && schedule.length > 0)
      ? schedule
      : (booking?.eventSchedule || booking?.pms_event_schedule || []);

    if (activeSchedule && activeSchedule.length > 0) {
      lines.push(``);
      lines.push(divider);
      lines.push(`🗓️ *SCHEDULE & SESSIONS*`);
      
      activeSchedule.forEach((s) => {
        const sDate = formatShortDateDisplay(s.date || s.event_date);
        const sLabel = s.timeLabel || s.time_label || 'Session';
        const sPax = Number(s.guestCount ?? s.guest_count ?? 0).toLocaleString();
        lines.push(`▫️ ${sDate} (${sLabel}) : ${sPax} Pax`);
      });
    }

    // Remarks
    if (remarksText && remarksText.trim()) {
      lines.push(``);
      lines.push(divider);
      lines.push(`📝 *Remarks / Instructions:*`);
      lines.push(`${remarksText.trim()}`);
    }

    lines.push(``);
    lines.push(divider);
    lines.push(`📎 _Finalized menu attached above_`);
    lines.push(`🌐 https://h3ms-supabase.vercel.app/`);
    lines.push(`_H3MS (H3 Management System)_`);

    return lines.join('\n');
  },

  /**
   * Dispatches menu finalized WhatsApp notifications to all registered department user numbers (Staff & Admin)
   * plus the default fallback number.
   * If VITE_WHATSAPP_TEST_MODE=true, sends EXCLUSIVELY to VITE_WHATSAPP_DEFAULT_NUMBER (917000206500)
   * and suppresses real staff numbers.
   * Attaches the file directly with the details message as a single WhatsApp message.
   */
  async sendMenuFinalizedNotification(booking, attachmentPath, attachmentName, remarks) {
    if (!this.isConfigured()) {
      console.info('[WhatsApp Service] Maytapi credentials not configured in .env. Skipping WhatsApp notification.');
      return {
        status: 'Skipped',
        sent: 0,
        failed: 0,
        reason: 'Maytapi credentials not configured in .env',
      };
    }

    const recipientSet = new Set();
    const userPhoneMap = new Map();
    const isTest = this.isTestMode();

    // 1. Fetch all registered user phone numbers (Staff & Admin) from authService / database
    try {
      const users = await authService.loadUsers();
      if (users && Array.isArray(users)) {
        users.forEach(u => {
          const rawNum = u.whatsapp_number || u.whatsappNumber;
          if (rawNum) {
            const formatted = normalizePhoneNumber(rawNum);
            if (formatted) {
              userPhoneMap.set(formatted, {
                displayName: u.display_name || u.name || u.id,
                userId: u.id,
              });
              if (!isTest) {
                recipientSet.add(formatted);
                console.log(`[WhatsApp Service] Recipient added: ${formatted} (User: ${u.display_name || u.name || u.id}, Role: ${u.role || 'staff'})`);
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn('[WhatsApp Service] Could not fetch users via authService:', err);
      try {
        const { data: dbUsers } = await supabase
          .from('pms_users')
          .select('id, display_name, role, whatsapp_number')
          .not('whatsapp_number', 'is', null);

        if (dbUsers && Array.isArray(dbUsers)) {
          dbUsers.forEach(u => {
            const formatted = normalizePhoneNumber(u.whatsapp_number);
            if (formatted) {
              userPhoneMap.set(formatted, {
                displayName: u.display_name || u.id,
                userId: u.id,
              });
              if (!isTest) recipientSet.add(formatted);
            }
          });
        }
      } catch (dbErr) {
        console.warn('[WhatsApp Service] Database query fallback failed:', dbErr);
      }
    }

    if (isTest) {
      console.info(`[WhatsApp Service] TEST MODE ACTIVE (VITE_WHATSAPP_TEST_MODE=true): Suppressing staff numbers. Sending only to tester number (${DEFAULT_NUMBER}).`);
    }

    // 2. Always include the default configured tester number
    const defaultFormatted = normalizePhoneNumber(DEFAULT_NUMBER);
    if (defaultFormatted) {
      recipientSet.add(defaultFormatted);
    }

    const recipients = Array.from(recipientSet);

    if (recipients.length === 0) {
      return {
        status: 'Skipped',
        sent: 0,
        failed: 0,
        reason: 'No recipient WhatsApp numbers found',
      };
    }

    console.log(`[WhatsApp Service] Dispatching to ${recipients.length} recipients:`, recipients);

    // 3. Resolve attachment public URL (Supabase storage buckets are public)
    let publicMediaUrl = null;
    if (attachmentPath) {
      try {
        const resolvedUrl = storageService.getPublicUrl(attachmentPath);
        if (resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
          publicMediaUrl = resolvedUrl;
        } else {
          console.warn('[WhatsApp Service] Attachment path is not an accessible HTTP URL:', resolvedUrl);
        }
      } catch (err) {
        console.warn('[WhatsApp Service] Failed to resolve attachment public URL:', err);
      }
    }

    // 4. Fetch schedule sessions if not already in booking object
    let schedule = booking?.eventSchedule || booking?.pms_event_schedule || [];
    if ((!schedule || schedule.length === 0) && booking?.id) {
      try {
        const { data: schedData } = await supabase
          .from('pms_event_schedule')
          .select('*')
          .eq('booking_id', booking.id)
          .order('sort_order', { ascending: true });
        if (schedData && schedData.length > 0) {
          schedule = schedData;
        }
      } catch (e) {
        console.warn('[WhatsApp Service] Could not fetch event schedule for message:', e);
      }
    }

    // 5. Construct mobile-optimized message text
    const message = this.buildMenuFinalizedMessage(booking, remarks, schedule);

    // 6. Send as a single message: Media with message caption (or Text if no media)
    const results = await Promise.allSettled(
      recipients.map(async (phone) => {
        let apiRes = null;
        if (publicMediaUrl) {
          // Single message: document attachment with the full event details as caption
          apiRes = await this._sendMedia(phone, publicMediaUrl, message);
        } else {
          // Fallback if no media attachment
          apiRes = await this._sendText(phone, message);
        }

        const staffInfo = userPhoneMap.get(phone) || {};

        // Record successful dispatch into staff chat thread
        await this._logMessageToThread({
          phone,
          message,
          mediaUrl: publicMediaUrl,
          mediaName: attachmentName || 'Menu.pdf',
          mediaType: 'application/pdf',
          status: 'Sent',
          sentBy: 'menu_finalize',
          sentByName: 'Menu Finalize',
          bookingId: booking?.id || null,
          maytapiResponse: apiRes,
          isStaff: true,
          displayName: staffInfo.displayName || null,
          userId: staffInfo.userId || null,
        });

        return { phone, success: true };
      })
    );

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    results.forEach((res, index) => {
      const phone = recipients[index];
      if (res.status === 'fulfilled') {
        sentCount++;
      } else {
        failedCount++;
        const errMsg = res.reason?.message || 'Unknown send error';
        errors.push({
          number: phone,
          error: errMsg,
        });

        const staffInfo = userPhoneMap.get(phone) || {};

        // Record failed dispatch into staff chat thread
        this._logMessageToThread({
          phone,
          message,
          mediaUrl: publicMediaUrl,
          mediaName: attachmentName || 'Menu.pdf',
          mediaType: 'application/pdf',
          status: 'Failed',
          errorMessage: errMsg,
          sentBy: 'menu_finalize',
          sentByName: 'Menu Finalize',
          bookingId: booking?.id || null,
          isStaff: true,
          displayName: staffInfo.displayName || null,
          userId: staffInfo.userId || null,
        });
      }
    });

    let status = 'Sent';
    if (sentCount === 0 && failedCount > 0) {
      status = 'Failed';
    } else if (failedCount > 0) {
      status = 'Partial';
    }

    console.log('[WhatsApp Service] Batch notification summary:', {
      status,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
      errors,
    });

    return {
      status,
      sent: sentCount,
      failed: failedCount,
      recipients: recipients.length,
      isTestMode: isTest,
      errors,
    };
  },

  /**
   * Records any message into pms_wa_contacts, pms_wa_conversations, and pms_wa_messages.
   */
  async _logMessageToThread({
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
    isStaff = true,
  }) {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || (!message && !mediaUrl)) return null;

    const textContent = (message || '').trim();
    const summaryText = textContent || (mediaName ? `📎 ${mediaName}` : '📎 Attachment');

    try {
      // 1. Get or create Contact in pms_wa_contacts
      let contact;
      const { data: existingContact } = await supabase
        .from('pms_wa_contacts')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingContact) {
        contact = existingContact;
        const isPhoneNumberOnly = !contact.display_name ||
          contact.display_name === cleanPhone ||
          /^[\d\s+\-()]+$/.test((contact.display_name || '').trim());

        if (displayName && isPhoneNumberOnly) {
          const updates = {
            display_name: displayName,
            updated_at: new Date().toISOString(),
          };
          if (userId && !contact.user_id) updates.user_id = userId;
          await supabase.from('pms_wa_contacts').update(updates).eq('id', contact.id);
          contact.display_name = displayName;
          if (updates.user_id) contact.user_id = updates.user_id;
        }
      } else {
        const { data: newContact, error: cErr } = await supabase
          .from('pms_wa_contacts')
          .insert([{
            phone: cleanPhone,
            display_name: displayName || cleanPhone,
            user_id: userId || null,
            is_staff: Boolean(isStaff),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();
        if (!cErr && newContact) contact = newContact;
      }

      if (!contact) return null;

      // 2. Get or create Conversation in pms_wa_conversations
      let conversation;
      const { data: existingConv } = await supabase
        .from('pms_wa_conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('pms_wa_conversations')
          .insert([{
            contact_id: contact.id,
            last_message: summaryText,
            last_message_at: new Date().toISOString(),
            last_message_status: status || 'Sent',
            message_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();
        if (!convErr && newConv) conversation = newConv;
      }

      if (!conversation) return null;

      // 3. Save message record in pms_wa_messages
      const { data: msgData, error: mErr } = await supabase
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

      if (mErr) {
        console.warn('[WhatsApp Service] Could not insert pms_wa_messages row:', mErr);
      }

      // 4. Update conversation summary
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

      return { contact, conversation, message: msgData };
    } catch (err) {
      console.warn('[WhatsApp Service] Error logging message to thread:', err);
      return null;
    }
  },

  /**
   * Backfills staff display names in pms_wa_contacts for contacts whose display_name is missing or only digits.
   * Returns true if any contacts were updated.
   */
  async backfillStaffContactNames() {
    try {
      let users = [];
      try {
        users = await authService.loadUsers();
      } catch (e) {
        console.warn('[WhatsApp Service] loadUsers failed during backfill:', e);
      }

      if (!users || !Array.isArray(users) || users.length === 0) {
        const { data: dbUsers } = await supabase
          .from('pms_users')
          .select('id, display_name, whatsapp_number')
          .not('whatsapp_number', 'is', null);
        users = dbUsers || [];
      }

      if (!users || users.length === 0) return false;

      const userPhoneMap = new Map();
      users.forEach(u => {
        const rawNum = u.whatsapp_number || u.whatsappNumber;
        if (rawNum) {
          const normalized = normalizePhoneNumber(rawNum);
          if (normalized) {
            userPhoneMap.set(normalized, {
              displayName: u.display_name || u.name || u.id,
              userId: u.id,
            });
          }
        }
      });

      const { data: contacts, error } = await supabase
        .from('pms_wa_contacts')
        .select('id, phone, display_name, user_id');

      if (error || !contacts || contacts.length === 0) return false;

      let updatedCount = 0;
      for (const contact of contacts) {
        const isPhoneNumberOnly = !contact.display_name ||
          contact.display_name === contact.phone ||
          /^[\d\s+\-()]+$/.test((contact.display_name || '').trim());

        if (!isPhoneNumberOnly) continue;

        const match = userPhoneMap.get(contact.phone);
        if (!match) continue;

        const updates = {
          display_name: match.displayName,
          is_staff: true,
          updated_at: new Date().toISOString(),
        };
        if (!contact.user_id && match.userId) {
          updates.user_id = match.userId;
        }

        const { error: updateErr } = await supabase
          .from('pms_wa_contacts')
          .update(updates)
          .eq('id', contact.id);

        if (!updateErr) {
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.info(`[WhatsApp Service] Successfully backfilled ${updatedCount} staff contact names.`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[WhatsApp Service] Backfill failed:', err);
      return false;
    }
  },

  /**
   * Sends a direct freeform WhatsApp message to a specific contact and records it in Supabase tables.
   */
  async sendDirectMessage({
    phone,
    message = '',
    mediaUrl = null,
    mediaName = null,
    mediaType = null,
    displayName = null,
    userId = null,
    isStaff = false,
    sentBy = null,
    sentByName = null,
    bookingId = null,
  }) {
    if (!this.isConfigured()) {
      throw new Error('Maytapi WhatsApp credentials are not configured in environment settings.');
    }

    if (!message?.trim() && !mediaUrl) {
      throw new Error('Please provide either a message or an attachment to send.');
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    // 1. Get or create Contact in pms_wa_contacts
    let contact;
    try {
      const { data: existingContact } = await supabase
        .from('pms_wa_contacts')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingContact) {
        contact = existingContact;
        // Update name or user_id if newly specified
        const updates = {};
        if (displayName && (!contact.display_name || contact.display_name === cleanPhone)) {
          updates.display_name = displayName;
        }
        if (userId && !contact.user_id) {
          updates.user_id = userId;
        }
        if (isStaff !== undefined && contact.is_staff !== isStaff) {
          updates.is_staff = isStaff;
        }
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { data: updated } = await supabase
            .from('pms_wa_contacts')
            .update(updates)
            .eq('id', contact.id)
            .select()
            .single();
          if (updated) contact = updated;
        }
      } else {
        const { data: newContact, error: cErr } = await supabase
          .from('pms_wa_contacts')
          .insert([{
            phone: cleanPhone,
            display_name: displayName || cleanPhone,
            user_id: userId || null,
            is_staff: Boolean(isStaff),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();
        if (cErr) throw cErr;
        contact = newContact;
      }
    } catch (cErr) {
      console.error('[WhatsApp Service] Contact error:', cErr);
      throw new Error(`Failed to initialize contact: ${cErr.message}`);
    }

    // 2. Get or create Conversation in pms_wa_conversations
    let conversation;
    try {
      const { data: existingConv } = await supabase
        .from('pms_wa_conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('pms_wa_conversations')
          .insert([{
            contact_id: contact.id,
            last_message: message.trim(),
            last_message_at: new Date().toISOString(),
            last_message_status: 'Pending',
            message_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();
        if (convErr) throw convErr;
        conversation = newConv;
      }
    } catch (convErr) {
      console.error('[WhatsApp Service] Conversation error:', convErr);
      throw new Error(`Failed to initialize conversation: ${convErr.message}`);
    }

    // 3. Determine target phone for Maytapi API (respecting Test Mode)
    const isTest = this.isTestMode();
    const actualApiNumber = isTest ? this.getDefaultNumber() : cleanPhone;

    console.log(`[WhatsApp Service] Sending direct message to ${cleanPhone} (API recipient: ${actualApiNumber}, TestMode: ${isTest}, Media: ${Boolean(mediaUrl)})`);

    let apiResponse = null;
    let sendError = null;

    try {
      if (mediaUrl) {
        apiResponse = await this._sendMedia(actualApiNumber, mediaUrl, message ? message.trim() : '');
      } else {
        apiResponse = await this._sendText(actualApiNumber, message.trim());
      }
    } catch (err) {
      sendError = err;
      console.error('[WhatsApp Service] Direct message send failed:', err);
    }

    const messageStatus = sendError ? 'Failed' : 'Sent';
    const errorMessage = sendError ? (sendError.message || 'Send error') : null;

    // 4. Save message log in pms_wa_messages & update conversation
    const logged = await this._logMessageToThread({
      phone: cleanPhone,
      message: message ? message.trim() : '',
      mediaUrl,
      mediaName,
      mediaType,
      status: messageStatus,
      errorMessage,
      sentBy,
      sentByName,
      bookingId,
      maytapiResponse: apiResponse,
      displayName,
      userId,
      isStaff,
    });

    if (sendError) {
      throw new Error(`Failed to deliver message: ${sendError.message}`);
    }

    return {
      success: true,
      status: 'Sent',
      contactId: logged?.contact?.id || contact.id,
      conversationId: logged?.conversation?.id || conversation.id,
      message: logged?.message,
    };
  },

  /**
   * Retries sending a failed message by ID.
   */
  async retryDirectMessage(messageId) {
    if (!messageId) throw new Error('messageId is required');

    // Fetch message and contact
    const { data: msg, error: fetchErr } = await supabase
      .from('pms_wa_messages')
      .select('*, contact:pms_wa_contacts(*)')
      .eq('id', messageId)
      .single();

    if (fetchErr || !msg) {
      throw new Error('Message not found to retry');
    }

    const cleanPhone = normalizePhoneNumber(msg.contact?.phone);
    if (!cleanPhone) {
      throw new Error('Invalid contact phone on message');
    }

    const isTest = this.isTestMode();
    const actualApiNumber = isTest ? this.getDefaultNumber() : cleanPhone;

    let apiResponse = null;
    let sendError = null;

    try {
      if (msg.media_url) {
        apiResponse = await this._sendMedia(actualApiNumber, msg.media_url, msg.message || '');
      } else {
        apiResponse = await this._sendText(actualApiNumber, msg.message || '');
      }
    } catch (err) {
      sendError = err;
    }

    const newStatus = sendError ? 'Failed' : 'Sent';
    const newErrMsg = sendError ? sendError.message : null;

    // Update message
    const { data: updatedMsg } = await supabase
      .from('pms_wa_messages')
      .update({
        status: newStatus,
        error_message: newErrMsg,
        sent_at: new Date().toISOString(),
        maytapi_response: apiResponse || msg.maytapi_response,
      })
      .eq('id', messageId)
      .select()
      .single();

    // Update conversation
    await supabase
      .from('pms_wa_conversations')
      .update({
        last_message_status: newStatus,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', msg.conversation_id);

    if (sendError) {
      throw new Error(`Retry failed: ${sendError.message}`);
    }

    return updatedMsg;
  },

  /**
   * Retrieves the currently configured webhook from Maytapi.
   */
  async getWebhookConfig() {
    if (!this.isConfigured()) return { webhook: null };
    try {
      const endpoint = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID.trim()}/${MAYTAPI_PHONE_ID.trim()}/config`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-maytapi-key': MAYTAPI_TOKEN.trim(),
        },
      });
      const data = await res.json().catch(() => ({}));
      return data || {};
    } catch (err) {
      console.warn('[WhatsApp Service] Could not fetch Maytapi webhook config:', err);
      return { error: err.message };
    }
  },

  /**
   * Registers a webhook URL with Maytapi.
   */
  async registerWebhook(webhookUrl) {
    if (!this.isConfigured()) {
      throw new Error('Maytapi credentials are not configured in environment settings.');
    }

    const targetUrl = webhookUrl || `${import.meta.env.VITE_SUPABASE_URL || 'https://hfvbyktusslocxsblenu.supabase.co'}/functions/v1/whatsapp-webhook`;
    const endpoint = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID.trim()}/${MAYTAPI_PHONE_ID.trim()}/config`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-maytapi-key': MAYTAPI_TOKEN.trim(),
      },
      body: JSON.stringify({
        webhook: targetUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || `HTTP ${res.status}: Failed to register webhook`);
    }

    return { success: true, webhook: targetUrl, data };
  },
};

