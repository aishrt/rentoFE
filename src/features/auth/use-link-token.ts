import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * The one-time token from an emailed link (`?token=…`). It's read once, then taken out of the address
 * bar and browser history, so it isn't left in a screenshot, a shared URL or error reports.
 */
export function useLinkToken(): string | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));

  useEffect(() => {
    if (!searchParams.has('token')) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete('token');
    setSearchParams(rest, { replace: true });
  }, [searchParams, setSearchParams]);

  return token;
}
