import { useMemo } from 'react';
import { useBookings } from '../features/bookings/bookingHooks';
import { DEPT_LIST } from '../constants/departments';

/**
 * Derives the live count of pending tasks/items for every workflow and booking page in H3MS.
 * Synchronizes with real-time TanStack query cache ('pms_bookings').
 */
export function usePendingCounts() {
  const { data: bookings = [] } = useBookings();

  return useMemo(() => {
    // 1. Active bookings (not closed or cancelled)
    const activeBookings = bookings.filter(
      b => b.status === 'active' || (!b.status && !b.closed && !b.cancelled)
    );

    // 2. Active bookings with Finalized menu (workflow pool for departments)
    const activeFinalized = activeBookings.filter(b => b.menu?.status === 'Finalized');

    // Counts mapping for all page keys
    const counts = {
      // Total active bookings pending event completion
      bookings: activeBookings.length,
      // Active bookings with menu not yet finalized
      menuFinalize: activeBookings.filter(b => b.menu?.status !== 'Finalized').length,
    };

    // Department pending counts: active bookings with finalized menu where task is not Complete
    DEPT_LIST.forEach(dept => {
      counts[dept.key] = activeFinalized.filter(
        b => b.departments?.[dept.key]?.status !== 'Complete'
      ).length;
    });

    return counts;
  }, [bookings]);
}
