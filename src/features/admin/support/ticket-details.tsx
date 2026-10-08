import { CircleDot, MessagesSquare, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { StaffTicket } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { threadPath } from '@/features/admin/bookings/bookings-api';
import { TICKET_CATEGORY, TICKET_STATUS } from '@/features/admin/ops/admin-labels';
import { EmailAddress } from '@/features/admin/ops/email-address';
import { formatNzDateTime, formatRelativeTime } from '@/features/booking/booking-format';
import { TICKET_STATUSES, useUpdateTicket } from './support-api';

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS[status].label,
}));

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Who wrote, what it's about, and the controls: the ticket's status and "Assign to me". Each change
 * applies straight away and is in the audit log.
 */
export function TicketDetails({ ticket, ticketRef }: { ticket: StaffTicket; ticketRef: string }) {
  const update = useUpdateTicket(ticketRef);
  const assigning = update.isPending && update.variables?.assignToMe === true;

  const changeStatus = (value: string) => {
    const status = TICKET_STATUSES.find((option) => option === value);
    if (!status || status === ticket.status) return;
    update.mutate(
      { status },
      { onSuccess: () => toast(`Ticket marked ${TICKET_STATUS[status].label.toLowerCase()}`) },
    );
  };
  const assignToMe = () =>
    update.mutate(
      { assignToMe: true },
      {
        onSuccess: () =>
          toast('Assigned to you', { description: 'It’s in the inbox under “Assigned to me”.' }),
      },
    );

  return (
    <aside aria-label="Ticket details" className="grid gap-6 lg:sticky lg:top-24">
      <Card className="grid gap-5 p-5">
        <Field label="Status">
          <Select
            value={ticket.status}
            onChange={changeStatus}
            options={STATUS_OPTIONS}
            icon={<CircleDot />}
            listLabel="Statuses"
            disabled={update.isPending}
          />
        </Field>
        <div>
          <p className="text-sm font-medium text-ink">Assigned to</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <span className={ticket.assignedTo ? 'text-sm text-ink' : 'text-sm text-muted'}>
              {ticket.assignedTo ?? 'Nobody yet'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={assignToMe}
              loading={assigning}
              disabled={update.isPending}
            >
              <UserCheck aria-hidden="true" />
              Assign to me
            </Button>
          </div>
        </div>
        {update.isError && (
          <Alert variant="danger" role="alert">
            {update.error.message}
          </Alert>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-ink">From</h2>
        <div className="mt-3 grid gap-0.5 text-sm">
          {ticket.from.userId ? (
            <Link
              to={`/admin/users/${ticket.from.userId}`}
              className="link-underline w-fit font-medium text-primary"
            >
              {ticket.from.name}
            </Link>
          ) : (
            <span className="font-medium text-ink">{ticket.from.name}</span>
          )}
          {ticket.from.email && (
            <a href={`mailto:${ticket.from.email}`} className="link-underline w-fit wrap-anywhere text-muted">
              <EmailAddress email={ticket.from.email} />
            </a>
          )}
          {!ticket.from.userId && (
            <p className="mt-1 text-xs text-muted">
              No Rento Vroom account: they wrote from the Contact form.
            </p>
          )}
        </div>

        <dl className="mt-5 grid gap-4 border-t border-line pt-5">
          <Detail label="Category">{TICKET_CATEGORY[ticket.category]}</Detail>
          <Detail label="Booking">
            {ticket.bookingRef ? (
              <span className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/admin/bookings/${ticket.bookingRef}`}
                  className="link-underline font-medium text-primary"
                >
                  {ticket.bookingRef}
                </Link>
                <Button asChild variant="secondary" size="sm">
                  <Link to={threadPath(ticket.bookingRef, 'TICKET', ticket.ref)}>
                    <MessagesSquare aria-hidden="true" />
                    Messages
                  </Link>
                </Button>
              </span>
            ) : (
              <span className="text-muted">Not about a booking</span>
            )}
          </Detail>
          <Detail label="Opened">{formatNzDateTime(ticket.createdAt)}</Detail>
          <Detail label="Last activity">
            <time dateTime={ticket.updatedAt} title={formatNzDateTime(ticket.updatedAt)}>
              {formatRelativeTime(ticket.updatedAt)}
            </time>
          </Detail>
        </dl>
      </Card>
    </aside>
  );
}
