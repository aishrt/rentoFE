import { CircleCheck, Clock, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { Booking, ConditionReport } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailCard } from '@/features/booking/booking-parts';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { useHandover } from './handover-api';

const HANDOVER_STATUSES: Booking['status'][] = ['CONFIRMED', 'ACTIVE', 'COMPLETED'];

function Stage({
  title,
  report,
  waiting,
  needsYou,
}: {
  title: string;
  report: ConditionReport | null;
  waiting: string;
  needsYou: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">
          {report ? `Done ${formatNzDateTime(report.submittedAt)}` : waiting}
        </p>
      </div>
      {report ? (
        needsYou ? (
          <Badge variant="accent">
            <Clock aria-hidden="true" />
            Confirm
          </Badge>
        ) : (
          <Badge variant="primary">
            <CircleCheck aria-hidden="true" />
            Done
          </Badge>
        )
      ) : null}
    </div>
  );
}

/**
 * The handover on a booking's page (spec §14): where check-in and check-out stand, and the button for the
 * next one. Shown once the booking is confirmed.
 */
export function HandoverCard({ booking, base }: { booking: Pick<Booking, 'ref' | 'status'>; base: string }) {
  const shown = HANDOVER_STATUSES.includes(booking.status);
  const handover = useHandover(booking.ref, shown);
  if (!shown) return null;
  const data = handover.data;

  return (
    <DetailCard title="Handover" icon={ClipboardCheck}>
      {!data ? (
        handover.isError ? (
          <p className="text-sm text-muted">The handover couldn’t load. Refresh to try again.</p>
        ) : (
          <div aria-hidden="true" className="grid gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        )
      ) : (
        <div className="grid gap-4">
          <Stage
            title="Check-in"
            report={data.checkIn}
            waiting={`Opens ${formatNzDateTime(data.checkInOpensAt)}`}
            needsYou={data.actions.confirmCheckIn}
          />
          <Stage
            title="Check-out"
            report={data.checkOut}
            waiting={data.checkIn ? 'When the car is returned' : 'After check-in'}
            needsYou={data.actions.confirmCheckOut}
          />
          <div className="flex flex-wrap gap-3">
            {data.actions.checkIn && (
              <Button asChild>
                <Link to={`${base}/check-in`}>Start check-in</Link>
              </Button>
            )}
            {data.actions.checkOut && (
              <Button asChild>
                <Link to={`${base}/check-out`}>Start check-out</Link>
              </Button>
            )}
            {(data.checkIn || data.checkOut) && (
              <Button asChild variant="secondary">
                <Link to={`${base}/handover`}>
                  {data.actions.confirmCheckIn || data.actions.confirmCheckOut
                    ? 'Review and confirm'
                    : 'See photos'}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </DetailCard>
  );
}
