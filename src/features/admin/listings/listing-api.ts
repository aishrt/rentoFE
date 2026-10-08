import { useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { AdminVehicle, BlockInput, CalendarBlock, HostVehicle } from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';
import type { HostStatus } from './listing-labels';

/*
 * The staff approval queues (plan §9, Days 8–11) and the calendar override (Days 10–11). Admin and
 * Support staff both use them (plan §6.2); the API writes every decision to the audit log.
 */

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const hostApplicationsQueryKey = (status?: HostStatus) =>
  status ? (['admin', 'host-applications', status] as const) : (['admin', 'host-applications'] as const);
export const reviewQueueQueryKey = ['admin', 'review-queue'] as const;
export const adminVehicleQueryKey = (id: string) => ['admin', 'vehicle', id] as const;
export const adminCalendarQueryKey = (id: string, from?: string, to?: string) =>
  from && to
    ? (['admin', 'vehicle-calendar', id, from, to] as const)
    : (['admin', 'vehicle-calendar', id] as const);

/** Applications with one status, oldest first so nobody waits longest. */
export function useHostApplications(status: HostStatus) {
  return useQuery({
    queryKey: hostApplicationsQueryKey(status),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/host-applications', { params: { query: { status } }, signal })),
    select: (data) => data.applications,
    staleTime: 30_000,
    // Staff move between the queue and email; show what changed meanwhile when they come back.
    refetchOnWindowFocus: true,
  });
}

/** Approving needs the applicant's confirmed email (409 EMAIL_NOT_VERIFIED); rejecting needs notes. */
export async function decideHostApplicationRequest(input: {
  userId: string;
  decision: 'approve' | 'reject';
  notes?: string;
}): Promise<void> {
  const params = { path: { userId: input.userId } };
  if (input.decision === 'approve') {
    await unwrap(
      client.POST('/admin/host-applications/{userId}/approve', { params, body: { notes: input.notes } }),
    );
  } else {
    await unwrap(
      client.POST('/admin/host-applications/{userId}/reject', { params, body: { notes: input.notes ?? '' } }),
    );
  }
}

/** Listings under review, and live listings with new photos or documents (plan §3, changes to live listings). */
export function useReviewQueue() {
  return useQuery({
    queryKey: reviewQueueQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/vehicles', { signal })),
    select: (data) => data.vehicles,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// Document links are signed for 10 minutes (plan §3, public and private files). Refreshing the
// listing well inside that keeps every Open link working while the page stays open.
const PRIVATE_LINK_REFRESH_MS = 8 * 60_000;

export function useAdminVehicle(id: string) {
  return useQuery({
    queryKey: adminVehicleQueryKey(id),
    queryFn: ({ signal }) => unwrap(client.GET('/admin/vehicles/{id}', { params: { path: { id } }, signal })),
    staleTime: 30_000,
    refetchInterval: PRIVATE_LINK_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export type ListingDecision = 'approve' | 'request-changes' | 'reject';

/**
 * Approving a listing also approves its waiting photos and verifies its waiting documents, and needs
 * an approved Host (409 HOST_NOT_APPROVED). Request changes and reject need notes for the Host.
 */
export async function decideListingRequest(input: {
  id: string;
  decision: ListingDecision;
  notes?: string;
}): Promise<HostVehicle> {
  const params = { path: { id: input.id } };
  const response =
    input.decision === 'approve'
      ? await unwrap(client.POST('/admin/vehicles/{id}/approve', { params, body: { notes: input.notes } }))
      : input.decision === 'request-changes'
        ? await unwrap(
            client.POST('/admin/vehicles/{id}/request-changes', {
              params,
              body: { notes: input.notes ?? '' },
            }),
          )
        : await unwrap(
            client.POST('/admin/vehicles/{id}/reject', { params, body: { notes: input.notes ?? '' } }),
          );
  return response.vehicle;
}

/** A rejected photo counts as missing until the Host replaces it; the Host is asked to retake it. */
export async function decidePhotoRequest(input: {
  id: string;
  photoId: string;
  decision: 'APPROVE' | 'REJECT';
}): Promise<HostVehicle> {
  const response = await unwrap(
    client.POST('/admin/vehicles/{id}/photos/{photoId}', {
      params: { path: { id: input.id, photoId: input.photoId } },
      body: { decision: input.decision },
    }),
  );
  return response.vehicle;
}

export async function decideDocumentRequest(input: {
  id: string;
  documentId: string;
  decision: 'VERIFY' | 'REJECT';
}): Promise<HostVehicle> {
  const response = await unwrap(
    client.POST('/admin/vehicles/{id}/documents/{documentId}', {
      params: { path: { id: input.id, documentId: input.documentId } },
      body: { decision: input.decision },
    }),
  );
  return response.vehicle;
}

/** Every block between two NZ dates, with its reason and, for trips, the booking. */
export function useAdminCalendar(id: string, from: string, to: string) {
  return useQuery({
    queryKey: adminCalendarQueryKey(id, from, to),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/vehicles/{id}/calendar', {
          params: { path: { id }, query: { from, to } },
          signal,
        }),
      ),
    staleTime: 30_000,
  });
}

/** Never over a trip or a guest's hold (409 BOOKED_DATES). */
export async function addBlockRequest(input: { id: string; block: BlockInput }): Promise<CalendarBlock> {
  const response = await unwrap(
    client.POST('/admin/vehicles/{id}/blocks', { params: { path: { id: input.id } }, body: input.block }),
  );
  return response.block;
}

/** Staff, Host and recurring blocks; never a trip's. */
export async function removeBlockRequest(input: { id: string; blockId: string }): Promise<void> {
  await unwrap(
    client.DELETE('/admin/vehicles/{id}/blocks/{blockId}', {
      params: { path: { id: input.id, blockId: input.blockId } },
    }),
  );
}

// These messages come from the API and are already written for people.
const REVIEW_ERROR_CODES = [
  'EMAIL_NOT_VERIFIED',
  'HOST_NOT_APPROVED',
  'NOT_UNDER_REVIEW',
  'BOOKED_DATES',
  'NOT_FOUND',
];

/** Refusals (not allowed, not found, a conflict) whose API message explains itself to staff. */
const EXPLAINED_STATUSES = [403, 404, 409];

/** The message a staff decision shows for an API error, or null when it belongs to a form field. */
export function reviewErrorMessage(error: unknown): string | null {
  if (
    error instanceof ApiError &&
    !error.fields &&
    (REVIEW_ERROR_CODES.includes(error.code) || EXPLAINED_STATUSES.includes(error.status))
  ) {
    return error.message;
  }
  return formErrorMessage(error);
}

export const isApiError = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

/** Replaces the listing in the review page's cache with the one a decision returned. */
export const withVehicle =
  (vehicle: HostVehicle) =>
  (previous: AdminVehicle | undefined): AdminVehicle | undefined =>
    previous && { ...previous, vehicle };
