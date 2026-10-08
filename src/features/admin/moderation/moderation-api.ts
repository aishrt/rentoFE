import { useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { AdminReport } from '@/api/types';

/*
 * Moderation (plan §12.6): what members reported (a person, a message, a review or a listing), and the
 * reviews held back before publishing. Staff resolve or moderate each one with a note, which the API
 * keeps in the audit log.
 */

export type ReportStatus = AdminReport['status'];
export type ReportOutcome = Exclude<ReportStatus, 'OPEN'>;
export type ReviewState = 'HELD' | 'HIDDEN';
export type ReviewAction = 'CLEAR' | 'HIDE';

/** The API's limit for a resolution or a reason. */
export const MODERATION_NOTE_MAX = 500;

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const moderationQueryKey = ['admin', 'moderation'] as const;
export const reportsQueryKey = (status?: ReportStatus) =>
  status
    ? ([...moderationQueryKey, 'reports', status] as const)
    : ([...moderationQueryKey, 'reports'] as const);
export const moderationReviewsQueryKey = (state?: ReviewState) =>
  state
    ? ([...moderationQueryKey, 'reviews', state] as const)
    : ([...moderationQueryKey, 'reviews'] as const);

/** Reports with one status. */
export function useReports(status: ReportStatus) {
  return useQuery({
    queryKey: reportsQueryKey(status),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/moderation/reports', { params: { query: { status } }, signal })),
    select: (data) => data.reports,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Closes a report: action was taken, or it's dismissed. Either way, with a note of what was done. */
export async function resolveReportRequest(input: {
  id: string;
  status: ReportOutcome;
  resolution: string;
}): Promise<AdminReport> {
  const response = await unwrap(
    client.POST('/admin/moderation/reports/{id}/resolve', {
      params: { path: { id: input.id } },
      body: { status: input.status, resolution: input.resolution },
    }),
  );
  return response.report;
}

/** Reviews held for moderation, or hidden ones. */
export function useModerationReviews(state: ReviewState) {
  return useQuery({
    queryKey: moderationReviewsQueryKey(state),
    queryFn: ({ signal }) => unwrap(client.GET('/admin/reviews', { params: { query: { state } }, signal })),
    select: (data) => data.reviews,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Publishes a held review (CLEAR) or hides one (HIDE), with the reason. */
export async function moderateReviewRequest(input: {
  id: string;
  action: ReviewAction;
  reason: string;
}): Promise<void> {
  await unwrap(
    client.POST('/admin/reviews/{id}/moderate', {
      params: { path: { id: input.id } },
      body: { action: input.action, reason: input.reason },
    }),
  );
}

/**
 * The API names a field by its own name (`reason`); a dialog's notes field is called `notes`. Copies the
 * message across so it shows under the field instead of being lost.
 */
export function asNotesError(error: unknown, field: string): unknown {
  if (error instanceof ApiError && error.fields?.[field]) {
    return new ApiError(error.status, error.code, error.message, { notes: error.fields[field] });
  }
  return error;
}
