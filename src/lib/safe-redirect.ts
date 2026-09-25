const BASE = 'https://rentovroom.invalid';

/**
 * Returns `target` only if it is a path on this site, so a `?next=` parameter can't send
 * someone to another website after they sign in.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback;
  try {
    const url = new URL(target, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
