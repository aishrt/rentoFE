import { Clock } from 'lucide-react';
import type { AdminPayout } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { PAYOUT_STATUS } from '@/features/admin/ops/admin-labels';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';

/**
 * A payout's status. A hold is a wait, not a failure, so it has the quiet outline badge and a clock, as on the
 * Host's earnings page.
 */
export function PayoutStatusBadge({ status }: { status: AdminPayout['status'] }) {
  if (status === 'HELD') {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        <Clock aria-hidden="true" />
        {PAYOUT_STATUS.HELD.label}
      </Badge>
    );
  }
  return <StatusBadge status={PAYOUT_STATUS[status]} />;
}

/** What a failed transfer means for staff, in a sentence. */
function payoutFailureSentence(status: AdminPayout['status']): string {
  return status === 'FAILED'
    ? 'The transfer didn’t go through. Retry it, or check the Host’s payout setup.'
    : 'An earlier transfer didn’t go through.';
}

/**
 * Why a transfer failed: a plain sentence, with Stripe's own words under it (such as "No such destination"),
 * which staff need to look into it. Nothing when it hasn't failed.
 */
export function PayoutFailure({
  payout,
  className,
}: {
  payout: Pick<AdminPayout, 'status' | 'failureReason'>;
  className?: string;
}) {
  if (!payout.failureReason) return null;
  return (
    <div className={cn('grid gap-0.5', className)}>
      <p className="text-ink">{payoutFailureSentence(payout.status)}</p>
      <p className="text-xs break-words text-muted">{payout.failureReason}</p>
    </div>
  );
}
