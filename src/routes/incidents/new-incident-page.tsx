import { Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { BookingSummary, IncidentType } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ConnectionArcs } from '@/components/brand/patterns/connection-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useBookingDetail, useBookings } from '@/features/booking/booking-api';
import { formatTripSpan } from '@/features/booking/booking-format';
import { usePolicies } from '@/features/content/content-api';
import { EmergencyCall } from '@/features/content/emergency-call';
import { roadsidePhone } from '@/features/content/roadside';
import { ChoiceCards } from '@/features/host/choice-cards';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { useEvidence } from '@/features/incidents/use-evidence';
import { EMERGENCY_TYPES, INCIDENT_TYPES } from '@/features/incidents/incident-labels';
import { useReportIncident } from '@/features/incidents/incidents-api';
import { cn } from '@/lib/cn';

const REPORTABLE: BookingSummary['status'][] = ['CONFIRMED', 'ACTIVE', 'COMPLETED'];

/**
 * Emergency help first, for an accident, theft or breakdown (plan §9, Days 20–21): 111, then the roadside
 * number from the booking's protection plan, or the platform-wide one when the plan has none.
 */
function EmergencyFirst({ type, bookingRef }: { type: IncidentType; bookingRef: string }) {
  const policies = usePolicies();
  const booking = useBookingDetail(bookingRef);
  // Waits for the booking, so the number doesn't change under the visitor's thumb.
  const roadside = booking.isPending ? '' : roadsidePhone(policies.data, booking.data?.protectionPlan?.code);
  return (
    <div className="grid gap-3">
      <EmergencyCall />
      <p className="text-sm text-ink/85">
        {type === 'THEFT'
          ? 'If the car was stolen, report it to the police on 105 (or 111 if it’s happening now), then tell us here with the police reference.'
          : 'If anyone is hurt or in danger, call 111 first. Move somewhere safe, and put your hazard lights on.'}
      </p>
      {type !== 'THEFT' && roadside && (
        <Button asChild variant="secondary" className="justify-self-start">
          <a href={`tel:${roadside}`}>
            <Phone aria-hidden="true" />
            Roadside assistance: {roadside}
          </a>
        </Button>
      )}
    </div>
  );
}

function BookingChoice({ onChoose }: { onChoose: (ref: string) => void }) {
  const guest = useBookings('guest', 'current');
  const guestDone = useBookings('guest', 'completed');
  const host = useBookings('host', 'current');
  const hostDone = useBookings('host', 'completed');
  const loading = [guest, guestDone, host, hostDone].some((query) => query.isPending);
  const bookings = [guest, guestDone, host, hostDone]
    .flatMap((query) => query.data ?? [])
    .filter((booking) => REPORTABLE.includes(booking.status))
    .slice(0, 12);

  if (loading) return <Skeleton aria-hidden="true" className="h-40 rounded-card" />;
  if (bookings.length === 0) {
    return (
      <EmptyState
        className="mx-auto py-8"
        titleAs="h2"
        title="No trips to report on"
        description="Incidents are reported on a confirmed or recent trip. For anything else, contact support."
        actions={
          <Button asChild>
            <Link to="/contact">Contact support</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ChoiceCards
      legend="Which trip is it about?"
      name="booking"
      value=""
      onChange={onChoose}
      columns={1}
      choices={bookings.map((booking) => ({
        value: booking.ref,
        label: booking.vehicle.title,
        description: `${formatTripSpan(booking.start, booking.end)} · ${booking.ref} · with ${booking.otherParty.firstName}`,
      }))}
    />
  );
}

function Report() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const bookingRef = (params.get('booking') ?? '').toUpperCase();
  const preset = INCIDENT_TYPES.find((option) => option.value === params.get('type'))?.value;
  const [type, setType] = useState<IncidentType | ''>(preset ?? '');
  const [description, setDescription] = useState('');
  const [tried, setTried] = useState(false);
  const evidence = useEvidence(bookingRef);
  const report = useReportIncident();

  if (!bookingRef) {
    return (
      <BookingChoice
        onChoose={(ref) => setParams({ booking: ref, ...(preset && { type: preset }) }, { replace: true })}
      />
    );
  }

  const fields = report.error instanceof ApiError ? (report.error.fields ?? {}) : {};
  const send = () => {
    setTried(true);
    if (!type || description.trim().length < 10) return;
    report.mutate(
      { bookingRef, type, description: description.trim(), attachments: evidence.attachments },
      {
        onSuccess: (incident) => {
          evidence.reset();
          toast(`Case ${incident.caseRef} is open`, { description: 'Our support team will be in touch.' });
          navigate(`/incidents/${incident.caseRef}`, { replace: true });
        },
      },
    );
  };

  return (
    <Card className="grid gap-6 p-5 sm:p-7">
      <ChoiceCards
        legend="What happened?"
        name="incident-type"
        value={type}
        onChange={setType}
        columns={2}
        choices={INCIDENT_TYPES.map(({ value, label, description: hint }) => ({
          value,
          label,
          description: hint,
        }))}
        error={tried && !type ? 'Choose what happened' : undefined}
      />
      {type && EMERGENCY_TYPES.includes(type) && <EmergencyFirst type={type} bookingRef={bookingRef} />}
      <Field
        label="Tell us what happened"
        description="Where and when, who was involved, and anything already done about it."
        error={
          (tried && description.trim().length < 10
            ? 'Tell us what happened (at least 10 characters)'
            : undefined) ?? fields.description
        }
      >
        <Textarea
          rows={6}
          maxLength={5000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">Photos and documents (optional)</p>
        <p className="text-sm text-muted">
          Photos of the damage, a police report, a toll or infringement notice, receipts.
        </p>
        <EvidencePicker evidence={evidence} />
      </div>
      {report.isError && (
        <Alert variant="danger" role="alert">
          {report.error.message}
        </Alert>
      )}
      <Button
        size="lg"
        loading={report.isPending}
        disabled={evidence.uploading}
        onClick={send}
        className="justify-self-start"
      >
        Send report
      </Button>
    </Card>
  );
}

/** Reporting damage or an incident on a trip (spec §15), with emergency guidance first where it matters. */
export function NewIncidentPage() {
  const [params] = useSearchParams();
  const bookingRef = params.get('booking');
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={ConnectionArcs} />
      <PageMeta title="Report an incident" noindex />
      <div className="grid gap-6">
        <div>
          {/* Guests and Hosts both come here from a booking, so Back returns to the page they came from. */}
          <BackLink to={bookingRef ? `/trips/${bookingRef}` : '/account/support'} previous>
            Back
          </BackLink>
          {bookingRef && <p className="eyebrow mt-4 text-primary">Booking {bookingRef.toUpperCase()}</p>}
          <h1 className={cn('headline text-title-3 font-medium', bookingRef ? 'mt-2' : 'mt-4')}>
            Report an incident
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Damage, an accident, a breakdown or anything else on a trip. You’ll get a case number, and our
            support team keeps you and the other side updated.
          </p>
        </div>
        <RequireSignedIn fallback={<Skeleton aria-hidden="true" className="h-96 rounded-card" />}>
          {() => <Report />}
        </RequireSignedIn>
      </div>
    </Container>
  );
}
