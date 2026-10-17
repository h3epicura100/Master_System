import { supabase } from './supabase.js';
import { whatsappService, normalizePhoneNumber } from './whatsappService.js';
import { DEPT_LIST } from '../constants/departments.js';
import { getEffectiveDeadline } from '../utils/delayUtils.js';
import { formatDateRangeDisplay } from '../utils/dateUtils.js';

const LOCAL_NOTIF_CACHE_KEY = 'pms_wa_notifications_local_v1';
let memoryNotifCache = new Set();

function loadLocalNotifCache() {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIF_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(k => memoryNotifCache.add(k));
      }
    }
  } catch (_) {}
}

function saveLocalNotifCache(key) {
  memoryNotifCache.add(key);
  try {
    const list = Array.from(memoryNotifCache).slice(-500); // keep last 500
    localStorage.setItem(LOCAL_NOTIF_CACHE_KEY, JSON.stringify(list));
  } catch (_) {}
}

loadLocalNotifCache();

function formatOverdueDisplay(diffMs) {
  const totalHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (remHours === 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  return `${days}d ${remHours}h`;
}

/**
 * Returns current IST date parts for reminder slot evaluation.
 */
function getISTDateParts() {
  const now = new Date();

  // Use pure UTC arithmetic to compute IST (UTC+5:30 = UTC+330 minutes).
  // This avoids a locale quirk where en-IN with hour12:false can still
  // return 12-hour values (e.g. "03" instead of "15" for 3 PM),
  // causing the 3 PM reminder slot to silently never match.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const istDateStr = `${year}-${month}-${day}`;
  const istHour = istDate.getUTCHours();    // 0-23, always 24h
  const istMinute = istDate.getUTCMinutes();

  return { istDateStr, istHour, istMinute };
}

export const notificationService = {
  /**
   * Constructs the WhatsApp delay alert or scheduled reminder text.
   * No guest count, no venue name.
   */
  buildDelayMessage(booking, deptLabel, diffMs, isReminder = false, slotLabel = '') {
    const bookingId = booking?.id || '—';
    const customer = booking?.customerName || booking?.customer_name || '—';
    const functionType = booking?.functionType || booking?.function_type || '—';
    const startDate = booking?.eventStartDate || booking?.event_start_date || booking?.eventDate || booking?.event_date;
    const endDate = booking?.eventEndDate || booking?.event_end_date || booking?.eventDate || booking?.event_date;
    const dateRange = formatDateRangeDisplay(startDate, endDate);
    const overdueText = formatOverdueDisplay(diffMs);

    const header = isReminder
      ? `⏰ *TASK DELAY REMINDER (${slotLabel || 'SCHEDULED'})*`
      : `⚠️ *TASK DELAYED*`;

    const divider = `────────────────`;

    const lines = [
      header,
      divider,
      `📋 *Booking ID:* ${bookingId}`,
      `👤 *Customer:* ${customer}`,
      `🎊 *Function:* ${functionType}`,
      `📅 *Date:* ${dateRange}`,
      `📁 *Department:* ${deptLabel}`,
      `⏰ *Overdue:* ${overdueText}`,
      divider,
      `⚡ *Action Required:* Please complete your pending department task.`,
      `🌐 https://h3ms-supabase.vercel.app/`,
      `_H3MS (H3 Management System)_`,
    ];

    return lines.join('\n');
  },

  /**
   * Fetches phone numbers strictly mapped to a specific department.
   * Excludes admin and full_access users (per requirement: admin only receives menu finalized).
   */
  async getRecipientsForDepartment(deptKey) {
    const numbers = new Set();

    try {
      const { data: users, error } = await supabase
        .from('master_users')
        .select('id, username, full_name, role, mobile_number, is_active, page_access')
        .eq('is_active', true);

      if (!error && Array.isArray(users)) {
        users.forEach(u => {
          const pa = typeof u.page_access === 'string' ? JSON.parse(u.page_access) : (u.page_access || {});
          
          // User must have PMS access
          if (u.role !== 'admin' && pa.pms?.access !== true) {
            return;
          }

          // Requirement: Admins / full access do NOT receive delay messages (only menu finalized)
          if (u.role === 'admin' || pa.pms?.full_access === true) {
            return;
          }

          const perms = Array.isArray(pa.pms?.pages) ? pa.pms.pages : [];
          if (perms.includes(deptKey)) {
            const normalized = normalizePhoneNumber(u.mobile_number);
            if (normalized) {
              numbers.add(normalized);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[NotificationService] Error fetching department recipients from master_users:', e);
    }

    // Fallback to pms_users if no recipients found in master_users
    if (numbers.size === 0) {
      try {
        const { data: pmsUsers, error: pmsErr } = await supabase
          .from('pms_users')
          .select(`
            id,
            display_name,
            role,
            has_full_access,
            whatsapp_number,
            is_active,
            pms_user_permissions(permission_key)
          `)
          .eq('is_active', true);

        if (!pmsErr && Array.isArray(pmsUsers)) {
          pmsUsers.forEach(u => {
            if (u.role === 'admin' || u.has_full_access) return;
            const perms = (u.pms_user_permissions || []).map(p => p.permission_key);
            if (perms.includes(deptKey)) {
              const normalized = normalizePhoneNumber(u.whatsapp_number);
              if (normalized) numbers.add(normalized);
            }
          });
        }
      } catch (_) {}
    }

    return Array.from(numbers);
  },

  /**
   * Extends delay deadline by +24 hours for existing active bookings
   * whose event date is AFTER the newly created booking's event date,
   * ONLY when the new booking is created while that existing booking
   * is still within its active 48-hour grace window / deadline.
   */
  async extendDelayForExistingBookings(newEventDate, excludeBookingId = null, newBookingCreatedAt = null) {
    if (!newEventDate) return 0;

    const referenceTime = newBookingCreatedAt ? new Date(newBookingCreatedAt) : new Date();

    try {
      // 1. Try DB RPC first
      const { data: rpcCount, error: rpcErr } = await supabase.rpc('pms_extend_booking_delays', {
        p_new_event_date: newEventDate,
        p_exclude_booking_id: excludeBookingId,
        p_new_created_at: referenceTime.toISOString(),
      });

      if (!rpcErr && typeof rpcCount === 'number') {
        console.log(`[NotificationService] RPC extended delay for ${rpcCount} booking(s).`);
        return rpcCount;
      }
    } catch (err) {
      console.warn('[NotificationService] RPC extension failed, running direct update fallback:', err);
    }

    // Direct fallback with 48h active deadline guard
    try {
      const { data: laterBookings, error } = await supabase
        .from('pms_bookings')
        .select('id, created_at, delay_deadline_override, event_start_date, event_date, pms_menu_tasks(whatsapp_sent_at, updated_at, finalization_date)')
        .eq('status', 'active')
        .gt('event_date', newEventDate);

      if (error || !laterBookings) return 0;

      let updatedCount = 0;
      for (const bk of laterBookings) {
        if (excludeBookingId && bk.id === excludeBookingId) continue;

        // Current active deadline derived from menu finalizing message sent date + 48h (or override)
        const currentDeadline = getEffectiveDeadline(bk);

        // ONLY extend if the new booking was created while this existing booking is still within its active deadline window
        if (referenceTime.getTime() > currentDeadline.getTime()) {
          console.log(`[NotificationService] Skipping extension for ${bk.id}: 48h deadline expired before new booking creation.`);
          continue;
        }

        const newDeadline = new Date(currentDeadline.getTime() + 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('pms_bookings')
          .update({ delay_deadline_override: newDeadline })
          .eq('id', bk.id);

        updatedCount++;
      }

      console.log(`[NotificationService] Direct update extended delay for ${updatedCount} booking(s).`);
      return updatedCount;
    } catch (e) {
      console.error('[NotificationService] Failed to extend delays for later bookings:', e);
      return 0;
    }
  },

  /**
   * Scans active bookings and sends initial delay alert (at 48h mark) or scheduled reminders
   * at 11:00 AM, 3:00 PM, and 6:00 PM IST until task is Complete.
   */
  async checkAndSendDelayAlerts({ force = false } = {}) {
    console.log('[NotificationService] Starting delay check...');

    // 1. Fetch active bookings with Finalized menu
    const { data: bookings, error: bkErr } = await supabase
      .from('v_pms_bookings_expanded')
      .select(`
        *,
        pms_menu_tasks(*),
        pms_department_tasks(*),
        pms_vegetable_entries(*),
        pms_cheese_dairy_entries(*)
      `)
      .eq('status', 'active');

    if (bkErr || !bookings) {
      console.error('[NotificationService] Error fetching bookings:', bkErr);
      return { error: bkErr?.message || 'Failed to fetch bookings' };
    }

    // 2. Fetch departments
    const { data: depts } = await supabase.from('pms_departments').select('*').order('sort_order');
    const deptList = depts && depts.length > 0 ? depts : DEPT_LIST;

    // 3. Fetch past notification history from database to prevent duplicate sends
    let notifHistory = [];
    try {
      const { data: history } = await supabase
        .from('pms_whatsapp_notifications')
        .select('booking_id, department_key, type, sent_at, status');
      if (history) notifHistory = history;
    } catch (e) {
      console.warn('[NotificationService] Could not read notification history table (may not exist yet):', e);
    }

    const now = new Date();
    const { istDateStr, istHour, istMinute } = getISTDateParts();

    // Strict reminder window (< 20 min past hour)
    let currentReminderSlot = null;
    let slotLabel = '';

    if (istHour === 11 && istMinute < 20) {
      currentReminderSlot = 'reminder_11am';
      slotLabel = '11:00 AM';
    } else if (istHour === 15 && istMinute < 20) {
      currentReminderSlot = 'reminder_3pm';
      slotLabel = '3:00 PM';
    } else if (istHour === 18 && istMinute < 20) {
      currentReminderSlot = 'reminder_6pm';
      slotLabel = '6:00 PM';
    }

    const isBusinessHours = istHour >= 9 && istHour < 20;

    const results = [];
    let delayedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;

    for (const b of bookings) {
      const menuTask = Array.isArray(b.pms_menu_tasks) ? b.pms_menu_tasks[0] : b.pms_menu_tasks;
      if (menuTask?.status !== 'Finalized') continue;

      const effectiveDeadline = getEffectiveDeadline(b);
      if (!effectiveDeadline) continue; // Task delay timer starts strictly after menu finalizing whatsapp_sent_at

      const diffMs = now.getTime() - effectiveDeadline.getTime();
      const isDelayed = diffMs > 0;

      if (!isDelayed) continue; // Task is still within 48h + extension window

      for (const d of deptList) {
        const deptKey = d.key;
        const deptLabel = d.label;

        // Check if task is complete
        let isComplete = false;
        if (d.dept_type === 'vegetables' || d.type === 'vegetables') {
          const vEntries = b.pms_vegetable_entries || [];
          isComplete = vEntries.length > 0 && vEntries.every(e => e.status === 'Complete');
        } else if (d.dept_type === 'cheeseDairy' || d.type === 'cheeseDairy') {
          const cEntries = b.pms_cheese_dairy_entries || [];
          isComplete = cEntries.length > 0 && cEntries.every(e => e.status === 'Complete');
        } else {
          const dt = (b.pms_department_tasks || []).find(t => t.department_key === deptKey || t.department === deptKey);
          isComplete = dt?.status === 'Complete';
        }

        if (isComplete) continue; // Skip completed tasks

        delayedCount++;

        // Filter notification history for this booking + dept
        const historyForTask = notifHistory.filter(
          h => h.booking_id === b.id && h.department_key === deptKey
        );

        const hasAnyPriorNotification = historyForTask.length > 0;
        const initialDedupKey = `${b.id}_${deptKey}_initial_delay`;
        const hasEverSentInitial =
          historyForTask.some(h => h.type === 'initial_delay' && h.status === 'Sent') ||
          memoryNotifCache.has(initialDedupKey);

        let sendType = null;
        let isReminder = false;

        if (!hasAnyPriorNotification && !hasEverSentInitial) {
          if (isBusinessHours || force) {
            sendType = 'initial_delay';
            isReminder = false;
          }
        } else if (currentReminderSlot || force) {
          // Scheduled reminder slot
          const targetSlot = currentReminderSlot || 'reminder_11am';
          const slotDedupKey = `${b.id}_${deptKey}_${targetSlot}_${istDateStr}`;

          const alreadySentSlotToday =
            historyForTask.some(h => {
              if (h.type !== targetSlot || h.status !== 'Sent') return false;
              const sentIst = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(new Date(h.sent_at));
              return sentIst === istDateStr;
            }) || memoryNotifCache.has(slotDedupKey);

          if (!alreadySentSlotToday) {
            sendType = targetSlot;
            isReminder = true;
          }
        }

        if (!sendType) {
          skippedCount++;
          continue;
        }

        // Deduplication key to protect immediately before sending
        const dedupKey = sendType === 'initial_delay'
          ? `${b.id}_${deptKey}_initial_delay`
          : `${b.id}_${deptKey}_${sendType}_${istDateStr}`;

        if (memoryNotifCache.has(dedupKey) && !force) {
          skippedCount++;
          continue;
        }

        // Mark immediately in local cache to prevent concurrent loops
        saveLocalNotifCache(dedupKey);

        // Fetch recipients (strictly assigned dept users, NO admin, or tester number in Test Mode)
        let recipients = [];
        if (whatsappService.isTestMode()) {
          const testNum = whatsappService.getDefaultNumber();
          recipients = testNum ? [testNum] : [];
          console.info(`[NotificationService] Test Mode Active: Sending delay alert only to tester number: ${testNum}`);
        } else {
          recipients = await this.getRecipientsForDepartment(deptKey);
        }

        if (recipients.length === 0) {
          console.warn(`[NotificationService] No phone numbers mapped for department: ${deptKey}`);
          skippedCount++;
          results.push({
            bookingId: b.id,
            department: deptKey,
            status: 'Skipped',
            reason: 'No phone numbers mapped to department',
          });
          continue;
        }

        const message = this.buildDelayMessage(b, deptLabel, diffMs, isReminder, slotLabel);

        let sendStatus = 'Sent';
        let errorMsg = null;

        if (whatsappService.isConfigured()) {
          for (const phone of recipients) {
            let apiRes = null;
            let sendError = null;
            try {
              apiRes = await whatsappService._sendText(phone, message);
            } catch (err) {
              sendError = err;
              console.error(`[NotificationService] Error sending to ${phone}:`, err);
              sendStatus = 'Partial';
              errorMsg = err.message || 'Send failed';
            }

            // Record in staff chat thread (Sent or Failed)
            try {
              await whatsappService._logMessageToThread({
                phone,
                message,
                status: sendError ? 'Failed' : 'Sent',
                errorMessage: sendError ? sendError.message : null,
                sentBy: isReminder ? 'delay_reminder' : 'delay_alert',
                sentByName: isReminder ? `Reminder (${slotLabel || 'Task'})` : 'Task Delay Alert',
                bookingId: b.id,
                maytapiResponse: apiRes,
                isStaff: true,
              });
            } catch (logErr) {
              console.warn('[NotificationService] Could not log delay message to chat thread:', logErr);
            }
          }
        } else {
          sendStatus = 'Skipped';
          errorMsg = 'Maytapi credentials not configured';
        }

        // Record in pms_whatsapp_notifications (if DB table exists)
        try {
          await supabase.from('pms_whatsapp_notifications').insert({
            booking_id: b.id,
            department_key: deptKey,
            type: sendType,
            recipients,
            status: sendStatus,
            error_message: errorMsg,
          });
        } catch (insertErr) {
          console.warn('[NotificationService] Could not record notification in DB:', insertErr);
        }

        sentCount++;
        results.push({
          bookingId: b.id,
          department: deptKey,
          type: sendType,
          recipientsCount: recipients.length,
          status: sendStatus,
        });
      }
    }

    console.log('[NotificationService] Delay check summary:', {
      delayedCount,
      sentCount,
      skippedCount,
      results,
    });

    return {
      success: true,
      timestamp: now.toISOString(),
      istDate: istDateStr,
      istHour,
      currentReminderSlot,
      delayedCount,
      sentCount,
      skippedCount,
      results,
    };
  },

  /**
   * Retrieves notification logs from the database for the Admin settings view.
   */
  async getNotificationLogs(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('pms_whatsapp_notifications')
        .select(`
          *,
          pms_bookings (
            customer_id,
            event_start_date,
            event_end_date,
            pms_customers ( name )
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Fallback if joined relation fails
        const { data: simpleData } = await supabase
          .from('pms_whatsapp_notifications')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(limit);
        return simpleData || [];
      }

      return data || [];
    } catch (e) {
      console.warn('[NotificationService] Error fetching notification logs:', e);
      return [];
    }
  },
};
