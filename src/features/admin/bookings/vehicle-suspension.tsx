import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminVehicle, AdminVehicleSuspension } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import {
  adminVehicleListsQueryKey,
  adminVehicleQueryKey,
  reviewQueueQueryKey,
} from '@/features/admin/listings/listing-api';
import { ReviewSection } from '@/features/admin/listings/review-section';
import { BOOKING_STATUS } from '@/features/admin/ops/admin-labels';
import { formatTripSpan } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { actionErrorMessage, suspendVehicleRequest, unsuspendVehicleRequest } from './bookings-api';
import { ReasonDialog } from './reason-dialog';

type Vehicle = AdminVehicleSuspension['vehicle'];

/**
 * Suspend a live or switched-off car, or lift its suspension (plan §8.2). A suspended car is hidden from
 * search at once and can't be booked; the Host is emailed the reason. The car's page then lists its
 * upcoming bookings for as long as it's suspended (SuspendedCarBookings).
 */
export function SuspensionAction({ vehicle }: { vehicle: Vehicle }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // The listing shows its new status and upcoming bookings straight away, then refreshes with the note the
  // Host was sent.
  const refresh = ({ vehicle: { status }, upcomingBookings }: AdminVehicleSuspension) => {
    queryClient.setQueryData<AdminVehicle>(
      adminVehicleQueryKey(vehicle.id),
      (previous) =>
        previous && {
          ...previous,
          vehicle: { ...previous.vehicle, status },
          upcomingBookings: status === 'SUSPENDED' ? upcomingBookings : undefined,
        },
    );
    void queryClient.invalidateQueries({ queryKey: adminVehicleQueryKey(vehicle.id) });
    void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey });
    void queryClient.invalidateQueries({ queryKey: adminVehicleListsQueryKey });
  };

  const suspend = async (reason: string) => {
    const result = await suspendVehicleRequest(vehicle.id, reason);
    setOpen(false);
    refresh(result);
    const upcoming = result.upcomingBookings.length;
    toast('Car suspended', {
      description:
        upcoming > 0
          ? `It’s hidden from search. Decide on its ${upcoming === 1 ? 'upcoming booking' : `${upcoming} upcoming bookings`} below.`
          : 'It’s hidden from search, and it has no upcoming bookings.',
    });
  };

  const lift = async () => {
    const result = await unsuspendVehicleRequest(vehicle.id);
    setOpen(false);
    refresh(result);
    toast('Suspension lifted', {
      description:
        result.vehicle.status === 'ACTIVE'
          ? 'It’s back in search.'
          : 'It’s back as it was: switched off by the Host, so not in search.',
    });
  };

  if (vehicle.status === 'SUSPENDED') {
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <RotateCcw aria-hidden="true" />
          Lift suspension
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Lift the suspension?"
            description="The car goes back to how it was before: in search if it was live, or switched off if the Host had switched it off."
          >
            <LiftBody onConfirm={lift} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (vehicle.status !== 'ACTIVE' && vehicle.status !== 'INACTIVE') return null;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Ban aria-hidden="true" />
        Suspend car
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Suspend this car?"
        description="It’s hidden from search straight away and can’t be booked. Its upcoming bookings stay as they are until you keep or cancel each one."
        confirmLabel="Suspend car"
        tone="danger"
        reasonLabel="Why it’s suspended"
        reasonDescription="We email this to the Host, so write it for them."
        onConfirm={suspend}
      />
    </>
  );
}

function LiftBody({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const error = confirm.isError ? actionErrorMessage(confirm.error) : null;
  return (
    <div className="grid gap-5">
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button loading={confirm.isPending} onClick={() => confirm.mutate()}>
          Lift suspension
        </Button>
      </div>
    </div>
  );
}

/**
 * While a car is suspended: its upcoming bookings (requests, confirmed trips and trips under way), which
 * still stand. Staff keep each one, or open it and cancel it as a platform cancellation (plan §8.2). Shown
 * from the car's record each time its page opens, so they're there to come back to.
 */
export function SuspendedCarBookings({
  bookings,
  className,
}: {
  bookings: NonNullable<AdminVehicle['upcomingBookings']>;
  className?: string;
}) {
  return (
    <ReviewSection
      id="suspension-bookings"
      title="Upcoming bookings"
      className={className}
      description={
        bookings.length > 0
          ? 'The car is suspended, but these bookings still stand. Keep each one, or open it and cancel it as a platform cancellation, which refunds the Guest in full.'
          : 'The car is suspended. It has no upcoming bookings, so there’s nothing else to do.'
      }
    >
      {bookings.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-inner border border-line px-4 py-3"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to={`/admin/bookings/${booking.ref}`}
                  className="rounded-inner font-semibold text-primary hover:underline"
                >
                  {booking.ref}
                </Link>
                <span className="text-ink">{booking.guest.name}</span>
                <span className="text-muted">{formatTripSpan(booking.start, booking.end)}</span>
              </span>
              <StatusBadge status={BOOKING_STATUS[booking.status]} />
            </li>
          ))}
        </ul>
      )}
    </ReviewSection>
  );
}
