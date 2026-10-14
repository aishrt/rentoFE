/*
 * The SEO table for the static public pages (plan §1.4). The build step (scripts/prerender-meta.ts)
 * writes one HTML file per page with these tags, so link previews and crawlers that don't run
 * JavaScript see the right title and description; PageMeta sets the same tags while the app runs.
 * Vehicle and destination pages get theirs from the backend's /pages route instead.
 *
 * Adding a page here also means adding its path to infra/web-router.js (a test checks they match).
 * This file is shared with the Node build script, so it imports nothing from the app.
 */

export const SITE_NAME = 'Rento Vroom';
export const DEFAULT_TITLE = `${SITE_NAME} · Rent a car from local owners across New Zealand`;
export const DEFAULT_DESCRIPTION =
  'Rent a car from local owners across New Zealand, or earn money by sharing your own car. All prices in NZD.';

/** The image link previews show (Facebook, WhatsApp, iMessage, LinkedIn, X). */
export const SHARE_IMAGE = { path: '/og-image.png', width: 1200, height: 630, alt: DEFAULT_TITLE } as const;

export type Robots = 'index, follow' | 'noindex, follow' | 'noindex, nofollow';

export interface SeoPage {
  path: string;
  /** Page name for the browser tab and search results; " · Rento Vroom" is added after it. */
  title: string;
  description: string;
  /** Not built yet: shows a "coming soon" page and stays out of search results until it is (plan §9). */
  comingSoon?: boolean;
  /** Pages that must never be indexed: sign-in pages, and search results (plan §1.4, item 5). */
  robots?: Exclude<Robots, 'index, follow'>;
}

export const seoPages: SeoPage[] = [
  { path: '/', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  {
    path: '/cars',
    title: 'Browse cars',
    description: 'Every car on Rento Vroom, with filters for price, seats, EVs, delivery and more.',
  },
  {
    path: '/search',
    title: 'Search results',
    description: 'Cars available for your dates, with the estimated total for each one.',
    // One URL for every mix of place, dates and filters; the clean city pages are indexed instead.
    robots: 'noindex, follow',
  },
  {
    path: '/how-it-works',
    title: 'How it works',
    description: 'A step-by-step guide to renting a car and to sharing yours.',
  },
  {
    path: '/become-a-host',
    title: 'Become a host',
    description: 'Share your car on your terms and earn when you are not using it.',
  },
  {
    path: '/safety',
    title: 'Safety',
    description: 'How we verify members, record each trip and help if something goes wrong.',
  },
  {
    path: '/insurance',
    title: 'Insurance and protection',
    description: 'The protection options for each trip, and what they cover.',
  },
  {
    path: '/faq',
    title: 'FAQs',
    description: 'Answers to the most common questions from guests and hosts.',
  },
  {
    path: '/help',
    title: 'Help centre',
    description: 'Guides for guests and hosts, and a way to contact our support team.',
  },
  {
    path: '/about',
    title: 'About us',
    description: 'The people and the idea behind Rento Vroom.',
  },
  {
    path: '/contact',
    title: 'Contact us',
    description: 'Send us a message and our support team will get back to you.',
  },
  {
    path: '/terms',
    title: 'Terms and conditions',
    description: 'The terms for using Rento Vroom.',
  },
  {
    path: '/privacy',
    title: 'Privacy policy',
    description: 'How we collect, use and protect your personal information.',
  },
  {
    path: '/cancellation-policy',
    title: 'Cancellation policy',
    description: 'What happens when a guest or host cancels a trip.',
  },
  {
    path: '/host-agreement',
    title: 'Host agreement',
    description: 'The agreement between Rento Vroom and hosts.',
  },
  {
    path: '/guest-agreement',
    title: 'Guest agreement',
    description: 'The agreement between Rento Vroom and guests.',
  },
  {
    path: '/login',
    title: 'Log in',
    description: 'Log in to Rento Vroom to manage your trips and bookings.',
    robots: 'noindex, nofollow',
  },
  {
    path: '/signup',
    title: 'Create an account',
    description: 'Sign up to book cars from local hosts, or to list your own.',
    robots: 'noindex, nofollow',
  },
  {
    path: '/forgot-password',
    title: 'Reset your password',
    description: 'We will email you a link to choose a new password.',
    robots: 'noindex, nofollow',
  },
];

/**
 * Pages whose tags come from the backend's /pages route (plan §1.4, item 2): vehicle pages, and city and
 * destination landing pages. CloudFront sends their URLs to the backend (infra/web-router.js leaves them
 * alone). Until they're built (plan §9, Phase 2) they show "coming soon", and the manifest below tells
 * the backend to keep them out of search results.
 */
export interface BackendTaggedPage {
  /** A React Router path. */
  path: string;
  kind: 'vehicle' | 'destination';
  comingSoon?: boolean;
}

export const backendTaggedPages: BackendTaggedPage[] = [
  { path: '/cars/:slug', kind: 'vehicle' },
  { path: '/rental/:city', kind: 'destination' },
];

/**
 * What the backend's page tags and sitemap.xml need to know about the website. The build writes it to
 * dist/seo-manifest.json, and the backend reads it from the live site.
 */
export interface SeoManifest {
  indexablePaths: string[];
  vehiclePages: boolean;
  destinationPages: boolean;
}

export function seoManifest(): SeoManifest {
  const built = (kind: BackendTaggedPage['kind']) =>
    backendTaggedPages.some((page) => page.kind === kind && !page.comingSoon);
  return {
    indexablePaths: seoPages.filter(isIndexable).map((page) => page.path),
    vehiclePages: built('vehicle'),
    destinationPages: built('destination'),
  };
}

export function findSeoPage(path: string): SeoPage | undefined {
  return seoPages.find((page) => page.path === path);
}

export function seoPage(path: string): SeoPage {
  const page = findSeoPage(path);
  if (!page) throw new Error(`${path} is not in the SEO table (src/seo/pages.ts)`);
  return page;
}

/** The text of the page's <title>. */
export function documentTitle(page: SeoPage): string {
  return page.path === '/' ? page.title : `${page.title} · ${SITE_NAME}`;
}

export function robotsFor(page: SeoPage): Robots {
  return page.robots ?? (page.comingSoon ? 'noindex, follow' : 'index, follow');
}

export function isIndexable(page: SeoPage): boolean {
  return robotsFor(page) === 'index, follow';
}

/** The page's prerendered file in dist/, which infra/web-router.js serves for its URL. */
export function pageFile(path: string): string {
  return `pages/${path === '/' ? 'home' : path.slice(1)}.html`;
}
