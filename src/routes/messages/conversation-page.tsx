import { EllipsisVertical, Flag, Lock, MessagesSquare, ShieldAlert, UserX } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Message, ThreadDetail } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { AccountShell } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatTripSpan } from '@/features/booking/booking-format';
import { Composer } from '@/features/messages/composer';
import { MessageList } from '@/features/messages/message-list';
import {
  useBlock,
  useLoadOlderMessages,
  useMessages,
  useReadThread,
  useThread,
} from '@/features/messages/messages-api';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { ReportDialogContent } from '@/features/messages/report-dialog';

type ReportTarget = { type: 'USER'; id: string } | { type: 'MESSAGE'; id: string };

function ConversationHeader({
  thread,
  onReport,
}: {
  thread: ThreadDetail;
  onReport: (target: ReportTarget) => void;
}) {
  const block = useBlock();
  const name = thread.otherParty.firstName;
  const bookingPath = thread.role === 'HOST' ? `/host/bookings/${thread.ref}` : `/trips/${thread.ref}`;

  const toggleBlock = () =>
    block.mutate(
      { userId: thread.otherParty.id, block: !thread.blockedByMe },
      {
        onSuccess: () =>
          toast(thread.blockedByMe ? `${name} is unblocked` : `${name} is blocked`, {
            description: thread.blockedByMe
              ? 'You can message each other again.'
              : 'They can’t message you. Booking updates from Rento Vroom still arrive here.',
          }),
        onError: (error) => toast('That didn’t work', { description: error.message, tone: 'danger' }),
      },
    );

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar name={name} photoUrl={thread.otherParty.avatarUrl} className="size-12" />
      <div className="min-w-0 flex-1">
        <h1 className="headline truncate text-xl font-medium sm:text-title-3">{name}</h1>
        <p className="truncate text-sm text-muted">
          {thread.role === 'GUEST' ? 'Your host' : 'Your guest'} ·{' '}
          <Link to={bookingPath} viewTransition className="link-underline text-primary">
            {thread.vehicle.title}, {formatTripSpan(thread.start, thread.end)}
          </Link>
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="More options" tooltip="none">
            <EllipsisVertical aria-hidden="true" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onReport({ type: 'USER', id: thread.otherParty.id })}>
            <Flag aria-hidden="true" />
            Report {name}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleBlock}>
            <UserX aria-hidden="true" />
            {thread.blockedByMe ? `Unblock ${name}` : `Block ${name}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ClosedNotice({ thread }: { thread: ThreadDetail }) {
  const block = useBlock();
  return (
    <Card className="flex flex-col gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-ink/85">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
        {thread.readOnlyReason}
      </p>
      {thread.blockedByMe && (
        <Button
          variant="secondary"
          size="sm"
          loading={block.isPending}
          onClick={() => block.mutate({ userId: thread.otherParty.id, block: false })}
        >
          Unblock {thread.otherParty.firstName}
        </Button>
      )}
    </Card>
  );
}

/** Keeps the newest message in view as messages arrive, unless the reader has scrolled up to older ones. */
function useStickToBottom(count: number) {
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const marker = end.current;
    if (!marker || count === 0) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320;
    if (first.current || nearBottom)
      marker.scrollIntoView({ block: 'end', behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [count]);
  return end;
}

function Conversation({ bookingRef }: { bookingRef: string }) {
  const thread = useThread(bookingRef);
  const messages = useMessages(bookingRef);
  const older = useLoadOlderMessages(bookingRef);
  const read = useReadThread(bookingRef);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const list = messages.data?.messages ?? [];
  const end = useStickToBottom(list.length);

  // Opening the conversation, and each message that arrives while it's on screen, marks it read.
  const newest = list.at(-1)?.id;
  const { mutate: markRead } = read;
  useEffect(() => {
    if (!newest || document.visibilityState === 'hidden') return;
    markRead();
  }, [newest, markRead]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && newest) markRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [newest, markRead]);

  const error = thread.error ?? messages.error;
  if (error) {
    const closed = error instanceof ApiError && (error.code === 'NO_THREAD' || error.status === 404);
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <MessagesSquare />
          </IconBadge>
        }
        title={closed ? 'There’s no conversation here yet' : 'We couldn’t load this conversation'}
        description={
          closed ? 'Messages open once a booking or request has been sent to the host.' : error.message
        }
        actions={
          closed ? (
            <Button asChild>
              <Link to="/messages">All messages</Link>
            </Button>
          ) : (
            <Button
              onClick={() => {
                void thread.refetch();
                void messages.refetch();
              }}
            >
              Try again
            </Button>
          )
        }
      />
    );
  }
  if (!thread.data || !messages.data) return <ConversationSkeleton />;
  const current = thread.data;

  return (
    // One column that never grows past the page, so the header's name and trip are cut off on a phone.
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4">
        <BackLink to="/messages">All messages</BackLink>
        <ConversationHeader thread={current} onReport={setReporting} />
      </div>

      {current.contactsHidden && (
        <Alert variant="info" title="Contact details are hidden for now">
          Phone numbers, emails and links show once the booking is confirmed. Keep payments and arrangements
          on Rento Vroom.
        </Alert>
      )}

      <Card className="grid gap-4 p-4 sm:p-6">
        {messages.data.hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-center"
            loading={older.isPending}
            onClick={() => older.mutate(list[0]!.id)}
          >
            Show earlier messages
          </Button>
        )}
        {list.length === 0 ? (
          <p className="py-8 text-center text-muted">
            Say kia ora to {current.otherParty.firstName}. Ask about pick-up, the car, or anything for the
            trip.
          </p>
        ) : (
          <MessageList
            messages={list}
            otherName={current.otherParty.firstName}
            onReport={(message: Message) => setReporting({ type: 'MESSAGE', id: message.id })}
          />
        )}
        <div ref={end} />
      </Card>

      <div className="rounded-card border border-line bg-surface p-4 shadow-xs sm:p-5">
        {current.canSend ? (
          <Composer bookingRef={current.ref} otherName={current.otherParty.firstName} />
        ) : (
          <ClosedNotice thread={current} />
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <ShieldAlert aria-hidden="true" className="size-3.5" />
          In an emergency, call 111. For a problem on the road, report it from the trip.
        </p>
      </div>

      <Dialog open={reporting !== null} onOpenChange={(open) => !open && setReporting(null)}>
        {reporting && (
          <ReportDialogContent
            targetType={reporting.type}
            targetId={reporting.id}
            subject={reporting.type === 'USER' ? current.otherParty.firstName : 'this message'}
            // Reporting the person from here keeps which conversation it was, for support to read.
            bookingRef={reporting.type === 'USER' ? current.ref : undefined}
            onDone={() => setReporting(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

/** One booking's conversation (spec §13): messages with photos, live, with report and block. */
export function ConversationPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title="Messages" noindex />
      <AccountShell>
        <div className="max-w-3xl">
          <RequireSignedIn fallback={<ConversationSkeleton />}>
            {() => <Conversation key={ref} bookingRef={ref.toUpperCase()} />}
          </RequireSignedIn>
        </div>
      </AccountShell>
    </Container>
  );
}
