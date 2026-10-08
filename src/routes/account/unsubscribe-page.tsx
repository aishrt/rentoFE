import { useMutation } from '@tanstack/react-query';
import { MailCheck, MailX } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { client, unwrap } from '@/api/client';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Spinner } from '@/components/ui/spinner';

/**
 * The unsubscribe link in a marketing email (plan §7; NZ Unsolicited Electronic Messages Act 2007): it works
 * without signing in and turns off marketing email and texts at once. Booking messages still arrive.
 */
export function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const unsubscribe = useMutation({
    mutationFn: () => unwrap(client.POST('/notifications/unsubscribe', { body: { token } })),
  });
  const { mutate } = unsubscribe;
  useEffect(() => {
    if (token) mutate();
  }, [token, mutate]);

  return (
    <Container className="max-w-xl py-16">
      <PageMeta title="Unsubscribe" noindex />
      {unsubscribe.isPending ? (
        <div className="flex justify-center py-10" role="status">
          <Spinner />
          <span className="sr-only">Unsubscribing…</span>
        </div>
      ) : (
        <EmptyState
          titleAs="h1"
          visual={<IconBadge size="xl">{unsubscribe.isSuccess ? <MailCheck /> : <MailX />}</IconBadge>}
          title={unsubscribe.isSuccess ? 'You’re unsubscribed' : 'That link didn’t work'}
          description={
            unsubscribe.isSuccess
              ? 'We won’t send you news or offers. Messages about your bookings and account still reach you.'
              : 'Sign in and change what we send you in your account settings.'
          }
          actions={
            <Button asChild variant="secondary">
              <Link to="/account/settings">Notification settings</Link>
            </Button>
          }
        />
      )}
    </Container>
  );
}
