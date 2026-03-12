import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => reportService.getDashboardStats(),
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useRecentReports(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: () =>
      reportService.getReports({
        page: 1,
        pageSize: limit,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
  });
}
