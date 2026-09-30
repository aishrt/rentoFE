import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { seoPage } from '@/seo/pages';
import { PageMeta } from './page-meta';

const headTag = (selector: string) => document.head.querySelectorAll(selector);

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

describe('PageMeta', () => {
  it("sets an indexable page's title, description and canonical URL from the SEO table", () => {
    render(<PageMeta page={seoPage('/')} />);

    expect(document.title).toBe('Rento Vroom · Rent a car from local owners across New Zealand');
    expect(headTag('link[rel="canonical"]')[0]).toHaveAttribute('href', 'https://www.rentovroom.com/');
    expect(headTag('meta[name="robots"]')).toHaveLength(0);
  });

  it('keeps a page that is not built yet out of search results', () => {
    render(<PageMeta page={seoPage('/help')} />);

    expect(document.title).toBe('Help centre · Rento Vroom');
    expect(headTag('meta[name="robots"]')[0]).toHaveAttribute('content', 'noindex, follow');
    expect(headTag('link[rel="canonical"]')).toHaveLength(0);
  });

  it('replaces the tags written into the HTML file at build time, leaving one of each', () => {
    document.head.innerHTML = [
      '<title data-prerendered>How it works · Rento Vroom</title>',
      '<meta data-prerendered name="description" content="From the build" />',
      '<meta property="og:title" content="How it works · Rento Vroom" />',
    ].join('');

    render(<PageMeta page={seoPage('/how-it-works')} />);

    expect(headTag('title')).toHaveLength(1);
    expect(headTag('meta[name="description"]')).toHaveLength(1);
    expect(headTag('[data-prerendered]')).toHaveLength(0);
    // Link-preview tags aren't set by the app, so the built ones stay.
    expect(headTag('meta[property="og:title"]')).toHaveLength(1);
  });

  it('wins over a static <title> that was not prerendered, such as index.html in dev', () => {
    const staticTitle = document.createElement('title');
    staticTitle.textContent = 'Static title from index.html';
    document.head.prepend(staticTitle);

    render(<PageMeta title="Staff log-in" />);

    expect(document.title).toBe('Staff log-in · Rento Vroom');
  });

  it('still takes a plain title for private pages', () => {
    render(<PageMeta title="Overview · Staff portal" noindex />);

    expect(document.title).toBe('Overview · Staff portal · Rento Vroom');
    expect(headTag('meta[name="robots"]')[0]).toHaveAttribute('content', 'noindex, nofollow');
  });
});
