import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CalendarBlock } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { BlockForm } from './block-form';
import {
  adminCalendarQueryKey,
  removeBlockRequest,
  reviewErrorMessage,
  useAdminCalendar,
} from './listing-api';
import { addMonthsToValue, formatBlockRange, formatDayValue, todayNz } from './listing-format';
import { BLOCK_REASON_LABELS, REMOVABLE_BLOCKS, type BlockReason } from './listing-labels';
import { ReviewSection } from './review-section';

const REASON_ORDER: readonly BlockReason[] = ['BOOKED', 'HOLD', 'BUFFER', 'ADMIN', 'HOST_BLOCK', 'RECURRING'];

const reasonBadge: Record<BlockReason, 'primary' | 'accent' | 'neutral' | 'outline'> = {
  BOOKED: 'primary',
  HOLD: 'primary',
  BUFFER: 'outline',
  ADMIN: 'accent',
  HOST_BLOCK: 'neutral',
  RECURRING: 'neutral',
};

/** "PENDING_HOST" → "Pending host": a booking's status, until bookings have their own labels (Days 11–13). */
const statusWords = (status: string) => status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ');

function BlockRow({
  block,
  removing,
  onRemove,
}: {
  block: CalendarBlock;
  removing: boolean;
  onRemove: (block: CalendarBlock) => void;
}) {
  const range = formatBlockRange(block);
  const removable = REMOVABLE_BLOCKS.includes(block.reason);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <p className="font-medium text-ink">{range}</p>
        <p className="mt-0.5 text-sm text-muted">
          {block.booking && (
            <>
              <span className="font-medium text-ink">{block.booking.ref}</span>,{' '}
              {block.booking.guestFirstName} · {statusWords(block.booking.status)}
            </>
          )}
          {block.booking && block.note && ' · '}
          {block.note && <>&ldquo;{block.note}&rdquo;</>}
        </p>
      </div>
      <Badge variant={reasonBadge[block.reason]}>{BLOCK_REASON_LABELS[block.reason]}</Badge>
      {removable && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove the block ${range}`}
          loading={removing}
          onClick={() => onRemove(block)}
        >
          <Trash2 aria-hidden="true" />
          Remove
        </Button>
      )}
    </li>
  );
}

/**
 * The calendar override (plan §9, Days 10–11; §6.2: Admin and Support): the car's next two months, by
 * reason, with trips' booking references. Staff block dates and remove staff, Host and recurring blocks;
 * a trip's dates are never removed here, only by cancelling the booking.
 */
export function CalendarOverride({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient();
  const [range] = useState(() => {
    const from = todayNz();
    return { from, to: addMonthsToValue(from, 2) };
  });
  const calendar = useAdminCalendar(vehicleId, range.from, range.to);
  const [showRecurring, setShowRecurring] = useState(false);

  const remove = useMutation({
    mutationFn: (block: CalendarBlock) => removeBlockRequest({ id: vehicleId, blockId: block.id }),
    onSuccess: async (_, block) => {
      toast('Block removed', { description: `${formatBlockRange(block)} can be booked again.` });
      await queryClient.invalidateQueries({ queryKey: adminCalendarQueryKey(vehicleId) });
    },
  });
  const removingId = remove.isPending ? remove.variables.id : null;

  const blocks = [...(calendar.data?.blocks ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const oneOff = blocks.filter((block) => block.reason !== 'RECURRING');
  const recurring = blocks.filter((block) => block.reason === 'RECURRING');
  const counts = REASON_ORDER.map((reason) => ({
    reason,
    count: blocks.filter((block) => block.reason === reason).length,
  })).filter(({ count }) => count > 0);

  return (
    <ReviewSection
      id="calendar"
      title="Calendar override"
      description={`${formatDayValue(range.from)} to ${formatDayValue(range.to)}. Every change is in the audit log.`}
    >
      <div className="grid gap-5">
        {calendar.isPending && (
          <div aria-busy="true" className="grid gap-2">
            <span className="sr-only">Loading the calendar</span>
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-14 rounded-control" />
            <Skeleton className="h-14 rounded-control" />
          </div>
        )}

        {calendar.isError && (
          <Alert
            variant="danger"
            role="alert"
            title="We couldn't load the calendar"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => calendar.refetch()}
                loading={calendar.isFetching}
              >
                Try again
              </Button>
            }
          >
            {calendar.error.message}
          </Alert>
        )}

        {calendar.data && (
          <div>
            {counts.length > 0 ? (
              <ul aria-label="Blocks by reason" className="flex flex-wrap gap-2">
                {counts.map(({ reason, count }) => (
                  <li key={reason}>
                    <Badge variant={reasonBadge[reason]}>
                      {BLOCK_REASON_LABELS[reason]}: {formatNumber(count)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing is blocked: every day can be booked.</p>
            )}

            {remove.isError && (
              <Alert variant="danger" role="alert" className="mt-4">
                {reviewErrorMessage(remove.error)}
              </Alert>
            )}

            {oneOff.length > 0 && (
              <ul aria-label="Blocked dates" className="mt-3 divide-y divide-line">
                {oneOff.map((block) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    removing={removingId === block.id}
                    onRemove={(target) => remove.mutate(target)}
                  />
                ))}
              </ul>
            )}

            {/* Recurring rules can make dozens of blocks, so they're folded away. */}
            {recurring.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3"
                  aria-expanded={showRecurring}
                  aria-controls="recurring-blocks"
                  onClick={() => setShowRecurring((shown) => !shown)}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'transition-transform duration-200 ease-out',
                      showRecurring && 'rotate-180',
                    )}
                  />
                  {showRecurring ? 'Hide' : 'Show'} {formatNumber(recurring.length)} recurring{' '}
                  {recurring.length === 1 ? 'block' : 'blocks'}
                </Button>
                {showRecurring && (
                  <ul id="recurring-blocks" aria-label="Recurring blocks" className="divide-y divide-line">
                    {recurring.map((block) => (
                      <BlockRow
                        key={block.id}
                        block={block}
                        removing={removingId === block.id}
                        onRemove={(target) => remove.mutate(target)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <BlockForm vehicleId={vehicleId} today={range.from} />
      </div>
    </ReviewSection>
  );
}
