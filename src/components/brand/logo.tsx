import { cn } from '@/lib/cn';

/**
 * The Rento Vroom mark: an "R" drawn as a car. Traced from the client's logo (public/Ologo.PNG) and trimmed
 * to the artwork. index.html's boot splash draws the same path; keep the two in step.
 */
const LOGO_VIEWBOX = '0 0 805 685';
const LOGO_PATH =
  'M0 0H470.35A152.22 152.22 0 0 1 603.72 78.86L672.55 204H747A58 52 0 0 1 805 256V263A53 42 0 0 1 752 305H742Q734 306 731 315C741.5 342 754.5 365 754.5 393C754.5 421 746 441 743 462H690V589A96 96 0 0 1 498 589V462H112V684H0Z' +
  'M112 79H445.25A68.41 68.41 0 0 1 504.86 113.86L557.8 208H112Z' +
  'M135 305H460A23 23 0 0 1 483 328V346A23 23 0 0 1 460 369H135A23 23 0 0 1 112 346V328A23 23 0 0 1 135 305Z' +
  'M560.5 343A51.5 51.5 0 1 0 663.5 343A51.5 51.5 0 1 0 560.5 343Z' +
  'M534.5 462V589A59.5 59.5 0 0 0 653.5 589V462H627.5V589A33.5 33.5 0 0 1 560.5 589V462Z';

/** The mark on its own, in the current text colour. Size it by height; the width follows. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      aria-hidden="true"
      className={cn('aspect-[805/685] h-8 w-auto shrink-0 fill-current', className)}
    >
      <path fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}

interface LogoProps {
  /** "light" for dark backgrounds. */
  tone?: 'dark' | 'light';
  className?: string;
}

/** The mark beside the typeset wordmark, both in brand blue (or in canvas on dark backgrounds). */
export function Logo({ tone = 'dark', className }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        tone === 'light' ? 'text-canvas' : 'text-primary',
        className,
      )}
    >
      <LogoMark />
      <span
        // One line from 360px up; narrower phones wrap it rather than scroll sideways.
        className="headline text-xl leading-none font-semibold min-[22.5rem]:whitespace-nowrap"
      >
        Rento Vroom
      </span>
    </span>
  );
}
