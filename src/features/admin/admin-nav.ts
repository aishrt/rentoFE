import {
  CalendarRange,
  Car,
  FileText,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  icon: LucideIcon;
  /** Set once the section exists; items without it show as "Soon". */
  to?: string;
}

/** Staff portal sections from plan §12.6. Each gets a route as its module is built. */
export const adminNav: { title?: string; items: AdminNavItem[] }[] = [
  { items: [{ label: 'Overview', icon: LayoutDashboard, to: '/admin' }] },
  {
    title: 'Marketplace',
    items: [
      { label: 'Users', icon: Users },
      { label: 'Host applications', icon: KeyRound },
      { label: 'Vehicles', icon: Car },
      { label: 'Bookings', icon: CalendarRange },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Verifications', icon: ShieldCheck },
      { label: 'Incidents & disputes', icon: TriangleAlert },
      { label: 'Support', icon: LifeBuoy },
    ],
  },
  { title: 'Finance', items: [{ label: 'Payments & payouts', icon: Wallet }] },
  {
    title: 'Platform',
    items: [
      { label: 'Content', icon: FileText },
      { label: 'Settings', icon: Settings },
      { label: 'Audit log', icon: ScrollText },
    ],
  },
];
