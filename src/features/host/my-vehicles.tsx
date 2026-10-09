import { ArrowRight, CalendarDays, CarFront, CircleAlert, Clock, Plus, Wrench } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { HostVehicleSummary } from '@/api/types';
import { SectionError } from '@/components/errors/section-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerIndex } from '@/components/motion/presets';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { formatNzdFromCents } from '@/lib/format';
import { smallPhoto } from '@/lib/photos';
import { AngleIllustration } from './angle-illustrations';
import { deleteVehicleRequest, hostKeys, useHostVehicles } from './host-api';
import { InlineConfirm } from './inline-confirm';
import { hostErrorMessage } from './use-step-save';
import { VehicleStatusBadge } from './status-badges';
import { isLive, isLocked, stepTitle, vehicleDisplayTitle } from './vehicle-labels';

const updatedFormat = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Pacific/Auckland',
});

/** What the Host should know about the car at a glance, most urgent first. */
function vehicleNote(
  vehicle: HostVehicleSummary,
): { text: string; tone: 'attention' | 'waiting' | 'quiet' } | null {
  if (vehicle.status === 'DRAFT') {
    return vehicle.missingCount > 0
      ? {
          text: `${vehicle.missingCount} ${vehicle.missingCount === 1 ? 'thing' : 'things'} left to add · you reached ${stepTitle(vehicle.onboardingStep).toLowerCase()}`,
          tone: 'attention',
        }
      : { text: 'Ready to submit for review', tone: 'quiet' };
  }
  if (vehicle.status === 'CHANGES_REQUESTED')
    return { text: 'Our team asked for a few changes', tone: 'attention' };
  if (vehicle.status === 'UNDER_REVIEW') return { text: 'Our team is reviewing it', tone: 'waiting' };
  if (vehicle.pendingChanges)
    return { text: 'New photos or documents waiting for approval', tone: 'waiting' };
  return null;
}

function VehicleRow({ vehicle, index }: { vehicle: HostVehicleSummary; index: number }) {
  const title = vehicleDisplayTitle(vehicle.title);
  const note = vehicleNote(vehicle);
  const editPath = `/host/vehicles/${vehicle.id}`;
  const draft = vehicle.status === 'DRAFT';
  // Submitted and still listable: its listing, calendar and maintenance.
  const manageable = !draft && !isLocked(vehicle.status);
  const queryClient = useQueryClient();
  // Only a draft can be deleted; a listing that was submitted is switched off instead.
  const remove = useMutation({
    mutationFn: () => deleteVehicleRequest(vehicle.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: hostKeys.vehicle(vehicle.id) });
      void queryClient.invalidateQueries({ queryKey: hostKeys.vehicles, exact: true });
      toast('Draft deleted');
    },
    onError: (error) =>
      toast("We couldn't delete that draft", { description: hostErrorMessage(error), tone: 'danger' }),
  });

  return (
    <Card asChild className="stagger-in overflow-hidden" style={staggerIndex(index)}>
      <li className="grid sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div
          className={cn(
            'relative bg-canvas sm:aspect-auto sm:min-h-44',
            vehicle.photo ? 'aspect-4/3' : 'aspect-video',
          )}
        >
          {vehicle.photo ? (
            <img
              src={smallPhoto(vehicle.photo)}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <AngleIllustration angle="DRIVER" className="w-3/5 text-primary/60" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">
                <Link
                  to={editPath}
                  className="link-underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {title}
                </Link>
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {vehicle.dailyCents ? `${formatNzdFromCents(vehicle.dailyCents)} a day · ` : ''}
                Updated {updatedFormat.format(new Date(vehicle.updatedAt))}
              </p>
            </div>
            <VehicleStatusBadge status={vehicle.status} waitingForPayouts={vehicle.waitingForPayouts} />
          </div>
          {note && (
            <p
              className={cn(
                'flex items-start gap-2 text-sm',
                note.tone === 'attention' ? 'text-ink' : 'text-muted',
              )}
            >
              {note.tone === 'attention' ? (
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              ) : (
                <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              {note.text}
            </p>
          )}
          {/* A listed car's three actions share one style; on a phone the listing takes the first row and
              the calendar and maintenance share the second, rather than one wrapping on its own. */}
          <div
            className={cn(
              'mt-auto gap-3',
              manageable ? 'grid grid-cols-2 sm:flex sm:flex-wrap' : 'flex flex-wrap',
            )}
          >
            {!isLocked(vehicle.status) && (
              <Button
                asChild
                size="sm"
                variant={draft || vehicle.status === 'CHANGES_REQUESTED' ? 'primary' : 'secondary'}
                className={cn(manageable && 'col-span-2')}
              >
                <Link to={editPath}>
                  {draft ? 'Continue listing' : isLive(vehicle.status) ? 'Edit listing' : 'View listing'}
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            )}
            {isLocked(vehicle.status) && (
              <Button asChild size="sm" variant="secondary">
                <Link to={editPath}>See why</Link>
              </Button>
            )}
            {draft && (
              <InlineConfirm
                label="Delete draft"
                ariaLabel={`Delete the draft ${title}`}
                question="Delete it for good?"
                confirmLabel="Yes, delete"
                pending={remove.isPending}
                onConfirm={() => remove.mutate()}
              />
            )}
            {manageable && (
              <Button asChild size="sm" variant="secondary">
                <Link to={`${editPath}/calendar`}>
                  <CalendarDays aria-hidden="true" />
                  Calendar
                </Link>
              </Button>
            )}
            {manageable && (
              <Button asChild size="sm" variant="secondary">
                <Link to={`${editPath}/maintenance`}>
                  <Wrench aria-hidden="true" />
                  Maintenance
                </Link>
              </Button>
            )}
          </div>
        </div>
      </li>
    </Card>
  );
}

function VehiclesSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {[0, 1].map((key) => (
        <Skeleton key={key} className="h-44 rounded-card" />
      ))}
    </div>
  );
}

function AddCarButton() {
  return (
    <Button asChild>
      <Link to="/host/vehicles/new">
        <Plus aria-hidden="true" />
        Add a car
      </Link>
    </Button>
  );
}

/** A Host with no cars yet: where to start. */
function FirstCar({ canAdd }: { canAdd: boolean }) {
  return (
    <Card variant="flat" className="flex justify-center px-6 py-12">
      <EmptyState
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <CarFront />
          </IconBadge>
        }
        title="Add your first car"
        description="Six short steps, and you can save and come back any time. Have your rego, WOF and insurance handy."
        actions={canAdd && <AddCarButton />}
      />
    </Card>
  );
}

