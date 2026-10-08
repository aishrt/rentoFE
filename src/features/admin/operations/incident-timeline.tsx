import { FileText, Lock } from 'lucide-react';
import type { Attachment, Incident, IncidentEvent } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import {
  EVENT_ACTION_WORDS,
  EVENT_BY_LABELS,
  STAFF_INCIDENT_STATUS,
  VISIBILITY_LABELS,
} from './operations-labels';

const isImage = (file: Attachment) => !file.contentType || file.contentType.startsWith('image/');

/** A photo as a thumbnail, or a document by name. Links work for 10 minutes; the page refreshes them. */
function AttachmentLink({ file, index, size }: { file: Attachment; index: number; size: 'sm' | 'md' }) {
  const name = file.name ?? `File ${index + 1}`;
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {isImage(file) ? (
        <img
          src={file.url}
          alt={name}
          className={cn('aspect-4/3 rounded-inner bg-canvas object-cover', size === 'md' ? 'w-36' : 'w-24')}
        />
      ) : (
        <span className="inline-flex items-center gap-2 rounded-inner border border-line px-3 py-2 text-sm text-ink">
          <FileText aria-hidden="true" className="size-4 text-muted" />
          {name}
        </span>
      )}
    </a>
  );
}

export function AttachmentList({
  files,
  label,
  size = 'sm',
}: {
  files: Attachment[];
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {files.map((file, index) => (
        <li key={file.url}>
          <AttachmentLink file={file} index={index} size={size} />
        </li>
      ))}
    </ul>
  );
}

/** Who sees an event: Internal notes stand out, as only staff can read them. */
function VisibilityBadge({ visibility }: { visibility: IncidentEvent['visibility'] }) {
  if (visibility === 'INTERNAL') {
    return (
      <Badge variant="primary">
        <Lock aria-hidden="true" />
        {VISIBILITY_LABELS.INTERNAL}
      </Badge>
    );
  }
  return <Badge variant="outline">{VISIBILITY_LABELS[visibility]}</Badge>;
}

function EventItem({ event, description }: { event: IncidentEvent; description: string }) {
  const support = event.by === 'SUPPORT' || event.by === 'YOU';
  // The report's first event repeats the description shown above the history.
  const note = event.action === 'OPENED' && event.note === description ? undefined : event.note;
  return (
    <li className="relative grid gap-2 pb-6 pl-6 before:absolute before:top-2 before:bottom-0 before:left-[5px] before:w-px before:bg-line last:pb-0 last:before:hidden">
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 left-0 size-3 rounded-full ring-4 ring-surface',
          support ? 'bg-primary' : 'bg-ink/40',
        )}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{event.by === 'YOU' ? 'You' : event.byName}</span>
          {event.by !== 'YOU' && ` (${EVENT_BY_LABELS[event.by]})`}{' '}
          {EVENT_ACTION_WORDS[event.action] ?? 'updated the case'}
          {event.status && (
            <>
              {': '}
              <span className="font-medium text-ink">{STAFF_INCIDENT_STATUS[event.status].label}</span>
            </>
          )}{' '}
          · <time dateTime={event.createdAt}>{formatNzDateTime(event.createdAt)}</time>
        </p>
        <VisibilityBadge visibility={event.visibility} />
      </div>
      {note && (
        <p
          className={cn(
            'whitespace-pre-wrap text-ink/90',
            event.visibility === 'INTERNAL' && 'rounded-inner bg-primary/5 px-3 py-2',
          )}
        >
          {note}
        </p>
      )}
      {event.attachments.length > 0 && <AttachmentList files={event.attachments} label="Files" />}
    </li>
  );
}

/** Every event on the case, oldest first, with who could see each one. */
export function CaseTimeline({ incident }: { incident: Incident }) {
  return (
    <ol aria-label="History">
      {incident.events.map((event) => (
        <EventItem key={event.id} event={event} description={incident.description} />
      ))}
    </ol>
  );
}
