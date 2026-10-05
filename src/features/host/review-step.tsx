import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Info, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import type { HostVehicle } from '@/api/types';
import { CheckDraw } from '@/components/motion/check-draw';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatNzdFromCents } from '@/lib/format';
import { AngleIllustration } from './angle-illustrations';
import { hostKeys, storeVehicle, submitVehicleRequest } from './host-api';
import { coverPhoto, missingByStep } from './listing-summary';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import {
  hostErrorMessage,
  stepPath,
  useStepSave,
  vehiclePath,
  type SaveProblem,
  type StepNavigationState,
  type StepTarget,
} from './use-step-save';
import { STEP_COUNT, stepTitle, vehicleDisplayTitle } from './vehicle-labels';

function ListingCard({ vehicle }: { vehicle: HostVehicle }) {
  const cover = coverPhoto(vehicle);
  const place = [vehicle.suburb, vehicle.city].filter(Boolean).join(', ');
  return (
    <Card className="grid overflow-hidden sm:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="relative aspect-4/3 bg-canvas sm:aspect-auto">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <AngleIllustration angle="FRONT" className="w-1/2 text-primary/60" />
          </div>
        )}
      </div>
      <div className="grid content-start gap-2 p-5 sm:p-6">
        <p className="eyebrow text-primary">How guests will see it</p>
        <p className="headline text-2xl font-medium">{vehicleDisplayTitle(vehicle.title)}</p>
        {place && (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin aria-hidden="true" className="size-4" />
            {place}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {vehicle.pricing && (
            <span className="text-lg font-semibold text-ink">
              {formatNzdFromCents(vehicle.pricing.dailyCents)}
              <span className="text-sm font-normal text-muted"> a day</span>
            </span>
          )}
          {vehicle.rules.instantBook && <Badge variant="accent">Instant Book</Badge>}
          {vehicle.unlimitedKm && <Badge>Unlimited km</Badge>}
          {vehicle.petFriendly && <Badge>Pet friendly</Badge>}
        </div>
      </div>
    </Card>
  );
}

/**
 * Review and submit (plan §9, Days 8–11): what's still missing, grouped by step with a way back to each,
 * the flags our team will look at, then Submit. The API's check is the one that counts; when it finds
 * something missing, its list shows here.
 */
export function ReviewStep({ vehicle, registerSave }: StepProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { save, savingTo, problem } = useStepSave(vehicle, STEP_COUNT + 1);
  const [submitProblem, setSubmitProblem] = useState<SaveProblem | null>(null);
  const submit = useMutation({
    mutationFn: () => submitVehicleRequest(vehicle.id),
    onSuccess: (saved) => {
      // Leave the review first: a car under review can't be submitted, so the review page would redirect.
      navigate(vehiclePath(vehicle.id), { state: { submitted: true } satisfies StepNavigationState });
      storeVehicle(queryClient, saved);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'LISTING_INCOMPLETE') {
        // The checklist here may be out of date: fetch the car again, and list what the API found.
        void queryClient.invalidateQueries({ queryKey: hostKeys.vehicle(vehicle.id), exact: true });
        setSubmitProblem({ title: error.message, items: Object.values(error.fields ?? {}) });
      } else {
        setSubmitProblem({ title: hostErrorMessage(error), items: [] });
      }
    },
  });

  // Nothing to save on this page: the stepper and Back just move.
  const go = (target: StepTarget) => void save({}, target, { changed: false });
  useEffect(() => registerSave(go));

  const groups = missingByStep(vehicle);
  const flags = vehicle.checklist.flags;
  const again = vehicle.status === 'CHANGES_REQUESTED';

  return (
    <StepFrame
      title={again ? 'Review and submit again' : 'Review and submit'}
      description="Check everything's in place, then send your listing to our team."
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitProblem(null);
        submit.mutate();
      }}
      onBack={() => go({ step: STEP_COUNT })}
      onExit={() => go('exit')}
      continueLabel={again ? 'Submit again' : 'Submit for review'}
      savingTo={submit.isPending ? 'review' : savingTo}
      problem={submitProblem ?? problem}
    >
      <ListingCard vehicle={vehicle} />

      {groups.size === 0 ? (
        <div className="flex items-center gap-4 rounded-card border border-success/30 bg-success/8 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-surface">
            <CheckDraw className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Everything's in place</p>
            <p className="text-sm text-muted">Your listing is ready for our team.</p>
          </div>
        </div>
      ) : (
        <section aria-labelledby="review-missing" className="grid gap-3">
          <h3 id="review-missing" className="text-base font-semibold text-ink">
            Still to do before you can submit
          </h3>
          <ul className="grid gap-3">
            {[...groups].map(([step, items]) => (
              <Card asChild key={step} className="p-4 sm:p-5">
                <li className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div>
                    <p className="font-semibold text-ink">
                      <span className="text-muted">Step {step} · </span>
                      {stepTitle(step)}
                    </p>
                    <ul className="mt-1.5 list-disc pl-5 text-sm text-ink/85">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(stepPath(vehicle.id, step), {
                        state: { direction: -1 } satisfies StepNavigationState,
                      })
                    }
                  >
                    Go to {stepTitle(step).toLowerCase()}
                    <ArrowRight aria-hidden="true" className="nudge-right" />
                  </Button>
                </li>
              </Card>
            ))}
          </ul>
        </section>
      )}

      {flags.length > 0 && (
        <div className="flex gap-3 rounded-card border border-primary/15 bg-primary/5 p-5 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-ink">Our team will also look at</p>
            <ul className="mt-1 list-disc pl-5 text-ink/85">
              {flags.map((flag) => (
                <li key={flag.message}>{flag.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted">
              These won't stop you submitting, but fixing them now can speed up approval.
            </p>
          </div>
        </div>
      )}
    </StepFrame>
  );
}
