import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminUserDetail, StaffList } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { AdminSidebar } from '@/features/admin/admin-sidebar';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminStaffPage } from './staff-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/admin/staff',
        element: (
          <>
            <AdminStaffPage />
            <Toaster />
          </>
        ),
      },
    ],
    '/admin/staff',
  );

const supportUser = {
  ...adminUser,
  id: 'u3',
  email: 'sam@example.co.nz',
  firstName: 'Sam',
  roles: ['SUPPORT'],
};

const team: StaffList = {
  staff: [
    {
      id: 'u1',
      email: 'aroha@example.co.nz',
      firstName: 'Aroha',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLoginAt: '2026-09-30T21:00:00.000Z',
      permissions: ['REFUNDS'],
    },
    {
      id: 'u3',
      email: 'sam@example.co.nz',
      firstName: 'Sam',
      lastName: 'Support',
      role: 'SUPPORT',
      status: 'ACTIVE',
      mfaEnabled: false,
      permissions: [],
    },
  ],
  invites: [],
};

/** Sam's record, as the permissions request returns it. */
const samRecord = (permissions: string[]): AdminUserDetail => ({
  id: 'u3',
  firstName: 'Sam',
  lastName: 'Support',
  email: 'sam@example.co.nz',
  roles: ['SUPPORT'],
  status: 'ACTIVE',
  closed: false,
  identityStatus: 'NONE',
  hostStatus: null,
  openRiskFlags: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  emailVerified: true,
  phoneVerified: false,
  permissions,
  licence: null,
  host: null,
  riskFlags: [],
  bookings: [],
  upcomingBookings: [],
});

const merePending = {
  id: 'i1',
  email: 'mere@example.co.nz',
  firstName: 'Mere',
  lastName: 'Walker',
  invitedAt: '2026-10-01T00:00:00.000Z',
  // Thursday 8 October in New Zealand.
  expiresAt: '2026-10-08T00:00:00.000Z',
};

