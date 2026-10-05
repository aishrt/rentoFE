import { useState } from 'react';
import type { Booking } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/features/content/textarea';
import { useCancelBooking, useCancellationPreview } from './booking-api';
import { formatNzd } from './booking-format';

type Kind = 'cancel' | 'withdraw' | 'release';

const COPY: Record<Kind, { title: string; confirm: string; done: string; keep: string }> = {
  cancel: {
    title: 'Cancel this booking?',
    confirm: 'Cancel booking',
    done: 'Booking cancelled',
    keep: 'Keep booking',
  },
  withdraw: {
    title: 'Withdraw your request?',
    confirm: 'Withdraw request',
    done: 'Request withdrawn',
    keep: 'Keep request',
  },
  release: {
    title: 'Release these dates?',
    confirm: 'Release dates',
    done: 'Dates released',
    keep: 'Keep holding',
  },
};

function Figure({ label, cents, strong }: { label: string; cents: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
      <dd className={strong ? 'font-semibold text-ink tabular-nums' : 'text-ink tabular-nums'}>
        {formatNzd(cents)}
      </dd>
    </div>
  );
}

interface CancelDialogProps {
  booking: Booking;
  kind: Kind;
  onDone: () => void;
}

/**
 * Cancelling, withdrawing a request or releasing unpaid dates, always with the refund preview first (plan §9,
 * Days 13–14): what comes back, what's kept under the booking's tier, and for a Host the Guest's full refund
 * and any Host cancellation fee. Render inside a <Dialog>; the preview is asked for fresh when it opens.
 */
export function CancelDialogContent({ booking, kind, onDone }: CancelDialogProps) {
  const preview = useCancellationPreview(booking.ref, true);
  const cancel = useCancelBooking(booking.ref);
  const [reason, setReason] = useState('');
  const copy = COPY[kind];
  const host = booking.role === 'HOST';

  const confirm = () =>
    cancel.mutate(reason.trim() || undefined, {
      onSuccess: () => {
        toast(copy.done, {
          description: host
            ? `${booking.guest.firstName} gets a full refund and has been told.`
            : kind === 'cancel'
              ? `${booking.host.firstName} has been told.`
              : 'Nothing was charged.',
        });
        onDone();
      },
    });

  let body;
  if (preview.isError) {
    body = (
      <Alert variant="danger" role="alert" title="We couldn’t work out the refund">
        {preview.error.message}
      </Alert>
    );
  } else if (!preview.data) {
    body = (
      <div aria-busy="true" className="grid gap-2">
        <span className="sr-only">Working out the refund</span>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-16 w-full" />
      </div>
    );
  } else if (!preview.data.allowed) {
    body = <Alert role="status">{preview.data.message}</Alert>;
  } else {
    const data = preview.data;
    const money = data.kind === 'GUEST_CANCELLATION' || data.kind === 'HOST_CANCELLATION';
    body = (
      <div className="grid gap-4">
        <p className="text-ink" role="status">
          {data.message}
        </p>
        {money && (
          <dl className="grid gap-2 rounded-control border border-line p-4 text-sm">
            {host ? (
              <>
                <Figure label={`Refund to ${booking.guest.firstName}`} cents={data.refundCents} strong />
                {data.hostFeeCents > 0 && <Figure label="Your cancellation fee" cents={data.hostFeeCents} />}
              </>
            ) : (
              <>
                <Figure label="Refund to your card" cents={data.refundCents} strong />
                {data.feeCents > 0 && (
                  <Figure label="Kept under the cancellation policy" cents={data.feeCents} />
                )}
              </>
            )}
          </dl>
        )}
        {kind !== 'release' && (
          <Field
            label={
              host ? `A note for ${booking.guest.firstName} (optional)` : 'Why are you cancelling? (optional)'
            }
          >
            <Textarea
              rows={3}
              maxLength={500}
              className="min-h-24"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        )}
        {cancel.isError && (
          <Alert variant="danger" role="alert">
            {cancel.error.message}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <DialogContent title={copy.title}>
      {body}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="secondary">{copy.keep}</Button>
        </DialogClose>
        {preview.data?.allowed && (
          <Button variant="danger" loading={cancel.isPending} onClick={confirm}>
            {copy.confirm}
          </Button>
        )}
      </div>
    </DialogContent>
  );
}
