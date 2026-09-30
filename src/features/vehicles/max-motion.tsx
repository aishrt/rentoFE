import { domMax, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Motion's full feature set, `domMax`: drag (gallery swipes, the filter sheet's drag to close) and layout
 * animations (search results that re-order smoothly). The app loads the smaller `domAnimation` for every
 * page (MotionProvider); this adds the rest only in the chunks of the pages that use it (search, listing,
 * destination), so the homepage never downloads it (plan §12.5).
 */
export function MaxMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
