import { CalendarOff, Heart, Search } from 'lucide-react';
import { Link } from 'react-router';
import type { SavedCars } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { StreetMap } from '@/components/brand/patterns/street-map';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import { useSavedCars } from '@/features/account/dashboard-api';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatDays, formatTripSpan, nzWallClockParts } from '@/features/booking/booking-format';
import { VehicleCard } from '@/features/vehicles/vehicle-card';

type Search = NonNullable<SavedCars['search']>;

/** "?start=2026-10-12T10:00&end=…": the listing opens with the searched dates. */
function listingSearch(search: Search | null): string {
  if (!search) return '';
  const param = (iso: string) => {
    const { date, time } = nzWallClockParts(new Date(iso));
    return `${date}T${time}`;
  };
  return `?${new URLSearchParams({ start: param(search.start), end: param(search.end) })}`;
}

function SearchNote({ search }: { search: Search | null }) {
  if (!search) {
    return (
      <>
        Search with your dates and each car shows its total for the trip, so you can compare them side by
        side.
      </>
    );
  }
  return (
    <>
      Priced for{search.place ? ` ${search.place},` : ''} {formatTripSpan(search.start, search.end)} (
      {formatDays(search.days)}), from your last search. Totals include every mandatory charge and GST.
    </>
  );
}

function SavedSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="grid gap-3">
          <Skeleton className="aspect-4/3 rounded-card" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SavedList() {
  const saved = useSavedCars();

  if (saved.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your saved cars"
        action={
          <Button variant="secondary" size="sm" onClick={() => void saved.refetch()}>
            Try again
          </Button>
        }
      >
        {saved.error.message}
      </Alert>
    );
  }
  if (!saved.data) return <SavedSkeleton />;
  const { cars, search } = saved.data;

  if (cars.length === 0) {
    return (
      <EmptyState
        className="mx-auto py-8"
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <Heart />
          </IconBadge>
        }
        title="No saved cars yet"
        description="Tap the heart on any car to keep it here, and compare your shortlist before you book."
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

  const query = listingSearch(search);
  return (
    <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {cars.map((car, index) => (
        <li key={car.id} className="stagger-in grid content-start gap-3" style={staggerIndex(index)}>
          <VehicleCard
            vehicle={car}
            listingSearch={car.listed ? query : ''}
            priority={index < 3}
            headingLevel="h2"
            className={car.listed ? undefined : 'opacity-70'}
          />
          {!car.listed ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <CalendarOff aria-hidden="true" className="size-4 shrink-0" />
              No longer listed. Its host has taken it out of search.
            </p>
          ) : (
            car.availableForDates === false && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <CalendarOff aria-hidden="true" className="size-4 shrink-0" />
                Not available for your dates. Try others on its page.
              </p>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

function Saved() {
  const saved = useSavedCars();
  return (
    <div className="grid gap-8">
      <AccountPageHeader
        title="Saved cars"
        description={saved.data ? <SearchNote search={saved.data.search} /> : 'Your shortlist of cars.'}
        // With nothing saved yet, the empty state's Browse cars is the one way on.
        actions={
          saved.data?.cars.length ? (
            <Button asChild variant="secondary">
              <Link to="/cars" viewTransition>
                <Search aria-hidden="true" />
                Find more cars
              </Link>
            </Button>
          ) : undefined
        }
      />
      <SavedList />
    </div>
  );
}

/** Saved cars (spec §8): the shortlist, each car priced for the Guest's last searched dates (spec §28). */
export function SavedPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={StreetMap} />
      <PageMeta title="Saved cars" noindex />
      <RequireSignedIn
        fallback={
          <AccountShell>
            <SavedSkeleton />
          </AccountShell>
        }
      >
        {() => (
          <AccountShell>
            <Saved />
          </AccountShell>
        )}
      </RequireSignedIn>
    </Container>
  );
}
