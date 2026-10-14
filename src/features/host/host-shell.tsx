import {
  CalendarDays,
  CarFront,
  ClipboardList,
  MessagesSquare,
  Star,
  Sun,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { DashboardFrame, SidebarGroup, TabBar, type NavItem } from '@/features/account/dashboard-frame';
import { useUnreadCount } from '@/features/messages/unread-count';
import { cn } from '@/lib/cn';
import { HOST_INBOX, HOST_REVIEWS } from './host-links';

/*
 * The Host dashboard's frame (plan §12.6): "sidebar navigation on desktop and tablet, bottom tab bar on
 * mobile (… Today · Vehicles · Calendar · Earnings · Inbox for Hosts)". The Host area also holds bookings by
 * status, reviews, and the profile and settings: in the sidebar, and on a phone from Today. The inbox and
 * reviews are the pages Hosts share with Guests, opened as a Host (host-links.ts).
 */

/** A car's own calendar page, which belongs to Calendar; the car's other pages belong to Vehicles. */
const CAR_CALENDAR = /^\/host\/vehicles\/[^/]+\/calendar\/?$/;

const TODAY: NavItem = {
  to: '/host',
  label: 'Today',
  icon: Sun,
  // Applying again after a rejection starts from Today too.
  owns: (path) => path === '/host' || path === '/host/apply',
};
const VEHICLES: NavItem = {
  to: '/host/vehicles',
  label: 'Vehicles',
  icon: CarFront,
  owns: (path) => path.startsWith('/host/vehicles') && !CAR_CALENDAR.test(path),
};
const BOOKINGS: NavItem = {
  to: '/host/bookings',
  label: 'Bookings',
  icon: ClipboardList,
  owns: (path) => path.startsWith('/host/bookings'),
};
const CALENDAR: NavItem = {
  to: '/host/calendar',
  label: 'Calendar',
  icon: CalendarDays,
  owns: (path) => path.startsWith('/host/calendar') || CAR_CALENDAR.test(path),
};
const EARNINGS: NavItem = {
  to: '/host/earnings',
  label: 'Earnings',
  icon: Wallet,
  owns: (path) => path.startsWith('/host/earnings'),
};
const INBOX: NavItem = {
  to: HOST_INBOX,
  label: 'Inbox',
  icon: MessagesSquare,
  owns: (path) => path.startsWith('/messages'),
  unread: true,
};
const REVIEWS: NavItem = {
  to: HOST_REVIEWS,
  label: 'Reviews',
  icon: Star,
  owns: (path) => path === '/account/reviews',
};
const PROFILE: NavItem = {
  to: '/host/profile',
  label: 'Profile',
  icon: UserRound,
  owns: (path) => path.startsWith('/host/profile'),
};

/** Not on the phone's tab bar: reached from Today, which they belong to there. */
const MORE: NavItem[] = [BOOKINGS, REVIEWS, PROFILE];

/** The phone's tab bar: exactly the five places plan §12.6 names. */
const TABS: NavItem[] = [
  {
    ...TODAY,
    owns: (path) => TODAY.owns!(path) || MORE.some((item) => item.owns!(path)),
  },
  VEHICLES,
  CALENDAR,
  EARNINGS,
  INBOX,
];

/** The Host area's sidebar on tablets and desktops: every section. */
export function HostSidebar({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const unread = useUnreadCount();
  return (
    <nav aria-label="Hosting" className={cn('grid content-start gap-6', className)}>
      <SidebarGroup
        items={[TODAY, VEHICLES, BOOKINGS, CALENDAR, EARNINGS, INBOX]}
        path={pathname}
        unread={unread}
      />
      <SidebarGroup title="Your profile" items={[REVIEWS, PROFILE]} path={pathname} />
    </nav>
  );
}

/** The Host area's tab bar along the bottom of a phone: Today · Vehicles · Calendar · Earnings · Inbox. */
export function HostTabBar({ className }: { className?: string }) {
  return <TabBar label="Hosting, quick links" items={TABS} className={cn('md:hidden', className)} />;
}

/**
 * The Host dashboard's frame on every Host page (spec §9, plan §12.6): the sidebar beside the page on
 * tablets and desktops, and the tab bar under it on phones. Each page keeps its own heading and background.
 * Someone who hasn't applied to host doesn't get it: the Host home and the application stay as they are.
 */
export function HostShell({ children }: { children: ReactNode }) {
  return (
    <DashboardFrame sidebar={<HostSidebar />} tabBar={<HostTabBar />}>
      {children}
    </DashboardFrame>
  );
}

function MoreLink({ item }: { item: NavItem }) {
  const Icon: LucideIcon = item.icon;
  return (
    <Link
      to={item.to}
      viewTransition
      className={cn(
        'flex min-h-14 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface px-2 text-sm font-medium text-ink shadow-xs transition-[border-color,scale] duration-120 ease-out',
        'hover:border-ink/20 active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      )}
    >
      <Icon aria-hidden="true" className="size-5 text-primary" />
      {item.label}
    </Link>
  );
}

/** On a phone, Today leads to the Host's places that aren't on the tab bar: bookings, reviews and the profile. */
export function HostMoreLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="More hosting" className={cn('md:hidden', className)}>
      <ul className="grid grid-cols-3 gap-2">
        {MORE.map((item) => (
          <li key={item.to}>
            <MoreLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
