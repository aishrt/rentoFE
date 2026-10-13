import { useMutation } from '@tanstack/react-query';
import { MailCheck, MailMinus, MailX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { client, unwrap } from '@/api/client';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { SignalArcs } from '@/components/brand/patterns/signal-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';

/**
 * The unsubscribe link in a marketing email (plan §7; NZ Unsolicited Electronic Messages Act 2007), or in an
 * unread-message email: it works without signing in and turns off marketing email and texts, or those emails,
 * once the person confirms. It waits for that click, so a link checker that opens the page can't unsubscribe
 * anyone; an email app's own one-click unsubscribe (RFC 8058) goes straight to the API instead. Booking
 * messages still arrive.
 */
export function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  // What the link turns off is in its token: "<id>.MESSAGE_EMAILS.<signature>", or "<id>.<signature>".
  const messageEmails = token.split('.')[1] === 'MESSAGE_EMAILS';
  const unsubscribe = useMutation({
    mutationFn: () => unwrap(client.POST('/notifications/unsubscribe', { body: { token } })),
  });

  const settingsLink = (
    <Button asChild variant="secondary">
      <Link to="/account/settings">Notification settings</Link>
    </Button>
  );

  let page;
  if (unsubscribe.isSuccess) {
    page = (
      <EmptyState
        titleAs="h1"
        visual={
          <IconBadge size="xl">
            <MailCheck />
          </IconBadge>
        }
        title="You’re unsubscribed"
        description={
          unsubscribe.data.unsubscribedFrom === 'MESSAGE_EMAILS'
            ? 'We won’t email you about unread messages. You’ll still see them in the app, and messages about your bookings and account still reach you.'
            : 'We won’t send you news or offers. Messages about your bookings and account still reach you.'
        }
        actions={settingsLink}
      />
    );
  } else if (!token || unsubscribe.isError) {
    page = (
      <EmptyState
        titleAs="h1"
        visual={
          <IconBadge size="xl">
            <MailX />
          </IconBadge>
        }
        title="That link didn’t work"
        description="Sign in and change what we send you in your account settings."
        actions={settingsLink}
      />
    );
  } else {
    page = (
      <EmptyState
        titleAs="h1"
        visual={
          <IconBadge size="xl">
            <MailMinus />
          </IconBadge>
        }
        title={messageEmails ? 'Stop emails about unread messages?' : 'Stop news and offers?'}
        description={
          messageEmails
            ? 'You’ll still see new messages in the app. Messages about your bookings and account still reach you.'
            : 'We’ll stop sending you news and offers by email and text. Messages about your bookings and account still reach you.'
        }
        actions={
          <>
            <Button loading={unsubscribe.isPending} onClick={() => unsubscribe.mutate()}>
              Confirm unsubscribe
            </Button>
            {settingsLink}
          </>
        }
      />
    );
  }

  return (
    <Container className="max-w-xl py-16">
      <PageBackdrop art={SignalArcs} />
      <PageMeta title="Unsubscribe" noindex />
      {page}
    </Container>
  );
}
