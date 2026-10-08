import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBookingRow, AdminUserDetail } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminUserPage } from './user-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (id = 'u10') =>
  renderWithRouter(
    [
      {
        path: '/admin/users/:id',
        element: (
          <>
            <AdminUserPage />
            <Toaster />
          </>
        ),
      },
    ],
    `/admin/users/${id}`,
  );

const supportUser = {
  ...adminUser,
  id: 'u3',
  email: 'sam@example.co.nz',
  firstName: 'Sam',
  roles: ['SUPPORT'],
};

const upcoming: AdminBookingRow = {
  id: 'b2',
  ref: 'RV-DEF456',
  status: 'CONFIRMED',
  vehicleTitle: '2021 Toyota Corolla',
  guest: { id: 'u20', name: 'Kiri Walker' },
  host: { id: 'u10', name: 'Aroha Ngata' },
  start: '2026-11-01T22:00:00.000Z',
  end: '2026-11-04T22:00:00.000Z',
  totalCents: 31250,
  createdAt: '2026-10-01T00:00:00.000Z',
};

const past: AdminBookingRow = {
  ...upcoming,
  id: 'b1',
  ref: 'RV-ABC123',
  status: 'COMPLETED',
  start: '2026-08-01T22:00:00.000Z',
  end: '2026-08-03T22:00:00.000Z',
  totalCents: 18000,
};

const aroha: AdminUserDetail = {
  id: 'u10',
  firstName: 'Aroha',
  lastName: 'Ngata',
  email: 'aroha@example.co.nz',
  phone: '+64211234567',
  roles: ['GUEST', 'HOST'],
  status: 'ACTIVE',
  closed: false,
  identityStatus: 'APPROVED',
  hostStatus: 'APPROVED',
  openRiskFlags: 1,
  createdAt: '2026-03-01T00:00:00.000Z',
  emailVerified: true,
  phoneVerified: false,
  permissions: [],
  lastLoginAt: '2026-10-06T20:00:00.000Z',
  licence: {
    class: 'NZ_FULL',
    country: 'NZ',
    numberEnding: '1234',
    expiry: '2029-05-01',
    status: 'APPROVED',
  },
  host: {
    status: 'APPROVED',
    payoutsEnabled: true,
    feesOwedCents: 4550,
    tripCount: 12,
    rating: { avg: 4.86, count: 9 },
    vehicles: 2,
  },
  riskFlags: [
    {
      id: 'f1',
      code: 'HOST_CANCELLATIONS',
      detail: '3 cancellations in 30 days',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'f2',
      code: 'DUPLICATE_LICENCE',
      createdAt: '2026-05-01T00:00:00.000Z',
      clearedAt: '2026-05-02T00:00:00.000Z',
    },
  ],
  bookings: [upcoming, past],
  upcomingBookings: [upcoming],
};

const sam: AdminUserDetail = {
  ...aroha,
  id: 'u30',
  firstName: 'Sam',
  lastName: 'Support',
  email: 'sam@rentovroom.co.nz',
  roles: ['SUPPORT'],
  hostStatus: null,
  openRiskFlags: 0,
  licence: null,
  host: null,
  riskFlags: [],
  bookings: [],
  upcomingBookings: [],
};

const session = (user: typeof adminUser = adminUser) => ({ status: 200, body: { user } });
const region = async (name: string) => within(await screen.findByRole('region', { name }));

