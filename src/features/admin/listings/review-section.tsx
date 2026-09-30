import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface ReviewSectionProps {
  /** Names the section and its heading's id, e.g. "photos". */
  id: string;
  title: string;
  description?: ReactNode;
  /** Beside the heading, e.g. a count or a button. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One titled part of the listing review page: a card that screen readers list as a region. */
export function ReviewSection({ id, title, description, aside, children, className }: ReviewSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <Card asChild className={cn('min-w-0 p-5 sm:p-6', className)}>
      <section id={id} aria-labelledby={headingId} className="scroll-mt-24">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
          </div>
          {aside}
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </Card>
  );
}

/** A grid of labelled facts. */
export function FactList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-3', className)}>
      {children}
    </dl>
  );
}

/** One fact; a missing value reads "Not given", so a gap is obvious rather than blank. */
export function Fact({
  term,
  children,
  wide,
}: {
  term: string;
  children?: ReactNode;
  /** Spans the whole row, for longer text such as damage notes. */
  wide?: boolean;
}) {
  const empty = children === undefined || children === null || children === '';
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2 xl:col-span-3')}>
      <dt className="text-muted">{term}</dt>
      <dd className={cn('mt-0.5 break-words', empty ? 'text-muted' : 'text-ink')}>
        {empty ? 'Not given' : children}
      </dd>
    </div>
  );
}
