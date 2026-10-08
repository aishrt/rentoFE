import { FileText, Paperclip, X } from 'lucide-react';
import { useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { useEvidence } from './use-evidence';

/** The picker's list and button, for a form that holds `useEvidence`. */
export function EvidencePicker({ evidence }: { evidence: ReturnType<typeof useEvidence> }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-3">
      {evidence.files.length > 0 && (
        <ul className="flex flex-wrap gap-3" aria-label="Files to send">
          {evidence.files.map((file) => (
            <li key={file.id} className="relative w-28">
              {file.previewUrl ? (
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="aspect-4/3 w-full rounded-inner bg-canvas object-cover"
                />
              ) : (
                <div className="flex aspect-4/3 w-full items-center justify-center rounded-inner border border-line bg-canvas">
                  <FileText aria-hidden="true" className="size-7 text-muted" />
                </div>
              )}
              <p className="mt-1 truncate text-xs text-muted">
                {file.error
                  ? 'Didn’t upload'
                  : file.key
                    ? file.name
                    : `Uploading ${Math.round(file.progress * 100)}%`}
              </p>
              <button
                type="button"
                onClick={() => evidence.remove(file.id)}
                aria-label={`Remove ${file.name}`}
                className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-ink text-white shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(evidence.problem || evidence.files.some((file) => file.error)) && (
        <Alert variant="danger" role="alert">
          {evidence.problem ?? evidence.files.find((file) => file.error)?.error}
        </Alert>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,.heic,.heif,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          evidence.add(event.target.files);
          event.target.value = '';
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        onClick={() => input.current?.click()}
      >
        <Paperclip aria-hidden="true" />
        Add photos or documents
      </Button>
    </div>
  );
}
