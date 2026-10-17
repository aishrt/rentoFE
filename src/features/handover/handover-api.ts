import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import { refreshStaleData } from '@/api/stale-data';
import type { FlagDamageRequest, Handover, InspectionRequest, InspectionStage } from '@/api/types';
import { bookingQueryKey, bookingsQueryKey } from '@/features/booking/booking-api';
import { refreshHostDashboard } from '@/features/host/host-api';

/*
 * The digital vehicle handover's requests (spec §14): both reports, recording a check-in or check-out,
 * confirming the other party's, and flagging new damage. Recording one changes the booking's status, so
 * the trip and its lists refresh too.
 */

export const handoverQueryKey = (ref: string) => ['handover', ref] as const;

/**
 * What a finished inspection tells the handover page it goes to, in the router's state: a check-out that
 * recorded new damage, so the page can offer to open a case with it in one tap.
 */
export interface HandoverState {
  checkOutDamage?: boolean;
}

/** Past the end time without a check-in: the API takes none, and support sorts out the booking. */
export const checkInClosed = (handover: Handover, now = Date.now()) =>
  handover.bookingStatus === 'CONFIRMED' &&
  !handover.checkIn &&
  now >= new Date(handover.checkInClosesAt).getTime();

/**
 * The API couldn't find an upload sent with a report (each is attached once, and kept a day): the photos
 * then upload again (useInspectionPhotos' uploadAgain) and the person sends the report once they're up.
 */
export const uploadsGone = (error: unknown) => error instanceof ApiError && error.code === 'UPLOAD_NOT_FOUND';
export const UPLOADING_AGAIN =
  'Your photos need to upload again, and they’re on their way. Try again once they’ve uploaded.';

/** The contact form, about this booking. */
export const supportPath = (handover: Pick<Handover, 'ref'>) =>
  `/contact?category=BOOKING&booking=${encodeURIComponent(handover.ref)}`;

export function useHandover(ref: string, enabled = true) {
  return useQuery({
    queryKey: handoverQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings/{id}/inspections', { params: { path: { id: ref } }, signal })))
        .handover,
    enabled: enabled && ref !== '',
    // Photo links work for 10 minutes at least; fresh ones come with each refresh.
    refetchInterval: 5 * 60_000,
  });
}

/**
 * A request that changes the handover. Refused because the screen is out of date (409, such as the other
 * party's check-in landing first, or 404), the handover and the booking load again, so what's shown and
 * the buttons on offer catch up.
 */
function useHandoverMutation<Variables>(
  ref: string,
  request: (variables: Variables) => Promise<{ handover: Handover }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: Variables) => (await request(variables)).handover,
    onSuccess: (handover) => {
      queryClient.setQueryData(handoverQueryKey(ref), handover);
      void queryClient.invalidateQueries({ queryKey: bookingQueryKey(ref) });
      void queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
      // The Host's to-do list (a handover to confirm), earnings and calendars move with the trip.
      refreshHostDashboard(queryClient);
    },
    onError: refreshStaleData(queryClient, [handoverQueryKey(ref), bookingQueryKey(ref)]),
  });
}

export function useSubmitInspection(ref: string) {
  return useHandoverMutation(ref, (body: InspectionRequest) =>
    unwrap(client.POST('/bookings/{id}/inspections', { params: { path: { id: ref } }, body })),
  );
}

export function useConfirmInspection(ref: string) {
  return useHandoverMutation(ref, (stage: InspectionStage) =>
    unwrap(
      client.POST('/bookings/{id}/inspections/{stage}/confirm', { params: { path: { id: ref, stage } } }),
    ),
  );
}

export function useFlagDamage(ref: string) {
  return useHandoverMutation(ref, (body: FlagDamageRequest) =>
    unwrap(
      client.POST('/bookings/{id}/inspections/CHECK_OUT/damage', { params: { path: { id: ref } }, body }),
    ),
  );
}
