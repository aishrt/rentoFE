import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { FullPageLoader, RootLayout } from '@/components/layout/root-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import type { AdminRouteHandle } from '@/features/admin/admin-layout';
import { AdminRouteError } from '@/routes/admin/admin-route-error';
import { PageError, RouteErrorPage } from '@/routes/errors/route-error-page';
import { plannedPages } from '@/routes/public/planned-pages';

/** Loads a page's code only when it is first visited (plan §12.5: route-level code splitting). */
function page<Module, Name extends keyof Module>(load: () => Promise<Module>, name: Name) {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

const loadComingSoon = page(() => import('@/routes/public/coming-soon-page'), 'ComingSoonPage');
const loadNotFound = page(() => import('@/routes/errors/not-found-page'), 'NotFoundPage');

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    // The outermost route boundary, for a layout (such as the site header) or a page outside them that fails.
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            // Catches a failing public page, so the message shows between the site header and footer.
            errorElement: <PageError />,
            children: [
              { index: true, lazy: page(() => import('@/routes/public/home/home-page'), 'HomePage') },
              ...plannedPages.map((planned) => ({ path: planned.path, lazy: loadComingSoon })),
              { path: '*', lazy: loadNotFound },
            ],
          },
        ],
      },
      { path: 'login', lazy: page(() => import('@/routes/auth/login-page'), 'LoginPage') },
      { path: 'admin/login', lazy: page(() => import('@/routes/admin/admin-login-page'), 'AdminLoginPage') },
      {
        path: 'admin',
        lazy: page(() => import('@/routes/admin/admin-shell'), 'AdminShell'),
        children: [
          {
            // Catches a failing staff page, so the message shows inside the portal's sidebar and header.
            errorElement: <AdminRouteError />,
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
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
