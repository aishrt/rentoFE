import { CalendarRange, ListFilter, RefreshCw, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AdminBookingRow } from '@/api/types';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  BOOKING_STATUSES,
  BOOKINGS_PAGE_SIZE,
  bookingStatusFrom,
  filtersFrom,
  filtersToParams,
  hasFilters,
  useAdminBookings,
  type BookingFilters,
} from '@/features/admin/bookings/bookings-api';
import { BOOKING_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNzd, formatTripSpan } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...BOOKING_STATUSES.map((status) => ({ value: status, label: BOOKING_STATUS[status].label })),
];

/**
 * Bookings (plan §12.6): find one by its reference, a Guest's or Host's name or email, or the car, and
 * narrow by status or the days trips start. The search is in the address, so a link or the back button
 * brings it back.
 */
export function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFrom(searchParams);
  const bookings = useAdminBookings(filters);

  // Any change but the page starts again from page 1.
  const update = (change: Partial<BookingFilters>) =>
    setSearchParams(filtersToParams({ ...filters, page: 1, ...change }), { replace: true });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Bookings"
        description="Every booking, newest trip first. Open one for its payments, payouts, history and cases."
        actions={
          bookings.data && (
            <IconButton
              label="Refresh the list"
              onClick={() => bookings.refetch()}
              disabled={bookings.isFetching}
            >
              <RefreshCw aria-hidden="true" className={bookings.isFetching ? 'animate-spin' : undefined} />
            </IconButton>
          )
        }
      />

      <Filters key={filters.q} filters={filters} onChange={update} />

      <div className="mt-6">
        {bookings.isPending && <ListSkeleton label="Loading bookings" rows={8} />}

        {bookings.isError && (
          <LoadError
            title="We couldn’t load the bookings"
            error={bookings.error}
            onRetry={() => bookings.refetch()}
            retrying={bookings.isFetching}
          />
        )}

        {bookings.data?.bookings.length === 0 &&
          (hasFilters(filters) ? (
            <EmptyList
              icon={<Search />}
              title="No bookings match"
              description="Check the reference or spelling, or try fewer filters."
            />
          ) : (
            <EmptyList
              icon={<CalendarRange />}
              title="No bookings yet"
              description="Bookings show here as soon as Guests start checking out."
            />
          ))}

        {bookings.data && bookings.data.bookings.length > 0 && (
          <div aria-busy={bookings.isPlaceholderData || undefined}>
            <BookingsTable
              bookings={bookings.data.bookings}
              className={cn('transition-opacity duration-200', bookings.isPlaceholderData && 'opacity-60')}
            />
            <Pagination
              page={bookings.data.page}
              total={bookings.data.total}
              pageSize={BOOKINGS_PAGE_SIZE}
              noun="bookings"
              onChange={(page) => update({ page })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ClearDate({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={label}
      className="link-underline rounded-inner text-xs font-medium text-primary"
    >
      Clear
    </button>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: BookingFilters;
  onChange: (change: Partial<BookingFilters>) => void;
}) {
  // Typing doesn't search on every letter: Enter or Search does.
  const [text, setText] = useState(filters.q);
  const search = (event: FormEvent) => {
    event.preventDefault();
    onChange({ q: text.trim() });
  };

  return (
    <div className="mt-8 grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_11rem_11rem] lg:items-end">
        <form role="search" onSubmit={search} className="flex items-end gap-2">
          <Field label="Search" className="min-w-0 flex-1">
            <Input
              type="search"
              value={text}
              maxLength={100}
              onChange={(event) => setText(event.target.value)}
              placeholder="RV-7K2Q9M, a name, an email or a car"
              leadingIcon={<Search />}
              enterKeyHint="search"
            />
          </Field>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Field label="Status">
          <Select
            value={filters.status}
            onChange={(value) => onChange({ status: bookingStatusFrom(value) })}
            options={STATUS_OPTIONS}
            icon={<ListFilter />}
            listLabel="Booking statuses"
          />
        </Field>
        <Field
          label="Trips from"
          labelAside={
            filters.from && <ClearDate label="Clear the from date" onClear={() => onChange({ from: '' })} />
          }
        >
          <DatePicker
            value={filters.from}
            onChange={(from) => onChange({ from })}
            max={filters.to || undefined}
            placeholder="Any day"
            calendarLabel="Trips starting from"
          />
        </Field>
        <Field
          label="Trips to"
          labelAside={
            filters.to && <ClearDate label="Clear the to date" onClear={() => onChange({ to: '' })} />
          }
        >
          <DatePicker
            value={filters.to}
            onChange={(to) => onChange({ to })}
            min={filters.from || undefined}
            placeholder="Any day"
            calendarLabel="Trips starting up to"
            align="end"
          />
        </Field>
      </div>
      {hasFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange({ q: '', status: '', from: '', to: '' })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

function BookingsTable({ bookings, className }: { bookings: AdminBookingRow[]; className?: string }) {
  return (
    <DataTable label="Bookings" className={className}>
      <thead>
        <tr>
          <Th>Reference</Th>
          <Th>Car</Th>
          <Th>Guest</Th>
          <Th>Host</Th>
          <Th>Trip</Th>
          <Th>Status</Th>
          <Th align="right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => (
          <Tr key={booking.id}>
            <Td className="whitespace-nowrap">
              <Link
                to={`/admin/bookings/${booking.ref}`}
                className="rounded-inner font-semibold text-primary hover:underline"
              >
                {booking.ref}
              </Link>
            </Td>
            <Td className="max-w-64">{booking.vehicleTitle}</Td>
            <Td className="whitespace-nowrap">
              <Link
                to={`/admin/users/${booking.guest.id}`}
                className="rounded-inner text-primary hover:underline"
              >
                {booking.guest.name}
              </Link>
            </Td>
            <Td className="whitespace-nowrap">
              <Link
                to={`/admin/users/${booking.host.id}`}
                className="rounded-inner text-primary hover:underline"
              >
                {booking.host.name}
              </Link>
            </Td>
            <Td className="whitespace-nowrap">{formatTripSpan(booking.start, booking.end)}</Td>
            <Td>
              <StatusBadge status={BOOKING_STATUS[booking.status]} />
            </Td>
            <Td align="right">{formatNzd(booking.totalCents)}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
