import { CircleDot, MessagesSquare, UserCheck, UserRound } from 'lucide-react';
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
import { useIncidentAssignees } from '@/features/admin/operations/operations-api';
import { EmailAddress } from '@/features/admin/ops/email-address';
import { formatNzDateTime, formatRelativeTime } from '@/features/booking/booking-format';
import { TICKET_STATUSES, useUpdateTicket } from './support-api';

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS[status].label,
}));

const NOBODY = '';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Who wrote, what it's about, and the controls: the ticket's status, and who handles it (anyone on the
 * support team, the admin or nobody, as for a case), with "Assign to me" for the quick way. Each change
 * applies straight away and is in the audit log; whoever is handed it is told. The API refuses to hand it to
 * someone it's about.
 */
export function TicketDetails({ ticket, ticketRef }: { ticket: StaffTicket; ticketRef: string }) {
  const update = useUpdateTicket(ticketRef);
  const assignees = useIncidentAssignees();
  const assigning = update.isPending && update.variables?.assignToMe === true;
  const current = ticket.assignedToId ?? NOBODY;
  const team = assignees.data ?? [];
  const assigneeOptions = [
    { value: NOBODY, label: 'Nobody yet' },
    ...team.map((person) => ({ value: person.id, label: person.you ? `${person.name} (you)` : person.name })),
    // Shown while the team loads, or when whoever has it has left the team, until it's handed on.
    ...(current && !team.some((person) => person.id === current)
      ? [{ value: current, label: ticket.assignedTo ?? 'A former staff member' }]
      : []),
  ];

  const handTo = (value: string) => {
    if (value === current) return;
    const person = team.find((candidate) => candidate.id === value);
    update.mutate(
      { assignTo: value || null },
      {
        onSuccess: () => {
          if (!person) toast('Nobody has the ticket now');
          else if (person.you) toast('Assigned to you');
          else toast(`Assigned to ${person.name}`, { description: 'We’ve let them know.' });
        },
      },
    );
  };

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
        <div className="grid gap-3">
          <Field
            label="Handled by"
            description={
              assignees.isError
                ? 'We couldn’t load the support team. Refresh the page to try again.'
                : undefined
            }
          >
            <Select
              value={current}
              onChange={handTo}
              options={assigneeOptions}
              icon={<UserRound />}
              listLabel="Support team"
              disabled={update.isPending || assignees.isPending}
            />
          </Field>
          <div>
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
