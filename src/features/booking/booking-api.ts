import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import { refreshStaleData } from '@/api/stale-data';
import type {
  Booking,
  CheckoutReadiness,
  CreateBookingRequest,
  DriverLicenceInput,
  PaymentSession,
  QuoteRequest,
} from '@/api/types';
import { paymentHistoryQueryKey } from '@/features/account/dashboard-api';

/*
 * The booking flow's requests (plan §9, Days 11–14): the live quote, the Guest's checkout readiness,
 * creating the booking and its 30-minute hold, paying, and the trips and bookings lists with their
 * answers and cancellations. Every change to a booking refreshes the lists that show it.
 */

export type BookingRole = 'guest' | 'host';
export type BookingGroup = 'upcoming' | 'current' | 'completed' | 'cancelled' | 'requests';

export const bookingsQueryKey = ['bookings'] as const;
export const bookingQueryKey = (ref: string) => ['booking', ref] as const;
export const readinessQueryKey = ['me', 'checkout'] as const;

/**
 * The price and any problems for the trip on screen. Quotes hold nothing, so asking is safe. Shares its
 * cache with the listing page, so arriving from it shows the price straight away. Paused while the Guest
 * holds the dates: the public quote can't tell their own hold from someone else's booking.
 */
export function useTripQuote(vehicleId: string | undefined, request: QuoteRequest | null, paused = false) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'quote', request],
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.POST('/vehicles/{id}/quote', {
            params: { path: { id: vehicleId! } },
            body: request!,
            signal,
          }),
        )
      ).quote,
    enabled: Boolean(vehicleId) && request !== null && !paused,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** What the verification step still needs, checked against the trip's end (the licence must last it). */
export function useCheckoutReadiness(end: string | undefined, enabled: boolean, start?: string) {
  return useQuery({
    queryKey: [...readinessQueryKey, end ?? '', start ?? ''],
    // With the trip's start, age and years licensed count to it (plan §3).
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/me/checkout', {
          params: { query: { ...(end && { end }), ...(start && { start }) } },
          signal,
        }),
      ),
    enabled,
    staleTime: 60_000,
  });
}

/** Saves licence details; the verification step then asks again with the trip's end. */
export function useSaveLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DriverLicenceInput): Promise<CheckoutReadiness> =>
      unwrap(client.PUT('/me/driver-licence', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: readinessQueryKey }),
  });
}

/** Creates the booking and holds its dates for 30 minutes. The same request again returns the same booking. */
export function useCreateBooking() {
  return useMutation({
    mutationFn: async (body: CreateBookingRequest): Promise<Booking> =>
      (await unwrap(client.POST('/bookings', { body }))).booking,
  });
}

/** Records the Guest Agreement and starts the payment: Stripe's client secret and saved cards. */
export function usePreparePayment() {
  return useMutation({
    mutationFn: (ref: string): Promise<PaymentSession> =>
      unwrap(
        client.POST('/bookings/{id}/payment', {
          params: { path: { id: ref } },
          body: { acceptGuestAgreement: true },
        }),
      ),
  });
}

/**
 * After Stripe.js confirms, applies the result straight away: Instant Book becomes CONFIRMED and a
 * request PENDING. Local development has no webhooks, so this is what updates the booking there.
 */
export async function syncPayment(ref: string): Promise<Booking> {
  return (await unwrap(client.POST('/bookings/{id}/payment/sync', { params: { path: { id: ref } } })))
    .booking;
}

export function useBookings(role: BookingRole, group: BookingGroup) {
  return useQuery({
    queryKey: [...bookingsQueryKey, role, group],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings', { params: { query: { role, group } }, signal }))).bookings,
    staleTime: 30_000,
  });
}

/**
 * One tab of trips or bookings a page at a time, so a long history is all there: the API's pages hold 100,
 * and `fetchNextPage` adds the next ("Show more").
 */
