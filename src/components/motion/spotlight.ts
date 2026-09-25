import type { PointerEvent } from 'react';

/**
 * Moves the `spotlight` utility's light to the pointer (adapted from React Bits' SpotlightCard). It writes
 * CSS variables straight onto the element, so following the mouse never re-renders React. Touch and pen
 * input is ignored: there is no hover to light up.
 *
 *   <button className="spotlight" onPointerMove={trackSpotlight}>…</button>
 *
 * Cards take a `spotlight` prop instead.
 */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const node = event.currentTarget;
  const rect = node.getBoundingClientRect();
  node.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`);
  node.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`);
}
