import { MessageSquareText, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { SupportTicket } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ConnectionArcs } from '@/components/brand/patterns/connection-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { Textarea } from '@/features/content/textarea';
import { useMyTicket, useReplyToTicket } from '@/features/support/support-api';
import { TICKET_CATEGORY, TICKET_STATUS } from '@/features/support/ticket-format';
import { cn } from '@/lib/cn';

function Conversation({ ticket }: { ticket: SupportTicket }) {
  return (
    <ol aria-label="Messages" className="grid gap-4">
      {ticket.messages.map((message) => {
        const mine = message.from === 'YOU';
        return (
          <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'grid max-w-[85%] gap-1.5 rounded-card px-4 py-3 sm:max-w-[75%]',
                mine ? 'bg-primary text-white' : 'border border-line bg-surface text-ink',
              )}
            >
              <p className={cn('text-xs font-semibold', mine ? 'text-accent' : 'text-primary')}>
                {mine ? 'You' : 'Rento Vroom support'}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.body}</p>
              <p className={cn('text-xs', mine ? 'text-accent' : 'text-muted')}>
                {formatNzDateTime(message.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ReplyForm({ ticket }: { ticket: SupportTicket }) {
  const reply = useReplyToTicket(ticket.ref);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>();

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length < 2) {
      setError('Write a message');
      return;
    }
    setError(undefined);
    reply.mutate(body.trim(), {
      onSuccess: () => {
        setBody('');
        toast('Message sent', { description: 'Our support team will reply by email and here.' });
      },
      onError: (failure) => {
        if (failure instanceof ApiError && failure.fields?.body) setError(failure.fields.body);
      },
    });
  };

  return (
    <Card asChild className="grid gap-4 p-5 sm:p-6">
      <form onSubmit={send} noValidate>
        {ticket.status === 'RESOLVED' && (
          <p className="text-sm text-muted">This request is resolved. Write here to open it again.</p>
        )}
        <Field label="Your reply" error={error}>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={5000}
            className="min-h-28"
          />
        </Field>
        {reply.isError && !(reply.error instanceof ApiError && reply.error.fields?.body) && (
          <Alert variant="danger" role="alert">
            {reply.error.message}
          </Alert>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={reply.isPending}>
            <Send aria-hidden="true" />
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Ticket({ ticketRef }: { ticketRef: string }) {
  const ticket = useMyTicket(ticketRef);

  if (ticket.isError) {
    const missing = ticket.error instanceof ApiError && ticket.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <MessageSquareText />
          </IconBadge>
        }
        title={missing ? 'We couldn’t find that request' : 'We couldn’t load this request'}
        description={missing ? 'Find it under Help and support.' : ticket.error.message}
        actions={
          missing ? (
            <Button asChild>
              <Link to="/account/support">Help and support</Link>
            </Button>
          ) : (
            <Button onClick={() => void ticket.refetch()}>Try again</Button>
          )
        }
      />
    );
  }
  if (!ticket.data) {
    return (
      <div aria-busy="true" className="grid gap-5">
        <span className="sr-only">Loading the request</span>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
    );
  }
  const data = ticket.data;
  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow text-primary">
          {data.ref} · {TICKET_CATEGORY[data.category]}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="headline text-title-3 font-medium text-balance">{data.subject}</h1>
          <StatusBadge status={TICKET_STATUS[data.status]} />
        </div>
        {data.bookingRef && (
          <p className="mt-2 text-muted">
            About trip{' '}
            <Link to={`/trips/${data.bookingRef}`} className="link-underline font-medium text-primary">
              {data.bookingRef}
            </Link>
          </p>
        )}
      </div>
      <Conversation ticket={data} />
      <ReplyForm ticket={data} />
    </div>
  );
}

/** One of the user's support requests: the conversation with support, and a reply (spec §8). */
export function TicketPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={ConnectionArcs} />
      <PageMeta title={`Support request ${ref}`} noindex />
      <BackLink to="/account/support">Help and support</BackLink>
      <div className="mt-6">
        <RequireSignedIn fallback={<Skeleton aria-hidden="true" className="h-64 rounded-card" />}>
          {() => <Ticket key={ref} ticketRef={ref} />}
        </RequireSignedIn>
      </div>
    </Container>
  );
}
