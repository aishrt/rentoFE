import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { combineDateTime } from '@/lib/dates';
import { formatShortDateTime } from '@/lib/format';
import { plannedPages } from './planned-pages';

function SearchSummary() {
  const [params] = useSearchParams();
  const where = params.get('where');
  const [startDate, startTime] = (params.get('start') ?? '').split('T');
  const [endDate, endTime] = (params.get('end') ?? '').split('T');
  const start = combineDateTime(startDate ?? '', startTime ?? '');
  const end = combineDateTime(endDate ?? '', endTime ?? '');
  if (!where || !start || !end) return null;

  return (
    <Card asChild variant="flat" className="mt-6 max-w-md bg-surface px-5 py-4 text-sm text-muted">
      <p>
        You searched for <span className="font-semibold text-ink">{where}</span>, from{' '}
        <span className="font-medium text-ink">{formatShortDateTime(start)}</span> to{' '}
        <span className="font-medium text-ink">{formatShortDateTime(end)}</span>.
      </p>
    </Card>
  );
}

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const page = plannedPages.find((candidate) => candidate.path === pathname);
  const title = page?.title ?? 'Coming soon';

  return (
    <section className="relative isolate overflow-hidden">
      <PageMeta title={title} description={page?.description} noindex />
      <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-40 w-full text-primary/15" />
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20">
        <EmptyState
          size="lg"
          visual={
            <Badge variant="accent">
              <Sparkles aria-hidden="true" />
              Coming soon
            </Badge>
          }
          title={title}
          description={
            <>
              {page && <p>{page.description}</p>}
              <p className="mt-2 text-base">We're putting the finishing touches on this page.</p>
            </>
          }
          actions={
            <Button asChild variant="secondary">
              <Link to="/" viewTransition>
                <ArrowLeft aria-hidden="true" className="nudge-left" />
                Back to home
              </Link>
            </Button>
          }
        >
          {pathname === '/search' && <SearchSummary />}
        </EmptyState>
      </Container>
    </section>
  );
}
