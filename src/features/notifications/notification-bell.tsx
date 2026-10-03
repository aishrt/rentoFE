import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { NotificationItem } from '@/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon-button';
import { NotificationText } from './notification-text';
import { BELL_SIZE, internalLink, useMarkNotificationsRead, useNotifications } from './notifications-api';

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={() => onOpen(item)}
      className="min-h-0 items-start gap-3 rounded-control px-3 py-3 [&_svg]:size-auto"
    >
      <NotificationText item={item} />
    </DropdownMenuItem>
  );
}

/**
 * The header's bell (plan §7): the unread count, refreshed every minute until Socket.IO messaging arrives,
 * and the newest three notifications, with "Show all" to the Notifications page when there are more. Opening
 * one marks it read and goes to its page. Only signed-in visitors get it, and it loads on its own, after the
 * page (plan §12.5).
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const items = notifications.data?.notifications ?? [];
  const unread = notifications.data?.unreadCount ?? 0;
  const total = notifications.data?.total ?? 0;

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate([item.id]);
    const link = internalLink(item);
    if (link) navigate(link, { viewTransition: true });
  };

  return (
    <DropdownMenu
      onOpenChange={(isOpen) => {
        if (isOpen) void notifications.refetch();
      }}
    >
      <DropdownMenuTrigger asChild>
        <IconButton
          label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          tooltip="none"
          className="animate-fade-in"
        >
          <Bell aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1 flex h-4.5 min-w-4.5 animate-pop-in items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold text-white tabular-nums"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-4">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread > 0 && (
            <DropdownMenuItem
              onSelect={(event) => {
                // Stays open, so the list can be seen turning read.
                event.preventDefault();
                markRead.mutate(undefined);
              }}
              className="min-h-9 text-primary [&_svg]:text-primary"
            >
              <CheckCheck aria-hidden="true" />
              Mark all as read
            </DropdownMenuItem>
          )}
        </div>
        {notifications.isError && !notifications.data ? (
          <p className="px-4 py-6 text-sm text-muted">
            We couldn’t load your notifications. We’ll try again shortly.
          </p>
        ) : !notifications.data ? (
          <p className="px-4 py-6 text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">You’re all caught up. Booking news will show here.</p>
        ) : (
          <div className="grid gap-0.5 p-1.5">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} onOpen={open} />
            ))}
          </div>
        )}
        {total > BELL_SIZE && (
          <div className="border-t border-line p-1.5">
            <DropdownMenuItem asChild className="justify-center text-primary [&_svg]:text-primary">
              <Link to="/notifications" viewTransition>
                Show all {total} notifications
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </DropdownMenuItem>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
