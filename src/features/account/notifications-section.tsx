import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { NotificationPrefs } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/use-session';
import { SettingsSection } from './settings-section';

const prefsKey = ['me', 'notification-prefs'] as const;

const CHOICES: { name: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    name: 'unreadMessageEmail',
    label: 'Email me about unread messages',
    description: 'When a host or guest’s message is still unread after 10 minutes. You’ll still see it here.',
  },
  {
    name: 'unreadMessageSms',
    label: 'Text me about unread messages',
    description: 'When a host or guest’s message is still unread after 10 minutes.',
  },
  {
    name: 'marketingEmail',
    label: 'News and offers by email',
    description: 'New destinations, tips and the occasional offer. Unsubscribe from any email.',
  },
  {
    name: 'marketingSms',
    label: 'News and offers by text',
    description: 'Now and then. Reply STOP, or turn it off here.',
  },
];

/**
 * Notification preferences (plan §7): booking and account messages always arrive; these are the
 * optional ones, each saved as soon as it's switched.
 */
export function NotificationsSection() {
  const queryClient = useQueryClient();
  const user = useSession().data;
  // Texts go only to a verified mobile (plan §7): without one, this switch would do nothing.
  const canText = Boolean(user?.phone && user.phoneVerified);
  const prefs = useQuery({
    queryKey: prefsKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/me/notification-prefs', { signal }))).prefs,
  });
  const save = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) =>
      (await unwrap(client.PATCH('/me/notification-prefs', { body: patch }))).prefs,
    onMutate: (patch) => {
      const before = queryClient.getQueryData<NotificationPrefs>(prefsKey);
      if (before) queryClient.setQueryData(prefsKey, { ...before, ...patch });
      return before;
    },
    onError: (_error, _patch, before) => {
      if (before) queryClient.setQueryData(prefsKey, before);
      toast('That didn’t save', { description: 'Please try again.', tone: 'danger' });
    },
    onSuccess: (saved) => queryClient.setQueryData(prefsKey, saved),
  });

  return (
    <SettingsSection
      title="Notifications"
      description="Messages about your bookings, payments and account always reach you. These are up to you."
    >
      {prefs.isError ? (
        <Alert variant="danger" role="alert">
          {prefs.error.message}
        </Alert>
      ) : !prefs.data ? (
        <div aria-hidden="true" className="grid gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <div className="grid gap-5">
          {CHOICES.map((choice) => {
            const checked = prefs.data[choice.name];
            const needsMobile = choice.name === 'unreadMessageSms' && !canText;
            return (
              <Switch
                key={choice.name}
                label={choice.label}
                description={
                  needsMobile ? (
                    <>
                      Add and verify your mobile first, under{' '}
                      <a href="#section-mobile-number" className="link-underline font-medium text-primary">
                        Mobile number
                      </a>
                      .
                    </>
                  ) : (
                    choice.description
                  )
                }
                checked={checked}
                // One already on can still be turned off.
                disabled={needsMobile && !checked}
                onCheckedChange={(next) => save.mutate({ [choice.name]: next })}
              />
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}
