import { TICKET_CATEGORIES, TICKET_STATUSES, type InboxFilters } from './support-api';

/*
 * The inbox keeps its filters in the address (?status=pending&category=payment&q=refund&mine=true&page=2),
 * so a link or the Back button opens the same view.
 */

const pick = <Value extends string>(values: readonly Value[], raw: string | null) =>
  values.find((value) => value === raw?.toUpperCase());

export function inboxFiltersFrom(params: URLSearchParams): InboxFilters {
  const page = Number(params.get('page'));
  return {
    status: pick(TICKET_STATUSES, params.get('status')),
    category: pick(TICKET_CATEGORIES, params.get('category')),
    q: params.get('q')?.trim() || undefined,
    mine: params.get('mine') === 'true',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function inboxSearchParams(filters: InboxFilters): Record<string, string> {
  return {
    ...(filters.status && { status: filters.status.toLowerCase() }),
    ...(filters.category && { category: filters.category.toLowerCase() }),
    ...(filters.q && { q: filters.q }),
    ...(filters.mine && { mine: 'true' }),
    ...(filters.page > 1 && { page: String(filters.page) }),
  };
}

/** A search, category or "Assigned to me" narrows the list beyond its tab. */
export const isFiltered = (filters: InboxFilters) => Boolean(filters.q || filters.category || filters.mine);
