import { PageMeta } from '@/components/layout/page-meta';
import { NotificationCentre } from '@/features/notifications/notification-centre';

/**
 * The staff member's notifications in the staff portal (plan §7): the team's alerts, such as a booking
 * waiting for a verification check or a payment to look at, beyond the bell's newest three. Each opens
 * its page in the portal.
 */
export function AdminNotificationsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageMeta title="Notifications · Staff portal" noindex />
      <NotificationCentre
        eyebrow="Staff portal"
        description="Alerts for the team and anything about your account, newest first."
        emptyDescription="Alerts for the team, such as checks to make and cases to look at, will show here."
      />
    </div>
  );
}
