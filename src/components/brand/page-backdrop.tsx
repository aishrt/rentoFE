import type { ComponentType } from 'react';

interface PageBackdropProps {
  /** A line pattern from components/brand/patterns, about what the page is for. */
  art: ComponentType<{ className?: string }>;
}

/**
 * The band of brand art behind the top of an app page (search, trips, hosting, settings, checkout), fading
 * into the canvas before the content. Put it first inside the page's outer Container: it positions itself
 * against `<main>`, which spans the full width.
 */
export function PageBackdrop({ art: Art }: PageBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden sm:h-96"
    >
      <Art className="absolute inset-0 size-full text-primary/15" />
      <div className="absolute inset-0 bg-linear-to-b from-canvas/10 via-canvas/60 to-canvas" />
      <div className="absolute inset-0 hidden bg-linear-to-r from-canvas/80 via-canvas/20 to-transparent lg:block" />
    </div>
  );
}
