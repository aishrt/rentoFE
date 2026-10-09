import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';

/** Inbox and Reviews open the pages Hosts share with Guests; the inbox opens on its hosting conversations. */
const LINKS = [
  { to: '/host', label: 'Overview' },
  { to: '/host/bookings', label: 'Bookings' },
  { to: '/host/calendar', label: 'Calendar' },
  { to: '/host/earnings', label: 'Earnings' },
  { to: '/messages?as=host', label: 'Inbox' },
  { to: '/account/reviews', label: 'Reviews' },
  { to: '/host/profile', label: 'Profile' },
] as const;

/** A car's own calendar page, which belongs to Calendar. */
const CAR_CALENDAR = /^\/host\/vehicles\/[^/]+\/calendar\/?$/;

/** The section a Host page belongs to: a car's calendar belongs to Calendar, and its editor to Overview. */
function sectionOf(pathname: string): string {
  if (pathname.startsWith('/host/bookings')) return '/host/bookings';
  if (pathname.startsWith('/host/calendar') || CAR_CALENDAR.test(pathname)) return '/host/calendar';
  if (pathname.startsWith('/host/earnings')) return '/host/earnings';
  if (pathname.startsWith('/host/profile')) return '/host/profile';
  return '/host';
}

/** Room kept between the current tab and the faded edge when it's scrolled into view, in px. */
const EDGE_ROOM = 40;

/**
 * The Host area's own navigation, shared by its pages (plan §12.6: Today, Vehicles, Calendar, Earnings and
 * Inbox, with bookings, reviews and the profile). Overview holds the to-do list and My Vehicles, so a car's
 * editor belongs to it; a car's calendar belongs to Calendar.
 *
 * On a phone the tabs are wider than the screen, so the row runs to the screen's edges and scrolls sideways:
 * the current tab is scrolled into view, and an edge with more tabs past it fades out (`data-more-start`,
 * `data-more-end`).
 */
export function HostSubNav({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const section = sectionOf(pathname);
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Only the row scrolls, at once (no smooth scroll): the page stays where it is.
    const link = activeRef.current?.getBoundingClientRect();
    if (link) {
      const start = link.left - nav.getBoundingClientRect().left + nav.scrollLeft;
      const end = start + link.width;
      if (start - EDGE_ROOM < nav.scrollLeft) nav.scrollLeft = Math.max(0, start - EDGE_ROOM);
      else if (end + EDGE_ROOM > nav.scrollLeft + nav.clientWidth)
        nav.scrollLeft = end + EDGE_ROOM - nav.clientWidth;
    }

    // Set on the element rather than in state, so scrolling doesn't re-render the tabs.
    const markEdges = () => {
      nav.toggleAttribute('data-more-start', nav.scrollLeft > 1);
      nav.toggleAttribute('data-more-end', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    };
    markEdges();
    nav.addEventListener('scroll', markEdges, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(markEdges);
    resize?.observe(nav);
    return () => {
      nav.removeEventListener('scroll', markEdges);
      resize?.disconnect();
    };
  }, [section]);

  return (
    <nav
      ref={navRef}
      aria-label="Hosting"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-line sm:gap-2',
        // Phones: edge to edge, so a tab past the edge shows in part; a tab focused by keyboard stays clear of
        // the fade.
        'max-sm:-mx-4 max-sm:scroll-px-10 max-sm:px-4',
        'data-more-start:mask-l-from-85% data-more-end:mask-r-from-85%',
        className,
      )}
    >
      {LINKS.map((link) => {
        const active = link.to === section;
        return (
          <Link
            key={link.to}
            ref={active ? activeRef : undefined}
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
