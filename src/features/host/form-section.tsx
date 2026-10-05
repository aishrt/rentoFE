import { useId, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Two columns of fields from the small breakpoint up (the default), or one. */
  columns?: 1 | 2;
  aside?: ReactNode;
  className?: string;
}

/** A titled group of fields inside a step, as a white card on the canvas. */
export function FormSection({
  title,
  description,
  children,
  columns = 2,
  aside,
  className,
}: FormSectionProps) {
  const id = useId();
  return (
    <Card asChild className={cn('p-5 sm:p-7', className)}>
      <section aria-labelledby={id}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={id} className="text-base font-semibold text-ink">
              {title}
            </h3>
            {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
          </div>
          {aside}
        </div>
        {/* items-start: a field with help text doesn't push its neighbour's input down. */}
        <div className={cn('grid items-start gap-5', columns === 2 && 'sm:grid-cols-2')}>{children}</div>
      </section>
    </Card>
  );
}
