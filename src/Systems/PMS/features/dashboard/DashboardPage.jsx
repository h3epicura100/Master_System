import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from './dashboardService';
import { bookingService } from '../bookings/bookingService';
import { DashboardStats } from './DashboardStats';
import { PriorityTable } from './PriorityTable';
import { UpcomingEvents } from './UpcomingEvents';
import { DeptPerformance } from './DeptPerformance';
import { BookingProgress } from './BookingProgress';
import { ReadyToClose } from './ReadyToClose';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.has_full_access;

  const { data, isLoading } = useQuery({
    queryKey: ['pms_dashboard'],
    queryFn: () => dashboardService.getDashboardData(),
    refetchInterval: 15000,
  });

  const handleCloseBooking = async (id) => {
    if (!isAdmin) {
      toast.error('Unauthorized: Only administrators can close bookings.');
      return;
    }

    try {
      await bookingService.closeBooking(id);
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success(`Booking ${id} closed and moved to history.`);
    } catch (e) {
      toast.error('Failed to close booking.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading Catering Operations Dashboard...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* 1. Stat Summary Cards */}
      <DashboardStats stats={data.stats} />

      {/* 2. Priority Tasks (Today + Delayed) */}
      <PriorityTable items={data.priority} />

      {/* 3. Upcoming Events & Ready to Close */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingEvents bookings={data.upcoming} />
        <ReadyToClose
          bookings={data.readyToClose}
          closedBookings={data.closedBookings}
          onCloseBooking={handleCloseBooking}
        />
      </div>

      {/* 4. Department Performance Overview */}
      <DeptPerformance deptStats={data.deptPerformance} />

      {/* 5. Live Booking Progress Tracker */}
      <BookingProgress bookings={data.finalizedBookings} />
    </div>
  );
}
