import { BadgeCheck, CarFront, ChevronRight, Hourglass, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { BookingSummary } from '@/api/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { smallPhoto } from '@/lib/photos';
import {
  awaitsVerification,
  formatNzDateTime,
  formatNzd,
  formatTimeLeft,
  formatTripSpan,
  hostAnswers,
  ratingText,
  statusLabel,
} from './booking-format';
import { StatusBadge } from './booking-parts';
import { useNow } from './use-time-left';

interface BookingCardProps {
  booking: BookingSummary;
  viewer: 'GUEST' | 'HOST';
  to: string;
  /** Buttons under the card, such as a Host's Accept and Decline. */
  actions?: ReactNode;
}

/**
 * A trip or booking in a list (spec §8, §9): the car's photo, the car, the dates, a status in plain words
 * and the amount (the Guest's total, or what the Host earns). The whole card opens the booking.
 */
export function BookingCard({ booking, viewer, to, actions }: BookingCardProps) {
  const now = useNow();
  const status = statusLabel({ ...booking, otherPartyName: booking.otherParty.firstName }, viewer, now);
  const waiting = booking.status === 'PENDING' && booking.requestExpiresAt;
  const left = waiting ? new Date(booking.requestExpiresAt!).getTime() - now : 0;
  const ended = ['CANCELLED', 'DECLINED', 'EXPIRED'].includes(booking.status);
  // Who the booking waits for, and for how long (plan §8.2).
  const other = booking.otherParty.firstName;
  const time = formatTimeLeft(left);
  const waitingFor =
    viewer === 'HOST'
      ? hostAnswers(booking)
        ? `${time} left to answer`
        : `We’re verifying ${other}: up to ${time}`
      : awaitsVerification(booking)
        ? `We’re checking your details: up to ${time}`
        : `${other} has ${time} to answer`;

  return (
    <Card className="lift-card has-[a:active]:scale-98">
      <Link
        to={to}
        viewTransition
        className="group flex gap-4 rounded-card p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
      >
        <div className="aspect-4/3 w-24 shrink-0 overflow-hidden rounded-control bg-canvas sm:w-32">
          {booking.vehicle.photoUrl ? (
            <img
              src={smallPhoto(booking.vehicle.photoUrl)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
              width={128}
              height={96}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <CarFront aria-hidden="true" className="size-6" />
            </span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 content-start gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <p className="font-semibold text-ink">{booking.vehicle.title}</p>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-ink/85">
            {formatTripSpan(booking.start, booking.end)}
            <span className="text-muted">
              {' '}
              · {viewer === 'GUEST' ? `Host ${booking.otherParty.firstName}` : booking.otherParty.firstName}
            </span>
          </p>
          <p className="text-sm text-muted">Pick-up {formatNzDateTime(booking.start)}</p>
          {viewer === 'HOST' && booking.status === 'PENDING' && <GuestFacts guest={booking.otherParty} />}
          {waiting && left > 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Hourglass aria-hidden="true" className="size-3.5" />
              {waitingFor}
            </p>
          )}
          {/* A booking that ended without a trip earns and costs nothing; its page has any refund or fee. */}
          {!ended && (
            <p className="text-sm text-ink">
              {viewer === 'GUEST' ? 'Total ' : booking.status === 'PENDING' ? 'You’d earn ' : 'You earn '}
              <span className="font-semibold tabular-nums">NZ{formatNzd(booking.amountCents)}</span>
            </p>
          )}
        </div>
        <ChevronRight
          aria-hidden="true"
          className="nudge-right hidden size-5 shrink-0 self-center text-muted sm:block"
        />
      </Link>
      {actions && (
        <div className="flex flex-wrap gap-3 border-t border-line px-4 py-3 sm:px-5">{actions}</div>
      )}
    </Card>
  );
}

/**
 * A request's Guest, where the Host accepts or declines it (plan §9, Days 16–19): verified or not, rating and
 * completed trips (plan §6.2: never their documents).
 */
function GuestFacts({ guest }: { guest: BookingSummary['otherParty'] }) {
  if (guest.verified === undefined) return null;
  const trips = guest.tripCount ?? 0;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      {guest.verified ? (
        <span className="flex items-center gap-1 text-primary">
          <BadgeCheck aria-hidden="true" className="size-4" />
          Identity verified
        </span>
      ) : (
        <span>Identity not verified yet</span>
      )}
      <span className="flex items-center gap-1">
        <Star aria-hidden="true" className="size-3.5 fill-current text-primary" />
        <span className="sr-only">Rating</span>
        {ratingText(guest.rating ?? { avg: 0, count: 0 })}
      </span>
      <span>
        {trips} {trips === 1 ? 'trip' : 'trips'} completed
      </span>
    </p>
  );
}

export function BookingListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading</span>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex gap-4 p-4 sm:p-5">
          <Skeleton className="aspect-4/3 w-24 shrink-0 rounded-control sm:w-32" />
          <div className="grid flex-1 content-start gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </Card>
      ))}
    </div>
  );
}
