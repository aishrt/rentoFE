import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * The Host area's navigation is its frame, HostShell (host-shell.tsx): a sidebar from tablets up and a tab
 * bar on phones (plan §12.6). Each Host page starts with this heading inside it.
 */

interface HostPageHeaderProps {
  /** A `BackLink`, above everything else. */
  back?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Beside the title but outside the heading, such as a status badge. */
  titleAside?: ReactNode;
  description?: ReactNode;
  /** Buttons on the right on wide screens, under the text on phones. */
  actions?: ReactNode;
  className?: string;
}

/** A Host page's heading, matching the account pages' compact titles. */
export function HostPageHeader({
  back,
  eyebrow,
  title,
  titleAside,
  description,
  actions,
  className,
}: HostPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back && <div className="mb-4">{back}</div>}
        {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="headline text-title-3 font-medium text-balance">{title}</h1>
          {titleAside}
        </div>
        {description && <div className="mt-2 max-w-2xl text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
