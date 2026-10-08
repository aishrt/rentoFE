import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ReactNode, type Ref } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { SessionUser } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { sessionQueryKey } from '@/features/auth/use-session';
import { HostApplicationForm } from '@/features/host/host-application-form';
import { HostPageHeader } from '@/features/host/host-nav';
import { PhoneVerification } from '@/features/host/phone-verification';
import { cn } from '@/lib/cn';

const NEXT_STEPS = [
  {
    title: 'Add your car straight away',
    text: 'Six short steps: details, documents, photos, price, availability and pickup. Save and come back any time.',
  },
  {
    title: 'Our team takes a look',
    text: 'We check your application, then your listing, its documents and photos.',
  },
  {
    title: 'Set up payouts, then go live',
    text: 'Payout setup is coming soon. Your car goes live once it’s approved and payouts are ready.',
  },
];

function ApplySkeleton() {
  return (
    <div className="grid max-w-2xl gap-6" aria-hidden="true">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

function Section({
  number,
  title,
  description,
  highlighted,
  children,
  sectionRef,
}: {
  number: number;
  title: string;
  description: string;
  highlighted?: boolean;
  children: ReactNode;
  sectionRef?: Ref<HTMLElement>;
}) {
  const id = `apply-step-${number}`;
  return (
    <Card asChild className={cn('scroll-mt-24 p-6 sm:p-8', highlighted && 'ring-2 ring-danger/40')}>
      <section ref={sectionRef} aria-labelledby={id} tabIndex={-1} className="outline-none">
        <div className="mb-6 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          >
            {number}
          </span>
          <div>
            <h2 id={id} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>
        {children}
      </section>
    </Card>
  );
}

function HostApplication({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const phoneRef = useRef<HTMLElement>(null);
  const [phoneMissing, setPhoneMissing] = useState(false);
  // Where the account stood on arrival: the session changes once the application is in.
  const [arrivedAs] = useState(user.hostStatus);

  if (arrivedAs && arrivedAs !== 'REJECTED') return <Navigate to="/host" replace />;

  const onPhoneRequired = () => {
    setPhoneMissing(true);
    phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    phoneRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div className="grid animate-fade-up gap-6">
        <HostPageHeader
          back={
            // Opened from Become a host or the Host home, so Back returns to whichever.
            <BackLink to="/host" previous>
              Back
            </BackLink>
          }
          eyebrow="Hosting"
          title={arrivedAs === 'REJECTED' ? 'Apply again to host' : 'Become a Host'}
          description={`Kia ora ${user.firstName}. Two quick steps, then you can add your car.`}
        />
        <Section
          number={1}
          title="Verify your mobile"
          description="Guests and our team reach you on it about bookings. It stays private until a booking is confirmed."
          highlighted={phoneMissing && !user.phoneVerified}
          sectionRef={phoneRef}
        >
          {phoneMissing && !user.phoneVerified && (
            <Alert variant="danger" role="alert" className="mb-5">
              Verify your mobile number first, then submit your application.
            </Alert>
          )}
          <PhoneVerification user={user} />
        </Section>
        <Section
          number={2}
          title="About you as a Host"
          description="Your profile and tax details, and the agreement between you and Rento Vroom."
        >
          <HostApplicationForm
            phoneVerified={user.phoneVerified}
            onPhoneRequired={onPhoneRequired}
            onApplied={(host) => {
              // The session gains the HOST role and its hostStatus: straight away here, so the next page
              // knows, then from the API.
              queryClient.setQueryData<SessionUser | null>(sessionQueryKey, (current) =>
                current
                  ? {
                      ...current,
                      hostStatus: host.status,
                      roles: current.roles.includes('HOST') ? current.roles : [...current.roles, 'HOST'],
                    }
                  : current,
              );
              void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
              toast('Application sent', { description: 'Now let’s add your car.' });
              navigate('/host/vehicles/new', { replace: true });
            }}
          />
        </Section>
      </div>

      <aside aria-labelledby="apply-next" className="lg:pt-33">
        <Card variant="flat" className="p-6 lg:sticky lg:top-24">
          <h2 id="apply-next" className="eyebrow text-primary">
            What happens next
          </h2>
          <ol className="mt-5 grid gap-5">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-primary ring-1 ring-line"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </aside>
    </div>
  );
}

/**
 * The Host application (plan §9, Days 8–11; §12.6 "Host onboarding"): the mobile, verified inline if it
 * isn't yet, a short profile, GST details and the Host Agreement, then straight on to the first car.
 * Anyone who has already applied goes to their Host home instead; a rejected applicant may apply again.
 */
export function HostApplyPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Become a Host" noindex />
      <RequireSignedIn fallback={<ApplySkeleton />}>
        {(user) => <HostApplication user={user} />}
      </RequireSignedIn>
    </Container>
  );
}
