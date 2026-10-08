import { SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TICKET_CATEGORY, TICKET_STATUS } from '@/features/admin/ops/admin-labels';
import { LoadError } from '@/features/admin/ops/query-feedback';
import { useStaffTicket } from '@/features/admin/support/support-api';
import { TicketDetails } from '@/features/admin/support/ticket-details';
import { TicketReplyForm } from '@/features/admin/support/ticket-reply-form';
import { TicketThread } from '@/features/admin/support/ticket-thread';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';

function TicketSkeleton() {
  return (
    <div aria-busy="true" className="mt-5">
      <span className="sr-only">Loading the ticket</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-9 w-96 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          <Skeleton className="h-24 w-3/4 rounded-card" />
          <Skeleton className="ml-auto h-24 w-3/4 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

/**
 * One support ticket (plan §12.6): the conversation with internal notes, a reply or note, and the
 * ticket's status, owner, sender and booking. Designed for a desktop, still usable on a phone.
 */
export function AdminTicketPage() {
  const { ref = '' } = useParams();
  const ticket = useStaffTicket(ref);
  const back = (
    <BackLink to="/admin/support" previous className="mt-3">
      Support inbox
    </BackLink>
  );

  if (ticket.isPending) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title={`${ref} · Support · Staff portal`} noindex />
        {back}
        <TicketSkeleton />
      </div>
    );
  }

  if (ticket.isError) {
    const missing = ticket.error instanceof ApiError && ticket.error.status === 404;
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title={`${ref} · Support · Staff portal`} noindex />
        {back}
        {missing ? (
          <EmptyState
            className="mx-auto mt-11"
            visual={
              <IconBadge size="xl" tone="muted">
                <SearchX />
              </IconBadge>
            }
            title="We couldn’t find that ticket"
            description={`There’s no support ticket ${ref}. Search the inbox by ref, subject, name or email.`}
            actions={
              <Button asChild>
                <Link to="/admin/support">Open the inbox</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-9">
            <LoadError
              title="We couldn’t load the ticket"
              error={ticket.error}
              onRetry={() => ticket.refetch()}
              retrying={ticket.isFetching}
            />
          </div>
        )}
      </div>
    );
  }

  const data = ticket.data;
  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title={`${data.ref} · Support · Staff portal`} noindex />
      {back}

      <header className="mt-5 animate-fade-up">
        <p className="eyebrow text-primary">
          {data.ref} · {TICKET_CATEGORY[data.category]}
        </p>
        <h1 className="headline mt-2 text-title-3 font-medium text-balance">{data.subject}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <StatusBadge status={TICKET_STATUS[data.status]} />
          <span>From {data.from.name}</span>
          <span>Opened {formatNzDateTime(data.createdAt)}</span>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid min-w-0 gap-8">
          <TicketThread ticket={data} />
          <TicketReplyForm ticket={data} ticketRef={ref} />
        </div>
        <TicketDetails ticket={data} ticketRef={ref} />
      </div>
    </div>
  );
}
