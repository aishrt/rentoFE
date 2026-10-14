/**
 * How to scroll something into view: smoothly, or at once for people who ask for reduced motion (plan §12.4).
 * Read when the scroll happens, so a setting changed meanwhile counts.
 */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
