import { ArrowRight, BadgeCheck, CalendarRange, KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { staggerIndex } from '@/components/motion/presets';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useHostProfile } from '@/features/host/host-api';
import { HostPageHeader } from '@/features/host/host-nav';
import { HostMoreLinks, HostShell } from '@/features/host/host-shell';
import { HostTodoList } from '@/features/host/todo-list';
import { useCheckoutReadiness } from '@/features/booking/booking-api';
import { IdentityCheck } from '@/features/booking/identity-check';
import { CurrentTrips } from '@/features/handover/current-trips';
import { VehiclesSummary } from '@/features/host/my-vehicles';

type HostStatus = NonNullable<SessionUser['hostStatus']>;

const PROPOSITION = [
  {
    icon: CalendarRange,
    title: 'Your car, your rules',
    text: 'Set the price, the dates it’s free and whether guests can book instantly.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified guests',
    text: 'Guests verify their mobile and driver licence before they drive away.',
  },
  {
    icon: KeyRound,
    title: 'List at your own pace',
    text: 'Six short steps. Save as you go and pick up where you left off.',
  },
];

function HomeSkeleton() {
  return (
    <div className="grid gap-8" aria-hidden="true">
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-44 rounded-card" />
    </div>
  );
}

/** For someone who hasn't applied: why host, and where to start. */
function Proposition() {
  return (
    <Card className="relative isolate animate-fade-up overflow-hidden p-6 sm:p-10">
      <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-32 w-full text-primary/10" />
      <p className="eyebrow text-primary">Hosting</p>
      <h1 className="headline mt-3 max-w-xl text-title-2 font-medium text-balance">
        Earn from your car when you’re not using it
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Share it with travellers and locals across Aotearoa. Apply in a couple of minutes, then add your car
        while we review your application.
      </p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {PROPOSITION.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="stagger-in flex items-start gap-3 sm:flex-col"
            style={staggerIndex(index)}
          >
            <IconBadge>
              <Icon />
            </IconBadge>
            <div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/host/apply">
            Start hosting
            <ArrowRight aria-hidden="true" className="nudge-right" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/become-a-host" viewTransition>
            How hosting works
          </Link>
        </Button>
      </div>
    </Card>
  );
}

/**
 * An application waiting for us, or first for the Host's identity check while approval needs one (the
 * identityForHosts setting, spec §22).
 */
function ApplicationUnderReview({ identityRequired }: { identityRequired: boolean }) {
  const readiness = useCheckoutReadiness(undefined, identityRequired);
  const identity = identityRequired ? readiness.data?.identityStatus : undefined;
  if (identity === 'NONE') {
    return (
      <Alert title="One step left: verify your identity">
        We review your application once your identity is verified, and email you when it’s approved. You can
        add your car now, so it’s ready to go.
      </Alert>
    );
  }
  if (identity === 'REJECTED') {
    return (
      <Alert
        variant="danger"
        title="We couldn’t verify your identity"
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/contact">Contact us</Link>
          </Button>
        }
      >
        Hosts pass an identity check before their application is approved. Get in touch and we’ll help sort it
        out.
      </Alert>
    );
  }
  return (
    <Alert title="Your application is under review">
      We’ll email you once it’s approved. You can add your car now, so it’s ready to go.
    </Alert>
  );
}

/** Where the Host application stands, and what it means for their cars. */
function ApplicationStatus({ status }: { status: HostStatus }) {
  const profile = useHostProfile(status === 'REJECTED' || status === 'APPLIED');

  switch (status) {
    case 'APPLIED':
      return <ApplicationUnderReview identityRequired={profile.data?.identityRequired ?? false} />;
    case 'APPROVED':
      return null;
    case 'REJECTED':
      return (
        <Alert
          variant="danger"
          title="Your Host application wasn’t approved"
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/host/apply">Apply again</Link>
            </Button>
          }
        >
          {profile.data?.reviewNotes ? (
            <p>
              <span className="font-medium">Our team’s notes:</span> {profile.data.reviewNotes}
            </p>
          ) : (
            <p>Check your email for the details, or contact us if anything is unclear.</p>
          )}
        </Alert>
      );
    case 'SUSPENDED':
      return (
        <Alert
          variant="danger"
          title="Your hosting is suspended"
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/contact">Contact us</Link>
            </Button>
          }
        >
          Your cars are hidden from guests for now. Get in touch and we’ll help sort it out.
        </Alert>
      );
  }
}

/**
 * Hosts verify their identity as part of the application (plan §9, Days 19–20): an ID photo and a selfie
 * on Stripe's page, before the application is approved while the identityForHosts setting is on. Shown
 * until it's verified or with our team.
 */
function HostIdentity() {
  const readiness = useCheckoutReadiness(undefined, true);
  const status = readiness.data?.identityStatus;
  if (!readiness.data || status === 'APPROVED' || status === 'REJECTED') return null;
  return (
    <Card asChild className="grid gap-3 p-5 sm:p-6">
      <section aria-labelledby="host-identity">
        <h2 id="host-identity" className="font-semibold text-ink">
          Verify your identity
        </h2>
        <IdentityCheck readiness={readiness.data} forHosting />
      </section>
    </Card>
  );
}

function HostHome({ user }: { user: SessionUser }) {
  const status = user.hostStatus;
  if (!status) return <Proposition />;

  return (
    <HostShell>
      <div className="grid gap-8">
        <HostPageHeader
          eyebrow="Today"
          title={`Kia ora ${user.firstName}`}
          description={
            status === 'APPROVED' ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  <BadgeCheck aria-hidden="true" />
                  Approved Host
                </Badge>
                Trips under way, what needs doing, and your cars.
              </span>
            ) : (
              'Where your application stands, and your cars.'
            )
          }
        />
        {/* On a phone, the places the tab bar has no room for. */}
        <HostMoreLinks />
        <ApplicationStatus status={status} />
        {/* Trips under way sit at the top, from check-in to check-out (plan §12.6), even while suspended. */}
        {(status === 'APPROVED' || status === 'SUSPENDED') && <CurrentTrips role="host" />}
        {(status === 'APPLIED' || status === 'APPROVED') && <HostIdentity />}
        {status === 'APPROVED' && <HostTodoList />}
        <VehiclesSummary canAdd={status === 'APPLIED' || status === 'APPROVED'} />
      </div>
    </HostShell>
  );
}

/**
 * The Host's home (spec §9), their Today (plan §12.6): where their application stands, the trips under way at
 * the top, the to-do list, and their cars at a glance, with My Vehicles a tap away. Someone who hasn't applied
 * sees why to host and where to start, without the Host area's navigation.
 */
export function HostHomePage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Hosting" noindex />
      <RequireSignedIn fallback={<HomeSkeleton />}>{(user) => <HostHome user={user} />}</RequireSignedIn>
    </Container>
  );
}
