/**
 * Delay utilities for H3MS (H3 Management System).
 * Calculates task delays based on 48-hour creation window + priority extension overrides.
 */

/**
 * Calculates planned date for department tasks.
 * Rule: 1 day before the eventDate.
 */
export function derivedPlannedDate(eventDate) {
  if (!eventDate) return '';
  const d = new Date(eventDate);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Date/timestamp when the menu finalization WhatsApp message was sent.
 */
export function getMenuFinalizedSentDate(booking) {
  if (!booking) return null;

  // 1. Check menu object (JS frontend shape)
  const menu = booking.menu;
  if (menu) {
    const sentAt = menu.whatsappSentAt || menu.whatsapp_sent_at;
    if (sentAt) {
      const d = new Date(sentAt);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 2. Check pms_menu_tasks relation (DB raw query shape)
  const rawMenuTask = Array.isArray(booking.pms_menu_tasks)
    ? booking.pms_menu_tasks[0]
    : booking.pms_menu_tasks;

  if (rawMenuTask) {
    const sentAt = rawMenuTask.whatsapp_sent_at || rawMenuTask.whatsappSentAt;
    if (sentAt) {
      const d = new Date(sentAt);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Direct properties on booking object
  const directSentAt = booking.whatsapp_sent_at || booking.whatsappSentAt || booking.menu_whatsapp_sent_at || booking.menuWhatsappSentAt;
  if (directSentAt) {
    const d = new Date(directSentAt);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Returns the effective delay deadline Date for a booking.
 * - If delayDeadlineOverride is set: uses that timestamp.
 * - Otherwise: timestamp of Menu Finalizing message sent date + 48 hours.
 * - If menu finalizing message has not been sent: returns null (no fallback to creation date).
 */
export function getEffectiveDeadline(booking) {
  if (!booking) return null;

  const override = booking.delayDeadlineOverride || booking.delay_deadline_override;
  if (override) {
    return new Date(override);
  }

  const menuSentDate = getMenuFinalizedSentDate(booking);
  if (menuSentDate) {
    return new Date(menuSentDate.getTime() + 48 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Calculates exact delay state and label for a department task.
 * Delay clock starts ONLY after completion of 48 hours from the menu finalizing WhatsApp message.
 */
export function calculateDelayInfo(bookingOrPlanned, status, completedAtStr) {
  // If a booking object is passed
  if (bookingOrPlanned && typeof bookingOrPlanned === 'object') {
    return calculateTaskDelayInfo(bookingOrPlanned, status, completedAtStr);
  }

  // Fallback for legacy date string usage
  const plannedDateStr = bookingOrPlanned;
  if (!plannedDateStr) {
    return { label: '—', cls: 'pending', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline: null };
  }

  const planned = new Date(plannedDateStr);
  planned.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (status === 'Complete') {
    const completedDate = completedAtStr ? new Date(completedAtStr) : today;
    completedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((completedDate - planned) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'On Time', cls: 'completed', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline: planned };
    }
    return {
      label: `${diffDays} Day${diffDays > 1 ? 's' : ''} Delayed`,
      cls: 'delayed',
      isDelayed: true,
      isDueToday: false,
      hoursOverdue: diffDays * 24,
      effectiveDeadline: planned,
    };
  }

  // Pending status
  const diffDays = Math.round((today - planned) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'On Time', cls: 'completed', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline: planned };
  }
  if (diffDays === 0) {
    return { label: 'Due Today', cls: 'atrisk', isDelayed: false, isDueToday: true, hoursOverdue: 0, effectiveDeadline: planned };
  }
  return {
    label: `${diffDays} Day${diffDays > 1 ? 's' : ''} Delayed`,
    cls: 'delayed',
    isDelayed: true,
    isDueToday: false,
    hoursOverdue: diffDays * 24,
    effectiveDeadline: planned,
  };
}

/**
 * Modern delay calculation strictly based on 48h from menu finalizing message & priority override.
 */
export function calculateTaskDelayInfo(booking, status, completedAtStr) {
  if (!booking) {
    return { label: '—', cls: 'pending', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline: null };
  }

  const effectiveDeadline = getEffectiveDeadline(booking);

  // If menu finalizing message has not been sent yet, task delay timer has not started
  if (!effectiveDeadline) {
    return { label: status === 'Complete' ? 'On Time' : 'Pending', cls: status === 'Complete' ? 'completed' : 'pending', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline: null };
  }
  const now = new Date();

  if (status === 'Complete' || booking.status === 'closed' || booking.closed) {
    let completedDate = null;
    if (completedAtStr) {
      const parsed = new Date(completedAtStr);
      if (!isNaN(parsed.getTime())) {
        completedDate = parsed;
      }
    }
    if (!completedDate) {
      const rawFallback = booking.updatedAt || booking.updated_at;
      if (rawFallback) {
        const parsed = new Date(rawFallback);
        if (!isNaN(parsed.getTime())) {
          completedDate = parsed;
        }
      }
    }
    if (!completedDate) {
      completedDate = now;
    }

    const diffMs = completedDate.getTime() - effectiveDeadline.getTime();

    if (diffMs <= 0) {
      return { label: 'On Time', cls: 'completed', isDelayed: false, isDueToday: false, hoursOverdue: 0, effectiveDeadline };
    }

    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (hours < 24) {
      return {
        label: `${hours}h Delayed`,
        cls: 'delayed',
        isDelayed: true,
        isDueToday: false,
        hoursOverdue: hours,
        effectiveDeadline,
      };
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const label = remHours > 0 && days < 3 ? `${days}d ${remHours}h Delayed` : `${days} Day${days > 1 ? 's' : ''} Delayed`;

    return {
      label,
      cls: 'delayed',
      isDelayed: true,
      isDueToday: false,
      hoursOverdue: hours,
      effectiveDeadline,
    };
  }

  // Pending status
  const diffMs = now.getTime() - effectiveDeadline.getTime();

  if (diffMs <= 0) {
    // Grace period still active
    const msRemaining = Math.abs(diffMs);
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));

    if (hoursRemaining <= 12) {
      return {
        label: `${hoursRemaining}h Left`,
        cls: 'atrisk',
        isDelayed: false,
        isDueToday: true,
        hoursOverdue: 0,
        effectiveDeadline,
      };
    }

    return {
      label: 'On Time',
      cls: 'completed',
      isDelayed: false,
      isDueToday: false,
      hoursOverdue: 0,
      effectiveDeadline,
    };
  }

  // Delayed! (Past 48h + extensions)
  const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (hours < 24) {
    return {
      label: `${hours}h Delayed`,
      cls: 'delayed',
      isDelayed: true,
      isDueToday: false,
      hoursOverdue: hours,
      effectiveDeadline,
    };
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const label = remHours > 0 && days < 3 ? `${days}d ${remHours}h Delayed` : `${days} Day${days > 1 ? 's' : ''} Delayed`;

  return {
    label,
    cls: 'delayed',
    isDelayed: true,
    isDueToday: false,
    hoursOverdue: hours,
    effectiveDeadline,
  };
}
