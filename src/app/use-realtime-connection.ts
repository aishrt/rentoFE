import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';
import { applyMessagingEvent } from '@/features/messages/message-keys';
import { applyNotificationEvent } from '@/features/notifications/notification-keys';
import { openRealtime } from '@/lib/realtime';

/**
 * Keeps a Socket.IO connection open while someone is signed in (plan §4.4). Notifications, messages and
 * read receipts arrive live, and booking news refreshes the booking on screen; when the connection comes
 * back after a drop, the data on screen is refetched, so nothing sent while it was down is missed.
 */
export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const userId = useSession().data?.id;

  useEffect(() => {
    if (!userId) return;
    return openRealtime({
      onReconnect: () => void queryClient.invalidateQueries(),
      events: {
        notification: (payload) => applyNotificationEvent(queryClient, payload),
        message: (payload) => applyMessagingEvent(queryClient, 'message', payload),
        'thread:read': (payload) => applyMessagingEvent(queryClient, 'thread:read', payload),
      },
    });
  }, [userId, queryClient]);
}
