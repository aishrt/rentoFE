import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { MotionProvider } from '@/components/motion/motion-provider';

interface MockResponse {
  status: number;
  body?: unknown;
}

type Handler = (init: RequestInit | undefined) => MockResponse;

/**
 * Replaces fetch with handlers keyed by "METHOD /path" (the path after /api/v1).
 * Unhandled requests fail the test loudly.
 */
export function mockApi(handlers: Record<string, Handler | MockResponse>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    const { status, body } = typeof handler === 'function' ? handler(init) : handler;
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderWithRouter(routes: RouteObject[], initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <RouterProvider router={router} />
      </MotionProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}

/** Renders a single element inside the app providers and a router. */
export function renderWithProviders(ui: ReactElement, path = '/') {
  return renderWithRouter([{ path: '*', element: ui }], path);
}

export const adminUser = {
  id: 'u1',
  email: 'aroha@example.co.nz',
  firstName: 'Aroha',
  lastName: 'Admin',
  roles: ['ADMIN'],
  emailVerified: true,
};

export const guestUser = {
  ...adminUser,
  id: 'u2',
  email: 'kiri@example.co.nz',
  firstName: 'Kiri',
  roles: ['GUEST'],
};
