import type { Socket } from 'socket.io-client';
import { refreshSession } from '@/api/client';
import { env } from '@/lib/env';

const RETRY_AFTER_MS = 10_000;

interface RealtimeOptions {
  /** Called when the connection comes back after a drop, so data that changed meanwhile is refetched. */
  onReconnect: () => void;
  /** What to do with each live event the API sends, e.g. `message` or `notification`. */
  events?: Record<string, (payload: unknown) => void>;
}

/**
 * Opens the Socket.IO connection to the backend (plan §4.4) and returns a function that closes it.
 * socket.io-client is downloaded only here, once someone is signed in, so public pages never load
 * it (plan §12.5).
 */
export function openRealtime({ onReconnect, events = {} }: RealtimeOptions): () => void {
  let socket: Socket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  import('socket.io-client')
    .then(({ io }) => {
      if (closed) return;
      const connection = io(env.apiUrl, {
        withCredentials: true,
        // WebSocket first; HTTP long-polling only on networks that block WebSockets (plan §13.4).
        transports: ['websocket', 'polling'],
      });
      socket = connection;
      for (const [event, handle] of Object.entries(events)) connection.on(event, handle);

      let connectedBefore = false;
      let renewed = false;
      connection.on('connect', () => {
        if (connectedBefore) onReconnect();
        connectedBefore = true;
        renewed = false;
      });

      connection.on('connect_error', (error) => {
        // A network problem: Socket.IO keeps retrying by itself.
        if (connection.active) return;
        // The server refused the connection. UNAUTHENTICATED means the access cookie has expired:
        // renew it once and connect again. If renewing fails, the session has ended.
        if (error.message === 'UNAUTHENTICATED') {
          if (renewed) return;
          renewed = true;
          void refreshSession().then((ok) => {
            if (ok && !closed) connection.connect();
          });
          return;
        }
        // Anything else is on the server's side; try again shortly.
        retry = setTimeout(() => {
          if (!closed) connection.connect();
        }, RETRY_AFTER_MS);
      });
    })
    .catch(() => {
      // The script didn't download (offline, or a deploy removed it). Live updates are a bonus:
      // every page still loads its data over the REST API.
    });

  return () => {
    closed = true;
    clearTimeout(retry);
    socket?.disconnect();
  };
}
