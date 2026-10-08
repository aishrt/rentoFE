import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';

const LINKS = [
  { to: '/host', label: 'Overview' },
  { to: '/host/bookings', label: 'Bookings' },
  { to: '/host/earnings', label: 'Earnings' },
  { to: '/messages?as=host', label: 'Inbox' },
  { to: '/host/profile', label: 'Profile' },
] as const;

/** The section a Host page belongs to; a car's editor and calendar belong to Overview. */
function sectionOf(pathname: string): string {
  if (pathname.startsWith('/host/bookings')) return '/host/bookings';
  if (pathname.startsWith('/host/earnings')) return '/host/earnings';
  if (pathname.startsWith('/host/profile')) return '/host/profile';
  return '/host';
}

/**
 * The Host area's own navigation, shared by its pages (plan §12.6). A car's editor and calendar belong to
 * Overview, where My Vehicles lists them.
 */
export function HostSubNav({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const section = sectionOf(pathname);

  return (
    <nav
      aria-label="Hosting"
      className={cn('flex gap-1 overflow-x-auto border-b border-line sm:gap-2', className)}
    >
      {LINKS.map((link) => {
        const active = link.to === section;
        return (
          <Link
            key={link.to}
            to={link.to}
            viewTransition
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative -mb-px inline-flex min-h-11 items-center px-3 text-ui font-medium transition-colors duration-120',
              'rounded-t-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-[scale] after:duration-200 after:ease-out',
              active ? 'text-primary after:scale-x-100' : 'text-muted after:scale-x-0 hover:text-ink',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
