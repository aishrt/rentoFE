import { ImagePlus, SendHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { controlClasses } from '@/components/ui/control-styles';
import { contentTypeOf, uploadFile, uploadProblem } from '@/features/host/upload';
import { cn } from '@/lib/cn';
import { useSendMessage } from './messages-api';

/** Up to 6 photos in one message, as the API allows. */
export const MAX_PHOTOS = 6;
const MAX_LENGTH = 2000;

interface PendingPhoto {
  id: number;
  name: string;
  contentType: string;
  previewUrl: string;
  progress: number;
  key?: string;
  error?: string;
}

let nextPhotoId = 1;

/** Enter sends on a computer; on a phone's keyboard it starts a new line, and the button sends. */
const enterSends = () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

/**
 * Writing a message (spec §13): text up to 2,000 characters and up to 6 photos, which upload as soon as
 * they're chosen. Sends with the button, or Enter on a computer (Shift+Enter for a new line).
 */
export function Composer({ bookingRef, otherName }: { bookingRef: string; otherName: string }) {
  const send = useSendMessage(bookingRef);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);

  // Free the previews' memory when the composer goes.
  const previews = useRef<PendingPhoto[]>([]);
  useEffect(() => {
    previews.current = photos;
  }, [photos]);
  useEffect(() => () => previews.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  const update = (id: number, change: Partial<PendingPhoto>) =>
    setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, ...change } : photo)));

  const addFiles = (files: FileList | null) => {
    setProblem(null);
    const chosen = Array.from(files ?? []);
    const room = MAX_PHOTOS - photos.length;
    if (chosen.length > room) setProblem(`You can send up to ${MAX_PHOTOS} photos at a time.`);
    for (const file of chosen.slice(0, Math.max(0, room))) {
      const fault = uploadProblem(file, 'MESSAGE_PHOTO');
      if (fault) {
        setProblem(fault);
        continue;
      }
      const photo: PendingPhoto = {
        id: nextPhotoId++,
        name: file.name,
        contentType: contentTypeOf(file),
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      };
      setPhotos((current) => [...current, photo]);
      uploadFile({
        purpose: 'MESSAGE_PHOTO',
        bookingId: bookingRef,
        file,
        filename: file.name,
        onProgress: (fraction) => update(photo.id, { progress: fraction }),
      })
        .then((key) => update(photo.id, { key, progress: 1 }))
        .catch((error: unknown) =>
          update(photo.id, { error: error instanceof Error ? error.message : 'The upload didn’t finish.' }),
        );
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const remove = (id: number) =>
    setPhotos((current) => {
      const gone = current.find((photo) => photo.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });

  const uploading = photos.some((photo) => !photo.key && !photo.error);
  const ready = photos.filter((photo) => photo.key);
  const body = text.trim();
  const canSend = !send.isPending && !uploading && (body.length > 0 || ready.length > 0);

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      {
        body,
        attachments: ready.map((photo) => ({
          key: photo.key!,
          name: photo.name,
          contentType: photo.contentType,
        })),
      },
      {
        onSuccess: () => {
          setText('');
          photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
          setPhotos([]);
          textInput.current?.focus();
        },
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && enterSends()) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-3"
      aria-label={`Message ${otherName}`}
    >
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Photos to send">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              <img
                src={photo.previewUrl}
                alt={photo.name}
                className={cn('size-20 rounded-inner bg-canvas object-cover', photo.error && 'opacity-40')}
              />
              {!photo.key && !photo.error && (
                <span
                  className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/70"
                  role="progressbar"
                  aria-label={`Uploading ${photo.name}`}
                  aria-valuenow={Math.round(photo.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${Math.round(photo.progress * 100)}%` }}
                  />
                </span>
              )}
              {photo.error && <span className="sr-only">{photo.error}</span>}
              <button
                type="button"
                onClick={() => remove(photo.id)}
                aria-label={`Remove ${photo.name}`}
                className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-ink text-white shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(problem || photos.some((photo) => photo.error)) && (
        <Alert variant="danger" role="alert">
          {problem ?? photos.find((photo) => photo.error)?.error}
        </Alert>
      )}
      {send.isError && (
        <Alert variant="danger" role="alert">
          {send.error.message}
        </Alert>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => addFiles(event.target.files)}
        />
        <IconButton
          label="Add photos"
          tooltip="top"
          disabled={photos.length >= MAX_PHOTOS}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
        </IconButton>
        <label className="sr-only" htmlFor={`composer-${bookingRef}`}>
          Message {otherName}
        </label>
        <textarea
          ref={textInput}
          id={`composer-${bookingRef}`}
          rows={1}
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${otherName}`}
          className={cn(
            controlClasses,
            'block h-auto max-h-48 min-h-12 flex-1 resize-none py-3 leading-relaxed field-sizing-content',
          )}
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={!canSend} loading={send.isPending}>
          <SendHorizontal aria-hidden="true" />
        </Button>
      </div>
      {text.length > MAX_LENGTH - 200 && (
        <p className="text-right text-xs text-muted">{MAX_LENGTH - text.length} characters left</p>
      )}
    </form>
  );
}
