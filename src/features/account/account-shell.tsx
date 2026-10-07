import {
  Bell,
  CreditCard,
  Heart,
  LifeBuoy,
  Luggage,
  Settings,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Whether a path belongs to this item; the item's own path by default. */
  owns?: (path: string) => boolean;
}

const owns = (item: NavItem, path: string) => (item.owns ? item.owns(path) : path === item.to);

const TRAVEL: NavItem[] = [
  { to: '/trips', label: 'Trips', icon: Luggage, owns: (path) => path.startsWith('/trips') },
  { to: '/saved', label: 'Saved cars', icon: Heart },
];

const ACCOUNT: NavItem[] = [
  { to: '/account', label: 'Overview', icon: UserRound },
  { to: '/account/payments', label: 'Payments', icon: CreditCard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  {
    to: '/account/support',
    label: 'Help and support',
    icon: LifeBuoy,
    owns: (path) => path.startsWith('/account/support'),
  },
  { to: '/account/settings', label: 'Settings', icon: Settings },
];

/** The phone's tab bar: the places a Guest goes most (plan §12.6). Account holds the rest. */
const TABS: NavItem[] = [
  TRAVEL[0]!,
  { to: '/saved', label: 'Saved', icon: Heart },
  {
    to: '/account',
    label: 'Account',
    icon: UserRound,
    owns: (path) => path.startsWith('/account') || path === '/notifications',
  },
];

function SidebarGroup({ title, items, path }: { title?: string; items: NavItem[]; path: string }) {
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
          </Link>
        );
      })}
    </div>
  );
}

/** The account's sidebar on tablets and desktops. */
export function AccountSidebar({ className }: { className?: string }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Your dashboard" className={cn('grid content-start gap-6', className)}>
      <SidebarGroup items={TRAVEL} path={pathname} />
      <SidebarGroup title="Account" items={ACCOUNT} path={pathname} />
    </nav>
  );
}

/**
 * The account's tab bar along the bottom of a phone (plan §12.6). It sticks to the bottom of the screen
 * while the page is in view, then scrolls away above the footer instead of covering it.
 */
export function AccountTabBar({ className }: { className?: string }) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Your dashboard, quick links"
      className={cn(
        'glass sticky bottom-0 z-30 -mx-4 border-t border-line/70 px-2 pb-[env(safe-area-inset-bottom)] sm:-mx-6',
        className,
      )}
    >
      <ul className="grid grid-cols-3">
        {TABS.map((item) => {
          const active = owns(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to}>
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
                <Icon aria-hidden="true" className={cn('size-5', active && 'fill-primary/12')} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The Guest dashboard's frame (spec §8, plan §12.6): the sidebar beside the page on tablets and
 * desktops, and the tab bar under it on phones. Each page keeps its own heading and background.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
      <AccountSidebar className="max-md:hidden md:sticky md:top-24 md:self-start" />
      <div className="min-w-0 max-md:pb-6">{children}</div>
      <AccountTabBar className="md:hidden" />
    </div>
  );
}

interface AccountPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right on wide screens, under the text on phones. */
  actions?: ReactNode;
}

/** An account page's heading, as on Trips: a small "Your account" eyebrow over the title. */
export function AccountPageHeader({ title, description, actions }: AccountPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow text-primary">Your account</p>
        <h1 className="headline mt-2 text-title-3 font-medium text-balance">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
