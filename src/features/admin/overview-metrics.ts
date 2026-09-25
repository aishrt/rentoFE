import {
  BadgeCheck,
  CalendarClock,
  Car,
  KeyRound,
  ShieldCheck,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AdminOverview } from '@/api/types';
import { formatNumber, formatNzdFromCents } from '@/lib/format';

export interface OverviewMetric {
  key: keyof AdminOverview['metrics'];
  label: string;
  icon: LucideIcon;
  format: (value: number) => string;
  /** Explains the figure; for untracked metrics it says when tracking starts. */
  hint: string;
}

/** The admin KPIs from spec §18. The API returns null for those whose module isn't built yet. */
export const overviewMetrics: OverviewMetric[] = [
  {
    key: 'totalUsers',
    label: 'Registered users',
    icon: Users,
    format: formatNumber,
    hint: 'Guests and hosts',
  },
  {
    key: 'activeHosts',
    label: 'Active hosts',
    icon: KeyRound,
    format: formatNumber,
    hint: 'Hosts in good standing',
  },
  {
    key: 'activeVehicles',
    label: 'Active vehicles',
    icon: Car,
    format: formatNumber,
    hint: 'Tracked once hosts can list cars',
  },
  {
    key: 'upcomingBookings',
    label: 'Upcoming bookings',
    icon: CalendarClock,
    format: formatNumber,
    hint: 'Tracked once booking opens',
  },
  {
    key: 'bookingRevenueCents',
    label: 'Booking revenue',
    icon: Wallet,
    format: formatNzdFromCents,
    hint: 'Tracked once payments go live',
  },
  {
    key: 'pendingVerifications',
    label: 'Pending verifications',
    icon: ShieldCheck,
    format: formatNumber,
    hint: 'Tracked once verification opens',
  },
  {
    key: 'suspendedUsers',
    label: 'Suspended users',
    icon: UserX,
    format: formatNumber,
    hint: 'Accounts on hold',
  },
  {
    key: 'staffMembers',
    label: 'Staff members',
    icon: BadgeCheck,
    format: formatNumber,
    hint: 'Admins and support team',
  },
];
