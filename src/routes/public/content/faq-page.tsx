import { ArrowRight, MessageCircleQuestion } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Faq } from '@/api/types';
import { ContourLines } from '@/components/brand/patterns/contour-lines';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Magnet } from '@/components/motion/magnet';
import { swapUp } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { Accordion, AccordionSkeleton } from '@/features/content/accordion';
import { useFaqs } from '@/features/content/content-api';
import { CtaBand } from '@/features/content/cta-band';
import { filterFaqs, faqPageJsonLd, groupFaqs, type FaqFilter } from '@/features/content/faqs';
import { JsonLd } from '@/features/content/json-ld';
import { PageHero } from '@/features/content/page-hero';
import { seoPage } from '@/seo/pages';
import { audienceTabs, closing, hero } from './faq-content';

const TAB_PREFIX = 'faq-audience';

function FaqGroups({ faqs }: { faqs: Faq[] }) {
  const groups = groupFaqs(faqs);

  if (groups.length === 0) {
    return (
      <EmptyState
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <MessageCircleQuestion />
          </IconBadge>
        }
        title="No questions here yet"
        description="Try another tab, or send us your question."
        className="mx-auto py-10"
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
      {/* Topic links on desktop: the list of answers can be long, and this keeps every topic one click away. */}
      <nav aria-label="FAQ topics" className="hidden lg:block">
        <ul className="sticky top-28 grid gap-1 border-l border-line">
          {groups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="-ml-px flex min-h-11 items-center justify-between gap-3 border-l border-transparent pl-4 text-sm font-medium text-muted transition-colors duration-120 hover:border-primary hover:text-ink"
              >
                {group.category}
                <span className="text-xs text-muted tabular-nums">{group.faqs.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-14">
        {groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className="scroll-mt-28"
          >
            <h2 id={`${group.id}-heading`} className="headline text-3xl font-medium">
              {group.category}
            </h2>
            <Accordion
              className="mt-5"
              items={group.faqs.map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function FaqSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
      <div aria-hidden="true" className="hidden gap-3 lg:grid lg:content-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid gap-5">
        <Skeleton className="h-9 w-48" />
        <AccordionSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * FAQs (plan §9, Days 12–14): every question from the database, grouped by topic, with a switch between
 * everyone's, guests' and hosts' questions. FAQPage structured data goes into the page so search engines can
 * show the answers.
 */
export function FaqPage() {
  const [audience, setAudience] = useState<FaqFilter>('ALL');
  const faqs = useFaqs();

  return (
    <>
      <PageMeta page={seoPage('/faq')} />
      {faqs.data && faqs.data.length > 0 && <JsonLd data={faqPageJsonLd(faqs.data)} />}
      <PageHero
        tone="light"
        art={ContourLines}
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={
          <p>
            {hero.lead} Can’t find yours?{' '}
            <Link to="/contact" viewTransition className="link-underline font-medium text-primary">
              Get in touch
            </Link>
            .
          </p>
        }
      />

      <section aria-label="Questions and answers" className="pt-12 sm:pt-16 lg:pt-20">
        <Container>
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Show questions for"
            options={audienceTabs}
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
            {faqs.isPending && <FaqSkeleton />}
            {faqs.isError && (
              <SectionError
                title="We couldn’t load the questions"
                description="Try again in a moment."
                onRetry={() => faqs.refetch()}
                className="max-w-2xl"
              />
            )}
            {faqs.data && (
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={audience} {...swapUp}>
                  <FaqGroups faqs={filterFaqs(faqs.data, audience)} />
                </m.div>
              </AnimatePresence>
            )}
          </div>
        </Container>
      </section>

      <CtaBand
        id="faq-next"
        title={closing.title}
        description={closing.description}
        actions={
          <Magnet>
            <Button variant="accent" size="lg" asChild>
              <Link to="/contact" viewTransition>
                Contact us
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
          </Magnet>
        }
      />
    </>
  );
}
