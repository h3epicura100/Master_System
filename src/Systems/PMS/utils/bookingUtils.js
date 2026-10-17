import { DEPT_LIST } from '../constants/departments';

/**
 * Calculates pipeline progress percentage and list of pending departments for a booking.
 */
export function calculatePipelineInfo(booking) {
  const total = DEPT_LIST.length;
  let done = 0;

  if (booking && booking.departments) {
    done = DEPT_LIST.filter(d => {
      const deptData = booking.departments[d.key];
      return deptData && deptData.status === 'Complete';
    }).length;
  }

  const pct = Math.round((done / total) * 100);
  const isMenuFinalized = booking?.menu?.status === 'Finalized';
  const isEventReady = isMenuFinalized && done === total;

  const pending = DEPT_LIST.filter(d => {
    const deptData = booking?.departments?.[d.key];
    return !deptData || deptData.status !== 'Complete';
  }).map(d => d.label);

  return { pct, done, total, isMenuFinalized, isEventReady, pending };
}

/**
 * Aggregates vegetable entry status (Complete only when all entries are Complete).
 */
export function getVegetableDeptStatus(entries = []) {
  if (!entries.length) return 'Pending';
  return entries.every(e => e.status === 'Complete') ? 'Complete' : 'Pending';
}
