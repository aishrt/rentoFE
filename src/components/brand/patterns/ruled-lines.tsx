import { cn } from '@/lib/cn';

const RULES = Array.from({ length: 15 }, (_, line) => 24 + line * 32);
const TICKS = Array.from({ length: 36 }, (_, tick) => (tick * 360) / 36);

/** Legal pages: ruled paper with a margin, and a seal. Drawn in the current text colour. */
export function RuledLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g stroke="currentColor" strokeWidth="1.5">
        {RULES.map((y) => (
          <path key={y} d={`M0 ${y} H1600`} />
        ))}
        <path d="M1040 0 V480 M1048 0 V480" />
      </g>
      <g transform="translate(1320 230)" fill="none" stroke="currentColor">
        <circle r="92" strokeWidth="3" />
        <circle r="74" strokeWidth="1.5" />
        <circle r="40" strokeWidth="1.5" strokeDasharray="3 6" />
        {TICKS.map((angle) => (
          <path key={angle} d="M0 -84 V-80" strokeWidth="3" transform={`rotate(${angle})`} />
        ))}
      </g>
    </svg>
  );
}
