import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminUser, mockApi } from '@/test/utils';
import { ApiError, client, unwrap } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('renews an expired access token once and retries the request', async () => {
    let meCalls = 0;
    const fetchMock = mockApi({
      'GET /me': () => {
        meCalls += 1;
        return meCalls === 1
          ? { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Sign in' } } }
          : { status: 200, body: { user: adminUser } };
      },
      'POST /auth/refresh': { status: 200, body: { user: adminUser } },
    });

    await expect(unwrap(client.GET('/me'))).resolves.toEqual({ user: adminUser });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares one refresh between requests that expire together', async () => {
    const calls: string[] = [];
    let refreshed = false;
    mockApi({
      'GET /me': () => {
        calls.push('me');
        return refreshed ? { status: 200, body: { user: adminUser } } : { status: 401 };
      },
      'GET /admin/overview': () => {
        calls.push('overview');
        return refreshed ? { status: 200, body: {} } : { status: 401 };
      },
      'POST /auth/refresh': () => {
        calls.push('refresh');
        refreshed = true;
        return { status: 200, body: {} };
      },
    });

    await Promise.all([unwrap(client.GET('/me')), unwrap(client.GET('/admin/overview'))]);
    expect(calls.filter((call) => call === 'refresh')).toHaveLength(1);
  });

  it('turns API errors into ApiError with the code, message and field errors', async () => {
    mockApi({
      'POST /auth/login': {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Fix these', fields: { email: 'Bad email' } } },
      },
    });

    const error = await unwrap(client.POST('/auth/login', { body: { email: 'x', password: 'y' } })).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: { email: 'Bad email' } });
  });

  it('reports a response that is not the API (a proxy error page) as a generic error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })),
    );
    await expect(unwrap(client.GET('/me'))).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('reports a failed connection as a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(unwrap(client.GET('/me'))).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
