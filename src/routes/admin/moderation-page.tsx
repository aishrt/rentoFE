import { useSearchParams } from 'react-router';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import type { ReportStatus, ReviewState } from '@/features/admin/moderation/moderation-api';
import { ReportsPanel } from '@/features/admin/moderation/reports-panel';
import { ReviewsPanel } from '@/features/admin/moderation/reviews-panel';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';

const TAB_PREFIX = 'moderation';

type Tab = 'reports' | 'reviews';

const TABS = [
  { value: 'reports', label: 'Reports' },
  { value: 'reviews', label: 'Reviews' },
] as const satisfies readonly TabOption<Tab>[];

const REPORT_STATUSES = ['OPEN', 'ACTIONED', 'DISMISSED'] as const satisfies readonly ReportStatus[];
const REVIEW_STATES = ['HELD', 'HIDDEN'] as const satisfies readonly ReviewState[];

const pick = <Value extends string>(values: readonly Value[], raw: string | null) =>
  values.find((value) => value === raw?.toUpperCase());

/**
 * Moderation (plan §12.6): what members reported, and reviews held back before publishing. The tabs are
 * in the address (?tab=reviews&state=hidden, ?status=dismissed), so a link opens the same list.
 */
export function AdminModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'reviews' ? 'reviews' : 'reports';
  const reportStatus = pick(REPORT_STATUSES, searchParams.get('status')) ?? 'OPEN';
  const reviewState = pick(REVIEW_STATES, searchParams.get('state')) ?? 'HELD';

  const changeTab = (next: Tab) =>
    setSearchParams(next === 'reviews' ? { tab: 'reviews' } : {}, { replace: true });
  const changeReportStatus = (status: ReportStatus) =>
    setSearchParams(status === 'OPEN' ? {} : { status: status.toLowerCase() }, { replace: true });
  const changeReviewState = (state: ReviewState) =>
    setSearchParams(state === 'HELD' ? { tab: 'reviews' } : { tab: 'reviews', state: state.toLowerCase() }, {
      replace: true,
    });

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Operations"
        title="Moderation"
        description="What members reported, and reviews held back before publishing. Every decision is kept in the audit log."
      />

      <SegmentedTabs
        idPrefix={TAB_PREFIX}
        label="Moderation"
        options={TABS}
        value={tab}
        onChange={changeTab}
        className="mt-8 w-full sm:w-fit"
      />

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, tab)}
        aria-labelledby={tabId(TAB_PREFIX, tab)}
        className="mt-6"
      >
        {tab === 'reports' ? (
          <ReportsPanel status={reportStatus} onStatusChange={changeReportStatus} />
        ) : (
          <ReviewsPanel state={reviewState} onStateChange={changeReviewState} />
        )}
      </div>
    </div>
  );
}
