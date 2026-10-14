import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { HostPageHeader } from '@/features/host/host-nav';
import { HostShell } from '@/features/host/host-shell';
import { MyVehicles } from '@/features/host/my-vehicles';

/**
 * The Host's Vehicles tab (plan §12.6): My Vehicles (spec §9), each car with its status, what's left, and its
 * listing, calendar and maintenance. A draft carries on from here, and a new car starts here.
 */
export function HostVehiclesPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="My vehicles" noindex />
      <HostShell>
        <div className="grid gap-8">
          <HostPageHeader
            eyebrow="Hosting"
            title="My vehicles"
            description="Each car’s listing, calendar and maintenance."
          />
          <RequireSignedIn fallback={<Skeleton aria-hidden="true" className="h-44 rounded-card" />}>
            {(user) => (
              <MyVehicles canAdd={user.hostStatus === 'APPLIED' || user.hostStatus === 'APPROVED'} />
            )}
          </RequireSignedIn>
        </div>
      </HostShell>
    </Container>
  );
}
