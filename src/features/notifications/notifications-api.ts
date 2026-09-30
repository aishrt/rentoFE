import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { Notifications } from '@/api/types';

export const notificationsQueryKey = ['notifications'] as const;

/** How often the bell checks for news (plan §7, build order: every minute until Socket.IO arrives). */
export const NOTIFICATIONS_POLL_MS = 60_000;

/** The latest 30 in-app notifications and the unread count, refreshed every minute while the page is open. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/notifications', { signal })),
    refetchInterval: NOTIFICATIONS_POLL_MS,
    staleTime: 30_000,
  });
}

/** Marks some notifications read, or all of them without ids. The bell updates straight away. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      await unwrap(client.POST('/notifications/read', { body: ids ? { ids } : {} }));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<Notifications>(notificationsQueryKey);
      if (previous) {
        const marked = (id: string) => !ids || ids.includes(id);
        const notifications = previous.notifications.map((item) =>
          marked(item.id) ? { ...item, read: true } : item,
        );
        const newlyRead = previous.notifications.filter((item) => !item.read && marked(item.id)).length;
        queryClient.setQueryData<Notifications>(notificationsQueryKey, {
          notifications,
          unreadCount: ids ? Math.max(0, previous.unreadCount - newlyRead) : 0,
        });
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(notificationsQueryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}
