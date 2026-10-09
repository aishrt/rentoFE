import type { RouteObject } from 'react-router';
import type { AdminRouteHandle } from '@/features/admin/admin-layout';
import { AdminRouteError } from '@/routes/admin/admin-route-error';
import { page } from './lazy-page';

/**
 * The staff portal's pages (`/admin`). They join the router on the way into the portal (router.tsx), so the
 * homepage's first load doesn't carry their router entries and preload lists (plan §12.5). The
 * administrator's pages are marked `adminOnly`, matching the API's admin-only routes (plan §6.2): the
 * support team sees why they can't use one instead of its errors. Settings isn't one, as everyone manages
 * their own sign-in there.
 */
export const adminRoutes: RouteObject[] = [
  {
    id: 'admin',
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
            path: 'users',
            handle: { title: 'Users' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/users-page'), 'AdminUsersPage'),
          },
          {
            path: 'users/:id',
            handle: { title: 'User' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/user-page'), 'AdminUserPage'),
          },
          {
            path: 'bookings',
            handle: { title: 'Bookings' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/bookings-page'), 'AdminBookingsPage'),
          },
          {
            path: 'bookings/:ref',
            handle: { title: 'Booking' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/booking-page'), 'AdminBookingPage'),
          },
          {
            path: 'bookings/:ref/thread',
            handle: { title: 'Booking messages' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/booking-thread-page'), 'AdminBookingThreadPage'),
          },
          {
            path: 'verifications',
            handle: { title: 'Verifications' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/verifications-page'), 'AdminVerificationsPage'),
          },
          {
            path: 'incidents',
            handle: { title: 'Incidents & disputes' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/incidents-page'), 'AdminIncidentsPage'),
          },
          {
            path: 'incidents/:ref',
            handle: { title: 'Incident' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/incident-page'), 'AdminIncidentPage'),
          },
          {
            path: 'support',
            handle: { title: 'Support' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/support-page'), 'AdminSupportPage'),
          },
          {
            path: 'support/:ref',
            handle: { title: 'Support ticket' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/ticket-page'), 'AdminTicketPage'),
          },
          {
            path: 'moderation',
            handle: { title: 'Moderation' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/moderation-page'), 'AdminModerationPage'),
          },
          {
            path: 'risk',
            handle: { title: 'Risk review' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/risk-page'), 'AdminRiskPage'),
          },
          {
            path: 'content',
            handle: { title: 'Content', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/content-page'), 'AdminContentPage'),
          },
          {
            path: 'help',
            handle: { title: 'FAQs & help', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/help-page'), 'AdminHelpPage'),
          },
          {
            path: 'reports',
            handle: { title: 'Reports', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/reports-page'), 'AdminReportsPage'),
          },
          {
            path: 'audit',
            handle: { title: 'Audit log', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/audit-page'), 'AdminAuditPage'),
          },
          {
            path: 'jobs',
            handle: { title: 'Jobs', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/jobs-page'), 'AdminJobsPage'),
          },
          {
            path: 'payments',
            handle: { title: 'Payments & payouts' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/payments-page'), 'AdminPaymentsPage'),
          },
          {
            path: 'refunds',
            handle: { title: 'Refunds' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/refunds-page'), 'AdminRefundsPage'),
          },
          {
            path: 'host-applications',
            handle: { title: 'Host applications' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/host-applications-page'), 'AdminHostApplicationsPage'),
          },
          {
            path: 'vehicles',
            handle: { title: 'Vehicles' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/vehicle-queue-page'), 'AdminVehicleQueuePage'),
          },
          {
            path: 'vehicles/:id',
            handle: { title: 'Vehicle review' } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/vehicle-review-page'), 'AdminVehicleReviewPage'),
          },
          {
            path: 'staff',
            handle: { title: 'Staff', adminOnly: true } satisfies AdminRouteHandle,
            lazy: page(() => import('@/routes/admin/staff-page'), 'AdminStaffPage'),
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
];
