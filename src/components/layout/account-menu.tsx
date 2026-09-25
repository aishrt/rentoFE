import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials, isStaff } from '@/features/auth/roles';
import { useLogout } from '@/features/auth/use-session';
import { UserMenuLabel } from './user-menu-label';

export function AccountMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      {/* Fades in over the placeholder it replaces once the session and this menu have loaded. */}
      <DropdownMenuTrigger
        className="flex h-11 animate-fade-in items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 transition-[border-color,scale] duration-120 ease-out hover:border-ink/25 active:scale-98 data-[state=open]:border-ink/25"
        aria-label={`Account menu for ${user.firstName}`}
      >
        <Avatar initials={initials(user)} />
        <span className="hidden text-sm font-medium sm:inline">{user.firstName}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted transition-transform duration-200 ease-out in-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <UserMenuLabel user={user} />
        <DropdownMenuSeparator />
        {isStaff(user) && (
          <DropdownMenuItem asChild>
            <Link to="/admin" viewTransition>
              <LayoutDashboard aria-hidden="true" />
              Staff portal
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
