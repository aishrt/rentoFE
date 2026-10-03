import { cn } from '@/lib/cn';

const PLACES: readonly (readonly [number, number])[] = [
  [140, 340],
  [380, 190],
  [600, 330],
  [840, 170],
  [1060, 300],
  [1290, 130],
  [1500, 290],
];
const LINKS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [1, 3],
  [3, 5],
  [4, 6],
];

function arc(from: readonly [number, number], to: readonly [number, number]) {
  const lift = Math.abs(to[0] - from[0]) * 0.35;
  return `M${from[0]} ${from[1]} Q${(from[0] + to[0]) / 2} ${Math.min(from[1], to[1]) - lift} ${to[0]} ${to[1]}`;
}

/** Contact: places across the country linked by arcs, the way messages travel. In the current text colour. */
export function ConnectionArcs({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 9" strokeLinecap="round">
        {LINKS.map(([from, to]) => (
          <path key={`${from}-${to}`} d={arc(PLACES[from]!, PLACES[to]!)} />
        ))}
      </g>
      {PLACES.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="6" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
