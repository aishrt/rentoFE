import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CircleCheck, CloudOff, Gauge, Hourglass, MailWarning } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Handover, InspectionAngle, InspectionStage } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Stepper, type StepState } from '@/components/ui/stepper';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { resendVerificationRequest } from '@/features/auth/auth-api';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { sessionQueryKey, useSession } from '@/features/auth/use-session';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { ANGLE_LABELS } from '@/features/handover/angles';
import { DamageEditor, type EditablePin } from '@/features/handover/damage-editor';
import { useHandover, useSubmitInspection, type HandoverState } from '@/features/handover/handover-api';
import { PhotoCapture, PhotoStatusBadge } from '@/features/handover/photo-capture';
import { useDeviceLocation } from '@/features/handover/use-device-location';
import {
  photoInput,
  useInspectionPhotos,
  type InspectionPhoto,
} from '@/features/handover/use-inspection-photos';

type Phase =
  { kind: 'photo'; index: number } | { kind: 'readings' } | { kind: 'damage' } | { kind: 'review' };

const STAGE_WORDS: Record<InspectionStage, { title: string; verb: string }> = {
  CHECK_IN: { title: 'Check-in', verb: 'Start the trip' },
  CHECK_OUT: { title: 'Check-out', verb: 'Finish the trip' },
};

/** The booking's own page, for the person doing the inspection. */
const bookingPath = (handover: Handover) =>
  handover.role === 'HOST' ? `/host/bookings/${handover.ref}` : `/trips/${handover.ref}`;
const handoverPath = (handover: Handover) => `${bookingPath(handover)}/handover`;

function NotReady({ handover, stage }: { handover: Handover; stage: InspectionStage }) {
  const done = stage === 'CHECK_IN' ? handover.checkIn : handover.checkOut;
  let title = `${STAGE_WORDS[stage].title} isn’t open`;
  let description = 'This trip isn’t at that point.';
  let icon = <Hourglass />;
  if (done) {
    title = `${STAGE_WORDS[stage].title} is done`;
    description = `Recorded ${formatNzDateTime(done.submittedAt)} (NZ time). You can see the photos and readings on the handover.`;
    icon = <CircleCheck />;
  } else if (stage === 'CHECK_IN' && handover.bookingStatus === 'CONFIRMED') {
    title = 'Check-in opens 2 hours before the trip';
    description = `Come back from ${formatNzDateTime(handover.checkInOpensAt)} (NZ time).`;
  } else if (stage === 'CHECK_OUT' && !handover.checkIn) {
    description = 'Check-out comes after check-in.';
  }
  return (
    <EmptyState
      titleAs="h2"
      className="mx-auto py-10"
      visual={<IconBadge size="xl">{icon}</IconBadge>}
      title={title}
      description={description}
      actions={
        <Button asChild>
          <Link to={done ? handoverPath(handover) : bookingPath(handover)}>
            {done ? 'See the handover' : 'Back to the booking'}
          </Link>
        </Button>
      }
    />
  );
}

/**
 * An unverified Guest confirms their email before the check-in photos (plan §6.1): one tap emails a new
 * link, and the step checks again when they come back from opening it, or when they say they have.
 */
