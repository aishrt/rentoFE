import type { NotificationItem } from '@/api/types';
import { formatRelativeTime } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';

/**
 * A notification's dot, title, text and age, as the bell and the Notifications page both show it. `titleId`
 * lets the buttons beside it say which notification they act on.
 */
export function NotificationText({ item, titleId }: { item: NotificationItem; titleId?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-primary')}
      />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span id={titleId} className={cn('text-sm text-ink', !item.read && 'font-semibold')}>
          {!item.read && <span className="sr-only">Unread: </span>}
          {item.title}
        </span>
        {item.body && <span className="line-clamp-2 text-sm text-muted">{item.body}</span>}
        <time dateTime={item.createdAt} className="text-xs text-muted">
          {formatRelativeTime(item.createdAt)}
        </time>
      </span>
    </>
  );
}
