import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEntry } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminAuditPage } from './audit-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/audit') =>
  renderWithRouter([{ path: '/admin/audit', element: <AdminAuditPage /> }], path);

const held: AuditEntry = {
  id: 'e1',
  actor: { id: '64f0c0ffee0000000000a001', name: 'Aroha Admin' },
  action: 'payout.held',
  entity: 'payout',
  entityId: 'po1',
  before: { status: 'SCHEDULED' },
  after: { status: 'HELD', holdReason: 'MANUAL', reason: 'Checking the damage photos first' },
  ip: '203.0.113.7',
  // 10:30 am on Wednesday 7 October in New Zealand.
  createdAt: '2026-10-06T21:30:00.000Z',
};

const settingsChange: AuditEntry = {
  id: 'e2',
  action: 'settings.update',
  entity: 'platformSettings',
  createdAt: '2026-10-05T21:30:00.000Z',
};

/** The query string of each audit log request, in order. */
const queries = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/admin/audit'))
    .map((url) => url.searchParams);

const row = async (name: RegExp) => within(await screen.findByRole('row', { name }));

describe('AdminAuditPage', () => {
  it('lists who did what to which record, with the details before and after', async () => {
    mockApi({
      'GET /admin/audit': { status: 200, body: { entries: [held, settingsChange], total: 2, page: 1 } },
    });
    render();

    const entry = await row(/payout\.held/);
    expect(entry.getByText('Wed, 7 Oct 2026, 10:30 am')).toBeInTheDocument();
    expect(entry.getByRole('link', { name: 'Aroha Admin' })).toHaveAttribute(
      'href',
      '/admin/users/64f0c0ffee0000000000a001',
    );
    expect(entry.getByText('payout')).toBeInTheDocument();
    expect(entry.getByText('po1')).toBeInTheDocument();
    expect(entry.getByText('203.0.113.7')).toBeInTheDocument();

    const details = entry.getByRole('button', { name: 'Details' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'Before' })).not.toBeInTheDocument();
    await userEvent.click(details);
    expect(details).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Before' })).toBeInTheDocument();
    expect(screen.getByText(/"status": "SCHEDULED"/)).toBeInTheDocument();
    expect(screen.getByText(/"reason": "Checking the damage photos first"/)).toBeInTheDocument();

    // Changes made by the system have no person, and this one recorded nothing to show.
    const system = await row(/settings\.update/);
    expect(system.getByText('The system')).toBeInTheDocument();
    expect(system.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 entries')).toBeInTheDocument();
  });

  it('filters by action and record, keeping the filters in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/audit': { status: 200, body: { entries: [held], total: 1, page: 1 } },
    });
    const { router } = render();

    await row(/payout\.held/);
    await userEvent.type(screen.getByRole('textbox', { name: 'Action' }), 'payout.held');
    await userEvent.click(screen.getByRole('button', { name: /^Record/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Payouts' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Record id' }), 'po1');
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));

    await vi.waitFor(() => expect(queries(fetchMock)).toHaveLength(2));
    const sent = queries(fetchMock)[1];
    expect(sent?.get('action')).toBe('payout.held');
    expect(sent?.get('entity')).toBe('payout');
    expect(sent?.get('entityId')).toBe('po1');
    expect(new URLSearchParams(router.state.location.search).get('entity')).toBe('payout');
    // The fields show the filters in use.
    expect(screen.getByRole('textbox', { name: 'Action' })).toHaveValue('payout.held');

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });

  it('shows only one person’s changes, and everyone’s again', async () => {
    const fetchMock = mockApi({
      'GET /admin/audit': { status: 200, body: { entries: [held], total: 1, page: 1 } },
    });
    const { router } = render();

    await userEvent.click(
      (await row(/payout\.held/)).getByRole('button', { name: 'Only Aroha Admin’s changes' }),
    );

    await vi.waitFor(() => expect(queries(fetchMock).at(-1)?.get('actor')).toBe('64f0c0ffee0000000000a001'));
    const everyone = await screen.findByRole('button', { name: /Changes by Aroha Admin/ });
    await userEvent.click(everyone);
    expect(router.state.location.search).toBe('');
  });

  it('goes through the log a page at a time', async () => {
    const fetchMock = mockApi({
      'GET /admin/audit': { status: 200, body: { entries: [held], total: 120, page: 1 } },
    });
    const { router } = render();

    expect(await screen.findByText('1–50 of 120 entries')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await vi.waitFor(() => expect(queries(fetchMock).at(-1)?.get('page')).toBe('2'));
    expect(router.state.location.search).toBe('?page=2');
  });

  it('explains that the audit log is for the admin', async () => {
    mockApi({
      'GET /admin/audit': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    expect(await screen.findByText('The audit log is for the admin')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
