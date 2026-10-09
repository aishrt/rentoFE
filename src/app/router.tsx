import { createBrowserRouter, type PatchRoutesOnNavigationFunction, type RouteObject } from 'react-router';
import { FullPageLoader, RootLayout } from '@/components/layout/root-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import { PageError, RouteErrorPage } from '@/routes/errors/route-error-page';
import { backendTaggedPages, seoPages } from '@/seo/pages';
import { page } from './lazy-page';

const loadComingSoon = page(() => import('@/routes/public/coming-soon-page'), 'ComingSoonPage');
const loadNotFound = page(() => import('@/routes/errors/not-found-page'), 'NotFoundPage');

export const routes: RouteObject[] = [
  {
    id: 'root',
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
                path: 'help',
                lazy: page(() => import('@/routes/help/help-page'), 'HelpPage'),
              },
              {
                path: 'help/:slug',
                lazy: page(() => import('@/routes/help/help-article-page'), 'HelpArticlePage'),
              },
              // The Guest dashboard (plan §9, Days 16–18): the account, Saved cars, payments and support.
              { path: 'account', lazy: page(() => import('@/routes/account/account-page'), 'AccountPage') },
              {
                path: 'account/settings',
                lazy: page(() => import('@/routes/account/settings-page'), 'AccountSettingsPage'),
              },
              {
                path: 'account/payments',
                lazy: page(() => import('@/routes/account/payments-page'), 'PaymentsPage'),
              },
              {
                path: 'account/support',
                lazy: page(() => import('@/routes/account/support-page'), 'SupportPage'),
              },
              {
                path: 'account/support/:ref',
                lazy: page(() => import('@/routes/account/ticket-page'), 'TicketPage'),
              },
              { path: 'saved', lazy: page(() => import('@/routes/account/saved-page'), 'SavedPage') },
              // Damage and incident reporting (plan §9, Days 20–21).
              {
                path: 'incidents/new',
                lazy: page(() => import('@/routes/incidents/new-incident-page'), 'NewIncidentPage'),
              },
              {
                path: 'incidents/:ref',
                lazy: page(() => import('@/routes/incidents/incident-page'), 'IncidentPage'),
              },
              {
                path: 'account/reviews',
                lazy: page(() => import('@/routes/account/reviews-page'), 'ReviewsPage'),
              },
              // A member's public profile and reviews (plan §6.2, §11).
              {
                path: 'members/:id',
                lazy: page(() => import('@/routes/members/member-page'), 'MemberPage'),
              },
              {
                path: 'unsubscribe',
                lazy: page(() => import('@/routes/account/unsubscribe-page'), 'UnsubscribePage'),
              },
              // Messaging (plan §9, Days 17–19): one conversation per booking.
              {
                path: 'messages',
                lazy: page(() => import('@/routes/messages/messages-page'), 'MessagesPage'),
              },
              {
                path: 'messages/:ref',
                lazy: page(() => import('@/routes/messages/conversation-page'), 'ConversationPage'),
              },
              // Hosting: the application, vehicle onboarding and the calendar (plan §9, Days 8–11).
              { path: 'host', lazy: page(() => import('@/routes/host/host-home-page'), 'HostHomePage') },
              {
                path: 'host/apply',
                lazy: page(() => import('@/routes/host/host-apply-page'), 'HostApplyPage'),
              },
              {
                path: 'host/vehicles/new',
                lazy: page(() => import('@/routes/host/new-vehicle-page'), 'NewVehiclePage'),
              },
              {
                path: 'host/vehicles/:id/calendar',
                lazy: page(() => import('@/routes/host/vehicle-calendar-page'), 'VehicleCalendarPage'),
              },
              // The Host's Calendar tab: any of their cars' calendars (plan §12.6).
              {
                path: 'host/calendar',
                lazy: page(() => import('@/routes/host/host-calendar-page'), 'HostCalendarPage'),
              },
              {
                path: 'host/vehicles/:id/maintenance',
                lazy: page(() => import('@/routes/host/maintenance-page'), 'MaintenancePage'),
              },
              {
                path: 'host/vehicles/:id/:step?',
                lazy: page(() => import('@/routes/host/vehicle-editor-page'), 'VehicleEditorPage'),
              },
              // The booking flow, trips and the Host's bookings (plan §9, Days 11–14).
              {
                path: 'book/:slug',
                lazy: page(() => import('@/routes/checkout/checkout-page'), 'CheckoutPage'),
              },
              { path: 'trips', lazy: page(() => import('@/routes/account/trips-page'), 'TripsPage') },
              {
                path: 'notifications',
                lazy: page(() => import('@/routes/account/notifications-page'), 'NotificationsPage'),
              },
              { path: 'trips/:ref', lazy: page(() => import('@/routes/account/trip-page'), 'TripPage') },
              {
                path: 'trips/:ref/receipt',
                lazy: page(() => import('@/routes/account/receipt-page'), 'ReceiptPage'),
              },
              {
                path: 'host/bookings',
                lazy: page(() => import('@/routes/bookings/host-bookings-page'), 'HostBookingsPage'),
              },
              // Earnings and payouts (plan §9, Days 16–19).
              {
                path: 'host/earnings',
                lazy: page(() => import('@/routes/host/earnings-page'), 'EarningsPage'),
              },
              // The Host's profile and settings (spec §9).
              {
                path: 'host/profile',
                lazy: page(() => import('@/routes/host/host-profile-page'), 'HostProfilePage'),
              },
              // The Guest's link to pay a charge after the trip (plan §8.1, item 6).
              { path: 'pay/:id', lazy: page(() => import('@/routes/account/pay-page'), 'PayPage') },
              {
                path: 'host/bookings/:ref',
                lazy: page(() => import('@/routes/bookings/host-booking-page'), 'HostBookingPage'),
              },
              // The digital vehicle handover (plan §9, Days 19–21), for the Guest and the Host.
              ...['trips/:ref', 'host/bookings/:ref'].flatMap((base) => [
                {
                  path: `${base}/check-in`,
                  lazy: page(() => import('@/routes/handover/inspection-page'), 'CheckInPage'),
                },
                {
                  path: `${base}/check-out`,
                  lazy: page(() => import('@/routes/handover/inspection-page'), 'CheckOutPage'),
                },
                {
                  path: `${base}/handover`,
                  lazy: page(() => import('@/routes/handover/handover-page'), 'HandoverPage'),
                },
                {
                  path: `${base}/review`,
                  lazy: page(() => import('@/routes/reviews/write-review-page'), 'WriteReviewPage'),
                },
              ]),
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
      // The link in a support team invitation: open to visitors, outside the portal's staff-only frame.
      {
        path: 'admin/invite',
        lazy: page(() => import('@/routes/admin/accept-invite-page'), 'AcceptInvitePage'),
      },
      // The staff portal's own pages join here on the way in (patchAdminRoutes, below).
    ],
  },
];

/**
 * Adds the staff portal's routes (admin-routes.tsx) on the way into /admin, so the homepage's first load
 * doesn't carry them (plan §12.5). Until then, an /admin address matches the public "not found" route,
 * whose splat makes React Router ask here before it renders.
 */
export const patchAdminRoutes: PatchRoutesOnNavigationFunction = async ({ path, patch }) => {
  if (!/^\/admin(\/|$)/.test(path)) return;
  const { adminRoutes } = await import('./admin-routes');
  patch('root', adminRoutes);
};

export function createRouter() {
  return createBrowserRouter(routes, { patchRoutesOnNavigation: patchAdminRoutes });
}
