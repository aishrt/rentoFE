import { CarFront, ChevronRight, Hourglass } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { BookingSummary } from '@/api/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNzDateTime, formatNzd, formatTimeLeft, formatTripSpan, statusLabel } from './booking-format';
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
              src={booking.vehicle.photoUrl}
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
          {waiting && left > 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Hourglass aria-hidden="true" className="size-3.5" />
              {viewer === 'HOST'
                ? `${formatTimeLeft(left)} left to answer`
                : `${booking.otherParty.firstName} has ${formatTimeLeft(left)} to answer`}
            </p>
          )}
          <p className="text-sm text-ink">
            {viewer === 'HOST' ? 'You earn ' : 'Total '}
            <span className="font-semibold tabular-nums">NZ{formatNzd(booking.amountCents)}</span>
          </p>
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
