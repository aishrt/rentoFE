import type { Role, SessionUser } from '@/api/types';

const STAFF_ROLES: readonly Role[] = ['ADMIN', 'SUPPORT'];

/** Admins and support staff can open the staff portal (plan §6.2). The API enforces the same rule. */
export function isStaff(user: SessionUser | null | undefined): boolean {
  return Boolean(user?.roles.some((role) => STAFF_ROLES.includes(role)));
}

export function staffRoleLabel(user: SessionUser): string {
  return user.roles.includes('ADMIN') ? 'Administrator' : 'Support team';
}

export function initials(user: Pick<SessionUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
