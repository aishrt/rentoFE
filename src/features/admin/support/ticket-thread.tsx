import { Lock } from 'lucide-react';
import type { StaffTicket } from '@/api/types';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { TicketFiles } from '@/features/support/ticket-files';
import { cn } from '@/lib/cn';

type ThreadMessage = StaffTicket['thread'][number];

function InternalNote({ message }: { message: ThreadMessage }) {
  return (
    <li className="flex justify-end">
      <article
        aria-label={`Internal note from ${message.authorName}`}
        className="grid w-full max-w-[min(100%,40rem)] gap-1.5 rounded-card border border-dashed border-ink/20 bg-ink/3 px-4 py-3"
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Lock aria-hidden="true" className="size-3.5" />
          Internal note — only staff see this
        </p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink/85">{message.body}</p>
        <TicketFiles files={message.attachments} />
        <p className="text-xs text-muted">
          {message.authorName} ·{' '}
          <time dateTime={message.createdAt}>{formatNzDateTime(message.createdAt)}</time>
        </p>
      </article>
    </li>
  );
}

function Message({ message }: { message: ThreadMessage }) {
  const staff = message.from === 'STAFF';
  return (
    <li className={cn('flex', staff ? 'justify-end' : 'justify-start')}>
      <article
        aria-label={staff ? `Reply from ${message.authorName}` : `Message from ${message.authorName}`}
        className={cn(
          'grid max-w-[85%] gap-1.5 rounded-card px-4 py-3 sm:max-w-[75%]',
          staff
            ? 'rounded-br-inner bg-primary text-white'
            : 'rounded-bl-inner border border-line bg-surface text-ink',
        )}
      >
        <p className={cn('text-xs font-semibold', staff ? 'text-accent' : 'text-primary')}>
          {staff ? `${message.authorName} · Rento Vroom support` : message.authorName}
        </p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.body}</p>
        <TicketFiles files={message.attachments} onPrimary={staff} />
        <p className={cn('text-xs', staff ? 'text-accent' : 'text-muted')}>
          <time dateTime={message.createdAt}>{formatNzDateTime(message.createdAt)}</time>
        </p>
      </article>
    </li>
  );
}

/**
 * A ticket's conversation, oldest first: the sender's messages on the left, the team's replies on the
 * right, and internal notes, which only staff see, in a quiet dashed box.
 */
export function TicketThread({ ticket }: { ticket: StaffTicket }) {
  return (
    <section aria-labelledby="ticket-conversation">
      <h2 id="ticket-conversation" className="text-base font-semibold text-ink">
        Conversation
      </h2>
      {ticket.thread.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No messages yet.</p>
      ) : (
        <ol className="mt-4 grid gap-4">
          {ticket.thread.map((message) =>
            message.internal ? (
              <InternalNote key={message.id} message={message} />
            ) : (
              <Message key={message.id} message={message} />
            ),
          )}
        </ol>
      )}
    </section>
  );
}
