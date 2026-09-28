import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SHARE_IMAGE,
  SITE_NAME,
  documentTitle,
  isIndexable,
  robotsFor,
  type SeoPage,
} from './pages';

/**
 * index.html keeps its SEO tags between these markers. The build step replaces the block for
 * each static page, and the backend's /pages route does the same for vehicle and city pages.
 */
const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;

/**
 * Tags the app sets again while it runs (PageMeta). They carry `data-prerendered` so the app can
 * remove these copies once its own are in place and nothing is duplicated after navigating.
 */
export const PRERENDERED_ATTRIBUTE = 'data-prerendered';

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const canonicalUrl = (siteUrl: string, path: string) =>
  path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`;

function structuredData(page: SeoPage, siteUrl: string): object {
  const website = { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: SITE_NAME, url: `${siteUrl}/` };
  if (page.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: SITE_NAME, url: `${siteUrl}/` },
        {
          ...website,
          description: page.description,
          inLanguage: 'en-NZ',
          publisher: { '@id': `${siteUrl}/#organization` },
        },
      ],
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonicalUrl(siteUrl, page.path),
    inLanguage: 'en-NZ',
    isPartOf: { '@id': website['@id'] },
  };
}

/**
 * The <head> tags for one page, or for the app itself when `page` is undefined: the file served
 * for every other URL, which gets the site's own preview and no canonical URL.
 */
export function renderSeoHead(page: SeoPage | undefined, siteUrl: string): string {
  const title = page ? documentTitle(page) : DEFAULT_TITLE;
  const description = page?.description ?? DEFAULT_DESCRIPTION;
  const url = page && canonicalUrl(siteUrl, page.path);
  const robots = page && robotsFor(page);
  const meta = (attribute: 'name' | 'property', key: string, content: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

  const tags = [
    `<title ${PRERENDERED_ATTRIBUTE}>${escapeHtml(title)}</title>`,
    `<meta ${PRERENDERED_ATTRIBUTE} name="description" content="${escapeHtml(description)}" />`,
    robots &&
      robots !== 'index, follow' &&
      `<meta ${PRERENDERED_ATTRIBUTE} name="robots" content="${robots}" />`,
    page &&
      url &&
      isIndexable(page) &&
      `<link ${PRERENDERED_ATTRIBUTE} rel="canonical" href="${escapeHtml(url)}" />`,
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'en_NZ'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    url && meta('property', 'og:url', url),
    meta('property', 'og:image', `${siteUrl}${SHARE_IMAGE.path}`),
    meta('property', 'og:image:width', String(SHARE_IMAGE.width)),
    meta('property', 'og:image:height', String(SHARE_IMAGE.height)),
    meta('property', 'og:image:alt', SHARE_IMAGE.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    page &&
      isIndexable(page) &&
      // "<" is escaped so the JSON can never close the script tag early.
      `<script type="application/ld+json">${JSON.stringify(structuredData(page, siteUrl)).replaceAll('<', '\\u003c')}</script>`,
  ];

  return tags.filter(Boolean).join('\n    ');
}

/** Swaps index.html's SEO block for new tags, keeping the markers for the next replacement. */
export function replaceSeoBlock(html: string, tags: string): string {
  if (!SEO_BLOCK.test(html)) throw new Error('index.html has no <!-- seo:start --> … <!-- seo:end --> block');
  return html.replace(SEO_BLOCK, () => `<!-- seo:start -->\n    ${tags}\n    <!-- seo:end -->`);
}
