import { SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { BookingActions } from '@/features/admin/bookings/booking-actions';
import {
  CasesCard,
  ExtraChargesCard,
  PartiesCard,
  PaymentsCard,
  PayoutsCard,
  StatusHistoryCard,
  TripCard,
} from '@/features/admin/bookings/booking-sections';
import { useAdminBooking } from '@/features/admin/bookings/bookings-api';
import { BOOKING_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { LoadError } from '@/features/admin/ops/query-feedback';
import { formatDays, formatTripSpan } from '@/features/booking/booking-format';
import { BookingPageSkeleton, StatusBadge } from '@/features/booking/booking-parts';

function AdminBooking({ bookingRef }: { bookingRef: string }) {
  const detail = useAdminBooking(bookingRef);

  if (detail.isPending) {
    return (
      <>
        <PageMeta title={`Booking ${bookingRef} · Staff portal`} noindex />
        <div className="mt-6">
          <BookingPageSkeleton />
        </div>
      </>
    );
  }

  if (detail.isError) {
    const missing = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <>
        <PageMeta title={`Booking ${bookingRef} · Staff portal`} noindex />
        {missing ? (
          <EmptyState
            className="mx-auto mt-11"
            visual={
              <IconBadge size="xl" tone="muted">
                <SearchX />
              </IconBadge>
            }
            title="We couldn’t find that booking"
            description="Check the reference, or search for it by the Guest’s or Host’s name."
            actions={
              <Button asChild>
                <Link to="/admin/bookings">Search bookings</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-9">
            <LoadError
              title="We couldn’t load the booking"
              error={detail.error}
              onRetry={() => detail.refetch()}
              retrying={detail.isFetching}
            />
          </div>
        )}
      </>
    );
  }

  const { booking } = detail.data;

  return (
    <>
      <div className="mt-5">
        <AdminPageHeader
          eyebrow="Marketplace"
          title={`Booking ${booking.ref}`}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                to={`/admin/vehicles/${booking.vehicle.id}`}
                className="rounded-inner font-medium text-ink hover:underline"
              >
                {booking.vehicle.title}
              </Link>
              <span>
                {formatTripSpan(booking.start, booking.end)} · {formatDays(booking.days)}
              </span>
              <StatusBadge status={BOOKING_STATUS[booking.status]} />
            </span>
          }
          actions={<BookingActions detail={detail.data} queryRef={bookingRef} />}
        />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <TripCard booking={booking} />
          <PaymentsCard payments={detail.data.payments} refundableCents={detail.data.refundableCents} />
          <PayoutsCard payouts={detail.data.payouts} />
          <ExtraChargesCard charges={detail.data.extraCharges} />
        </div>
        <div className="grid min-w-0 gap-6">
          <PartiesCard detail={detail.data} />
          <CasesCard
            bookingRef={booking.ref}
            incidents={detail.data.incidents}
            tickets={detail.data.tickets}
          />
          <StatusHistoryCard history={detail.data.statusHistory} />
        </div>
      </div>
    </>
  );
}

/**
 * One booking's whole record for staff (plan §12.6): the trip and its price, the Guest and Host, the status
 * history, payments with their refunds, payouts, extra charges, and its incidents and tickets, with the
 * status edit, refunds and cancellation (plan §8.2).
 */
export function AdminBookingPage() {
  const { ref = '' } = useParams();
  return (
    <div className="mx-auto max-w-6xl">
      <BackLink to="/admin/bookings" previous>
        Bookings
      </BackLink>
      <AdminBooking key={ref} bookingRef={ref} />
    </div>
  );
}
