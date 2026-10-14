import {
  Bell,
  CreditCard,
  Heart,
  LifeBuoy,
  Luggage,
  Mail,
  Settings,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { DotGrid } from '@/components/brand/patterns/dot-grid';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import { SettingsSection } from '@/features/account/settings-section';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useCheckoutReadiness } from '@/features/booking/booking-api';
import { VerificationSection } from '@/features/booking/verification-section';

const SECTIONS: { to: string; title: string; description: string; icon: LucideIcon }[] = [
  { to: '/trips', title: 'Trips', description: 'Upcoming, current and past trips.', icon: Luggage },
  { to: '/saved', title: 'Saved cars', description: 'Your shortlist, priced for your dates.', icon: Heart },
  {
    to: '/account/payments',
    title: 'Payments',
    description: 'Saved cards, payments, receipts and refunds.',
    icon: CreditCard,
  },
  {
    to: '/account/reviews',
    title: 'Reviews',
    description: 'Reviews to write, and what hosts and guests said.',
    icon: Star,
  },
  { to: '/notifications', title: 'Notifications', description: 'Everything we’ve told you.', icon: Bell },
  {
    to: '/account/support',
    title: 'Help and support',
    description: 'Guides, and your requests to our team.',
    icon: LifeBuoy,
  },
  {
    to: '/account/settings',
    title: 'Settings',
    description: 'Your name, email, mobile, password and privacy.',
    icon: Settings,
  },
];

function EmailStatus({ user }: { user: SessionUser }) {
  return (
    <p className="flex items-start gap-2.5 text-sm">
      <Mail aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
      <span>
        <span className="font-semibold text-ink">{user.email}</span>{' '}
        {user.emailVerified ? (
          'is confirmed.'
        ) : (
          <>
            isn’t confirmed yet. It needs to be before your first trip starts.{' '}
            <Link to="/account/settings" className="link-underline font-medium text-primary">
              Confirm it in Settings
            </Link>
          </>
        )}
      </span>
    </p>
  );
}

/** The identity check is part of VerificationSection: always offered here until it has passed. */
function BookingDetails({ user }: { user: SessionUser }) {
  const readiness = useCheckoutReadiness(undefined, true);
  return (
    <SettingsSection
      title="Your details for booking"
      description="Hosts can see that you’re verified, never your licence or ID. Sort these out now and checkout is quicker."
    >
      <div className="grid gap-8">
        <EmailStatus user={user} />
        <VerificationSection user={user} readiness={readiness} context="account" />
      </div>
    </SettingsSection>
  );
}

function Overview({ user }: { user: SessionUser }) {
  return (
    <div className="grid max-w-3xl gap-6">
      <AccountPageHeader
        title="Account"
        description={`Kia ora ${user.firstName}. Your trips, payments and details, all in one place.`}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ to, title, description, icon: Icon }) => (
          <li key={to}>
            <Card asChild className="lift-card flex h-full items-start gap-4 p-5 active:scale-98">
              <Link to={to} viewTransition>
                <IconBadge size="sm">
                  <Icon />
                </IconBadge>
                <span className="grid gap-1">
                  <span className="font-semibold text-ink">{title}</span>
                  <span className="text-sm text-muted">{description}</span>
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
      <BookingDetails user={user} />
    </div>
  );
}

/**
 * The Guest's account (spec §8): where each part of the dashboard is, and the details a booking needs: a
 * confirmed email, a verified mobile, licence details and the identity check. On phones, it's the tab bar's
 * Account tab.
 */
export function AccountPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={DotGrid} />
      <PageMeta title="Account" noindex />
      <RequireSignedIn
        fallback={
          <AccountShell>
            <Skeleton aria-hidden="true" className="h-96 max-w-3xl rounded-card" />
          </AccountShell>
        }
      >
        {(user) => (
          <AccountShell>
            <Overview user={user} />
          </AccountShell>
        )}
      </RequireSignedIn>
    </Container>
  );
}