function EmailFirst({
  handover,
  onRecheck,
  rechecking,
}: {
  handover: Handover;
  onRecheck: () => Promise<unknown>;
  rechecking: boolean;
}) {
  const guest = handover.role === 'GUEST';
  const session = useSession();
  const queryClient = useQueryClient();
  const [stillWaiting, setStillWaiting] = useState(false);
  const latestRecheck = useRef(onRecheck);
  useEffect(() => {
    latestRecheck.current = onRecheck;
  });

  const recheck = async () => {
    setStillWaiting(false);
    // The link may have been opened in another tab: the account menu should say so too.
    void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await onRecheck();
    // Still here after the check, so it isn't confirmed yet: once it is, the photos replace this step.
    setStillWaiting(true);
  };

  const resend = useMutation({
    mutationFn: resendVerificationRequest,
    // Nothing to send means it's confirmed already: check again, and the photos open.
    onSuccess: (sent) => {
      if (!sent) void latestRecheck.current();
    },
  });

  // Back from the email app, or from the tab the link opened in: check again without being asked.
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'visible') void latestRecheck.current();
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => document.removeEventListener('visibilitychange', onReturn);
  }, []);

  return (
    <EmptyState
      titleAs="h2"
      className="mx-auto py-10"
      visual={
        <IconBadge size="xl">
          <MailWarning />
        </IconBadge>
      }
      title={guest ? 'Confirm your email first' : 'Your guest needs to confirm their email'}
      description={
        guest
          ? 'Before your first trip starts, please confirm your email address. We’ll email you a link: open it, then come back here.'
          : 'They need to confirm their email address before the trip starts. They can get a new link from their check-in screen.'
      }
      actions={
        guest ? (
          <>
            <Button
              variant={resend.isSuccess ? 'secondary' : 'primary'}
              loading={resend.isPending}
              onClick={() => resend.mutate()}
            >
              {resend.isSuccess ? 'Send it again' : 'Email me the link'}
            </Button>
            <Button
              variant={resend.isSuccess ? 'primary' : 'secondary'}
              loading={rechecking}
              onClick={() => void recheck()}
            >
              I’ve confirmed it
            </Button>
          </>
        ) : (
          <Button variant="secondary" loading={rechecking} onClick={() => void recheck()}>
            Check again
          </Button>
        )
      }
    >
      <div className="mt-5 grid w-full gap-3 text-left empty:hidden">
        {resend.isSuccess && resend.data && (
          <Alert variant="success" role="status">
            We’ve sent a link to {session.data?.email ?? 'your email address'}. Open it, then come back here.
            Links in earlier emails no longer work.
          </Alert>
        )}
        {resend.isError && (
          <Alert variant="danger" role="alert">
            {resend.error instanceof ApiError && resend.error.code === 'RATE_LIMITED'
              ? resend.error.message
              : 'We couldn’t send the email. Please try again in a moment.'}
          </Alert>
        )}
        {stillWaiting && !rechecking && (
          <Alert variant="info" role="status">
            {guest
              ? 'Your email isn’t confirmed yet. Open the link in the email we sent, then try again. Can’t find it? Check your spam folder.'
              : 'It isn’t confirmed yet.'}
          </Alert>
        )}
      </div>
    </EmptyState>
  );
}

