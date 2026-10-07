import type { Booking, BookingSummary, CancellationTier, DriverLicenceInput } from '@/api/types';
import { formatDateValue, formatTimeValue } from '@/lib/dates';
import { NZ_TIME_ZONE } from '@/lib/format';

/*
 * How bookings read on screen (plan §12.7): every date and time in NZ time, whatever the device's time zone,
 * and amounts in NZD to the cent, so a refund or a charge is exact.
 */

type Status = Booking['status'];

const nzDateTime = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: NZ_TIME_ZONE,
});
const nzDate = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: NZ_TIME_ZONE,
});
const nzDayMonth = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
  timeZone: NZ_TIME_ZONE,
});
const nzYear = new Intl.DateTimeFormat('en-NZ', { year: 'numeric', timeZone: NZ_TIME_ZONE });
const nzNumericDate = new Intl.DateTimeFormat('en-NZ', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: NZ_TIME_ZONE,
});
const nzDateTimeWithYear = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: NZ_TIME_ZONE,
});
// en-CA writes dates as 2026-10-12, the format the API and the date pickers use.
const nzWallClock = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: NZ_TIME_ZONE,
});

/** "Mon, 12 Oct, 10:00 am" in NZ time. */
export const formatNzDateTime = (iso: string) => nzDateTime.format(new Date(iso));

/** "Mon, 12 Oct" in NZ time. */
export const formatNzDate = (iso: string) => nzDate.format(new Date(iso));

/** "12/10/2026" in NZ time (plan §3: DD/MM/YYYY), for receipts and payment history, where the year matters. */
export const formatNzNumericDate = (iso: string) => nzNumericDate.format(new Date(iso));

/** "Mon, 12 Oct 2026, 10:00 am" in NZ time, for a receipt kept for years. */
export const formatNzDateTimeWithYear = (iso: string) => nzDateTimeWithYear.format(new Date(iso));

/** "12–15 Oct", "30 Oct – 2 Nov", with the year when the trip isn't this year: a trip on a card. */
export function formatTripSpan(startIso: string, endIso: string, now = new Date()): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const [startDay, startMonth] = nzDayMonth.format(start).split(' ');
  const [endDay, endMonth] = nzDayMonth.format(end).split(' ');
  const year = nzYear.format(end);
  const suffix = year === nzYear.format(now) ? '' : ` ${year}`;
  if (startMonth === endMonth) {
    return startDay === endDay
      ? `${startDay} ${startMonth}${suffix}`
      : `${startDay}–${endDay} ${endMonth}${suffix}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}${suffix}`;
}

