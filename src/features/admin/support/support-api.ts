import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { StaffTicket, StaffTicketReplyRequest, StaffTicketRow } from '@/api/types';

/*
 * The support inbox (plan §12.6): tickets from the Contact form, a booking's Contact support link and
 * privacy requests. Staff reply (the sender is emailed), add internal notes for the team, take a ticket
 * and change its status. The API writes each change to the audit log.
 */

export type TicketStatus = StaffTicketRow['status'];
export type TicketCategory = StaffTicketRow['category'];

export const TICKET_STATUSES = ['OPEN', 'PENDING', 'RESOLVED'] as const satisfies readonly TicketStatus[];
export const TICKET_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'ACCOUNT',
  'HOSTING',
  'SAFETY',
  'PRIVACY',
  'OTHER',
] as const satisfies readonly TicketCategory[];

/** The inbox's filters. Without a status it shows open and waiting tickets, the longest waiting first. */
export interface InboxFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  /** A ticket ref (ST-XXXXXX), or words from the subject, name or email. */
  q?: string;
  /** Only tickets assigned to the signed-in staff member. */
  mine: boolean;
  page: number;
}

/** Tickets per page, as the API sends them. */
export const INBOX_PAGE_SIZE = 25;

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const supportQueryKey = ['admin', 'support'] as const;
export const inboxQueryKey = (filters?: InboxFilters) =>
  filters ? ([...supportQueryKey, 'tickets', filters] as const) : ([...supportQueryKey, 'tickets'] as const);
export const staffTicketQueryKey = (ref: string) => [...supportQueryKey, 'ticket', ref] as const;

/** One page of the inbox. */
export function useInbox(filters: InboxFilters) {
  return useQuery({
    queryKey: inboxQueryKey(filters),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/admin/support/tickets', {
          params: {
            query: {
              status: filters.status,
              category: filters.category,
              q: filters.q || undefined,
              mine: filters.mine ? 'true' : undefined,
              page: filters.page,
            },
          },
          signal,
        }),
      ),
    // The last page stays on screen while the next one loads, so the table doesn't jump.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // Staff move between the inbox and email; show what came in meanwhile when they come back.
    refetchOnWindowFocus: true,
  });
}

/** A ticket with its whole conversation, internal notes included. */
export function useStaffTicket(ref: string) {
  return useQuery({
    queryKey: staffTicketQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/admin/support/tickets/{ref}', { params: { path: { ref } }, signal })))
        .ticket,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** Keeps the ticket a change returned, and has the inbox's pages load again. */
function storeTicket(queryClient: QueryClient, ref: string, ticket: StaffTicket) {
  queryClient.setQueryData(staffTicketQueryKey(ref), ticket);
  void queryClient.invalidateQueries({ queryKey: inboxQueryKey() });
}

/**
 * A reply, emailed to the sender, or an internal note, which only staff see. A reply without a status
 * leaves the ticket waiting on them; a note without one leaves it as it is.
 */
export function useReplyToTicket(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reply: StaffTicketReplyRequest): Promise<StaffTicket> =>
      (
        await unwrap(
          client.POST('/admin/support/tickets/{ref}/messages', { params: { path: { ref } }, body: reply }),
        )
      ).ticket,
    onSuccess: (ticket) => storeTicket(queryClient, ref, ticket),
  });
}

/** Changes the ticket's status, or assigns it to the signed-in staff member. */
export function useUpdateTicket(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: { status?: TicketStatus; assignToMe?: boolean }): Promise<StaffTicket> =>
      (
        await unwrap(
          client.PATCH('/admin/support/tickets/{ref}', { params: { path: { ref } }, body: change }),
        )
      ).ticket,
    onSuccess: (ticket) => storeTicket(queryClient, ref, ticket),
  });
}
