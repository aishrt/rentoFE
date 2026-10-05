import { cn } from '@/lib/cn';

const AVENUES = [-200, -60, 90, 220, 380, 520, 650, 810, 950, 1090, 1240, 1380, 1530, 1680, 1820];
const STREETS = [-120, 0, 110, 210, 330, 440, 560, 670];
const PINS: readonly (readonly [number, number])[] = [
  [520, 210],
  [950, 330],
  [1240, 110],
];

/**
 * Browse cars and search: a street map with a few cars pinned on it. Drawn in the current text colour.
 */
export function StreetMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g transform="rotate(-9 800 240)">
        <g fill="currentColor" opacity="0.35">
          <rect x="226" y="116" width="148" height="88" rx="6" />
          <rect x="1096" y="336" width="138" height="98" rx="6" />
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          {AVENUES.map((x) => (
            <path key={x} d={`M${x} -200 V700`} />
          ))}
          {STREETS.map((y) => (
            <path key={y} d={`M-300 ${y} H1900`} />
          ))}
        </g>
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M-40 420 C300 360 520 250 760 240 C1000 230 1200 120 1660 60" strokeWidth="7" />
        <path d="M-40 140 C200 170 420 330 700 380 C900 416 1300 380 1660 420" strokeWidth="4" />
      </g>
      {PINS.map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <circle r="22" fill="currentColor" opacity="0.35" />
          <path
            d="M0 0 C-9 -11 -15 -19 -15 -28 A15 15 0 1 1 15 -28 C15 -19 9 -11 0 0 Z"
            fill="currentColor"
          />
        </g>
      ))}
    </svg>
  );
}
