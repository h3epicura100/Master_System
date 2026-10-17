import { supabase } from '../../services/supabase';
import { storageService } from '../../services/storageService';
import { DEPT_LIST } from '../../constants/departments';
import { notificationService } from '../../services/notificationService';

function emptyDept(cfg) {
  const base = { status: 'Pending', remarks: '', attachments: [], updatedBy: '', updatedAt: '' };
  if (cfg.type === 'vegetables' || cfg.type === 'cheeseDairy') { base.entries = []; }
  return base;
}

function ensureBookingShape(b) {
  b.departments = b.departments || {};
  DEPT_LIST.forEach(cfg => {
    if (!b.departments[cfg.key]) b.departments[cfg.key] = emptyDept(cfg);
    const d = b.departments[cfg.key];
    if (cfg.type === 'vegetables' || cfg.type === 'cheeseDairy') { d.entries = d.entries || []; }
  });
  b.menu = b.menu || { status: 'Pending', details: '', reason: '', remarks: '', attachments: [], finalizationDate: '' };
  b.status = b.status || 'active';
  return b;
}

export const bookingService = {
  /**
   * Fetches real-time bookings strictly from Supabase with joined schedule and department entries.
   */
  async getBookings() {
    const { data, error } = await supabase
      .from('v_pms_bookings_expanded')
      .select(`
        *,
        pms_menu_tasks(*),
        pms_department_tasks(*),
        pms_vegetable_entries(*),
        pms_cheese_dairy_entries(*),
        pms_event_schedule(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error.message);
      throw error;
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map(b => {
      const depts = {};
      DEPT_LIST.forEach(cfg => {
        const dt = (b.pms_department_tasks || []).find(t => t.department_key === cfg.key || t.department === cfg.key);
        
        if (cfg.type === 'vegetables') {
          const entries = (b.pms_vegetable_entries || []).map(e => ({
            id: e.id,
            vegType: e.veg_type,
            source: e.source,
            status: e.status,
            remarks: e.remarks,
            attachments: Array.isArray(e.attachments) ? e.attachments : (e.attachment_path ? [{ name: e.attachment_name, path: e.attachment_path }] : []),
            updatedBy: e.updated_by,
            updatedAt: e.updated_at,
            completedAt: e.completed_at || (e.status === 'Complete' ? e.updated_at : null),
          }));
          const allDone = entries.length > 0 && entries.every(e => e.status === 'Complete');
          const latestCompletedAt = allDone
            ? (dt?.completed_at || dt?.updated_at || entries.reduce((max, e) => (e.completedAt && (!max || e.completedAt > max) ? e.completedAt : max), ''))
            : '';

          depts[cfg.key] = {
            status: allDone ? 'Complete' : 'Pending',
            entries,
            updatedBy: (dt && dt.updated_by) || (entries[0] && entries[0].updatedBy) || '',
            updatedAt: (dt && dt.updated_at) || (entries[0] && entries[0].updatedAt) || '',
            completedAt: latestCompletedAt || (dt && (dt.completed_at || (dt.status === 'Complete' ? dt.updated_at : null))) || '',
          };
        } else if (cfg.type === 'cheeseDairy') {
          const entries = (b.pms_cheese_dairy_entries || []).map(e => ({
            id: e.id,
            itemType: e.item_type,
            source: e.source,
            status: e.status,
            remarks: e.remarks,
            attachments: Array.isArray(e.attachments) ? e.attachments : (e.attachment_path ? [{ name: e.attachment_name, path: e.attachment_path }] : []),
            updatedBy: e.updated_by,
            updatedAt: e.updated_at,
            completedAt: e.completed_at || (e.status === 'Complete' ? e.updated_at : null),
          }));
          const allDone = entries.length > 0 && entries.every(e => e.status === 'Complete');
          const latestCompletedAt = allDone
            ? (dt?.completed_at || dt?.updated_at || entries.reduce((max, e) => (e.completedAt && (!max || e.completedAt > max) ? e.completedAt : max), ''))
            : '';

          depts[cfg.key] = {
            status: allDone ? 'Complete' : 'Pending',
            entries,
            updatedBy: (dt && dt.updated_by) || (entries[0] && entries[0].updatedBy) || '',
            updatedAt: (dt && dt.updated_at) || (entries[0] && entries[0].updatedAt) || '',
            completedAt: latestCompletedAt || (dt && (dt.completed_at || (dt.status === 'Complete' ? dt.updated_at : null))) || '',
          };
        } else {
          depts[cfg.key] = {
            status: dt ? dt.status : 'Pending',
            remarks: dt ? dt.remarks : '',
            attachments: dt && Array.isArray(dt.attachments) ? dt.attachments : (dt && dt.attachment_path ? [{ name: dt.attachment_name, path: dt.attachment_path }] : []),
            updatedBy: dt ? dt.updated_by : '',
            updatedAt: dt ? dt.updated_at : '',
            completedAt: dt ? (dt.completed_at || (dt.status === 'Complete' ? dt.updated_at : '')) : '',
          };
        }
      });

      const menuTask = Array.isArray(b.pms_menu_tasks) ? b.pms_menu_tasks[0] : b.pms_menu_tasks;

      const eventSchedule = (b.pms_event_schedule || []).map(s => ({
        id: s.id,
        date: s.event_date,
        timeLabel: s.time_label,
        guestCount: Number(s.guestCount || s.guest_count || 0),
        sortOrder: s.sort_order ?? 0,
      })).sort((a, b) => a.sortOrder - b.sortOrder);

      const computedTotalPax = eventSchedule.reduce((sum, s) => sum + (s.guestCount || 0), 0);
      const totalGuestCount = b.total_guest_count != null ? Number(b.total_guest_count) : computedTotalPax;
      const eventStartDate = b.event_start_date || b.event_date;
      const eventEndDate = b.event_end_date || b.event_date;

      return ensureBookingShape({
        id: b.id,
        bookingDate: b.booking_date || (b.created_at ? b.created_at.slice(0, 10) : null),
        createdAt: b.created_at || new Date().toISOString(),
        delayDeadlineOverride: b.delay_deadline_override || null,
        effectiveDelayDeadline: b.effective_delay_deadline || null,
        customerName: b.customer_name || '—',
        customerMobile: b.customer_mobile || '—',
        altNumber: b.alt_number,
        functionType: b.function_type,
        eventStartDate,
        eventEndDate,
        eventDate: eventStartDate || eventEndDate,
        guestCount: totalGuestCount,
        totalGuestCount,
        eventSchedule,
        venueName: b.venue_name,
        referenceName: b.reference_name,
        referenceNumber: b.reference_number,
        remarks: b.remarks,
        status: b.status || 'active',
        menu: {
          status: menuTask ? menuTask.status : 'Pending',
          reason: menuTask ? menuTask.reason : '',
          remarks: menuTask ? menuTask.remarks : '',
          attachments: menuTask && Array.isArray(menuTask.attachments) ? menuTask.attachments : (menuTask && menuTask.attachment_path ? [{ name: menuTask.attachment_name, path: menuTask.attachment_path }] : []),
          finalizationDate: menuTask ? menuTask.finalization_date : '',
          whatsappStatus: menuTask ? menuTask.whatsapp_status : null,
          whatsappSentAt: menuTask ? menuTask.whatsapp_sent_at : null,
          updatedAt: menuTask ? menuTask.updated_at : null,
        },
        departments: depts,
      });
    });
  },

  /**
   * Creates a new booking via atomic Supabase RPC pms_create_booking.
   */
  async createBooking(bookingData, createdBy = 'admin') {
    const schedulePayload = (bookingData.eventSchedule || []).map((s, idx) => ({
      date: s.date,
      time_label: s.timeLabel,
      guest_count: Number(s.guestCount),
      sort_order: idx,
    }));

    const { data, error } = await supabase.rpc('pms_create_booking', {
      p_customer_name: bookingData.customerName?.trim(),
      p_customer_mobile: bookingData.customerMobile?.trim() || null,
      p_alt_number: bookingData.altNumber?.trim() || null,
      p_function_type: bookingData.functionType || null,
      p_event_start_date: bookingData.eventStartDate,
      p_event_end_date: bookingData.eventEndDate,
      p_schedule: schedulePayload,
      p_venue_name: bookingData.venueName || null,
      p_reference_name: bookingData.referenceName || null,
      p_reference_number: bookingData.referenceNumber || null,
      p_remarks: bookingData.remarks || null,
      p_created_by: createdBy,
    });

    if (error) {
      console.error('Failed to create booking in Supabase:', error.message);
      throw new Error(error.message || 'Failed to create booking in database.');
    }

    // Priority Extension Rule: extend delay deadline by +24hrs for any existing active bookings with later event date
    // ONLY if the new booking is created while that existing booking is still within its active 48hr window
    const targetEventDate = bookingData.eventStartDate || bookingData.eventEndDate;
    if (targetEventDate) {
      notificationService.extendDelayForExistingBookings(targetEventDate, data, new Date().toISOString()).catch((e) => {
        console.warn('Priority extension background job error:', e);
      });
    }

    return data;
  },

  /**
   * Updates an existing booking in Supabase.
   */
  async updateBooking(id, bookingData) {
    const eventStartDate = bookingData.eventStartDate || bookingData.eventDate;
    const eventEndDate = bookingData.eventEndDate || bookingData.eventDate;

    const { error: bookingError } = await supabase
      .from('pms_bookings')
      .update({
        event_start_date: eventStartDate,
        event_end_date: eventEndDate,
        event_date: eventStartDate || eventEndDate,
        venue_name: bookingData.venueName || null,
        remarks: bookingData.remarks,
      })
      .eq('id', id);

    if (bookingError) {
      console.error('Failed to update booking in Supabase:', bookingError.message);
      throw new Error(bookingError.message || 'Failed to update booking.');
    }

    if (bookingData.eventSchedule && Array.isArray(bookingData.eventSchedule)) {
      const schedulePayload = bookingData.eventSchedule.map((s, idx) => ({
        date: s.date,
        time_label: s.timeLabel,
        guest_count: Number(s.guestCount),
        sort_order: idx,
      }));

      const { error: schedError } = await supabase.rpc('pms_upsert_event_schedule', {
        p_booking_id: id,
        p_schedule: schedulePayload,
      });

      if (schedError) {
        console.error('Failed to update event schedule in Supabase:', schedError.message);
        throw new Error(schedError.message || 'Failed to update event schedule.');
      }
    }
  },

  /**
   * Closes booking (move to history).
   */
  async closeBooking(id) {
    const { error } = await supabase.from('pms_bookings').update({ status: 'closed' }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  /**
   * Reopens history booking.
   */
  async reopenBooking(id) {
    const { error } = await supabase.from('pms_bookings').update({ status: 'active' }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  /**
   * Permanently deletes a booking and all associated child data & storage files from everywhere.
   */
  async deleteBooking(id) {
    if (!id) return;

    // 1. Collect storage attachment paths to clean up
    const pathsToDelete = [];
    try {
      const [deptTasks, menuTasks, vegEntries, cheeseEntries] = await Promise.all([
        supabase.from('pms_department_tasks').select('attachments').eq('booking_id', id),
        supabase.from('pms_menu_tasks').select('attachments').eq('booking_id', id),
        supabase.from('pms_vegetable_entries').select('attachments').eq('booking_id', id),
        supabase.from('pms_cheese_dairy_entries').select('attachments').eq('booking_id', id),
      ]);

      const collect = (res) => {
        if (!res?.data) return;
        res.data.forEach(r => {
          if (Array.isArray(r.attachments)) {
            r.attachments.forEach(a => { if (a?.path) pathsToDelete.push(a.path); });
          }
        });
      };

      collect(deptTasks);
      collect(menuTasks);
      collect(vegEntries);
      collect(cheeseEntries);
    } catch (err) {
      console.warn('Could not collect attachments for deletion:', err);
    }

    // 2. Delete child records
    await Promise.allSettled([
      supabase.from('pms_department_tasks').delete().eq('booking_id', id),
      supabase.from('pms_menu_tasks').delete().eq('booking_id', id),
      supabase.from('pms_vegetable_entries').delete().eq('booking_id', id),
      supabase.from('pms_cheese_dairy_entries').delete().eq('booking_id', id),
      supabase.from('pms_event_schedule').delete().eq('booking_id', id),
      supabase.from('pms_whatsapp_notifications').delete().eq('booking_id', id),
    ]);

    // 3. Delete parent booking record
    const { error } = await supabase.from('pms_bookings').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete booking in Supabase:', error.message);
      throw new Error(error.message || 'Failed to delete booking.');
    }

    // 4. Clean up storage files in background
    if (pathsToDelete.length > 0) {
      storageService.deleteAttachments(pathsToDelete).catch((e) => {
        console.warn('Error deleting storage files:', e);
      });
    }
  }
};
