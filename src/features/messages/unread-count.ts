import { useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import { useSession } from '@/features/auth/use-session';
import { unreadMessagesQueryKey } from './message-keys';

/*
 * The unread count beside every Messages and Inbox link: the dashboards' sidebars and tab bars, and the
 * header's menus. Kept apart from the rest of messaging (messages-api.ts), so those load only this.
 */

/** A minute's refresh catches anything missed while the live connection (message-keys.ts) was down. */
const FALLBACK_REFRESH_MS = 60_000;

/** How many messages wait. */
export function useUnreadMessages(enabled = true) {
  return useQuery({
    queryKey: unreadMessagesQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/threads/unread', { signal }))).count,
    enabled,
    refetchInterval: FALLBACK_REFRESH_MS,
    staleTime: 15_000,
  });
}

/** How many messages wait, once someone is signed in; nothing for visitors. */
export function useUnreadCount(): number {
  const signedIn = Boolean(useSession().data);
  return useUnreadMessages(signedIn).data ?? 0;
}