function Flow({ handover, stage }: { handover: Handover; stage: InspectionStage }) {
  const navigate = useNavigate();
  const submit = useSubmitInspection(handover.ref);
  const store = useInspectionPhotos(handover.ref, stage);
  // Asked once as the inspection starts; each photo carries it when the person allows it (plan §3).
  const location = useDeviceLocation();
  const angles = handover.requiredAngles.filter((angle) => angle !== 'DAMAGE');
  const [phase, setPhase] = useState<Phase>({ kind: 'photo', index: 0 });
  const [odometer, setOdometer] = useState('');
  const [fuel, setFuel] = useState(() =>
    stage === 'CHECK_OUT' && handover.checkIn ? handover.checkIn.fuelOrBatteryPct : 100,
  );
  const [pins, setPins] = useState<EditablePin[]>([]);
  const [notes, setNotes] = useState('');
  const [accurate, setAccurate] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);

  const photoFor = (angle: InspectionAngle) => store.photos.find((photo) => photo.angle === angle);
  const earlierFor = (angle: InspectionAngle) =>
    stage === 'CHECK_OUT' ? handover.checkIn?.photos.find((photo) => photo.angle === angle) : undefined;
  const damagePhotos = store.photos.filter((photo) => photo.angle === 'DAMAGE');
  const photosTaken = angles.every((angle) => photoFor(angle));
  const odometerValue = Number(odometer.replace(/[,\s]/g, ''));
  const odometerValid = odometer.trim() !== '' && Number.isInteger(odometerValue) && odometerValue >= 0;
  const minimum = stage === 'CHECK_OUT' ? (handover.checkIn?.odometer ?? 0) : 0;
  const energyWord = handover.energy === 'BATTERY' ? 'Battery charge' : 'Fuel';

  const stepState = (done: boolean, reached: boolean): StepState =>
    done ? 'complete' : reached ? 'attention' : 'upcoming';
  const order = phase.kind === 'photo' ? 0 : phase.kind === 'readings' ? 1 : phase.kind === 'damage' ? 2 : 3;
  const steps = [
    { label: 'Photos', state: stepState(photosTaken, order > 0) },
    { label: 'Readings', state: stepState(odometerValid, order > 1) },
    { label: 'Damage', state: stepState(order > 2, false) },
    { label: 'Review', state: 'upcoming' as StepState },
  ];
  const goTo = (index: number) =>
    setPhase(
      index === 0
        ? { kind: 'photo', index: 0 }
        : index === 1
          ? { kind: 'readings' }
          : index === 2
            ? { kind: 'damage' }
            : { kind: 'review' },
    );

  const waiting = store.photos.filter((photo) => !photo.key);
  const ready =
    photosTaken &&
    odometerValid &&
    odometerValue >= minimum &&
    accurate &&
    waiting.length === 0 &&
    !submit.isPending;

  const send = () =>
    submit.mutate(
      {
        stage,
        odometer: odometerValue,
        fuelOrBatteryPct: fuel,
        ...(notes.trim() && { notes: notes.trim() }),
        photos: store.photos
          .filter((photo): photo is InspectionPhoto & { key: string } => Boolean(photo.key))
          .map(photoInput),
        damagePins: pins.map(({ x, y, note }) => ({ x, y, ...(note.trim() && { note: note.trim() }) })),
      },
      {
        onSuccess: () => {
          void store.clear();
          toast(stage === 'CHECK_IN' ? 'Check-in done: enjoy the trip' : 'Check-out done: thanks!', {
            description: 'The other party is asked to review the photos and confirm.',
          });
          // New damage at check-out: the handover offers to open a case with it in one tap (spec §14).
          const newDamage = stage === 'CHECK_OUT' && (pins.length > 0 || damagePhotos.length > 0);
          navigate(handoverPath(handover), {
            replace: true,
            ...(newDamage && { state: { checkOutDamage: true } satisfies HandoverState }),
          });
        },
      },
    );

  return (
    <div className="grid gap-6">
      <Stepper steps={steps} current={order} onSelect={goTo} label={`${STAGE_WORDS[stage].title} steps`} />
      {!store.online && (
        <Alert variant="info" title="You’re offline">
          Keep going: your photos are saved on this device and upload when you’re back online.
        </Alert>
      )}

      <Card className="p-5 sm:p-7">
        {phase.kind === 'photo' && (
          <PhotoCapture
            key={angles[phase.index]}
            angle={angles[phase.index]!}
            position={{ index: phase.index + 1, total: angles.length }}
            photo={photoFor(angles[phase.index]!)}
            earlier={earlierFor(angles[phase.index]!)}
            onTake={(file) => store.add(angles[phase.index]!, file, { replace: true, location })}
          />
        )}

        {phase.kind === 'readings' && (
          <div className="grid gap-6">
            <h2 className="headline text-2xl font-medium">Readings</h2>
            <Field
              label="Odometer (km)"
              description={
                stage === 'CHECK_OUT' && handover.checkIn
                  ? `At check-in: ${handover.checkIn.odometer.toLocaleString('en-NZ')} km`
                  : 'As shown on the dashboard photo.'
              }
              error={readingError ?? undefined}
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                leadingIcon={<Gauge />}
                value={odometer}
                onChange={(event) => {
                  setOdometer(event.target.value);
                  setReadingError(null);
                }}
              />
            </Field>
            <div className="grid gap-3">
              <p className="text-sm font-medium text-ink">
                {energyWord}: <span className="tabular-nums">{fuel}%</span>
              </p>
              <Slider
                value={[fuel]}
                onValueChange={([value]) => setFuel(value ?? fuel)}
                min={0}
                max={100}
                step={5}
                thumbLabels={[`${energyWord} level`]}
                formatValue={(value) => `${value}%`}
              />
              <p className="text-sm text-muted">
                {stage === 'CHECK_OUT'
                  ? handover.fuelPolicy === 'FULL'
                    ? 'This trip’s fuel policy: return it full.'
                    : `This trip’s fuel policy: return it at the same level as check-in (${handover.checkIn?.fuelOrBatteryPct ?? 0}%).`
                  : 'Read it from the gauge on the dashboard.'}
              </p>
            </div>
          </div>
        )}

        {phase.kind === 'damage' && (
          <div className="grid gap-6">
            <h2 className="headline text-2xl font-medium">
              {stage === 'CHECK_IN' ? 'Any damage already?' : 'Any new damage?'}
            </h2>
            <DamageEditor
              kind={stage === 'CHECK_IN' ? 'existing' : 'new'}
              pins={pins}
              onChange={setPins}
              earlier={
                stage === 'CHECK_OUT'
                  ? (handover.checkIn?.damagePins ?? []).map((pin) => ({ ...pin, isNew: false }))
                  : []
              }
            />
            {pins.length > 0 && (
              <div className="grid gap-3 border-t border-line pt-5">
                <p className="text-sm font-medium text-ink">Photos of the damage (optional)</p>
                <div className="flex flex-wrap gap-3">
                  {damagePhotos.map((photo) => (
                    <figure key={photo.id} className="grid w-32 gap-1">
                      <img
                        src={photo.previewUrl}
                        alt="Damage"
                        className="aspect-4/3 rounded-inner object-cover"
                      />
                      <PhotoStatusBadge photo={photo} />
                    </figure>
                  ))}
                </div>
                <PhotoCapture
                  angle="DAMAGE"
                  position={{ index: damagePhotos.length + 1, total: damagePhotos.length + 1 }}
                  onTake={(file) => store.add('DAMAGE', file, { location })}
                />
              </div>
            )}
          </div>
        )}

        {phase.kind === 'review' && (
          <div className="grid gap-6">
            <h2 className="headline text-2xl font-medium">Check and finish</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {angles.map((angle) => {
                const photo = photoFor(angle);
                return (
                  <li key={angle} className="grid gap-1.5">
                    {photo ? (
                      <img
                        src={photo.previewUrl}
                        alt={ANGLE_LABELS[angle]}
                        className="aspect-4/3 rounded-inner object-cover"
                      />
                    ) : (
                      <div className="flex aspect-4/3 items-center justify-center rounded-inner border border-dashed border-danger/50 text-xs text-danger">
                        Missing
                      </div>
                    )}
                    <p className="text-xs font-medium text-ink">{ANGLE_LABELS[angle]}</p>
                    {photo && <PhotoStatusBadge photo={photo} />}
                  </li>
                );
              })}
            </ul>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Odometer</dt>
                <dd className="font-semibold text-ink">
                  {odometerValid ? `${odometerValue.toLocaleString('en-NZ')} km` : 'Not entered'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{energyWord}</dt>
                <dd className="font-semibold text-ink">{fuel}%</dd>
              </div>
              <div>
                <dt className="text-muted">{stage === 'CHECK_IN' ? 'Damage marked' : 'New damage'}</dt>
                <dd className="font-semibold text-ink">{pins.length === 0 ? 'None' : pins.length}</dd>
              </div>
            </dl>
            <Field
              label="Notes (optional)"
              description="Anything else worth recording, such as keys or accessories."
            >
              <Textarea
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            {waiting.length > 0 && (
              <Alert
                variant="info"
                title={`Waiting for ${waiting.length} ${waiting.length === 1 ? 'photo' : 'photos'} to upload`}
              >
                {store.online ? (
                  'This takes a moment on a slow connection.'
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <CloudOff aria-hidden="true" className="size-4" /> They upload when you’re back online.
                  </span>
                )}
              </Alert>
            )}
            <Checkbox
              label="These photos and readings show the car as it is now."
              checked={accurate}
              onChange={(event) => setAccurate(event.target.checked)}
            />
            {submit.isError && (
              <Alert variant="danger" role="alert">
                {submit.error.message}
                {submit.error instanceof ApiError &&
                  submit.error.fields &&
                  Object.values(submit.error.fields).map((message) => <p key={message}>{message}</p>)}
              </Alert>
            )}
          </div>
        )}
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="ghost"
          disabled={phase.kind === 'photo' && phase.index === 0}
          onClick={() => {
            if (phase.kind === 'photo') setPhase({ kind: 'photo', index: Math.max(0, phase.index - 1) });
            else if (phase.kind === 'readings') setPhase({ kind: 'photo', index: angles.length - 1 });
            else if (phase.kind === 'damage') setPhase({ kind: 'readings' });
            else setPhase({ kind: 'damage' });
          }}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        {phase.kind === 'review' ? (
          <Button size="lg" disabled={!ready} loading={submit.isPending} onClick={send}>
            {STAGE_WORDS[stage].verb}
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={phase.kind === 'photo' && !photoFor(angles[phase.index]!)}
            onClick={() => {
              if (phase.kind === 'photo') {
                setPhase(
                  phase.index + 1 < angles.length
                    ? { kind: 'photo', index: phase.index + 1 }
                    : { kind: 'readings' },
                );
              } else if (phase.kind === 'readings') {
                if (!odometerValid) setReadingError('Enter the odometer reading in whole kilometres');
                else if (odometerValue < minimum)
                  setReadingError(
                    `It can’t be lower than at check-in (${minimum.toLocaleString('en-NZ')} km)`,
                  );
                else setPhase({ kind: 'damage' });
              } else {
                setPhase({ kind: 'review' });
              }
            }}
          >
            Next
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Inspection({ bookingRef, stage }: { bookingRef: string; stage: InspectionStage }) {
  const handover = useHandover(bookingRef);
  if (handover.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load this trip"
        action={<Button onClick={() => void handover.refetch()}>Try again</Button>}
      >
        {handover.error.message}
      </Alert>
    );
  }
  if (!handover.data) return <InspectionSkeleton />;
  const data = handover.data;
  const open = stage === 'CHECK_IN' ? data.actions.checkIn : data.actions.checkOut;

  return (
    <div className="grid gap-6">
      <div>
        <BackLink to={bookingPath(data)}>Back to the booking</BackLink>
        <p className="eyebrow mt-4 text-primary">Booking {data.ref}</p>
        <h1 className="headline mt-2 text-title-3 font-medium">{STAGE_WORDS[stage].title}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {stage === 'CHECK_IN'
            ? 'Walk around the car together and photograph each angle. The photos are timestamped and protect you both.'
            : 'Photograph each angle again as you hand the car back. Each photo sits next to the same shot from check-in.'}
        </p>
      </div>
      {stage === 'CHECK_IN' && open && data.emailVerificationNeeded ? (
        <EmailFirst handover={data} onRecheck={() => handover.refetch()} rechecking={handover.isFetching} />
      ) : open ? (
        <Flow handover={data} stage={stage} />
      ) : (
        <NotReady handover={data} stage={stage} />
      )}
    </div>
  );
}

function InspectionSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

function InspectionPage({ stage }: { stage: InspectionStage }) {
  const { ref = '' } = useParams();
  const { pathname } = useLocation();
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title={`${STAGE_WORDS[stage].title} ${ref}`} noindex />
      <RequireSignedIn fallback={<InspectionSkeleton />}>
        {() => <Inspection key={pathname} bookingRef={ref.toUpperCase()} stage={stage} />}
      </RequireSignedIn>
    </Container>
  );
}

/** Check-in (spec §14): timestamped photos of every angle, the odometer, fuel or charge, and damage. */
export function CheckInPage() {
  return <InspectionPage stage="CHECK_IN" />;
}

/** Check-out (spec §14): the same inspection at return, next to the check-in photos. */
export function CheckOutPage() {
  return <InspectionPage stage="CHECK_OUT" />;
}
