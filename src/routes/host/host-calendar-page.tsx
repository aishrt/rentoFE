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
import { AllCarsCalendar } from '@/features/host/all-cars-calendar';
import { useHostVehicle, useHostVehicles } from '@/features/host/host-api';
import { HostPageHeader } from '@/features/host/host-nav';
import { HostShell } from '@/features/host/host-shell';
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

/** The Select's choice for every car at once, the default for a Host with more than one. */
const ALL_CARS = 'all';

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
              : "A car's calendar opens once you've submitted its listing. Your drafts are on My vehicles."
          }
          actions={
            none && canAdd ? (
              <Button asChild>
                <Link to="/host/vehicles/new">Add a car</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link to="/host/vehicles" viewTransition>
                  Your cars
                </Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  // The car in the link; or else all of them, for a Host with more than one, or their only car. The choice
  // stays in the link, so a refresh or a shared link keeps it.
  const chosen = choices.find((car) => car.id === params.get('car'));
  const allCars = !chosen && choices.length > 1;
  const car = chosen ?? choices[0]!;
  const choose = (value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === ALL_CARS) next.delete('car');
        else next.set('car', value);
        return next;
      },
      { replace: true },
    );

  const picker = choices.length > 1 && (
    <Field label="Car" className="w-full sm:w-72">
      <Select
        value={allCars ? ALL_CARS : car.id}
        onChange={choose}
        options={[
          { value: ALL_CARS, label: 'All cars' },
          ...choices.map((choice) => ({ value: choice.id, label: vehicleDisplayTitle(choice.title) })),
        ]}
        icon={<CarFront aria-hidden="true" />}
        listLabel="Your cars"
      />
    </Field>
  );

  if (allCars) {
    return (
      <div className="grid gap-8">
        <HostPageHeader
          eyebrow="Hosting"
          title="Calendar"
          description="Every car’s trips, requests and blocks. Open a car to block dates. All times are NZ time."
          actions={picker}
        />
        <AllCarsCalendar />
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <HostPageHeader
        eyebrow={
          <Link to={vehiclePath(car.id)} className="link-underline">
            {vehicleDisplayTitle(car.title)}
          </Link>
        }
        title="Calendar"
        description="Trips appear here automatically. All times are NZ time."
        actions={picker}
      />
      {/* A new car starts with nothing chosen on its calendar. */}
      <ChosenCalendar key={car.id} id={car.id} />
    </div>
  );
}

/**
 * The Host's Calendar tab (plan §12.6): all their cars at once on a timeline, for a Host with more than one,
 * or one car's calendar chosen from them, with the same month and week views, blocking and weekly
 * availability as the car's own calendar page.
 */
export function HostCalendarPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Calendar" noindex />
      <HostShell>
        <RequireSignedIn fallback={<CalendarSkeleton />}>
          {(user) => <HostCalendar user={user} />}
        </RequireSignedIn>
      </HostShell>
    </Container>
  );
}
