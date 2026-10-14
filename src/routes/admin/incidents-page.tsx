import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { IncidentStatus } from '@/api/types';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { OpenCaseButton } from '@/features/admin/operations/open-case-dialog';
import { pageFrom } from '@/features/admin/finance/finance-api';
import { INCIDENTS_PAGE_SIZE, useAdminIncidents } from '@/features/admin/operations/operations-api';
import {
  INCIDENT_STATUSES,
  REPORTED_BY_LABELS,
  STAFF_INCIDENT_STATUS,
} from '@/features/admin/operations/operations-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { DataTable, MAX_PAGE, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { incidentTypeLabel } from '@/features/incidents/incident-labels';
import { formatNumber } from '@/lib/format';

const TAB_PREFIX = 'incidents';

type Tab = IncidentStatus | 'ALL_OPEN';

const TABS: readonly TabOption<Tab>[] = [
  { value: 'ALL_OPEN', label: 'All open' },
  ...INCIDENT_STATUSES.map((status) => ({ value: status, label: STAFF_INCIDENT_STATUS[status].label })),
];

/** The tab is in the address (?status=resolved), so a link can open it. */
const tabFrom = (value: string | null): Tab =>
  TABS.find((tab) => tab.value !== 'ALL_OPEN' && tab.value === value?.toUpperCase())?.value ?? 'ALL_OPEN';

const EMPTY: Record<Tab, { title: string; description: string }> = {
  ALL_OPEN: {
    title: 'No open cases',
    description: 'Incidents and disputes Guests and Hosts report appear here until they’re resolved.',
  },
  OPEN: { title: 'No new cases', description: 'Cases nobody has looked at yet appear here.' },
  INVESTIGATING: {
    title: 'Nothing being investigated',
    description: 'Cases you’re looking into appear here.',
  },
  AWAITING_RESPONSE: {
    title: 'Nobody to wait on',
    description: 'Cases waiting for the Guest or Host to reply appear here.',
  },
  RESOLVED: { title: 'No resolved cases', description: 'Resolved cases appear here.' },
  CLOSED: { title: 'No closed cases', description: 'Closed cases appear here.' },
};

/** The address for a tab and page; the first tab and page 1 aren't written. */
const addressOf = (tab: Tab, page: number) => ({
  ...(tab !== 'ALL_OPEN' && { status: tab.toLowerCase() }),
  ...(page > 1 && { page: String(page) }),
});

/**
 * Incidents and disputes (spec §15, plan §12.6): the cases Guests and Hosts report, every open one first,
 * most recently updated at the top. Each opens to its history and the staff tools.
 */
export function AdminIncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFrom(searchParams.get('status'));
  const page = Math.min(MAX_PAGE, pageFrom(searchParams.get('page')));
  const incidents = useAdminIncidents(tab === 'ALL_OPEN' ? undefined : tab, page);
  const cases = incidents.data?.incidents;

  // The tab and page are in the address (?status=resolved&page=2); a new tab starts at page 1.
  const show = (next: Tab, nextPage = 1) => setSearchParams(addressOf(next, nextPage), { replace: true });
  const changeTab = (next: Tab) => show(next);

  // Cases resolved meanwhile can empty a later page: go back to the last page there is.
  const lastPage = Math.min(
    MAX_PAGE,
    Math.max(1, Math.ceil((incidents.data?.total ?? 0) / INCIDENTS_PAGE_SIZE)),
  );
  const pastTheEnd = cases?.length === 0 && !incidents.isPlaceholderData && page > lastPage;
  useEffect(() => {
    if (pastTheEnd) setSearchParams(addressOf(tab, lastPage), { replace: true });
  }, [pastTheEnd, tab, lastPage, setSearchParams]);
  // While another page loads, an empty one shows grey rows rather than "No cases".
  const loading = incidents.isPending || pastTheEnd || (incidents.isPlaceholderData && cases?.length === 0);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Operations"
        title="Incidents & disputes"
        description="Damage, breakdowns, late returns and disagreements reported by Guests and Hosts, or opened by the team. Open a case to update it, change its status or charge the Guest."
        actions={<OpenCaseButton />}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
        {/*
          Six tabs don't fit a phone, so they scroll sideways there. The padding leaves room for the tabs'
          shadow, which the scroller would clip, and the negative margins take that room back.
        */}
        <div className="scrollbar-subtle relative -mx-4 -mt-2 -mb-6 min-w-0 overflow-x-auto px-4 pt-2 pb-6">
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Case status"
            options={TABS}
            value={tab}
            onChange={changeTab}
            className="w-max"
          />
        </div>
        {incidents.data && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span aria-live="polite">
              {formatNumber(incidents.data.total)} {incidents.data.total === 1 ? 'case' : 'cases'}
            </span>
            <IconButton
              label="Refresh the list"
              onClick={() => incidents.refetch()}
              disabled={incidents.isFetching}
            >
              <RefreshCw aria-hidden="true" className={incidents.isFetching ? 'animate-spin' : undefined} />
            </IconButton>
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, tab)}
        aria-labelledby={tabId(TAB_PREFIX, tab)}
        className="mt-6"
      >
        {loading && <ListSkeleton label="Loading cases" />}

        {incidents.isError && (
          <LoadError
            title="We couldn’t load the cases"
            error={incidents.error}
            onRetry={() => incidents.refetch()}
            retrying={incidents.isFetching}
          />
        )}

        {cases?.length === 0 && !loading && (
          <EmptyList icon={<TriangleAlert />} title={EMPTY[tab].title} description={EMPTY[tab].description} />
        )}

        {cases && cases.length > 0 && (
          <div aria-busy={incidents.isPlaceholderData || undefined}>
            <DataTable
              label="Cases"
              className={
                incidents.isPlaceholderData ? 'opacity-60 transition-opacity duration-200' : undefined
              }
            >
              <thead>
                <tr>
                  <Th>Case</Th>
                  <Th>Status</Th>
                  <Th>Booking</Th>
                  <Th>Reported by</Th>
                  <Th>Handled by</Th>
                  <Th>Last update</Th>
                </tr>
              </thead>
              <tbody>
                {cases.map((incident) => (
                  <Tr key={incident.caseRef}>
                    <Td>
                      <Link
                        to={`/admin/incidents/${incident.caseRef}`}
                        className="rounded-inner font-medium text-primary hover:underline"
                      >
                        {incident.caseRef}
                      </Link>
                      <p className="mt-0.5 text-muted">{incidentTypeLabel(incident.type)}</p>
                    </Td>
                    <Td>
                      <StatusBadge status={STAFF_INCIDENT_STATUS[incident.status]} />
                    </Td>
                    <Td>
                      <Link
                        to={`/admin/bookings/${incident.bookingRef}`}
                        className="rounded-inner text-primary hover:underline"
                      >
                        {incident.bookingRef}
                      </Link>
                      <p className="mt-0.5 max-w-56 truncate text-muted">{incident.vehicleTitle}</p>
                    </Td>
                    <Td>{REPORTED_BY_LABELS[incident.reportedBy]}</Td>
                    <Td>{incident.assignedTo ?? <span className="text-muted">Nobody yet</span>}</Td>
                    <Td className="whitespace-nowrap text-muted">
                      <time dateTime={incident.updatedAt}>{formatNzDateTime(incident.updatedAt)}</time>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={incidents.data!.page}
              total={incidents.data!.total}
              pageSize={INCIDENTS_PAGE_SIZE}
              noun="cases"
              onChange={(next) => show(tab, next)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
