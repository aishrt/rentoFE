import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type {
  Incident,
  IncidentChargeRequest,
  IncidentStatus,
  StaffIncidentUpdateRequest,
  StaffNewIncidentRequest,
  VerificationQueueItem,
} from '@/api/types';
import { adminBookingQueryKey } from '@/features/admin/bookings/bookings-api';

/*
 * The support team's operations (spec §18, plan §12.6): the verification queue, and incident cases with
 * their assignees, updates and charges. The API writes every decision, update and charge to the audit log.
 */

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const verificationsQueryKey = ['admin', 'verifications'] as const;
export const adminIncidentsQueryKey = ['admin', 'incidents'] as const;
const adminIncidentListsQueryKey = [...adminIncidentsQueryKey, 'list'] as const;
/** No status: every case still open (Open, Investigating and Waiting on them), as the API does. */
export const adminIncidentListQueryKey = (status?: IncidentStatus) =>
  [...adminIncidentListsQueryKey, status ?? 'ALL_OPEN'] as const;
export const adminIncidentQueryKey = (ref: string) => [...adminIncidentsQueryKey, 'case', ref] as const;
export const incidentAssigneesQueryKey = [...adminIncidentsQueryKey, 'assignees'] as const;

/** Identity checks Stripe couldn't decide first, then licences to check by hand; oldest first in each. */
export function useVerificationQueue() {
  return useQuery({
    queryKey: verificationsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/verifications', { signal })),
    select: (data) => data.items,
    staleTime: 30_000,
    // Staff move between the queue, Stripe and email; show what changed meanwhile when they come back.
    refetchOnWindowFocus: true,
  });
}

export type VerificationDecision = 'APPROVE' | 'REJECT';

/** What deciding an identity check or a licence did to the bookings that waited for it. */
export interface VerificationOutcome {
  confirmed: string[];
  waitingForHost: string[];
  released: string[];
  /** Bookings that still wait for the other part (the identity check or the licence) with support. */
  stillInReview: string[];
  /** Bookings that wait for their car's suspension to be lifted before they're confirmed. */
  carSuspended: string[];
}

// The API's limit for a review note, under the decision dialog's own.
const REVIEW_NOTE_MAX = 500;

/** The decision dialog's field is `notes`; the API's is `note`. Moves its message to where it shows. */
function asNotesError(error: unknown): unknown {
  if (!(error instanceof ApiError) || !error.fields?.note) return error;
  return new ApiError(error.status, error.code, error.message, { notes: error.fields.note });
}

/**
 * Approving confirms the bookings that waited for the check (requests still go to their Host), unless the
 * other part still waits for support; rejecting releases them and their card authorisations. Rejecting a
 * licence emails the person the note. Either way the person is emailed. 409 when the check isn't waiting
 * for a review any more.
 */
export async function reviewVerificationRequest(input: {
  userId: string;
  kind: VerificationQueueItem['kind'];
  decision: VerificationDecision;
  notes?: string;
}): Promise<VerificationOutcome> {
  if (input.notes && input.notes.length > REVIEW_NOTE_MAX) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Some details need fixing.', {
      notes: `Keep it under ${REVIEW_NOTE_MAX} characters`,
    });
  }
  const params = { path: { id: input.userId } };
  const body = { decision: input.decision, ...(input.notes && { note: input.notes }) };
  try {
    const { confirmed, waitingForHost, released, stillInReview, carSuspended } =
      input.kind === 'IDENTITY'
        ? await unwrap(client.POST('/admin/users/{id}/identity-review', { params, body }))
        : await unwrap(client.POST('/admin/users/{id}/licence-review', { params, body }));
    return {
      confirmed,
      waitingForHost,
      released,
      stillInReview: stillInReview ?? [],
      carSuspended: carSuspended ?? [],
    };
  } catch (error) {
    throw asNotesError(error);
  }
}

/**
 * The full licence number, decrypted to check by hand (plan §14). Each call is written to the audit log,
 * so it's fetched only when a staff member asks, and never cached.
 */