describe('AdminStaffPage', () => {
  it('lists the admin and the support team, with only support members removable', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': { status: 200, body: team },
    });
    render();

    const list = within(await screen.findByRole('list', { name: 'Staff' }));
    const [admin, sam] = list.getAllByRole('listitem');
    expect(within(admin!).getByText('Admin')).toBeInTheDocument();
    expect(within(admin!).queryByRole('button')).not.toBeInTheDocument();
    expect(within(sam!).getByText(/not logged in yet/)).toBeInTheDocument();
    expect(within(sam!).getByRole('button', { name: 'Remove Sam Support' })).toBeInTheDocument();
    expect(screen.getByText('No open invitations.')).toBeInTheDocument();
    // Each member's name opens their record.
    expect(within(admin!).getByRole('link', { name: 'Aroha Admin' })).toHaveAttribute(
      'href',
      '/admin/users/u1',
    );
    expect(within(sam!).getByRole('link', { name: 'Sam Support' })).toHaveAttribute(
      'href',
      '/admin/users/u3',
    );
  });

  it('shows what each member can do, and lets the admin give or take the refunds permission', async () => {
    const sent: unknown[] = [];
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': { status: 200, body: team },
      'POST /admin/staff/u3/permissions': (init) => {
        const body = JSON.parse(String(init?.body)) as { refunds: boolean };
        sent.push(body);
        return { status: 200, body: { user: samRecord(body.refunds ? ['REFUNDS'] : []) } };
      },
    });
    render();

    const list = within(await screen.findByRole('list', { name: 'Staff' }));
    const [admin, sam] = list.getAllByRole('listitem');
    expect(within(admin!).getByText('Every permission, refunds included.')).toBeInTheDocument();
    expect(within(admin!).queryByRole('switch')).not.toBeInTheDocument();

    const refunds = within(sam!).getByRole('switch', { name: 'Sam Support can issue refunds' });
    expect(refunds).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(refunds);
    expect(await screen.findByText('Sam can now issue refunds')).toBeInTheDocument();
    expect(refunds).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(refunds);
    expect(await screen.findByText('Sam can no longer issue refunds')).toBeInTheDocument();
    expect(refunds).toHaveAttribute('aria-checked', 'false');
    expect(sent).toEqual([{ refunds: true }, { refunds: false }]);
  });

  it('says when the permission couldn’t change', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': { status: 200, body: team },
      'POST /admin/staff/u3/permissions': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No support team member with that id.' } },
      },
    });
    render();

    await userEvent.click(await screen.findByRole('switch', { name: 'Sam Support can issue refunds' }));
    expect(await screen.findByText('No support team member with that id.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Sam Support can issue refunds' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('invites someone and shows the invitation once it is sent', async () => {
    let list = team;
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': () => ({ status: 200, body: list }),
      'POST /admin/staff/invites': (init) => {
        sent = JSON.parse(String(init?.body));
        list = { ...team, invites: [merePending] };
        return { status: 201, body: { invite: merePending } };
      },
    });
    render();

    const form = within(await screen.findByRole('region', { name: 'Invite to the support team' }));
    await userEvent.type(form.getByLabelText('First name'), 'Mere');
    await userEvent.type(form.getByLabelText('Last name'), 'Walker');
    await userEvent.type(form.getByLabelText('Work email'), 'mere@example.co.nz');
    await userEvent.click(form.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText('Invitation sent to mere@example.co.nz')).toBeInTheDocument();
    expect(sent).toEqual({ firstName: 'Mere', lastName: 'Walker', email: 'mere@example.co.nz' });
    const invites = within(await screen.findByRole('list', { name: 'Open invitations' }));
    expect(invites.getByText(/mere@example\.co\.nz · expires Thursday, 8 October/)).toBeInTheDocument();
    expect(form.getByLabelText('Work email')).toHaveValue('');
  });

  it("shows the API's reason next to the email when they're already staff", async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': { status: 200, body: team },
      'POST /admin/staff/invites': {
        status: 409,
        body: {
          error: {
            code: 'ALREADY_STAFF',
            message: "They're already on the support team.",
            fields: { email: "They're already on the support team." },
          },
        },
      },
    });
    render();

    const form = within(await screen.findByRole('region', { name: 'Invite to the support team' }));
    await userEvent.type(form.getByLabelText('First name'), 'Sam');
    await userEvent.type(form.getByLabelText('Last name'), 'Support');
    await userEvent.type(form.getByLabelText('Work email'), 'sam@example.co.nz');
    await userEvent.click(form.getByRole('button', { name: 'Send invitation' }));

    expect(await form.findByText("They're already on the support team.")).toBeInTheDocument();
    expect(form.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes a support member after asking', async () => {
    let list = team;
    const removed = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': () => ({ status: 200, body: list }),
      'DELETE /admin/staff/u3': () => {
        removed();
        list = { ...team, staff: team.staff.slice(0, 1) };
        return { status: 204 };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Sam Support' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Remove Sam Support from the support team?' }),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Sam Support is off the support team')).toBeInTheDocument();
    expect(removed).toHaveBeenCalledOnce();
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
  });

  it("resets a support member's lost authenticator after asking", async () => {
    const withApp: StaffList = {
      ...team,
      staff: team.staff.map((member) => (member.id === 'u3' ? { ...member, mfaEnabled: true } : member)),
    };
    let list = withApp;
    const reset = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': () => ({ status: 200, body: list }),
      'POST /admin/staff/u3/mfa/reset': () => {
        reset();
        list = team;
        return { status: 204 };
      },
    });
    render();

    const members = within(await screen.findByRole('list', { name: 'Staff' }));
    const [admin] = members.getAllByRole('listitem');
    // The admin resets their own with the server script, not here.
    expect(within(admin!).queryByRole('button')).not.toBeInTheDocument();
    await userEvent.click(members.getByRole('button', { name: "Reset Sam Support's authenticator" }));
    const dialog = within(await screen.findByRole('dialog', { name: "Reset Sam Support's authenticator?" }));
    expect(dialog.getByText(/set up a new app in Settings/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Reset authenticator' }));

    expect(await screen.findByText("Sam Support's authenticator is reset")).toBeInTheDocument();
    expect(reset).toHaveBeenCalledOnce();
    // Without an authenticator app there's nothing left to reset.
    expect(await screen.findByRole('button', { name: 'Remove Sam Support' })).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('button', { name: "Reset Sam Support's authenticator" }),
      ).not.toBeInTheDocument(),
    );
  });

  it('cancels an open invitation, and can send it again', async () => {
    let list: StaffList = { ...team, invites: [merePending] };
    const resent = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/staff': () => ({ status: 200, body: list }),
      'POST /admin/staff/invites': (init) => {
        resent(JSON.parse(String(init?.body)));
        return { status: 201, body: { invite: merePending } };
      },
      'DELETE /admin/staff/invites/i1': () => {
        list = team;
        return { status: 204 };
      },
    });
    render();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Send the invitation to mere@example.co.nz again' }),
    );
    expect(await screen.findByText('Invitation sent again to mere@example.co.nz')).toBeInTheDocument();
    expect(resent).toHaveBeenCalledWith({
      email: 'mere@example.co.nz',
      firstName: 'Mere',
      lastName: 'Walker',
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel the invitation to mere@example.co.nz' }),
    );
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Cancel the invitation to mere@example.co.nz?' }),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel invitation' }));
    expect(await screen.findByText('No open invitations.')).toBeInTheDocument();
  });

  it("tells support staff only the admin manages staff, and doesn't ask for the list", async () => {
    const fetchMock = mockApi({ 'POST /auth/session': { status: 200, body: { user: supportUser } } });
    render();

    expect(await screen.findByText('Only the admin manages staff')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invite to the support team' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('AdminSidebar', () => {
  it('shows Staff to the admin only', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: adminUser } } });
    const admin = renderWithRouter([{ path: '*', element: <AdminSidebar /> }], '/admin');
    expect(await screen.findByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/admin/staff');
    admin.unmount();

    mockApi({ 'POST /auth/session': { status: 200, body: { user: supportUser } } });
    renderWithRouter([{ path: '*', element: <AdminSidebar /> }], '/admin');
    expect(await screen.findByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();
  });
});
