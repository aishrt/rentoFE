import { Bell, CheckCheck, Mail, MailOpen, Trash2, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { NotificationItem } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { SignalArcs } from '@/components/brand/patterns/signal-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { AccountShell } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { NotificationText } from '@/features/notifications/notification-text';
import {
  internalLink,
  useDeleteNotifications,
  useMarkNotificationsRead,
  useMarkNotificationsUnread,
  useNotificationPages,
  type DeleteTarget,
  type NotificationFilter,
} from '@/features/notifications/notifications-api';
import { cn } from '@/lib/cn';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const failed = (error: Error) =>
  toast('We couldn’t update your notifications', { tone: 'danger', description: error.message });

/** The page's changes, each confirmed with a toast, or undone with one saying why. */
function useActions() {
  const markRead = useMarkNotificationsRead();
  const markUnread = useMarkNotificationsUnread();
  const remove = useDeleteNotifications();

  return {
    markRead: (ids?: string[]) =>
      markRead.mutate(ids, {
        onSuccess: () =>
          toast(
            ids
              ? `${ids.length === 1 ? 'Marked' : plural(ids.length, 'notification') + ' marked'} as read`
              : 'All marked as read',
          ),
        onError: failed,
      }),
    markUnread: (ids: string[]) =>
      markUnread.mutate(ids, {
        onSuccess: () =>
          toast(`${ids.length === 1 ? 'Marked' : plural(ids.length, 'notification') + ' marked'} as unread`),
        onError: failed,
      }),
    remove: (target: DeleteTarget) =>
      remove.mutate(target, {
        onSuccess: ({ deleted }) =>
          toast(deleted === 1 ? 'Notification deleted' : `${plural(deleted, 'notification')} deleted`),
        onError: failed,
      }),
    /** Opening one marks it read, quietly: the page it opens is the confirmation. */
    open: (item: NotificationItem) => {
      if (!item.read) markRead.mutate([item.id], { onError: failed });
    },
  };
}

type Actions = ReturnType<typeof useActions>;

interface ConfirmDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}

/** Asks before deleting more than one notification. Deleted ones can't be brought back. */
function ConfirmDelete({ open, onOpenChange, title, description, onConfirm }: ConfirmDeleteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RowProps {
  item: NotificationItem;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  actions: Actions;
}

function NotificationRow({ item, selected, onSelect, actions }: RowProps) {
  const titleId = useId();
  const link = internalLink(item);
  const text = <NotificationText item={item} titleId={titleId} />;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-3 transition-colors duration-120 sm:px-4',
        selected ? 'bg-primary/8' : !item.read && 'bg-primary/3',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelect(item.id, event.target.checked)}
        aria-labelledby={titleId}
        className="mt-3 size-5 shrink-0 cursor-pointer accent-primary"
      />
      {link ? (
        <Link
          to={link}
          viewTransition
          onClick={() => actions.open(item)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {text}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3 py-2">{text}</div>
      )}
      <div className="flex shrink-0">
        {item.read ? (
          <IconButton
            label="Mark as unread"
            aria-describedby={titleId}
            onClick={() => actions.markUnread([item.id])}
          >
            <Mail aria-hidden="true" />
          </IconButton>
        ) : (
          <IconButton
            label="Mark as read"
            aria-describedby={titleId}
            onClick={() => actions.markRead([item.id])}
          >
            <MailOpen aria-hidden="true" />
          </IconButton>
        )}
        <IconButton
          label="Delete"
          aria-describedby={titleId}
          onClick={() => actions.remove({ ids: [item.id] })}
          className="hover:bg-danger/8 hover:text-danger"
        >
          <Trash2 aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card aria-hidden="true" className="divide-y divide-line overflow-hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-4 px-4 py-5">
          <Skeleton className="size-5 rounded-inner" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </Card>
  );
}

function Empty({ filter, onShowAll }: { filter: NotificationFilter; onShowAll: () => void }) {
  return filter === 'unread' ? (
    <EmptyState
      className="mx-auto py-8"
      titleAs="h2"
      visual={
        <IconBadge size="xl">
          <CheckCheck />
        </IconBadge>
      }
      title="Nothing unread"
      description="You’re up to date. Everything you’ve read stays under All until you delete it."
      actions={
        <Button variant="secondary" onClick={onShowAll}>
          Show all
        </Button>
      }
    />
  ) : (
    <EmptyState
      className="mx-auto py-8"
      titleAs="h2"
      visual={
        <IconBadge size="xl">
          <Bell />
        </IconBadge>
      }
      title="No notifications"
      description="Booking news, listing updates and messages about your account will show here."
    />
  );
}

interface ListProps {
  filter: NotificationFilter;
  query: ReturnType<typeof useNotificationPages>;
  actions: Actions;
  onShowAll: () => void;
}

