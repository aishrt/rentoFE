import { useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { StaffInvite, StaffInviteInput, StaffList, StaffMember } from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';

// Under ['admin'], so signing out drops it from memory with the rest of the staff data.
export const staffQueryKey = ['admin', 'staff'] as const;

/** The admin, the support team and the invitations not yet accepted. Admin only. */
export function useStaff() {
  return useQuery({
    queryKey: staffQueryKey,
    queryFn: ({ signal }): Promise<StaffList> => unwrap(client.GET('/admin/staff', { signal })),
  });
}

/** Emails someone a link to join the support team; a second invitation replaces the first link. */
export async function inviteStaffRequest(input: StaffInviteInput): Promise<StaffInvite> {
  return (await unwrap(client.POST('/admin/staff/invites', { body: input }))).invite;
}

export async function cancelInviteRequest(id: string): Promise<void> {
  await unwrap(client.DELETE('/admin/staff/invites/{id}', { params: { path: { id } } }));
}

/** Takes someone off the support team and signs them out everywhere. */
export async function removeStaffRequest(id: string): Promise<void> {
  await unwrap(client.DELETE('/admin/staff/{id}', { params: { path: { id } } }));
}

export const staffName = (person: Pick<StaffMember, 'firstName' | 'lastName'>) =>
  `${person.firstName} ${person.lastName}`;

// These messages come from the API and are already written for people.
const STAFF_ERROR_CODES = ['ALREADY_STAFF', 'ACCOUNT_SUSPENDED', 'NOT_FOUND', 'CONFLICT'];

/** The message a staff form or dialog shows above its fields, or null when the error belongs to a field. */
export function staffErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && STAFF_ERROR_CODES.includes(error.code) && !error.fields) {
    return error.message;
  }
  return formErrorMessage(error);
}
