import type { ReactNode } from 'react';
import { AccountSidebar, AccountTabBar } from '@/features/account/account-shell';
import { DashboardFrame } from '@/features/account/dashboard-frame';
import { HostSidebar, HostTabBar } from './host-shell';

/**
 * The frame for a page Hosts share with Guests, such as the inbox and reviews (host-links.ts): the Host's
 * dashboard when it was opened as a Host, the Guest's otherwise. While that isn't known yet (a conversation
 * still loading), the page waits in the frame without either, and keeps its place when one arrives. Kept
 * apart from HostShell, so the Host's own pages don't load the Guest's navigation.
 */
export function AreaShell({ host, children }: { host: boolean | undefined; children: ReactNode }) {
  return (
    <DashboardFrame
      sidebar={host === undefined ? undefined : host ? <HostSidebar /> : <AccountSidebar />}
      tabBar={host === undefined ? undefined : host ? <HostTabBar /> : <AccountTabBar />}
    >
      {children}
    </DashboardFrame>
  );
}
