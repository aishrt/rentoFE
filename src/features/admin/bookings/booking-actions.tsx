import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CirclePlay, CircleX, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import type { AdminBookingDetail, AdminCancelRequest, AdminRefundRequest } from '@/api/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { formatNzd } from '@/features/booking/booking-format';
import {
  adminBookingListsQueryKey,
  adminBookingQueryKey,
  cancelRequest,
  editStatusRequest,
  refundRequest,
} from './bookings-api';
import { latestRefund, STATUS_EDITS } from './bookings-labels';
import { CancelBookingDialog } from './cancel-booking-dialog';
import { ReasonDialog } from './reason-dialog';
import { RefundDialog } from './refund-dialog';

type Action = 'status' | 'refund' | 'cancel';
type StatusEdit = (typeof STATUS_EDITS)[keyof typeof STATUS_EDITS];

/** How a Host-funded refund is taken back from the Host, after the refund's toast (plan §8.1, item 15). */
function hostRefundWords(recovery: AdminBookingDetail['hostRefund']): string {
  if (!recovery || recovery.recoveredFrom === 'THIS_PAYOUT') return '';
  const reversed = recovery.reversedCents
    ? ` ${formatNzd(recovery.reversedCents)} was taken back from the Host’s payout.`
    : '';
  // A transfer Stripe wouldn't reverse: the note says why, and that it comes off the next payout instead.
  if (recovery.note) return `${reversed} ${recovery.note}`;
  const owed = recovery.owedCents
    ? ` ${formatNzd(recovery.owedCents)} comes off the Host’s next payout.`
    : '';
  return `${reversed}${owed}`;
}

/** The booking changed meanwhile: the API's answer shows, and the page catches up. */
const STALE_CODES = [
  'ALREADY_CHANGED',
  'TRANSITION_NOT_ALLOWED',
  'NOT_CANCELLABLE',
  'NOT_CONFIRMED',
  'NOT_PAID',
];

/**
 * What staff can do to a booking (plan §8.2): mark a trip started or completed, refund the Guest, or cancel
 * a confirmed booking or a pending request. Each needs a reason for the audit log; money needs the refunds
 * permission.
 */
export function BookingActions({ detail, queryRef }: { detail: AdminBookingDetail; queryRef: string }) {
  const queryClient = useQueryClient();
  const { booking } = detail;
  const [open, setOpen] = useState<Action | null>(null);
  // Kept while its dialog closes, so the dialog's text doesn't change as it animates out.
  const [edit, setEdit] = useState<StatusEdit | null>(null);
  const available =
    booking.status === 'CONFIRMED' || booking.status === 'ACTIVE' ? STATUS_EDITS[booking.status] : null;
  // A request, or a booking waiting for the Guest's verification: only authorised, so it can be cancelled
  // with the hold on the card released (plan §8.2).
  const pending = booking.status === 'PENDING';

  const toggle = (action: Action) => (next: boolean) => setOpen(next ? action : null);
  const show = (next: AdminBookingDetail) => {
    queryClient.setQueryData(adminBookingQueryKey(queryRef), next);
    void queryClient.invalidateQueries({ queryKey: adminBookingListsQueryKey });
  };
  const catchUp = (error: unknown): never => {
    if (error instanceof ApiError && STALE_CODES.includes(error.code)) {
      void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(queryRef) });
    }
    throw error;
  };

  const editStatus = async (reason: string) => {
    if (!edit) return;
    const next = await editStatusRequest(queryRef, { to: edit.to, reason }).catch(catchUp);
    show(next);
    setOpen(null);
    toast(edit.done);
  };

  const refund = async (request: AdminRefundRequest) => {
    const next = await refundRequest(queryRef, request).catch(catchUp);
    show(next);
    setOpen(null);
    const latest = latestRefund(next);
    if (latest?.status === 'FAILED') {
      toast('The refund didn’t go through', {
        tone: 'danger',
        description: latest.failureReason ?? 'Stripe turned it down. The reason is under Payments.',
      });
    } else {
      toast('Refund sent', {
        description: `${formatNzd(request.amountCents)} back to ${booking.guest.firstName}’s card. We’ve emailed them.${hostRefundWords(next.hostRefund)}`,
      });
    }
  };

  const cancel = async (request: AdminCancelRequest) => {
    await cancelRequest(queryRef, request).catch(catchUp);
    setOpen(null);
    toast(pending ? 'Request cancelled' : 'Booking cancelled', {
      // The Host of an Instant Book waiting for the Guest's verification never heard of it, so isn't told.
      description: pending
        ? `${booking.instantBook ? 'The Guest has' : 'The Guest and Host have'} been told, and the hold on the Guest’s card is released.`
        : 'The Guest and Host have been told, and the refund is on its way.',
    });
    void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(queryRef) });
    void queryClient.invalidateQueries({ queryKey: adminBookingListsQueryKey });
  };

  return (
    <>
      {available && (
        <Button
          variant="secondary"
          onClick={() => {
            setEdit(available);
            setOpen('status');
          }}
        >
          {available.to === 'ACTIVE' ? <CirclePlay aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
          {available.button}
        </Button>
      )}
      {detail.refundableCents > 0 && (
        <Button variant="secondary" onClick={() => setOpen('refund')}>
          <Undo2 aria-hidden="true" />
          Refund
        </Button>
      )}
      {(booking.status === 'CONFIRMED' || pending) && (
        <Button variant="secondary" onClick={() => setOpen('cancel')}>
          <CircleX aria-hidden="true" />
          {pending ? 'Cancel request' : 'Cancel booking'}
        </Button>
      )}

      <ReasonDialog
        open={open === 'status'}
        onOpenChange={toggle('status')}
        title={edit?.title ?? ''}
        description={edit?.description}
        confirmLabel={edit?.button ?? ''}
        reasonLabel="Reason"
        reasonDescription="For the booking’s history and the audit log."
        onConfirm={editStatus}
      />
      <RefundDialog
        open={open === 'refund'}
        onOpenChange={toggle('refund')}
        refundableCents={detail.refundableCents}
        tripPayoutSent={detail.tripPayoutSent}
        guestName={booking.guest.firstName}
        onConfirm={refund}
      />
      <CancelBookingDialog
        open={open === 'cancel'}
        onOpenChange={toggle('cancel')}
        bookingRef={queryRef}
        pending={pending}
        onConfirm={cancel}
      />
    </>
  );
}
