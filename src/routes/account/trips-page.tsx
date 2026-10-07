import { CalendarRange } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { AccountShell } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useBookings, type BookingGroup } from '@/features/booking/booking-api';
import { BookingCard, BookingListSkeleton } from '@/features/booking/booking-card';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'current', label: 'Current' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type Tab = (typeof TABS)[number]['value'];

const EMPTY: Record<Tab, { title: string; description: string }> = {
  upcoming: {
    title: 'No upcoming trips',
    description: 'Find a car from a local host, and your booked trips and requests will wait here.',
  },
  current: { title: 'No trips under way', description: 'Trips you’re on right now show here.' },
  completed: {
    title: 'No completed trips yet',
    description: 'Once you’ve returned a car, the trip moves here.',
  },
  cancelled: {
    title: 'Nothing cancelled',
    description: 'Cancelled, declined and expired bookings would show here, with any refund.',
  },
};

const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab.value === value);

function TripList({ group }: { group: Tab }) {
  const trips = useBookings('guest', group as BookingGroup);

  if (trips.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your trips"
        action={
          <Button variant="secondary" size="sm" onClick={() => void trips.refetch()}>
            Try again
          </Button>
        }
      >
        {trips.error.message}
      </Alert>
    );
  }
  if (!trips.data) return <BookingListSkeleton />;
  if (trips.data.length === 0) {
    const empty = EMPTY[group];
    return (
      <EmptyState
        className="mx-auto py-8"
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <CalendarRange />
          </IconBadge>
        }
        title={empty.title}
        description={empty.description}
        actions={
          <Button asChild>
            <Link to="/cars" viewTransition>
              Browse cars
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-4">
      {trips.data.map((trip, index) => (
        <li key={trip.id} className="stagger-in" style={staggerIndex(index)}>
          <BookingCard booking={trip} viewer="GUEST" to={`/trips/${trip.ref}`} />
        </li>
      ))}
    </ul>
  );
}

function Trips() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'upcoming';

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow text-primary">Your account</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Trips</h1>
        <p className="mt-2 text-muted">Your bookings and requests, with receipts, times and where to meet.</p>
      </div>
      <SegmentedTabs
        idPrefix="trips"
        label="Trips"
        options={TABS}
        value={tab}
        onChange={(value) => setParams(value === 'upcoming' ? {} : { tab: value }, { replace: true })}
        className="max-w-xl max-sm:[&_button]:px-2"
      />
      <div role="tabpanel" id={tabPanelId('trips', tab)} aria-labelledby={tabId('trips', tab)}>
        <TripList key={tab} group={tab} />
      </div>
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-13 max-w-xl rounded-full" />
      <BookingListSkeleton />
    </div>
  );
}

/** The Guest's trips (spec §8): Upcoming, Current, Completed and Cancelled, grouped by the API (plan §8.2). */
export function TripsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title="Trips" noindex />
      <AccountShell>
        <div className="max-w-4xl">
          <RequireSignedIn fallback={<TripsSkeleton />}>{() => <Trips />}</RequireSignedIn>
        </div>
      </AccountShell>
    </Container>
  );
}
