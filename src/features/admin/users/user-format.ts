import type { AdminUserDetail, AdminUserRow } from '@/api/types';
import { VERIFICATION_LABELS } from '@/features/admin/ops/admin-labels';
import { LICENCE_CLASS_LABELS, type LicenceClass } from '@/features/booking/booking-format';

export type UserRole = AdminUserRow['roles'][number];
export type UserStatus = AdminUserRow['status'];

/** A users search, as the address holds it (?q=aroha&role=host&status=suspended&flagged=true&page=2). */
export interface UserFilters {
  q: string;
  role?: UserRole;
  status?: UserStatus;
  flagged: boolean;
  page: number;
}

export const ROLES: readonly UserRole[] = ['GUEST', 'HOST', 'ADMIN', 'SUPPORT'];
export const STATUSES: readonly UserStatus[] = ['ACTIVE', 'SUSPENDED'];

const oneOf = <Value extends string>(values: readonly Value[], value: string | null): Value | undefined =>
  values.find((item) => item === value?.toUpperCase());

/** The search in the address; anything unknown is left out. */
export function filtersFromParams(params: URLSearchParams): UserFilters {
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    role: oneOf(ROLES, params.get('role')),
    status: oneOf(STATUSES, params.get('status')),
    flagged: params.get('flagged') === 'true',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** The address for a search: lower case, and only what's set, so the plain list is just /admin/users. */
export function paramsFromFilters(filters: UserFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.role) params.role = filters.role.toLowerCase();
  if (filters.status) params.status = filters.status.toLowerCase();
  if (filters.flagged) params.flagged = 'true';
  if (filters.page > 1) params.page = String(filters.page);
  return params;
}

export const hasFilters = (filters: UserFilters) =>
  Boolean(filters.q || filters.role || filters.status || filters.flagged);

export const fullName = (person: Pick<AdminUserRow, 'firstName' | 'lastName'>) =>
  `${person.firstName} ${person.lastName}`;

type Licence = NonNullable<AdminUserDetail['licence']>;

/** "Full NZ licence", or the code for a class this website doesn't know yet. */
export const licenceClassLabel = (licenceClass: Licence['class']) =>
  LICENCE_CLASS_LABELS[licenceClass as LicenceClass] ?? licenceClass;

/** A licence's review, in the same words as an identity check: "In review", "Verified", "Rejected". */
export const licenceStatusLabel = (status: Licence['status']) =>
  VERIFICATION_LABELS[status as keyof typeof VERIFICATION_LABELS] ?? status;
