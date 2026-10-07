import { BookOpen, LifeBuoy } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ContourLines } from '@/components/brand/patterns/contour-lines';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/features/content/markdown-view';
import { useHelpArticle } from '@/features/support/support-api';

const AUDIENCES = { GUEST: 'For guests', HOST: 'For hosts', ALL: 'For everyone' } as const;

function ArticleSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <span className="sr-only">Loading the guide</span>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** One help centre guide, from its Markdown (spec §8, help and support). */
export function HelpArticlePage() {
  const { slug = '' } = useParams();
  const article = useHelpArticle(slug);

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={ContourLines} />
      <PageMeta title={article.data?.title ?? 'Help centre'} />
      <BackLink to="/help">Help centre</BackLink>
      <div className="mt-6">
        {article.isError ? (
          <EmptyState
            className="mx-auto py-10"
            visual={
              <IconBadge size="xl">
                <BookOpen />
              </IconBadge>
            }
            title={
              article.error instanceof ApiError && article.error.status === 404
                ? 'We couldn’t find that guide'
                : 'We couldn’t load this guide'
            }
            description={
              article.error instanceof ApiError && article.error.status === 404
                ? 'It may have moved. Find it in the help centre.'
                : article.error.message
            }
            actions={
              <Button asChild>
                <Link to="/help">Help centre</Link>
              </Button>
            }
          />
        ) : !article.data ? (
          <ArticleSkeleton />
        ) : (
          <article className="grid gap-8">
            <header>
              <p className="eyebrow text-primary">
                {article.data.category} · {AUDIENCES[article.data.audience]}
              </p>
              <h1 className="headline mt-3 text-title-2 font-medium text-balance">{article.data.title}</h1>
            </header>
            <Markdown source={article.data.body} headingOffset={1} />
            <Card
              variant="flat"
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="font-semibold text-ink">Didn’t answer your question?</p>
                <p className="text-sm text-muted">Our support team replies by email.</p>
              </div>
              <Button asChild variant="secondary">
                <Link to="/contact" viewTransition>
                  <LifeBuoy aria-hidden="true" />
                  Contact support
                </Link>
              </Button>
            </Card>
          </article>
        )}
      </div>
    </Container>
  );
}
