import { useEffect, useRef, useState } from 'react';
import type { AttachmentInput } from '@/api/types';
import { contentTypeOf, uploadFile, uploadProblem } from '@/features/host/upload';
import type { useEvidence } from '@/features/incidents/use-evidence';

/** As many as the API takes on one message. */
const MAX_FILES = 10;

interface TicketFile {
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
 * Photos and PDFs for a support request, uploaded as soon as they're chosen into the signed-in person's own
 * private folder (purpose SUPPORT_FILE), so only they can attach them. It has the same shape as an
 * incident's evidence, so the incident's EvidencePicker lists and adds them. Uploading needs an account.
 */
export function useTicketFiles(): ReturnType<typeof useEvidence> {
  const [files, setFiles] = useState<TicketFile[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const current = useRef<TicketFile[]>([]);
  useEffect(() => {
    current.current = files;
  }, [files]);
  useEffect(
    () => () => current.current.forEach((file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)),
    [],
  );

  const update = (id: number, change: Partial<TicketFile>) =>
    setFiles((list) => list.map((file) => (file.id === id ? { ...file, ...change } : file)));

  const add = (chosen: FileList | null) => {
    setProblem(null);
    const picked = Array.from(chosen ?? []);
    const room = MAX_FILES - files.length;
    if (picked.length > room) setProblem(`Up to ${MAX_FILES} files.`);
    for (const file of picked.slice(0, Math.max(0, room))) {
      const fault = uploadProblem(file, 'SUPPORT_FILE');
      if (fault) {
        setProblem(fault);
        continue;
      }
      const type = contentTypeOf(file);
      const entry: TicketFile = {
        id: nextId++,
        name: file.name,
        contentType: type,
        ...(type.startsWith('image/') && { previewUrl: URL.createObjectURL(file) }),
        progress: 0,
      };
      setFiles((list) => [...list, entry]);
      uploadFile({
        purpose: 'SUPPORT_FILE',
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
    setProblem(null);
  };

  const attachments: AttachmentInput[] = files
    .filter((file) => file.key)
    .map((file) => ({ key: file.key!, name: file.name, contentType: file.contentType }));
  const uploading = files.some((file) => !file.key && !file.error);
  return { files, problem, add, remove, reset, attachments, uploading };
}
