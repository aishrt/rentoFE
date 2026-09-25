import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="9" fill="#0E3B32" />
      <path
        d="M5 22.5 11.5 12l4.2 6.3 3.1-4.3L27 22.5"
        stroke="#FAF8F4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 27c4.5-2.7 9.5-2.7 14 0" stroke="#C8A96A" strokeWidth="2" strokeLinecap="round" />
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
      <LogoMark className={cn(tone === 'light' && 'rounded-[9px] ring-1 ring-canvas/20')} />
      <span
        className={cn(
          'headline text-[1.3rem] leading-none font-semibold',
          tone === 'light' ? 'text-canvas' : 'text-primary',
        )}
      >
        Rento Vroom
      </span>
    </span>
  );
}
