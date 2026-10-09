import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteObject } from 'react-router';
import type { SessionUser } from '@/api/types';
import { adminRoutes } from '@/app/admin-routes';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminLayout, type AdminRouteHandle } from './admin-layout';

afterEach(() => {
  vi.unstubAllGlobals();
});

const supportUser = {
  ...adminUser,
  id: 'u3',
  email: 'sam@example.co.nz',
  firstName: 'Sam',
  roles: ['SUPPORT'],
} as SessionUser;

const render = (user: SessionUser, path: string) => {
  mockApi({ 'POST /auth/session': { status: 200, body: { user } } });
  return renderWithRouter(
    [
      {
        path: '/admin',
        element: <AdminLayout user={user} />,
        children: [
          {
            path: 'content',
            handle: { title: 'Content', adminOnly: true } satisfies AdminRouteHandle,
            element: <p>The homepage’s featured cars</p>,
          },
          {
            path: 'settings',
            handle: { title: 'Settings' } satisfies AdminRouteHandle,
            element: <p>How you sign in</p>,
          },
        ],
      },
    ],
    path,
  );
};

describe('AdminLayout: the administrator’s pages', () => {
  it('tells the support team an admin-only page is the administrator’s, instead of opening it', async () => {
    render(supportUser, '/admin/content');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This page is for the administrator' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('The homepage’s featured cars')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/admin');
    // The header still says where they are.
    expect(screen.getByText('Content', { selector: 'span' })).toBeInTheDocument();
  });

  it('opens it for the administrator, and other pages for everyone', async () => {
    const admin = render(adminUser as SessionUser, '/admin/content');
    expect(await screen.findByText('The homepage’s featured cars')).toBeInTheDocument();
    expect(screen.queryByText('This page is for the administrator')).not.toBeInTheDocument();
    admin.unmount();

    render(supportUser, '/admin/settings');
    expect(await screen.findByText('How you sign in')).toBeInTheDocument();
  });

  it('marks the pages whose API is the administrator’s, and no others', () => {
    const pages = (adminRoutes[0]!.children![0]!.children ?? []) as RouteObject[];
    const adminOnly = pages
      .filter((route) => (route.handle as AdminRouteHandle | undefined)?.adminOnly)
      .map((route) => route.path);
    expect(adminOnly.sort()).toEqual(['audit', 'content', 'help', 'jobs', 'reports', 'staff']);
    // Settings has everyone's own sign-in; payments and refunds go by the refunds permission.
    for (const path of ['settings', 'payments', 'refunds']) {
      expect(pages.some((route) => route.path === path)).toBe(true);
    }
  });
});
