import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import type { InspectionAngle, InspectionStage } from '@/api/types';
import { contentTypeOf, uploadFile, uploadProblem } from '@/features/host/upload';
import { clearPhotos, listPhotos, removePhoto, savePhoto, type StoredPhoto } from './photo-store';

/** Where a photo is: on the server, on its way, waiting for a connection, or refused. */
export type PhotoStatus = 'uploaded' | 'uploading' | 'waiting' | 'failed';

export interface InspectionPhoto extends StoredPhoto {
  status: PhotoStatus;
  progress: number;
  previewUrl: string;
  error?: string;
}

const RETRY_MS = 20_000;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** A network problem waits for the connection; anything else is the file's fault and needs a retake. */
const isNetworkProblem = (error: unknown) =>
  !(error instanceof ApiError) ||
  error.status === 0 ||
  error.status >= 500 ||
  error.code === 'UPLOAD_EXPIRED';

/**
 * The photos of one check-in or check-out (plan §12.6, Inspection): kept in the browser as they're taken
 * and uploaded straight away, or as soon as the connection returns, so an inspection on a weak signal is
 * never lost.
 */
export function useInspectionPhotos(bookingRef: string, stage: InspectionStage) {
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const uploading = useRef(new Set<string>());
  const current = useRef<InspectionPhoto[]>([]);

  useEffect(() => {
    current.current = photos;
  }, [photos]);

  const patch = useCallback((id: string, change: Partial<InspectionPhoto>) => {
    setPhotos((list) => list.map((photo) => (photo.id === id ? { ...photo, ...change } : photo)));
  }, []);

  const upload = useCallback(
    async (photo: InspectionPhoto) => {
      if (photo.key || uploading.current.has(photo.id)) return;
      uploading.current.add(photo.id);
      patch(photo.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        const key = await uploadFile({
          purpose: 'INSPECTION_PHOTO',
          bookingId: bookingRef,
          file: photo.blob,
          filename: photo.name,
          contentType: photo.contentType,
          onProgress: (fraction) => patch(photo.id, { progress: fraction }),
        });
        await savePhoto({ ...stored(photo), key });
        patch(photo.id, { key, status: 'uploaded', progress: 1 });
      } catch (error) {
        patch(
          photo.id,
          isNetworkProblem(error)
            ? { status: 'waiting' }
            : { status: 'failed', error: error instanceof Error ? error.message : 'The upload failed.' },
        );
      } finally {
        uploading.current.delete(photo.id);
      }
    },
    [bookingRef, patch],
  );

  // What's already waiting in the browser, from before a reload or a lost connection.
  useEffect(() => {
    let cancelled = false;
    void listPhotos(bookingRef, stage).then((saved) => {
      if (cancelled) return;
      const restored = saved.map((photo): InspectionPhoto => ({
        ...photo,
        status: photo.key ? 'uploaded' : 'waiting',
        progress: photo.key ? 1 : 0,
        previewUrl: URL.createObjectURL(photo.blob),
      }));
      setPhotos(restored);
      setLoaded(true);
      restored.filter((photo) => !photo.key).forEach((photo) => void upload(photo));
    });
    return () => {
      cancelled = true;
    };
  }, [bookingRef, stage, upload]);

  // Free the previews' memory when the page goes.
  useEffect(() => () => current.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  // Try the waiting ones again when the connection returns, and every 20 seconds meanwhile.
  useEffect(() => {
    const retry = () =>
      current.current.filter((photo) => photo.status === 'waiting').forEach((photo) => void upload(photo));
    const goOnline = () => {
      setOnline(true);
      retry();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = setInterval(retry, RETRY_MS);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(timer);
    };
  }, [upload]);

  /** Keeps a photo just taken and starts its upload. Resolves with why it can't be used, or null. */
  const add = useCallback(
    async (angle: InspectionAngle, file: File, { replace = false } = {}): Promise<string | null> => {
      const problem = uploadProblem(file, 'INSPECTION_PHOTO');
      if (problem) return problem;
      if (replace) {
        for (const old of current.current.filter((photo) => photo.angle === angle)) {
          URL.revokeObjectURL(old.previewUrl);
          await removePhoto(old.id);
        }
        setPhotos((list) => list.filter((photo) => photo.angle !== angle));
      }
      const photo: InspectionPhoto = {
        id: newId(),
        bookingRef,
        stage,
        angle,
        blob: file,
        name: file.name || `${angle.toLowerCase()}.jpg`,
        contentType: contentTypeOf(file),
        takenAt: new Date().toISOString(),
        status: 'waiting',
        progress: 0,
        previewUrl: URL.createObjectURL(file),
      };
      await savePhoto(stored(photo));
      setPhotos((list) => [...list, photo]);
      void upload(photo);
      return null;
    },
    [bookingRef, stage, upload],
  );

  const remove = useCallback(async (id: string) => {
    const gone = current.current.find((photo) => photo.id === id);
    if (gone) URL.revokeObjectURL(gone.previewUrl);
    await removePhoto(id);
    setPhotos((list) => list.filter((photo) => photo.id !== id));
  }, []);

  const clear = useCallback(() => clearPhotos(bookingRef, stage), [bookingRef, stage]);

  return { photos, loaded, online, add, remove, clear, retry: upload };
}

/** What's kept in the browser for a photo: everything but its on-screen state. */
function stored(photo: InspectionPhoto): StoredPhoto {
  return {
    id: photo.id,
    bookingRef: photo.bookingRef,
    stage: photo.stage,
    angle: photo.angle,
    blob: photo.blob,
    name: photo.name,
    contentType: photo.contentType,
    takenAt: photo.takenAt,
    ...(photo.key && { key: photo.key }),
  };
}
