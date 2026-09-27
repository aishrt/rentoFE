import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/utils';
import { openRealtime } from './realtime';

type Listener = (...args: unknown[]) => void;

/** Stands in for a socket.io-client Socket: tests fire its events by hand. */
class FakeSocket {
  active = true;
  connect = vi.fn(() => this);
  disconnect = vi.fn(() => this);
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  fire(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

const { io, sockets } = vi.hoisted(() => {
  const sockets: FakeSocket[] = [];
  return { sockets, io: vi.fn(() => sockets[sockets.push(new FakeSocket()) - 1]) };
});
vi.mock('socket.io-client', () => ({ io }));

async function openConnection(onReconnect = vi.fn()) {
  const close = openRealtime({ onReconnect });
  await vi.waitFor(() => expect(sockets).toHaveLength(1));
  return { socket: sockets[0]!, close, onReconnect };
}

/** A connection the server refused; Socket.IO won't retry it by itself. */
function refuse(socket: FakeSocket, message: string) {
  socket.active = false;
  socket.fire('connect_error', new Error(message));
}

afterEach(() => {
  sockets.length = 0;
  io.mockClear();
  vi.unstubAllGlobals();
});

describe('openRealtime', () => {
  it('connects to the API with cookies, WebSocket first', async () => {
    const { close } = await openConnection();
    expect(io).toHaveBeenCalledWith('http://api.test', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    close();
  });

  it('refetches after a reconnect, but not on the first connect', async () => {
    const { socket, close, onReconnect } = await openConnection();

    socket.fire('connect');
    expect(onReconnect).not.toHaveBeenCalled();
    socket.fire('connect');
    expect(onReconnect).toHaveBeenCalledOnce();
    close();
  });

  it('renews an expired access cookie once, then connects again', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { status: 200, body: {} } });
    const { socket, close } = await openConnection();

    refuse(socket, 'UNAUTHENTICATED');
    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledOnce());

    // Refused again straight after renewing: the session is unusable, so it stops there.
    refuse(socket, 'UNAUTHENTICATED');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(socket.connect).toHaveBeenCalledOnce();
    close();
  });

  it('stays disconnected once the session has ended', async () => {
    mockApi({ 'POST /auth/refresh': { status: 401 } });
    const { socket, close } = await openConnection();

    refuse(socket, 'UNAUTHENTICATED');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(socket.connect).not.toHaveBeenCalled();
    close();
  });

  it('leaves network errors to Socket.IO, which retries by itself', async () => {
    const fetchMock = mockApi({});
    const { socket, close } = await openConnection();

    socket.fire('connect_error', new Error('websocket error'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(socket.connect).not.toHaveBeenCalled();
    close();
  });

  it('disconnects when closed', async () => {
    const { socket, close } = await openConnection();
    close();
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it("doesn't connect if closed before the client library has loaded", async () => {
    openRealtime({ onReconnect: vi.fn() })();
    await vi.dynamicImportSettled();
    expect(io).not.toHaveBeenCalled();
  });
});
