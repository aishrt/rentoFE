import { keepPreviousData, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { QuoteRequest } from '@/api/types';

/*
 * Listing data (plan §11). The frontend never calculates a price: cards show the API's estimate, and the
 * listing asks `POST /vehicles/{id}/quote` for the chosen dates and options (plan §5).
 */

/** A live listing by its slug. Cards prefetch it on hover and as they come into view (plan §12.5). */
export function vehicleQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['vehicle', slug],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/vehicles/{slug}', { params: { path: { slug } }, signal }))).vehicle,
    staleTime: 5 * 60_000,
  });
}

export const featuredVehiclesQuery = queryOptions({
  queryKey: ['vehicles', 'featured'],
  queryFn: async ({ signal }) => (await unwrap(client.GET('/vehicles/featured', { signal }))).vehicles,
  staleTime: 5 * 60_000,
});

/** When the car is taken over the next six months: merged busy times, never why. */
export function useVehicleAvailability(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'availability'],
    queryFn: ({ signal }) =>
      unwrap(client.GET('/vehicles/{id}/availability', { params: { path: { id: vehicleId } }, signal })),
    staleTime: 60_000,
  });
}

/** Published guest reviews, ten a page. */
export function useVehicleReviews(vehicleId: string) {
  return useInfiniteQuery({
    queryKey: ['vehicle', vehicleId, 'reviews'],
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET('/vehicles/{id}/reviews', {
          params: { path: { id: vehicleId }, query: { page: pageParam } },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}

/**
 * The price and any problems for a trip. Quotes hold nothing, so asking is safe; the previous quote stays
 * on screen while the next one loads, so the price doesn't flicker.
 */
export function useQuote(vehicleId: string, request: QuoteRequest | null) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'quote', request],
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.POST('/vehicles/{id}/quote', {
            params: { path: { id: vehicleId } },
            body: request!,
            signal,
          }),
        )
      ).quote,
    enabled: request !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
