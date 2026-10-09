import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { FlagDamageRequest, Handover, InspectionRequest, InspectionStage } from '@/api/types';
import { bookingQueryKey, bookingsQueryKey } from '@/features/booking/booking-api';

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

export function useHandover(ref: string, enabled = true) {
  return useQuery({
    queryKey: handoverQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings/{id}/inspections', { params: { path: { id: ref } }, signal })))
        .handover,
    enabled: enabled && ref !== '',
    // Photo links work for 10 minutes; fresh ones come with each refresh.
    refetchInterval: 5 * 60_000,
  });
}

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
    },
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
