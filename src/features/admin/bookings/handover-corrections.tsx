import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilLine } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminBookingDetail, ConditionReport, Handover, StaffHandoverResponse } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { formatNzDateTimeWithYear, formatNzd } from '@/features/booking/booking-format';
import { formatNumber } from '@/lib/format';
import {
  actionErrorMessage,
  adminBookingListsQueryKey,
  adminBookingQueryKey,
  chargeExtraKmRequest,
  correctReadingRequest,
  staffHandoverQueryKey,
} from './bookings-api';

/*
 * Putting a handover's extra kilometres right in the staff portal (plan §8.2): correcting a mistyped reading on
 * a condition report, and charging extra kilometres held for a check. Both need the refunds permission.
 */

type Charges = AdminBookingDetail['extraCharges'];

/** After either action: the handover as it is now, the booking's charges again, and what happened. */
function useSettled(bookingRef: string) {
  const queryClient = useQueryClient();
  return (response: StaffHandoverResponse, title: string, fallback: string) => {
    queryClient.setQueryData(staffHandoverQueryKey(bookingRef), response.handover);
    void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(bookingRef) });
    void queryClient.invalidateQueries({ queryKey: adminBookingListsQueryKey });
    toast(title, { description: response.extraKm?.message ?? fallback });
  };
}

/**
 * Where the extra kilometres stand: charged (the charge is under Extra charges), waiting for the other party to
 * confirm the check-out or the damage-report window to close, or held for a check by staff because the
 * distance is more than is charged without one. Staff can charge them now.
 */