const countOf = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/**
 * My Vehicles (spec §9), the Host's Vehicles page under its heading: every car with its status, what's left,
 * and where to go next.
 */
export function MyVehicles({ canAdd }: { canAdd: boolean }) {
  const vehicles = useHostVehicles();

  return (
    <div className="grid gap-5">
      {vehicles.data && vehicles.data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">{countOf(vehicles.data.length, 'car')}</p>
          {canAdd && <AddCarButton />}
        </div>
      )}
      {vehicles.isPending && <VehiclesSkeleton />}
      {vehicles.isError && (
        <SectionError title="We couldn't load your cars" onRetry={() => vehicles.refetch()} />
      )}
      {vehicles.data?.length === 0 && <FirstCar canAdd={canAdd} />}
      {vehicles.data && vehicles.data.length > 0 && (
        <ul className="grid gap-4">
          {vehicles.data.map((vehicle, index) => (
            <VehicleRow key={vehicle.id} vehicle={vehicle} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** "3 cars · 1 live · 1 in review · 1 draft to finish". */
function carsSummary(cars: HostVehicleSummary[]): string {
  const live = cars.filter((car) => car.status === 'ACTIVE').length;
  const inReview = cars.filter(
    (car) => car.status === 'UNDER_REVIEW' || car.status === 'CHANGES_REQUESTED',
  ).length;
  const drafts = cars.filter((car) => car.status === 'DRAFT').length;
  return [
    countOf(cars.length, 'car'),
    live > 0 && `${live} live`,
    inReview > 0 && `${inReview} in review`,
    drafts > 0 && `${countOf(drafts, 'draft')} to finish`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** How many cars Today lists before "All vehicles". */
const SUMMARY_CARS = 3;

/**
 * The Host's cars on Today: how many, how they stand, and the ones changed most recently, with the way to
 * My Vehicles; or, with none yet, where to start.
 */
export function VehiclesSummary({ canAdd }: { canAdd: boolean }) {
  const vehicles = useHostVehicles();

  if (vehicles.isPending) return <Skeleton aria-hidden="true" className="h-44 rounded-card" />;
  if (vehicles.isError) {
    return <SectionError title="We couldn't load your cars" onRetry={() => vehicles.refetch()} />;
  }
  if (vehicles.data.length === 0) return <FirstCar canAdd={canAdd} />;

  return (
    <Card asChild className="grid grid-cols-1 gap-4 p-5 sm:p-6">
      <section aria-labelledby="today-vehicles">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="today-vehicles" className="font-semibold text-ink">
              My vehicles
            </h2>
            <p className="mt-1 text-sm text-muted">{carsSummary(vehicles.data)}</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/host/vehicles" viewTransition>
              All vehicles
              <ArrowRight aria-hidden="true" className="nudge-right" />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-1">
          {vehicles.data.slice(0, SUMMARY_CARS).map((vehicle) => (
            <li key={vehicle.id}>
              <Link
                to={`/host/vehicles/${vehicle.id}`}
                className="-mx-2 flex min-h-14 items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-120 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-inner bg-canvas">
                  {vehicle.photo ? (
                    <img
                      src={smallPhoto(vehicle.photo)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <CarFront aria-hidden="true" className="size-5 text-primary/60" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {vehicleDisplayTitle(vehicle.title)}
                </span>
                <VehicleStatusBadge
                  status={vehicle.status}
                  waitingForPayouts={vehicle.waitingForPayouts}
                  className="shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Card>
  );
}
