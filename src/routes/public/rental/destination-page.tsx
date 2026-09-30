import { useQuery } from '@tanstack/react-query';
import { ArrowRight, KeyRound, Plane } from 'lucide-react';
import { m } from 'motion/react';
import { Link, useParams } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import type { DestinationDetail } from '@/api/types';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { fadeUp } from '@/components/motion/presets';
import { Reveal } from '@/components/motion/reveal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchForm } from '@/features/search/search-form';
import { tripParams, type PlaceValue } from '@/features/search/search-params';
import { ResultsGrid, ResultsGridSkeleton } from '@/features/search/results-grid';
import { MaxMotion } from '@/features/vehicles/max-motion';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { NotFoundPage } from '@/routes/errors/not-found-page';
import { motion } from '@/styles/tokens';

/** The tile gradients of the launch cities (globals.css); cities admins add later use the brand blue. */
const TONES: Record<string, string> = {
  queenstown: 'tone-queenstown',
  auckland: 'tone-auckland',
  christchurch: 'tone-christchurch',
  wellington: 'tone-wellington',
  rotorua: 'tone-rotorua',
};

const CARS_SHOWN = 6;

function useDestination(slug: string) {
  return useQuery({
    queryKey: ['destination', slug],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/destinations/{slug}', { params: { path: { slug } }, signal }))).destination,
    staleTime: 10 * 60_000,
  });
}

/** The cars around the city: the first few, and how many there are in all. */
function useCarsNear(destination: DestinationDetail | undefined) {
  return useQuery({
    queryKey: ['search', 'destination', destination?.slug],
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/search', {
          params: {
            query: {
              where: destination!.city,
              lat: destination!.lat,
              lng: destination!.lng,
              sort: 'recommended',
              pageSize: CARS_SHOWN,
            },
          },
          signal,
        }),
      ),
    enabled: Boolean(destination),
    staleTime: 60_000,
  });
}

function DestinationHero({ destination }: { destination: DestinationDetail }) {
  const place: PlaceValue = {
    label: destination.city,
    type: 'DESTINATION',
    lat: destination.lat,
    lng: destination.lng,
  };

  return (
    <section
      aria-labelledby="destination-heading"
      className={cn('relative isolate overflow-hidden text-canvas', TONES[destination.slug] ?? 'bg-primary')}
    >
      {destination.heroImage && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <img src={destination.heroImage} alt="" className="size-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/55 to-ink/20" />
        </div>
      )}
      <RidgeLines className="parallax absolute inset-x-0 bottom-0 -z-10 h-2/5 w-full text-black lg:-bottom-3" />

      <Container className="grid gap-10 pt-12 pb-14 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
        <div>
          <m.p className="eyebrow text-accent" {...fadeUp(0, motion.travel.sm)}>
            {destination.region}
          </m.p>
          <m.h1
            id="destination-heading"
            className="headline mt-4 text-title-1 font-medium"
            {...fadeUp(motion.stagger, motion.travel.md)}
          >
            Car rental in {destination.city}
          </m.h1>
          {destination.maoriName && (
            <m.p className="mt-2 text-lg text-canvas/75" {...fadeUp(motion.stagger * 2, motion.travel.sm)}>
              {destination.maoriName}
            </m.p>
          )}
          {destination.tagline && (
            <m.p className="mt-6 max-w-lg text-xl text-canvas/90" {...fadeUp(motion.stagger * 3)}>
              {destination.tagline}
            </m.p>
          )}
          <m.p className="mt-4 max-w-xl leading-relaxed text-canvas/80" {...fadeUp(motion.stagger * 4)}>
            {destination.intro}
          </m.p>
          {destination.airports.length > 0 && (
            <m.ul className="mt-6 flex flex-wrap gap-2" {...fadeUp(motion.stagger * 5, motion.travel.sm)}>
              {destination.airports.map((code) => (
                <li key={code}>
                  <Link
                    to={`/cars?${tripParams({ place: { label: `${destination.city} Airport (${code})`, type: 'AIRPORT', code } }).toString()}`}
                    viewTransition
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-canvas/30 px-4 text-sm font-medium text-canvas transition-[border-color,background-color,scale] duration-120 ease-out hover:border-canvas/60 hover:bg-canvas/10 active:scale-98"
                  >
                    <Plane aria-hidden="true" className="size-4 text-accent" />
                    Flying into {code}? Cars at the airport
                  </Link>
                </li>
              ))}
            </m.ul>
          )}
        </div>

        <m.div {...fadeUp(motion.stagger * 3, motion.travel.lg)}>
          <Card asChild variant="raised" className="p-5 text-ink sm:p-6">
            <SearchForm
              initial={{ place }}
              aria-labelledby="destination-search-heading"
              heading={
                <h2 id="destination-search-heading" className="headline text-2xl font-medium">
                  Find a car in {destination.city}
                </h2>
              }
            />
          </Card>
        </m.div>
      </Container>
    </section>
  );
}

