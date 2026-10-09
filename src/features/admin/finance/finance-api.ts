import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { AdminPayment, AdminPayout, PlatformReport } from '@/api/types';
import type { DateRange } from './date-range';

/*
 * Payments, Host payouts and platform reports in the staff portal (spec §18; plan §12.6). Support staff
 * see payments and payouts with the refunds permission; holds, releases, retries and reports are the
 * admin's.
 */

/** The API's page sizes. */
export const PAYMENTS_PAGE_SIZE = 25;
export const PAYOUTS_PAGE_SIZE = 25;

/** The API refused: support staff without the permission, or an admin-only page. */
export const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;

/** A page number from the address, 1 when missing or wrong. */
export function pageFrom(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

// Payments --------------------------------------------------------------------------------------------------

export type PaymentView = 'all' | 'failed' | 'disputed' | 'refunds-failed';

export interface PaymentFilters {
  view: PaymentView;
  type?: AdminPayment['type'];
  /** Only with the "all" view: the others choose the payments themselves. */
  status?: AdminPayment['status'];
  page: number;
}

export const paymentsQueryKey = (filters?: PaymentFilters) =>
  filters ? (['admin', 'payments', 'list', filters] as const) : (['admin', 'payments', 'list'] as const);

export function useAdminPayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: paymentsQueryKey(filters),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/payments', {
          params: {
            query: {
              view: filters.view,
              type: filters.type,
              status: filters.view === 'all' ? filters.status : undefined,
              page: filters.page,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// Payouts ---------------------------------------------------------------------------------------------------

export interface PayoutFilters {
  status?: AdminPayout['status'];
  page: number;
}

export const payoutsQueryKey = (filters?: PayoutFilters) =>
  filters ? (['admin', 'payouts', filters] as const) : (['admin', 'payouts'] as const);

export function useAdminPayouts(filters: PayoutFilters) {
  return useQuery({
    queryKey: payoutsQueryKey(filters),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/payouts', {
          params: { query: { status: filters.status, page: filters.page } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export type PayoutAction = 'hold' | 'release' | 'retry';

/** Holds, releases or retries a payout; the API answers with the payout as it is now. */
export async function payoutActionRequest(
  action: PayoutAction,
  id: string,
  reason?: string,
): Promise<AdminPayout> {
  const path = { params: { path: { id } } };
  const result =
    action === 'hold'
      ? await unwrap(client.POST('/admin/payouts/{id}/hold', { ...path, body: { reason: reason ?? '' } }))
      : action === 'release'
        ? await unwrap(client.POST('/admin/payouts/{id}/release', path))
        : await unwrap(client.POST('/admin/payouts/{id}/retry', path));
  return result.payout;
}

// Reports ---------------------------------------------------------------------------------------------------

export const reportQueryKey = (range: DateRange) => ['admin', 'reports', 'summary', range] as const;

export function usePlatformReport(range: DateRange) {
  return useQuery<PlatformReport>({
    queryKey: reportQueryKey(range),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/admin/reports/summary', { params: { query: range }, signal }))).report,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export type ReportExport =
  'bookings' | 'payments' | 'refunds' | 'payouts' | 'cancellations' | 'gst' | 'revenue';

/** The CSV files an admin can download, for the accountant or a closer look in a spreadsheet. */
export const REPORT_EXPORTS: readonly { type: ReportExport; label: string; description: string }[] = [
  { type: 'bookings', label: 'Bookings', description: 'Trips starting on these dates' },
  { type: 'payments', label: 'Payments', description: 'Payments taken on these dates' },
  { type: 'refunds', label: 'Refunds', description: 'Refunds sent on these dates' },
  { type: 'payouts', label: 'Payouts', description: 'Host payouts due on these dates' },
  { type: 'cancellations', label: 'Cancellations', description: 'Bookings cancelled on these dates' },
  {
    type: 'gst',
    label: 'GST',
    description: 'By month: trips, extra charges and fees kept, less refunds',
  },
  {
    type: 'revenue',
    label: 'Revenue and fees',
    description: 'By day: booking revenue, each kind of fee, and refunds',
  },
];

/** Downloads a report as a CSV file named rento-vroom-<type>-<from>-to-<to>.csv. */
export async function downloadReport(type: ReportExport, { from, to }: DateRange): Promise<void> {
  const blob = await unwrap(
    client.GET('/admin/reports/export', { params: { query: { type, from, to } }, parseAs: 'blob' }),
  );
  const url = URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rento-vroom-${type}-${from}-to-${to}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
