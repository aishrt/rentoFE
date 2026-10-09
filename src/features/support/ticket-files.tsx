import { FileText } from 'lucide-react';
import type { Attachment } from '@/api/types';
import { cn } from '@/lib/cn';

const isImage = (file: Attachment) => !file.contentType || file.contentType.startsWith('image/');

/**
 * The files on a support message: photos as thumbnails, PDFs by name. They're private, so each link is
 * signed and works for 10 minutes; the ticket loads again before then. `onPrimary` is for a message on
 * the brand colour.
 */
export function TicketFiles({ files, onPrimary = false }: { files: Attachment[]; onPrimary?: boolean }) {
  if (files.length === 0) return null;
  return (
    <ul aria-label="Files" className="flex flex-wrap gap-2">
      {files.map((file, index) => {
        const name = file.name ?? `File ${index + 1}`;
        return (
          <li key={file.url}>
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'block rounded-inner focus-visible:outline-2 focus-visible:outline-offset-2',
                onPrimary ? 'focus-visible:outline-white' : 'focus-visible:outline-primary',
              )}
            >
              {isImage(file) ? (
                <img
                  src={file.url}
                  alt={name}
                  loading="lazy"
                  className="aspect-4/3 w-28 rounded-inner bg-canvas object-cover"
                />
              ) : (
                <span
                  className={cn(
                    'inline-flex max-w-60 items-center gap-2 rounded-inner border px-3 py-2 text-sm',
                    onPrimary ? 'border-white/30 text-white' : 'border-line bg-surface text-ink',
                  )}
                >
                  <FileText
                    aria-hidden="true"
                    className={cn('size-4 shrink-0', onPrimary ? 'text-accent' : 'text-muted')}
                  />
                  <span className="truncate">{name}</span>
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
