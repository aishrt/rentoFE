import { useQueryClient } from '@tanstack/react-query';
import { Inbox, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { HostApplication } from '@/api/types';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { DecisionDialog } from '@/features/admin/listings/decision-dialog';
import { HostApplicationCard } from '@/features/admin/listings/host-application-card';
import {
  decideHostApplicationRequest,
  hostApplicationsQueryKey,
  isApiError,
  reviewQueueQueryKey,
  useHostApplications,
} from '@/features/admin/listings/listing-api';
import { applicantName } from '@/features/admin/listings/listing-format';
import type { HostStatus } from '@/features/admin/listings/listing-labels';
import { formatNumber } from '@/lib/format';

const TAB_PREFIX = 'host-applications';

const TABS = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const satisfies readonly TabOption<HostStatus>[];

type Tab = (typeof TABS)[number]['value'];

/** The tab is in the address (?status=approved), so a link can open it. */
const tabFrom = (value: string | null): Tab =>
  TABS.find((tab) => tab.value === value?.toUpperCase())?.value ?? 'APPLIED';

const EMPTY: Record<Tab, { title: string; description: string }> = {
  APPLIED: {
    title: 'No applications waiting',
    description: 'New applications to host appear here, oldest first.',
  },
  APPROVED: { title: 'No approved Hosts yet', description: 'Hosts you approve are listed here.' },
  REJECTED: { title: 'No rejected applications', description: 'Applications you reject are listed here.' },
};

type Decision = { application: HostApplication; kind: 'approve' | 'reject' };

/**
 * Host applications (plan §9, Days 8–11): staff approve or reject people who want to list cars.
 * Approving needs a confirmed email (plan §6.1); rejecting needs a note, which we email to them.
 */
export function AdminHostApplicationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFrom(searchParams.get('status'));
  const applications = useHostApplications(tab);
  // The decision is kept while its dialog closes, so the dialog's text doesn't change as it animates out.
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const changeTab = (next: Tab) =>
    setSearchParams(next === 'APPLIED' ? {} : { status: next.toLowerCase() }, { replace: true });

  const start = (application: HostApplication, kind: Decision['kind']) => {
    setDecision({ application, kind });
    setDialogOpen(true);
  };

  const decide = async (notes: string | undefined) => {
    if (!decision) return;
    const { application, kind } = decision;
    const name = applicantName(application);
    try {
      await decideHostApplicationRequest({ userId: application.userId, decision: kind, notes });
    } catch (error) {
      // The list was out of date: show that their email isn't confirmed.
      if (isApiError(error, 'EMAIL_NOT_VERIFIED')) void applications.refetch();
      throw error;
    }
    setDialogOpen(false);
    toast(kind === 'approve' ? `${name} is approved to host` : `${name}'s application was rejected`, {
      description:
        kind === 'approve'
          ? "We've emailed them. Their listings can now be approved."
          : "We've emailed them your note.",
    });
    // It leaves this tab straight away; every tab and the listing queue's Host statuses then refresh.
    queryClient.setQueryData<{ applications: HostApplication[] }>(
      hostApplicationsQueryKey(tab),
      (previous) =>
        previous && {
          applications: previous.applications.filter((item) => item.userId !== application.userId),
        },
    );
    void queryClient.invalidateQueries({ queryKey: hostApplicationsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey });
  };

  const current = decision?.application;
  const currentName = current ? applicantName(current) : '';
  const emailUnconfirmed = decision?.kind === 'approve' && current && !current.emailVerified;

  return (
    <div className="mx-auto max-w-5xl">
      <PageMeta title="Host applications · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">Marketplace</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Host applications</h1>
        <p className="mt-2 max-w-2xl text-muted">
          People who want to list their cars. Approve them once their email is confirmed and their details
          look right; their listings can go live after that.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Application status"
          options={TABS}
          value={tab}
          onChange={changeTab}
          className="w-full sm:w-auto"
        />
        {applications.data && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span aria-live="polite">
              {formatNumber(applications.data.length)}{' '}
              {applications.data.length === 1 ? 'application' : 'applications'}
            </span>
            <IconButton
              label="Refresh the list"
              onClick={() => applications.refetch()}
              disabled={applications.isFetching}
            >
              <RefreshCw
                aria-hidden="true"
                className={applications.isFetching ? 'animate-spin' : undefined}
              />
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
        {applications.isPending && (
          <div aria-busy="true" className="grid gap-4">
            <span className="sr-only">Loading applications</span>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-52 rounded-card" />
            ))}
          </div>
        )}

        {applications.isError && (
          <Alert
            variant="danger"
            role="alert"
            title="We couldn't load the applications"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applications.refetch()}
                loading={applications.isFetching}
              >
                Try again
              </Button>
            }
          >
            {applications.error.message}
          </Alert>
        )}

        {applications.data?.length === 0 && (
          <EmptyState
            titleAs="h2"
            className="mx-auto py-12"
            visual={
              <IconBadge size="xl" tone="muted">
                <Inbox />
              </IconBadge>
            }
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
          />
        )}

        {applications.data && applications.data.length > 0 && (
          <ul
            aria-label={`${TABS.find((item) => item.value === tab)?.label} applications`}
            className="grid gap-4"
          >
            {applications.data.map((application, index) => (
              <HostApplicationCard
                key={application.userId}
                application={application}
                className="stagger-in"
                style={staggerIndex(index)}
                // Approved Hosts are managed from Users (plan §12.6); a rejected applicant can be reconsidered.
                onApprove={tab === 'APPROVED' ? undefined : () => start(application, 'approve')}
                onReject={tab === 'APPLIED' ? () => start(application, 'reject') : undefined}
              />
            ))}
          </ul>
        )}
      </div>

      <DecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={decision?.kind === 'reject' ? `Reject ${currentName}?` : `Approve ${currentName}?`}
        description={
          decision?.kind === 'reject'
            ? "They won't be able to list cars. We'll email them your note, so write it for them."
            : 'They can then list cars, and their listings can be approved. We’ll email them to say so.'
        }
        confirmLabel={decision?.kind === 'reject' ? 'Reject application' : 'Approve'}
        tone={decision?.kind === 'reject' ? 'danger' : 'primary'}
        notes={decision?.kind === 'reject' ? 'required' : 'optional'}
        notesLabel={
          decision?.kind === 'reject' ? `Why, for ${current?.firstName ?? 'them'}` : 'Note (optional)'
        }
        notesDescription={
          decision?.kind === 'reject'
            ? 'Included in the email.'
            : 'Included in the welcome email, if you add one.'
        }
        blocked={Boolean(emailUnconfirmed)}
        notice={
          emailUnconfirmed && current ? (
            <Alert variant="info" title="Their email address isn't confirmed yet">
              Hosts need a confirmed email before they&rsquo;re approved, so we know we can reach them.{' '}
              {current.firstName} needs to open the link we sent to {current.email}; if it has expired, they
              can log in and send themselves a new one. Their application stays here until then.
            </Alert>
          ) : undefined
        }
        onConfirm={decide}
      />
    </div>
  );
}
