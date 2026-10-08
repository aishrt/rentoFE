import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminUserDetail, RiskUser } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminRiskPage } from './risk-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/admin/risk',
        element: (
          <>
            <AdminRiskPage />
            <Toaster />
          </>
        ),
      },
    ],
    '/admin/risk',
  );

const aroha: RiskUser = {
  id: 'u10',
  firstName: 'Aroha',
  lastName: 'Ngata',
  email: 'aroha@example.co.nz',
  roles: ['GUEST', 'HOST'],
  status: 'ACTIVE',
  closed: false,
  identityStatus: 'APPROVED',
  hostStatus: 'APPROVED',
  openRiskFlags: 2,
  createdAt: '2026-03-01T00:00:00.000Z',
  flags: [
    {
      id: 'f1',
      code: 'HOST_CANCELLATIONS',
      detail: '3 cancellations in 30 days',
      // 1 October in New Zealand.
      createdAt: '2026-09-30T20:00:00.000Z',
    },
    { id: 'f2', code: 'FAILED_PAYMENTS', createdAt: '2026-10-02T00:00:00.000Z' },
  ],
};

const rangi: RiskUser = {
  ...aroha,
  id: 'u11',
  firstName: 'Rangi',
  lastName: 'Walker',
  email: 'rangi@example.co.nz',
  roles: ['GUEST'],
  hostStatus: null,
  openRiskFlags: 1,
  flags: [{ id: 'f3', code: 'NEW_CHECK', createdAt: '2026-10-03T00:00:00.000Z' }],
};

const card = async (name: string) => within(await screen.findByRole('listitem', { name }));

describe('AdminRiskPage', () => {
  it('lists each flagged person with what was flagged and when', async () => {
    mockApi({ 'GET /admin/risk': { status: 200, body: { users: [aroha, rangi] } } });
    render();

    const first = await card('Aroha Ngata');
    expect(first.getByRole('link', { name: 'Aroha Ngata' })).toHaveAttribute('href', '/admin/users/u10');
    expect(first.getByText('2 flags')).toBeInTheDocument();
    expect(first.getByText('Repeated Host cancellations')).toBeInTheDocument();
    expect(first.getByText('3 cancellations in 30 days')).toBeInTheDocument();
    expect(first.getByText('Raised Thu, 1 Oct 2026')).toBeInTheDocument();
    expect(first.getByText('Many failed payments')).toBeInTheDocument();

    // A check this page doesn't have words for yet still reads as words.
    const second = await card('Rangi Walker');
    expect(second.getByText('new check')).toBeInTheDocument();
    expect(screen.getByText('2 people')).toBeInTheDocument();
  });

  it('clears a flag and refreshes the queue', async () => {
    let queue = [aroha, rangi];
    const cleared = vi.fn();
    const fetchMock = mockApi({
      'GET /admin/risk': () => ({ status: 200, body: { users: queue } }),
      'POST /admin/users/u11/risk-flags/f3/clear': () => {
        cleared();
        queue = [aroha];
        const user: Partial<AdminUserDetail> = { ...rangi, openRiskFlags: 0, riskFlags: [] };
        return { status: 200, body: { user } };
      },
    });
    render();

    await userEvent.click(
      (await card('Rangi Walker')).getByRole('button', { name: 'Clear flag: new check' }),
    );

    expect(await screen.findByText('Flag cleared')).toBeInTheDocument();
    expect(cleared).toHaveBeenCalledOnce();
    expect(screen.queryByRole('listitem', { name: 'Rangi Walker' })).not.toBeInTheDocument();
    expect(await screen.findByText('1 person')).toBeInTheDocument();
    const queueRequests = fetchMock.mock.calls.filter(([input]) =>
      String((input as Request).url).endsWith('/admin/risk'),
    );
    expect(queueRequests.length).toBeGreaterThanOrEqual(2);
  });

  it('says when there’s nothing to review', async () => {
    mockApi({ 'GET /admin/risk': { status: 200, body: { users: [] } } });
    render();

    expect(await screen.findByText('Nothing to review')).toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/risk': {
        status: 500,
        body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the risk queue');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
