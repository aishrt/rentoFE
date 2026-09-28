import { useEffect } from 'react';
import { env } from '@/lib/env';
import { PRERENDERED_ATTRIBUTE, canonicalUrl } from '@/seo/head';
import { DEFAULT_TITLE, SITE_NAME, documentTitle, isIndexable, robotsFor, type SeoPage } from '@/seo/pages';

interface PageMetaProps {
  /** A page from the SEO table (src/seo/pages.ts), with its title, description, robots rule and canonical URL. */
  page?: SeoPage;
  /** Page title; the site name is added after it. */
  title?: string;
  description?: string;
  /** Keep private pages (sign-in, admin) out of search results (plan §1.4). */
  noindex?: boolean;
}

function removePrerenderedTags() {
  document.head.querySelectorAll(`[${PRERENDERED_ATTRIBUTE}]`).forEach((tag) => tag.remove());
}

/** React 19 moves these tags into <head> and updates them as the visitor navigates (plan §1.4, item 3). */
export function PageMeta({ page, title, description, noindex }: PageMetaProps) {
  // The page's HTML file came with the same tags written at build time. Once these are in place,
  // those copies go, so they can't linger as duplicates after the next navigation.
  useEffect(removePrerenderedTags, []);

  const pageTitle = page ? documentTitle(page) : title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  const pageDescription = page?.description ?? description;
  const robots = page ? robotsFor(page) : noindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <>
      <title>{pageTitle}</title>
      {pageDescription && <meta name="description" content={pageDescription} />}
      {robots !== 'index, follow' && <meta name="robots" content={robots} />}
      {page && isIndexable(page) && <link rel="canonical" href={canonicalUrl(env.siteUrl, page.path)} />}
    </>
  );
}
