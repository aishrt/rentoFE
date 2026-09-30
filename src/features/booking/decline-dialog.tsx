import { useState } from 'react';
import type { Booking } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/features/content/textarea';
import { useDeclineBooking } from './booking-api';

type DeclinableBooking = Pick<Booking, 'ref'> & { guestName: string };

/**
 * Declining a request (plan §8.2): the Guest's authorisation is released and no Host fee applies. An
 * optional note goes to the Guest. Render inside a <Dialog>.
 */
export function DeclineDialogContent({
  booking,
  onDone,
}: {
  booking: DeclinableBooking;
  onDone: () => void;
}) {
  const decline = useDeclineBooking(booking.ref);
  const [reason, setReason] = useState('');

  const confirm = () =>
    decline.mutate(reason.trim() || undefined, {
      onSuccess: () => {
        toast('Request declined', {
          description: `${booking.guestName}’s card authorisation is released. There’s no fee for declining.`,
        });
        onDone();
      },
    });

  return (
    <DialogContent
      title={`Decline ${booking.guestName}’s request?`}
      description="Their card authorisation is released and they can book another car. There’s no fee for declining."
    >
      <div className="grid gap-4">
        <Field label={`A note for ${booking.guestName} (optional)`}>
          <Textarea
            rows={3}
            maxLength={500}
            className="min-h-24"
            placeholder="Sorry, the car isn’t available then."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {decline.isError && (
          <Alert variant="danger" role="alert">
            {decline.error.message}
          </Alert>
        )}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="secondary">Keep request</Button>
        </DialogClose>
        <Button variant="danger" loading={decline.isPending} onClick={confirm}>
          Decline request
        </Button>
      </div>
    </DialogContent>
  );
}
