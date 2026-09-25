import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <p className="mx-auto mt-6 max-w-md rounded-card border border-line bg-surface px-5 py-4 text-sm text-muted">
      You searched for <span className="font-semibold text-ink">{where}</span>, from{' '}
      <span className="font-medium text-ink">{formatShortDateTime(start)}</span> to{' '}
      <span className="font-medium text-ink">{formatShortDateTime(end)}</span>.
    </p>
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
      <Container className="flex min-h-[70vh] max-w-2xl animate-fade-up flex-col items-center justify-center py-20 text-center">
        <Badge variant="gold">
          <Sparkles aria-hidden="true" />
          Coming soon
        </Badge>
        <h1 className="headline mt-6 text-title-1 font-medium">{title}</h1>
        {page && <p className="mt-4 text-lg text-muted">{page.description}</p>}
        <p className="mt-2 text-muted">We're putting the finishing touches on this page.</p>
        {pathname === '/search' && <SearchSummary />}
        <Button asChild variant="secondary" className="group mt-10">
          <Link to="/" viewTransition>
            <ArrowLeft
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            Back to home
          </Link>
        </Button>
      </Container>
    </section>
  );
}
