import {
  Ban,
  Banknote,
  CalendarClock,
  CalendarX,
  Car,
  CarFront,
  Flag,
  HandCoins,
  KeyRound,
  MessageSquareWarning,
  Percent,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  UserX,
  Users,
  Wallet,
  WalletCards,
  LifeBuoy,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import type { AdminDashboard } from '@/api/types';
import { presetRange } from '@/features/admin/finance/date-range';
import { formatNumber, formatNzdFromCents } from '@/lib/format';

export interface OverviewMetric {
  key: keyof AdminDashboard['figures'];
  label: string;
  icon: LucideIcon;
  format: (value: number) => string;
  /** Explains the figure, and whether it counts the dates chosen or how things stand right now. */
  hint: string;
}

/** The admin KPIs from spec §18 that count what happened in the dates chosen. */
export const rangeMetrics: OverviewMetric[] = [
  {
    key: 'bookingRevenueCents',
    label: 'Booking revenue',
    icon: Wallet,
    format: formatNzdFromCents,
    hint: 'Trips starting on these dates, extra charges and cancellation fees kept, less their refunds',
  },
  {
    key: 'platformFeesCents',
    label: 'Platform fees',
    icon: Percent,
    format: formatNzdFromCents,
    hint: 'Service fees and commission on trips starting on these dates, and the platform’s share of fees kept and extra charges',
  },
  {
    key: 'hostPayoutsCents',
    label: 'Paid to Hosts',
    icon: HandCoins,
    format: formatNzdFromCents,
    hint: 'Host payouts sent on these dates',
  },
  {
    key: 'cancellations',
    label: 'Cancellations',
    icon: CalendarX,
    format: formatNumber,
    hint: 'Bookings cancelled on these dates',
  },
  {
    key: 'incidentCases',
    label: 'Incident cases',
    icon: TriangleAlert,
    format: formatNumber,
    hint: 'Opened on these dates',
  },
];

/** The admin KPIs that show how things stand right now, whatever the dates. */
export const currentMetrics: OverviewMetric[] = [
  {
    key: 'totalUsers',
    label: 'Registered users',
    icon: Users,
    format: formatNumber,
    hint: 'Guests and Hosts, right now',
  },
  {
    key: 'activeHosts',
    label: 'Active Hosts',
    icon: KeyRound,
    format: formatNumber,
    hint: 'Approved Hosts in good standing, right now',
  },
  {
    key: 'activeVehicles',
    label: 'Active vehicles',
    icon: Car,
    format: formatNumber,
    hint: 'Listings live right now',
  },
  {
    key: 'upcomingBookings',
    label: 'Upcoming bookings',
    icon: CalendarClock,
    format: formatNumber,
    hint: 'Requested or confirmed trips yet to start, right now',
  },
  {
    key: 'openIncidentCases',
    label: 'Open incidents',
    icon: Siren,
    format: formatNumber,
    hint: 'Cases not yet closed, right now',
  },
  {
    key: 'pendingVerifications',
    label: 'Pending verifications',
    icon: ShieldCheck,
    format: formatNumber,
    hint: 'Identity checks waiting, right now',
  },
  {
    key: 'suspendedUsers',
    label: 'Suspended users',
    icon: UserX,
    format: formatNumber,
    hint: 'Accounts on hold, right now',
  },
  {
    key: 'suspendedVehicles',
    label: 'Suspended vehicles',
    icon: Ban,
    format: formatNumber,
    hint: 'Listings on hold, right now',
  },
];

export interface QueueLink {
  key: keyof AdminDashboard['queues'];
  label: string;
  icon: LucideIcon;
  /** Where it's dealt with; a function of now for a queue that counts recent days. */
  to: string | ((now: Date) => string);
  /** Hidden from the support team, who can't open the page. */
  adminOnly?: boolean;
  /** Payments and payouts: hidden from support staff without the refunds permission, who can't open them. */
  money?: boolean;
}

/** What's waiting for the team, each linking to the page where it's dealt with, which lists the same ones. */
export const queueLinks: QueueLink[] = [
  { key: 'hostApplications', label: 'Host applications', icon: KeyRound, to: '/admin/host-applications' },
  { key: 'listingReviews', label: 'Listing reviews', icon: CarFront, to: '/admin/vehicles' },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck, to: '/admin/verifications' },
  { key: 'incidents', label: 'Incidents', icon: TriangleAlert, to: '/admin/incidents' },
  { key: 'supportTickets', label: 'Support tickets', icon: LifeBuoy, to: '/admin/support' },
  { key: 'reports', label: 'Reports', icon: Flag, to: '/admin/moderation' },
  { key: 'heldReviews', label: 'Held reviews', icon: MessageSquareWarning, to: '/admin/moderation' },
  { key: 'riskFlags', label: 'Risk flags', icon: ShieldAlert, to: '/admin/risk' },
  // The last 30 NZ days, as the API counts them.
  {
    key: 'failedPayments',
    label: 'Failed payments',
    icon: CreditCard,
    to: (now) => `/admin/payments?view=failed&from=${presetRange('30d', now).from}`,
    money: true,
  },
  {
    key: 'heldPayouts',
    label: 'Held payouts',
    icon: WalletCards,
    to: '/admin/payments?tab=payouts&status=HELD',
    money: true,
  },
  {
    key: 'failedPayouts',
    label: 'Failed payouts',
    icon: Banknote,
    to: '/admin/payments?tab=payouts&status=FAILED',
    money: true,
  },
  { key: 'failedJobs', label: 'Failed jobs', icon: ServerCrash, to: '/admin/jobs', adminOnly: true },
];
