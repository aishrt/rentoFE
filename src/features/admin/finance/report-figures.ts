import {
  Ban,
  BadgePercent,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CircleCheck,
  CirclePlus,
  HandCoins,
  Landmark,
  Percent,
  Undo2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { PlatformReport } from '@/api/types';
import { formatNzd } from '@/features/booking/booking-format';
import { formatNumber } from '@/lib/format';

/* The platform report's figures (spec §18), grouped as the reports page shows them. */

export interface ReportFigure {
  label: string;
  icon: LucideIcon;
  value: (report: PlatformReport) => number;
  format: (value: number) => string;
  hint: string;
}

export interface ReportGroup {
  id: string;
  title: string;
  description: string;
  figures: ReportFigure[];
}

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'Counted by the day each thing happened: made, confirmed, finished or cancelled.',
    figures: [
      {
        label: 'Bookings made',
        icon: CalendarPlus,
        value: (report) => report.bookings.created,
        format: formatNumber,
        hint: 'Made on these days, not counting unfinished checkouts',
      },
      {
        label: 'Confirmed',
        icon: CalendarCheck,
        value: (report) => report.bookings.confirmed,
        format: formatNumber,
        hint: 'Confirmed on these days',
      },
      {
        label: 'Completed',
        icon: CircleCheck,
        value: (report) => report.bookings.completed,
        format: formatNumber,
        hint: 'Trips finished on these days',
      },
      {
        label: 'Cancelled',
        icon: CalendarX,
        value: (report) => report.bookings.cancelled,
        format: formatNumber,
        hint: 'Cancelled on these days',
      },
    ],
  },
  {
    id: 'money',
    title: 'Money',
    description:
      'Trip money counts by the trip’s start date, as Hosts’ earnings do. Refunds, payouts and extra charges count by the day they happened.',
    figures: [
      {
        label: 'Gross bookings',
        icon: Wallet,
        value: (report) => report.money.grossBookingsCents,
        format: formatNzd,
        hint: 'Paid for trips starting on these days, GST included',
      },
      {
        label: 'Refunds',
        icon: Undo2,
        value: (report) => report.money.refundsCents,
        format: formatNzd,
        hint: 'Sent to Guests on these days',
      },
      {
        label: 'Platform fees',
        icon: Percent,
        value: (report) => report.money.platformFeesCents,
        format: formatNzd,
        hint: 'Service fees and commission, with cancellation fees kept',
      },
      {
        label: 'Paid to Hosts',
        icon: HandCoins,
        value: (report) => report.money.hostPayoutsPaidCents,
        format: formatNzd,
        hint: 'Host payouts sent on these days',
      },
      {
        label: 'Extra charges',
        icon: CirclePlus,
        value: (report) => report.money.extraChargesCents,
        format: formatNzd,
        hint: 'Charged to Guests on these days, such as fuel or cleaning',
      },
      {
        label: 'Cancellation fees',
        icon: Ban,
        value: (report) => report.money.cancellationFeesKeptCents,
        format: formatNzd,
        hint: 'Kept from bookings cancelled on these days',
      },
    ],
  },
  {
    id: 'gst',
    title: 'GST',
    description: 'For the GST return. The GST download splits it by month.',
    figures: [
      {
        label: 'GST collected',
        icon: Landmark,
        value: (report) => report.money.gstCollectedCents,
        format: formatNzd,
        hint: 'In what Guests paid for trips starting on these days',
      },
      {
        label: 'GST on platform fees',
        icon: BadgePercent,
        value: (report) => report.money.gstOnPlatformFeesCents,
        format: formatNzd,
        hint: 'Included in the platform fees above',
      },
    ],
  },
];
