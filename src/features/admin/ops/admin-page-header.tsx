import type { ReactNode } from 'react';
import { PageMeta } from '@/components/layout/page-meta';

interface AdminPageHeaderProps {
  /** The sidebar group, e.g. "Marketplace". */
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Buttons on the right, such as Refresh or Export. */
  actions?: ReactNode;
}

/** The title block every staff portal page starts with, and the browser tab's title. */
export function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <>
      <PageMeta title={`${title} · Staff portal`} noindex />
      <header className="flex animate-fade-up flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-primary">{eyebrow}</p>
          <h1 className="headline mt-2 text-title-3 font-medium">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </>
  );
}
