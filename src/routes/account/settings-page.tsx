import { PageBackdrop } from '@/components/brand/page-backdrop';
import { DotGrid } from '@/components/brand/patterns/dot-grid';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import { EmailSection } from '@/features/account/email-section';
import { PasswordSection } from '@/features/account/password-section';
import { PhoneSection } from '@/features/account/phone-section';
import { PrivacySection } from '@/features/account/privacy-section';
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
 * Account settings (plan §6.1): the email address, mobile number and password, and privacy requests,
 * including closing the account (plan §8.2). Part of the Guest dashboard.
 */
export function AccountSettingsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={DotGrid} />
      <PageMeta title="Account settings" noindex />
      <AccountShell>
        <RequireSignedIn fallback={<SettingsSkeleton />}>
          {(user) => (
            <div className="grid max-w-2xl gap-6">
              <AccountPageHeader
                title="Account settings"
                description={`Kia ora ${user.firstName}. How you log in, how we reach you, and your privacy.`}
              />
              <EmailSection user={user} />
              <PhoneSection user={user} />
              <PasswordSection />
              <PrivacySection />
            </div>
          )}
        </RequireSignedIn>
      </AccountShell>
    </Container>
  );
}