export function ExtraKmStatus({
  handover,
  bookingRef,
  charges,
}: {
  handover: Handover;
  bookingRef: string;
  charges: Charges;
}) {
  const km = handover.kilometres!;
  const [open, setOpen] = useState(false);
  const settled = useSettled(bookingRef);
  const charge = useMutation({
    mutationFn: () => chargeExtraKmRequest(bookingRef),
    onSuccess: (response) => {
      setOpen(false);
      settled(response, 'Extra kilometres charged', 'The extra kilometres are being charged.');
    },
  });
  const amount = `${formatNumber(km.extra)} extra km: ${formatNzd(km.extraChargeCents)}`;
  if (charges.some((item) => item.type === 'EXTRA_KM' && item.status !== 'CANCELLED')) {
    return <p>{amount}, charged to the Guest. Where it stands is under Extra charges.</p>;
  }
  if (handover.bookingStatus !== 'COMPLETED') return <p>{amount}.</p>;

  const checkOut = handover.checkOut;
  const windowEnds = handover.damageWindowEndsAt;
  const waiting =
    !checkOut?.completedBySupport &&
    !(checkOut?.confirmedByGuestAt && checkOut.confirmedByHostAt) &&
    windowEnds !== undefined &&
    new Date(windowEnds) > new Date();
  const error = charge.isError ? actionErrorMessage(charge.error, { needsRefunds: true }) : null;

  return (
    <div className="grid gap-2">
      <p>
        {amount}, not charged yet.{' '}
        {waiting
          ? `It’s charged once the other party confirms the check-out, or when the damage-report window closes (${formatNzDateTimeWithYear(windowEnds!)}).`
          : 'It’s waiting for a check by staff: the distance is more than is charged without one. Check the dashboard photos, then charge it or correct the reading.'}
      </p>
      <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setOpen(true)}>
        Charge extra kilometres now
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) charge.reset();
        }}
      >
        <DialogContent
          title="Charge the extra kilometres now?"
          description={`${formatNzd(km.extraChargeCents)} for ${formatNumber(km.extra)} km over the ${formatNumber(km.allowance ?? 0)} km included goes to the Guest’s saved card now, worked out from the readings as they are. Correct a reading first if one is wrong.`}
        >
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
              <Button loading={charge.isPending} onClick={() => charge.mutate()}>
                Charge {formatNzd(km.extraChargeCents)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// The API's limits: whole kilometres, a percentage, and a note of up to 500 characters.
const ODOMETER_MAX = 2_000_000;
const NOTE_MAX = 500;

function correctionSchema(report: ConditionReport, min: number | null, max: number | null) {
  return z
    .object({
      odometer: z.string().superRefine((value, context) => {
        const km = Number(value.trim());
        const message =
          value.trim() === ''
            ? 'Enter the odometer reading'
            : !/^\d+$/.test(value.trim()) || km > ODOMETER_MAX
              ? 'Enter whole kilometres, such as 45800'
              : min !== null && km < min
                ? `It can’t be lower than at check-in (${formatNumber(min)} km)`
                : max !== null && km > max
                  ? `It can’t be higher than at check-out (${formatNumber(max)} km)`
                  : null;
        if (message) context.addIssue({ code: 'custom', message });
      }),
      fuelOrBatteryPct: z.string().superRefine((value, context) => {
        const pct = Number(value.trim());
        if (value.trim() === '' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
          context.addIssue({ code: 'custom', message: 'Enter a level from 0 to 100' });
        }
      }),
      note: z
        .string()
        .trim()
        .min(3, 'Say why it’s corrected, e.g. read again from the dashboard photo')
        .max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters`),
    })
    .refine(
      (values) =>
        Number(values.odometer.trim()) !== report.odometer ||
        Number(values.fuelOrBatteryPct.trim()) !== report.fuelOrBatteryPct,
      { message: 'Change the odometer or the level first', path: ['odometer'] },
    );
}

type CorrectionSchema = ReturnType<typeof correctionSchema>;

/**
 * Corrects a mistyped odometer or fuel or battery reading on one report, with a note for the audit log. Both
 * parties see the correction in the booking's messages; on a completed trip the extra kilometres are worked
 * out again at once.
 */
export function CorrectReadingButton({
  report,
  other,
  energy,
  bookingRef,
}: {
  report: ConditionReport;
  /** The booking's other report, whose odometer bounds this one. */
  other: ConditionReport | null;
  energy: Handover['energy'];
  bookingRef: string;
}) {
  const [open, setOpen] = useState(false);
  const what = report.stage === 'CHECK_IN' ? 'check-in' : 'check-out';
  return (
    <>
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setOpen(true)}>
        <PencilLine aria-hidden="true" />
        Correct a reading
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Correct the ${what} reading`}
          description="For a reading typed wrong, read again from the dashboard photo. Both parties see the correction in the booking’s messages, and on a completed trip the extra kilometres are worked out again."
        >
          {open && (
            <CorrectionForm
              report={report}
              other={other}
              energy={energy}
              bookingRef={bookingRef}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CorrectionForm({
  report,
  other,
  energy,
  bookingRef,
  onDone,
}: {
  report: ConditionReport;
  other: ConditionReport | null;
  energy: Handover['energy'];
  bookingRef: string;
  onDone: () => void;
}) {
  const settled = useSettled(bookingRef);
  const level = energy === 'BATTERY' ? 'Battery' : 'Fuel';
  const min = report.stage === 'CHECK_OUT' && other ? other.odometer : null;
  const max = report.stage === 'CHECK_IN' && other ? other.odometer : null;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<CorrectionSchema>, unknown, z.output<CorrectionSchema>>({
    resolver: zodResolver(correctionSchema(report, min, max)),
    defaultValues: {
      odometer: String(report.odometer),
      fuelOrBatteryPct: String(report.fuelOrBatteryPct),
      note: '',
    },
  });
  const correct = useMutation({
    mutationFn: (values: z.output<CorrectionSchema>) => {
      const odometer = Number(values.odometer.trim());
      const fuelOrBatteryPct = Number(values.fuelOrBatteryPct.trim());
      return correctReadingRequest(bookingRef, {
        stage: report.stage,
        ...(odometer !== report.odometer && { odometer }),
        ...(fuelOrBatteryPct !== report.fuelOrBatteryPct && { fuelOrBatteryPct }),
        note: values.note,
      });
    },
    onSuccess: (response) => {
      onDone();
      settled(response, 'Reading corrected', 'Both parties see the correction in the booking’s messages.');
    },
  });

  const fields = ['odometer', 'fuelOrBatteryPct', 'note'] as const;
  const onSubmit = handleSubmit(async (values) => {
    try {
      await correct.mutateAsync(values);
    } catch (error) {
      applyFieldErrors(error, fields, setError);
    }
  });
  const serverError = correct.isError
    ? actionErrorMessage(correct.error, { fields, needsRefunds: true })
    : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={correct.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">The corrected reading</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Odometer (km)" error={errors.odometer?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('odometer')} />
          </Field>
          <Field label={`${level} (%)`} error={errors.fuelOrBatteryPct?.message}>
            <Input inputMode="decimal" autoComplete="off" {...register('fuelOrBatteryPct')} />
          </Field>
        </div>
        <Field
          label="Why is it corrected?"
          description="It goes in the audit log. The Guest and Host see only the new reading."
          error={errors.note?.message}
        >
          <Textarea rows={2} maxLength={NOTE_MAX} {...register('note')} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={correct.isPending}>
          Save the correction
        </Button>
      </div>
    </form>
  );
}
