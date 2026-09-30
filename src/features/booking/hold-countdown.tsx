import { Hourglass } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { formatCountdown, formatNzDateTime } from './booking-format';
import { useTimeLeft } from './use-time-left';

interface HoldNoticeProps {
  /** When the held dates are released (the booking's `holdExpiresAt`). */
  expiresAt: string;
  /** Called once, when the time is up. */
  onExpired?: () => void;
  className?: string;
}

/**
 * "We're holding these dates for you" with the time left to pay (plan §8.2: 30 minutes, then the dates go
 * back on the calendar). The minutes turn to a warning in the last five. Screen readers hear the time on
 * request rather than every second.
 */
export function HoldNotice({ expiresAt, onExpired, className }: HoldNoticeProps) {
  const left = useTimeLeft(expiresAt);
  const expired = left === 0;
  const urgent = left < 5 * 60_000;

  useEffect(() => {
    if (expired) onExpired?.();
    // Only the moment it runs out matters, not a new callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control border p-4 text-sm',
        urgent ? 'border-danger/25 bg-danger/6' : 'border-primary/15 bg-primary/5',
        className,
      )}
    >
      <Hourglass
        aria-hidden="true"
        className={cn('mt-0.5 size-4.5 shrink-0', urgent ? 'text-danger' : 'text-primary')}
      />
      <div className="grid flex-1 gap-0.5">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-semibold text-ink">
          We’re holding these dates for you
          <span
            role="timer"
            aria-label={`${formatCountdown(left)} left to pay`}
            className={cn('font-semibold tabular-nums', urgent ? 'text-danger' : 'text-primary')}
          >
            {formatCountdown(left)} left
          </span>
        </p>
        <p className="text-ink/85">
          Nobody else can book them until {formatNzDateTime(expiresAt)} (NZ time). Nothing is charged until
          you confirm.
        </p>
      </div>
    </div>
  );
}
