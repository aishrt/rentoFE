import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';
import { openRealtime } from '@/lib/realtime';

/**
 * Keeps a Socket.IO connection open while someone is signed in (plan §4.4). When it comes back
 * after a drop, the data on screen is refetched, so nothing sent while it was down is missed.
 */
export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const userId = useSession().data?.id;

  useEffect(() => {
    if (!userId) return;
    return openRealtime({ onReconnect: () => void queryClient.invalidateQueries() });
  }, [userId, queryClient]);
}
