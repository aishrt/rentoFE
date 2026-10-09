import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, ClipboardCheck, Clock, Gauge, ImagePlus, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';
import { z } from 'zod';
import type { Booking, ConditionReport, Handover } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { formatNzDateTimeWithYear, formatNzd } from '@/features/booking/booking-format';
import { DetailCard } from '@/features/booking/booking-parts';
import { ANGLE_LABELS, takenLabel } from '@/features/handover/angles';
import { areaName } from '@/features/handover/car-areas';
import { CarDiagram } from '@/features/handover/car-diagram';
import { PhotoDateNote } from '@/features/handover/photo-date-note';
import { PHOTO_CONTENT_TYPES, uploadFile, uploadProblem } from '@/features/host/upload';
import { FileButton } from '@/features/host/file-button';
import { formatNumber } from '@/lib/format';
import {
  actionErrorMessage,
  adminBookingListsQueryKey,
  adminBookingQueryKey,
  completeTripRequest,
  staffHandoverQueryKey,
  useStaffHandover,
} from './bookings-api';

/*
 * A booking's handover in the staff portal (spec §14, plan §8.2): both condition reports, and completing a
 * trip whose check-out is missing.
 */

/** The anchor the "check-out missing" staff alert links to. */
export const HANDOVER_ID = 'handover';

const WHO: Record<ConditionReport['submittedBy'], string> = {
  GUEST: 'the Guest',
  HOST: 'the Host',
  STAFF: 'Rento Vroom support',
};

/** Only a confirmed trip, one under way or a finished one has a handover. */
const HAS_HANDOVER: readonly Booking['status'][] = ['CONFIRMED', 'ACTIVE', 'COMPLETED'];

/**
 * The check-in and check-out condition reports: photos with their capture times, the odometer, fuel or
 * battery, damage, and who recorded and confirmed each. While a trip is under way without a check-out,
 * support completes it here with the Host's readings (plan §8.2).
 */
export function HandoverCard({ booking, bookingRef }: { booking: Booking; bookingRef: string }) {
  const relevant = HAS_HANDOVER.includes(booking.status);
  const handover = useStaffHandover(bookingRef, relevant);
  const { hash } = useLocation();
  const reduceMotion = useReducedMotion();
  const scrolled = useRef(false);

  // Opened from the "check-out missing" alert: bring the handover into view once it's loaded.
  useEffect(() => {
    if (hash !== `#${HANDOVER_ID}` || !handover.data || scrolled.current) return;
    scrolled.current = true;
    document
      .getElementById(HANDOVER_ID)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [hash, handover.data, reduceMotion]);

  if (!relevant) return null;

  return (
    <div id={HANDOVER_ID} className="scroll-mt-24">
      <DetailCard title="Handover" icon={ClipboardCheck}>
        {handover.isPending ? (
          <div aria-busy="true" className="grid gap-3">
            <span className="sr-only">Loading the handover</span>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-32 rounded-inner" />
          </div>
        ) : handover.isError ? (
          <Alert
            variant="danger"
            role="alert"
            title="We couldn’t load the handover"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handover.refetch()}
                loading={handover.isFetching}
              >
                Try again
              </Button>
            }
          >
            {handover.error.message}
          </Alert>
        ) : (
          <HandoverDetails handover={handover.data} bookingRef={bookingRef} />
        )}
      </DetailCard>
    </div>
  );
}

function HandoverDetails({ handover, bookingRef }: { handover: Handover; bookingRef: string }) {
  const missingCheckOut = handover.bookingStatus === 'ACTIVE' && !handover.checkOut;
  const km = handover.kilometres;
  return (
    <div className="grid gap-6">
      {missingCheckOut && <CompleteTripForm handover={handover} bookingRef={bookingRef} />}

      {km && (
        <div className="grid gap-1 rounded-inner border border-line bg-ink/3 p-4">
          <p className="font-semibold text-ink">
            {formatNumber(km.driven)} km driven
            {km.allowance === null
              ? ', with unlimited kilometres'
              : ` of ${formatNumber(km.allowance)} km included`}
          </p>
          {km.extra > 0 && (
            <p>
              {formatNumber(km.extra)} extra km: {formatNzd(km.extraChargeCents)} charged to the Guest.
            </p>
          )}
          {handover.fuelShortfall && (
            <p className="text-danger">
              Returned with less {handover.energy === 'BATTERY' ? 'charge' : 'fuel'} than the policy asks.
            </p>
          )}
        </div>
      )}

      <Report
        title="Check-in"
        report={handover.checkIn}
        energy={handover.energy}
        empty="Check-in isn’t done yet."
      />
      <Report
        title="Check-out"
        report={handover.checkOut}
        earlier={handover.checkIn}
        energy={handover.energy}
        empty={
          handover.bookingStatus === 'COMPLETED'
            ? 'No check-out was recorded: the trip was marked completed without readings.'
            : 'Check-out isn’t done yet.'
        }
      />
    </div>
  );
}

