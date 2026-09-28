import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailSection } from '@/features/account/email-section';
import { PasswordSection } from '@/features/account/password-section';
import { PhoneSection } from '@/features/account/phone-section';
import { RequireSignedIn } from '@/features/auth/require-signed-in';

function SettingsSkeleton() {
  return (
    <div className="grid max-w-2xl gap-6" aria-hidden="true">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 rounded-card" />
      <Skeleton className="h-56 rounded-card" />
    </div>
  );
}

/**
 * Account settings (plan §6.1): the email address, mobile number and password. The Guest and Host
 * dashboards (Phase 3) will link here for personal details.
 */
export function AccountSettingsPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageMeta title="Account settings" noindex />
      <RequireSignedIn fallback={<SettingsSkeleton />}>
        {(user) => (
          <div className="grid max-w-2xl gap-6">
            <div>
              <h1 className="headline text-title-3 font-medium">Account settings</h1>
              <p className="mt-2 text-muted">
                Kia ora {user.firstName}. How you log in, and how we reach you.
              </p>
            </div>
            <EmailSection user={user} />
            <PhoneSection user={user} />
            <PasswordSection />
          </div>
        )}
      </RequireSignedIn>
    </Container>
  );
}
