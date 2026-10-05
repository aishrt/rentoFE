import { cn } from '@/lib/cn';

const CX = 1270;
const CY = 220;
const ARCS = Array.from({ length: 9 }, (_, arc) => 70 + arc * 52);

/** Arcs either side of a bell, from a centre point, `r` out, `spread` degrees either side of `facing`. */
function arc(r: number, facing: number, spread = 50) {
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${(CX + Math.cos(radians) * r).toFixed(1)} ${(CY + Math.sin(radians) * r).toFixed(1)}`;
  };
  return `M${point(facing - spread)} A${r} ${r} 0 0 1 ${point(facing + spread)}`;
}

/** Notifications: a bell sending news out in widening arcs. Drawn in the current text colour. */
export function SignalArcs({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {ARCS.map((r, index) => (
          <g key={r} strokeDasharray={index % 3 === 2 ? '3 10' : undefined}>
            <path d={arc(r, 0)} />
            <path d={arc(r, 180)} />
          </g>
        ))}
      </g>
      <g transform={`translate(${CX} ${CY})`} fill="currentColor">
        <path d="M0 -46 C-24 -46 -36 -28 -36 -6 V14 L-46 30 H46 L36 14 V-6 C36 -28 24 -46 0 -46 Z" />
        <circle cy="40" r="10" />
        <circle cy="-52" r="6" />
      </g>
    </svg>
  );
}
