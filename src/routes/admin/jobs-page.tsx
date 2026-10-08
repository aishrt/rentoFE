import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Lock, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router';
import type { AdminJob, AdminJobs } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { isForbidden, pageFrom } from '@/features/admin/finance/finance-api';
import { JobRow } from '@/features/admin/finance/job-row';
import {
  JOBS_PAGE_SIZE,
  jobsQueryKey,
  retryJobRequest,
  useAdminJobs,
  type JobStatus,
} from '@/features/admin/finance/platform-api';
import { DataTable, Pagination, Th } from '@/features/admin/ops/admin-table';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { adminDashboardQueryKey } from '@/features/admin/use-admin-overview';
import { cn } from '@/lib/cn';

const TAB_PREFIX = 'jobs';

const TABS = [
  { value: 'FAILED', label: 'Failed' },
  { value: 'QUEUED', label: 'Waiting' },
  { value: 'RUNNING', label: 'Running' },
] as const satisfies readonly TabOption<JobStatus>[];

/** The tab is in the address (?status=queued), so a link can open it. */
const tabFrom = (value: string | null): JobStatus =>
  TABS.find((tab) => tab.value === value?.toUpperCase())?.value ?? 'FAILED';

const EMPTY: Record<JobStatus, { title: string; description: string }> = {
  FAILED: {
    title: 'No failed jobs',
    description: 'Emails, payment checks and daily tasks that run out of attempts show here.',
  },
  QUEUED: { title: 'Nothing waiting', description: 'Jobs due to run show here until they start.' },
  RUNNING: { title: 'Nothing running', description: 'Jobs show here while they run.' },
};

/**
 * Background jobs (spec §18), for the admin: emails, payment checks and daily tasks. A job that ran out of
 * attempts can run again once its cause is fixed.
 */
export function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = tabFrom(searchParams.get('status'));
  const page = pageFrom(searchParams.get('page'));
  const jobs = useAdminJobs(status, page);

  const retry = useMutation({
    mutationFn: (job: AdminJob) => retryJobRequest(job.id),
    onSuccess: (_result, job) => {
      toast(`${job.type} will run again`, { description: 'It’s back in the queue, under Waiting.' });
      // It leaves the failed list straight away; the other tabs and the overview load afresh when opened.
      queryClient.setQueryData<AdminJobs>(
        jobsQueryKey(status, page),
        (previous) =>
          previous && {
            ...previous,
            jobs: previous.jobs.filter((item) => item.id !== job.id),
            total: Math.max(0, previous.total - 1),
          },
      );
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey(), refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: adminDashboardQueryKey() });
    },
  });

  const changeTab = (next: JobStatus) =>
    setSearchParams(next === 'FAILED' ? {} : { status: next.toLowerCase() }, { replace: true });

  const changePage = (next: number) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next > 1) params.set('page', String(next));
        else params.delete('page');
        return params;
      },
      { replace: true },
    );

  if (jobs.isError && isForbidden(jobs.error)) {
    return (
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader eyebrow="Platform" title="Jobs" />
        <EmptyList
          icon={<Lock />}
          title="Background jobs are for the admin"
          description="Ask the admin if an email or a payment check seems stuck."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Platform"
        title="Jobs"
        description="Work that runs in the background: emails, payment checks and daily tasks. Each job tries a few times before it fails."
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Job status"
          options={TABS}
          value={status}
          onChange={changeTab}
          className="w-full sm:w-auto"
        />
        {jobs.data && (
          <IconButton label="Refresh the list" onClick={() => jobs.refetch()} disabled={jobs.isFetching}>
            <RefreshCw aria-hidden="true" className={jobs.isFetching ? 'animate-spin' : undefined} />
          </IconButton>
        )}
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, status)}
        aria-labelledby={tabId(TAB_PREFIX, status)}
        className="mt-6 grid gap-4"
      >
        {retry.isError && (
          <Alert variant="danger" role="alert" title={`We couldn't run ${retry.variables.type} again`}>
            {retry.error.message}
          </Alert>
        )}

        {jobs.isPending && <ListSkeleton label="Loading jobs" />}

        {jobs.isError && (
          <LoadError
            title="We couldn't load the jobs"
            error={jobs.error}
            onRetry={() => jobs.refetch()}
            retrying={jobs.isFetching}
          />
        )}

        {jobs.data?.jobs.length === 0 && (
          <EmptyList
            icon={status === 'FAILED' ? <CircleCheck /> : undefined}
            title={EMPTY[status].title}
            description={EMPTY[status].description}
          />
        )}

        {jobs.data && jobs.data.jobs.length > 0 && (
          <div aria-busy={jobs.isPlaceholderData}>
            <DataTable
              label={`${TABS.find((tab) => tab.value === status)?.label} jobs`}
              className={cn(jobs.isPlaceholderData && 'opacity-60')}
            >
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Attempts</Th>
                  <Th>Last error</Th>
                  <Th>Related record</Th>
                  <Th>Run at</Th>
                  <Th>Finished</Th>
                  {status === 'FAILED' && (
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  )}
                </tr>
              </thead>
              <tbody>
                {jobs.data.jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRetry={status === 'FAILED' ? () => retry.mutate(job) : undefined}
                    retrying={retry.isPending && retry.variables.id === job.id}
                  />
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={jobs.data.page}
              total={jobs.data.total}
              pageSize={JOBS_PAGE_SIZE}
              onChange={changePage}
              noun="jobs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
