import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { sessionQueryKey } from '@/features/auth/use-session';
import { uploadFile, uploadProblem } from '@/features/host/upload';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { removeProfilePhotoRequest, setProfilePhotoRequest } from './account-api';

/** Upload and API messages are already written for people. */
const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/**
 * The profile photo (spec §8; plan §6.2: the other party on a booking sees your first name and photo). On a
 * phone, Add photo offers the camera or the photo library. The photo uploads as soon as it's chosen and
 * replaces the one before; the API stores a small copy without the photo's location.
 */
export function ProfilePhotoPicker({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Free the preview's memory once the upload is done, or the section goes.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  // The header, booking pages and messages read the session, so they show the change straight away.
  const saved = (updated: SessionUser, message: string) => {
    queryClient.setQueryData(sessionQueryKey, updated);
    setNotice(message);
  };
  const upload = useMutation({
    mutationFn: async (file: File) =>
      setProfilePhotoRequest(
        await uploadFile({ purpose: 'PROFILE_PHOTO', file, filename: file.name, onProgress: setProgress }),
      ),
    onSuccess: (updated) => saved(updated, 'Your photo is saved.'),
    onSettled: () => setPreview(null),
  });
  const remove = useMutation({
    mutationFn: removeProfilePhotoRequest,
    onSuccess: (updated) => saved(updated, 'Your photo is removed.'),
  });

  const choose = (file: File | undefined) => {
    // Cleared, so choosing the same photo again still counts.
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setNotice(null);
    remove.reset();
    const fault = uploadProblem(file, 'PROFILE_PHOTO');
    setProblem(fault);
    if (fault) return;
    setProgress(0);
    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  };

  const busy = upload.isPending || remove.isPending;
  const error =
    problem ?? (upload.isError ? errorText(upload.error) : remove.isError ? errorText(remove.error) : null);
  const percent = Math.round(progress * 100);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        <div className="relative shrink-0">
          {preview ? (
            <img
              src={preview}
              alt=""
              width={80}
              height={80}
              className="size-20 rounded-full bg-canvas object-cover opacity-70"
            />
          ) : (
            <PersonAvatar
              name={`${user.firstName} ${user.lastName}`}
              photoUrl={user.avatarUrl}
              className="size-20 text-xl"
            />
          )}
          {upload.isPending && (
            <span
              className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-white/70"
              role="progressbar"
              aria-label="Uploading your photo"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
            </span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 basis-56 gap-3">
          <p className="text-sm text-muted">
            Hosts and guests you book with see your photo next to your first name. A clear photo of your face
            helps them know who to look for at pickup.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={upload.isPending}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Camera aria-hidden="true" />
              {user.avatarUrl ? 'Change photo' : 'Add photo'}
            </Button>
            {user.avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                loading={remove.isPending}
                disabled={busy}
                onClick={() => {
                  setNotice(null);
                  setProblem(null);
                  upload.reset();
                  remove.mutate();
                }}
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </div>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      {notice && !busy && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
    </div>
  );
}
