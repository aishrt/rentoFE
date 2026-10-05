import { cn } from '@/lib/cn';

const SWITCHES: readonly (readonly [number, number, boolean])[] = [
  [1180, 120, true],
  [1300, 200, false],
  [1180, 280, true],
  [1420, 120, false],
  [1420, 280, true],
];

/** Account settings: a tidy dot grid with a few switches on it. Drawn in the current text colour. */
export function DotGrid({ className, idPrefix = 'dot-grid' }: { className?: string; idPrefix?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <defs>
        <pattern id={`${idPrefix}-dots`} width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="13" cy="13" r="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="1600" height="480" fill={`url(#${idPrefix}-dots)`} />
      {SWITCHES.map(([x, y, on]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect
            x="-44"
            y="-22"
            width="88"
            height="44"
            rx="22"
            className="fill-canvas"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle cx={on ? 22 : -22} r="14" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
