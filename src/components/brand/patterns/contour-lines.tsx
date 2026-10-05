import { cn } from '@/lib/cn';
import { contourRings } from './smooth-path';

const HILLS = [...contourRings(1240, 150, 9, 30, 1.6, 0.4), ...contourRings(420, 420, 7, 32, 1.4, 2.1)];

/** FAQs: contour lines of two hills, like a map for finding your way. Drawn in the current text colour. */
export function ContourLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {HILLS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d="M1232 142 l8 -14 l8 14 z" fill="currentColor" />
    </svg>
  );
}
