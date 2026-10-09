import { Ban, Flag, Info } from 'lucide-react';
import type { Message } from '@/api/types';
import { cn } from '@/lib/cn';
import { formatMessageDay, formatMessageTime, groupByDay } from './message-format';

interface MessageListProps {
  messages: Message[];
  /** The other person's first name, for screen readers and the report button. */
  otherName: string;
  /** Reporting one of their messages; left out where reporting isn't offered (support staff). */
  onReport?: (message: Message) => void;
  /** Support staff read both sides: names instead of "you". */
  names?: { me: string; them: string };
}

function Photos({ message, mine }: { message: Message; mine: boolean }) {
  if (message.attachments.length === 0) return null;
  return (
    <ul className={cn('grid gap-1.5', message.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {message.attachments.map((photo, index) => (
        <li key={photo.url}>
          <a
            href={photo.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'block overflow-hidden rounded-inner focus-visible:outline-2 focus-visible:outline-offset-2',
              mine ? 'focus-visible:outline-white' : 'focus-visible:outline-primary',
            )}
          >
            <img
              src={photo.url}
              alt={photo.name ?? `Photo ${index + 1}`}
              loading="lazy"
              className="aspect-4/3 w-full max-w-64 bg-canvas object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="mx-auto flex max-w-xl items-start gap-2 rounded-card border border-line/70 bg-canvas/70 px-4 py-3 text-sm text-ink/80">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="min-w-0">
        <span className="sr-only">Rento Vroom: </span>
        {message.body}
        <span className="ml-2 text-xs whitespace-nowrap text-muted">
          {formatMessageTime(message.createdAt)}
        </span>
      </p>
    </div>
  );
}

/**
 * A message support removed, as the Guest and Host see it: the API sends only the notice in its place, with
 * no words or photos of the original, and there's nothing to report.
 */
function RemovedMessage({ message, who }: { message: Message; who: string }) {
  return (
    <p className="flex max-w-[min(85%,32rem)] items-start gap-2 rounded-card border border-dashed border-line px-4 py-2.5 text-sm text-muted italic">
      <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">
        <span className="sr-only">{who}: </span>
        {message.body}
      </span>
    </p>
  );
}

/**
 * A conversation's messages, grouped by NZ day (spec §13): yours on the right, theirs on the left and
 * Rento Vroom's automated ones in the middle. New ones are read out as they arrive. A message support
 * removed shows as a notice; support staff still read it, marked removed.
 */
export function MessageList({ messages, otherName, onReport, names }: MessageListProps) {
  // "Seen" shows once, under your latest message the other side has read.
  const lastSeen = [...messages].reverse().find((message) => message.from === 'ME' && message.readAt)?.id;

  return (
    <div role="log" aria-label={`Messages with ${otherName}`} aria-live="polite" className="grid gap-6">
      {groupByDay(messages).map((group) => (
        <section
          key={group.day}
          aria-label={formatMessageDay(group.messages[0]!.createdAt)}
          className="grid gap-3"
        >
          <p className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {formatMessageDay(group.messages[0]!.createdAt)}
          </p>
          <ol className="grid gap-2.5">
            {group.messages.map((message) => {
              if (message.from === 'SYSTEM') {
                return (
                  <li key={message.id}>
                    <SystemMessage message={message} />
                  </li>
                );
              }
              const mine = message.from === 'ME';
              const who = names ? (mine ? names.me : names.them) : mine ? 'You' : otherName;
              if (message.removed && !names) {
                return (
                  <li
                    key={message.id}
                    className={cn('flex animate-fade-up flex-col', mine ? 'items-end' : 'items-start')}
                  >
                    <RemovedMessage message={message} who={who} />
                    <p className="mt-1 px-1 text-xs text-muted">
                      <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    </p>
                  </li>
                );
              }
              return (
                <li
                  key={message.id}
                  className={cn(
                    'group/message flex animate-fade-up flex-col',
                    mine ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn('flex max-w-[min(85%,32rem)] items-end gap-1', mine && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'grid gap-2 rounded-card px-4 py-2.5 text-ui leading-relaxed shadow-xs',
                        mine
                          ? 'rounded-br-inner bg-primary text-white'
                          : 'rounded-bl-inner border border-line bg-surface text-ink',
                      )}
                    >
                      <span className="sr-only">{who} said: </span>
                      <Photos message={message} mine={mine} />
                      {message.body && <p className="break-words whitespace-pre-wrap">{message.body}</p>}
                    </div>
                    {!mine && onReport && (
                      <button
                        type="button"
                        onClick={() => onReport(message)}
                        aria-label={`Report this message from ${otherName}`}
                        // Shown on hover with a mouse, and always on a touch screen, which has no hover.
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-120 group-hover/message:opacity-100 pointer-coarse:opacity-100 hover:bg-ink/5 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Flag aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 px-1 text-xs text-muted">
                    {names && <span className="font-medium text-ink/70">{who} · </span>}
                    <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    {message.id === lastSeen && <span> · Seen</span>}
                  </p>
                  {message.removed && (
                    // Support staff: the Guest and Host see a notice in its place.
                    <p className="mt-0.5 flex max-w-[min(85%,32rem)] items-start gap-1.5 px-1 text-xs text-danger">
                      <Ban aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                      <span>
                        Removed by support, hidden from both sides
                        {message.removed.reason && `: ${message.removed.reason}`}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
