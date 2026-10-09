import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type {
  AdminDestination,
  AdminFaq,
  AdminFeaturedReviews,
  AdminFeaturedVehicles,
  AdminHelpArticle,
  AdminHomeHero,
  AdminSiteFooter,
  DestinationCreate,
  DestinationEdit,
  FaqInput,
  HelpArticleInput,
  HomeHero,
  LegalPage,
  LegalPageEdit,
  SiteFooter,
} from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';

/*
 * The website's content in the staff portal (plan §9, Days 19–23; §12.6), admin only: the homepage's
 * headline, featured cars and customer reviews, the footer's links, the legal pages, destination pages, FAQs
 * and help articles. The API clears the public pages' one-minute cache when something is saved, so a change
 * shows on the website within a minute.
 */

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const contentQueryKey = ['admin', 'content'] as const;
export const featuredVehiclesQueryKey = ['admin', 'content', 'featured-vehicles'] as const;
export const vehicleChoicesQueryKey = (q: string) => ['admin', 'content', 'vehicles', q] as const;
export const legalPagesQueryKey = ['admin', 'content', 'legal'] as const;
export const destinationsQueryKey = ['admin', 'content', 'destinations'] as const;
export const faqsQueryKey = ['admin', 'content', 'faqs'] as const;
export const helpArticlesQueryKey = ['admin', 'content', 'help-articles'] as const;
export const heroQueryKey = ['admin', 'content', 'hero'] as const;
export const footerQueryKey = ['admin', 'content', 'footer'] as const;
export const featuredReviewsQueryKey = ['admin', 'content', 'featured-reviews'] as const;
export const reviewChoicesQueryKey = (q: string) => ['admin', 'content', 'reviews', q] as const;

/** The homepage has room for eight featured cars. */
export const MAX_FEATURED = 8;
/** …and six customer reviews. */
export const MAX_FEATURED_REVIEWS = 6;

// Featured cars ----------------------------------------------------------------------------------------------

/** The cars picked for the homepage, in order, and whether each is in search now. */
export function useFeaturedVehicles() {
  return useQuery({
    queryKey: featuredVehiclesQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/featured-vehicles', { signal })),
  });
}

/** Live cars to feature, best rated first, by make, model or town. */
export function useVehicleChoices(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: vehicleChoicesQueryKey(query),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/content/vehicles', { params: { query: query ? { q: query } : {} }, signal })),
    select: (data) => data.vehicles,
    staleTime: 30_000,
    // The last results stay while the next search loads, so the list doesn't flash empty as you type.
    placeholderData: keepPreviousData,
  });
}

/** Up to eight cars, in order. None: the homepage shows the best-rated live cars. */
export async function saveFeaturedVehiclesRequest(vehicleIds: string[]): Promise<AdminFeaturedVehicles> {
  return unwrap(client.PUT('/admin/content/featured-vehicles', { body: { vehicleIds } }));
}

// Legal pages ------------------------------------------------------------------------------------------------

export function useLegalPages() {
  return useQuery({
    queryKey: legalPagesQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/legal', { signal })),
    select: (data) => data.pages,
  });
}

/** Corrects a page's wording. The version stays the same, so nobody is asked to accept it again. */
export async function saveLegalPageRequest(input: {
  key: LegalPage['key'];
  edit: LegalPageEdit;
}): Promise<LegalPage> {
  const response = await unwrap(
    client.PUT('/admin/content/legal/{key}', { params: { path: { key: input.key } }, body: input.edit }),
  );
  return response.page;
}

// Destinations -----------------------------------------------------------------------------------------------

/** Every destination page, homepage tiles first. */
export function useDestinations() {
  return useQuery({
    queryKey: destinationsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/destinations', { signal })),
    select: (data) => data.destinations,
  });
}

/** Adds a destination page. Another page with the web address: 409 SLUG_TAKEN. */
export async function createDestinationRequest(input: DestinationCreate): Promise<AdminDestination> {
  const response = await unwrap(client.POST('/admin/content/destinations', { body: input }));
  return response.destination;
}

export async function editDestinationRequest(input: {
  slug: string;
  edit: DestinationEdit;
}): Promise<AdminDestination> {
  const response = await unwrap(
    client.PATCH('/admin/content/destinations/{slug}', {
      params: { path: { slug: input.slug } },
      body: input.edit,
    }),
  );
  return response.destination;
}

// Homepage headline, customer reviews and footer links (plan §12.6) ---------------------------------------------

/** The homepage's headline and supporting line; `saved: false` while the original text shows. */
export function useHeroText() {
  return useQuery({
    queryKey: heroQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/hero', { signal })),
  });
}

export async function saveHeroTextRequest(hero: HomeHero): Promise<AdminHomeHero> {
  return unwrap(client.PUT('/admin/content/hero', { body: hero }));
}

/** The footer's groups of links and social accounts; `saved: false` while the original links show. */
export function useFooterLinks() {
  return useQuery({
    queryKey: footerQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/footer', { signal })),
  });
}

export async function saveFooterLinksRequest(footer: SiteFooter): Promise<AdminSiteFooter> {
  return unwrap(client.PUT('/admin/content/footer', { body: footer }));
}