function CarsNear({ destination }: { destination: DestinationDetail }) {
  const cars = useCarsNear(destination);
  const total = cars.data?.total ?? 0;
  const browseLink = `/cars?${tripParams({
    place: { label: destination.city, type: 'DESTINATION', lat: destination.lat, lng: destination.lng },
  }).toString()}`;

  return (
    <section aria-labelledby="cars-heading" className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <SectionHeading
              id="cars-heading"
              eyebrow="Local hosts"
              title={`Cars in and around ${destination.city}`}
              description="Collect from the host, or have the car delivered. Every price is in NZD."
            />
          </Reveal>
          {total > CARS_SHOWN && (
            <Button variant="secondary" asChild>
              <Link to={browseLink} viewTransition>
                See all {formatNumber(total)} cars
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-10">
          {cars.isPending ? (
            <ResultsGridSkeleton count={3} />
          ) : cars.isError ? (
            <Alert
              variant="danger"
              title="We couldn't load the cars"
              action={
                <Button variant="secondary" size="sm" onClick={() => void cars.refetch()}>
                  Try again
                </Button>
              }
            >
              {cars.error.message}
            </Alert>
          ) : total === 0 ? (
            <Card variant="flat" className="flex justify-center bg-surface px-6 py-12">
              <EmptyState
                titleAs="h2"
                visual={
                  <IconBadge size="xl">
                    <KeyRound />
                  </IconBadge>
                }
                title="No cars here yet"
                description={`No one in ${destination.city} has listed a car yet. If you have one, you could be the first, and earn from it while you're not using it.`}
                actions={
                  <>
                    <Button asChild>
                      <Link to="/become-a-host" viewTransition>
                        Become a Host
                        <ArrowRight aria-hidden="true" className="nudge-right" />
                      </Link>
                    </Button>
                    <Button variant="secondary" asChild>
                      <Link to="/cars" viewTransition>
                        Browse all cars
                      </Link>
                    </Button>
                  </>
                }
              />
            </Card>
          ) : (
            <ResultsGrid vehicles={cars.data.results} />
          )}
        </div>
      </Container>
    </section>
  );
}

function DestinationSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div className="bg-ink/85">
        <Container className="grid gap-10 pt-16 pb-20 lg:grid-cols-2 lg:pt-20 lg:pb-24">
          <div>
            <Skeleton className="h-4 w-24 bg-canvas/15" />
            <Skeleton className="mt-5 h-14 w-4/5 bg-canvas/15" />
            <Skeleton className="mt-6 h-5 w-3/5 bg-canvas/15" />
            <Skeleton className="mt-3 h-5 w-2/3 bg-canvas/15" />
          </div>
          <Skeleton className="h-96 rounded-sheet bg-canvas/15" />
        </Container>
      </div>
    </div>
  );
}

/**
 * A city or destination landing page (`/rental/:city`, plan §1.4, §9 Days 7–9): the city's name in English
 * and te reo Māori, its tagline and introduction from the `destinations` collection, a search prefilled with
 * the city, and the cars nearby. A city with no cars yet still loads normally, with a Become a Host prompt.
 * An unknown city gets the real not-found page.
 */
export function DestinationPage() {
  const { city = '' } = useParams();
  const destination = useDestination(city);

  if (destination.isPending) return <DestinationSkeleton />;
  if (destination.isError) {
    if (destination.error instanceof ApiError && destination.error.status === 404) return <NotFoundPage />;
    return (
      <Container className="py-16">
        <PageMeta title="Car rental" noindex />
        <Alert
          variant="danger"
          role="alert"
          title="We couldn't load this page"
          action={
            <Button variant="secondary" size="sm" onClick={() => void destination.refetch()}>
              Try again
            </Button>
          }
        >
          {destination.error.message}
        </Alert>
      </Container>
    );
  }

  const data = destination.data;
  return (
    <MaxMotion>
      <PageMeta
        title={`Car rental in ${data.city}`}
        description={`Rent a car from local owners in ${data.city}${data.maoriName ? ` (${data.maoriName})` : ''}. ${data.tagline ?? ''} All prices in NZD.`.trim()}
      />
      <DestinationHero destination={data} />
      <CarsNear destination={data} />
    </MaxMotion>
  );
}
