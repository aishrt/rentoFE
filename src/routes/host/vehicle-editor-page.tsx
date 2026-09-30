import { CarFront } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useHostVehicle, usePolicies } from '@/features/host/host-api';
import { HostSubNav } from '@/features/host/host-nav';
import { ListingEditor } from '@/features/host/listing-editor';
import { stepPath, vehiclePath, type StepNavigationState } from '@/features/host/use-step-save';
import { VehicleOverview } from '@/features/host/vehicle-overview';
import { STEP_COUNT, isLocked, isSubmittable } from '@/features/host/vehicle-labels';

function EditorSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true">
      <span className="sr-only">Loading your listing</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-8 w-80" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

/** "3" → 3, "review" → the review, nothing → the overview or where to resume, anything else → invalid. */
function parseStep(step: string | undefined): number | 'review' | 'none' | 'invalid' {
  if (step === undefined) return 'none';
  if (step === 'review') return 'review';
  const number = Number(step);
  return Number.isInteger(number) && number >= 1 && number <= STEP_COUNT ? number : 'invalid';
}

function Editor({ id, step }: { id: string; step: string | undefined }) {
  const vehicle = useHostVehicle(id);
  const policies = usePolicies();

  if (vehicle.isPending || policies.isPending) return <EditorSkeleton />;
  if (vehicle.isError || policies.isError) {
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
          title={missing ? "We can't find that car" : "We couldn't load your listing"}
          description={
            missing
              ? 'It may have been deleted, or it belongs to another account.'
              : 'Check your connection, then try again.'
          }
          actions={
            <>
              {!missing && (
                <Button
                  onClick={() => {
                    void vehicle.refetch();
                    void policies.refetch();
                  }}
                >
                  Try again
                </Button>
              )}
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
  const parsed = parseStep(step);
  if (parsed === 'invalid') return <Navigate to={vehiclePath(id)} replace />;
  if (parsed === 'none') {
    // A draft picks up where the Host left off (plan §9: resume where you left off).
    if (car.status === 'DRAFT')
      return <Navigate to={stepPath(id, Math.min(Math.max(car.onboardingStep, 1), STEP_COUNT))} replace />;
    return <VehicleOverview vehicle={car} policies={policies.data} />;
  }
  if (parsed === 'review' && car.status === 'UNDER_REVIEW') {
    // Just submitted: the overview says what happens next.
    return (
      <Navigate to={vehiclePath(id)} replace state={{ submitted: true } satisfies StepNavigationState} />
    );
  }
  if (isLocked(car.status) || (parsed === 'review' && !isSubmittable(car.status))) {
    return <Navigate to={vehiclePath(id)} replace />;
  }
  return <ListingEditor vehicle={car} policies={policies.data} step={parsed} />;
}

/**
 * A car's listing (plan §9, Days 8–11): `/host/vehicles/:id/1` to `/6` are the onboarding steps and
 * `/review` submits. Without a step, a draft resumes where it was left, and anything submitted shows its
 * overview.
 */
export function VehicleEditorPage() {
  const { id = '', step } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageMeta title="Your listing" noindex />
      <RequireSignedIn fallback={<EditorSkeleton />}>
        {() => (
          <>
            <HostSubNav className="mb-8" />
            <Editor id={id} step={step} />
          </>
        )}
      </RequireSignedIn>
    </Container>
  );
}
