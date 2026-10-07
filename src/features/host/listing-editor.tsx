import { AnimatePresence, m, type Variants } from 'motion/react';
import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { HostVehicle, PublicPolicies } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Stepper, type StepperStep } from '@/components/ui/stepper';
import { motion } from '@/styles/tokens';
import { AvailabilityStep } from './availability-step';
import { DeliveryStep } from './delivery-step';
import { DetailsStep } from './details-step';
import { DocumentsStep } from './documents-step';
import { HostPageHeader } from './host-nav';
import { PhotosStep } from './photos-step';
import { PricingStep } from './pricing-step';
import { ReviewStep } from './review-step';
import { VehicleStatusBadge } from './status-badges';
import type { StepProps } from './step-props';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { stepPath, vehiclePath, type StepNavigationState, type StepTarget } from './use-step-save';
import { useUnsavedChangesGuard } from './use-unsaved-changes';
import { ONBOARDING_STEPS, STEP_COUNT, isLive, vehicleDisplayTitle } from './vehicle-labels';

const STEPS = [DetailsStep, DocumentsStep, PhotosStep, PricingStep, AvailabilityStep, DeliveryStep];

/** Forward steps slide in from the right, going back from the left; with reduced motion, they only fade. */
const slide: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * motion.travel.lg }),
  center: { opacity: 1, x: 0, transition: { duration: motion.duration.medium, ease: motion.ease.out } },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -motion.travel.md,
    transition: { duration: motion.duration.short, ease: motion.ease.inOut },
  }),
};

/**
 * The 6-step vehicle onboarding (plan §9, Days 8–11; §12.6 "Host onboarding"): the stepper, one step at a
 * time, then Review and submit. The same editor opens a live listing's steps, with a note on which changes
 * apply at once and which go back to our team.
 */
export function ListingEditor({
  vehicle,
  policies,
  step,
}: {
  vehicle: HostVehicle;
  policies: PublicPolicies;
  step: number | 'review';
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const direction = (location.state as StepNavigationState | null)?.direction ?? 1;
  const saveRef = useRef<((target: StepTarget) => void) | null>(null);
  const unsavedRef = useRef(false);
  const registerSave = useCallback((save: (target: StepTarget) => void, unsaved = false) => {
    saveRef.current = save;
    unsavedRef.current = unsaved;
    return () => {
      if (saveRef.current === save) {
        saveRef.current = null;
        unsavedRef.current = false;
      }
    };
  }, []);
  const blocker = useUnsavedChangesGuard(unsavedRef);

  const stepNumber = step === 'review' ? STEP_COUNT + 1 : step;
  // A draft has been through the steps before the furthest one it reached; anything submitted, all of them.
  const reached = vehicle.status === 'DRAFT' ? vehicle.onboardingStep : STEP_COUNT + 1;
  const visited = (number: number) => number < reached || number < stepNumber;
  const missingOn = (number: number) =>
    vehicle.checklist.missing.filter((item) => item.step === number).map((item) => item.message);
  const steps: StepperStep[] = ONBOARDING_STEPS.map(({ step: number, short }) => ({
    label: short,
    state: !visited(number) ? 'upcoming' : missingOn(number).length > 0 ? 'attention' : 'complete',
  }));

  const props: StepProps = {
    vehicle,
    policies,
    registerSave,
    missing: typeof step === 'number' && visited(step) ? missingOn(step) : undefined,
  };
  const Step = typeof step === 'number' ? STEPS[step - 1] : undefined;
  const draft = vehicle.status === 'DRAFT';

  return (
    <div className="grid gap-8">
      <HostPageHeader
        back={
          <BackLink
            to={draft ? '/host' : vehiclePath(vehicle.id)}
            onClick={(event) => {
              // Saves the step first, like every other way out of it.
              if (!saveRef.current) return;
              event.preventDefault();
              saveRef.current(draft ? 'exit' : 'overview');
            }}
          >
            {draft ? 'Hosting' : 'Listing overview'}
          </BackLink>
        }
        title={draft ? 'List your car' : vehicleDisplayTitle(vehicle.title)}
        titleAside={!draft && <VehicleStatusBadge status={vehicle.status} />}
      />

      {isLive(vehicle.status) && (
        <Alert title="Editing a live listing">
          Price, rules and delivery changes apply at once. New photos and documents wait for our team’s
          review, and your listing keeps the approved ones meanwhile. Changing the number plate, VIN, chassis
          number, make, model or year sends it back for review.
        </Alert>
      )}
      {vehicle.status === 'CHANGES_REQUESTED' && (
        <Alert variant="danger" title="Our team asked for a few changes">
          {vehicle.reviewNotes ?? 'Check your email for the details.'} Then submit again from the review.
        </Alert>
      )}
      {vehicle.status === 'UNDER_REVIEW' && (
        <Alert title="Your listing is under review">Changes you save now are part of it.</Alert>
      )}

      <Stepper
        steps={steps}
        current={stepNumber - 1}
        label="Listing progress"
        finishedLabel="Review and submit"
        onSelect={(index) => {
          const target = { step: index + 1 };
          if (saveRef.current) saveRef.current(target);
          else
            navigate(stepPath(vehicle.id, target.step), {
              state: { direction: 1 } satisfies StepNavigationState,
            });
        }}
      />

      {/* Clips the sideways slide, so the page never scrolls sideways; `clip` keeps the footer sticky. */}
      <div className="overflow-x-clip">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            key={String(step)}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {Step ? <Step {...props} /> : <ReviewStep {...props} />}
          </m.div>
        </AnimatePresence>
      </div>

      <UnsavedChangesDialog blocker={blocker} onSave={(to) => saveRef.current?.({ to })} />
    </div>
  );
}
