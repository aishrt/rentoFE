import {
  BadgeCheck,
  CalendarCheck,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  LifeBuoy,
  MapPin,
  MessagesSquare,
  Phone,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Booking, LineItem } from '@/api/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import { useMyReviews } from '@/features/reviews/reviews-api';
import { cn } from '@/lib/cn';
import { formatNzDateTime, formatNzd, ratingText, type StatusLabel, type StatusTone } from './booking-format';

/*
 * Pieces shared by the Guest's trip page and the Host's booking page (plan §6.2: each sees what the API
 * returns for them, such as the exact address, plate and mobile only once the booking is confirmed).
 */

const TONES: Record<
  StatusTone,
  { variant: 'primary' | 'neutral' | 'outline'; className?: string; icon: ReactNode }
> = {
  // Success green is too light for text (UI_SYSTEM.md, WCAG pairs), so it only colours the icon.
  positive: {
    variant: 'neutral',
    className: 'bg-success/10',
    icon: <CircleCheck aria-hidden="true" className="text-success" />,
  },
  waiting: { variant: 'primary', icon: <Clock aria-hidden="true" /> },
  ended: { variant: 'neutral', className: 'bg-danger/8 text-danger', icon: <CircleX aria-hidden="true" /> },
  neutral: { variant: 'outline', icon: <Flag aria-hidden="true" /> },
};

export function StatusBadge({ status, className }: { status: StatusLabel; className?: string }) {
  const tone = TONES[status.tone];
  return (
    <Badge variant={tone.variant} className={cn('whitespace-nowrap', tone.className, className)}>
      {tone.icon}
      {status.label}
    </Badge>
  );
}

/** A titled card on a booking page. */
export function DetailCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const id = `booking-${title.toLowerCase().replaceAll(/\W+/g, '-')}`;
  return (
    <Card asChild className={cn('p-5 sm:p-6', className)}>
      <section aria-labelledby={id}>
        <h2 id={id} className="flex items-center gap-2 font-semibold text-ink">
          <Icon aria-hidden="true" className="size-4.5 text-primary" />
          {title}
        </h2>
        <div className="mt-4 text-sm text-ink/85">{children}</div>
      </section>
    </Card>
  );
}

function Stop({
  label,
  at,
  point,
  samePlace,
}: {
  label: string;
  at: string;
  point: Booking['pickup'];
  /** The return is where the trip started: say so, rather than repeat the place and its notes. */
  samePlace?: boolean;
}) {
  if (samePlace) {
    return (
      <div className="grid gap-1">
        <dt className="eyebrow text-muted">{label}</dt>
        <dd className="font-semibold text-ink">{formatNzDateTime(at)}</dd>
        <dd>Same place as pick-up</dd>
      </div>
    );
  }
  return (
    <div className="grid gap-1">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{formatNzDateTime(at)}</dd>
      <dd>{point.label}</dd>
      {point.address ? (
        <dd className="flex items-start gap-1.5">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {point.address}
        </dd>
      ) : (
        point.area && <dd className="text-muted">{point.area}</dd>
      )}
      {point.instructions && (
        <dd className="mt-1 rounded-control bg-canvas px-3 py-2">{point.instructions}</dd>
      )}
    </div>
  );
}

/** When and where the trip starts and ends, in NZ time, with the exact place once it's confirmed. */
export function TripStops({ booking, hiddenNote }: { booking: Booking; hiddenNote?: string }) {
  const exact = Boolean(booking.pickup.address || booking.dropoff.address);
  return (
    <>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Stop label="Pick-up" at={booking.start} point={booking.pickup} />
        <Stop
          label="Return"
          at={booking.end}
          point={booking.dropoff}
          samePlace={
            booking.dropoff.id === booking.pickup.id && booking.dropoff.address === booking.pickup.address
          }
        />
      </dl>
      <p className="mt-4 text-xs text-muted">
        Times are in NZ time.{!exact && hiddenNote ? ` ${hiddenNote}` : ''}
      </p>
    </>
  );
}

