import { cn } from '@/lib/cn';
import { smoothPath } from './smooth-path';

const WAVES = Array.from({ length: 11 }, (_, wave) =>
  smoothPath(
    Array.from({ length: 13 }, (_, step) => [
      -100 + step * 150,
      40 + wave * 40 + Math.sin(step * 0.9 + wave * 0.45) * (10 + wave * 1.5),
    ]),
  ),
);

/** Checkout: slow, even waves, nothing to distract from paying. Drawn in the current text colour. */
export function CalmWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {WAVES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
