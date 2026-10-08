import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type {
  AdminBookingDetail,
  AdminBookingRow,
  AdminCancelRequest,
  AdminRefundRequest,
  AdminStatusEditRequest,
  AdminVehicleSuspension,
  Booking,
} from '@/api/types';

/*
 * Bookings in the staff portal (plan §12.6, spec §18): search, one booking's whole record, the status edit,
 * refunds and cancellations, a booking's messages opened from a case (plan §6.2), and suspending a car
 * (plan §8.2). The API writes every action to the audit log.
 */

export type BookingStatus = AdminBookingRow['status'];

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'PAYMENT_PENDING',
  'PENDING',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DECLINED',
  'EXPIRED',
];

/** The API returns 25 bookings a page. */
export const BOOKINGS_PAGE_SIZE = 25;

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const adminBookingListsQueryKey = ['admin', 'bookings', 'list'] as const;
export const adminBookingListQueryKey = (filters: BookingFilters) =>
  [...adminBookingListsQueryKey, filters] as const;
export const adminBookingQueryKey = (ref: string) => ['admin', 'bookings', 'detail', ref] as const;
export const staffThreadQueryKey = (ref: string, context: string) =>
  ['admin', 'bookings', 'thread', ref, context] as const;

// Search ----------------------------------------------------------------------------------------------------

export interface BookingFilters {
  /** A booking reference, a Guest's or Host's name or email, or the car. */
  q: string;
  status: BookingStatus | '';
  /** Trips starting from this NZ day, "2026-10-12". */
  from: string;
  to: string;
  page: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A status from the address or the filter, or '' for any. */
export const bookingStatusFrom = (value: string | null): BookingStatus | '' =>
  BOOKING_STATUSES.find((status) => status === value?.toUpperCase()) ?? '';

/** The filters in the address (?q=…&status=…&from=…&to=…&page=…), so a search can be shared or kept. */
export function filtersFrom(params: URLSearchParams): BookingFilters {
  const day = (key: string) => {
    const value = params.get(key) ?? '';
    return DAY.test(value) ? value : '';
  };
  const page = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: params.get('q')?.trim().slice(0, 100) ?? '',
    status: bookingStatusFrom(params.get('status')),
    from: day('from'),
    to: day('to'),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** The address for some filters, leaving out the empty ones and page 1. */
export function filtersToParams(filters: BookingFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      q: filters.q,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      page: filters.page > 1 ? String(filters.page) : '',
    }).filter(([, value]) => value !== ''),
  );
}

export const hasFilters = (filters: BookingFilters) =>
  Boolean(filters.q || filters.status || filters.from || filters.to);

/** Bookings matching the filters, newest trip first. The last page stays on screen while the next loads. */
export function useAdminBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: adminBookingListQueryKey(filters),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/bookings', {
          params: {
            query: {
              ...(filters.q && { q: filters.q }),
              ...(filters.status && { status: filters.status }),
              ...(filters.from && { from: filters.from }),
              ...(filters.to && { to: filters.to }),
              page: filters.page,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// One booking -----------------------------------------------------------------------------------------------

/** By reference (RV-7K2Q9M) or id: the booking, both parties, its history, money and cases. */
export function useAdminBooking(ref: string) {
  return useQuery({
    queryKey: adminBookingQueryKey(ref),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/bookings/{id}', { params: { path: { id: ref } }, signal })),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Only CONFIRMED → ACTIVE and ACTIVE → COMPLETED, with the same side effects as check-in and check-out. */
export function editStatusRequest(ref: string, body: AdminStatusEditRequest): Promise<AdminBookingDetail> {
  return unwrap(client.POST('/admin/bookings/{id}/status', { params: { path: { id: ref } }, body }));
}

/** Needs the refunds permission (403 otherwise). A Host-funded refund comes off the Host's payout. */
export function refundRequest(ref: string, body: AdminRefundRequest): Promise<AdminBookingDetail> {
  return unwrap(client.POST('/admin/bookings/{id}/refunds', { params: { path: { id: ref } }, body }));
}

/** A confirmed booking only, with the refunds permission: a no-show or a platform cancellation. */
export async function cancelRequest(ref: string, body: AdminCancelRequest): Promise<Booking> {
  const response = await unwrap(
    client.POST('/admin/bookings/{id}/cancel', { params: { path: { id: ref } }, body }),
  );
  return response.booking;
}

// A booking's messages ---------------------------------------------------------------------------------------

/** Why staff open a thread: a report, an incident or a support ticket about the booking, as the API checks it. */
const THREAD_CONTEXT = /^(REPORT:[0-9a-f]{24}|INCIDENT:IN-[A-Z0-9]{6}|TICKET:ST-[A-Z0-9]{6})$/i;

export const isThreadContext = (value: string | null): value is string =>
  value !== null && THREAD_CONTEXT.test(value);

/** "/admin/bookings/RV-7K2Q9M/thread?context=INCIDENT:IN-4F7K2P": the messages, opened from a case. */
export const threadPath = (ref: string, kind: 'REPORT' | 'INCIDENT' | 'TICKET', key: string) =>
  `/admin/bookings/${encodeURIComponent(ref)}/thread?context=${kind}:${encodeURIComponent(key)}`;

/**
 * The conversation, read-only. Every opening is written to the audit log, so it's fetched once per visit:
 * not again when the window regains focus, and not kept in memory after leaving the page.
 */
export function useStaffThread(ref: string, context: string | null) {
  const valid = isThreadContext(context);
  return useQuery({
    queryKey: staffThreadQueryKey(ref, context ?? ''),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/bookings/{id}/thread', {
          params: { path: { id: ref }, query: { context: context ?? '' } },
          signal,
        }),
      ),
    enabled: valid,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

// Suspending a car -------------------------------------------------------------------------------------------

/** Hidden from search at once; its upcoming bookings come back for staff to keep or cancel. */
export function suspendVehicleRequest(id: string, reason: string): Promise<AdminVehicleSuspension> {
  return unwrap(client.POST('/admin/vehicles/{id}/suspend', { params: { path: { id } }, body: { reason } }));
}

export function unsuspendVehicleRequest(id: string): Promise<AdminVehicleSuspension> {
  return unwrap(client.POST('/admin/vehicles/{id}/unsuspend', { params: { path: { id } } }));
}

// Errors ----------------------------------------------------------------------------------------------------

export const REFUNDS_PERMISSION_MESSAGE =
  'You need the refunds permission to do this. An admin can turn it on for you.';

/**
 * The message a staff action shows for an API error, or null when it belongs next to a form field. The API's
 * messages are written for people (e.g. "Only a confirmed booking can be cancelled here."), so they show as
 * they are; a 403 on a money action means the refunds permission is missing.
 */
export function actionErrorMessage(
  error: unknown,
  options: { fields?: readonly string[]; needsRefunds?: boolean } = {},
): string | null {
  if (error instanceof ApiError) {
    if (error.status === 403) return options.needsRefunds ? REFUNDS_PERMISSION_MESSAGE : error.message;
    if (error.fields && Object.keys(error.fields).some((field) => options.fields?.includes(field)))
      return null;
    if (error.status > 0 && error.status < 500) return error.message;
    if (error.code === 'NETWORK_ERROR') return error.message;
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}
