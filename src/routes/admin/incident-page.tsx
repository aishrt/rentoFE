import { MessagesSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Incident } from '@/api/types';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { threadPath } from '@/features/admin/bookings/bookings-api';
import { useAdminIncident } from '@/features/admin/operations/operations-api';
import { IncidentCharges } from '@/features/admin/operations/incident-charges';
import { AttachmentList, CaseTimeline } from '@/features/admin/operations/incident-timeline';
import { IncidentUpdateForm } from '@/features/admin/operations/incident-update-form';
import { REPORTED_BY_LABELS, STAFF_INCIDENT_STATUS } from '@/features/admin/operations/operations-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, LoadError } from '@/features/admin/ops/query-feedback';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { incidentTypeLabel } from '@/features/incidents/incident-labels';

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{term}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

/** Status, booking, who reported it and who has it, and the way into the booking's messages. */
function CaseFacts({ incident }: { incident: Incident }) {
  const reporter = incident.events.find((event) => event.action === 'OPENED');
  const role = REPORTED_BY_LABELS[incident.reportedBy];
  return (
    <Card asChild className="p-5 sm:p-6">
      <section aria-labelledby="case-facts-title">
        <h2 id="case-facts-title" className="font-semibold text-ink">
          The case
        </h2>
        <dl className="mt-4 grid gap-4 text-sm">
          <Fact term="Status">
            <StatusBadge status={STAFF_INCIDENT_STATUS[incident.status]} />
          </Fact>
          <Fact term="Type">{incidentTypeLabel(incident.type)}</Fact>
          <Fact term="Booking">
            <Link
              to={`/admin/bookings/${incident.bookingRef}`}
              className="rounded-inner font-medium text-primary hover:underline"
            >
              {incident.bookingRef}
            </Link>
            <span className="block text-muted">{incident.vehicleTitle}</span>
          </Fact>
          <Fact term="Reported by">{reporter ? `${reporter.byName} (${role})` : role}</Fact>
          <Fact term="Handled by">
            {incident.assignedTo ?? <span className="text-muted">Nobody yet</span>}
          </Fact>
          <Fact term="Reported">
            <time dateTime={incident.createdAt}>{formatNzDateTime(incident.createdAt)}</time>
          </Fact>
          <Fact term="Last update">
            <time dateTime={incident.updatedAt}>{formatNzDateTime(incident.updatedAt)}</time>
          </Fact>
        </dl>
        <div className="mt-5 border-t border-line pt-5">
          <Button asChild variant="secondary" size="sm">
            <Link to={threadPath(incident.bookingRef, 'INCIDENT', incident.caseRef)}>
              <MessagesSquare aria-hidden="true" />
              Messages
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted">
            The Guest and Host’s messages for this booking. Opening them is recorded in the audit log.
          </p>
        </div>
      </section>
    </Card>
  );
}

function CaseView({ incident }: { incident: Incident }) {
  const evidence = incident.events.flatMap((event) => event.attachments);
  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-6">
        <Card asChild className="p-5 sm:p-6">
          <section aria-labelledby="case-report-title">
            <h2 id="case-report-title" className="font-semibold text-ink">
              What happened
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-ink/90">{incident.description}</p>
            <h3 className="mt-5 text-sm font-semibold text-ink">Evidence</h3>
            <div className="mt-2">
              {evidence.length > 0 ? (
                <AttachmentList files={evidence} label="Evidence" size="md" />
              ) : (
                <p className="text-sm text-muted">No photos or documents yet.</p>
              )}
            </div>
          </section>
        </Card>

        <Card asChild className="p-5 sm:p-6">
          <section aria-labelledby="case-history-title">
            <h2 id="case-history-title" className="mb-4 font-semibold text-ink">
              History
            </h2>
            <CaseTimeline incident={incident} />
          </section>
        </Card>

        <IncidentUpdateForm incident={incident} />
      </div>

      <div className="grid min-w-0 gap-6">
        <CaseFacts incident={incident} />
        <IncidentCharges incident={incident} />
      </div>
    </div>
  );
}

function CaseSkeleton() {
  return (
    <div aria-busy="true" className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <span className="sr-only">Loading the case</span>
      <Skeleton className="h-96 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

/**
 * One incident case for staff (spec §15, plan §12.6): the report and its evidence, every event including
 * internal notes, an update form, and charges once the case is resolved.
 */
export function AdminIncidentPage() {
  const { ref = '' } = useParams();
  const caseRef = ref.toUpperCase();
  const incident = useAdminIncident(caseRef);
  const missing = incident.error instanceof ApiError && incident.error.status === 404;

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to="/admin/incidents" previous className="mb-4">
        Incidents &amp; disputes
      </BackLink>
      <AdminPageHeader
        eyebrow="Operations"
        title={`Case ${caseRef}`}
        description={
          incident.data && `${incidentTypeLabel(incident.data.type)} · ${incident.data.vehicleTitle}`
        }
      />

      {incident.isPending && <CaseSkeleton />}

      {missing && (
        <EmptyList
          title="We couldn’t find that case"
          description="Check the case number, or find it in the list of cases."
        />
      )}

      {incident.isError && !missing && (
        <div className="mt-8">
          <LoadError
            title="We couldn’t load this case"
            error={incident.error}
            onRetry={() => incident.refetch()}
            retrying={incident.isFetching}
          />
        </div>
      )}

      {incident.data && <CaseView key={incident.data.caseRef} incident={incident.data} />}
    </div>
  );
}
