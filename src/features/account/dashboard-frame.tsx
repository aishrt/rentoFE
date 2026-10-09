import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { UnreadBadge, UnreadLabel } from '@/features/messages/unread-badge';
import { useUnreadCount } from '@/features/messages/unread-count';
import { cn } from '@/lib/cn';

/*
 * The dashboards' frame (plan §12.6): a sidebar from tablets up and a tab bar on phones. The Guest's
 * AccountShell (account-shell.tsx) and the Host's HostShell (features/host/host-shell.tsx) are built from these
 * parts, which import no icons of their own, so each dashboard's pages load only their own.
 */

export interface NavItem {
  /** A path, with a query when the page opens in a particular way (the Host's inbox). */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Whether a path belongs to this item; the item's own path by default. */
  owns?: (path: string) => boolean;
  /** Shows the unread messages count. */
  unread?: boolean;
}

const owns = (item: NavItem, path: string) => (item.owns ? item.owns(path) : path === item.to);

/** A group of a dashboard sidebar's links, under an optional title. */
export function SidebarGroup({
  title,
  items,
  path,
  unread = 0,
}: {
  title?: string;
  items: NavItem[];
  path: string;
  unread?: number;
}) {
  return (
    <div className="grid gap-1">
      {title && <p className="eyebrow mb-1 px-3 text-muted">{title}</p>}
      {items.map((item) => {
        const active = owns(item, path);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            viewTransition
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-control px-3 text-ui font-medium transition-colors duration-120',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active ? 'bg-primary/8 text-primary' : 'text-ink/80 hover:bg-ink/5 hover:text-ink',
            )}
          >
            <Icon aria-hidden="true" className="size-4.5 shrink-0" />
            {item.label}
            {item.unread && <UnreadBadge count={unread} className="ml-auto" />}
          </Link>
        );
      })}
    </div>
  );
}

/** Four or five tabs share the phone's width. */
const TAB_COLUMNS: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5' };

/**
 * A dashboard's tab bar along the bottom of a phone (plan §12.6). It sticks to the bottom of the screen
 * while the page is in view, then scrolls away above the footer instead of covering it; it takes its own
 * room at the end of the page, so it never hides the last of it.
 */
export function TabBar({ label, items, className }: { label: string; items: NavItem[]; className?: string }) {
  const { pathname } = useLocation();
  const unread = useUnreadCount();
  return (
    <nav
      aria-label={label}
      className={cn(
        'glass sticky bottom-0 z-30 -mx-4 border-t border-line/70 px-2 pb-[env(safe-area-inset-bottom)] sm:-mx-6',
        className,
      )}
    >
      <ul className={cn('grid', TAB_COLUMNS[items.length] ?? 'grid-flow-col auto-cols-fr')}>
        {items.map((item) => {
          const active = owns(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="min-w-0">
              <Link
                to={item.to}
                viewTransition
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-control text-xs font-medium transition-colors duration-120',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  active ? 'text-primary' : 'text-muted hover:text-ink',
                )}
              >
                <span className="relative">
                  <Icon aria-hidden="true" className={cn('size-5', active && 'fill-primary/12')} />
                  {item.unread && (
                    <UnreadBadge
                      count={unread}
                      quiet
                      className="absolute -top-2 left-3 min-w-4.5 px-1 text-xs leading-4.5"
                    />
                  )}
                </span>
                {item.label}
                {/* Read after the name, though the badge sits on the icon before it. */}
                {item.unread && <UnreadLabel count={unread} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A dashboard's frame: the sidebar beside the page on tablets and desktops, and the tab bar under it on
 * phones. Either can be left out while it isn't known yet whose dashboard a page belongs to; the page keeps
 * its place, so it isn't loaded again when they arrive.
 */
export function DashboardFrame({
  sidebar,
  tabBar,
  children,
}: {
  sidebar?: ReactNode;
  tabBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
      <div className="max-md:hidden md:sticky md:top-24 md:self-start">{sidebar}</div>
      <div className="min-w-0 max-md:pb-6">{children}</div>
      {tabBar}
    </div>
  );
}
