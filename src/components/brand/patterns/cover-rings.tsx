import { cn } from '@/lib/cn';

const CX = 1250;
const CY = 230;
const RADII = Array.from({ length: 14 }, (_, ring) => 70 + ring * 46);

/** Insurance: rings of cover spreading out from a shield. Drawn in the current text colour. */
export function CoverRings({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {RADII.map((r, ring) => (
          <circle key={r} cx={CX} cy={CY} r={r} strokeDasharray={ring % 3 === 2 ? '4 10' : undefined} />
        ))}
      </g>
      <g transform={`translate(${CX} ${CY})`}>
        <path d="M0 -40 L32 -27 V2 C32 22 18 36 0 44 C-18 36 -32 22 -32 2 V-27 Z" fill="currentColor" />
        <path
          d="M-13 2 L-3 12 L15 -8"
          fill="none"
          className="stroke-canvas"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
