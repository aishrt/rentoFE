import { ArrowRight, BookOpen, LifeBuoy } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { HelpArticleSummary } from '@/api/types';
import { ContourLines } from '@/components/brand/patterns/contour-lines';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Magnet } from '@/components/motion/magnet';
import { swapUp } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { CtaBand } from '@/features/content/cta-band';
import { PageHero } from '@/features/content/page-hero';
import { useHelpArticles, type HelpAudience } from '@/features/support/support-api';
import { seoPage } from '@/seo/pages';

const TAB_PREFIX = 'help-audience';

const AUDIENCE_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'GUEST', label: 'Guests' },
  { value: 'HOST', label: 'Hosts' },
] as const;

type Filter = (typeof AUDIENCE_TABS)[number]['value'];

interface ArticleGroup {
  category: string;
  articles: HelpArticleSummary[];
}

/** Articles by category, in the order admins set (each category where its first article is). */
function groupArticles(articles: readonly HelpArticleSummary[]): ArticleGroup[] {
  const groups = new Map<string, ArticleGroup>();
  for (const article of articles) {
    const category = article.category.trim() || 'General';
    const group = groups.get(category) ?? { category, articles: [] };
    group.articles.push(article);
    groups.set(category, group);
  }
  return [...groups.values()];
}

function ArticleGroups({ articles }: { articles: HelpArticleSummary[] }) {
  const groups = groupArticles(articles);
  if (groups.length === 0) {
    return (
      <EmptyState
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <BookOpen />
          </IconBadge>
        }
        title="No guides here yet"
        description="Try another tab, or send us your question."
        className="mx-auto py-10"
      />
    );
  }
  return (
    <div className="grid gap-12">
      {groups.map((group) => (
        <section key={group.category} aria-label={group.category}>
          <h2 className="headline text-2xl font-medium sm:text-3xl">{group.category}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.articles.map((article) => (
              <li key={article.slug}>
                <Card
                  asChild
                  spotlight
                  className="lift-card grid h-full content-start gap-2 p-5 active:scale-98 sm:p-6"
                >
                  <Link to={`/help/${article.slug}`} viewTransition>
                    <span className="font-semibold text-ink">{article.title}</span>
                    <span className="text-sm text-muted">{article.summary}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read
                      <ArrowRight aria-hidden="true" className="nudge-right size-4" />
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-5">
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </div>
  );
}

/**
 * The help centre (spec §8, help and support): guides for Guests and Hosts from the help articles admins
 * publish, with a switch between everyone's, Guests' and Hosts', and the way to the support team.
 */
export function HelpPage() {
  const [audience, setAudience] = useState<Filter>('ALL');
  const articles = useHelpArticles(audience === 'ALL' ? undefined : (audience as HelpAudience));

  return (
    <>
      <PageMeta page={seoPage('/help')} />
      <PageHero
        tone="light"
        art={ContourLines}
        eyebrow="Help centre"
        title="How can we help?"
        lead={
          <p>
            Guides to booking, hosting, payments and trips. For anything about one of your bookings,{' '}
            <Link to="/account/support" viewTransition className="link-underline font-medium text-primary">
              see your support requests
            </Link>
            .
          </p>
        }
      />

      <section aria-label="Help articles" className="pt-12 sm:pt-16 lg:pt-20">
        <Container>
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Show guides for"
            options={AUDIENCE_TABS}
            value={audience}
            onChange={setAudience}
            className="w-full max-w-md"
          />
          <div
            role="tabpanel"
            id={tabPanelId(TAB_PREFIX, audience)}
            aria-labelledby={tabId(TAB_PREFIX, audience)}
            className="mt-12"
          >
            {articles.isPending && <ArticlesSkeleton />}
            {articles.isError && (
              <SectionError
                title="We couldn’t load the guides"
                description="Try again in a moment."
                onRetry={() => articles.refetch()}
                className="max-w-2xl"
              />
            )}
            {articles.data && (
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={audience} {...swapUp}>
                  <ArticleGroups articles={articles.data} />
                </m.div>
              </AnimatePresence>
            )}
          </div>
        </Container>
      </section>

      <CtaBand
        id="help-next"
        title="Still stuck?"
        description="Send us a message and our support team will reply by email. In an emergency, call 111."
        actions={
          <Magnet>
            <Button variant="accent" size="lg" asChild>
              <Link to="/contact" viewTransition>
                <LifeBuoy aria-hidden="true" />
                Contact support
              </Link>
            </Button>
          </Magnet>
        }
      />
    </>
  );
}
