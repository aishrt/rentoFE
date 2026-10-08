import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { AdminJob } from '@/api/types';

/* The audit log and background jobs (spec §18; plan §12.6), for the admin only. */

export const AUDIT_PAGE_SIZE = 50;
export const JOBS_PAGE_SIZE = 50;

// Audit log -------------------------------------------------------------------------------------------------

export interface AuditFilters {
  action?: string;
  entity?: string;
  entityId?: string;
  /** A staff member's or member's user id. */
  actor?: string;
  page: number;
}

/** The filters the address can hold, as the API takes them. */
export const AUDIT_FILTER_KEYS = ['action', 'entity', 'entityId', 'actor'] as const;

/** Kinds of record the API writes to the log, for the filter. */
export const AUDIT_ENTITIES: readonly { value: string; label: string }[] = [
  { value: 'user', label: 'Users' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'booking', label: 'Bookings' },
  { value: 'payout', label: 'Payouts' },
  { value: 'incident', label: 'Incidents' },
  { value: 'supportTicket', label: 'Support tickets' },
  { value: 'review', label: 'Reviews' },
  { value: 'report', label: 'Reports' },
  { value: 'staffInvite', label: 'Staff invitations' },
  { value: 'platformSettings', label: 'Platform settings' },
  { value: 'job', label: 'Jobs' },
];

export const auditQueryKey = (filters?: AuditFilters) =>
  filters ? (['admin', 'audit', filters] as const) : (['admin', 'audit'] as const);

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: auditQueryKey(filters),
    queryFn: ({ signal }) => unwrap(client.GET('/admin/audit', { params: { query: filters }, signal })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** A before or after value as indented JSON, for the details of an entry. */
export function formatAuditValue(value: unknown): string {
  if (value === undefined) return 'Nothing recorded';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

// Jobs ------------------------------------------------------------------------------------------------------

export type JobStatus = 'FAILED' | 'QUEUED' | 'RUNNING';

export const jobsQueryKey = (status?: JobStatus, page?: number) =>
  status ? (['admin', 'jobs', status, page ?? 1] as const) : (['admin', 'jobs'] as const);

export function useAdminJobs(status: JobStatus, page: number) {
  return useQuery({
    queryKey: jobsQueryKey(status, page),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/jobs', { params: { query: { status, page } }, signal })),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Queues a failed job to run again now, with a fresh set of attempts. */
export async function retryJobRequest(id: AdminJob['id']) {
  return (await unwrap(client.POST('/admin/jobs/{id}/retry', { params: { path: { id } } }))).job;
}
