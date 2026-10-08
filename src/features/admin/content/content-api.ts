import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type {
  AdminDestination,
  AdminFaq,
  AdminFeaturedVehicles,
  AdminHelpArticle,
  DestinationEdit,
  FaqInput,
  HelpArticleInput,
  LegalPage,
  LegalPageEdit,
} from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';

/*
 * The website's content in the staff portal (plan §9, Days 19–23), admin only: the homepage's featured
 * cars, the legal pages, destination pages, FAQs and help articles. The API clears the public pages'
 * one-minute cache when something is saved, so a change shows on the website within a minute.
 */

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const contentQueryKey = ['admin', 'content'] as const;
export const featuredVehiclesQueryKey = ['admin', 'content', 'featured-vehicles'] as const;
export const vehicleChoicesQueryKey = (q: string) => ['admin', 'content', 'vehicles', q] as const;
export const legalPagesQueryKey = ['admin', 'content', 'legal'] as const;
export const destinationsQueryKey = ['admin', 'content', 'destinations'] as const;
export const faqsQueryKey = ['admin', 'content', 'faqs'] as const;
export const helpArticlesQueryKey = ['admin', 'content', 'help-articles'] as const;

/** The homepage has room for eight featured cars. */
export const MAX_FEATURED = 8;

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
const CONTENT_ERROR_CODES = ['UNKNOWN_VEHICLE', 'NOT_FOUND', 'SLUG_TAKEN', 'FORBIDDEN'];

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
