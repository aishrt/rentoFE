import { cn } from '@/lib/cn';

interface AvatarProps {
  initials: string;
  className?: string;
  tone?: 'primary' | 'gold';
}

/** Initials in a circle, until profile photos arrive with the account area. */
export function Avatar({ initials, className, tone = 'primary' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide',
        tone === 'primary' ? 'bg-primary text-white' : 'bg-gold text-ink',
        className,
      )}
    >
      {initials}
    </span>
  );
}
