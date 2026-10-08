import { Link } from 'react-router';
import type { StaffTicketRow } from '@/api/types';
import { TICKET_CATEGORY, TICKET_STATUS } from '@/features/admin/ops/admin-labels';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { formatNzDateTime, formatRelativeTime } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';

/** The inbox: each ticket links to its conversation. */
export function TicketTable({ tickets, stale }: { tickets: StaffTicketRow[]; stale?: boolean }) {
  return (
    <DataTable
      label="Support tickets"
      className={cn('transition-opacity duration-200', stale && 'opacity-60')}
    >
      <thead>
        <tr>
          <Th>Ticket</Th>
          <Th>From</Th>
          <Th>Category</Th>
          <Th>Booking</Th>
          <Th>Assigned to</Th>
          <Th>Status</Th>
          <Th>Last activity</Th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket) => (
          <Tr key={ticket.ref}>
            <Td>
              <Link
                to={`/admin/support/${ticket.ref}`}
                className="group/ticket block max-w-xs rounded-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="block text-xs font-semibold tracking-wide text-muted">{ticket.ref}</span>
                <span className="mt-0.5 block font-medium whitespace-normal text-ink group-hover/ticket:text-primary group-hover/ticket:underline">
                  {ticket.subject}
                </span>
              </Link>
            </Td>
            <Td>
              <span className="block font-medium text-ink">{ticket.from.name}</span>
              {ticket.from.email && <span className="block text-xs text-muted">{ticket.from.email}</span>}
            </Td>
            <Td className="whitespace-nowrap">{TICKET_CATEGORY[ticket.category]}</Td>
            <Td className="whitespace-nowrap">
              {ticket.bookingRef ? (
                <Link
                  to={`/admin/bookings/${ticket.bookingRef}`}
                  className="link-underline font-medium text-primary"
                >
                  {ticket.bookingRef}
                </Link>
              ) : (
                <span className="text-muted">None</span>
              )}
            </Td>
            <Td className="whitespace-nowrap">
              {ticket.assignedTo ?? <span className="text-muted">Nobody yet</span>}
            </Td>
            <Td>
              <StatusBadge status={TICKET_STATUS[ticket.status]} />
            </Td>
            <Td className="whitespace-nowrap text-muted">
              <time dateTime={ticket.updatedAt} title={formatNzDateTime(ticket.updatedAt)}>
                {formatRelativeTime(ticket.updatedAt)}
              </time>
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
