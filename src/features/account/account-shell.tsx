import {
  Bell,
  CreditCard,
  Heart,
  LifeBuoy,
  Luggage,
  MessagesSquare,
  Settings,
  Star,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useUnreadCount } from '@/features/messages/unread-count';
import { cn } from '@/lib/cn';
import { DashboardFrame, SidebarGroup, TabBar, type NavItem } from './dashboard-frame';

/*
 * The Guest dashboard's navigation (plan §12.6), in the dashboards' frame (dashboard-frame.tsx).
 */

const MESSAGES: NavItem = {
  to: '/messages',
  label: 'Messages',
  icon: MessagesSquare,
  owns: (path) => path.startsWith('/messages'),
  unread: true,
};

const TRAVEL: NavItem[] = [
  { to: '/trips', label: 'Trips', icon: Luggage, owns: (path) => path.startsWith('/trips') },
  MESSAGES,
  { to: '/saved', label: 'Saved cars', icon: Heart },
];

const ACCOUNT: NavItem[] = [
  { to: '/account', label: 'Overview', icon: UserRound },
  { to: '/account/payments', label: 'Payments', icon: CreditCard },
  { to: '/account/reviews', label: 'Reviews', icon: Star },
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
  MESSAGES,
  { to: '/saved', label: 'Saved', icon: Heart },
  {
    to: '/account',
    label: 'Account',
    icon: UserRound,
    owns: (path) => path.startsWith('/account') || path === '/notifications',
  },
];

/** The account's sidebar on tablets and desktops. */
export function AccountSidebar({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const unread = useUnreadCount();
  return (
    <nav aria-label="Your dashboard" className={cn('grid content-start gap-6', className)}>
      <SidebarGroup items={TRAVEL} path={pathname} unread={unread} />
      <SidebarGroup title="Account" items={ACCOUNT} path={pathname} />
    </nav>
  );
}

/** The account's tab bar along the bottom of a phone: Trips · Messages · Saved · Account (plan §12.6). */
export function AccountTabBar({ className }: { className?: string }) {
  return <TabBar label="Your dashboard, quick links" items={TABS} className={cn('md:hidden', className)} />;
}

/**
 * The Guest dashboard's frame (spec §8, plan §12.6): the sidebar beside the page on tablets and
 * desktops, and the tab bar under it on phones. Each page keeps its own heading and background.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <DashboardFrame sidebar={<AccountSidebar />} tabBar={<AccountTabBar />}>
      {children}
    </DashboardFrame>
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
