import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { DateRange } from './finance/date-range';

/** Every range's figures; pass a range for one. */
export const adminDashboardQueryKey = (range?: DateRange) =>
  range ? (['admin', 'dashboard', range] as const) : (['admin', 'dashboard'] as const);

/** The overview's figures for a range of NZ days, and the queues waiting for the team. */
export function useAdminDashboard(range: DateRange) {
  return useQuery({
    queryKey: adminDashboardQueryKey(range),
    queryFn: ({ signal }) => unwrap(client.GET('/admin/dashboard', { params: { query: range }, signal })),
    // Changing the dates keeps the old figures on screen until the new ones arrive, so the cards roll over.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
