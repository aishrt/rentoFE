import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { CalendarBlock } from '@/api/types';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { BLOCK_TONES, isCheckout, isRemovable, reasonLabel } from './calendar-blocks';
import { formatInstant, formatInstantRange } from './calendar-time';
import { hostKeys, removeBlockRequest } from './host-api';
import { InlineConfirm } from './inline-confirm';
import { hostErrorMessage } from './use-step-save';

function BlockItem({ vehicleId, block }: { vehicleId: string; block: CalendarBlock }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeBlockRequest(vehicleId, block.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hostKeys.calendar(vehicleId) });
      toast('Unblocked', { description: 'Guests can book those times again.' });
    },
    onError: (error) =>
      toast("We couldn't unblock that", { description: hostErrorMessage(error), tone: 'danger' }),
  });
  const checkout = isCheckout(block);

  return (
    <li className="flex animate-fade-in flex-wrap items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={cn('mt-1 size-3.5 shrink-0 rounded-inner', BLOCK_TONES[block.reason])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {checkout ? 'A guest is checking out' : reasonLabel(block.reason)}
          {block.booking && !checkout && (
            <span className="font-normal text-muted">
              {' '}
              · {block.booking.guestFirstName} ·{' '}
              <Link
                to={`/host/bookings/${block.booking.ref}`}
                viewTransition
                className="link-underline font-medium text-primary"
              >
                {block.booking.ref}
              </Link>
            </span>
          )}
        </p>
        <p className="text-sm text-muted">{formatInstantRange(block.start, block.end)}</p>
        {block.note && <p className="mt-0.5 text-sm text-ink">{block.note}</p>}
        {block.reason === 'HOLD' && block.holdExpiresAt && (
          <p className="mt-0.5 text-sm text-ink">
            {checkout
              ? `Held until ${formatInstant(block.holdExpiresAt)} while they pay. If they don’t, the times open again.`
              : `Answer by ${formatInstant(block.holdExpiresAt)}, or the request expires.`}
          </p>
        )}
      </div>
      {isRemovable(block) && (
        <InlineConfirm
          label="Remove"
          ariaLabel={`Remove the block ${formatInstantRange(block.start, block.end)}`}
          question="Unblock?"
          confirmLabel="Yes, unblock"
          pending={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      )}
    </li>
  );
}

/** What's on the chosen day or week, with a way to remove the Host's own blocks. */
export function CalendarDetails({
  vehicleId,
  title,
  blocks,
  empty,
}: {
  vehicleId: string;
  title: string;
  blocks: readonly CalendarBlock[];
  empty: string;
}) {
  return (
    <section
      aria-labelledby="calendar-details"
      className="rounded-card border border-line bg-surface px-4 py-3 sm:px-5"
    >
      <h2 id="calendar-details" className="pt-1 text-sm font-semibold text-ink">
        {title}
      </h2>
      {blocks.length === 0 ? (
        <p className="py-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {blocks.map((block) => (
            <BlockItem key={block.id} vehicleId={vehicleId} block={block} />
          ))}
        </ul>
      )}
    </section>
  );
}
