import { cn } from '@/lib/cn';

/** What screen readers hear after a Messages or Inbox link's name: "Messages, 3 unread". */
export function UnreadLabel({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="sr-only">{`, ${count} unread`}</span>;
}

/**
 * How many messages wait, beside a Messages or Inbox link (useUnreadCount), with the full count for screen
 * readers past 99. Nothing when there are none. `quiet` leaves the words out, for a badge drawn before the
 * link's name (on a tab's icon) that puts an UnreadLabel after it instead.
 */
export function UnreadBadge({
  count,
  quiet = false,
  className,
}: {
  count: number;
  quiet?: boolean;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden={quiet || undefined}
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs leading-5 font-semibold text-white',
        className,
      )}
    >
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      {!quiet && <UnreadLabel count={count} />}
    </span>
  );
}
