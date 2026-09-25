import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { FullPageLoader, RootLayout } from '@/components/layout/root-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import type { AdminRouteHandle } from '@/features/admin/admin-layout';
import { NotFoundPage } from '@/routes/errors/not-found-page';
import { RouteErrorPage } from '@/routes/errors/route-error-page';
import { plannedPages } from '@/routes/public/planned-pages';

/** Loads a page's code only when it is first visited (plan §12.5: route-level code splitting). */
function page<Module, Name extends keyof Module>(load: () => Promise<Module>, name: Name) {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

const loadComingSoon = page(() => import('@/routes/public/coming-soon-page'), 'ComingSoonPage');

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, lazy: page(() => import('@/routes/public/home/home-page'), 'HomePage') },
          ...plannedPages.map((planned) => ({ path: planned.path, lazy: loadComingSoon })),
          // Bundled with the error page, which also shows it.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'login', lazy: page(() => import('@/routes/auth/login-page'), 'LoginPage') },
      { path: 'admin/login', lazy: page(() => import('@/routes/admin/admin-login-page'), 'AdminLoginPage') },
      {
        path: 'admin',
        lazy: page(() => import('@/routes/admin/admin-shell'), 'AdminShell'),
        children: [
          {
            index: true,
            handle: { title: 'Overview' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/overview-page'), 'AdminOverviewPage'),
          },
          {
            path: '*',
            handle: { title: 'Not found' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/admin-not-found-page'), 'AdminNotFoundPage'),
          },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
