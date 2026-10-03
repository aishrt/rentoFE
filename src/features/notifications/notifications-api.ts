import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { NotificationItem, Notifications } from '@/api/types';

/** Every notification query starts with this, so one invalidation refreshes the bell and the page alike. */
export const notificationsQueryKey = ['notifications'] as const;

/** How often the bell checks for news (plan §7, build order: every minute until Socket.IO arrives). */
export const NOTIFICATIONS_POLL_MS = 60_000;
/** The bell shows the newest few; "Show all" opens the Notifications page for the rest. */
export const BELL_SIZE = 3;
/** Notifications per page on the Notifications page; "Load more" adds the next. */
export const PAGE_SIZE = 20;

export type NotificationFilter = 'all' | 'unread';

/** Where opening a notification goes: a path inside the website, never a link that leaves it. */
export const internalLink = (item: NotificationItem) => (item.link?.startsWith('/') ? item.link : undefined);

/** The newest three in-app notifications, the unread count and the total, refreshed every minute. */
export function useNotifications() {
  return useQuery({
    queryKey: [...notificationsQueryKey, 'latest'],
    queryFn: ({ signal }) =>
      unwrap(client.GET('/notifications', { params: { query: { limit: BELL_SIZE } }, signal })),
    refetchInterval: NOTIFICATIONS_POLL_MS,
    staleTime: 30_000,
  });
}

/** Every notification, or the unread ones, a page at a time, newest first. */
export function useNotificationPages(filter: NotificationFilter) {
  return useInfiniteQuery({
    queryKey: [...notificationsQueryKey, 'pages', filter],
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET('/notifications', {
          params: {
            query: {
              limit: PAGE_SIZE,
              ...(pageParam && { cursor: pageParam }),
              ...(filter === 'unread' && { unread: 'true' as const }),
            },
          },
          signal,
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    staleTime: 30_000,
  });
}

type Cached = Notifications | InfiniteData<Notifications, string | undefined>;
/** A change to one page of notifications, given every notification the caches know about. */
type Change<Variables> = (
  variables: Variables,
  known: ReadonlyMap<string, NotificationItem>,
) => (page: Notifications) => Notifications;

/**
 * A change to notifications that shows straight away in the bell and on the page, is undone if the API
 * refuses it, and is checked against the API afterwards.
 */
function useNotificationsMutation<Variables, Result>(
  request: (variables: Variables) => Promise<Result>,
  change: Change<Variables>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueriesData<Cached>({ queryKey: notificationsQueryKey });
      const known = new Map<string, NotificationItem>();
      for (const [, data] of previous) {
        const pages = !data ? [] : 'pages' in data ? data.pages : [data];
        for (const page of pages) for (const item of page.notifications) known.set(item.id, item);
      }
      const update = change(variables, known);
      queryClient.setQueriesData<Cached>({ queryKey: notificationsQueryKey }, (data) =>
        !data ? data : 'pages' in data ? { ...data, pages: data.pages.map(update) } : update(data),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}

const count = (ids: readonly string[], known: ReadonlyMap<string, NotificationItem>, read: boolean) =>
  ids.filter((id) => known.get(id)?.read === read).length;

/** Marks some notifications read, or all of them without ids. */
export function useMarkNotificationsRead() {
  return useNotificationsMutation(
    (ids?: string[]) => unwrap(client.POST('/notifications/read', { body: ids ? { ids } : {} })),
    (ids, known) => {
      const newlyRead = ids ? count(ids, known, false) : Infinity;
      return (page) => ({
        ...page,
        notifications: page.notifications.map((item) =>
          !ids || ids.includes(item.id) ? { ...item, read: true } : item,
        ),
        unreadCount: Math.max(0, page.unreadCount - newlyRead),
      });
    },
  );
}

/** Marks some notifications unread again. */
export function useMarkNotificationsUnread() {
  return useNotificationsMutation(
    (ids: string[]) => unwrap(client.POST('/notifications/unread', { body: { ids } })),
    (ids, known) => {
      const newlyUnread = count(ids, known, true);
      return (page) => ({
        ...page,
        notifications: page.notifications.map((item) =>
          ids.includes(item.id) ? { ...item, read: false } : item,
        ),
        unreadCount: Math.min(page.total, page.unreadCount + newlyUnread),
      });
    },
  );
}

export type DeleteTarget = { ids: string[] } | { read: true };

/** Deletes some notifications, or every one already read. Resolves to how many went. */
export function useDeleteNotifications() {
  return useNotificationsMutation(
    (target: DeleteTarget) => unwrap(client.POST('/notifications/delete', { body: target })),
    (target, known) => {
      if ('read' in target) {
        return (page) => ({
          ...page,
          notifications: page.notifications.filter((item) => !item.read),
          total: page.unreadCount,
        });
      }
      const gone = target.ids.filter((id) => known.has(id)).length;
      const goneUnread = count(target.ids, known, false);
      return (page) => ({
        ...page,
        notifications: page.notifications.filter((item) => !target.ids.includes(item.id)),
        total: Math.max(0, page.total - gone),
        unreadCount: Math.max(0, page.unreadCount - goneUnread),
      });
    },
  );
}
