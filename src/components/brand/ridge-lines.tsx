import { cn } from '@/lib/cn';

/** Layered ridge silhouettes in the current text colour; a small echo of the hero landscape. */
export function RidgeLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <path
        d="M0 70 L40 52 L70 62 L110 30 L140 50 L180 22 L215 48 L250 36 L290 58 L330 34 L370 54 L400 44 V140 H0 Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M0 96 C60 76 110 82 160 92 S260 70 320 80 S380 92 400 88 V140 H0 Z"
        fill="currentColor"
        opacity="0.32"
      />
      <path d="M0 120 C80 106 160 110 240 120 S360 112 400 116 V140 H0 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
