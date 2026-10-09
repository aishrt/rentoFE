import { CarFront } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useHostVehicle } from '@/features/host/host-api';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';
import { vehiclePath } from '@/features/host/use-step-save';
import { CalendarSkeleton, VehicleCalendar } from '@/features/host/vehicle-calendar';
import { vehicleDisplayTitle } from '@/features/host/vehicle-labels';

function CarCalendar({ id }: { id: string }) {
  const vehicle = useHostVehicle(id);

  if (vehicle.isPending) return <CalendarSkeleton />;
  if (vehicle.isError) {
    const missing =
      vehicle.error instanceof ApiError && (vehicle.error.status === 404 || vehicle.error.status === 403);
    return (
      <div className="flex justify-center py-12">
        <EmptyState
          visual={
            <IconBadge size="xl">
              <CarFront />
            </IconBadge>
          }
          title={missing ? "We can't find that car" : "We couldn't load the calendar"}
          description={
            missing
              ? 'It may have been deleted, or it belongs to another account.'
              : 'Check your connection, then try again.'
          }
          actions={
            <>
              {!missing && <Button onClick={() => vehicle.refetch()}>Try again</Button>}
              <Button asChild variant="secondary">
                <Link to="/host">Back to hosting</Link>
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const car = vehicle.data;
  return (
    <div className="grid gap-8">
      <HostPageHeader
        back={
          // Opened from My vehicles, the listing, its editor or a checkout, so Back returns to whichever.
          <BackLink to={vehiclePath(car.id)} previous>
            Back
          </BackLink>
        }
        eyebrow={
          <Link to={vehiclePath(car.id)} className="link-underline">
            {vehicleDisplayTitle(car.title)}
          </Link>
        }
        title="Calendar"
        description="Trips appear here automatically. All times are NZ time."
      />
      <VehicleCalendar vehicle={car} />
    </div>
  );
}

/**
 * A car's availability calendar (plan §9, Days 10–11): month and week views of every block by reason, with
 * a key; choose days or hours to block, remove your own blocks, set weekly availability (and see the times
 * left open for trips), and the minimum notice and preparation time.
 */
export function VehicleCalendarPage() {
  const { id = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Calendar" noindex />
      <RequireSignedIn fallback={<CalendarSkeleton />}>
        {() => (
          <>
            <HostSubNav className="mb-8" />
            <CarCalendar id={id} />
          </>
        )}
      </RequireSignedIn>
    </Container>
  );
}