function Confirmation({ party, at }: { party: 'Guest' | 'Host'; at?: string }) {
  return at ? (
    <Badge variant="primary">
      <CircleCheck aria-hidden="true" />
      {party} confirmed {formatNzDateTimeWithYear(at)}
    </Badge>
  ) : (
    <Badge variant="outline">
      <Clock aria-hidden="true" />
      {party} hasn’t confirmed
    </Badge>
  );
}

function Report({
  title,
  report,
  earlier,
  energy,
  empty,
}: {
  title: 'Check-in' | 'Check-out';
  report: ConditionReport | null;
  earlier?: ConditionReport | null;
  energy: Handover['energy'];
  empty: string;
}) {
  const headingId = `handover-${title.toLowerCase()}`;
  if (!report) {
    return (
      <section aria-labelledby={headingId} className="grid gap-1 border-t border-line pt-5">
        <h3 id={headingId} className="font-semibold text-ink">
          {title}
        </h3>
        <p className="text-muted">{empty}</p>
      </section>
    );
  }

  // At check-out the damage already there at check-in shows in grey, new damage in red.
  const pins = [
    ...(report.stage === 'CHECK_OUT' && earlier
      ? earlier.damagePins.map((pin) => ({ ...pin, isNew: false }))
      : []),
    ...report.damagePins.map((pin) => ({ ...pin, isNew: pin.newDamage })),
  ];

  return (
    <section aria-labelledby={headingId} className="grid gap-4 border-t border-line pt-5">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={headingId} className="font-semibold text-ink">
            {title}
          </h3>
          {report.completedBySupport && <Badge variant="outline">Completed by support</Badge>}
        </div>
        <p className="text-muted">
          Recorded by {WHO[report.submittedBy]}, {formatNzDateTimeWithYear(report.submittedAt)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Confirmation party="Guest" at={report.confirmedByGuestAt} />
          <Confirmation party="Host" at={report.confirmedByHostAt} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1.5 text-muted">
            <Gauge aria-hidden="true" className="size-4" /> Odometer
          </dt>
          <dd className="font-semibold text-ink">{formatNumber(report.odometer)} km</dd>
        </div>
        <div>
          <dt className="text-muted">{energy === 'BATTERY' ? 'Battery' : 'Fuel'}</dt>
          <dd className="font-semibold text-ink">{report.fuelOrBatteryPct}%</dd>
        </div>
        {report.notes && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted">Notes</dt>
            <dd className="break-words text-ink">{report.notes}</dd>
          </div>
        )}
      </dl>

      <div className="grid items-start gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <CarDiagram pins={pins} className="max-w-36" />
        {pins.length === 0 ? (
          <p className="text-muted">No damage was marked.</p>
        ) : (
          <ol aria-label={`Damage at ${title.toLowerCase()}`} className="grid gap-2">
            {pins.map((pin, index) => (
              <li key={`${pin.id}-${index}`} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${pin.isNew ? 'bg-danger' : 'bg-ink/55'}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">
                  <span className="font-medium text-ink">{areaName(pin.x, pin.y)}</span>
                  {pin.isNew && <span className="text-danger"> (new)</span>}
                  {pin.note && <span>: {pin.note}</span>}
                  {pin.flaggedBy && <span className="text-muted"> · marked by {WHO[pin.flaggedBy]}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {report.photos.length === 0 ? (
        <p className="text-muted">No photos.</p>
      ) : (
        <ul aria-label={`Photos at ${title.toLowerCase()}`} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report.photos.map((photo, index) => (
            <li key={`${photo.url}-${index}`}>
              <figure className="grid gap-1">
                <a href={photo.url} target="_blank" rel="noreferrer" className="rounded-inner">
                  <img
                    src={photo.url}
                    alt={`${ANGLE_LABELS[photo.angle]} at ${title.toLowerCase()}`}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-inner bg-canvas object-cover"
                  />
                </a>
                <figcaption className="text-xs text-muted">
                  <span className="font-medium text-ink">{ANGLE_LABELS[photo.angle]}</span>
                  <br />
                  {takenLabel(photo.takenAt)} by {WHO[photo.takenBy]}
                  <PhotoDateNote photo={photo} className="mt-1" />
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The API's limits for a reading: whole kilometres, and a percentage.
const ODOMETER_MAX = 2_000_000;
const NOTES_MAX = 2000;

function completionSchema(checkInOdometer: number | null) {
  return z.object({
    odometer: z.string().superRefine((value, context) => {
      const km = Number(value.trim());
      const message =
        value.trim() === ''
          ? 'Enter the odometer reading'
          : !/^\d+$/.test(value.trim()) || km > ODOMETER_MAX
            ? 'Enter whole kilometres, such as 45800'
            : checkInOdometer !== null && km < checkInOdometer
              ? `It can’t be lower than at check-in (${formatNumber(checkInOdometer)} km)`
              : null;
      if (message) context.addIssue({ code: 'custom', message });
    }),
    fuelOrBatteryPct: z.string().superRefine((value, context) => {
      const pct = Number(value.trim());
      if (value.trim() === '' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        context.addIssue({ code: 'custom', message: 'Enter a level from 0 to 100' });
      }
    }),
    notes: z.string().trim().max(NOTES_MAX, `Keep it under ${NOTES_MAX} characters`),
  });
}

type CompletionSchema = ReturnType<typeof completionSchema>;

/**
 * Completes a trip whose check-out is missing (plan §8.2) with the Host's odometer and fuel or battery
 * reading, and their dashboard photo if they sent one. They become the check-out record, so extra
 * kilometres are charged as after a check-out in the app.
 */
function CompleteTripForm({ handover, bookingRef }: { handover: Handover; bookingRef: string }) {
  const queryClient = useQueryClient();
  const checkIn = handover.checkIn;
  const energy = handover.energy === 'BATTERY' ? 'Battery' : 'Fuel';
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<z.input<CompletionSchema>, unknown, z.output<CompletionSchema>>({
    resolver: zodResolver(completionSchema(checkIn?.odometer ?? null)),
    defaultValues: { odometer: '', fuelOrBatteryPct: '', notes: '' },
  });

  const complete = useMutation({
    mutationFn: async (values: z.output<CompletionSchema>) => {
      const photos = photo
        ? [
            {
              angle: 'DASHBOARD' as const,
              key: await uploadFile({ purpose: 'INSPECTION_PHOTO', bookingId: bookingRef, file: photo }),
              takenAt: new Date(photo.lastModified || Date.now()).toISOString(),
            },
          ]
        : [];
      return completeTripRequest(bookingRef, {
        odometer: Number(values.odometer.trim()),
        fuelOrBatteryPct: Number(values.fuelOrBatteryPct.trim()),
        ...(values.notes && { notes: values.notes }),
        photos,
        damagePins: [],
      });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(staffHandoverQueryKey(bookingRef), next);
      void queryClient.invalidateQueries({ queryKey: adminBookingQueryKey(bookingRef) });
      void queryClient.invalidateQueries({ queryKey: adminBookingListsQueryKey });
      reset();
      setPhoto(null);
      const extra = next.kilometres?.extraChargeCents ?? 0;
      toast('Trip completed', {
        description:
          extra > 0
            ? `${formatNumber(next.kilometres!.extra)} extra km: ${formatNzd(extra)} is charged to the Guest’s saved card. We’ve asked both for reviews.`
            : 'We’ve asked the Guest and Host for reviews, as after a check-out in the app.',
      });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await complete.mutateAsync(values);
    } catch (error) {
      applyFieldErrors(error, ['odometer', 'fuelOrBatteryPct', 'notes'] as const, setError);
    }
  });
  const serverError = complete.isError
    ? actionErrorMessage(complete.error, { fields: ['odometer', 'fuelOrBatteryPct', 'notes'] })
    : null;

  const choosePhoto = (file: File) => {
    const problem = uploadProblem(file, 'INSPECTION_PHOTO');
    setPhotoError(problem);
    setPhoto(problem ? null : file);
  };

  return (
    <section
      aria-labelledby="complete-trip-heading"
      className="grid gap-4 rounded-inner border border-warning/30 bg-warning/10 p-4"
    >
      <div className="grid gap-1">
        <h3 id="complete-trip-heading" className="font-semibold text-ink">
          Complete the trip with the Host’s readings
        </h3>
        <p>
          For a car back with its Host but no check-out in the app. The readings become the check-out record,
          so extra kilometres are charged as usual, and both are asked for reviews.
        </p>
        <p className="text-muted">
          {checkIn
            ? `At check-in: ${formatNumber(checkIn.odometer)} km, ${energy.toLowerCase()} ${checkIn.fuelOrBatteryPct}%.`
            : 'There’s no check-in record, so extra kilometres can’t be worked out.'}
        </p>
      </div>
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <fieldset disabled={complete.isPending} className="grid min-w-0 gap-4">
          <legend className="sr-only">The Host’s readings</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Odometer (km)" error={errors.odometer?.message}>
              <Input inputMode="numeric" autoComplete="off" {...register('odometer')} />
            </Field>
            <Field label={`${energy} (%)`} error={errors.fuelOrBatteryPct?.message}>
              <Input inputMode="decimal" autoComplete="off" {...register('fuelOrBatteryPct')} />
            </Field>
          </div>
          <Field
            label="Notes (optional)"
            description="Where the readings came from, e.g. the Host’s photo or a phone call."
            error={errors.notes?.message}
          >
            <Textarea rows={2} maxLength={NOTES_MAX} {...register('notes')} />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-ink">Dashboard photo from the Host (optional)</p>
            {photo ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-ink">{photo.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                  <X aria-hidden="true" />
                  Remove
                </Button>
              </div>
            ) : (
              <FileButton
                variant="secondary"
                size="sm"
                className="justify-self-start"
                accept={PHOTO_CONTENT_TYPES.join(',')}
                onFile={choosePhoto}
              >
                <ImagePlus aria-hidden="true" />
                Add a photo
              </FileButton>
            )}
            {photoError && <p className="text-sm text-danger">{photoError}</p>}
          </div>
        </fieldset>
        <Button type="submit" className="justify-self-start" loading={complete.isPending}>
          Complete the trip
        </Button>
      </form>
    </section>
  );
}
