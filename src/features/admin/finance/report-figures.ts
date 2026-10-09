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
  Receipt,
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
      'Trip money counts by the trip’s start date, as Hosts’ earnings do. Cancellation fees, refunds, payouts and extra charges count by the day they happened.',
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
        hint: 'Service fees, commission and the platform’s share of fees kept and extra charges',
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
    id: 'fees',
    title: 'Platform fees',
    description:
      'What the platform keeps, GST included, adding up to the platform fees above. The Revenue and fees download has it for each day.',
    figures: [
      {
        label: 'Service fees',
        icon: Receipt,
        value: (report) => report.fees.serviceFeesCents,
        format: formatNzd,
        hint: 'Paid by Guests for trips starting on these days',
      },
      {
        label: 'Host commission',
        icon: Percent,
        value: (report) => report.fees.hostCommissionCents,
        format: formatNzd,
        hint: 'Kept from Hosts’ rental on trips starting on these days',
      },
      {
        label: 'Share of cancellation fees',
        icon: Ban,
        value: (report) => report.fees.cancellationFeesShareCents,
        format: formatNzd,
        hint: 'The platform’s part of fees kept on these days, after the Host’s share',
      },
      {
        label: 'Extra-charge commission',
        icon: CirclePlus,
        value: (report) => report.fees.extraChargeCommissionCents,
        format: formatNzd,
        hint: 'Kept from extra charges paid on these days',
      },
    ],
  },
  {
    id: 'gst',
    title: 'GST',
    description:
      'For the GST return, at the rate in settings. The GST download splits it by month, with the same totals.',
    figures: [
      {
        label: 'GST collected',
        icon: Landmark,
        value: (report) => report.gst.collectedCents,
        format: formatNzd,
        hint: 'In trips, extra charges and fees kept, less refunds',
      },
      {
        label: 'GST in trips',
        icon: Landmark,
        value: (report) => report.gst.inTripsCents,
        format: formatNzd,
        hint: 'In what Guests paid for trips starting on these days',
      },
      {
        label: 'GST in extra charges',
        icon: CirclePlus,
        value: (report) => report.gst.inExtraChargesCents,
        format: formatNzd,
        hint: 'In extra charges paid on these days',
      },
      {
        label: 'GST in cancellation fees',
        icon: Ban,
        value: (report) => report.gst.inCancellationFeesCents,
        format: formatNzd,
        hint: 'In fees kept from bookings cancelled on these days',
      },
      {
        label: 'GST given back',
        icon: Undo2,
        value: (report) => report.gst.givenBackCents,
        format: formatNzd,
        hint: 'In refunds of that money sent on these days',
      },
      {
        label: 'GST on platform fees',
        icon: BadgePercent,
        value: (report) => report.gst.onPlatformFeesCents,
        format: formatNzd,
        hint: 'Included in the platform fees above',
      },
    ],
  },
];
