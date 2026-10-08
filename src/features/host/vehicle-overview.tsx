import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, ExternalLink, Eye, EyeOff, PencilLine } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import type { HostVehicle, PublicPolicies } from '@/api/types';
import { CheckDraw } from '@/components/motion/check-draw';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { AngleIllustration } from './angle-illustrations';
import { setVehicleActiveRequest, storeVehicle } from './host-api';
import { HostPageHeader } from './host-nav';
import { coverPhoto, missingByStep, stepSummary } from './listing-summary';
import { VehicleStatusBadge } from './status-badges';
import { hostErrorMessage, stepPath, vehiclePath, type StepNavigationState } from './use-step-save';
import { ONBOARDING_STEPS, isLive, isLocked, isSubmittable, vehicleDisplayTitle } from './vehicle-labels';

const NEXT = [
  {
    title: 'Our team reviews your listing',
    text: 'We check the details, documents and photos, and email you when it’s approved or if anything needs changing.',
  },
  {
    title: 'Set up payouts',
    text: 'Payout setup is coming soon. Your car goes live once it’s approved and payouts are ready.',
  },
  {
    title: 'Get your calendar ready',
    text: 'Block the dates you need the car, and set the times it’s never free.',
  },
];

function Submitted({ vehicle }: { vehicle: HostVehicle }) {
  return (
    <Card className="animate-fade-up overflow-hidden p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-surface inset-shadow-highlight">
          <CheckDraw className="size-6" delay={0.15} />
        </span>
        <div>
          <p className="headline text-2xl font-medium">Submitted for review</p>
          <p className="mt-1 text-muted">Thanks! Here’s what happens next.</p>
        </div>
      </div>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {NEXT.map((item, index) => (
          <li key={item.title} className="rounded-card bg-canvas/70 p-4">
            <p className="eyebrow text-primary">Step {index + 1}</p>
            <p className="mt-1.5 font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`${vehiclePath(vehicle.id)}/calendar`}>
            <CalendarDays aria-hidden="true" />
            Set up the calendar
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/host">Back to hosting</Link>
        </Button>
      </div>
    </Card>
  );
}

function StatusNote({ vehicle }: { vehicle: HostVehicle }) {
  const pending =
    isLive(vehicle.status) &&
    (vehicle.photos.some((photo) => photo.status === 'PENDING') ||
      vehicle.documents.some((document) => document.status === 'PENDING'));
  switch (vehicle.status) {
    case 'UNDER_REVIEW':
      return (
        <Alert title="Our team is reviewing your listing">
          We’ll email you when it’s approved. You can still make changes in the meantime.
        </Alert>
      );
    case 'CHANGES_REQUESTED':
      return (
        <Alert
          variant="danger"
          title="Our team asked for a few changes"
          action={
            <Button asChild size="sm">
              <Link to={stepPath(vehicle.id, 'review')}>Review and submit again</Link>
            </Button>
          }
        >
          {vehicle.reviewNotes ?? 'Check your email for the details.'}
        </Alert>
      );
    case 'REJECTED':
      return (
        <Alert variant="danger" title="This listing wasn’t approved">
          {vehicle.reviewNotes && <p>{vehicle.reviewNotes}</p>}
          <p className="mt-1">It can’t be changed now. Contact us if you have questions.</p>
        </Alert>
      );
    case 'SUSPENDED':
      return (
        <Alert
          variant="danger"
          title="This car is suspended"
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/contact">Contact us</Link>
            </Button>
          }
        >
          {vehicle.reviewNotes ?? 'Guests can’t find or book it. Get in touch and we’ll help sort it out.'}
        </Alert>
      );
    case 'ACTIVE':
    case 'INACTIVE':
      return (
        <div className="grid gap-3">
          <Alert
            variant={vehicle.status === 'ACTIVE' ? 'success' : 'info'}
            title={vehicle.status === 'ACTIVE' ? 'Your car is live' : 'Hidden from search'}
          >
            {vehicle.status === 'ACTIVE'
              ? 'Guests can find and book it. Price, rules and delivery changes apply at once.'
              : 'Guests can’t find or book it until you show it again. Trips already booked go ahead.'}
          </Alert>
          {pending && (
            <Alert title="New photos or documents waiting for approval">
              Your listing shows the approved ones until our team has checked them.
            </Alert>
          )}
        </div>
      );
    default:
      return null;
  }
}

/**
 * A submitted or live listing (plan §9, Days 8–11): its status and what it means, what's still missing,
 * and each step to edit. Just after submitting, it opens with what happens next.
 */
export function VehicleOverview({ vehicle, policies }: { vehicle: HostVehicle; policies: PublicPolicies }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const submitted = (location.state as StepNavigationState | null)?.submitted === true;
  const locked = isLocked(vehicle.status);
  const groups = missingByStep(vehicle);
  const cover = coverPhoto(vehicle);

  const toggle = useMutation({
    mutationFn: (active: boolean) => setVehicleActiveRequest(vehicle.id, active),
    onSuccess: (saved) => {
      storeVehicle(queryClient, saved);
      toast(saved.status === 'ACTIVE' ? 'Your car is showing in search' : 'Your car is hidden from search');
    },
    onError: (error) =>
      toast("We couldn't change that", { description: hostErrorMessage(error), tone: 'danger' }),
  });

  return (
    <div className="grid gap-8">
      <HostPageHeader
        back={<BackLink to="/host">Hosting</BackLink>}
        title={vehicleDisplayTitle(vehicle.title)}
        titleAside={<VehicleStatusBadge status={vehicle.status} />}
        actions={
          <>
            {!locked && (
              <Button asChild variant="secondary">
                <Link to={`${vehiclePath(vehicle.id)}/calendar`}>
                  <CalendarDays aria-hidden="true" />
                  Calendar
                </Link>
              </Button>
            )}
            {vehicle.status === 'ACTIVE' && (
              <Button asChild variant="ghost">
                <Link to={`/cars/${vehicle.slug}`} target="_blank" rel="noopener">
                  View listing
                  <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            )}
            {isLive(vehicle.status) && (
              <Button
                variant="ghost"
                loading={toggle.isPending}
                onClick={() => toggle.mutate(vehicle.status !== 'ACTIVE')}
              >
                {vehicle.status === 'ACTIVE' ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {vehicle.status === 'ACTIVE' ? 'Hide from search' : 'Show in search'}
              </Button>
            )}
          </>
        }
      />

      {submitted && vehicle.status === 'UNDER_REVIEW' ? (
        <Submitted vehicle={vehicle} />
      ) : (
        <StatusNote vehicle={vehicle} />
      )}

      {/* grid-cols-1 here and below: truncated step summaries would otherwise widen a phone’s page. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="listing-sections" className="grid grid-cols-1 content-start gap-3">
          <h2 id="listing-sections" className="text-base font-semibold text-ink">
            Your listing
          </h2>
          <ol className="grid grid-cols-1 gap-3">
            {ONBOARDING_STEPS.map(({ step, title }) => {
              const missing = groups.get(step) ?? [];
              return (
                <Card asChild key={step} className="p-4 sm:p-5">
                  <li className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        missing.length > 0
                          ? 'border-2 border-warning text-ink'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{title}</p>
                      <p className="truncate text-sm text-muted">{stepSummary(vehicle, step, policies)}</p>
                      {missing.length > 0 && (
                        <p className="mt-1 text-sm text-ink">
                          <span className="font-medium">Still needed:</span> {missing.join('; ')}
                        </p>
                      )}
                    </div>
                    {!locked && (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          to={stepPath(vehicle.id, step)}
                          state={{ direction: 1 } satisfies StepNavigationState}
                          aria-label={`Edit ${title.toLowerCase()}`}
                        >
                          <PencilLine aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                    )}
                  </li>
                </Card>
              );
            })}
          </ol>
          {isSubmittable(vehicle.status) && (
            <div>
              <Button asChild>
                <Link
                  to={stepPath(vehicle.id, 'review')}
                  state={{ direction: 1 } satisfies StepNavigationState}
                >
                  Review and submit
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </div>
          )}
        </section>

        <aside className="hidden lg:block" aria-hidden="true">
          <div className="sticky top-24 aspect-4/3 overflow-hidden rounded-card border border-line bg-canvas shadow-card">
            {cover ? (
              <img src={cover} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <AngleIllustration angle="FRONT" className="w-1/2 text-primary/60" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
