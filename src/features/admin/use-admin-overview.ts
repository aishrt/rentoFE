import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AdminOverview } from '@/api/types';

export const adminOverviewQueryKey = ['admin', 'overview'] as const;

export function useAdminOverview() {
  return useQuery({
    queryKey: adminOverviewQueryKey,
    queryFn: ({ signal }) => api.get<AdminOverview>('/admin/overview', { signal }),
    staleTime: 30_000,
  });
}
