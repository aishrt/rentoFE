import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { SearchParams } from '@/api/types';

/** Cars per page of results; "Show more" adds the next page. */
export const PAGE_SIZE = 24;

/**
 * One search's results, a page at a time. The previous results stay on screen while new ones load after a
 * filter changes, so the grid can re-order smoothly instead of flashing to skeletons (plan §12.4).
 */
export function useSearchResults(query: SearchParams) {
  return useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET('/search', {
          params: { query: { ...query, page: pageParam, pageSize: PAGE_SIZE } },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Makes and models of live cars, for the make and model filter. */
export function useVehicleMakes() {
  return useQuery({
    queryKey: ['search', 'makes'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/search/makes', { signal }))).makes,
    staleTime: 10 * 60_000,
  });
}
