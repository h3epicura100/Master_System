import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToRealtimeChanges } from '../services/realtimeService';

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeChanges((table) => {
      // Invalidate relevant React Query caches when Supabase database updates in real-time
      if (table.startsWith('pms_')) {
        queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
        queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);
}
