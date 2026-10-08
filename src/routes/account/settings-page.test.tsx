import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, mockApi, renderWithRouter } from '@/test/utils';
import { AccountSettingsPage } from './settings-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      { path: '/account/settings', element: <AccountSettingsPage /> },
      { path: '/login', element: <p>Log-in page</p> },
    ],
    '/account/settings',
  );

const section = (name: string) => screen.findByRole('region', { name });

describe('AccountSettingsPage', () => {
  it('sends visitors to log in, and back here afterwards', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: null } } });
    const { router } = render();

    expect(await screen.findByText('Log-in page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Faccount%2Fsettings');
  });

  it('changes the password, and says other devices were signed out', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'POST /me/password': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 204 };
      },
    });
    render();

    const password = within(await section('Password'));
    await userEvent.type(password.getByLabelText('Current password'), 'old password here');
    await userEvent.type(password.getByLabelText('New password'), 'kererū over the bush');
    await userEvent.type(password.getByLabelText('Confirm new password'), 'kererū over the bush');
    await userEvent.click(password.getByRole('button', { name: 'Change password' }));

    expect(await password.findByText(/signed out on your other devices/)).toBeInTheDocument();
    expect(sent).toEqual({ currentPassword: 'old password here', newPassword: 'kererū over the bush' });
  });

  it('shows a wrong current password next to its field', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'POST /me/password': {
        status: 400,
        body: {
          error: {
            code: 'WRONG_PASSWORD',
            message: 'Wrong',
            fields: { currentPassword: "That's not your current password." },
          },
        },
      },
    });
    render();

    const password = within(await section('Password'));
    await userEvent.type(password.getByLabelText('Current password'), 'not it');
    await userEvent.type(password.getByLabelText('New password'), 'kererū over the bush');
    await userEvent.type(password.getByLabelText('Confirm new password'), 'kererū over the bush');
    await userEvent.click(password.getByRole('button', { name: 'Change password' }));

    expect(await password.findByText("That's not your current password.")).toBeInTheDocument();
  });

  it("says when the new passwords don't match, without sending them", async () => {
    let sent = false;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'POST /me/password': () => {
        sent = true;
        return { status: 204 };
      },
    });
    render();

    const password = within(await section('Password'));
    await userEvent.type(password.getByLabelText('Current password'), 'old password here');
    await userEvent.type(password.getByLabelText('New password'), 'kererū over the bush');
    await userEvent.type(password.getByLabelText('Confirm new password'), 'kererū over the hill');
    await userEvent.click(password.getByRole('button', { name: 'Change password' }));

    expect(await password.findByText("The passwords don't match")).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it('verifies a mobile number with the texted code', async () => {
    let sentCode: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'POST /auth/phone/otp': { status: 200, body: { phone: '+64211234567', sent: true } },
      'POST /auth/phone/verify': (init) => {
        sentCode = JSON.parse(String(init?.body)).code;
        return { status: 200, body: { user: { ...guestUser, phone: '+64211234567', phoneVerified: true } } };
      },
    });
    render();

    const phone = within(await section('Mobile number'));
    expect(phone.getByText('No mobile number yet')).toBeInTheDocument();
    await userEvent.type(phone.getByLabelText('Mobile number'), '021 123 4567');
    await userEvent.click(phone.getByRole('button', { name: 'Text me a code' }));

    expect(await phone.findByText(/We sent a code to \+64211234567/)).toBeInTheDocument();
    await userEvent.type(phone.getByLabelText('Code'), '654 321');
    await userEvent.click(phone.getByRole('button', { name: 'Verify number' }));

    expect(await phone.findByText('Your mobile number is verified.')).toBeInTheDocument();
    expect(phone.getByText('+64211234567')).toBeInTheDocument();
    expect(phone.getByText('Verified')).toBeInTheDocument();
    expect(sentCode).toBe('654321');
  });

  it('sends a link to the new email address, keeping the current one until then', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'POST /me/email': { status: 200, body: { email: 'kiri.new@example.co.nz' } },
    });
    render();

    const email = within(await section('Email address'));
    expect(email.getByText('kiri@example.co.nz')).toBeInTheDocument();
    // It's confirmed, so the form waits behind a button.
    expect(email.queryByRole('button', { name: 'Send confirmation link' })).not.toBeInTheDocument();
    await userEvent.click(email.getByRole('button', { name: 'Change email address' }));
    await userEvent.type(email.getByLabelText('New email address'), 'kiri.new@example.co.nz');
    await userEvent.type(email.getByLabelText('Current password'), 'my password');
    await userEvent.click(email.getByRole('button', { name: 'Send confirmation link' }));

    expect(
      await email.findByText(
        /We've sent a link to kiri.new@example.co.nz. Open it to switch; until then, keep using kiri@example.co.nz/,
      ),
    ).toBeInTheDocument();
  });

  it('shows the change form straight away while the address is unconfirmed', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...guestUser, emailVerified: false } } },
    });
    render();

    const email = within(await section('Email address'));
    expect(email.getByText('Not confirmed')).toBeInTheDocument();
    expect(email.getByRole('button', { name: 'Send confirmation link' })).toBeInTheDocument();
    expect(email.queryByRole('button', { name: 'Change email address' })).not.toBeInTheDocument();
  });

  it('lists the people blocked in messages, and unblocks one', async () => {
    let unblocked = false;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guestUser } },
      'GET /me/blocked-users': () => ({
        status: 200,
        body: { users: unblocked ? [] : [{ id: 'u9', firstName: 'Tama' }] },
      }),
      'DELETE /users/u9/block': () => {
        unblocked = true;
        return { status: 204 };
      },
    });
    render();

    const blocked = within(await section('Blocked people'));
    await userEvent.click(await blocked.findByRole('button', { name: 'Unblock Tama' }));

    expect(await blocked.findByText(/You haven’t blocked anyone/)).toBeInTheDocument();
    expect(unblocked).toBe(true);
  });

  it('shows a verified mobile number as it is, with a button to change it', async () => {
    mockApi({
      'POST /auth/session': {
        status: 200,
        body: { user: { ...guestUser, phone: '+64211234567', phoneVerified: true } },
      },
    });
    render();

    const mobile = within(await section('Mobile number'));
    expect(mobile.getByText('+64211234567')).toBeInTheDocument();
    expect(mobile.queryByRole('button', { name: 'Text me a code' })).not.toBeInTheDocument();
    await userEvent.click(mobile.getByRole('button', { name: 'Change mobile number' }));
    expect(mobile.getByRole('button', { name: 'Text me a code' })).toBeInTheDocument();
  });
});
