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
  Handover,
  ReadingCorrectionRequest,
  StaffCompletionRequest,
  StaffHandoverResponse,
} from '@/api/types';

/*
 * Bookings in the staff portal (plan §12.6, spec §18): search, one booking's whole record, the status edit,
 * refunds and cancellations with their preview, the handover and completing a trip with a missing check-out,
 * a booking's messages opened from a case (plan §6.2), and suspending a car (plan §8.2). The API writes every
 * action to the audit log.
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

/**
 * With the refunds permission: a confirmed booking for a no-show or as a platform cancellation, or a pending
 * one (a request, or one waiting for verification) as a platform cancellation, which releases the card.
 */
export async function cancelRequest(ref: string, body: AdminCancelRequest): Promise<Booking> {
  const response = await unwrap(
    client.POST('/admin/bookings/{id}/cancel', { params: { path: { id: ref } }, body }),
  );
  return response.booking;
}

/** What cancelling for this reason would refund and cost, from the same policy engine (plan §8.2). */
export function useAdminCancellationPreview(ref: string, reason: AdminCancelRequest['reason'] | null) {
  return useQuery({
    queryKey: [...adminBookingQueryKey(ref), 'cancellation-preview', reason] as const,
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/bookings/{id}/cancellation-preview', {
          params: { path: { id: ref }, query: { reason: reason! } },
          signal,
        }),
      ),
    enabled: reason !== null,
    // The refund depends on the time to pick-up: worked out afresh each time the dialog opens.
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Needs the refunds permission: an extra charge that hasn't been paid is taken off what the Guest owes, its
 * pay link stops taking payments, and the Guest is told (plan §8.1, item 11). The reason goes to the audit log.
 */
export async function cancelChargeRequest(
  ref: string,
  chargeId: string,
  reason: string,
): Promise<AdminBookingDetail> {
  try {
    return await unwrap(
      client.POST('/admin/bookings/{id}/extra-charges/{chargeId}/cancel', {
        params: { path: { id: ref, chargeId } },
        body: { reason },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403 && error.code !== 'OWN_RECORD') {
      throw new ApiError(403, error.code, REFUNDS_PERMISSION_MESSAGE);
    }
    throw error;
  }
}

// The handover -----------------------------------------------------------------------------------------------

export const staffHandoverQueryKey = (ref: string) => ['admin', 'bookings', 'handover', ref] as const;

/** Both condition reports, as staff see them. Photo links work for 10 minutes; fresh ones come with each refresh. */
export function useStaffHandover(ref: string, enabled: boolean) {
  return useQuery({
    queryKey: staffHandoverQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings/{id}/inspections', { params: { path: { id: ref } }, signal })))
        .handover,
    enabled,
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  });
}

/**
 * A trip whose check-out is missing: support completes it with the Host's odometer and fuel or battery reading
 * (plan §8.2), which become the check-out record, so extra kilometres are charged as usual.
 */
export async function completeTripRequest(ref: string, body: StaffCompletionRequest): Promise<Handover> {
  const response = await unwrap(
    client.POST('/admin/bookings/{id}/complete', { params: { path: { id: ref } }, body }),
  );
  return response.handover;
}

/** A 403 on a money action means the refunds permission is missing (OWN_RECORD says why it isn't). */
function needsRefunds(error: unknown): never {
  if (error instanceof ApiError && error.status === 403 && error.code !== 'OWN_RECORD') {
    throw new ApiError(403, error.code, REFUNDS_PERMISSION_MESSAGE);
  }
  throw error;
}

/**
 * Needs the refunds permission: corrects a reading on the check-in or check-out report, with a note for the
 * audit log (plan §8.2). On a completed trip the extra kilometres are worked out again from it at once.
 */
export async function correctReadingRequest(
  ref: string,
  body: ReadingCorrectionRequest,
): Promise<StaffHandoverResponse> {
  return unwrap(
    client.POST('/admin/bookings/{id}/readings', { params: { path: { id: ref } }, body }),
  ).catch(needsRefunds);
}

/**
 * Needs the refunds permission: charges the extra kilometres from the readings as they stand, without waiting
 * for the other party to confirm or the daily limit that holds a charge for a check by staff.
 */
export async function chargeExtraKmRequest(ref: string): Promise<StaffHandoverResponse> {
  return unwrap(client.POST('/admin/bookings/{id}/extra-km', { params: { path: { id: ref } } })).catch(
    needsRefunds,
  );
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
 * they are; a plain 403 on a money action means the refunds permission is missing, while 403 OWN_RECORD says
 * it's the staff member's own booking or car, for another team member (plan §6.2).
 */
export function actionErrorMessage(
  error: unknown,
  options: { fields?: readonly string[]; needsRefunds?: boolean } = {},
): string | null {
  if (error instanceof ApiError) {
    if (error.status === 403)
      return options.needsRefunds && error.code === 'FORBIDDEN' ? REFUNDS_PERMISSION_MESSAGE : error.message;
    if (error.fields && Object.keys(error.fields).some((field) => options.fields?.includes(field)))
      return null;
    if (error.status > 0 && error.status < 500) return error.message;
    if (error.code === 'NETWORK_ERROR') return error.message;
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}
