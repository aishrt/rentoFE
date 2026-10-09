import { CalendarDays, CarFront } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import type { HostVehicleSummary, SessionUser } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useHostVehicle, useHostVehicles } from '@/features/host/host-api';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';
import { vehiclePath } from '@/features/host/use-step-save';
import { CalendarSkeleton, VehicleCalendar } from '@/features/host/vehicle-calendar';
import { isLocked, vehicleDisplayTitle } from '@/features/host/vehicle-labels';

/** Cars with a calendar, as on My Vehicles: submitted, and not taken down for good. */
const hasCalendar = (car: HostVehicleSummary) => car.status !== 'DRAFT' && !isLocked(car.status);

/** The chosen car's calendar, loaded in full for its weekly availability and trip rules. */
function ChosenCalendar({ id }: { id: string }) {
  const vehicle = useHostVehicle(id);
  if (vehicle.isPending) return <Skeleton aria-hidden="true" className="h-[30rem] rounded-card" />;
  if (vehicle.isError) {
    return (
      <SectionError
        title="We couldn't load this car's calendar"
        description="Check your connection, then try again."
        onRetry={() => void vehicle.refetch()}
      />
    );
  }
  return <VehicleCalendar vehicle={vehicle.data} />;
}

function HostCalendar({ user }: { user: SessionUser }) {
  const cars = useHostVehicles();
  const [params, setParams] = useSearchParams();

  if (cars.isPending) return <CalendarSkeleton />;
  if (cars.isError) {
    return (
      <div className="flex justify-center py-12">
        <EmptyState
          visual={
            <IconBadge size="xl">
              <CalendarDays />
            </IconBadge>
          }
          title="We couldn't load your cars"
          description="Check your connection, then try again."
          actions={<Button onClick={() => void cars.refetch()}>Try again</Button>}
        />
      </div>
    );
  }

  const choices = cars.data.filter(hasCalendar);
  if (choices.length === 0) {
    const canAdd = user.hostStatus === 'APPLIED' || user.hostStatus === 'APPROVED';
    const none = cars.data.length === 0;
    return (
      <div className="grid gap-8">
        <HostPageHeader
          eyebrow="Hosting"
          title="Calendar"
          description="Each car's trips, requests and the times you block."
        />
        <EmptyState
          className="mx-auto py-8"
          titleAs="h2"
          visual={
            <IconBadge size="xl">
              <CalendarDays />
            </IconBadge>
          }
          title="No calendars yet"
          description={
            none
              ? "Add your car, and its calendar shows here once you've submitted the listing."
              : "A car's calendar opens once you've submitted its listing. Your drafts are on Overview."
          }
          actions={
            none && canAdd ? (
              <Button asChild>
                <Link to="/host/vehicles/new">Add a car</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link to="/host" viewTransition>
                  Your cars
                </Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  // The car in the link, or the first: the choice stays in the link, so a refresh or a shared link keeps it.
  const chosen = choices.find((car) => car.id === params.get('car')) ?? choices[0]!;
  const choose = (id: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('car', id);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="grid gap-8">
      <HostPageHeader
        eyebrow={
          <Link to={vehiclePath(chosen.id)} className="link-underline">
            {vehicleDisplayTitle(chosen.title)}
          </Link>
        }
        title="Calendar"
        description="Trips appear here automatically. All times are NZ time."
        actions={
          choices.length > 1 && (
            <Field label="Car" className="w-full sm:w-72">
              <Select
                value={chosen.id}
                onChange={choose}
                options={choices.map((car) => ({ value: car.id, label: vehicleDisplayTitle(car.title) }))}
                icon={<CarFront aria-hidden="true" />}
                listLabel="Your cars"
              />
            </Field>
          )
        }
      />
      {/* A new car starts with nothing chosen on its calendar. */}
      <ChosenCalendar key={chosen.id} id={chosen.id} />
    </div>
  );
}

/**
 * The Host's Calendar tab (plan §12.6): one car's calendar at a time, chosen from their cars, with the same
 * month and week views, blocking and weekly availability as the car's own calendar page.
 */
export function HostCalendarPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Calendar" noindex />
      <RequireSignedIn fallback={<CalendarSkeleton />}>
        {(user) => (
          <>
            <HostSubNav className="mb-8" />
            <HostCalendar user={user} />
          </>
        )}
      </RequireSignedIn>
    </Container>
  );
}
