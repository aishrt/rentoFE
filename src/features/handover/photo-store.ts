import type { InspectionAngle, InspectionStage } from '@/api/types';

/*
 * Inspection photos wait in the browser until they've uploaded (plan §12.6, Inspection): they're kept in
 * IndexedDB, so a weak signal, a closed tab or a reload loses nothing, and they upload when the connection
 * returns. Where IndexedDB isn't available (some private windows, tests) they're kept in memory instead.
 * They can say where the device was, so they don't stay longer than needed (plan §14): a stage's photos go
 * once its report is recorded, and all of them when someone signs out of the device.
 */

/** A check-in, a check-out, or new damage flagged after the check-out. */
export type PhotoStage = InspectionStage | 'FLAGGED_DAMAGE';

export interface StoredPhoto {
  id: string;
  bookingRef: string;
  stage: PhotoStage;
  angle: InspectionAngle;
  blob: Blob;
  name: string;
  contentType: string;
  /** The device clock when it was taken, shown on the photo. */
  takenAt: string;
  /** When a photo chosen from the device says it was taken (its EXIF date); camera shots have none. */
  exifTakenAt?: string;
  /** Where the device was, when the person allowed it. */
  lat?: number;
  lng?: number;
  /** The upload's key once it's stored; until then the photo waits here. */
  key?: string;
}

const DB_NAME = 'rento-vroom-handover';
const STORE = 'photos';

let opening: Promise<IDBDatabase | null> | undefined;
const memory = new Map<string, StoredPhoto>();

function openDb(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('byInspection', ['bookingRef', 'stage']);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const request = act(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/** Every photo taken for one booking's check-in, check-out or flagged damage, oldest first. */
export async function listPhotos(bookingRef: string, stage: PhotoStage): Promise<StoredPhoto[]> {
  const db = await openDb();
  const photos = db
    ? await run<StoredPhoto[]>(db, 'readonly', (store) =>
        store.index('byInspection').getAll([bookingRef, stage]),
      ).catch(() => [...memory.values()])
    : [...memory.values()];
  return photos
    .filter((photo) => photo.bookingRef === bookingRef && photo.stage === stage)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  memory.set(photo.id, photo);
  const db = await openDb();
  if (db) await run(db, 'readwrite', (store) => store.put(photo)).catch(() => undefined);
}

export async function removePhoto(id: string): Promise<void> {
  memory.delete(id);
  const db = await openDb();
  if (db) await run(db, 'readwrite', (store) => store.delete(id)).catch(() => undefined);
}

/** Forgets an inspection's photos once it's recorded. */
export async function clearPhotos(bookingRef: string, stage: PhotoStage): Promise<void> {
  for (const photo of await listPhotos(bookingRef, stage)) await removePhoto(photo.id);
}

/** Forgets every photo on this device, for anyone: on sign-out, so the next person can't see them. */
export async function clearPhotoStore(): Promise<void> {
  memory.clear();
  const db = await openDb();
  if (db) await run(db, 'readwrite', (store) => store.clear()).catch(() => undefined);
}
