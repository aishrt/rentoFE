import { useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';

export const adminOverviewQueryKey = ['admin', 'overview'] as const;

export function useAdminOverview() {
  return useQuery({
    queryKey: adminOverviewQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/overview', { signal })),
    staleTime: 30_000,
  });
}
