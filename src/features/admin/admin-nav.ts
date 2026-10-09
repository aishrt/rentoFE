import {
  CalendarRange,
  ChartColumn,
  Car,
  CircleHelp,
  FileText,
  Flag,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListRestart,
  Radar,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  icon: LucideIcon;
  /** Set once the section exists; items without it show as "Soon". */
  to?: string;
  /** Hidden from the support team. The API refuses them these pages anyway. */
  adminOnly?: boolean;
}

/** Staff portal sections from plan §12.6. Each gets a route as its module is built. */
export const adminNav: { title?: string; items: AdminNavItem[] }[] = [
  { items: [{ label: 'Overview', icon: LayoutDashboard, to: '/admin' }] },
  {
    title: 'Marketplace',
    items: [
      { label: 'Users', icon: Users, to: '/admin/users' },
      { label: 'Host applications', icon: KeyRound, to: '/admin/host-applications' },
      { label: 'Vehicles', icon: Car, to: '/admin/vehicles' },
      { label: 'Bookings', icon: CalendarRange, to: '/admin/bookings' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Verifications', icon: ShieldCheck, to: '/admin/verifications' },
      { label: 'Incidents & disputes', icon: TriangleAlert, to: '/admin/incidents' },
      { label: 'Support', icon: LifeBuoy, to: '/admin/support' },
      { label: 'Moderation', icon: Flag, to: '/admin/moderation' },
      { label: 'Risk', icon: Radar, to: '/admin/risk' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments & payouts', icon: Wallet, to: '/admin/payments' },
      // Shown to the whole team; support members without the refunds permission are told they need it.
      { label: 'Refunds', icon: Undo2, to: '/admin/refunds' },
      { label: 'Reports', icon: ChartColumn, to: '/admin/reports', adminOnly: true },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Content', icon: FileText, to: '/admin/content', adminOnly: true },
      { label: 'FAQs & help', icon: CircleHelp, to: '/admin/help', adminOnly: true },
      { label: 'Staff', icon: UserCog, to: '/admin/staff', adminOnly: true },
      { label: 'Settings', icon: Settings, to: '/admin/settings' },
      { label: 'Audit log', icon: ScrollText, to: '/admin/audit', adminOnly: true },
      { label: 'Jobs', icon: ListRestart, to: '/admin/jobs', adminOnly: true },
    ],
  },
];
