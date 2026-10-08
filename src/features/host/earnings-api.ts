import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';

/*
 * The Host's earnings and payouts (spec §9; plan §8.1, items 8–9 and 19–22): the dashboard's figures,
 * payouts with their holds and bank dates, payout setup on Stripe's pages, and the GST-ready statement.
 */

export const earningsQueryKey = ['host', 'earnings'] as const;
export const payoutsQueryKey = ['host', 'payouts'] as const;

export function useEarnings() {
  return useQuery({
    queryKey: earningsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/host/earnings', { signal })),
    staleTime: 60_000,
  });
}

/** The payout setup and every payout, upcoming first. */
export function useHostPayouts() {
  return useQuery({
    queryKey: payoutsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/host/payouts', { signal })),
    staleTime: 60_000,
  });
}

/** Opens Stripe's payout setup in this tab; Stripe brings the Host back to the earnings page. */
export function useStartPayoutSetup() {
  return useMutation({
    mutationFn: async () => (await unwrap(client.POST('/host/connect/onboarding-link'))).url,
    onSuccess: (url) => window.location.assign(url),
  });
}

/** Reads the payout account from Stripe, for when the Host comes back from setup. */
export function useSyncPayoutAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await unwrap(client.POST('/host/connect/sync'))).account,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: payoutsQueryKey }),
  });
}

/** Stripe's Express dashboard in a new tab: bank account and Stripe's payouts to it. */
export function useOpenStripeDashboard() {
  return useMutation({
    mutationFn: async () => (await unwrap(client.POST('/host/connect/dashboard-link'))).url,
    onSuccess: (url) => window.open(url, '_blank', 'noopener'),
  });
}

/** Downloads the statement for a month ("2026-10") or a tax year ending 31 March ("2027") as CSV. */
export async function downloadStatement(period: string): Promise<void> {
  const blob = await unwrap(
    client.GET('/host/earnings/statement', { params: { query: { period } }, parseAs: 'blob' }),
  );
  const url = URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rento-vroom-earnings-${/^\d{4}$/.test(period) ? `tax-year-${Number(period) - 1}-${period.slice(2)}` : period}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** The to-do list on the Host's dashboard (spec §9), urgent items first. */
export function useHostTodo(enabled = true) {
  return useQuery({
    queryKey: ['host', 'todo'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/host/todo', { signal }))).items,
    enabled,
    staleTime: 60_000,
  });
}
