import { supabase } from './supabase';

let activeChannel = null;
const listeners = new Set();

function initChannel() {
  if (activeChannel) {
    return activeChannel;
  }

  activeChannel = supabase
    .channel('pms_realtime_all_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_bookings' },
      () => notifyListeners('pms_bookings')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_event_schedule' },
      () => notifyListeners('pms_event_schedule')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_menu_tasks' },
      () => notifyListeners('pms_menu_tasks')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_department_tasks' },
      () => notifyListeners('pms_department_tasks')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_vegetable_entries' },
      () => notifyListeners('pms_vegetable_entries')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_cheese_dairy_entries' },
      () => notifyListeners('pms_cheese_dairy_entries')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pms_users' },
      () => notifyListeners('pms_users')
    )
    .subscribe((status) => {
      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        // Clear channel reference so next subscriber can cleanly re-initiate
        activeChannel = null;
      }
    });

  return activeChannel;
}

function notifyListeners(tableName) {
  listeners.forEach((callback) => {
    try {
      callback(tableName);
    } catch (e) {
      console.error('Error in realtime listener:', e);
    }
  });
}

/**
 * Subscribes to database changes with a persistent singleton channel.
 * Prevents rapid WebSocket teardowns during component re-renders or page navigation.
 */
export function subscribeToRealtimeChanges(onDataChange) {
  if (typeof onDataChange === 'function') {
    listeners.add(onDataChange);
  }

  initChannel();

  return () => {
    if (typeof onDataChange === 'function') {
      listeners.delete(onDataChange);
    }
  };
}
