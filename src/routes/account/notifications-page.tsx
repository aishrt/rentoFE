import { PageBackdrop } from '@/components/brand/page-backdrop';
import { SignalArcs } from '@/components/brand/patterns/signal-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { AccountShell } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { NotificationCentre, NotificationsSkeleton } from '@/features/notifications/notification-centre';

/**
 * Every notification (plan §7), beyond the bell's newest three: All or Unread, a page at a time, to open,
 * mark read or unread and delete, one by one or a selection at once.
 */
export function NotificationsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={SignalArcs} />
      <PageMeta title="Notifications" noindex />
      <AccountShell>
        <div className="max-w-4xl">
          <RequireSignedIn fallback={<NotificationsSkeleton />}>
            {() => (
              <NotificationCentre
                eyebrow="Your account"
                description="Booking news, listing updates and messages about your account, newest first."
                emptyDescription="Booking news, listing updates and messages about your account will show here."
              />
            )}
          </RequireSignedIn>
        </div>
      </AccountShell>
    </Container>
  );
}
