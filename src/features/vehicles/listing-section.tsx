import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ListingSectionProps {
  /** Also the anchor, e.g. #reviews. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Beside the title, e.g. a link. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One part of the listing page, under a hairline, with a serif heading (plan §12.1 editorial layout). */
export function ListingSection({ id, title, description, aside, children, className }: ListingSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn('scroll-mt-24 border-t border-line py-8 sm:py-10', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={`${id}-heading`} className="headline text-2xl font-medium sm:text-3xl">
          {title}
        </h2>
        {aside}
      </div>
      {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
