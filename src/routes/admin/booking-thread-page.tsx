import { MessagesSquare, ShieldAlert } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isThreadContext, useStaffThread } from '@/features/admin/bookings/bookings-api';
import { BOOKING_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { LoadError } from '@/features/admin/ops/query-feedback';
import { formatTripSpan } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { MessageList } from '@/features/messages/message-list';

/** "incident IN-4F7K2P", with a link to it where the staff portal has one. */
function ContextName({ context }: { context: string }) {
  const [kind = '', key = ''] = context.split(':');
  const upper = key.toUpperCase();
  if (kind.toUpperCase() === 'INCIDENT') {
    return (
      <>
        incident{' '}
        <Link
          to={`/admin/incidents/${upper}`}
          className="rounded-inner font-medium text-primary hover:underline"
        >
          {upper}
        </Link>
      </>
    );
  }
  if (kind.toUpperCase() === 'TICKET') {
    return (
      <>
        support ticket{' '}
        <Link
          to={`/admin/support/${upper}`}
          className="rounded-inner font-medium text-primary hover:underline"
        >
          {upper}
        </Link>
      </>
    );
  }
  return <>a report</>;
}

function ThreadSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading the messages</span>
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

function Thread({ bookingRef, context }: { bookingRef: string; context: string }) {
  const thread = useStaffThread(bookingRef, context);

  if (thread.isPending) return <ThreadSkeleton />;

  if (thread.isError) {
    const refused = thread.error instanceof ApiError && thread.error.status === 403;
    const missing = thread.error instanceof ApiError && thread.error.status === 404;
    if (refused || missing) {
      return (
        <EmptyState
          titleAs="h2"
          className="mx-auto py-10"
          visual={
            <IconBadge size="xl" tone="muted">
              <MessagesSquare />
            </IconBadge>
          }
          title={missing ? 'We couldn’t find that booking' : 'These messages can’t be opened from here'}
          description={thread.error.message}
          actions={
            <Button asChild>
              <Link to={`/admin/bookings/${bookingRef}`}>Open the booking</Link>
            </Button>
          }
        />
      );
    }
    return (
      <LoadError
        title="We couldn’t load the messages"
        error={thread.error}
        onRetry={() => thread.refetch()}
        retrying={thread.isFetching}
      />
    );
  }

  const { thread: detail, guest, host, messages } = thread.data;
  const guestName = `${guest.firstName} (Guest)`;
  const hostName = `${host.firstName} (Host)`;

  return (
    <div className="grid gap-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm sm:p-5">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{detail.vehicle.title}</p>
          <p className="text-muted">
            {formatTripSpan(detail.start, detail.end)} · {guestName} and {hostName}
          </p>
        </div>
        <StatusBadge status={BOOKING_STATUS[detail.bookingStatus]} />
      </Card>

      <Card className="grid gap-4 p-4 sm:p-6">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-muted">No messages yet.</p>
        ) : (
          <MessageList
            messages={messages}
            otherName={`${guest.firstName} and ${host.firstName}`}
            // For staff, THEM is the Guest and ME the Host (the API's `sender` says so too).
            names={{ me: hostName, them: guestName }}
          />
        )}
      </Card>

      {detail.readOnlyReason && (
        <p className="flex items-start gap-1.5 text-sm text-muted">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {detail.readOnlyReason}
        </p>
      )}
    </div>
  );
}

/**
 * A booking's messages, read-only, for staff working a report, incident or support ticket about it (plan
 * §6.2). The page has to be opened from one of them (?context=INCIDENT:IN-4F7K2P), and the API writes every
 * opening to the audit log.
 */
export function AdminBookingThreadPage() {
  const { ref = '' } = useParams();
  const [searchParams] = useSearchParams();
  const context = searchParams.get('context');
  const valid = isThreadContext(context);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={`/admin/bookings/${ref}`}>Booking {ref}</BackLink>
      <div className="mt-5">
        <AdminPageHeader
          eyebrow="Marketplace"
          title={`Messages for ${ref}`}
          description="Between the Guest and Host, read-only. Reply through the incident or ticket."
        />
      </div>

      <div className="mt-8 grid gap-6">
        {valid ? (
          <>
            <Alert title="Opening these messages is recorded">
              Your name, the time and the <ContextName context={context} /> you opened them from are written
              to the audit log.
            </Alert>
            <Thread key={`${ref}-${context}`} bookingRef={ref} context={context} />
          </>
        ) : (
          <EmptyState
            titleAs="h2"
            className="mx-auto py-10"
            visual={
              <IconBadge size="xl" tone="muted">
                <MessagesSquare />
              </IconBadge>
            }
            title="Open these messages from a case"
            description="Staff read a booking’s messages only while working a report, incident or support ticket about it. Use the Messages link on the incident or ticket on the booking’s page."
            actions={
              <Button asChild>
                <Link to={`/admin/bookings/${ref}`}>Open the booking</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
