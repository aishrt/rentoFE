import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { FullPageLoader, RootLayout } from '@/components/layout/root-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import type { AdminRouteHandle } from '@/features/admin/admin-layout';
import { AdminRouteError } from '@/routes/admin/admin-route-error';
import { PageError, RouteErrorPage } from '@/routes/errors/route-error-page';
import { backendTaggedPages, seoPages } from '@/seo/pages';

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
              // Search and listings (plan §9, Days 6–10).
              { path: 'cars', lazy: page(() => import('@/routes/public/search/browse-page'), 'BrowsePage') },
              {
                path: 'search',
                lazy: page(() => import('@/routes/public/search/search-page'), 'SearchPage'),
              },
              {
                path: 'cars/:slug',
                lazy: page(() => import('@/routes/public/vehicle/vehicle-page'), 'VehiclePage'),
              },
              {
                path: 'rental/:city',
                lazy: page(() => import('@/routes/public/rental/destination-page'), 'DestinationPage'),
              },
              // Public pages (plan §9, Days 12–14).
              {
                path: 'how-it-works',
                lazy: page(() => import('@/routes/public/content/how-it-works-page'), 'HowItWorksPage'),
              },
              {
                path: 'become-a-host',
                lazy: page(() => import('@/routes/public/content/become-a-host-page'), 'BecomeAHostPage'),
              },
              {
                path: 'safety',
                lazy: page(() => import('@/routes/public/content/safety-page'), 'SafetyPage'),
              },
              {
                path: 'insurance',
                lazy: page(() => import('@/routes/public/content/insurance-page'), 'InsurancePage'),
              },
              { path: 'faq', lazy: page(() => import('@/routes/public/content/faq-page'), 'FaqPage') },
              { path: 'about', lazy: page(() => import('@/routes/public/content/about-page'), 'AboutPage') },
              {
                path: 'contact',
                lazy: page(() => import('@/routes/public/content/contact-page'), 'ContactPage'),
              },
              ...['terms', 'privacy', 'cancellation-policy', 'host-agreement', 'guest-agreement'].map(
                (path) => ({
                  path,
                  lazy: page(() => import('@/routes/legal/legal-page'), 'LegalPage'),
                }),
              ),
              {
                path: 'account/settings',
                lazy: page(() => import('@/routes/account/settings-page'), 'AccountSettingsPage'),
              },
              // Pages linked from the header, footer or forms but built in later milestones (plan §9).
              ...[...seoPages, ...backendTaggedPages]
                .filter((planned) => planned.comingSoon)
                .map((planned) => ({ path: planned.path, lazy: loadComingSoon })),
              { path: '*', lazy: loadNotFound },
            ],
          },
        ],
      },
      { path: 'login', lazy: page(() => import('@/routes/auth/login-page'), 'LoginPage') },
      { path: 'signup', lazy: page(() => import('@/routes/auth/signup-page'), 'SignupPage') },
      {
        path: 'verify-email',
        lazy: page(() => import('@/routes/auth/verify-email-page'), 'VerifyEmailPage'),
      },
      {
        path: 'forgot-password',
        lazy: page(() => import('@/routes/auth/forgot-password-page'), 'ForgotPasswordPage'),
      },
      {
        path: 'reset-password',
        lazy: page(() => import('@/routes/auth/reset-password-page'), 'ResetPasswordPage'),
      },
      {
        path: 'confirm-email-change',
        lazy: page(() => import('@/routes/auth/confirm-email-change-page'), 'ConfirmEmailChangePage'),
      },
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
                path: 'payments',
                handle: { title: 'Payments & payouts' } satisfies AdminRouteHandle,
                lazy: page(() => import('@/routes/admin/payments-page'), 'AdminPaymentsPage'),
              },
              {
                path: 'settings',
                handle: { title: 'Settings' } satisfies AdminRouteHandle,
                lazy: page(() => import('@/routes/admin/settings-page'), 'AdminSettingsPage'),
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
