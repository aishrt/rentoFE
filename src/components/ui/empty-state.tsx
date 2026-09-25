import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  /** Shown above the title: an IconBadge, a Badge or a large numeral. */
  visual?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** `h1` when the state is the whole page (the default), `h2` inside a page. */
  titleAs?: 'h1' | 'h2';
  /** `lg` for standalone pages with more to say, such as Coming soon. */
  size?: 'md' | 'lg';
  description?: ReactNode;
  /** Extra content under the description, e.g. a summary of what was searched. */
  children?: ReactNode;
  /** Buttons, laid out in a centred row that wraps on small screens. */
  actions?: ReactNode;
  className?: string;
}

/** A centred message with a way forward: not found, errors, access checks, coming soon and empty lists. */
export function EmptyState({
  visual,
  eyebrow,
  title,
  titleAs: Title = 'h1',
  size = 'md',
  description,
  children,
  actions,
  className,
}: EmptyStateProps) {
  const large = size === 'lg';

  return (
    <div
      className={cn(
        'flex animate-fade-up flex-col items-center text-center',
        large ? 'max-w-2xl' : 'max-w-md',
        className,
      )}
    >
      {visual && <div className="mb-5">{visual}</div>}
      {eyebrow && <p className="eyebrow mb-3 text-gold-text">{eyebrow}</p>}
      <Title className={cn('headline font-medium', large ? 'text-title-1' : 'text-title-3')}>{title}</Title>
      {description && <div className={cn('text-muted', large ? 'mt-4 text-lg' : 'mt-3')}>{description}</div>}
      {children}
      {actions && (
        <div className={cn('flex flex-wrap justify-center gap-3', large ? 'mt-10' : 'mt-8')}>{actions}</div>
      )}
    </div>
  );
}
