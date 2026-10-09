import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { AdminUserDetail } from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';
import type { UserFilters } from './user-format';

/*
 * Users and the risk queue in the staff portal (plan §12.6, §14). Admin and Support staff both use them;
 * closing an account and staff permissions are the admin's. The API writes every change to the audit log.
 */

/** The API's page size for the users list. */
export const USERS_PAGE_SIZE = 25;

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const usersQueryKey = ['admin', 'users'] as const;
export const userListsQueryKey = ['admin', 'users', 'list'] as const;
export const userListQueryKey = (filters: UserFilters) => [...userListsQueryKey, filters] as const;
export const adminUserQueryKey = (id: string) => ['admin', 'users', 'detail', id] as const;
export const riskQueueQueryKey = ['admin', 'users', 'risk'] as const;

/** One page of a search; the last page stays on screen while the next loads. */
export function useAdminUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userListQueryKey(filters),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/users', {
          params: {
            query: {
              q: filters.q || undefined,
              role: filters.role,
              status: filters.status,
              flagged: filters.flagged ? 'true' : undefined,
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

/** Someone's record: account, licence, hosting, risk flags and bookings. */
export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminUserQueryKey(id),
    queryFn: ({ signal }) => unwrap(client.GET('/admin/users/{id}', { params: { path: { id } }, signal })),
    select: (data) => data.user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** People with risk flags to review, most flags first. */
export function useRiskQueue() {
  return useQuery({
    queryKey: riskQueueQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/risk', { signal })),
    select: (data) => data.users,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Puts the record an action returned in the cache, and refreshes the lists it may have changed: a status,
 * a flag count, the risk queue.
 */
export function useUpdateUserCache() {
  const queryClient = useQueryClient();
  return (user: AdminUserDetail) => {
    queryClient.setQueryData(adminUserQueryKey(user.id), { user });
    void queryClient.invalidateQueries({ queryKey: userListsQueryKey });
    void queryClient.invalidateQueries({ queryKey: riskQueueQueryKey });
  };
}

const path = (id: string) => ({ params: { path: { id } } });

/** Signed out, can't sign in, listings hidden and payouts held. Their upcoming bookings stay for staff. */
export async function suspendUserRequest(input: { id: string; reason: string }): Promise<AdminUserDetail> {
  return (
    await unwrap(
      client.POST('/admin/users/{id}/suspend', { ...path(input.id), body: { reason: input.reason } }),
    )
  ).user;
}

/** Listings back in search, and held payouts sent. */
export async function unsuspendUserRequest(id: string): Promise<AdminUserDetail> {
  return (await unwrap(client.POST('/admin/users/{id}/unsuspend', path(id)))).user;
}

export async function clearRiskFlagRequest(input: { id: string; flagId: string }): Promise<AdminUserDetail> {
  return (
    await unwrap(
      client.POST('/admin/users/{id}/risk-flags/{flagId}/clear', {
        params: { path: { id: input.id, flagId: input.flagId } },
      }),
    )
  ).user;
}

/** Admin only. Anonymises the account; refused (409 CLOSURE_BLOCKED) while anything is under way. */
export async function closeUserRequest(id: string): Promise<AdminUserDetail> {
  return (await unwrap(client.POST('/admin/users/{id}/close', path(id)))).user;
}

/** Admin only (plan §8.1, item 10). Without an amount, everything owed is waived. */
export async function waiveHostFeeRequest(input: {
  id: string;
  amountCents?: number;
  reason: string;
}): Promise<AdminUserDetail> {
  return (
    await unwrap(
      client.POST('/admin/users/{id}/waive-host-fee', {
        ...path(input.id),
        body: { amountCents: input.amountCents, reason: input.reason },
      }),
    )
  ).user;
}

/** Admin only: whether a support team member can issue refunds. */
export async function setRefundsPermissionRequest(input: {
  id: string;
  refunds: boolean;
}): Promise<AdminUserDetail> {
  return (
    await unwrap(
      client.POST('/admin/staff/{id}/permissions', { ...path(input.id), body: { refunds: input.refunds } }),
    )
  ).user;
}

// These messages come from the API and are already written for people, e.g. support staff trying to
// change a staff account (403), or a closure that's blocked by a trip under way (409 CLOSURE_BLOCKED).
const USER_ERROR_CODES = [
  'FORBIDDEN',
  'SELF',
  'CLOSURE_BLOCKED',
  'ALREADY_CLOSED',
  'ALREADY_SUSPENDED',
  'NOT_SUSPENDED',
  'NOTHING_OWED',
  'NOT_FOUND',
];

/** The message an action on a user shows for an API error, or null when it belongs to a form field. */
export function userErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && USER_ERROR_CODES.includes(error.code) && !error.fields) {
    return error.message;
  }
  return formErrorMessage(error);
}

export const ADMIN_WAIVES_FEES = 'Only the admin can waive Host fees.';

/** Waiving fees is the admin's (plan §8.1, item 10): a 403 means a support member tried it. */
export function waiveFeeErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.status === 403) return ADMIN_WAIVES_FEES;
  return userErrorMessage(error);
}
