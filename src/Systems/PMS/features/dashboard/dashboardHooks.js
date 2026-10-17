import { useQuery } from '@tanstack/react-query';
import { dashboardService } from './dashboardService';

export function useDashboardData() {
  return useQuery({
    queryKey: ['pms_dashboard'],
    queryFn: () => dashboardService.getDashboardData(),
  });
}