/** The reviews picked for the homepage, in order, with the threshold that shows the section. */
export function useFeaturedReviews() {
  return useQuery({
    queryKey: featuredReviewsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/featured-reviews', { signal })),
  });
}

/** Published Guest reviews with words to quote, newest first, by their words. */
export function useReviewChoices(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: reviewChoicesQueryKey(query),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/content/reviews', { params: { query: query ? { q: query } : {} }, signal })),
    select: (data) => data.reviews,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** Up to six reviews, in order. None: the homepage shows the newest well-rated ones. */
export async function saveFeaturedReviewsRequest(reviewIds: string[]): Promise<AdminFeaturedReviews> {
  return unwrap(client.PUT('/admin/content/featured-reviews', { body: { reviewIds } }));
}

const isHttps = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
};

/** A full https:// address, as the API takes for social accounts. */
export const isHttpsAddress = (value: string) => isHttps(value.trim());

/**
 * A full https:// address, or a path on this website such as /help, as the API takes for links and
 * pictures. Never two slashes or a backslash after the first, which browsers read as another website.
 */
export const isLinkAddress = (value: string) =>
  isHttps(value.trim()) || /^\/(?![/\\])[^\s\\]*$/.test(value.trim());

export const LINK_ADDRESS_MESSAGE =
  'Use a full address starting with https://, or a path on this website starting with /';

// FAQs -------------------------------------------------------------------------------------------------------

/** Every FAQ, by category and then order. */
export function useAdminFaqs() {
  return useQuery({
    queryKey: faqsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/faqs', { signal })),
    select: (data) => data.faqs,
  });
}

/** Adds a FAQ, or saves one when there's an id. */
export async function saveFaqRequest(input: { id?: string; faq: FaqInput }): Promise<AdminFaq> {
  const response = input.id
    ? await unwrap(
        client.PUT('/admin/content/faqs/{id}', { params: { path: { id: input.id } }, body: input.faq }),
      )
    : await unwrap(client.POST('/admin/content/faqs', { body: input.faq }));
  return response.faq;
}

export async function deleteFaqRequest(id: string): Promise<void> {
  await unwrap(client.DELETE('/admin/content/faqs/{id}', { params: { path: { id } } }));
}

// Help articles ----------------------------------------------------------------------------------------------

/** Every help article, published or not, by category and then order. */
export function useAdminHelpArticles() {
  return useQuery({
    queryKey: helpArticlesQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/admin/content/help-articles', { signal })),
    select: (data) => data.articles,
  });
}

/** Adds an article, or saves one when there's an id. Another article's web address: 409 SLUG_TAKEN. */
export async function saveHelpArticleRequest(input: {
  id?: string;
  article: HelpArticleInput;
}): Promise<AdminHelpArticle> {
  const response = input.id
    ? await unwrap(
        client.PUT('/admin/content/help-articles/{id}', {
          params: { path: { id: input.id } },
          body: input.article,
        }),
      )
    : await unwrap(client.POST('/admin/content/help-articles', { body: input.article }));
  return response.article;
}

export async function deleteHelpArticleRequest(id: string): Promise<void> {
  await unwrap(client.DELETE('/admin/content/help-articles/{id}', { params: { path: { id } } }));
}

// Words and helpers ------------------------------------------------------------------------------------------

export type Audience = AdminFaq['audience'];

/** Who a FAQ or help article is for. */
export const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: 'Everyone',
  GUEST: 'Guests',
  HOST: 'Hosts',
};

export const AUDIENCE_OPTIONS = (Object.keys(AUDIENCE_LABELS) as Audience[]).map((value) => ({
  value,
  label: AUDIENCE_LABELS[value],
}));

/** Items grouped by category, keeping the API's order within each and the order categories first appear in. */
export function groupByCategory<Item extends { category: string }>(items: readonly Item[]) {
  const groups = new Map<string, Item[]>();
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return [...groups.entries()].map(([category, members]) => ({ category, items: members }));
}

/** The categories in use, for suggestions. */
export const categoriesOf = (items: readonly { category: string }[]) =>
  [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'en-NZ'));

/** "Changing a booking" → "changing-a-booking": a help article's web address. Macrons become plain letters. */
export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

export const isApiError = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

// These messages come from the API and are already written for people.
const CONTENT_ERROR_CODES = ['UNKNOWN_VEHICLE', 'UNKNOWN_REVIEW', 'NOT_FOUND', 'SLUG_TAKEN', 'FORBIDDEN'];

/**
 * The message a content form shows above its fields for an API error, or null when every part of it
 * shows beside a field. Field messages for fields the form doesn't have show here instead.
 */
export function contentErrorMessage(error: unknown, formFields: readonly string[] = []): string | null {
  if (error instanceof ApiError) {
    if (error.fields) {
      const others = Object.entries(error.fields)
        .filter(([field]) => !formFields.includes(field))
        .map(([, message]) => message);
      return others.length > 0 ? [...new Set(others)].join(' ') : null;
    }
    if (CONTENT_ERROR_CODES.includes(error.code)) return error.message;
  }
  return formErrorMessage(error);
}
