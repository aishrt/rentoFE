import { env } from '@/lib/env';

/**
 * Small typed fetch wrapper for the backend REST API (`/api/v1`).
 * Plan §2.3 replaces the hand-written types in `src/api/types.ts` with types generated from
 * backend/openapi.json (`npm run api:types`) once the backend publishes its OpenAPI file.
 */

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

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
}

const apiUrl = (path: string) => `${env.apiUrl}/api/v1${path}`;

const NETWORK_MESSAGE = "We couldn't reach Rento Vroom. Check your connection and try again.";

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; fields?: Record<string, string> };
    };
    if (body.error?.code) {
      return new ApiError(
        response.status,
        body.error.code,
        body.error.message ?? 'Request failed',
        body.error.fields,
      );
    }
  } catch {
    // Not JSON: fall through to a generic error.
  }
  return new ApiError(response.status, 'HTTP_ERROR', 'Something went wrong on our side. Please try again.');
}

// Several requests can hit an expired access token at once; they share one refresh call.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(apiUrl('/auth/refresh'), { method: 'POST', credentials: 'include' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  allowRefresh = true,
): Promise<T> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  // The access token lasts 15 minutes; renew it once with the refresh cookie and retry (plan §6.1).
  if (response.status === 401 && allowRefresh && !path.startsWith('/auth/')) {
    if (await refreshSession()) return apiRequest<T>(path, options, false);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
};
