import { CalendarRange, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { BookingSummary } from '@/api/types';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useAcceptBooking, useBookings } from '@/features/booking/booking-api';
import { BookingCard, BookingListSkeleton } from '@/features/booking/booking-card';
import { DeclineDialogContent } from '@/features/booking/decline-dialog';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';

const TABS = [
  { value: 'requests', label: 'Requests' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'current', label: 'Current' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type Tab = (typeof TABS)[number]['value'];

const EMPTY: Record<Tab, string> = {
  requests: 'No requests waiting. When a guest asks to book one of your cars, you’ll answer here.',
  upcoming: 'No upcoming bookings yet. Confirmed trips show here until they start.',
  current: 'No trips under way right now.',
  completed: 'No completed trips yet.',
  cancelled: 'Nothing cancelled, declined or expired.',
};

const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab.value === value);

/** Accept and Decline, right on a request's card (plan §9, Days 11–13). */
function RequestActions({ booking }: { booking: BookingSummary }) {
  const accept = useAcceptBooking(booking.ref);
  const [declining, setDeclining] = useState(false);
  const guest = booking.otherParty.firstName;

  return (
    <>
      <Button
        size="sm"
        loading={accept.isPending}
        onClick={() =>
          accept.mutate(undefined, {
            onSuccess: () =>
              toast('Booking accepted', {
                description: `${guest}’s trip is confirmed, and they’ve been sent your pick-up details.`,
              }),
            onError: (error) =>
              toast('We couldn’t accept this request', { description: error.message, tone: 'danger' }),
          })
        }
      >
        <Check aria-hidden="true" />
        Accept
      </Button>
      <Button size="sm" variant="secondary" disabled={accept.isPending} onClick={() => setDeclining(true)}>
        <X aria-hidden="true" />
        Decline
      </Button>
      <Dialog open={declining} onOpenChange={setDeclining}>
        {declining && (
          <DeclineDialogContent
            booking={{ ref: booking.ref, guestName: guest }}
            onDone={() => setDeclining(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function BookingList({ group }: { group: Tab }) {
  const bookings = useBookings('host', group);

  if (bookings.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your bookings"
        action={
          <Button variant="secondary" size="sm" onClick={() => void bookings.refetch()}>
            Try again
          </Button>
        }
      >
        {bookings.error.message}
      </Alert>
    );
  }
  if (!bookings.data) return <BookingListSkeleton />;
  if (bookings.data.length === 0) {
    return (
      <EmptyState
        className="mx-auto py-8"
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <CalendarRange />
          </IconBadge>
        }
        title={group === 'requests' ? 'You’re all caught up' : 'Nothing here yet'}
        description={EMPTY[group]}
        actions={
          <Button asChild variant="secondary">
            <Link to="/host">Your cars</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-4">
      {bookings.data.map((booking, index) => (
        <li key={booking.id} className="stagger-in" style={staggerIndex(index)}>
          <BookingCard
            booking={booking}
            viewer="HOST"
            to={`/host/bookings/${booking.ref}`}
            actions={booking.status === 'PENDING' ? <RequestActions booking={booking} /> : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

function HostBookings() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'requests';

  return (
    <div className="grid gap-8">
      <HostSubNav />
      <HostPageHeader
        eyebrow="Hosting"
        title="Bookings"
        description="Answer requests within 24 hours, or they expire and the guest’s card is released."
      />
      <SegmentedTabs
        idPrefix="host-bookings"
        label="Bookings"
        options={TABS}
        value={tab}
        onChange={(value) => setParams(value === 'requests' ? {} : { tab: value }, { replace: true })}
        className="max-w-2xl max-sm:[&_button]:px-1 max-sm:[&_button]:text-xs"
      />
      <div
        role="tabpanel"
        id={tabPanelId('host-bookings', tab)}
        aria-labelledby={tabId('host-bookings', tab)}
      >
        <BookingList key={tab} group={tab} />
      </div>
    </div>
  );
}

function HostBookingsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8">
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-13 max-w-2xl rounded-full" />
      <BookingListSkeleton />
    </div>
  );
}

/**
 * The Host's bookings (spec §9, plan §9 Days 11–13): requests to answer, with the time left and Accept and
 * Decline on each, then Upcoming, Current, Completed and Cancelled. The full Host dashboard follows in
 * Phase 3.
 */
export function HostBookingsPage() {
  return (
    <Container className="max-w-4xl py-8 sm:py-12">
      <PageMeta title="Bookings" noindex />
      <RequireSignedIn fallback={<HostBookingsSkeleton />}>{() => <HostBookings />}</RequireSignedIn>
    </Container>
  );
}
