import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CarFront } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { createVehicleRequest, storeVehicle } from '@/features/host/host-api';

function StartingSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">Starting your listing</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

function StartListing({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createVehicleRequest,
    onSuccess: (vehicle) => {
      storeVehicle(queryClient, vehicle);
      // Replaces this address, so Back from step 1 doesn't make another draft.
      navigate(`/host/vehicles/${vehicle.id}/1`, { replace: true });
    },
  });
  const canHost = user.hostStatus === 'APPLIED' || user.hostStatus === 'APPROVED';
  // Development runs effects twice (StrictMode); one draft per visit.
  const started = useRef(false);

  useEffect(() => {
    if (!canHost || started.current) return;
    started.current = true;
    create.mutate();
  }, [canHost, create]);

  if (!user.hostStatus || user.hostStatus === 'REJECTED') return <Navigate to="/host/apply" replace />;
  if (!canHost) return <Navigate to="/host" replace />;

  if (create.isError) {
    const notHost = create.error instanceof ApiError && create.error.code === 'NOT_A_HOST';
    return (
      <div className="flex justify-center py-12">
        <EmptyState
          visual={
            <IconBadge size="xl">
              <CarFront />
            </IconBadge>
          }
          title={notHost ? 'Apply to host first' : "We couldn't start your listing"}
          description={
            notHost
              ? 'It only takes a couple of minutes, then you can add your car.'
              : create.error instanceof ApiError && create.error.code === 'NETWORK_ERROR'
                ? create.error.message
                : 'Something went wrong on our side. Please try again in a moment.'
          }
          actions={
            notHost ? (
              <Button asChild>
                <Link to="/host/apply">Apply to host</Link>
              </Button>
            ) : (
              <>
                <Button onClick={() => create.mutate()} loading={create.isPending}>
                  Try again
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/host">Back to hosting</Link>
                </Button>
              </>
            )
          }
        />
      </div>
    );
  }
  return <StartingSkeleton />;
}

/** Starts a new listing: creates a draft and opens its first step (plan §9, Days 8–11). */
export function NewVehiclePage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Add a car" noindex />
      <RequireSignedIn fallback={<StartingSkeleton />}>
        {(user) => <StartListing user={user} />}
      </RequireSignedIn>
    </Container>
  );
}
