import { CarFront, CircleCheck, Clock, Flag, Gauge, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import type { ConditionReport, Handover, InspectionStage } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzDateTime, formatNzd } from '@/features/booking/booking-format';
import { ANGLE_LABELS, takenLabel } from '@/features/handover/angles';
import { areaName } from '@/features/handover/car-areas';
import { CarDiagram } from '@/features/handover/car-diagram';
import { DamageEditor, type EditablePin } from '@/features/handover/damage-editor';
import {
  checkInClosed,
  supportPath,
  UPLOADING_AGAIN,
  uploadsGone,
  useConfirmInspection,
  useFlagDamage,
  useHandover,
  type HandoverState,
} from '@/features/handover/handover-api';
import { PhotoCapture, PhotoStatusBadge } from '@/features/handover/photo-capture';
import { PhotoDateNote } from '@/features/handover/photo-date-note';
import {
  photoInput,
  useForgetRecordedPhotos,
  useInspectionPhotos,
} from '@/features/handover/use-inspection-photos';
import { useReportIncident } from '@/features/incidents/incidents-api';

const WHO: Record<ConditionReport['submittedBy'], string> = {
  GUEST: 'the guest',
  HOST: 'the host',
  STAFF: 'Rento Vroom support',
};

const bookingPath = (handover: Handover) =>
  handover.role === 'HOST' ? `/host/bookings/${handover.ref}` : `/trips/${handover.ref}`;

/**
 * Where the extra kilometres stand (plan §8.2): waiting for the other party to confirm the check-out readings
 * or the damage-report window to close, being checked by our team, or charged.
 */
function extraKmLine(handover: Handover, km: NonNullable<Handover['kilometres']>): string {
  const guest = handover.role === 'GUEST';
  const card = guest ? 'your saved card' : 'the guest’s saved card';
  const standing = handover.extraKmStatus;
  const cents = standing?.status === 'CHARGED' ? standing.amountCents : km.extraChargeCents;
  const amount = `${km.extra.toLocaleString('en-NZ')} extra km: ${formatNzd(cents)}`;
  switch (standing?.status) {
    case 'WAITING': {
      if (!standing.chargeAt || new Date(standing.chargeAt) <= new Date()) {
        return `${amount}, charged to ${card} shortly.`;
      }
      const on = `on ${formatNzDateTime(standing.chargeAt)} (NZ time)`;
      if (!standing.waitingFor) return `${amount}, charged to ${card} ${on}.`;
      const who =
        standing.waitingFor === handover.role ? 'you confirm' : `the ${guest ? 'host' : 'guest'} confirms`;
      return `${amount}, charged to ${card} once ${who} the readings, or ${on}.`;
    }
    case 'CHECKING':
      return `${amount}. Our team is checking the readings before it’s charged.`;
    case 'CHARGED':
      if (standing.chargeStatus === 'PAID') return `${amount}, paid with ${card}.`;
      if (standing.chargeStatus === 'NOT_PAID') {
        return guest
          ? `${amount}. We couldn’t charge it to a saved card: see Extra charges on your trip to pay it.`
          : `${amount}. We couldn’t charge the guest’s card yet, so it isn’t paid.`;
      }
      return `${amount}, being charged to ${card}.`;
    case 'NOT_CHARGED':
      return `${amount}, not charged.`;
    default:
      return `${amount}, charged to ${card} once the readings are confirmed.`;
  }
}

