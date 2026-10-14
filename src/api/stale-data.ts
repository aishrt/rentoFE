import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * Whether the API refused a change because what's on screen is out of date: the record changed meanwhile
 * (409, e.g. a request already answered or a case someone else just updated) or is gone (404).
 */
export const isStaleDataError = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 409 || error.status === 404);

/**
 * A mutation's `onError` beside its own error message: when the change was refused because the screen is
 * out of date, the queries that show the record are fetched again, so buttons that no longer apply go.
 */
export function refreshStaleData(queryClient: QueryClient, queryKeys: readonly QueryKey[]) {
  // Typed as the mutations' errors are (TanStack Query's default), so passing it keeps their `error` an Error.
  return (error: Error) => {
    if (!isStaleDataError(error)) return;
    for (const queryKey of queryKeys) void queryClient.invalidateQueries({ queryKey });
  };
}
