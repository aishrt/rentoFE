import { useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import type { AdminReport } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { DecisionDialog } from '@/features/admin/listings/decision-dialog';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNumber } from '@/lib/format';
import {
  asNotesError,
  hideReportedReviewRequest,
  moderationQueryKey,
  reportsQueryKey,
  resolveReportRequest,
  useReports,
  type ReportStatus,
} from './moderation-api';
import { REPORT_TARGET, reportReasonLabel } from './moderation-labels';
import { ReportCard } from './report-card';
import { ResolveReportDialog } from './resolve-report-dialog';

const TAB_PREFIX = 'moderation-reports';

const TABS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACTIONED', label: 'Actioned' },
  { value: 'DISMISSED', label: 'Dismissed' },
] as const satisfies readonly TabOption<ReportStatus>[];

const EMPTY: Record<ReportStatus, { title: string; description: string }> = {
  OPEN: {
    title: 'No open reports',
    description: 'When a member reports a person, a message, a review or a listing, it shows here.',
  },
  ACTIONED: { title: 'No actioned reports', description: 'Reports you’ve taken action on are listed here.' },
  DISMISSED: { title: 'No dismissed reports', description: 'Reports you’ve dismissed are listed here.' },
};

const summaryOf = (report: AdminReport) =>
  `${REPORT_TARGET[report.targetType]} reported by ${report.reporter.name} for ${reportReasonLabel(report.reason).toLowerCase()}`;

interface ReportsPanelProps {
  status: ReportStatus;
  onStatusChange: (status: ReportStatus) => void;
}

/**
 * What members reported, by status. Open reports are resolved with a note of what was done; a reported
 * review can be hidden with a reason, which resolves the report too.
 */
export function ReportsPanel({ status, onStatusChange }: ReportsPanelProps) {
  const queryClient = useQueryClient();
  const reports = useReports(status);
  // The report is kept while its dialog closes, so the dialog's text doesn't change as it animates out.
  const [current, setCurrent] = useState<AdminReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hiding, setHiding] = useState<AdminReport | null>(null);
  const [hideOpen, setHideOpen] = useState(false);

  const start = (report: AdminReport) => {
    setCurrent(report);
    setDialogOpen(true);
  };

  const startHide = (report: AdminReport) => {
    setHiding(report);
    setHideOpen(true);
  };

  // The report leaves the open list straight away; every list then refreshes.
  const dropFromOpen = (id: string) =>
    queryClient.setQueryData<{ reports: AdminReport[] }>(
      reportsQueryKey('OPEN'),
      (previous) => previous && { reports: previous.reports.filter((report) => report.id !== id) },
    );

  const resolve = async (input: { status: 'ACTIONED' | 'DISMISSED'; resolution: string }) => {
    if (!current) return;
    await resolveReportRequest({ id: current.id, ...input });
    setDialogOpen(false);
    toast(input.status === 'ACTIONED' ? 'Report resolved' : 'Report dismissed', {
      description: input.status === 'ACTIONED' ? 'It’s under Actioned now.' : 'It’s under Dismissed now.',
    });
    dropFromOpen(current.id);
    void queryClient.invalidateQueries({ queryKey: reportsQueryKey() });
  };

  const hide = async (notes: string | undefined) => {
    const review = hiding?.review;
    if (!hiding || !review) return;
    try {
      await hideReportedReviewRequest({ reportId: hiding.id, reviewId: review.id, reason: notes ?? '' });
    } catch (error) {
      throw asNotesError(error, 'reason');
    }
    setHideOpen(false);
    toast('Review hidden and report resolved', {
      description: `${review.author.firstName}’s review won’t be shown. The report is under Actioned now.`,
    });
    dropFromOpen(hiding.id);
    // Other reports about the review, and the review lists, show it hidden.
    void queryClient.invalidateQueries({ queryKey: moderationQueryKey });
  };

  const count = reports.data?.length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Report status"
          options={TABS}
          value={status}
          onChange={onStatusChange}
          className="w-full sm:w-auto"
        />
        {count !== undefined && (
          <p aria-live="polite" className="text-sm text-muted">
            {formatNumber(count)} {status === 'OPEN' ? 'open ' : ''}
            {count === 1 ? 'report' : 'reports'}
          </p>
        )}
      </div>

      <div role="tabpanel" id={tabPanelId(TAB_PREFIX, status)} aria-labelledby={tabId(TAB_PREFIX, status)}>
        {reports.isPending && <ListSkeleton label="Loading reports" rows={3} height="h-52" />}

        {reports.isError && (
          <LoadError
            title="We couldn’t load the reports"
            error={reports.error}
            onRetry={() => reports.refetch()}
            retrying={reports.isFetching}
          />
        )}

        {reports.data?.length === 0 && <EmptyList {...EMPTY[status]} icon={<Flag />} />}

        {reports.data && reports.data.length > 0 && (
          <ul
            aria-label={`${TABS.find((tab) => tab.value === status)?.label} reports`}
            className="grid gap-4"
          >
            {reports.data.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                className="stagger-in"
                style={staggerIndex(index)}
                onResolve={report.status === 'OPEN' ? () => start(report) : undefined}
                onHideReview={
                  report.status === 'OPEN' && report.review && report.review.status !== 'HIDDEN'
                    ? () => startHide(report)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      <ResolveReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        summary={current ? summaryOf(current) : ''}
        onConfirm={resolve}
      />

      <DecisionDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        title={`Hide ${hiding?.review?.author.firstName ?? ''}’s review?`}
        description="It won’t be shown on Rento Vroom or count towards a rating, and this report is resolved as actioned."
        confirmLabel="Hide review"
        tone="danger"
        notes="required"
        notesLabel="Why it’s hidden"
        notesDescription="Kept with the review and the report, and in the audit log."
        onConfirm={hide}
      />
    </div>
  );
}
