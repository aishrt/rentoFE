import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Incident, IncidentEvent } from '@/api/types';
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
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzDateTime, formatNzd } from '@/features/booking/booking-format';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { useEvidence } from '@/features/incidents/use-evidence';
import { INCIDENT_STATUS_LABELS, incidentTypeLabel } from '@/features/incidents/incident-labels';
import { useIncident, useReplyToIncident } from '@/features/incidents/incidents-api';
import { cn } from '@/lib/cn';

const ACTION_WORDS: Record<string, string> = {
  OPENED: 'reported it',
  COMMENT: 'added an update',
  STATUS: 'changed the status',
  ASSIGNED: 'took the case',
  CHARGE_ADDED: 'added a charge',
};

function EventItem({ event }: { event: IncidentEvent }) {
  const support = event.by === 'SUPPORT';
  return (
    <li className="relative grid gap-2 pb-6 pl-6 before:absolute before:top-2 before:bottom-0 before:left-[5px] before:w-px before:bg-line last:pb-0 last:before:hidden">
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 left-0 size-3 rounded-full ring-4 ring-surface',
          support ? 'bg-primary' : 'bg-ink/40',
        )}
      />
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{event.by === 'YOU' ? 'You' : event.byName}</span>{' '}
        {ACTION_WORDS[event.action] ?? 'updated the case'}
        {event.status && (
          <>
            {': '}
            <span className="font-medium text-ink">{INCIDENT_STATUS_LABELS[event.status].label}</span>
          </>
        )}{' '}
        · <time dateTime={event.createdAt}>{formatNzDateTime(event.createdAt)}</time>
        {event.visibility !== 'BOTH' && <span className="ml-1 text-xs">(only you can see this)</span>}
      </p>
      {event.note && <p className="whitespace-pre-wrap text-ink/90">{event.note}</p>}
      {event.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {event.attachments.map((file, index) => (
            <li key={file.url}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {file.contentType?.startsWith('image/') || !file.contentType ? (
                  <img
                    src={file.url}
                    alt={file.name ?? `File ${index + 1}`}
                    className="aspect-4/3 w-32 rounded-inner bg-canvas object-cover"
                  />
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-inner border border-line px-3 py-2 text-sm text-ink">
                    <FileText aria-hidden="true" className="size-4 text-muted" />
                    {file.name ?? 'Document'}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Reply({ incident }: { incident: Incident }) {
  const reply = useReplyToIncident(incident.caseRef);
  const evidence = useEvidence(incident.bookingRef);
  const [note, setNote] = useState('');
  const send = () =>
    reply.mutate(
      { note: note.trim(), attachments: evidence.attachments },
      {
        onSuccess: () => {
          setNote('');
          evidence.reset();
        },
      },
    );
  return (
    <Card className="grid gap-4 p-5 sm:p-6">
      <Field label="Add an update" description="The other side and our support team see it.">
        <Textarea rows={3} maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <EvidencePicker evidence={evidence} />
      {reply.isError && (
        <Alert variant="danger" role="alert">
          {reply.error.message}
        </Alert>
      )}
      <Button
        className="justify-self-start"
        loading={reply.isPending}
        disabled={evidence.uploading || (!note.trim() && evidence.attachments.length === 0)}
        onClick={send}
      >
        Send update
      </Button>
    </Card>
  );
}

function Case({ caseRef }: { caseRef: string }) {
  const incident = useIncident(caseRef);
  if (incident.isError) {
    const missing = incident.error instanceof ApiError && incident.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        title={missing ? 'We couldn’t find that case' : 'We couldn’t load this case'}
        description={
          missing ? 'Check the case number, or find it under Help and support.' : incident.error.message
        }
        actions={
          <Button asChild>
            <Link to="/account/support">Help and support</Link>
          </Button>
        }
      />
    );
  }
  if (!incident.data) return <CaseSkeleton />;
  const data = incident.data;
  const bookingPath =
    data.role === 'HOST' ? `/host/bookings/${data.bookingRef}` : `/trips/${data.bookingRef}`;

  return (
    <div className="grid gap-6">
      <div>
        <BackLink to="/account/support">Help and support</BackLink>
        <p className="eyebrow mt-4 text-primary">Case {data.caseRef}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="headline text-title-3 font-medium">{incidentTypeLabel(data.type)}</h1>
          <StatusBadge status={INCIDENT_STATUS_LABELS[data.status]} />
        </div>
        <p className="mt-2 text-muted">
          <Link to={bookingPath} className="link-underline text-primary">
            {data.vehicleTitle}, {data.bookingRef}
          </Link>{' '}
          · Reported {formatNzDateTime(data.createdAt)}
        </p>
      </div>

      {data.status === 'AWAITING_RESPONSE' && (
        <Alert variant="info" title="Our team is waiting for you">
          Please read the latest update and reply below.
        </Alert>
      )}
      {data.extraCharges.length > 0 && (
        <Card className="grid gap-2 p-5 text-sm sm:p-6">
          <p className="font-semibold text-ink">Charges from this case</p>
          {data.extraCharges.map((charge) => (
            <p key={charge.description} className="flex justify-between gap-3 text-ink/85">
              <span>{charge.description}</span>
              <span className="font-medium tabular-nums">{formatNzd(charge.amountCents)}</span>
            </p>
          ))}
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-ink">History</h2>
        <ol>
          {data.events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </ol>
      </Card>

      {data.canReply ? (
        <Reply incident={data} />
      ) : (
        <p className="text-sm text-muted">
          This case is {data.status.toLowerCase()}. To reopen it,{' '}
          <Link
            to={`/contact?category=SAFETY&booking=${data.bookingRef}`}
            className="link-underline text-primary"
          >
            contact support
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function CaseSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

/** One incident case (spec §15, plan §12.6): case number and status, the history, and a reply box. */
export function IncidentPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={ConnectionArcs} />
      <PageMeta title={`Case ${ref}`} noindex />
      <RequireSignedIn fallback={<CaseSkeleton />}>
        {() => <Case key={ref} caseRef={ref.toUpperCase()} />}
      </RequireSignedIn>
    </Container>
  );
}
