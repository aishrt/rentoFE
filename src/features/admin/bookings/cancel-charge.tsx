import { useQueryClient } from '@tanstack/react-query';
import { CircleX } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import type { AdminBookingDetail } from '@/api/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { formatNzd } from '@/features/booking/booking-format';
import { adminBookingListsQueryKey, adminBookingQueryKey, cancelChargeRequest } from './bookings-api';
import { ReasonDialog } from './reason-dialog';

type Charge = AdminBookingDetail['extraCharges'][number];

/**
 * Cancels an extra charge that hasn't been paid (plan §8.1, item 11): one added by mistake, or written off
 * after its retries. It needs the refunds permission and a reason for the audit log; a paid charge is refunded
 * instead.
 */
export function CancelChargeButton({ charge, queryRef }: { charge: Charge; queryRef: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const cancel = async (reason: string) => {
    const next = await cancelChargeRequest(queryRef, charge.id, reason).catch((error: unknown) => {
      // Paid or cancelled meanwhile: the page catches up.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(queryRef) });
      }
      throw error;
    });
    queryClient.setQueryData(adminBookingQueryKey(queryRef), next);
    void queryClient.invalidateQueries({ queryKey: adminBookingListsQueryKey });
    setOpen(false);
    toast('Charge cancelled', { description: 'The Guest has been told there’s nothing to pay.' });
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setOpen(true)}>
        <CircleX aria-hidden="true" />
        Cancel charge
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this charge?"
        description={`The ${formatNzd(charge.amountCents)} charge for “${charge.description}” comes off what the Guest owes, its payment link stops taking payments and its retries stop. The Guest is told. A charge that’s been paid is refunded instead.`}
        confirmLabel="Cancel charge"
        tone="danger"
        reasonLabel="Why are you cancelling it?"
        reasonDescription="It goes in the audit log. The Guest doesn’t see it."
        onConfirm={cancel}
      />
    </>
  );
}