export function useBookingPages(role: BookingRole, group: BookingGroup) {
  return useInfiniteQuery({
    queryKey: [...bookingsQueryKey, role, group, 'pages'],
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET('/bookings', {
          params: { query: { role, group, ...(pageParam > 1 && { page: pageParam }) } },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 30_000,
  });
}

/** One booking as the signed-in user sees it: the Guest, the Host or staff. */
export function useBookingDetail(ref: string, enabled = true) {
  return useQuery({
    queryKey: bookingQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings/{id}', { params: { path: { id: ref } }, signal }))).booking,
    enabled: enabled && ref !== '',
  });
}

/** Releases an unpaid checkout's dates, e.g. when the Guest changes the trip they were holding. */
export async function releaseHold(ref: string): Promise<Booking> {
  return (await unwrap(client.POST('/bookings/{id}/cancel', { params: { path: { id: ref } }, body: {} })))
    .booking;
}

/** How often an open cancel dialog asks for the refund again: it drops as the trip gets closer. */
export const CANCELLATION_PREVIEW_REFRESH_MS = 45_000;

/** What cancelling would refund and cost, shown before the user confirms (plan §9, Days 13–14). */
export function useCancellationPreview(ref: string, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingQueryKey(ref), 'cancellation-preview'],
    queryFn: ({ signal }) =>
      unwrap(client.GET('/bookings/{id}/cancellation-preview', { params: { path: { id: ref } }, signal })),
    enabled,
    // The refund depends on how close the trip is, so it's asked for fresh each time, and again while shown.
    staleTime: 0,
    gcTime: 0,
    refetchInterval: CANCELLATION_PREVIEW_REFRESH_MS,
  });
}

/** Puts a changed booking in the cache and refreshes every list it may have moved between. */
function useBookingChanged() {
  const queryClient = useQueryClient();
  return (booking: Booking) => {
    queryClient.setQueryData(bookingQueryKey(booking.ref), booking);
    void queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
  };
}

/**
 * A change the API refused because the booking moved on meanwhile (already answered, expired, the trip
 * started): the booking, its lists and its handover are fetched again, so buttons that no longer apply go.
 */
function useBookingStale(ref: string) {
  const queryClient = useQueryClient();
  // ['handover', ref] is handoverQueryKey (handover-api.ts), which imports this file.
  return refreshStaleData(queryClient, [bookingQueryKey(ref), bookingsQueryKey, ['handover', ref]]);
}

export function useCancelBooking(ref: string) {
  const queryClient = useQueryClient();
  const changed = useBookingChanged();
  const stale = useBookingStale(ref);
  return useMutation({
    /**
     * `expectedRefundCents`: the refund the preview showed. A lower one now (the cut-off passed meanwhile)
     * cancels nothing: 409 REFUND_CHANGED, and the preview is fetched again.
     */
    mutationFn: async ({
      reason,
      expectedRefundCents,
    }: {
      reason?: string;
      expectedRefundCents?: number;
    }): Promise<Booking> =>
      (
        await unwrap(
          client.POST('/bookings/{id}/cancel', {
            params: { path: { id: ref } },
            body: {
              ...(reason && { reason }),
              ...(expectedRefundCents !== undefined && { expectedRefundCents }),
            },
          }),
        )
      ).booking,
    onSuccess: (booking) => {
      changed(booking);
      // Any refund shows in the Guest's payment history.
      void queryClient.invalidateQueries({ queryKey: paymentHistoryQueryKey });
    },
    onError: stale,
  });
}

export function useAcceptBooking(ref: string) {
  const changed = useBookingChanged();
  const stale = useBookingStale(ref);
  return useMutation({
    mutationFn: async (): Promise<Booking> =>
      (await unwrap(client.POST('/bookings/{id}/accept', { params: { path: { id: ref } } }))).booking,
    onSuccess: changed,
    onError: stale,
  });
}

export function useDeclineBooking(ref: string) {
  const changed = useBookingChanged();
  const stale = useBookingStale(ref);
  return useMutation({
    mutationFn: async (reason?: string): Promise<Booking> =>
      (
        await unwrap(
          client.POST('/bookings/{id}/decline', {
            params: { path: { id: ref } },
            body: reason ? { reason } : {},
          }),
        )
      ).booking,
    onSuccess: changed,
    onError: stale,
  });
}
