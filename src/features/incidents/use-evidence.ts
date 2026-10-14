import { useEffect, useRef, useState } from 'react';
import type { AttachmentInput } from '@/api/types';
import { contentTypeOf, uploadFile, uploadProblem } from '@/features/host/upload';

const MAX_FILES = 10;

interface Evidence {
  id: number;
  name: string;
  contentType: string;
  previewUrl?: string;
  progress: number;
  key?: string;
  error?: string;
}

let nextId = 1;

/**
 * Photos and documents for an incident (spec §15), uploaded as soon as they're chosen. Resolves the files
 * that are ready to attach; `uploading` is true while any is still on its way.
 */
export function useEvidence(bookingRef: string) {
  const [files, setFiles] = useState<Evidence[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const current = useRef<Evidence[]>([]);
  useEffect(() => {
    current.current = files;
  }, [files]);
  useEffect(
    () => () => current.current.forEach((file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)),
    [],
  );

  const update = (id: number, change: Partial<Evidence>) =>
    setFiles((list) => list.map((file) => (file.id === id ? { ...file, ...change } : file)));

  const add = (chosen: FileList | null) => {
    setProblem(null);
    const picked = Array.from(chosen ?? []);
    const room = MAX_FILES - files.length;
    if (picked.length > room) setProblem(`Up to ${MAX_FILES} files.`);
    for (const file of picked.slice(0, Math.max(0, room))) {
      const fault = uploadProblem(file, 'INCIDENT_FILE');
      if (fault) {
        setProblem(fault);
        continue;
      }
      const type = contentTypeOf(file);
      const entry: Evidence = {
        id: nextId++,
        name: file.name,
        contentType: type,
        ...(type.startsWith('image/') && { previewUrl: URL.createObjectURL(file) }),
        progress: 0,
      };
      setFiles((list) => [...list, entry]);
      uploadFile({
        purpose: 'INCIDENT_FILE',
        bookingId: bookingRef,
        file,
        filename: file.name,
        onProgress: (fraction) => update(entry.id, { progress: fraction }),
      })
        .then((key) => update(entry.id, { key, progress: 1 }))
        .catch((error: unknown) =>
          update(entry.id, { error: error instanceof Error ? error.message : 'The upload didn’t finish.' }),
        );
    }
  };

  const remove = (id: number) =>
    setFiles((list) => {
      const gone = list.find((file) => file.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((file) => file.id !== id);
    });

  const reset = () => {
    files.forEach((file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl));
    setFiles([]);
  };

  const attachments: AttachmentInput[] = files
    .filter((file) => file.key)
    .map((file) => ({ key: file.key!, name: file.name, contentType: file.contentType }));
  const uploading = files.some((file) => !file.key && !file.error);
  return { files, problem, add, remove, reset, attachments, uploading };
}