function ConfirmationLine({ report }: { report: ConditionReport }) {
  const parties = [
    { label: 'Guest', at: report.confirmedByGuestAt },
    { label: 'Host', at: report.confirmedByHostAt },
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {parties.map((party) => (
        <li key={party.label}>
          {party.at ? (
            <Badge variant="primary">
              <CircleCheck aria-hidden="true" />
              {party.label} confirmed
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock aria-hidden="true" />
              {party.label} to confirm
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function ReportSection({
  handover,
  report,
  earlier,
}: {
  handover: Handover;
  report: ConditionReport;
  earlier?: ConditionReport | null;
}) {
  const confirm = useConfirmInspection(handover.ref);
  const stage = report.stage;
  const canConfirm =
    stage === 'CHECK_IN' ? handover.actions.confirmCheckIn : handover.actions.confirmCheckOut;
  const title = stage === 'CHECK_IN' ? 'Check-in' : 'Check-out';
  const energy = handover.energy === 'BATTERY' ? 'Battery' : 'Fuel';
  const pins = [
    ...(stage === 'CHECK_OUT' && earlier ? earlier.damagePins.map((pin) => ({ ...pin, isNew: false })) : []),
    ...report.damagePins.map((pin) => ({ ...pin, isNew: pin.newDamage })),
  ];
  const angles = handover.requiredAngles.filter((angle) => angle !== 'DAMAGE');
  const extra = report.photos.filter((photo) => photo.angle === 'DAMAGE');

  return (
    <section aria-labelledby={`${stage}-title`} className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={`${stage}-title`} className="headline text-2xl font-medium">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            By {WHO[report.submittedBy]}, {formatNzDateTime(report.submittedAt)} (NZ time)
          </p>
        </div>
        <ConfirmationLine report={report} />
      </div>

      {canConfirm && (
        <Alert
          variant="info"
          title={`Please review the ${title.toLowerCase()}`}
          action={
            <Button
              size="sm"
              loading={confirm.isPending}
              onClick={() => confirm.mutate(stage as InspectionStage)}
            >
              Confirm it’s right
            </Button>
          }
        >
          Check the photos and readings below. If something isn’t right, don’t confirm: message the other
          party or contact support.
        </Alert>
      )}
      {/* Refused because the page was out of date, the handover loads again (useHandoverMutation). */}
      {confirm.isError && (
        <Alert variant="danger" role="alert" title="We couldn’t confirm it">
          {confirm.error.message}
        </Alert>
      )}

      <Card className="grid gap-6 p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <Gauge aria-hidden="true" className="size-4" /> Odometer
            </dt>
            <dd className="font-semibold text-ink">{report.odometer.toLocaleString('en-NZ')} km</dd>
          </div>
          <div>
            <dt className="text-muted">{energy}</dt>
            <dd className="font-semibold text-ink">{report.fuelOrBatteryPct}%</dd>
          </div>
          {report.notes && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-muted">Notes</dt>
              <dd className="text-ink">{report.notes}</dd>
            </div>
          )}
        </dl>

        <div className="grid items-start gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
          <CarDiagram pins={pins} />
          {pins.length === 0 ? (
            <p className="text-sm text-muted">No damage was marked.</p>
          ) : (
            <ol className="grid gap-2 text-sm">
              {pins.map((pin, index) => (
                <li key={pin.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${pin.isNew ? 'bg-danger' : 'bg-ink/55'}`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="font-medium text-ink">{areaName(pin.x, pin.y)}</span>
                    {pin.isNew && <span className="text-danger"> (new)</span>}
                    {pin.note && <span className="text-ink/80">: {pin.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {angles.map((angle) => {
            const photo = report.photos.find((candidate) => candidate.angle === angle);
            const before =
              stage === 'CHECK_OUT'
                ? earlier?.photos.find((candidate) => candidate.angle === angle)
                : undefined;
            if (!photo && !before) return null;
            return (
              <li key={angle} className="grid gap-2">
                <p className="text-sm font-medium text-ink">{ANGLE_LABELS[angle]}</p>
                <div className={before ? 'grid grid-cols-2 gap-2' : 'grid'}>
                  {before && (
                    <figure className="grid gap-1">
                      <a href={before.url} target="_blank" rel="noreferrer">
                        <img
                          src={before.url}
                          alt={`${ANGLE_LABELS[angle]} at check-in`}
                          className="aspect-4/3 w-full rounded-inner bg-canvas object-cover"
                        />
                      </a>
                      <figcaption className="grid gap-1 text-xs text-muted">
                        <span>Check-in</span>
                        <PhotoDateNote photo={before} />
                      </figcaption>
                    </figure>
                  )}
                  {photo ? (
                    <figure className="grid gap-1">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.url}
                          alt={`${ANGLE_LABELS[angle]} at ${title.toLowerCase()}`}
                          className="aspect-4/3 w-full rounded-inner bg-canvas object-cover"
                        />
                      </a>
                      <figcaption className="grid gap-1 text-xs text-muted">
                        <span>{takenLabel(photo.takenAt)}</span>
                        <PhotoDateNote photo={photo} />
                      </figcaption>
                    </figure>
                  ) : (
                    <p className="text-xs text-muted">No photo</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {extra.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-ink">Damage photos</p>
            <ul className="flex flex-wrap gap-3">
              {/* By position: a photo's link changes now and then, the photo doesn't. */}
              {extra.map((photo, index) => (
                <li key={index} className="w-40">
                  <a href={photo.url} target="_blank" rel="noreferrer">
                    <img
                      src={photo.url}
                      alt="Damage"
                      className="aspect-4/3 w-full rounded-inner object-cover"
                    />
                  </a>
                  <p className="mt-1 text-xs text-muted">{takenLabel(photo.takenAt)}</p>
                  <PhotoDateNote photo={photo} className="mt-1" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  );
}

/**
 * After flagging, or a check-out that recorded new damage: one tap opens a damage case with what's on the
 * check-out record (its marks, notes and photos), and goes to it. The API keeps to the damage-report window
 * and takes only damage no case has yet.
 */
function DamageFlaggedContent({
  bookingRef,
  title = 'New damage flagged',
}: {
  bookingRef: string;
  title?: string;
}) {
  const navigate = useNavigate();
  const report = useReportIncident();
  const open = () =>
    report.mutate(
      { bookingRef, type: 'DAMAGE', fromCheckOutDamage: true, attachments: [] },
      {
        onSuccess: (incident) => {
          toast(`Case ${incident.caseRef} is open`, { description: 'Our support team will be in touch.' });
          navigate(`/incidents/${incident.caseRef}`);
        },
      },
    );

  return (
    <DialogContent title={title} description="It’s on the check-out record, where you can both see it.">
      <p className="text-ink/85">
        To claim for it or get help from support, open an incident with this damage. We’ll add the marks,
        notes and photos from the check-out record, so you don’t need to describe it again.
      </p>
      {report.isError && (
        <Alert variant="danger" role="alert" className="mt-4">
          {report.error.message}
        </Alert>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="secondary">Not now</Button>
        </DialogClose>
        <Button loading={report.isPending} onClick={open}>
          Open an incident with this damage
        </Button>
      </div>
    </DialogContent>
  );
}

function FlagDamageDialogContent({ handover }: { handover: Handover }) {
  const flag = useFlagDamage(handover.ref);
  // Kept apart from the check-out's own photos, so only what's shown here is sent.
  const store = useInspectionPhotos(handover.ref, 'FLAGGED_DAMAGE');
  const [pins, setPins] = useState<EditablePin[]>([]);
  const [note, setNote] = useState('');
  const [flagged, setFlagged] = useState(false);
  const damagePhotos = store.photos.filter((photo) => photo.angle === 'DAMAGE');
  const uploading = damagePhotos.some((photo) => !photo.key);

  const send = () =>
    flag.mutate(
      {
        damagePins: pins.map(({ x, y, note: pinNote }) => ({
          x,
          y,
          ...(pinNote.trim() && { note: pinNote.trim() }),
        })),
        photos: damagePhotos
          .filter((photo): photo is typeof photo & { key: string } => Boolean(photo.key))
          .map(photoInput),
        ...(note.trim() && { note: note.trim() }),
      },
      {
        onSuccess: () => {
          void store.clear();
          setFlagged(true);
        },
        onError: (error) => {
          if (uploadsGone(error)) void store.uploadAgain();
        },
      },
    );

  if (flagged) return <DamageFlaggedContent bookingRef={handover.ref} />;

  return (
    <DialogContent
      title="Flag new damage"
      description="Mark where it is on the car and add a photo. It’s added to the check-out record."
      className="w-[min(94vw,46rem)]"
    >
      <div className="grid gap-5">
        <DamageEditor
          kind="new"
          pins={pins}
          onChange={setPins}
          earlier={[...(handover.checkIn?.damagePins ?? []), ...(handover.checkOut?.damagePins ?? [])].map(
            (pin) => ({ ...pin, isNew: pin.newDamage }),
          )}
        />
        {damagePhotos.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm text-ink">
              {damagePhotos.length === 1
                ? 'This photo is sent with the damage.'
                : `These ${damagePhotos.length} photos are sent with the damage.`}{' '}
              Remove any you don’t want to send.
            </p>
            <ul aria-label="Photos to send" className="flex flex-wrap gap-3">
              {damagePhotos.map((photo, index) => (
                <li key={photo.id} className="grid w-32 gap-1.5">
                  <img
                    src={photo.previewUrl}
                    alt={`Damage photo ${index + 1}`}
                    className="aspect-4/3 rounded-inner object-cover"
                  />
                  <PhotoStatusBadge photo={photo} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start text-danger"
                    aria-label={`Remove damage photo ${index + 1}`}
                    onClick={() => void store.remove(photo.id)}
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <PhotoCapture
          angle="DAMAGE"
          position={{ index: damagePhotos.length + 1, total: damagePhotos.length + 1 }}
          onTake={(file) => store.add('DAMAGE', file)}
        />
        <Field label="What happened? (optional)">
          <Textarea
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {flag.isError && (
          <Alert variant="danger" role="alert">
            {uploadsGone(flag.error) ? UPLOADING_AGAIN : flag.error.message}
          </Alert>
        )}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button disabled={pins.length === 0 || uploading} loading={flag.isPending} onClick={send}>
          Flag damage
        </Button>
      </div>
    </DialogContent>
  );
}

function HandoverView({ bookingRef }: { bookingRef: string }) {
  const handover = useHandover(bookingRef);
  useForgetRecordedPhotos(handover.data);
  const [flagging, setFlagging] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Straight after a check-out that recorded new damage: offer the case right away (spec §14).
  const [offerCase, setOfferCase] = useState(
    () => (location.state as HandoverState | null)?.checkOutDamage === true,
  );
  const closeOffer = (open: boolean) => {
    if (open) return;
    setOfferCase(false);
    // Not offered again on a reload.
    void navigate(location.pathname, { replace: true, state: null });
  };
  if (handover.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load the handover"
        action={<Button onClick={() => void handover.refetch()}>Try again</Button>}
      >
        {handover.error.message}
      </Alert>
    );
  }
  if (!handover.data) return <HandoverSkeleton />;
  const data = handover.data;
  const base = bookingPath(data);
  const km = data.kilometres;
  const newCheckOutDamage = Boolean(
    data.checkOut?.damagePins.some((pin) => pin.newDamage) ||
    data.checkOut?.photos.some((photo) => photo.angle === 'DAMAGE'),
  );

  return (
    <div className="grid gap-8">
      <div>
        <BackLink to={base}>Back to the booking</BackLink>
        <p className="eyebrow mt-4 text-primary">Booking {data.ref}</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Handover</h1>
        <p className="mt-2 max-w-2xl text-muted">
          The car’s condition at check-in and check-out: timestamped photos, readings and damage, confirmed by
          both of you.
        </p>
      </div>

      {(data.actions.checkIn || data.actions.checkOut) && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-ink">
            {data.actions.checkIn
              ? 'Ready to go? Do the check-in together before driving away.'
              : 'Bringing the car back? Do the check-out together when you hand it over.'}
            {data.actions.checkOut && !data.checkIn && (
              // Support marked the trip as started without a check-in (plan §8.2).
              <span className="mt-1 block text-sm text-muted">
                There’s no check-in record to compare with, so the check-out photos and readings are the
                record of how the car came back.
              </span>
            )}
          </p>
          <Button asChild>
            <Link to={`${base}/${data.actions.checkIn ? 'check-in' : 'check-out'}`}>
              {data.actions.checkIn ? 'Start check-in' : 'Start check-out'}
            </Link>
          </Button>
        </Card>
      )}

      {!data.checkIn &&
        !data.checkOut &&
        !data.actions.checkIn &&
        !data.actions.checkOut &&
        (checkInClosed(data) ? (
          <EmptyState
            className="mx-auto py-6"
            titleAs="h2"
            visual={
              <IconBadge size="xl">
                <CarFront />
              </IconBadge>
            }
            title="Check-in has closed"
            description="The trip’s end time has passed without a check-in. Please contact support and we’ll sort out the booking."
            actions={
              <Button asChild>
                <Link to={supportPath(data)}>Contact support</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            className="mx-auto py-6"
            titleAs="h2"
            visual={
              <IconBadge size="xl">
                <CarFront />
              </IconBadge>
            }
            title="No handover yet"
            description={`Check-in opens ${formatNzDateTime(data.checkInOpensAt)} (NZ time), 2 hours before the trip.`}
          />
        ))}

      {data.checkOut && (
        <>
          {km && (
            <Card className="grid gap-2 p-5 text-sm sm:p-6">
              <p className="font-semibold text-ink">
                {km.driven.toLocaleString('en-NZ')} km driven
                {km.allowance === null
                  ? ' (unlimited kilometres)'
                  : ` of ${km.allowance.toLocaleString('en-NZ')} km included`}
              </p>
              {km.extra > 0 && <p className="text-ink/85">{extraKmLine(data, km)}</p>}
              {data.fuelShortfall && (
                <p className="flex items-start gap-2 text-ink/85">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
                  {data.fuelPolicy === 'FULL'
                    ? 'The car came back with less than a full tank or charge.'
                    : 'The car came back with less fuel or charge than at check-in.'}
                </p>
              )}
            </Card>
          )}
          {data.actions.flagDamage && (
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="text-sm text-ink/85">
                {/* Either party, until the damage-report window closes (plan §8.2). */}
                {data.damageWindowEndsAt
                  ? `Found new damage? You can flag it until ${formatNzDateTime(data.damageWindowEndsAt)} (NZ time).`
                  : 'Found new damage? Flag it here.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setFlagging(true)}>
                  <Flag aria-hidden="true" />
                  Flag new damage
                </Button>
                <Button asChild variant="ghost">
                  <Link to={`/incidents/new?booking=${data.ref}&type=DAMAGE`}>Report an incident</Link>
                </Button>
              </div>
            </Card>
          )}
          <ReportSection handover={data} report={data.checkOut} earlier={data.checkIn} />
        </>
      )}
      {data.checkIn && <ReportSection handover={data} report={data.checkIn} />}

      <Dialog open={flagging} onOpenChange={setFlagging}>
        {flagging && <FlagDamageDialogContent handover={data} />}
      </Dialog>
      <Dialog open={offerCase && newCheckOutDamage} onOpenChange={closeOffer}>
        {offerCase && newCheckOutDamage && (
          <DamageFlaggedContent bookingRef={data.ref} title="Your check-out recorded new damage" />
        )}
      </Dialog>
    </div>
  );
}

function HandoverSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

/** The handover (spec §14): both condition reports, confirmed by the Guest and the Host. */
export function HandoverPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="max-w-4xl py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title={`Handover ${ref}`} noindex />
      <RequireSignedIn fallback={<HandoverSkeleton />}>
        {() => <HandoverView key={ref} bookingRef={ref.toUpperCase()} />}
      </RequireSignedIn>
    </Container>
  );
}
