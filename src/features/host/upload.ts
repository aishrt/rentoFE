import { ApiError, client, refreshSession, unwrap } from '@/api/client';
import type { UploadRequest, UploadTarget } from '@/api/types';

/*
 * Photos and documents go straight from the browser to storage (plan §3, "Public and private files"): the
 * API signs a target for one file, the browser sends it there with progress, then the car's photos or
 * documents endpoint attaches what came back. Development stores files on the API itself (the `local`
 * driver, which needs the session cookie); production sends them to Cloudinary (no cookies).
 */

export type UploadPurpose = UploadRequest['purpose'];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
export const DOCUMENT_CONTENT_TYPES = [...PHOTO_CONTENT_TYPES, 'application/pdf'] as const;

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

/** The file's type, from its name when the browser doesn't know it (Windows reports HEIC photos as ""). */
export function contentTypeOf(file: Blob & { name?: string }): string {
  if (file.type) return file.type;
  const extension = file.name?.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[extension] ?? 'application/octet-stream';
}

/** Why a file can't be uploaded for this purpose, or null when it can. Checked before anything is sent. */
export function uploadProblem(file: Blob & { name?: string }, purpose: UploadPurpose): string | null {
  const allowed: readonly string[] =
    purpose === 'VEHICLE_PHOTO' ? PHOTO_CONTENT_TYPES : DOCUMENT_CONTENT_TYPES;
  if (!allowed.includes(contentTypeOf(file))) {
    return purpose === 'VEHICLE_PHOTO'
      ? 'Photos can be JPEG, PNG, WebP or HEIC.'
      : 'Documents can be a PDF or a photo (JPEG, PNG, WebP or HEIC).';
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'Files can be up to 15 MB.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

const NETWORK_MESSAGE = "The upload didn't finish. Check your connection and try again.";

interface SendOptions {
  /** 0 to 1 as the file goes up. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  /** The file name Cloudinary records. */
  filename?: string;
}

function errorFrom(status: number, body: string): ApiError {
  try {
    const error = (JSON.parse(body) as { error?: { code?: string; message?: string } }).error;
    // Cloudinary answers { error: { message } } without a code.
    if (error?.message) return new ApiError(status, error.code ?? 'UPLOAD_FAILED', error.message);
  } catch {
    // Not JSON: fall through to the general message.
  }
  return new ApiError(status, 'UPLOAD_FAILED', "We couldn't upload that file. Please try again.");
}

/** One XMLHttpRequest, because fetch can't report upload progress. */
function sendOnce(target: UploadTarget, file: Blob, options: SendOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const local = target.driver === 'local';
    xhr.open(local ? 'PUT' : 'POST', target.url);
    // The local driver checks the session cookie; Cloudinary is another site and must not get it.
    xhr.withCredentials = local;

    let body: Blob | FormData = file;
    if (local) {
      for (const [name, value] of Object.entries(target.headers ?? {})) xhr.setRequestHeader(name, value);
    } else {
      const form = new FormData();
      for (const [name, value] of Object.entries(target.fields ?? {})) form.append(name, value);
      form.append('file', file, options.filename ?? 'upload');
      body = form;
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(errorFrom(xhr.status, xhr.responseText));
        return;
      }
      try {
        const result = JSON.parse(xhr.responseText) as { key?: string; public_id?: string };
        const reference = local ? result.key : result.public_id;
        if (!reference) throw new Error('No reference');
        options.onProgress?.(1);
        resolve(reference);
      } catch {
        reject(new ApiError(xhr.status, 'UPLOAD_FAILED', "We couldn't upload that file. Please try again."));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE));
    xhr.onabort = () => reject(new DOMException('The upload was cancelled.', 'AbortError'));
    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

/**
 * Sends the file to its signed target and resolves with what to attach: the local driver's `key`, or
 * Cloudinary's `public_id`. A local upload whose 15-minute access cookie ran out renews it once and retries,
 * as the API client does for every other call.
 */
export async function sendFile(target: UploadTarget, file: Blob, options: SendOptions = {}): Promise<string> {
  try {
    return await sendOnce(target, file, options);
  } catch (error) {
    if (
      target.driver === 'local' &&
      error instanceof ApiError &&
      error.status === 401 &&
      (await refreshSession())
    ) {
      return sendOnce(target, file, options);
    }
    throw error;
  }
}

export async function requestUploadTarget(input: UploadRequest): Promise<UploadTarget> {
  return unwrap(client.POST('/uploads/signature', { body: input }));
}

interface UploadInput extends SendOptions {
  purpose: UploadPurpose;
  vehicleId: string;
  file: Blob;
  /** Defaults to the file's own type. */
  contentType?: string;
}

/** Asks for a target, then sends the file there. Resolves with the reference to attach to the car. */
export async function uploadFile({
  purpose,
  vehicleId,
  file,
  contentType,
  ...options
}: UploadInput): Promise<string> {
  const type = contentType ?? contentTypeOf(file);
  const target = await requestUploadTarget({ purpose, vehicleId, contentType: type, size: file.size });
  if (file.size > target.maxBytes) throw new ApiError(400, 'FILE_TOO_LARGE', 'Files can be up to 15 MB.');
  return sendFile(target, file, options);
}
