import { bookingService } from '../bookings/bookingService';
import { DEPT_LIST } from '../../constants/departments';
import { derivedPlannedDate, calculateDelayInfo } from '../../utils/delayUtils';
import { calculatePipelineInfo } from '../../utils/bookingUtils';
import { todayStr } from '../../utils/dateUtils';

export const dashboardService = {
  async getDashboardData() {
    const bookings = await bookingService.getBookings();
    const today = todayStr();

    const activeBookings = bookings.filter(b => b.status === 'active' || (!b.status && !b.closed && !b.cancelled));
    const closedBookings = bookings.filter(b => b.status === 'closed' || b.closed);

    // Active finalized bookings (excluding closed bookings from upcoming events)
    const activeFinalized = activeBookings.filter(b => b.menu?.status === 'Finalized');
    const allFinalized = bookings.filter(b => b.menu?.status === 'Finalized');
    const menuPending = activeBookings.filter(b => b.menu?.status !== 'Finalized');

    // Flatten department rows across active bookings
    const activeDeptRows = [];
    activeBookings.forEach(b => {
      const anchorDate = b.eventStartDate || b.eventDate;
      DEPT_LIST.forEach(cfg => {
        const deptData = b.departments?.[cfg.key] || {};
        const plannedDate = derivedPlannedDate(anchorDate);
        const delayInfo = calculateDelayInfo(b, deptData.status, deptData.completedAt || deptData.updatedAt);
        activeDeptRows.push({
          booking: b,
          deptConfig: cfg,
          deptData,
          plannedDate,
          delayInfo,
        });
      });
    });

    const deptPendingCount = activeDeptRows.filter(r => r.deptData.status !== 'Complete').length;
    const dueTodayCount = activeDeptRows.filter(r => r.deptData.status !== 'Complete' && r.delayInfo.isDueToday).length;
    const delayedCount = activeDeptRows.filter(r => r.deptData.status !== 'Complete' && r.delayInfo.isDelayed).length;

    const eventReadyBookings = activeFinalized.filter(b => {
      const info = calculatePipelineInfo(b);
      return info.isEventReady;
    });

    // 1. Priority tasks: active status != Complete AND (plannedDate === today OR isDelayed)
    const priority = activeDeptRows.filter(r =>
      r.deptData.status !== 'Complete' &&
      r.plannedDate &&
      (r.plannedDate === today || r.delayInfo.isDelayed)
    ).sort((a, b) => {
      if (a.delayInfo.isDelayed && !b.delayInfo.isDelayed) return -1;
      if (!a.delayInfo.isDelayed && b.delayInfo.isDelayed) return 1;
      return 0;
    });

    // 2. Upcoming events: ACTIVE finalized bookings ONLY (excluding closed bookings)
    const upcoming = [...activeFinalized].sort((a, b) => {
      const dateA = a.eventStartDate || a.eventDate || '';
      const dateB = b.eventStartDate || b.eventDate || '';
      return dateA.localeCompare(dateB);
    });

    // 3. Department performance aggregates across ALL events (active + completed/closed)
    const allDeptRows = [];
    bookings.forEach(b => {
      const isClosed = b.status === 'closed' || b.closed;
      const anchorDate = b.eventStartDate || b.eventDate;
      DEPT_LIST.forEach(cfg => {
        const deptData = b.departments?.[cfg.key] || {};
        const effectiveStatus = isClosed ? 'Complete' : (deptData.status || 'Pending');
        const plannedDate = derivedPlannedDate(anchorDate);
        const delayInfo = calculateDelayInfo(b, effectiveStatus, deptData.completedAt || deptData.updatedAt);
        allDeptRows.push({
          booking: b,
          deptConfig: cfg,
          deptData: { ...deptData, status: effectiveStatus },
          plannedDate,
          delayInfo,
          isClosed,
        });
      });
    });

    const deptPerformance = DEPT_LIST.map(cfg => {
      const rows = allDeptRows.filter(r => r.deptConfig.key === cfg.key);
      return {
        label: cfg.label,
        key: cfg.key,
        total: rows.length,
        pending: rows.filter(r => !r.isClosed && r.deptData.status !== 'Complete').length,
        complete: rows.filter(r => r.isClosed || r.deptData.status === 'Complete').length,
        dueToday: rows.filter(r => !r.isClosed && r.deptData.status !== 'Complete' && r.delayInfo.isDueToday).length,
        delayed: rows.filter(r => !r.isClosed && r.deptData.status !== 'Complete' && r.delayInfo.isDelayed).length,
      };
    });

    // 4. Ready to close (active)
    const readyToClose = eventReadyBookings.filter(b => b.status === 'active' || !b.status);

    return {
      stats: {
        totalBookings: bookings.length,
        totalActive: activeBookings.length,
        closedBookings: closedBookings.length,
        menuPending: menuPending.length,
        menuFinalized: activeFinalized.length,
        deptPending: deptPendingCount,
        dueToday: dueTodayCount,
        delayed: delayedCount,
        eventReady: eventReadyBookings.length,
      },
      priority,
      upcoming,
      deptPerformance,
      finalizedBookings: activeFinalized,
      readyToClose,
      closedBookings,
    };
  }
};
