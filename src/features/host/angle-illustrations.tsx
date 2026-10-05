import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { PhotoType } from './vehicle-labels';

/*
 * Example shots for each photo angle (plan §12.6: "example photos for each required angle"): simple line
 * drawings in the current text colour, so they follow the theme. Drawn by hand instead of shipping photos,
 * which keeps the onboarding light on mobile data.
 */

const body = { fill: 'currentColor', fillOpacity: 0.08 } as const;

/** A hatchback side on, facing left: the passenger (left) side, seen from beside it. */
function Side() {
  return (
    <>
      <path
        {...body}
        d="M6 44v-6.5c0-3.3 2.4-6 5.6-6.5L30 28l12.5-10.6A9 9 0 0 1 48.3 15h25.4a9 9 0 0 1 6.6 2.9L90 28l18.6 3.2c3.1.5 5.4 3.2 5.4 6.4V44h-9a15 15 0 0 0-30 0H45a15 15 0 0 0-30 0z"
      />
      <path d="M35 28l9.5-8a6 6 0 0 1 3.9-1.5H58V28zM63 18.5h10.6a6 6 0 0 1 4.4 1.9L85.5 28H63zM60.5 31v10" />
      <circle cx="30" cy="46" r="9" />
      <circle cx="90" cy="46" r="9" />
      <circle cx="30" cy="46" r="3" />
      <circle cx="90" cy="46" r="3" />
      <path d="M7 35.5h4" />
    </>
  );
}

function Front() {
  return (
    <>
      <path
        {...body}
        d="M24 48V34c0-3 1.6-5.6 4-7l6.5-11c1.5-2.5 4.2-4 7-4h37c2.8 0 5.5 1.5 7 4L92 27c2.4 1.4 4 4 4 7v14z"
      />
      <path d="M36 26l5-9.5h38l5 9.5zM24 26h-5v3.5M96 26h5v3.5" />
      <rect x="29" y="31" width="14" height="5" rx="2.5" />
      <rect x="77" y="31" width="14" height="5" rx="2.5" />
      <rect x="49" y="32" width="22" height="6" rx="2" />
      <rect x="52.5" y="41.5" width="15" height="4" rx="1" />
      <path d="M28 48v5.5h11V48M81 48v5.5h11V48" />
    </>
  );
}

function Rear({ open = false }: { open?: boolean }) {
  return (
    <>
      <path
        {...body}
        d="M24 48V33c0-3 1.6-5.6 4-7l6-10c1.5-2.5 4.2-4 7-4h38c2.8 0 5.5 1.5 7 4l6 10c2.4 1.4 4 4 4 7v15z"
      />
      {open ? (
        <>
          <path d="M34 28V8.5c0-2 1.5-3.5 3.5-3.5h45c2 0 3.5 1.5 3.5 3.5V28" />
          <rect x="42" y="30" width="16" height="11" rx="2" />
          <rect x="60" y="33" width="18" height="8" rx="2" />
          <path d="M47 30v-2.5h6V30" />
        </>
      ) : (
        <path d="M37 26l4.5-9.5h37L83 26z" />
      )}
      <rect x="27" y="30" width="10" height="7" rx="2" fill="currentColor" fillOpacity={0.35} />
      <rect x="83" y="30" width="10" height="7" rx="2" fill="currentColor" fillOpacity={0.35} />
      <rect x="52.5" y="42" width="15" height="4" rx="1" />
      <path d="M28 48v5.5h11V48M81 48v5.5h11V48" />
    </>
  );
}

function Interior() {
  return (
    <>
      <path {...body} d="M6 30c18-9 90-9 108 0v5H6z" />
      <circle cx="42" cy="42" r="14" />
      <circle cx="42" cy="42" r="4" />
      <path d="M28 42h10M46 42h10M42 46v10" />
      <path {...body} d="M80 60V36c0-4.4 3.6-8 8-8h6c4.4 0 8 3.6 8 8v24" />
      <path d="M84 44h14" />
    </>
  );
}

function Dash() {
  return (
    <>
      <path {...body} d="M26 48a34 34 0 0 1 68 0z" />
      <path d="M31 36l4 2M40 25l3 3.5M60 20v4.5M80 25l-3 3.5M89 36l-4 2M60 48l15-16" />
      <circle cx="60" cy="48" r="3" fill="currentColor" />
      <rect x="45" y="52" width="30" height="8" rx="2" />
      <path d="M50 56h4M57 56h4M64 56h4" />
    </>
  );
}

function Tyre() {
  return (
    <>
      <circle {...body} cx="60" cy="32" r="26" />
      <circle cx="60" cy="32" r="14" />
      <circle cx="60" cy="32" r="4" />
      <path d="M60 6v5M60 53v5M34 32h5M81 32h5M41.6 13.6l3.5 3.5M74.9 46.9l3.5 3.5M41.6 50.4l3.5-3.5M74.9 17.1l3.5-3.5" />
    </>
  );
}

function Damage() {
  return (
    <>
      <rect {...body} x="10" y="10" width="72" height="44" rx="8" />
      <path d="M22 40l8-6 5 4 7-8 6 5 9-9" />
      <circle cx="88" cy="36" r="12" />
      <path d="M96.5 44.5l9 9" />
      <path d="M84 36h8M88 32v8" />
    </>
  );
}

const DRAWINGS: Record<PhotoType, () => ReactNode> = {
  FRONT: () => <Front />,
  REAR: () => <Rear />,
  PASSENGER: () => <Side />,
  // The right-hand side faces the other way: the same car, mirrored.
  DRIVER: () => (
    <g transform="translate(120 0) scale(-1 1)">
      <Side />
    </g>
  ),
  INTERIOR: () => <Interior />,
  DASH: () => <Dash />,
  BOOT: () => <Rear open />,
  TYRES: () => <Tyre />,
  DAMAGE: () => <Damage />,
};

/** A line drawing of what the photo for this angle should show. Decorative: the tile names the angle. */
export function AngleIllustration({ angle, className }: { angle: PhotoType; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('text-primary', className)}
    >
      {DRAWINGS[angle]()}
    </svg>
  );
}
