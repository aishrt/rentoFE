import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/utils';
import { ApiError, api } from './client';

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
          : { status: 200, body: { user: { firstName: 'Kiri' } } };
      },
      'POST /auth/refresh': { status: 200, body: { user: { firstName: 'Kiri' } } },
    });

    await expect(api.get('/me')).resolves.toEqual({ user: { firstName: 'Kiri' } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares one refresh between requests that expire together', async () => {
    const calls: string[] = [];
    let refreshed = false;
    mockApi({
      'GET /me': () => {
        calls.push('me');
        return refreshed ? { status: 200, body: {} } : { status: 401 };
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

    await Promise.all([api.get('/me'), api.get('/admin/overview')]);
    expect(calls.filter((call) => call === 'refresh')).toHaveLength(1);
  });

  it('turns API errors into ApiError with the code, message and field errors', async () => {
    mockApi({
      'POST /auth/login': {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Fix these', fields: { email: 'Bad email' } } },
      },
    });

    const error = await api.post('/auth/login', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: { email: 'Bad email' } });
  });
});
