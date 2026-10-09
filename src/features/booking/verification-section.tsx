import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { CheckoutReadiness, SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicies } from '@/features/content/content-api';
import { eligibilityPoints } from '@/features/content/policies';
import { PhoneVerification } from '@/features/host/phone-verification';
import { readinessQueryKey } from './booking-api';
import { LICENCE_CLASS_LABELS, formatCalendarDate } from './booking-format';
import { IdentityCheck } from './identity-check';
import { LicenceForm } from './licence-form';

type Problem = CheckoutReadiness['problems'][number];

/** What to do about each eligibility problem, after the API's own sentence. */
const HINTS: Partial<Record<Problem['code'], string>> = {
  TOO_YOUNG: 'If your date of birth is wrong, correct it below.',
  LICENCE_EXPIRES: 'If you’ve renewed your licence, enter the new card’s details below.',
  ENGLISH_PROOF_REQUIRED: 'Tick that your licence isn’t in English and choose what you’ll bring.',
  CLASS_NOT_ACCEPTED: 'If you hold another licence, enter its details below.',
};

function Done({ children }: { children: ReactNode }) {
  return (
    <p className="flex animate-fade-in items-start gap-2.5 text-ink">
      <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
      <span>{children}</span>
    </p>
  );
}

interface VerificationSectionProps {
  user: SessionUser;
  readiness: UseQueryResult<CheckoutReadiness>;
  /** At checkout the problems are about the trip on screen; on the account page, about booking at all. */
  context?: 'checkout' | 'account';
}

/**
 * Step 5 (spec §7, step 7): the mobile number by texted code, the identity check, then the driver licence and
 * date of birth, with anything that stops this person driving explained in plain words (plan §3: age, licence class, years
 * licensed, a licence valid until the trip ends, English proof). The rules come from the API, so they
 * always match settings. Once nothing is missing, checkout moves on to payment by itself.
 */
export function VerificationSection({ user, readiness, context = 'checkout' }: VerificationSectionProps) {
  const queryClient = useQueryClient();
  const policies = usePolicies();
  const [editing, setEditing] = useState(false);

  // A verified number changes the session; ask again what's still missing.
  useEffect(() => {
    if (user.phoneVerified) void queryClient.invalidateQueries({ queryKey: readinessQueryKey });
  }, [user.phoneVerified, queryClient]);

  if (readiness.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t check your details"
        action={
          <Button variant="secondary" size="sm" onClick={() => void readiness.refetch()}>
            Try again
          </Button>
        }
      >
        {readiness.error.message}
      </Alert>
    );
  }
  if (!readiness.data) {
    return (
      <div aria-busy="true" className="grid gap-3">
        <span className="sr-only">Checking your details</span>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const { problems, licence } = readiness.data;
  const phoneNeeded = problems.some((problem) => problem.code === 'PHONE_REQUIRED');
  // The identity check has its own part of the step, below the mobile number.
  const licenceProblems = problems.filter(
    (problem) =>
      problem.code !== 'PHONE_REQUIRED' &&
      problem.code !== 'IDENTITY_REQUIRED' &&
      problem.code !== 'IDENTITY_PROCESSING',
  );
  const needsForm = licenceProblems.some((problem) => problem.code !== 'IDENTITY_REJECTED') || editing;
  const firstTime = licenceProblems.some((problem) => problem.code === 'LICENCE_REQUIRED');
  // Shown when settings ask for it, or once there's a check to report on.
  const showIdentity =
    problems.some(
      (problem) => problem.code === 'IDENTITY_REQUIRED' || problem.code === 'IDENTITY_PROCESSING',
    ) ||
    readiness.data.identityStatus === 'APPROVED' ||
    readiness.data.identityStatus === 'PENDING';
  const points = policies.data ? eligibilityPoints(policies.data.eligibility) : [];

  return (
    <div className="grid gap-8">
      <section aria-labelledby="checkout-mobile" className="grid gap-3">
        <h3 id="checkout-mobile" className="font-semibold text-ink">
          Your mobile number
        </h3>
        {phoneNeeded ? (
          <>
            <p className="text-sm text-muted">
              Your host uses it to reach you about pick-up, and we text trip reminders. We’ll send a 6-digit
              code.
            </p>
            <PhoneVerification user={user} />
          </>
        ) : (
          <Done>
            <span className="font-semibold">{user.phone ?? readiness.data.phone}</span> is verified.
          </Done>
        )}
      </section>

      {showIdentity && (
        <section aria-labelledby="checkout-identity" className="grid gap-3">
          <h3 id="checkout-identity" className="font-semibold text-ink">
            Your identity
          </h3>
          <IdentityCheck readiness={readiness.data} />
        </section>
      )}

      <section aria-labelledby="checkout-licence" className="grid gap-4">
        <h3 id="checkout-licence" className="font-semibold text-ink">
          Your driver licence
        </h3>
        {licence && !firstTime && (
          <p className="text-sm text-ink/85">
            {LICENCE_CLASS_LABELS[licence.class]}
            {licence.numberEnding && <> ending {licence.numberEnding}</>}, expires{' '}
            {formatCalendarDate(licence.expiry)}.
          </p>
        )}
        {licenceProblems.length > 0 && !firstTime && (
          <Alert
            variant="danger"
            role="alert"
            title={context === 'checkout' ? 'Before you can book this trip' : 'Before you can book'}
          >
            <ul className="grid gap-1.5">
              {licenceProblems.map((problem) => (
                <li key={problem.code}>
                  {problem.message} {HINTS[problem.code]}
                  {(problem.code === 'LICENCE_REJECTED' || problem.code === 'IDENTITY_REJECTED') && (
                    <>
                      {' '}
                      <Link
                        to="/contact?category=ACCOUNT"
                        className="link-underline font-medium text-primary"
                      >
                        Contact support
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {firstTime && points.length > 0 && (
          <div className="rounded-control border border-line bg-canvas/60 p-4 text-sm">
            <p className="font-medium text-ink">To drive a Rento Vroom car you need to:</p>
            <ul className="mt-2 grid list-disc gap-1 pl-5 text-ink/85">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        )}
        {needsForm ? (
          <LicenceForm hasLicence={Boolean(licence)} onSaved={() => setEditing(false)} />
        ) : (
          <div className="grid gap-3">
            {readiness.data.licenceInReview ? (
              // Nothing has confirmed the licence yet, so support checks it by hand (plan §8.2).
              <Alert title="Our team is checking your licence">
                It usually takes a few hours. You can still book: your card is authorised, not charged, and
                the booking is confirmed once your licence is approved.
              </Alert>
            ) : (
              <Done>Your licence details are saved.</Done>
            )}
            <div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-primary">
                Update licence details
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