/** The other party: first name, verified, rating and trips, and their mobile once the booking is confirmed. */
export function PartyDetails({
  party,
  role,
  phoneNote,
}: {
  party: Booking['host'] | Booking['guest'];
  role: 'host' | 'guest';
  phoneNote: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <Avatar initials={party.firstName.charAt(0).toUpperCase()} className="size-11 text-sm" />
        <div>
          <p className="font-semibold text-ink">{party.firstName}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Star aria-hidden="true" className="size-3.5 fill-current text-primary" />
              <span className="sr-only">Rating</span>
              {ratingText(party.rating)}
            </span>
            <span>
              {party.tripCount} {party.tripCount === 1 ? 'trip' : 'trips'}
              {role === 'guest' ? ' completed' : ''}
            </span>
            {party.verified && (
              <span className="flex items-center gap-1 text-primary">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Identity verified
              </span>
            )}
          </p>
        </div>
      </div>
      {party.phone ? (
        <a
          href={`tel:${party.phone}`}
          className="link-underline inline-flex items-center gap-2 justify-self-start font-medium text-primary"
        >
          <Phone aria-hidden="true" className="size-4" />
          {party.phone}
        </a>
      ) : (
        <p className="text-muted">{phoneNote}</p>
      )}
    </div>
  );
}

export function ProtectionDetails({ plan }: { plan: NonNullable<Booking['protectionPlan']> }) {
  return (
    <div className="grid gap-1">
      <p className="font-semibold text-ink">
        {plan.name} protection {plan.mandatory && <Badge variant="primary">Included</Badge>}
      </p>
      <p>{plan.coverSummary}</p>
      <p>
        Excess <span className="font-semibold text-ink">{formatNzd(plan.excessCents)}</span>
      </p>
    </div>
  );
}

const PAYMENT_STATUS: Record<NonNullable<Booking['payment']>['status'], string> = {
  PENDING: 'Not paid yet',
  AUTHORISED: 'Authorised on your card, not charged yet',
  SUCCEEDED: 'Paid',
  FAILED: 'Payment didn’t go through',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partly refunded',
  CANCELLED: 'Authorisation released: nothing charged',
};

/** The receipt (spec §17): every line, the GST included and the total in NZD, with how it was paid. */
export function Receipt({ booking }: { booking: Booking }) {
  return (
    <div className="grid gap-4">
      <PriceBreakdown lineItems={booking.lineItems as LineItem[]} price={booking.price} />
      {booking.payment && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CalendarCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {PAYMENT_STATUS[booking.payment.status]}
        </p>
      )}
      <p className="text-xs text-muted">Booking reference {booking.ref}. Prices include GST.</p>
    </div>
  );
}

export function SupportLink({ bookingRef }: { bookingRef: string }) {
  return (
    <Link
      to={`/contact?category=BOOKING&booking=${encodeURIComponent(bookingRef)}`}
      className="link-underline inline-flex items-center gap-2 font-medium text-primary"
    >
      <LifeBuoy aria-hidden="true" className="size-4" />
      Contact support
    </Link>
  );
}

/** Bookings with a conversation: once a booking or request has reached the Host (spec §13). */
const MESSAGING_STATUSES: Booking['status'][] = [
  'PENDING',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DECLINED',
];

/** "Message Hana": the booking's conversation, once there is one. */
export function MessageLink({ booking, name }: { booking: Pick<Booking, 'ref' | 'status'>; name: string }) {
  if (!MESSAGING_STATUSES.includes(booking.status)) return null;
  return (
    <Button asChild variant="secondary">
      <Link to={`/messages/${booking.ref}`} viewTransition>
        <MessagesSquare aria-hidden="true" />
        Message {name}
      </Link>
    </Button>
  );
}

/** "Write a review" for a completed trip still waiting for this person's review (spec §16). */
export function ReviewLink({ booking, base }: { booking: Pick<Booking, 'ref' | 'status'>; base: string }) {
  const reviews = useMyReviews(booking.status === 'COMPLETED');
  if (!reviews.data?.toWrite.some((item) => item.bookingRef === booking.ref)) return null;
  return (
    <Button asChild>
      <Link to={`${base}/review`} viewTransition>
        <Star aria-hidden="true" className="fill-current" />
        Write a review
      </Link>
    </Button>
  );
}

/** A booking page's shape while it loads. */
export function BookingPageSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6">
      <span className="sr-only">Loading the booking</span>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-24 rounded-card" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
