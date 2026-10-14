import { useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';

/*
 * The homepage headline, footer links and destination tiles admins edit (plan §12.6, `cmsBlocks` and
 * `destinations`). Pages show the original ones while these load, or if they can't, so nothing waits on them.
 */

const STALE_MS = 10 * 60_000;

export function useHomeHero() {
  return useQuery({
    queryKey: ['cms', 'home.hero'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/cms/home.hero', { signal }))).hero,
    staleTime: STALE_MS,
  });
}

export function useSiteFooter() {
  return useQuery({
    queryKey: ['cms', 'site.footer'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/cms/site.footer', { signal }))).footer,
    staleTime: STALE_MS,
  });
}

/** The published destination pages, homepage tiles first. */
export function useDestinationList() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/destinations', { signal }))).destinations,
    staleTime: STALE_MS,
  });
}
