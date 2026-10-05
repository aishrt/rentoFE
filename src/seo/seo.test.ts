import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSeoHead, replaceSeoBlock } from './head';
import { findSeoPage, isIndexable, pageFile, robotsFor, seoManifest, seoPage, seoPages } from './pages';

const SITE = 'https://www.example.co.nz';

describe('SEO table', () => {
  it('lists each page once, with a one-segment path', () => {
    const paths = seoPages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^\/([a-z0-9-]+)?$/);
  });

  it('keeps pages that are not built yet, sign-in pages and search results out of search engines', () => {
    expect(isIndexable(seoPage('/'))).toBe(true);
    expect(isIndexable(seoPage('/how-it-works'))).toBe(true);
    expect(robotsFor(seoPage('/help'))).toBe('noindex, follow');
    expect(robotsFor(seoPage('/search'))).toBe('noindex, follow');
    expect(robotsFor(seoPage('/login'))).toBe('noindex, nofollow');
    expect(robotsFor(seoPage('/signup'))).toBe('noindex, nofollow');
  });

  it('gives every page a prerendered file of its own', () => {
    expect(pageFile('/')).toBe('pages/home.html');
    expect(pageFile('/how-it-works')).toBe('pages/how-it-works.html');
    expect(new Set(seoPages.map((page) => pageFile(page.path))).size).toBe(seoPages.length);
  });
});

describe('renderSeoHead', () => {
  it('writes the homepage tags, canonical URL and structured data', () => {
    const head = renderSeoHead(seoPage('/'), SITE);

    expect(head).toContain(
      '<title data-prerendered>Rento Vroom · Rent a car from local owners across New Zealand</title>',
    );
    expect(head).toContain(`<link data-prerendered rel="canonical" href="${SITE}/" />`);
    expect(head).toContain(`<meta property="og:url" content="${SITE}/" />`);
    expect(head).toContain(`<meta property="og:image" content="${SITE}/og-image.png" />`);
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(head).not.toContain('name="robots"');

    const json = JSON.parse(head.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1]!);
    expect(json['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
    ]);
  });

  it('marks a page that is not built yet noindex, with no canonical URL or structured data', () => {
    const head = renderSeoHead(seoPage('/help'), SITE);

    expect(head).toContain('<title data-prerendered>Help centre · Rento Vroom</title>');
    expect(head).toContain('<meta data-prerendered name="robots" content="noindex, follow" />');
    expect(head).toContain(`<meta property="og:url" content="${SITE}/help" />`);
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('application/ld+json');
  });

  it("gives the app's own file the site's preview but no URL of its own", () => {
    const head = renderSeoHead(undefined, SITE);
    expect(head).toContain('<meta property="og:title"');
    expect(head).not.toContain('og:url');
    expect(head).not.toContain('canonical');
  });

  it('escapes text so a title can never break out of its tag', () => {
    const head = renderSeoHead({ path: '/x', title: 'A "quoted" <b>', description: 'Tom & Jerry' }, SITE);
    expect(head).toContain('A &quot;quoted&quot; &lt;b&gt; · Rento Vroom');
    expect(head).toContain('content="Tom &amp; Jerry"');
    expect(head).not.toContain('<b>');
  });
});

describe('replaceSeoBlock', () => {
  const html = '<head>\n<!-- seo:start -->\n<title>Old</title>\n<!-- seo:end -->\n</head>';

  it('swaps the block and keeps its markers for the next replacement', () => {
    const once = replaceSeoBlock(html, '<title>New</title>');
    expect(once).toContain('<title>New</title>');
    expect(once).not.toContain('Old');
    expect(replaceSeoBlock(once, '<title>Again</title>')).toContain('<title>Again</title>');
  });

  it('fails the build when index.html has no SEO block', () => {
    expect(() => replaceSeoBlock('<head></head>', '')).toThrow(/seo:start/);
  });
});

