import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpDown, CalendarX, KeyRound, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { StreetMap } from '@/components/brand/patterns/street-map';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Select } from '@/components/ui/select';
import { useSession } from '@/features/auth/use-session';
import { usePolicies } from '@/features/content/content-api';
import { CurrencyPicker } from '@/features/currency/currency-picker';
import { MaxMotion } from '@/features/vehicles/max-motion';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { seoPage } from '@/seo/pages';
import { FilterPanel } from './filter-panel';
import { ResultsGrid, ResultsGridSkeleton } from './results-grid';
import { SearchForm } from './search-form';
import {
  SORT_OPTIONS,
  activeFilters,
  readFilters,
  readSort,
  readTrip,
  toApiQuery,
  tripParams,
  withFilters,
  withoutFilters,
  type ActiveFilter,
  type SearchFilters,
  type SortOption,
  type TripParams,
} from './search-params';
import { useSearchResults } from './search-queries';
import { fromDateTimeParam } from './search-validation';
import { formatTripDates, formatTripRange } from './trip-format';

const RADIUS_STEPS = [25, 50, 100, 200, 300];
const URL_UPDATE = { replace: true, preventScrollReset: true } as const;

/** "No cars", "1 car", "24 cars". */
const plural = (count: number, one: string, many: string) =>
  `${count === 0 ? 'No' : formatNumber(count)} ${count === 1 ? one : many}`;

/** The search form's starting values: the place and dates in the URL. */
function formValues(trip: TripParams) {
  const pickup = fromDateTimeParam(trip.start);
  const dropoff = fromDateTimeParam(trip.end);
  return {
    place: trip.place,
    pickupDate: pickup.date,
    pickupTime: pickup.time || '10:00',
    returnDate: dropoff.date,
    returnTime: dropoff.time || '10:00',
  };
}

/** Whether the searched place has any cars at all, when none are free for the dates. */
function usePlaceHasCars(trip: TripParams, enabled: boolean) {
  const query = toApiQuery({ place: trip.place }, readFilters(new URLSearchParams()), 'recommended');
  return useQuery({
    queryKey: ['search', 'any', query],
    queryFn: ({ signal }) =>
      unwrap(client.GET('/search', { params: { query: { ...query, pageSize: 1 } }, signal })).then(
        (results) => results.total > 0,
      ),
    enabled,
    staleTime: 60_000,
  });
}

interface NoResultsProps {
  active: ActiveFilter[];
  placeLabel?: string;
  dated: boolean;
  hasCarsAnotherTime?: boolean;
  onChange: (patch: Partial<SearchFilters>) => void;
  onClearAll: () => void;
  widenTo?: number;
}

/**
 * No results (plan §9, Days 7–9): with filters on, suggest removing them or widening the radius; in a place
 * with no cars yet, say so and invite hosts; where every car is booked, suggest other dates.
 */
