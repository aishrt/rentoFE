import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import type { HostVehicle } from '@/api/types';
import { storeVehicle } from './host-api';

/** One upload's progress: getting the photo ready, sending it (0–1), or what went wrong. */
export type UploadState =
  { stage: 'preparing' } | { stage: 'uploading'; progress: number } | { stage: 'failed'; error: string };

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'UPLOADS_UNAVAILABLE' || error.code === 'NETWORK_ERROR') return error.message;
    if (error.fields) return Object.values(error.fields)[0] ?? error.message;
    if (error.status > 0 && error.status < 500 && error.code !== 'HTTP_ERROR') return error.message;
  }
  return "We couldn't upload that file. Please try again.";
}

/**
 * Tracks uploads by slot (a photo angle or a document type), so each tile shows its own progress bar
 * and error while others carry on. A finished upload puts the car the API answered with into the cache.
 */
export function useUploads<Slot extends string>() {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<Partial<Record<Slot, UploadState>>>({});

  const set = (slot: Slot, state: UploadState | undefined) =>
    setSlots((current) => {
      const next = { ...current };
      if (state) next[slot] = state;
      else delete next[slot];
      return next;
    });

  /** Runs one upload for the slot. `prepare` (e.g. resizing a photo) runs first, shown as "Preparing". */
  const run = async <Prepared>(
    slot: Slot,
    prepare: () => Promise<Prepared>,
    upload: (prepared: Prepared, onProgress: (fraction: number) => void) => Promise<HostVehicle>,
  ): Promise<HostVehicle | null> => {
    set(slot, { stage: 'preparing' });
    try {
      const prepared = await prepare();
      set(slot, { stage: 'uploading', progress: 0 });
      const saved = await upload(prepared, (progress) => set(slot, { stage: 'uploading', progress }));
      storeVehicle(queryClient, saved);
      set(slot, undefined);
      return saved;
    } catch (error) {
      set(slot, { stage: 'failed', error: uploadErrorMessage(error) });
      return null;
    }
  };

  const fail = (slot: Slot, error: string) => set(slot, { stage: 'failed', error });
  const clear = (slot: Slot) => set(slot, undefined);

  return { slots, run, fail, clear };
}
