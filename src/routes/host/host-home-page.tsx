import { ArrowRight, BadgeCheck, CalendarRange, KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
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
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';
import { MyVehicles } from '@/features/host/my-vehicles';

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

/** Where the Host application stands, and what it means for their cars. */
function ApplicationStatus({ status }: { status: HostStatus }) {
  const profile = useHostProfile(status === 'REJECTED');

  switch (status) {
    case 'APPLIED':
      return (
        <Alert title="Your application is under review">
          We’ll email you once it’s approved. You can add your car now, so it’s ready to go.
        </Alert>
      );
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

function HostHome({ user }: { user: SessionUser }) {
  const status = user.hostStatus;
  if (!status) return <Proposition />;

  return (
    <div className="grid gap-8">
      <HostSubNav />
      <HostPageHeader
        eyebrow="Hosting"
        title={`Kia ora ${user.firstName}`}
        description={
          status === 'APPROVED' ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                <BadgeCheck aria-hidden="true" />
                Approved Host
              </Badge>
              Your cars, their listings and calendars.
            </span>
          ) : (
            'Your cars, their listings and calendars.'
          )
        }
      />
      <ApplicationStatus status={status} />
      <MyVehicles canAdd={status === 'APPLIED' || status === 'APPROVED'} />
    </div>
  );
}

/**
 * The Host's home for Phase 2 (plan §9, Days 8–11): where their application stands, and My Vehicles
 * with each car's status and what's left. Someone who hasn't applied sees why to host and where to start.
 */
export function HostHomePage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageMeta title="Hosting" noindex />
      <RequireSignedIn fallback={<HomeSkeleton />}>{(user) => <HostHome user={user} />}</RequireSignedIn>
    </Container>
  );
}