function NoResults({
  active,
  placeLabel,
  dated,
  hasCarsAnotherTime,
  onChange,
  onClearAll,
  widenTo,
}: NoResultsProps) {
  const widen = widenTo ? (
    <Button variant="secondary" onClick={() => onChange({ radiusKm: widenTo })}>
      Search within {widenTo} km
    </Button>
  ) : null;

  if (active.length > 0) {
    return (
      <EmptyState
        titleAs="h2"
        className="mx-auto py-12"
        visual={
          <IconBadge size="xl">
            <SlidersHorizontal />
          </IconBadge>
        }
        title="No cars match those filters"
        description={
          widenTo
            ? 'Try removing a filter or two, or searching a wider area.'
            : 'Try removing a filter or two.'
        }
        actions={
          <>
            <Button onClick={onClearAll}>Clear all filters</Button>
            {widen}
          </>
        }
      >
        <ul aria-label="Filters in use" className="mt-6 flex flex-wrap justify-center gap-2">
          {active.map((filter) => (
            <li key={filter.id}>
              <button
                type="button"
                onClick={() => onChange(filter.clear)}
                aria-label={`Remove ${filter.label}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-[border-color,scale] duration-120 ease-out hover:border-ink/30 active:scale-96"
              >
                {filter.label}
                <X aria-hidden="true" className="size-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </EmptyState>
    );
  }

  if (dated && hasCarsAnotherTime) {
    return (
      <EmptyState
        titleAs="h2"
        className="mx-auto py-12"
        visual={
          <IconBadge size="xl">
            <CalendarX />
          </IconBadge>
        }
        title="Every car here is booked for those dates"
        description="Try moving your trip a day or two, or searching a wider area."
        actions={widen}
      />
    );
  }

  return (
    <EmptyState
      titleAs="h2"
      className="mx-auto py-12"
      visual={
        <IconBadge size="xl">
          <KeyRound />
        </IconBadge>
      }
      title="No cars here yet"
      description={
        placeLabel
          ? `No one near ${placeLabel} has listed a car yet. If you have one, you could be the first, and earn from it while you're not using it.`
          : "There aren't any cars listed yet. If you have one, you could be the first."
      }
      actions={
        <>
          <Button asChild>
            <Link to="/become-a-host" viewTransition>
              Become a Host
              <ArrowRight aria-hidden="true" className="nudge-right" />
            </Link>
          </Button>
          {widen}
          {placeLabel && !widen && (
            <Button variant="secondary" asChild>
              <Link to="/cars">Browse all cars</Link>
            </Button>
          )}
        </>
      }
    />
  );
}

/**
 * Browse Cars (`/cars`: every live car, daily prices) and Search Results (`/search`: the chosen dates, with
 * cars that are taken left out and an estimated total on each card) share this page (plan §12.6).
 *
 * Phones get a sticky summary bar ("Auckland · 12–15 Oct · Filters (3)") that opens the search and the filters
 * in bottom sheets; desktops get the search across the top and a 280 px filter sidebar. Everything lives in
 * the URL, and the results re-order smoothly when it changes. A signed-in guest's dated search is saved, so
 * Saved cars can show totals for it.
 */
export function SearchResultsView({ mode }: { mode: 'browse' | 'search' }) {
  const [params, setParams] = useSearchParams();
  const browse = mode === 'browse';
  const urlTrip = readTrip(params);
  // Browse Cars shows daily prices: dates belong to Search Results.
  const trip: TripParams = browse ? { place: urlTrip.place } : urlTrip;
  const filters = readFilters(params);
  const sort = readSort(params);
  const results = useSearchResults(toApiQuery(trip, filters, sort));
  const policies = usePolicies();
  const session = useSession();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const savedSearch = useRef<string | null>(null);

  const pages = results.data?.pages ?? [];
  const first = pages[0];
  const seen = new Set<string>();
  // A car can move between pages while paging; show it once (each card's photo has a unique transition name).
  const vehicles = pages
    .flatMap((page) => page.results)
    .filter((car) => !seen.has(car.id) && seen.add(car.id));
  const total = first?.total ?? 0;
  const active = activeFilters(filters);
  const dated = Boolean(trip.start && trip.end);
  const place = first?.place ?? null;
  const placeLabel = place?.label ?? (first ? undefined : trip.place.label || undefined);
  const radius = filters.radiusKm ?? first?.radiusKm ?? policies.data?.search.radiusKm.default ?? 25;
  const maxRadius = policies.data?.search.radiusKm.max ?? 300;
  const widenTo = place ? RADIUS_STEPS.find((step) => step > radius && step <= maxRadius) : undefined;
  const empty = results.isSuccess && total === 0;
  const placeHasCars = usePlaceHasCars(trip, empty && dated && active.length === 0 && Boolean(place));
  const listingSearch = dated ? `?${new URLSearchParams({ start: trip.start!, end: trip.end! })}` : '';
  const badRequest = results.error instanceof ApiError && results.error.status === 400 ? results.error : null;

  const updateFilters = (patch: Partial<SearchFilters>) => setParams(withFilters(params, patch), URL_UPDATE);
  const clearAll = () => setParams(withoutFilters(params), URL_UPDATE);
  const setSort = (value: SortOption) => {
    const next = new URLSearchParams(params);
    if (value === 'recommended') next.delete('sort');
    else next.set('sort', value);
    setParams(next, URL_UPDATE);
  };

  // Remember a signed-in guest's dated search, for the totals in Saved cars (plan §3, users.lastSearch).
  const signedIn = Boolean(session.data);
  const resolvedPlace = first ? JSON.stringify(first.place) : null;
  useEffect(() => {
    if (!signedIn || !dated || resolvedPlace === null) return;
    const found = JSON.parse(resolvedPlace) as typeof place;
    const body = { place: found?.label, lat: found?.lat, lng: found?.lng, start: trip.start, end: trip.end };
    const key = JSON.stringify(body);
    if (savedSearch.current === key) return;
    savedSearch.current = key;
    void client.PUT('/me/last-search', { body }).catch(() => {});
  }, [signedIn, dated, resolvedPlace, trip.start, trip.end]);

  const title = placeLabel ? `Cars near ${placeLabel}` : browse ? 'Browse cars' : 'Cars across New Zealand';
  const summaryPlace = placeLabel ?? 'All of NZ';
  const summaryDates = dated ? formatTripRange(trip.start!, trip.end!) : 'Any dates';
  const sortOptions = SORT_OPTIONS.filter((option) => option.value !== 'distance' || place);
  const formKey = tripParams(trip).toString();
  const filterCount = active.length;

  const filterPanel = <FilterPanel filters={filters} onChange={updateFilters} placeLabel={place?.label} />;

  let content;
  if (results.isPending) {
    content = <ResultsGridSkeleton />;
  } else if (badRequest) {
    content = (
      <Alert variant="danger" role="alert" title="Those search details need a change">
        <ul className="grid gap-1">
          {Object.values(badRequest.fields ?? { search: badRequest.message }).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
        <p className="mt-2">Change them above and search again.</p>
      </Alert>
    );
  } else if (results.isError) {
    content = (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn't load the cars"
        action={
          <Button variant="secondary" size="sm" onClick={() => void results.refetch()}>
            Try again
          </Button>
        }
      >
        {results.error.message}
      </Alert>
    );
  } else if (empty) {
    content = (
      <NoResults
        active={active}
        placeLabel={placeLabel}
        dated={dated}
        hasCarsAnotherTime={placeHasCars.data}
        onChange={updateFilters}
        onClearAll={clearAll}
        widenTo={widenTo}
      />
    );
  } else {
    content = (
      <>
        <ResultsGrid vehicles={vehicles} listingSearch={listingSearch} busy={results.isPlaceholderData} />
        {results.hasNextPage && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-sm text-muted">
              Showing {formatNumber(vehicles.length)} of {plural(total, 'car', 'cars')}
            </p>
            <Button
              variant="secondary"
              size="lg"
              loading={results.isFetchingNextPage}
              onClick={() => void results.fetchNextPage()}
            >
              Show more cars
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <MaxMotion>
      <PageMeta page={seoPage(browse ? '/cars' : '/search')} />

      {/* Phones and tablets: what was searched, and the way into the search and the filters (plan §12.6). */}
      <div className="glass sticky top-16 z-30 border-b border-line/70 lg:hidden">
        <Container className="flex items-center gap-2 py-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-left text-sm shadow-card transition-[border-color,scale] duration-120 ease-out hover:border-ink/25 active:scale-98"
          >
            <Search aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">
              <span className="font-semibold text-ink">{summaryPlace}</span>{' '}
              <span className="text-muted">· {summaryDates}</span>
            </span>
            <span className="sr-only">. Change the place or dates</span>
          </button>
          <Button variant="secondary" onClick={() => setFiltersOpen(true)} className="shrink-0 rounded-full">
            <SlidersHorizontal aria-hidden="true" />
            Filters{filterCount > 0 && ` (${filterCount})`}
          </Button>
        </Container>
      </div>

      <Container className="pt-6 pb-16 sm:pt-8 lg:pt-10 lg:pb-24">
        <PageBackdrop art={StreetMap} />
        <header className="animate-fade-up">
          <p className="eyebrow text-primary">{browse ? 'Browse cars' : 'Search results'}</p>
          <h1 className="headline mt-2 text-title-2 font-medium">{title}</h1>
          <p className="mt-2 text-muted">
            {dated
              ? `${formatTripDates(trip.start!, trip.end!)}, NZ time`
              : 'Daily prices. Add your dates to see the total for your trip.'}
          </p>
        </header>

        <Card className="mt-6 hidden p-4 lg:block">
          <SearchForm
            key={formKey}
            layout="inline"
            optional
            initial={formValues(trip)}
            keepParams={params}
            submitLabel="Search"
          />
        </Card>

        {first?.placeNotFound && (
          <Alert className="mt-6" title={`We couldn't find “${trip.place.label}”`}>
            So these are cars from all over New Zealand. Try a city, suburb or airport instead.
          </Alert>
        )}

        <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-10">
          <aside aria-labelledby="filters-heading" className="hidden lg:block">
            <div className="scrollbar-subtle sticky top-24 -ml-2 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-3 pb-6 pl-2">
              <div className="flex items-center justify-between gap-3 pb-4">
                <h2 id="filters-heading" className="headline text-2xl font-medium">
                  Filters
                </h2>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={filterCount === 0}>
                  Clear all
                </Button>
              </div>
              {filterPanel}
            </div>
          </aside>

          <section aria-labelledby="results-heading" className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6">
              <h2 id="results-heading" aria-live="polite" className="text-lg font-semibold text-ink">
                {results.isPending ? (
                  <>
                    <span aria-hidden="true" className="skeleton block h-7 w-28 rounded-md" />
                    <span className="sr-only">Loading cars</span>
                  </>
                ) : results.isError ? (
                  'Results'
                ) : (
                  <>
                    {plural(total, 'car', 'cars')}
                    {dated && (
                      <>
                        {' '}
                        <span className="font-normal text-muted">available</span>
                      </>
                    )}
                  </>
                )}
              </h2>
              <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
                <Field label="Sort by" className="sm:w-52">
                  <Select
                    value={sort}
                    onChange={(value) => setSort(value as SortOption)}
                    options={sortOptions}
                    icon={<ArrowUpDown />}
                    listLabel="Sort options"
                    align="end"
                  />
                </Field>
                <CurrencyPicker className="sm:w-52" />
              </div>
            </div>

            {content}
          </section>
        </div>
      </Container>

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={clearAll} disabled={filterCount === 0}>
              Clear all
            </Button>
            <Button
              onClick={() => setFiltersOpen(false)}
              loading={results.isFetching && !results.isFetchingNextPage}
            >
              {results.isSuccess ? `Show ${plural(total, 'car', 'cars')}` : 'Show cars'}
            </Button>
          </div>
        }
      >
        {filterPanel}
      </BottomSheet>

      <BottomSheet open={searchOpen} onOpenChange={setSearchOpen} title="Your trip">
        <SearchForm
          key={formKey}
          layout="sheet"
          optional
          initial={formValues(trip)}
          keepParams={params}
          submitLabel="Search"
          onSubmitted={() => setSearchOpen(false)}
          className={cn('pt-1')}
        />
      </BottomSheet>
    </MaxMotion>
  );
}
