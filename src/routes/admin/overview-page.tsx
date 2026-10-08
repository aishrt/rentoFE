import { ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminDashboard } from '@/api/types';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { SectionError } from '@/components/errors/section-error';
import { PageMeta } from '@/components/layout/page-meta';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { describeRange, useDateRange } from '@/features/admin/finance/date-range';
import { DateRangeControl } from '@/features/admin/finance/date-range-control';
import {
  currentMetrics,
  queueLinks,
  rangeMetrics,
  type OverviewMetric,
} from '@/features/admin/overview-metrics';
import { useAdminDashboard } from '@/features/admin/use-admin-overview';
import { useSession } from '@/features/auth/use-session';
import { formatDateValue } from '@/lib/dates';
import { formatLongDateNz, formatNumber, formatTimeNz, nzHour } from '@/lib/format';
import { cn } from '@/lib/cn';

function greetingFor(date: Date): string {
  const hour = nzHour(date);
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function FigureGroup({
  id,
  title,
  description,
  metrics,
  figures,
  columns,
  className,
}: {
  id: string;
  title: string;
  description: string;
  metrics: OverviewMetric[];
  figures: AdminDashboard['figures'] | undefined;
  /** Grid columns on wide screens. */
  columns: string;
  className?: string;
}) {
  const grid = cn('mt-4 grid gap-4 sm:grid-cols-2', columns);
  return (
    <section aria-labelledby={id} className={className}>
      <h3 id={id} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
      {figures ? (
        <Stagger as="ul" className={grid}>
          {metrics.map((metric, index) => (
            <StaggerItem as="li" key={metric.key} index={index}>
              <StatCard
                label={metric.label}
                icon={metric.icon}
                value={figures[metric.key]}
                format={metric.format}
                hint={metric.hint}
                className="h-full"
              />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <div className={grid}>
          {metrics.map((metric) => (
            <StatCardSkeleton key={metric.key} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Each queue with what's in it, linking to where it's dealt with. */
function WaitingCard({
  queues,
  isAdmin,
}: {
  queues: AdminDashboard['queues'] | undefined;
  isAdmin: boolean;
}) {
  const links = queueLinks.filter((link) => isAdmin || !link.adminOnly);
  return (
    <Card asChild className="mt-8 p-6 sm:p-8">
      <section aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-base font-semibold">
          Waiting for the team
        </h2>
        <p className="mt-1 text-sm text-muted">
          What&rsquo;s in each queue right now. Open one to work through it.
        </p>
        {queues ? (
          <ul aria-label="Queues" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {links.map(({ key, label, icon: Icon, to }) => {
              const count = queues[key];
              return (
                <li key={key}>
                  <Link
                    to={to}
                    className="group flex min-h-14 items-center gap-3 rounded-control border border-line px-4 py-3 transition-colors duration-120 hover:border-ink/25 hover:bg-ink/3"
                  >
                    <IconBadge size="sm" tone={count > 0 ? 'soft' : 'muted'}>
                      <Icon />
                    </IconBadge>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">{label}</span>{' '}
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        count > 0
                          ? 'rounded-full bg-primary/10 px-2.5 font-semibold text-primary'
                          : 'text-muted',
                      )}
                    >
                      {formatNumber(count)}
                    </span>{' '}
                    <span className="sr-only">waiting</span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div aria-busy="true" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Loading the queues</span>
            {links.map((link) => (
              <Skeleton key={link.key} className="h-14 rounded-control" />
            ))}
          </div>
        )}
      </section>
    </Card>
  );
}

export function AdminOverviewPage() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const dates = useDateRange();
  const dashboard = useAdminDashboard(dates.range);
  const [now] = useState(() => new Date());
  const data = dashboard.data;

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Overview · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">{formatLongDateNz(now)}</p>
        <h1 className="headline mt-2 text-title-3 font-medium">
          {greetingFor(now)}
          {session.data ? `, ${session.data.firstName}` : ''}
        </h1>
        <p className="mt-2 text-muted">Here's how Rento Vroom is tracking.</p>
      </header>

      <section aria-labelledby="kpi-heading" className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="kpi-heading" className="text-base font-semibold">
            Key figures
          </h2>
          {data && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-live="polite">
                {dashboard.isPlaceholderData
                  ? 'Updating…'
                  : `Updated ${formatTimeNz(new Date(data.generatedAt))} NZ time`}
              </span>
              <IconButton
                label="Refresh figures"
                onClick={() => dashboard.refetch()}
                disabled={dashboard.isFetching}
              >
                <RefreshCw aria-hidden="true" className={dashboard.isFetching ? 'animate-spin' : undefined} />
              </IconButton>
            </div>
          )}
        </div>

        <DateRangeControl {...dates} />

        {dashboard.isError ? (
          <Alert
            variant="danger"
            role="alert"
            className="mt-6"
            title="We couldn't load the figures"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => dashboard.refetch()}
                loading={dashboard.isFetching}
              >
                Try again
              </Button>
            }
          >
            {dashboard.error.message}
          </Alert>
        ) : (
          <ErrorBoundary
            fallback={({ reset }) => <SectionError title="We couldn't show the figures" onRetry={reset} />}
          >
            <div aria-busy={dashboard.isPending || dashboard.isPlaceholderData}>
              {dashboard.isPending && <span className="sr-only">Loading key figures</span>}
              <FigureGroup
                id="range-figures"
                title={`On these dates: ${describeRange(data ?? dates.range, (day) => formatDateValue(day))}`}
                description="Money, cancellations and incidents counted for the days chosen above."
                metrics={rangeMetrics}
                figures={data?.figures}
                columns="lg:grid-cols-3 xl:grid-cols-5"
                className="mt-6"
              />
              <FigureGroup
                id="current-figures"
                title="Right now"
                description="How things stand today, whatever the dates."
                metrics={currentMetrics}
                figures={data?.figures}
                columns="xl:grid-cols-4"
                className="mt-8"
              />
            </div>
          </ErrorBoundary>
        )}
      </section>

      {!dashboard.isError && <WaitingCard queues={data?.queues} isAdmin={isAdmin} />}
    </div>
  );
}
