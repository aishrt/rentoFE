import { Lock, MessagesSquare } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import type { ThreadSummary } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { AccountPageHeader } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatTripSpan } from '@/features/booking/booking-format';
import { HostPageHeader } from '@/features/host/host-nav';
import { openedAsHost } from '@/features/host/host-links';
import { AreaShell } from '@/features/host/area-shell';
import { formatInboxTime, lastMessagePreview } from '@/features/messages/message-format';
import { useThreads } from '@/features/messages/messages-api';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { cn } from '@/lib/cn';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'guest', label: 'Your trips' },
  { value: 'host', label: 'Your guests' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];
const isFilter = (value: string | null): value is Filter => FILTERS.some((filter) => filter.value === value);

/**
 * Which conversations a Host sees (`?show=`): by default all of them, or their guests' when the inbox was
 * opened as a Host. Kept apart from `?as=`, which only says whose dashboard frames the page, so changing the
 * filter never swaps the frame.
 */
const defaultFilter = (asHost: boolean): Filter => (asHost ? 'host' : 'all');

function ConversationRow({ thread, opened }: { thread: ThreadSummary; opened: string }) {
  const unread = thread.unreadCount > 0;
  return (
    <Link
      to={`/messages/${thread.ref}${opened}`}
      viewTransition
      className={cn(
        'flex items-start gap-4 rounded-card border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] duration-120 sm:p-5',
        'hover:border-ink/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        unread ? 'border-primary/30' : 'border-line',
      )}
    >
      <PersonAvatar
        name={thread.otherParty.firstName}
        photoUrl={thread.otherParty.avatarUrl}
        className="size-12"
      />
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn('truncate text-ink', unread ? 'font-semibold' : 'font-medium')}>
            {thread.otherParty.firstName}
            <span className="ml-2 text-sm font-normal text-muted">
              {thread.role === 'GUEST' ? 'Your host' : 'Your guest'}
            </span>
          </p>
          {thread.lastMessage && (
            <time dateTime={thread.lastMessage.createdAt} className="shrink-0 text-xs text-muted">
              {formatInboxTime(thread.lastMessage.createdAt)}
            </time>
          )}
        </div>
        <p className="truncate text-sm text-muted">
          {thread.vehicle.title} · {formatTripSpan(thread.start, thread.end)} · {thread.ref}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className={cn('truncate text-sm', unread ? 'font-medium text-ink' : 'text-ink/75')}>
            {thread.lastMessage ? lastMessagePreview(thread.lastMessage) : 'No messages yet'}
          </p>
          {unread ? (
            <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs leading-6 font-semibold text-white">
              {thread.unreadCount}
              <span className="sr-only"> unread</span>
            </span>
          ) : (
            thread.readOnly && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                <Lock aria-hidden="true" className="size-3" />
                Closed
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

function ConversationsSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-3">
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex gap-4 rounded-card border border-line bg-surface p-5">
          <Skeleton className="size-12 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Inbox({ isHost, asHost }: { isHost: boolean; asHost: boolean }) {
  const threads = useThreads();
  const [params, setParams] = useSearchParams();
  const showParam = params.get('show');
  const filter: Filter = !isHost ? 'all' : isFilter(showParam) ? showParam : defaultFilter(asHost);
  // A conversation opens in the same dashboard as the inbox, for someone who has both.
  const opened = isHost ? `?as=${asHost ? 'host' : 'guest'}` : '';
  const choose = (value: Filter) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === defaultFilter(asHost)) next.delete('show');
        else next.set('show', value);
        return next;
      },
      { replace: true },
    );

  let body;
  if (threads.isError) {
    body = (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your messages"
        action={
          <Button variant="secondary" size="sm" onClick={() => void threads.refetch()}>
            Try again
          </Button>
        }
      >
        {threads.error.message}
      </Alert>
    );
  } else if (!threads.data) {
    body = <ConversationsSkeleton />;
  } else {
    const shown = threads.data.threads.filter(
      (thread) => filter === 'all' || (filter === 'guest' ? thread.role === 'GUEST' : thread.role === 'HOST'),
    );
    body =
      shown.length === 0 ? (
        <EmptyState
          className="mx-auto py-8"
          titleAs="h2"
          visual={
            <IconBadge size="xl">
              <MessagesSquare />
            </IconBadge>
          }
          title="No messages yet"
          description={
            filter === 'host'
              ? 'When a guest books one of your cars, you can message them here.'
              : 'Once a booking or request reaches the host, you can message each other here, with photos.'
          }
          actions={
            filter !== 'host' && (
              <Button asChild>
                <Link to="/trips" viewTransition>
                  Your trips
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {shown.map((thread, index) => (
            <li key={thread.ref} className="stagger-in" style={staggerIndex(index)}>
              <ConversationRow thread={thread} opened={opened} />
            </li>
          ))}
        </ul>
      );
  }

  const description =
    'One conversation for each booking. Keep it here: messages are part of the trip’s record if anything goes wrong.';
  return (
    // One column that never grows past the page: a long last message is cut off, not widening the inbox.
    <div className="grid grid-cols-1 gap-8">
      {asHost ? (
        <HostPageHeader eyebrow="Hosting" title="Inbox" description={description} />
      ) : (
        <AccountPageHeader title="Messages" description={description} />
      )}
      {isHost && (
        <SegmentedTabs
          idPrefix="messages"
          label="Conversations"
          options={FILTERS}
          value={filter}
          onChange={choose}
          className="max-w-md"
        />
      )}
      <div
        {...(isHost && {
          role: 'tabpanel',
          id: tabPanelId('messages', filter),
          'aria-labelledby': tabId('messages', filter),
        })}
      >
        {body}
      </div>
    </div>
  );
}

/**
 * The inbox (spec §13, plan §12.6): every booking's conversation, as a Guest and as a Host. Opened as a Host
 * (`?as=host`, the Host area's Inbox) it sits in the Host's dashboard and starts on their guests; otherwise
 * in the Guest's.
 */
export function MessagesPage() {
  const [params] = useSearchParams();
  const asHost = openedAsHost(params);
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title={asHost ? 'Inbox' : 'Messages'} noindex />
      <AreaShell host={asHost}>
        <div className="max-w-4xl">
          <RequireSignedIn fallback={<ConversationsSkeleton />}>
            {(user) => <Inbox isHost={user.hostStatus === 'APPROVED'} asHost={asHost} />}
          </RequireSignedIn>
        </div>
      </AreaShell>
    </Container>
  );
}
