import { cn } from '@/lib/cn';
import { contourRings } from './smooth-path';

const TERRAIN = [...contourRings(760, 470, 6, 34, 1.7, 1.2), ...contourRings(1480, 60, 5, 30, 1.5, 3)];
const ROUTE = 'M60 360 C220 360 300 210 470 210 S760 350 960 300 S1220 140 1420 150';

/** Trips: a route across hill country, from a start point through two stops to a pin. In the current text colour. */
export function TripRoute({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
        {TERRAIN.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path
        d={ROUTE}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="1 16"
      />
      <g fill="currentColor">
        <circle cx="60" cy="360" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="470" cy="210" r="8" />
        <circle cx="960" cy="300" r="8" />
        <circle cx="1420" cy="150" r="26" opacity="0.3" />
      </g>
      <g transform="translate(1420 150)">
        <path
          d="M0 0 C-11 -13 -18 -23 -18 -34 A18 18 0 1 1 18 -34 C18 -23 11 -13 0 0 Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
