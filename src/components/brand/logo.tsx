import { cn } from '@/lib/cn';

interface LogoMarkProps {
  className?: string;
  /** Adds a faint outline so the green mark stays visible on dark backgrounds. */
  outlined?: boolean;
}

export function LogoMark({ className, outlined = false }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      {outlined && (
        <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" className="stroke-canvas/20" strokeWidth="1" />
      )}
      <path
        d="M5 22.5 11.5 12l4.2 6.3 3.1-4.3L27 22.5"
        className="stroke-canvas"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 27c4.5-2.7 9.5-2.7 14 0" className="stroke-gold" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  /** "light" for dark backgrounds. */
  tone?: 'dark' | 'light';
  className?: string;
}

/** Placeholder mark and wordmark until the client supplies the Rento Vroom logo (plan §16, item 1). */
export function Logo({ tone = 'dark', className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark outlined={tone === 'light'} />
      <span
        className={cn(
          'headline text-xl leading-none font-semibold',
          tone === 'light' ? 'text-canvas' : 'text-primary',
        )}
      >
        Rento Vroom
      </span>
    </span>
  );
}
