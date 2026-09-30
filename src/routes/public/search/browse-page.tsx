import { SearchResultsView } from '@/features/search/search-results-view';

/** Browse Cars (spec §5): every live car, with the same filters as Search Results and daily prices. */
export function BrowsePage() {
  return <SearchResultsView mode="browse" />;
}
