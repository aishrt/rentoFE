import { useMutation } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Lock, RefreshCw } from 'lucide-react';
import type { PlatformReport } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { describeRange, MAX_RANGE_DAYS, useDateRange } from '@/features/admin/finance/date-range';
import { DateRangeControl } from '@/features/admin/finance/date-range-control';
import {
  downloadReport,
  isForbidden,
  REPORT_EXPORTS,
  usePlatformReport,
  type ReportExport,
} from '@/features/admin/finance/finance-api';
import { REPORT_GROUPS } from '@/features/admin/finance/report-figures';
import { BOOKING_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, LoadError } from '@/features/admin/ops/query-feedback';
import { formatDateValue } from '@/lib/dates';
import { formatNumber } from '@/lib/format';

/** Where the bookings made in the range are now, by status. */
function ByStatus({ byStatus }: { byStatus: PlatformReport['bookings']['byStatus'] }) {
  const rows = Object.entries(byStatus).filter(([, count]) => count > 0);
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5">
      <h4 className="text-sm font-medium text-muted">Where the bookings made on these days are now</h4>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {rows.map(([status, count]) => (
          <div key={status} className="flex gap-2">
            <dt className="text-muted">
              {BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]?.label ?? status}
            </dt>
            <dd className="font-semibold text-ink tabular-nums">{formatNumber(count)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Platform reports (spec §18), for the admin: bookings, money and GST for a range of NZ days, and the
 * same as CSV files for the accountant.
 */
export function AdminReportsPage() {
  const dates = useDateRange(MAX_RANGE_DAYS);
  const report = usePlatformReport(dates.range);
  const download = useMutation({
    mutationFn: (type: ReportExport) => downloadReport(type, dates.range),
  });
  const forbidden = report.isError && isForbidden(report.error);
  const exportLabel = REPORT_EXPORTS.find((item) => item.type === download.variables)?.label ?? 'report';

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Finance"
        title="Reports"
        description="Bookings, money and GST for the days you choose, and each as a CSV file for the accountant."
        actions={
          report.data && (
            <IconButton
              label="Refresh the report"
              onClick={() => report.refetch()}
              disabled={report.isFetching}
            >
              <RefreshCw aria-hidden="true" className={report.isFetching ? 'animate-spin' : undefined} />
            </IconButton>
          )
        }
      />

      {forbidden ? (
        <EmptyList
          icon={<Lock />}
          title="Reports are for the admin"
          description="Ask the admin if you need figures from them."
        />
      ) : (
        <>
          <DateRangeControl {...dates} className="mt-8" />

          {report.isError && (
            <div className="mt-6">
              <LoadError
                title="We couldn't load the report"
                error={report.error}
                onRetry={() => report.refetch()}
                retrying={report.isFetching}
              />
            </div>
          )}

          {!report.isError && (
            <div aria-busy={report.isPending || report.isPlaceholderData}>
              {report.isPending && <span className="sr-only">Loading the report</span>}
              {report.data && (
                <p className="mt-6 text-sm text-muted" aria-live="polite">
                  {report.isPlaceholderData
                    ? 'Updating…'
                    : `Showing ${describeRange(report.data, (day) => formatDateValue(day))}.`}
                </p>
              )}
              {REPORT_GROUPS.map((group) => (
                <section key={group.id} aria-labelledby={`report-${group.id}`} className="mt-8">
                  <h2 id={`report-${group.id}`} className="text-base font-semibold">
                    {group.title}
                  </h2>
                  <p className="mt-0.5 max-w-3xl text-sm text-muted">{group.description}</p>
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.figures.map((figure) => (
                      <li key={figure.label}>
                        {report.data ? (
                          <StatCard
                            label={figure.label}
                            icon={figure.icon}
                            value={figure.value(report.data)}
                            format={figure.format}
                            hint={figure.hint}
                            className="h-full"
                          />
                        ) : (
                          <StatCardSkeleton />
                        )}
                      </li>
                    ))}
                  </ul>
                  {group.id === 'bookings' && report.data && (
                    <ByStatus byStatus={report.data.bookings.byStatus} />
                  )}
                </section>
              ))}
            </div>
          )}

          <Card asChild className="mt-10 p-6 sm:p-8">
            <section aria-labelledby="downloads-heading">
              <h2 id="downloads-heading" className="text-base font-semibold">
                Download as CSV
              </h2>
              <p className="mt-1 text-sm text-muted">
                For {describeRange(dates.range, (day) => formatDateValue(day))}. Opens in Excel, Numbers or
                Google Sheets; amounts are in NZD.
              </p>
              {download.isError && (
                <Alert
                  variant="danger"
                  role="alert"
                  className="mt-5"
                  title={`We couldn't download the ${exportLabel} CSV`}
                >
                  {download.error.message}
                </Alert>
              )}
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_EXPORTS.map((item) => (
                  <li
                    key={item.type}
                    className="flex items-center gap-3 rounded-control border border-line p-4"
                  >
                    <IconBadge size="sm">
                      <FileSpreadsheet />
                    </IconBadge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="text-xs text-muted">{item.description}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => download.mutate(item.type)}
                      loading={download.isPending && download.variables === item.type}
                      aria-label={`Download ${item.label} CSV`}
                    >
                      <Download aria-hidden="true" />
                      CSV
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </Card>
        </>
      )}
    </div>
  );
}
