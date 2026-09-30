import { SearchResultsView } from '@/features/search/search-results-view';

/**
 * Search Results (spec §5): cars free for the chosen dates, each with its estimated total. The URL holds the
 * whole search (plan §1.4), and the page is `noindex` so the clean city pages are indexed instead.
 */
export function SearchPage() {
  return <SearchResultsView mode="search" />;
}
