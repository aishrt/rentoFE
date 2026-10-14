import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminJob } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminJobsPage } from './jobs-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/jobs') =>
  renderWithRouter(
    [
      {
        path: '/admin/jobs',
        element: (
          <>
            <AdminJobsPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const longError = `SendGrid answered 401 Unauthorized: The provided authorization grant is invalid, expired, or revoked. Check the API key in the email settings, then run the job again.`;

const email: AdminJob = {
  id: 'j1',
  type: 'email.send',
  status: 'FAILED',
  attempts: 5,
  maxAttempts: 5,
  lastError: longError,
  refId: 'RV-7K2Q9M',
  runAt: '2026-10-06T21:30:00.000Z',
  finishedAt: '2026-10-06T21:31:00.000Z',
};

const paymentCheck: AdminJob = {
  id: 'j2',
  type: 'risk.paymentCheck',
  status: 'FAILED',
  attempts: 3,
  maxAttempts: 3,
  lastError: 'Stripe timed out.',
  runAt: '2026-10-06T20:00:00.000Z',
  finishedAt: '2026-10-06T20:05:00.000Z',
};

/** The query string of each jobs request, in order. */
const queries = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/admin/jobs'))
    .map((url) => url.searchParams);

const row = async (name: RegExp) => within(await screen.findByRole('row', { name }));

describe('AdminJobsPage', () => {
  it('lists failed jobs with their attempts and a shortened error that opens in full', async () => {
    const fetchMock = mockApi({
      'GET /admin/jobs': { status: 200, body: { jobs: [email, paymentCheck], total: 2, page: 1 } },
    });
    render();

    const job = await row(/email\.send/);
    expect(job.getByText('5 of 5')).toBeInTheDocument();
    expect(job.getByText('RV-7K2Q9M')).toBeInTheDocument();
    expect(job.queryByText(longError)).not.toBeInTheDocument();
    await userEvent.click(job.getByRole('button', { name: 'Show all' }));
    expect(job.getByText(longError)).toBeInTheDocument();
    expect(job.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');

    // A short error shows in full.
    expect((await row(/risk\.paymentCheck/)).getByText('Stripe timed out.')).toBeInTheDocument();
    expect(queries(fetchMock)[0]?.get('status')).toBe('FAILED');
  });

  it('runs a failed job again and takes it off the list', async () => {
    let retried = false;
    mockApi({
      'GET /admin/jobs': { status: 200, body: { jobs: [email, paymentCheck], total: 2, page: 1 } },
      'POST /admin/jobs/j1/retry': () => {
        retried = true;
        return { status: 200, body: { job: { id: 'j1', status: 'QUEUED' } } };
      },
    });
    render();

    await userEvent.click((await row(/email\.send/)).getByRole('button', { name: 'Run again email.send' }));

    expect(await screen.findByText('email.send will run again')).toBeInTheDocument();
    expect(retried).toBe(true);
    expect(screen.queryByRole('row', { name: /email\.send/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /risk\.paymentCheck/ })).toBeInTheDocument();
    expect(screen.getByText('1 job')).toBeInTheDocument();
  });

  it('says when a job couldn’t run again', async () => {
    mockApi({
      'GET /admin/jobs': { status: 200, body: { jobs: [email], total: 1, page: 1 } },
      'POST /admin/jobs/j1/retry': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No failed job with that id.' } },
      },
    });
    render();

    await userEvent.click((await row(/email\.send/)).getByRole('button', { name: 'Run again email.send' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't run email.send again");
    expect(alert).toHaveTextContent('No failed job with that id.');
    expect(screen.getByRole('row', { name: /email\.send/ })).toBeInTheDocument();
  });

  it('shows waiting and running jobs on their own tabs, without Run again', async () => {
    const fetchMock = mockApi({
      'GET /admin/jobs': () => ({
        status: 200,
        body: {
          jobs: [{ ...email, status: 'QUEUED', attempts: 0, lastError: undefined, finishedAt: undefined }],
          total: 1,
          page: 1,
        },
      }),
    });
    const { router } = render();

    await row(/email\.send/);
    await userEvent.click(screen.getByRole('tab', { name: 'Waiting' }));

    await vi.waitFor(() => expect(queries(fetchMock).at(-1)?.get('status')).toBe('QUEUED'));
    expect(router.state.location.search).toBe('?status=queued');
    expect(await screen.findByRole('table', { name: 'Waiting jobs' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run again/ })).not.toBeInTheDocument();
  });

  it('says so when nothing has failed', async () => {
    mockApi({ 'GET /admin/jobs': { status: 200, body: { jobs: [], total: 0, page: 1 } } });
    render('/admin/jobs?status=running');

    expect(await screen.findByText('Nothing running')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Running' })).toHaveAttribute('aria-selected', 'true');
  });

  it('explains that background jobs are for the admin', async () => {
    mockApi({
      'GET /admin/jobs': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    expect(await screen.findByText('Background jobs are for the admin')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
