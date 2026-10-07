import {
  BookOpen,
  ChevronRight,
  LifeBuoy,
  MessageSquareText,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import type { SupportTicketSummary } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ConnectionArcs } from '@/components/brand/patterns/connection-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import { SettingsSection } from '@/features/account/settings-section';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatRelativeTime } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { useMyTickets } from '@/features/support/support-api';
import { TICKET_CATEGORY, TICKET_STATUS } from '@/features/support/ticket-format';

const SHORTCUTS: { to: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    to: '/help',
    title: 'Help centre',
    description: 'Guides to booking, payments, trips and hosting.',
    icon: BookOpen,
  },
  {
    to: '/safety',
    title: 'Safety and emergencies',
    description: 'What to do after an accident, theft or breakdown. In an emergency, call 111.',
    icon: ShieldAlert,
  },
  {
    to: '/contact',
    title: 'Contact support',
    description: 'Send us a message. To ask about a trip, use Contact support on the trip itself.',
    icon: LifeBuoy,
  },
];

function TicketRow({ ticket }: { ticket: SupportTicketSummary }) {
  return (
    <li>
      <Link
        to={`/account/support/${ticket.ref}`}
        viewTransition
        className="group flex items-center gap-4 rounded-control py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink group-hover:text-primary">{ticket.subject}</p>
          <p className="text-sm text-muted">
            {ticket.ref} · {TICKET_CATEGORY[ticket.category]}
            {ticket.bookingRef ? ` · Trip ${ticket.bookingRef}` : ''} · {formatRelativeTime(ticket.updatedAt)}
          </p>
        </div>
        <StatusBadge status={TICKET_STATUS[ticket.status]} className="max-sm:hidden" />
        <ChevronRight aria-hidden="true" className="nudge-right size-4 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function Tickets() {
  const tickets = useMyTickets();
  return (
    <SettingsSection
      title="Your support requests"
      description="Messages you’ve sent us while logged in, with our replies. We also answer by email."
    >
      {tickets.isError ? (
        <Alert
          variant="danger"
          role="alert"
          title="We couldn’t load your requests"
          action={
            <Button variant="secondary" size="sm" onClick={() => void tickets.refetch()}>
              Try again
            </Button>
          }
        >
          {tickets.error.message}
        </Alert>
      ) : !tickets.data ? (
        <div aria-hidden="true" className="grid gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : tickets.data.length === 0 ? (
        <div className="flex items-start gap-3 text-sm text-muted">
          <MessageSquareText aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
          <p>No requests yet. When you contact us while logged in, the conversation shows here.</p>
        </div>
      ) : (
        <ul className="-my-4 divide-y divide-line">
          {tickets.data.map((ticket) => (
            <TicketRow key={ticket.ref} ticket={ticket} />
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

function Support() {
  return (
    <div className="grid max-w-3xl gap-6">
      <AccountPageHeader
        title="Help and support"
        description="Guides for the most common questions, and your conversations with our support team."
      />
      <ul className="grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map(({ to, title, description, icon: Icon }) => (
          <li key={to}>
            <Card asChild className="lift-card grid h-full content-start gap-3 p-5 active:scale-98">
              <Link to={to} viewTransition>
                <IconBadge size="sm">
                  <Icon />
                </IconBadge>
                <span className="font-semibold text-ink">{title}</span>
                <span className="text-sm text-muted">{description}</span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
      <Tickets />
    </div>
  );
}

/** Help and support (spec §8): the help centre, safety, contacting support, and the user's own requests. */
export function SupportPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ConnectionArcs} />
      <PageMeta title="Help and support" noindex />
      <RequireSignedIn
        fallback={
          <AccountShell>
            <Skeleton aria-hidden="true" className="h-96 max-w-3xl rounded-card" />
          </AccountShell>
        }
      >
        {() => (
          <AccountShell>
            <Support />
          </AccountShell>
        )}
      </RequireSignedIn>
    </Container>
  );
}
