import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials, isStaff } from '@/features/auth/roles';
import { useLogout } from '@/features/auth/use-session';

export function AccountMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 transition-colors duration-120 hover:border-ink/25 data-[state=open]:border-ink/25"
        aria-label={`Account menu for ${user.firstName}`}
      >
        <Avatar initials={initials(user)} />
        <span className="hidden text-sm font-medium sm:inline">{user.firstName}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold text-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </DropdownMenuLabel>
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