/** One tab's list, with its own selection: changing tabs starts a new one. */
function NotificationList({ filter, query, actions, onShowAll }: ListProps) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const items = query.data?.pages.flatMap((page) => page.notifications) ?? [];
  // Only what's still shown: a notification deleted or read away elsewhere drops out of the selection.
  const selected = items.filter((item) => picked.has(item.id));
  const all = items.length > 0 && selected.length === items.length;

  if (query.isError && !query.data) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your notifications"
        action={
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      >
        {query.error.message}
      </Alert>
    );
  }
  if (!query.data) return <ListSkeleton />;
  if (items.length === 0) return <Empty filter={filter} onShowAll={onShowAll} />;

  const select = (id: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const ids = selected.map((item) => item.id);
  const clear = () => setPicked(new Set());
  const total = query.data.pages[0]?.[filter === 'unread' ? 'unreadCount' : 'total'] ?? items.length;

  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden">
        <div className="flex min-h-15 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-3 py-2 sm:px-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={all}
              ref={(input) => {
                if (input) input.indeterminate = selected.length > 0 && !all;
              }}
              onChange={() => setPicked(all ? new Set() : new Set(items.map((item) => item.id)))}
              className="size-5 shrink-0 cursor-pointer accent-primary"
            />
            {selected.length > 0 ? `${selected.length} selected` : 'Select all'}
          </label>
          {selected.length > 0 && (
            <div className="flex animate-fade-in flex-wrap gap-2 sm:ml-auto">
              {selected.some((item) => !item.read) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    actions.markRead(ids);
                    clear();
                  }}
                >
                  <MailOpen aria-hidden="true" />
                  Mark read
                </Button>
              )}
              {selected.some((item) => item.read) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    actions.markUnread(selected.filter((item) => item.read).map((item) => item.id));
                    clear();
                  }}
                >
                  <Mail aria-hidden="true" />
                  Mark unread
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
                <Trash2 aria-hidden="true" className="text-danger" />
                Delete selected
              </Button>
              <IconButton label="Clear the selection" onClick={clear}>
                <X aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </div>
        <ul className="divide-y divide-line">
          {items.map((item, index) => (
            <li key={item.id} className="stagger-in" style={staggerIndex(index)}>
              <NotificationRow
                item={item}
                selected={picked.has(item.id)}
                onSelect={select}
                actions={actions}
              />
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Showing {items.length} of {Math.max(total, items.length)}
        </p>
        {query.hasNextPage && (
          <Button
            variant="secondary"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        )}
      </div>

      <ConfirmDelete
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${plural(ids.length, 'notification')}?`}
        description="They’ll be gone for good. Your bookings and listings aren’t affected."
        onConfirm={() => {
          actions.remove({ ids });
          clear();
        }}
      />
    </div>
  );
}

const isFilter = (value: string | null): value is NotificationFilter => value === 'all' || value === 'unread';

function HeaderActions({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-wrap gap-3">{children}</div>;
}

function NotificationCentre() {
  const [params, setParams] = useSearchParams();
  const showParam = params.get('show');
  const filter: NotificationFilter = isFilter(showParam) ? showParam : 'all';
  const query = useNotificationPages(filter);
  const actions = useActions();
  const [confirmingRead, setConfirmingRead] = useState(false);

  const counts = query.data?.pages[0];
  const unread = counts?.unreadCount ?? 0;
  const read = counts ? counts.total - counts.unreadCount : 0;
  const setFilter = (value: NotificationFilter) =>
    setParams(value === 'all' ? {} : { show: value }, { replace: true });

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Your account</p>
          <h1 className="headline mt-2 text-title-3 font-medium">Notifications</h1>
          <p className="mt-2 text-muted">
            Booking news, listing updates and messages about your account, newest first.
          </p>
        </div>
        {counts && (unread > 0 || read > 0) && (
          <HeaderActions>
            {unread > 0 && (
              <Button variant="secondary" onClick={() => actions.markRead()}>
                <CheckCheck aria-hidden="true" />
                Mark all as read
              </Button>
            )}
            {read > 0 && (
              <Button variant="ghost" onClick={() => setConfirmingRead(true)}>
                <Trash2 aria-hidden="true" className="text-danger" />
                Delete read
              </Button>
            )}
          </HeaderActions>
        )}
      </div>

      <SegmentedTabs
        idPrefix="notifications"
        label="Notifications"
        options={[
          { value: 'all', label: counts ? `All (${counts.total})` : 'All' },
          { value: 'unread', label: counts ? `Unread (${unread})` : 'Unread' },
        ]}
        value={filter}
        onChange={setFilter}
        className="max-w-sm"
      />
      <div
        role="tabpanel"
        id={tabPanelId('notifications', filter)}
        aria-labelledby={tabId('notifications', filter)}
      >
        <NotificationList
          key={filter}
          filter={filter}
          query={query}
          actions={actions}
          onShowAll={() => setFilter('all')}
        />
      </div>

      <ConfirmDelete
        open={confirmingRead}
        onOpenChange={setConfirmingRead}
        title={`Delete ${plural(read, 'read notification')}?`}
        description="Everything you’ve already read goes for good. Unread ones stay."
        onConfirm={() => actions.remove({ read: true })}
      />
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8">
      <Skeleton className="h-12 w-56" />
      <Skeleton className="h-13 max-w-sm rounded-full" />
      <ListSkeleton />
    </div>
  );
}

/**
 * Every notification (plan §7), beyond the bell's newest three: All or Unread, a page at a time, to open,
 * mark read or unread and delete, one by one or a selection at once.
 */
export function NotificationsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={SignalArcs} />
      <PageMeta title="Notifications" noindex />
      <AccountShell>
        <div className="max-w-4xl">
          <RequireSignedIn fallback={<NotificationsSkeleton />}>
            {() => <NotificationCentre />}
          </RequireSignedIn>
        </div>
      </AccountShell>
    </Container>
  );
}
