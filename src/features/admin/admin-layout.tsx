import { ChevronDown, ExternalLink, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useMatches, useNavigate } from 'react-router';
import type { SessionUser } from '@/api/types';
import { SkipLink } from '@/components/layout/root-layout';
import { UserMenuLabel } from '@/components/layout/user-menu-label';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon-button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { initials, staffRoleLabel } from '@/features/auth/roles';
import { useLogout } from '@/features/auth/use-session';
import { AdminSidebar } from './admin-sidebar';

/** Admin routes set `handle: { title }` so the header can show where the user is. */
export interface AdminRouteHandle {
  title: string;
}

function usePageTitle(): string {
  const matches = useMatches();
  for (let index = matches.length - 1; index >= 0; index--) {
    const handle = matches[index]?.handle as Partial<AdminRouteHandle> | undefined;
    if (handle?.title) return handle.title;
  }
  return 'Staff portal';
}

function StaffMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.firstName}`}
        className="flex h-11 items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-[background-color,scale] duration-120 ease-out hover:bg-ink/5 active:scale-98 data-[state=open]:bg-ink/5 sm:pr-3"
      >
        <Avatar initials={initials(user)} tone="accent" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium text-ink">{user.firstName}</span>
          <span className="block text-xs leading-tight text-muted">{staffRoleLabel(user)}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="hidden size-4 text-muted transition-transform duration-200 ease-out in-data-[state=open]:rotate-180 sm:block"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <UserMenuLabel user={user} />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/">
            <ExternalLink aria-hidden="true" />
            View website
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            logout.mutate(undefined, { onSettled: () => navigate('/admin/login', { replace: true }) })
          }
        >
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Staff portal frame: a fixed sidebar on desktop, a slide-in menu on tablet and phone
 * (plan §12.6: designed for desktop and tablet, still usable on a phone for urgent tasks).
 */
export function AdminLayout({ user }: { user: SessionUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = usePageTitle();

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <SkipLink />
      {/* The sidebar and header are named for view transitions, so only the page content cross-fades. */}
      <aside className="sticky top-0 hidden h-dvh [view-transition-name:staff-sidebar] lg:block">
        <AdminSidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" title="Staff portal" className="[&>div:last-child]:px-0">
          <AdminSidebar tone="light" showLogo={false} staggered onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-line/70 [view-transition-name:staff-header]">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                label="Open staff menu"
                className="-ml-2 lg:hidden [&_svg]:size-6"
                onClick={() => setMenuOpen(true)}
              >
                <Menu aria-hidden="true" />
              </IconButton>
              <p className="truncate text-sm text-muted">
                <span className="hidden sm:inline">Staff portal / </span>
                <span className="font-medium text-ink">{title}</span>
              </p>
            </div>
            <StaffMenu user={user} />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayoutSkeleton() {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]" aria-busy="true">
      <span className="sr-only">Loading the staff portal</span>
      <div className="hidden h-dvh bg-ink lg:block" />
      <div>
        <div className="flex h-16 items-center justify-between border-b border-line/70 px-4 sm:px-6 lg:px-10">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-3 h-9 w-72 max-w-full" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
