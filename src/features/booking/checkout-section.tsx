import { Check, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export type SectionState = 'current' | 'done' | 'upcoming';

interface CheckoutSectionProps {
  /** The element id, used to scroll to and focus the section when it opens. */
  id: string;
  number: number;
  title: string;
  state: SectionState;
  /** What was chosen, shown once the section is done. */
  summary?: ReactNode;
  /** Opens a finished section again to change it. */
  onEdit?: () => void;
  /** Why a later section can't open yet, e.g. "Log in first". */
  upcomingNote?: ReactNode;
  children?: ReactNode;
}

/**
 * One step of the single-page checkout (plan §12.6): a numbered card whose body opens while it's the current
 * step and fades up into place (plan §12.4), and which shows a one-line summary with Edit once it's done.
 * The heading takes focus when the step opens, so keyboard and screen reader users land in it.
 */
export function CheckoutSection({
  id,
  number,
  title,
  state,
  summary,
  onEdit,
  upcomingNote,
  children,
}: CheckoutSectionProps) {
  const headingId = `${id}-heading`;
  const current = state === 'current';
  const done = state === 'done';

  return (
    <Card
      asChild
      className={cn(
        'scroll-mt-24 transition-[border-color,box-shadow] duration-200',
        current && 'border-primary/30 ring-1 ring-primary/10',
        state === 'upcoming' && 'shadow-none',
      )}
    >
      <section id={id} aria-labelledby={headingId}>
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-200',
              current && 'bg-primary text-white inset-shadow-highlight',
              done && 'bg-primary/10 text-primary',
              state === 'upcoming' && 'border border-line text-muted',
            )}
          >
            {done ? <Check className="size-4" /> : number}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id={headingId}
              tabIndex={-1}
              className={cn(
                'text-lg font-semibold outline-none',
                state === 'upcoming' ? 'text-muted' : 'text-ink',
              )}
            >
              <span className="sr-only">Step {number}: </span>
              {title}
            </h2>
            {done && summary && <div className="mt-1 text-sm text-muted">{summary}</div>}
            {state === 'upcoming' && upcomingNote && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Lock aria-hidden="true" className="size-3.5 shrink-0" />
                {upcomingNote}
              </p>
            )}
          </div>
          {done && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="-my-1 shrink-0 text-primary">
              Edit<span className="sr-only"> {title.toLowerCase()}</span>
            </Button>
          )}
        </div>
        {current && <div className="animate-fade-up px-5 pb-6 sm:px-6 sm:pb-7">{children}</div>}
      </section>
    </Card>
  );
}
