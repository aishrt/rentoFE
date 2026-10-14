import {
  Bell,
  CarFront,
  ChevronDown,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Luggage,
  MessagesSquare,
  Star,
  UserRound,
} from 'lucide-react';
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
import { AgreementsGate } from '@/features/auth/agreements-gate';
import { initials, isStaff } from '@/features/auth/roles';
import { useLogout } from '@/features/auth/use-session';
import { useUnreadMessages } from '@/features/messages/unread-count';
import { UnreadBadge } from '@/features/messages/unread-badge';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { UserMenuLabel } from './user-menu-label';

export function AccountMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();
  // Read here rather than in the menu, so the count is ready when it opens; live over Socket.IO.
  const unread = useUnreadMessages().data ?? 0;
  // Hosting for anyone who has applied, and the way in for everyone else.
  const hosting = user.hostStatus
    ? { label: 'Hosting', to: '/host' }
    : { label: 'Become a host', to: '/become-a-host' };

  return (
    <>
      {/* The header's signed-in part, on every public page, so visitors never download it. */}
      <AgreementsGate />
      {/* The bell lives in this signed-in chunk too, so the homepage's first load doesn't grow (plan §12.5). */}
      <NotificationBell />
      <DropdownMenu>
        {/* Fades in over the placeholder it replaces once the session and this menu have loaded. */}
        <DropdownMenuTrigger
          className="flex h-11 animate-fade-in items-center gap-2 rounded-full border border-line bg-surface py-1 pr-1 pl-1 sm:pr-3 transition-[border-color,scale] duration-120 ease-out hover:border-ink/25 active:scale-98 data-[state=open]:border-ink/25"
          aria-label={`Account menu for ${user.firstName}`}
        >
          <Avatar initials={initials(user)} />
          <span className="hidden text-sm font-medium sm:inline">{user.firstName}</span>
          <ChevronDown
            aria-hidden="true"
            // On a phone the chip is just the initials, leaving room for the wordmark on one line.
            className="size-4 text-muted transition-transform duration-200 ease-out in-data-[state=open]:rotate-180 max-sm:hidden"
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
          <DropdownMenuItem asChild>
            <Link to="/trips" viewTransition>
              <Luggage aria-hidden="true" />
              Trips
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/messages" viewTransition>
              <MessagesSquare aria-hidden="true" />
              Messages
              <UnreadBadge count={unread} className="ml-auto" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/saved" viewTransition>
              <Heart aria-hidden="true" />
              Saved cars
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={hosting.to} viewTransition>
              {user.hostStatus ? <KeyRound aria-hidden="true" /> : <CarFront aria-hidden="true" />}
              {hosting.label}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications" viewTransition>
              <Bell aria-hidden="true" />
              Notifications
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/account/reviews" viewTransition>
              <Star aria-hidden="true" />
              Reviews
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/account" viewTransition>
              <UserRound aria-hidden="true" />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout.mutate()}>
            <LogOut aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
