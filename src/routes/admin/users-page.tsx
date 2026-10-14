import { Flag, Search, UserCheck, UserCog, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AdminUserRow } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ROLE_LABELS, USER_STATUS, VERIFICATION_LABELS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatDateNz } from '@/features/admin/listings/listing-format';
import { hostStatusLabel } from '@/features/admin/listings/listing-labels';
import {
  ROLES,
  STATUSES,
  filtersFromParams,
  fullName,
  hasFilters,
  paramsFromFilters,
  type UserFilters,
} from '@/features/admin/users/user-format';
import { USERS_PAGE_SIZE, useAdminUsers } from '@/features/admin/users/users-api';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  ...ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];
const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...STATUSES.map((status) => ({ value: status, label: USER_STATUS[status].label })),
];

/**
 * Users (plan §12.6): search Guests, Hosts and staff by name, email or mobile, and narrow by role, status
 * or open risk flags. The search is in the address, so a link or the back button brings it back.
 */
export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromParams(searchParams);
  const users = useAdminUsers(filters);

  // Any change but the page starts again from page 1.
  const update = (change: Partial<UserFilters>) =>
    setSearchParams(paramsFromFilters({ ...filters, page: 1, ...change }), { replace: true });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Users"
        description="Guests, Hosts and staff. Open someone to see their account, bookings and risk flags."
      />

      <Filters key={filters.q} filters={filters} onChange={update} />

      <div className="mt-6">
        {users.isPending && <ListSkeleton label="Loading users" rows={8} />}

        {users.isError && (
          <LoadError
            title="We couldn’t load the users"
            error={users.error}
            onRetry={() => users.refetch()}
            retrying={users.isFetching}
          />
        )}

        {users.data?.users.length === 0 &&
          (hasFilters(filters) ? (
            <EmptyList
              icon={<Search />}
              title="Nobody matches"
              description="Check the spelling, or try fewer filters."
            />
          ) : (
            <EmptyList icon={<Users />} title="No users yet" />
          ))}

        {users.data && users.data.users.length > 0 && (
          <div aria-busy={users.isPlaceholderData || undefined}>
            <UsersTable
              users={users.data.users}
              className={cn('transition-opacity duration-200', users.isPlaceholderData && 'opacity-60')}
            />
            <Pagination
              page={users.data.page}
              total={users.data.total}
              pageSize={USERS_PAGE_SIZE}
              noun="users"
              onChange={(page) => update({ page })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: UserFilters;
  onChange: (change: Partial<UserFilters>) => void;
}) {
  // Typing doesn't search on every letter: Enter or Search does.
  const [text, setText] = useState(filters.q);
  const search = (event: FormEvent) => {
    event.preventDefault();
    onChange({ q: text.trim() });
  };

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] lg:items-end">
      <form role="search" onSubmit={search} className="flex items-end gap-2">
        <Field label="Search" className="min-w-0 flex-1">
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Name, email or mobile"
            leadingIcon={<Search />}
            enterKeyHint="search"
          />
        </Field>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <Field label="Role">
        <Select
          value={filters.role ?? ''}
          onChange={(value) => onChange({ role: (value || undefined) as UserFilters['role'] })}
          options={ROLE_OPTIONS}
          icon={<UserCog />}
          listLabel="Roles"
        />
      </Field>
      <Field label="Status">
        <Select
          value={filters.status ?? ''}
          onChange={(value) => onChange({ status: (value || undefined) as UserFilters['status'] })}
          options={STATUS_OPTIONS}
          icon={<UserCheck />}
          listLabel="Statuses"
        />
      </Field>
      <Switch
        label="Only flagged"
        checked={filters.flagged}
        onCheckedChange={(flagged) => onChange({ flagged })}
        className="lg:h-12"
      />
    </div>
  );
}

function UsersTable({ users, className }: { users: AdminUserRow[]; className?: string }) {
  return (
    <DataTable label="Users" className={className}>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Roles</Th>
          <Th>Status</Th>
          <Th>Identity</Th>
          <Th>Host</Th>
          <Th align="right">Risk flags</Th>
          <Th>Joined</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <Tr key={user.id}>
            <Td>
              <Link
                to={`/admin/users/${user.id}`}
                className="rounded-inner font-medium text-primary hover:underline"
              >
                {fullName(user)}
              </Link>
              <p className="mt-0.5 text-muted">{user.email}</p>
            </Td>
            <Td>{user.roles.map((role) => ROLE_LABELS[role]).join(', ')}</Td>
            <Td>
              {user.closed ? (
                <Badge variant="outline">Closed</Badge>
              ) : (
                <StatusBadge status={USER_STATUS[user.status]} />
              )}
            </Td>
            <Td className="whitespace-nowrap">{VERIFICATION_LABELS[user.identityStatus]}</Td>
            <Td className="whitespace-nowrap">{user.hostStatus ? hostStatusLabel(user.hostStatus) : '–'}</Td>
            <Td align="right">
              {user.openRiskFlags > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-danger">
                  <Flag aria-hidden="true" className="size-3.5" />
                  {formatNumber(user.openRiskFlags)}
                </span>
              ) : (
                <span className="text-muted">0</span>
              )}
            </Td>
            <Td className="whitespace-nowrap">{formatDateNz(user.createdAt)}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
