/*
 * How browsers word a failed dynamic import (a page's code chunk that didn't download): Chromium, Firefox and
 * Safari in that order, then Vite's CSS preload.
 */
const CHUNK_LOAD_ERROR =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i;

/** Whether a page's code failed to download, usually because the connection dropped. Reloading fixes it. */
export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_LOAD_ERROR.test(error.message);
}

/** The error's message, for the developer details shown in development builds. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
