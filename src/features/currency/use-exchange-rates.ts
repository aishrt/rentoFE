import { useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';

/** The day's rates per NZ$1 (plan §12.7). Only fetched once a visitor picks another currency. */
export function useExchangeRates(enabled: boolean) {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: ({ signal }) => unwrap(client.GET('/exchange-rates', { signal })),
    enabled,
    staleTime: 60 * 60_000,
  });
}
