import createClient from 'openapi-fetch';
import { env } from '@/lib/env';
import type { paths } from './schema';

export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const baseUrl = `${env.apiUrl}/api/v1`;

const NETWORK_MESSAGE = "We couldn't reach Rento Vroom. Check your connection and try again.";

// Several requests can hit an expired access token at once; they share one refresh call.
let refreshInFlight: Promise<boolean> | null = null;

/** Renews the 15-minute access cookie with the refresh cookie. Resolves false once the session has ended. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function send(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
}

/** Every API call goes through here: it renews an expired access token once and retries (plan §6.1). */
async function apiFetch(request: Request): Promise<Response> {
  const retry = request.clone();
  const response = await send(request);
  const isAuthRoute = new URL(request.url).pathname.startsWith(new URL(`${baseUrl}/auth/`).pathname);
  if (response.status === 401 && !isAuthRoute && (await refreshSession())) return send(retry);
  return response;
}

/**
 * The typed API client (plan §2.3). Its paths, request bodies and responses come from schema.d.ts,
 * generated from the backend's openapi.json, so an API change that breaks the website fails the
 * typecheck. Wrap each call in `unwrap()`.
 */
export const client = createClient<paths>({ baseUrl, credentials: 'include', fetch: apiFetch });

function toApiError(status: number, body: unknown): ApiError {
  const error = (body as { error?: { code?: string; message?: string; fields?: Record<string, string> } })
    ?.error;
  if (error?.code) return new ApiError(status, error.code, error.message ?? 'Request failed', error.fields);
  return new ApiError(status, 'HTTP_ERROR', 'Something went wrong on our side. Please try again.');
}

/** The response's data, or an ApiError with the backend's code, message and field errors. */
export async function unwrap<Data>(
  call: Promise<{ data?: Data; error?: unknown; response: Response }>,
): Promise<Data> {
  const { data, error, response } = await call;
  if (!response.ok) throw toApiError(response.status, error);
  return data as Data;
}