/** An instant as NZ wall-clock parts: "2026-10-12" and "10:00". */
export function nzWallClockParts(instant: Date): { date: string; time: string } {
  const parts = Object.fromEntries(nzWallClock.formatToParts(instant).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** "Mon, 12 Oct, 10:00 am" for a "2026-10-12T10:00" NZ wall-clock value, as the checkout's URL holds them. */
export function formatWallClock(value: string): string {
  const [date = '', time = ''] = value.split('T');
  return time ? `${formatDateValue(date)}, ${formatTimeValue(time)}` : formatDateValue(date);
}

/** "2026-10-12T10:00": now in NZ, in the format trip times are written in URLs and sent to the API. */
export function nzNowParam(now = new Date()): string {
  const { date, time } = nzWallClockParts(now);
  return `${date}T${time}`;
}

const nzdCents = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$506.50", or "$50" for whole dollars: an exact amount such as a total, a refund or a fee. */
export function formatNzd(cents: number): string {
  const text = nzdCents.format(cents / 100);
  return cents % 100 === 0 ? text.replace(/\.00$/, '') : text;
}

/** "NZ$506.50": the amount charged, labelled as NZD for visitors who think in another currency (plan §12.7). */
export const formatNzdCharge = (cents: number) => `NZ${formatNzd(cents)}`;

/** "29:41": minutes and seconds left, for the payment hold. */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "23 h 10 min", "45 min", "less than a minute": the time a Host has left to answer a request. */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'less than a minute';
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", or the date: when a notification arrived. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatNzDate(iso);
}

/** "3 days". */
export const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

export type StatusTone = 'positive' | 'waiting' | 'ended' | 'neutral';

export interface StatusLabel {
  label: string;
  tone: StatusTone;
}

type PendingFacts = Pick<BookingSummary, 'status' | 'instantBook' | 'verificationReview' | 'hostAccepted'>;

/** A pending booking still waits for support to approve the Guest's identity check (plan §8.2). */
export const awaitsVerification = (booking: Pick<PendingFacts, 'status' | 'verificationReview'>) =>
  booking.status === 'PENDING' && booking.verificationReview === 'PENDING';

/**
 * A pending booking is the Host's to answer: not an Instant Book waiting for the Guest's identity check, nor a
 * request the Host has already accepted.
 */
export const hostAnswers = (booking: Pick<PendingFacts, 'status' | 'instantBook' | 'hostAccepted'>) =>
  booking.status === 'PENDING' && !booking.instantBook && !booking.hostAccepted;

/**
 * A booking's status in plain words for the person looking at it (plan §8.2): a Guest waits for their Host
 * by name, or for their identity check; a Host sees a request to answer.
 */
export function statusLabel(
  booking: Pick<BookingSummary, 'status' | 'start'> &
    Partial<Pick<PendingFacts, 'instantBook' | 'verificationReview' | 'hostAccepted'>> & {
      otherPartyName: string;
    },
  viewer: 'GUEST' | 'HOST',
  now = Date.now(),
): StatusLabel {
  const started = new Date(booking.start).getTime() <= now;
  const toAnswer = hostAnswers({ instantBook: false, ...booking });
  const labels: Record<Status, StatusLabel> = {
    PAYMENT_PENDING: { label: 'Waiting for payment', tone: 'waiting' },
    PENDING:
      viewer === 'GUEST'
        ? awaitsVerification(booking)
          ? { label: 'Verification in review', tone: 'waiting' }
          : { label: `Waiting for ${booking.otherPartyName}`, tone: 'waiting' }
        : toAnswer
          ? { label: 'Request to answer', tone: 'waiting' }
          : { label: 'Guest being verified', tone: 'waiting' },
    CONFIRMED: started
      ? { label: 'Check-in due', tone: 'positive' }
      : { label: 'Confirmed', tone: 'positive' },
    ACTIVE: { label: 'On the road', tone: 'positive' },
    COMPLETED: { label: 'Completed', tone: 'neutral' },
    CANCELLED: { label: 'Cancelled', tone: 'ended' },
    DECLINED: { label: 'Declined', tone: 'ended' },
    EXPIRED: { label: 'Expired', tone: 'ended' },
  };
  return labels[booking.status];
}

/** The refund and the kept part of a cancellation, in a sentence: "Refunded $506.50." */
export function refundSentence(cancellation: NonNullable<Booking['cancellation']>): string | null {
  const { refundCents, feeCents } = cancellation;
  if (refundCents === undefined) return null;
  if (refundCents === 0 && !feeCents) return 'Nothing was charged.';
  if (!feeCents) return `Refunded in full: ${formatNzd(refundCents)}.`;
  if (refundCents === 0) return `Not refundable under the cancellation policy (${formatNzd(feeCents)} kept).`;
  return `Refunded ${formatNzd(refundCents)}; ${formatNzd(feeCents)} kept under the cancellation policy.`;
}

/**
 * When a full refund stops, for "Free cancellation until …": the start less the notice of the tier's
 * full-refund rule, if that time is still ahead.
 */
export function freeCancellationUntil(
  tier: Pick<CancellationTier, 'refunds'>,
  startIso: string,
  now = Date.now(),
): string | null {
  const full = tier.refunds
    .filter((rule) => rule.refundPct >= 100)
    .sort((a, b) => a.minHoursBefore - b.minHoursBefore)[0];
  if (!full) return null;
  const until = new Date(startIso).getTime() - full.minHoursBefore * 3_600_000;
  return until > now ? new Date(until).toISOString() : null;
}

/** "4.8 (12)", or "New" before the first review. */
export function ratingText(rating: { avg: number; count: number }): string {
  return rating.count > 0 ? `${(Math.round(rating.avg * 10) / 10).toFixed(1)} (${rating.count})` : 'New';
}

export type LicenceClass = DriverLicenceInput['class'];

export const LICENCE_CLASS_LABELS: Record<LicenceClass, string> = {
  NZ_FULL: 'Full NZ licence',
  NZ_RESTRICTED: 'Restricted NZ licence',
  NZ_LEARNER: 'Learner NZ licence',
  OVERSEAS: 'Overseas licence',
};
