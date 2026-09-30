import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CancellationTiers, CancellationTiersSkeleton } from '@/features/content/cancellation-tiers';
import { useLegalDocument, usePolicies } from '@/features/content/content-api';
import {
  formatUpdatedDate,
  sectionHeadingOffset,
  tableOfContents,
  withoutTitleHeading,
} from '@/features/content/legal';
import { parseMarkdown } from '@/features/content/markdown';
import { Markdown } from '@/features/content/markdown-view';
import { PageHero } from '@/features/content/page-hero';
import { cn } from '@/lib/cn';
import { NotFoundPage } from '@/routes/errors/not-found-page';
import { seoPage } from '@/seo/pages';
import { legalDocumentFor, legalDocuments, type LegalDocument } from './legal-documents';

/** The contents list shows once a document has enough sections to need one. */
const MIN_CONTENTS_ENTRIES = 3;

const asideHeadingClasses = 'eyebrow text-muted';
const asideLinkClasses =
  'flex min-h-10 items-center border-l border-transparent -ml-px pl-4 text-sm transition-colors duration-120 hover:border-primary hover:text-ink';

/**
 * The live cancellation tiers (GET /policies), shown with the Cancellation Policy's legal text so the page
 * always matches what the system charges (plan §9, Days 12–14).
 */
function LiveTiers() {
  const policies = usePolicies();

  return (
    <section aria-labelledby="tiers-heading" className="pt-12 sm:pt-16 lg:pt-20">
      <Container>
        <Reveal>
          <SectionHeading
            id="tiers-heading"
            eyebrow="In force today"
            title="Cancellation tiers"
            description="The tiers our booking system applies right now. Every listing shows which one applies to it before you book."
          />
        </Reveal>
        <div className="mt-10">
          {policies.isPending && <CancellationTiersSkeleton />}
          {policies.isError && (
            <SectionError
              title="We couldn’t load the cancellation tiers"
              description="Try again in a moment. The policy text below still applies."
              onRetry={() => policies.refetch()}
            />
          )}
          {policies.data && <CancellationTiers cancellation={policies.data.cancellation} />}
        </div>
      </Container>
    </section>
  );
}

function DocumentSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading the document</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-6 h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function LegalDocumentView({ document }: { document: LegalDocument }) {
  const legal = useLegalDocument(document.key);
  const seo = seoPage(document.path);
  const page = legal.data;
  const blocks = useMemo(
    () => (page ? withoutTitleHeading(parseMarkdown(page.markdown), page.title) : []),
    [page],
  );
  const contents = tableOfContents(blocks);

  const title =
    page?.title ??
    (legal.isError ? (
      seo.title
    ) : (
      <>
        <span className="sr-only">{seo.title}</span>
        <span
          aria-hidden="true"
          className="skeleton inline-block h-[0.9em] w-full max-w-md rounded-md align-middle"
        />
      </>
    ));

  return (
    <>
      <PageMeta page={seo} />
      <PageHero
        tone="light"
        compact
        eyebrow="Legal"
        title={title}
        lead={
          page ? (
            <p className="text-base">
              Version {page.version} · Last updated{' '}
              <time dateTime={page.updatedAt}>{formatUpdatedDate(page.updatedAt)}</time>
            </p>
          ) : legal.isPending ? (
            <Skeleton className="h-5 w-64" />
          ) : null
        }
      />

      {document.key === 'legal.cancellation-policy' && <LiveTiers />}

      <section aria-label={seo.title} className="py-12 sm:py-16 lg:py-20">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
          <Reveal>
            <Card asChild className="p-6 sm:p-10 lg:p-14">
              <article>
                {legal.isPending && <DocumentSkeleton />}
                {legal.isError && (
                  <SectionError
                    title="We couldn’t load this document"
                    description="Check your connection, then try again."
                    onRetry={() => legal.refetch()}
                  />
                )}
                {page && (
                  <Markdown
                    source={blocks}
                    headingOffset={sectionHeadingOffset(blocks)}
                    className="max-w-3xl"
                  />
                )}
              </article>
            </Card>
          </Reveal>

          <aside className="grid content-start gap-10 lg:sticky lg:top-28 lg:self-start">
            {contents.length >= MIN_CONTENTS_ENTRIES && (
              <nav aria-labelledby="contents-heading">
                <h2 id="contents-heading" className={asideHeadingClasses}>
                  On this page
                </h2>
                <ul className="mt-3 grid border-l border-line">
                  {contents.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#${entry.id}`} className={cn(asideLinkClasses, 'text-muted')}>
                        {entry.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <nav aria-labelledby="documents-heading">
              <h2 id="documents-heading" className={asideHeadingClasses}>
                Legal documents
              </h2>
              <ul className="mt-3 grid border-l border-line">
                {legalDocuments.map((other) => {
                  const current = other.path === document.path;
                  return (
                    <li key={other.path}>
                      <Link
                        to={other.path}
                        viewTransition
                        aria-current={current ? 'page' : undefined}
                        className={cn(
                          asideLinkClasses,
                          current ? 'border-primary font-semibold text-ink' : 'text-muted',
                        )}
                      >
                        {other.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </Container>
      </section>
    </>
  );
}

/**
 * Terms & Conditions, Privacy Policy, Cancellation Policy, Host Agreement and Guest Agreement (spec §3): one
 * page that reads each document's Markdown from the CMS by its path, and shows its version and last update.
 */
export function LegalPage() {
  const { pathname } = useLocation();
  const document = legalDocumentFor(pathname);
  if (!document) return <NotFoundPage />;
  // Keyed, so moving between documents starts each one fresh.
  return <LegalDocumentView key={document.key} document={document} />;
}