export async function fetchLicenceNumber(userId: string): Promise<string> {
  return (await unwrap(client.GET('/admin/users/{id}/licence-number', { params: { path: { id: userId } } })))
    .number;
}

/** Cases with one status, or every open one; the most recently updated first. */
export function useAdminIncidents(status?: IncidentStatus) {
  return useQuery({
    queryKey: adminIncidentListQueryKey(status),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/incidents', { params: { query: status ? { status } : {} }, signal })),
    select: (data) => data.incidents,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Support opens a case on a booking themselves, outside the damage-report window (plan §3), for both
 * parties, one of them or the team only; they have it, and the booking's payouts are held. 404 for a
 * booking reference that doesn't exist.
 */
export function useOpenIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: StaffNewIncidentRequest): Promise<Incident> =>
      (await unwrap(client.POST('/admin/incidents', { body }))).incident,
    onSuccess: (incident) => {
      queryClient.setQueryData(adminIncidentQueryKey(incident.caseRef), incident);
      void queryClient.invalidateQueries({ queryKey: adminIncidentListsQueryKey });
      // The booking's record lists its cases.
      void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(incident.bookingRef) });
    },
  });
}

/** A case with every event, internal notes included. */
export function useAdminIncident(ref: string) {
  return useQuery({
    queryKey: adminIncidentQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/admin/incidents/{ref}', { params: { path: { ref } }, signal }))).incident,
    enabled: ref !== '',
    staleTime: 30_000,
    // Evidence links work for 10 minutes; a refresh brings fresh ones and anything the Guest or Host added.
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Shows the case a change returned, and refreshes the lists it moves between. */
function useCaseChanged(ref: string) {
  const queryClient = useQueryClient();
  return (incident: Incident) => {
    queryClient.setQueryData(adminIncidentQueryKey(ref), incident);
    void queryClient.invalidateQueries({ queryKey: adminIncidentListsQueryKey });
  };
}

/**
 * An update for both parties, one of them or staff only, a new status, or taking the case. Resolving or
 * closing the last open case on a booking releases its payouts.
 */
export function useStaffIncidentUpdate(ref: string) {
  const changed = useCaseChanged(ref);
  return useMutation({
    mutationFn: async (body: StaffIncidentUpdateRequest): Promise<Incident> =>
      (await unwrap(client.POST('/admin/incidents/{ref}/events', { params: { path: { ref } }, body })))
        .incident,
    onSuccess: changed,
  });
}

/** Who a case can be handed to: the admin, then the active support team by name. */
export function useIncidentAssignees() {
  return useQuery({
    queryKey: incidentAssigneesQueryKey,
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/admin/incidents/assignees', { signal }))).assignees,
    staleTime: 5 * 60_000,
  });
}

/**
 * Hands the case to a staff member, or to nobody (null). It's an internal event on the case and in the
 * audit log, and the new assignee is told. 409 NOT_STAFF for someone who isn't on the team any more.
 */
export function useAssignIncident(ref: string) {
  const changed = useCaseChanged(ref);
  return useMutation({
    mutationFn: async (userId: string | null): Promise<Incident> =>
      (
        await unwrap(
          client.POST('/admin/incidents/{ref}/assignee', { params: { path: { ref } }, body: { userId } }),
        )
      ).incident,
    onSuccess: changed,
  });
}

/**
 * An extra charge from a resolved case, to the Guest's saved card; the Host's share is paid out as its
 * own payout. Needs the REFUNDS permission (403 without it); 409 NOT_RESOLVED before the case is resolved.
 */
export function useIncidentCharge(ref: string) {
  const changed = useCaseChanged(ref);
  return useMutation({
    mutationFn: async (body: IncidentChargeRequest): Promise<Incident> =>
      (await unwrap(client.POST('/admin/incidents/{ref}/charges', { params: { path: { ref } }, body })))
        .incident,
    onSuccess: changed,
  });
}
