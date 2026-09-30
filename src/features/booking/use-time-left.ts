import { useEffect, useState } from 'react';

/** The time now, refreshed every `tickMs`, so "time left" and "has it started?" stay true on an open page. */
export function useNow(tickMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);
  return now;
}

/** Milliseconds until `expiresAt`, ticking every second; 0 once it has passed. */
export function useTimeLeft(expiresAt: string | undefined, tickMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(timer);
  }, [expiresAt, tickMs]);
  return expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
}
