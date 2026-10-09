import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { AttachmentInput, SupportTicket } from '@/api/types';

/*
 * Help and support (spec §8): the help centre's articles, and the user's own support requests with their
 * replies. Articles change rarely, so they stay fresh for a while.
 */

export type HelpAudience = 'GUEST' | 'HOST';

export const ticketsQueryKey = ['support', 'tickets'] as const;
const ticketQueryKey = (ref: string) => [...ticketsQueryKey, ref] as const;

/** Published help articles in order; with an audience, the ones for everyone too. */
export function useHelpArticles(audience?: HelpAudience) {
  return useQuery({
    queryKey: ['help', 'articles', audience ?? 'ALL'],
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.GET('/help/articles', { params: { query: audience ? { audience } : {} }, signal }),
        )
      ).articles,
    staleTime: 10 * 60_000,
  });
}

export function useHelpArticle(slug: string) {
  return useQuery({
    queryKey: ['help', 'article', slug],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/help/articles/{slug}', { params: { path: { slug } }, signal }))).article,
    staleTime: 10 * 60_000,
  });
}

/** The signed-in user's support requests, most recently active first. */
export function useMyTickets() {
  return useQuery({
    queryKey: ticketsQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/support/tickets', { signal }))).tickets,
    staleTime: 30_000,
  });
}

export function useMyTicket(ref: string) {
  return useQuery({
    queryKey: ticketQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/support/tickets/{ref}', { params: { path: { ref } }, signal }))).ticket,
    enabled: ref !== '',
    // File links work for 10 minutes; a refresh brings fresh ones and any reply from support.
    refetchInterval: 5 * 60_000,
  });
}

/** Adds the user's reply, with any files they uploaded for it; the ticket goes back to the support team. */
export function useReplyToTicket(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reply: { body: string; attachments: AttachmentInput[] }): Promise<SupportTicket> =>
      (
        await unwrap(
          client.POST('/support/tickets/{ref}/messages', { params: { path: { ref } }, body: reply }),
        )
      ).ticket,
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketQueryKey(ref), ticket);
      void queryClient.invalidateQueries({ queryKey: ticketsQueryKey, exact: true });
    },
  });
}
