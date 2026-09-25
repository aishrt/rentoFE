import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PageMeta } from '@/components/layout/page-meta';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { overviewMetrics } from '@/features/admin/overview-metrics';
import { useAdminOverview } from '@/features/admin/use-admin-overview';
import { useSession } from '@/features/auth/use-session';
import { formatLongDateNz, formatTimeNz, nzHour } from '@/lib/format';

function greetingFor(date: Date): string {
  const hour = nzHour(date);
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function AdminOverviewPage() {
  const session = useSession();
  const overview = useAdminOverview();
  const [now] = useState(() => new Date());

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Overview · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-gold-text">{formatLongDateNz(now)}</p>
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
          {overview.data && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-live="polite">
                Updated {formatTimeNz(new Date(overview.data.generatedAt))} NZ time
              </span>
              <IconButton
                label="Refresh figures"
                onClick={() => overview.refetch()}
                disabled={overview.isFetching}
              >
                <RefreshCw aria-hidden="true" className={overview.isFetching ? 'animate-spin' : undefined} />
              </IconButton>
            </div>
          )}
        </div>

        {overview.isPending && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
            <span className="sr-only">Loading key figures</span>
            {overviewMetrics.map((metric) => (
              <StatCardSkeleton key={metric.key} />
            ))}
          </div>
        )}

        {overview.isError && (
          <Alert
            variant="danger"
            role="alert"
            title="We couldn't load the figures"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => overview.refetch()}
                loading={overview.isFetching}
              >
                Try again
              </Button>
            }
          >
            {overview.error.message}
          </Alert>
        )}

        {overview.data && (
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewMetrics.map((metric, index) => (
              <StaggerItem as="li" key={metric.key} index={index}>
                <StatCard
                  label={metric.label}
                  icon={metric.icon}
                  value={overview.data.metrics[metric.key]}
                  format={metric.format}
                  hint={metric.hint}
                  className="h-full"
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <Card className="mt-8 flex flex-col gap-2 p-6 sm:p-8">
        <h2 className="headline text-xl font-medium">What's coming to the portal</h2>
        <p className="max-w-2xl text-muted">
          Approval queues for hosts and listings, bookings, payments, incidents and support tickets appear in
          the menu as each part of the marketplace goes live. Figures marked “—” start counting at the same
          time.
        </p>
      </Card>
    </div>
  );
}