describe('AdminUserPage', () => {
  it('shows their account, licence, hosting, flags and bookings', async () => {
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
    });
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Aroha Ngata' })).toBeInTheDocument();
    const account = await region('Account');
    expect(account.getByRole('link', { name: 'aroha@example.co.nz' })).toHaveAttribute(
      'href',
      'mailto:aroha@example.co.nz',
    );
    expect(account.getByText('(verified)')).toBeInTheDocument();
    expect(account.getByText('+64211234567')).toBeInTheDocument();
    expect(account.getByText('Not verified')).toBeInTheDocument();
    expect(account.getByText('Guest, Host')).toBeInTheDocument();
    expect(account.getByText('01/03/2026')).toBeInTheDocument();

    const licence = await region('Driver licence');
    expect(licence.getByText('Full NZ licence')).toBeInTheDocument();
    expect(licence.getByText('Ending 1234')).toBeInTheDocument();
    expect(licence.getByText('01/05/2029')).toBeInTheDocument();

    const host = await region('Host');
    expect(host.getByText('$45.50')).toBeInTheDocument();
    expect(host.getByText('12')).toBeInTheDocument();
    expect(host.getByText('4.9 (9)')).toBeInTheDocument();
    expect(host.getByRole('button', { name: 'Waive fees' })).toBeInTheDocument();

    const flags = await region('Risk flags');
    expect(flags.getByText('3 cancellations in 30 days')).toBeInTheDocument();
    expect(
      flags.getByRole('button', { name: 'Clear flag: Repeated Host cancellations' }),
    ).toBeInTheDocument();
    expect(flags.getByText('Licence used on another account')).toBeInTheDocument();
    expect(flags.queryByRole('button', { name: /Licence used on another account/ })).not.toBeInTheDocument();

    const table = within(screen.getByRole('table', { name: 'Upcoming bookings' }));
    expect(table.getByRole('link', { name: 'RV-DEF456' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-DEF456',
    );
    expect(table.getByRole('link', { name: 'Kiri Walker' })).toHaveAttribute('href', '/admin/users/u20');
    // Their own name isn't a link to the page you're on.
    expect(table.queryByRole('link', { name: 'Aroha Ngata' })).not.toBeInTheDocument();
    expect(table.getByText('$312.50')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Bookings' })).getAllByRole('row')).toHaveLength(3);

    // The admin can close an account; support staff controls are only for support team members.
    expect(await screen.findByRole('region', { name: 'Close account' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Support team' })).not.toBeInTheDocument();
  });

  it('suspends with a reason, then brings their upcoming bookings into view', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
      'POST /admin/users/u10/suspend': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: { user: { ...aroha, status: 'SUSPENDED', suspendedReason: 'Fake listings reported.' } },
        };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Suspend Aroha Ngata?' }));
    expect(
      dialog.getByText(/listings are hidden from search and their payouts are held/),
    ).toBeInTheDocument();
    expect(dialog.getByText('They have 1 upcoming booking.')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: 'Suspend account' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(dialog.getByLabelText('Reason'), 'Fake listings reported.');
    await userEvent.click(dialog.getByRole('button', { name: 'Suspend account' }));

    expect(await screen.findByText('Aroha Ngata is suspended')).toBeInTheDocument();
    expect(sent).toEqual({ reason: 'Fake listings reported.' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Fake listings reported.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lift suspension' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();

    const section = screen.getByRole('region', { name: 'Upcoming bookings' });
    expect(section).toHaveClass('ring-2');
    expect(within(section).getByText('Decide what happens to these bookings')).toBeInTheDocument();
  });

  it('lifts a suspension after asking', async () => {
    const lifted = vi.fn();
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': {
        status: 200,
        body: { user: { ...aroha, status: 'SUSPENDED', suspendedReason: 'Checking documents.' } },
      },
      'POST /admin/users/u10/unsuspend': () => {
        lifted();
        return { status: 200, body: { user: aroha } };
      },
    });
    render();

    expect(await screen.findByText('Checking documents.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lift suspension' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Lift Aroha Ngata’s suspension?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Lift suspension' }));

    expect(await screen.findByText('Aroha Ngata can sign in again')).toBeInTheDocument();
    expect(lifted).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('clears a risk flag', async () => {
    const cleared = vi.fn();
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
      'POST /admin/users/u10/risk-flags/f1/clear': () => {
        cleared();
        return {
          status: 200,
          body: {
            user: {
              ...aroha,
              openRiskFlags: 0,
              riskFlags: aroha.riskFlags.map((flag) => ({ ...flag, clearedAt: '2026-10-07T00:00:00.000Z' })),
            },
          },
        };
      },
    });
    render();

    const flags = await region('Risk flags');
    await userEvent.click(flags.getByRole('button', { name: 'Clear flag: Repeated Host cancellations' }));

    expect(await screen.findByText('Flag cleared')).toBeInTheDocument();
    expect(cleared).toHaveBeenCalledOnce();
    expect(flags.queryByRole('button', { name: /Clear flag/ })).not.toBeInTheDocument();
  });

  it('waives part of a Host’s fees, in cents, with a reason', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
      'POST /admin/users/u10/waive-host-fee': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { user: { ...aroha, host: { ...aroha.host!, feesOwedCents: 2550 } } } };
      },
    });
    render();

    await userEvent.click((await region('Host')).getByRole('button', { name: 'Waive fees' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Waive Host cancellation fees?' }));
    expect(dialog.getByText(/Aroha owes \$45\.50/)).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('Amount to waive (optional)'), '50');
    await userEvent.type(dialog.getByLabelText('Reason'), 'The Guest cancelled first.');
    await userEvent.click(dialog.getByRole('button', { name: 'Waive fees' }));
    expect(await dialog.findByText('They owe $45.50: enter that or less')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(dialog.getByLabelText('Amount to waive (optional)'));
    await userEvent.type(dialog.getByLabelText('Amount to waive (optional)'), '20');
    await userEvent.click(dialog.getByRole('button', { name: 'Waive fees' }));

    expect(await screen.findByText('Fees waived')).toBeInTheDocument();
    expect(sent).toEqual({ amountCents: 2000, reason: 'The Guest cancelled first.' });
    expect(await (await region('Host')).findByText('$25.50')).toBeInTheDocument();
  });

  it('waives everything owed when the amount is empty, and explains a missing refunds permission', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': session(supportUser),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
      'POST /admin/users/u10/waive-host-fee': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 403,
          body: { error: { code: 'FORBIDDEN', message: "You don't have access to this." } },
        };
      },
    });
    render();

    await userEvent.click((await region('Host')).getByRole('button', { name: 'Waive fees' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Waive Host cancellation fees?' }));
    await userEvent.type(dialog.getByLabelText('Reason'), 'Goodwill.');
    await userEvent.click(dialog.getByRole('button', { name: 'Waive fees' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(/You need the refunds permission/);
    expect(sent).toEqual({ reason: 'Goodwill.' });
  });

  it("shows why an account can't be closed yet", async () => {
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u10': { status: 200, body: { user: aroha } },
      'POST /admin/users/u10/close': {
        status: 409,
        body: { error: { code: 'CLOSURE_BLOCKED', message: 'They have a booking that hasn’t finished.' } },
      },
    });
    render();

    await userEvent.click((await region('Close account')).getByRole('button', { name: 'Close account' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Close Aroha Ngata’s account?' }));
    expect(dialog.getByText(/This can’t be undone/)).toBeInTheDocument();
    expect(dialog.getByText(/stay for the periods the law requires/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Close account' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('They have a booking that hasn’t finished.');
  });

  it('hides admin-only controls from support staff, and shows why they can’t suspend a staff account', async () => {
    mockApi({
      'POST /auth/session': session(supportUser),
      'GET /admin/users/u30': { status: 200, body: { user: sam } },
      'POST /admin/users/u30/suspend': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: 'Only the admin can change a staff account.' } },
      },
    });
    render('u30');

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    expect(screen.queryByRole('region', { name: 'Close account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Support team' })).not.toBeInTheDocument();

    const dialog = within(await screen.findByRole('dialog', { name: 'Suspend Sam Support?' }));
    await userEvent.type(dialog.getByLabelText('Reason'), 'Testing access.');
    await userEvent.click(dialog.getByRole('button', { name: 'Suspend account' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('Only the admin can change a staff account.');
  });

  it('lets the admin give a support member the refunds permission and reset their authenticator', async () => {
    let permissions: unknown;
    const reset = vi.fn();
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/u30': { status: 200, body: { user: sam } },
      'POST /admin/staff/u30/permissions': (init) => {
        permissions = JSON.parse(String(init?.body));
        return { status: 200, body: { user: { ...sam, permissions: ['REFUNDS'] } } };
      },
      'POST /admin/staff/u30/mfa/reset': () => {
        reset();
        return { status: 204 };
      },
    });
    render('u30');

    const team = await region('Support team');
    const refunds = team.getByRole('switch', { name: 'Can issue refunds' });
    expect(refunds).not.toBeChecked();
    await userEvent.click(refunds);

    expect(await screen.findByText('Sam can now issue refunds')).toBeInTheDocument();
    expect(permissions).toEqual({ refunds: true });
    expect(team.getByRole('switch', { name: 'Can issue refunds' })).toBeChecked();

    await userEvent.click(team.getByRole('button', { name: 'Reset authenticator' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reset Sam Support’s authenticator?' }));
    expect(dialog.getByText(/set up a new app in Settings/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Reset authenticator' }));

    expect(await screen.findByText('Sam Support’s authenticator is reset')).toBeInTheDocument();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('says when nobody has that id', async () => {
    mockApi({
      'POST /auth/session': session(),
      'GET /admin/users/nope': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No user with that id.' } },
      },
    });
    render('nope');

    expect(await screen.findByText('We couldn’t find that person')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Users' })).toHaveAttribute('href', '/admin/users');
  });
});