describe('CloudFront page router (infra/web-router.js)', () => {
  const source = readFileSync(resolve('infra/web-router.js'), 'utf8');
  const { handler, PAGES } = new Function(`${source}\nreturn { handler, PAGES };`)() as {
    handler: (event: unknown) => {
      uri?: string;
      statusCode?: number;
      headers?: Record<string, { value: string }>;
    };
    PAGES: string[];
  };
  const route = (uri: string, host = 'www.rentovroom.com', querystring = {}) =>
    handler({ request: { uri, querystring, headers: { host: { value: host } } } });

  it('knows exactly the pages in the SEO table', () => {
    expect([...PAGES].sort()).toEqual(seoPages.map((page) => page.path).sort());
  });

  it("serves each page's own file, with or without a trailing slash", () => {
    for (const page of seoPages) expect(route(page.path).uri).toBe(`/${pageFile(page.path)}`);
    expect(route('/how-it-works/').uri).toBe('/pages/how-it-works.html');
  });

  it('loads the app for every other page URL, and leaves files alone', () => {
    expect(route('/admin').uri).toBe('/index.html');
    expect(route('/no-such-page').uri).toBe('/index.html');
    expect(route('/assets/index-abc123.js').uri).toBe('/assets/index-abc123.js');
    expect(route('/robots.txt').uri).toBe('/robots.txt');
    expect(route('/sitemap.xml').uri).toBe('/sitemap.xml');
    expect(route('/seo-manifest.json').uri).toBe('/seo-manifest.json');
  });

  it('leaves vehicle and destination pages for the backend, each with one URL', () => {
    expect(route('/cars/2021-toyota-corolla-auckland').uri).toBe('/cars/2021-toyota-corolla-auckland');
    expect(route('/rental/queenstown').uri).toBe('/rental/queenstown');

    const trailing = route('/cars/2021-toyota-corolla-auckland/', 'www.rentovroom.com', {
      utm_source: { value: 'x' },
    });
    expect(trailing.statusCode).toBe(301);
    expect(trailing.headers?.location?.value).toBe('/cars/2021-toyota-corolla-auckland?utm_source=x');
    expect(route('/cars/').headers?.location?.value).toBe('/cars');
    // Browse cars is a page of the website itself.
    expect(route('/cars').uri).toBe('/pages/cars.html');
  });

  it('loads the staging app for vehicle and destination pages on the staging website', () => {
    const staging = (uri: string) => route(uri, 'staging.rentovroom.com');
    expect(staging('/cars/2021-toyota-corolla-auckland').uri).toBe('/index.html');
    expect(staging('/rental/queenstown').uri).toBe('/index.html');
    expect(staging('/cars').uri).toBe('/pages/cars.html');
    expect(staging('/how-it-works').uri).toBe('/pages/how-it-works.html');
    expect(staging('/assets/index-abc123.js').uri).toBe('/assets/index-abc123.js');
  });

  it('moves the bare domain to www, keeping the path and query', () => {
    const response = route('/search', 'rentovroom.com', { where: { value: 'Queenstown' } });
    expect(response.statusCode).toBe(301);
    expect(response.headers?.location?.value).toBe('https://www.rentovroom.com/search?where=Queenstown');
  });
});

describe('seoManifest', () => {
  it('tells the backend which pages search engines may index, and that car and city pages are built', () => {
    const manifest = seoManifest();
    expect(manifest).toMatchObject({ vehiclePages: true, destinationPages: true });
    expect(manifest.indexablePaths).toContain('/');
    expect(manifest.indexablePaths).toContain('/cars');
    expect(manifest.indexablePaths).toContain('/terms');
    for (const path of ['/search', '/help', '/login', '/signup', '/forgot-password']) {
      expect(manifest.indexablePaths).not.toContain(path);
    }
  });
});

describe('findSeoPage', () => {
  it('returns undefined for a path that is not in the table', () => {
    expect(findSeoPage('/admin')).toBeUndefined();
  });
});
