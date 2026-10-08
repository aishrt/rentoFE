import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CarFront, CircleAlert, Plus, Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import type { AdminFeaturedVehicles, AdminVehicleChoice } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { VEHICLE_STATUS_LABELS } from '@/features/admin/listings/listing-labels';
import { ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { useDebouncedValue } from '@/features/search/use-debounced-value';
import {
  MAX_FEATURED,
  contentErrorMessage,
  featuredVehiclesQueryKey,
  saveFeaturedVehiclesRequest,
  useFeaturedVehicles,
  useVehicleChoices,
} from './content-api';

/** How long typing pauses before the search runs, in ms. */
const SEARCH_DELAY = 300;

const sameOrder = (a: readonly AdminVehicleChoice[], b: readonly AdminVehicleChoice[]) =>
  a.length === b.length && a.every((vehicle, index) => vehicle.id === b[index]?.id);

/**
 * The homepage's featured cars: up to eight, in order. With none chosen, the homepage shows the best-rated
 * live cars. A chosen car that leaves search is left off the homepage until it's back.
 */
export function FeaturedCarsPanel() {
  const featured = useFeaturedVehicles();

  if (featured.isPending) return <ListSkeleton label="Loading the featured cars" rows={4} />;
  if (featured.isError) {
    return (
      <LoadError
        title="We couldn’t load the featured cars"
        error={featured.error}
        onRetry={() => featured.refetch()}
        retrying={featured.isFetching}
      />
    );
  }
  return <FeaturedCarsEditor saved={featured.data} />;
}

function FeaturedCarsEditor({ saved }: { saved: AdminFeaturedVehicles }) {
  const headingId = useId();
  const queryClient = useQueryClient();
  // Changes not saved yet; null while the list is as saved.
  const [draft, setDraft] = useState<AdminVehicleChoice[] | null>(null);
  // What the last move or removal did, for screen readers.
  const [announcement, setAnnouncement] = useState('');
  const chosen = draft ?? saved.vehicles;
  const changed = draft !== null && !sameOrder(draft, saved.vehicles);
  const full = chosen.length >= MAX_FEATURED;

  const save = useMutation({
    mutationFn: saveFeaturedVehiclesRequest,
    onSuccess: (response) => {
      queryClient.setQueryData(featuredVehiclesQueryKey, response);
      setDraft(null);
      toast('Featured cars saved', {
        description:
          response.vehicles.length > 0
            ? 'The homepage shows them within a minute.'
            : 'The homepage shows the best-rated live cars within a minute.',
      });
    },
  });

  const update = (next: AdminVehicleChoice[], message: string) => {
    save.reset();
    setDraft(next);
    setAnnouncement(message);
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...chosen];
    const [vehicle] = next.splice(index, 1);
    if (!vehicle) return;
    next.splice(index + by, 0, vehicle);
    update(next, `${vehicle.title} moved to number ${index + by + 1}`);
  };

  const remove = (vehicle: AdminVehicleChoice) =>
    update(
      chosen.filter((item) => item.id !== vehicle.id),
      `${vehicle.title} removed`,
    );

  const add = (vehicle: AdminVehicleChoice) => {
    if (full || chosen.some((item) => item.id === vehicle.id)) return;
    update([...chosen, vehicle], `${vehicle.title} added as number ${chosen.length + 1}`);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card asChild className="p-6 sm:p-8">
        <section aria-labelledby={headingId}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={headingId} className="text-lg font-semibold text-ink">
              On the homepage
            </h2>
            <p className="text-sm text-muted tabular-nums">
              {chosen.length} of {MAX_FEATURED} chosen
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Up to {MAX_FEATURED} cars, shown in this order. With none chosen, the homepage shows the
            best-rated live cars.
          </p>

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>

          {chosen.length === 0 ? (
            <p className="mt-6 rounded-inner border border-dashed border-line p-5 text-sm text-muted">
              No cars chosen, so the homepage shows the best-rated live cars.
            </p>
          ) : (
            <ol aria-label="Featured cars" className="mt-6 divide-y divide-line">
              {chosen.map((vehicle, index) => (
                <li
                  key={vehicle.id}
                  aria-label={vehicle.title}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-semibold text-ink tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {vehicle.title}
                      {!vehicle.live && (
                        <Badge variant="outline">{VEHICLE_STATUS_LABELS[vehicle.status]}</Badge>
                      )}
                    </p>
                    {vehicle.city && <p className="text-sm text-muted">{vehicle.city}</p>}
                    {!vehicle.live && (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-ink">
                        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                        Not in search now, so it’s left off the homepage
                      </p>
                    )}
                  </div>
                  <div className="ml-11 flex items-center sm:ml-0">
                    <IconButton
                      label={`Move ${vehicle.title} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Move ${vehicle.title} down`}
                      disabled={index === chosen.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Remove ${vehicle.title}`} onClick={() => remove(vehicle)}>
                      <X aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {save.isError && (
            <Alert variant="danger" role="alert" title="The featured cars weren’t saved" className="mt-6">
              {contentErrorMessage(save.error)}
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <Button
              loading={save.isPending}
              disabled={!changed}
              onClick={() => save.mutate(chosen.map((vehicle) => vehicle.id))}
            >
              Save featured cars
            </Button>
            {draft !== null && (
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => {
                  save.reset();
                  setDraft(null);
                  setAnnouncement('Changes undone');
                }}
              >
                Undo changes
              </Button>
            )}
          </div>
        </section>
      </Card>

      <AddCar chosen={chosen} full={full} onAdd={add} />
    </div>
  );
}

function AddCar({
  chosen,
  full,
  onAdd,
}: {
  chosen: readonly AdminVehicleChoice[];
  full: boolean;
  onAdd: (vehicle: AdminVehicleChoice) => void;
}) {
  const headingId = useId();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, SEARCH_DELAY).trim();
  const choices = useVehicleChoices(query);

  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="text-lg font-semibold text-ink">
          Add a car
        </h2>
        <p className="mt-1 text-sm text-muted">
          Only live cars can be added: approved, switched on and in search.
        </p>

        <Field label="Find a live car" className="mt-6">
          <Input
            type="search"
            autoComplete="off"
            placeholder="Make, model or town"
            leadingIcon={<Search />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>

        {full && (
          <Alert className="mt-4">
            {MAX_FEATURED} cars are chosen, the most the homepage shows. Remove one to add another.
          </Alert>
        )}

        <div className="mt-4">
          {choices.isPending && <ListSkeleton label="Loading live cars" rows={4} height="h-12" />}
          {choices.isError && (
            <LoadError
              title="We couldn’t load the live cars"
              error={choices.error}
              onRetry={() => choices.refetch()}
              retrying={choices.isFetching}
            />
          )}
          {choices.data && (
            <>
              <p className="text-sm text-muted">
                {choices.data.length === 0
                  ? query
                    ? `No live cars match “${query}”.`
                    : 'No cars are live yet.'
                  : query
                    ? `Live cars matching “${query}”`
                    : 'Live cars, best rated first'}
              </p>
              {choices.data.length > 0 && (
                <ul
                  aria-label="Live cars to add"
                  aria-busy={choices.isFetching || undefined}
                  className="scrollbar-subtle mt-2 max-h-96 divide-y divide-line overflow-y-auto"
                >
                  {choices.data.map((vehicle) => {
                    const added = chosen.some((item) => item.id === vehicle.id);
                    return (
                      <li
                        key={vehicle.id}
                        aria-label={vehicle.title}
                        className="flex items-center gap-3 py-2.5 pr-1"
                      >
                        <CarFront aria-hidden="true" className="size-5 shrink-0 text-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{vehicle.title}</p>
                          {vehicle.city && <p className="truncate text-sm text-muted">{vehicle.city}</p>}
                        </div>
                        {added ? (
                          <Badge variant="neutral">Added</Badge>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Add ${vehicle.title}`}
                            disabled={full}
                            onClick={() => onAdd(vehicle)}
                          >
                            <Plus aria-hidden="true" />
                            Add
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </Card>
  );
}
