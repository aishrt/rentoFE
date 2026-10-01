import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AcceptInvitePage } from './accept-invite-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const TOKEN = 'invite-token-from-the-email-link';
const PASSWORD = 'kea on the ridge at noon';

const render = (path = `/admin/invite?token=${TOKEN}`) =>
  renderWithRouter([{ path: '/admin/invite', element: <AcceptInvitePage /> }], path);

const details = (existingAccount = false) => ({
  status: 200,
  body: { email: 'mere@example.co.nz', firstName: 'Mere', existingAccount },
});

const linkInvalid = {
  status: 400,
  body: { error: { code: 'LINK_INVALID', message: 'This link has expired or was already used.' } },
};

async function choosePassword(password = PASSWORD, confirm = password) {
  await userEvent.type(await screen.findByLabelText('Password'), password);
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Join the support team' }));
}

describe('AcceptInvitePage', () => {
  it('joins the support team with a new password, then points to the staff log-in', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/staff-invite': details(),
      'POST /auth/staff-invite/accept': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { email: 'mere@example.co.nz' } };
      },
    });
    const { router } = render();

    expect(await screen.findByRole('heading', { name: 'Join the support team, Mere' })).toBeInTheDocument();
    expect(screen.getByText(/Choose a password for mere@example\.co\.nz/)).toBeInTheDocument();
    // The token is taken out of the address bar once read.
    expect(router.state.location.search).toBe('');

    await choosePassword();

    expect(await screen.findByRole('heading', { name: "You're on the support team" })).toBeInTheDocument();
    expect(sent).toEqual({ token: TOKEN, password: PASSWORD });
    expect(screen.getByRole('link', { name: 'Go to staff log-in' })).toHaveAttribute('href', '/admin/login');
  });

  it('warns that an existing account gets the new password', async () => {
    mockApi({ 'POST /auth/staff-invite': details(true) });
    render();

    expect(await screen.findByText('This email already has a Rento Vroom account')).toBeInTheDocument();
  });

  it("checks the passwords match before sending, and shows the API's password rule", async () => {
    const accept = vi.fn(() => ({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some details need fixing.',
          fields: { password: "Don't use your email address in your password" },
        },
      },
    }));
    mockApi({ 'POST /auth/staff-invite': details(), 'POST /auth/staff-invite/accept': accept });
    render();

    await choosePassword(PASSWORD, 'something else entirely');
    expect(await screen.findByText("The passwords don't match")).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Confirm password'), PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: 'Join the support team' }));
    expect(await screen.findByText("Don't use your email address in your password")).toBeInTheDocument();
  });

  it('explains an expired, used or cancelled invitation', async () => {
    mockApi({ 'POST /auth/staff-invite': linkInvalid });
    render();

    expect(await screen.findByRole('heading', { name: 'This invitation has expired' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('explains a link without its token', async () => {
    const fetchMock = mockApi({});
    render('/admin/invite');

    expect(await screen.findByRole('heading', { name: 'This link is incomplete' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
