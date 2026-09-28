import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithRouter } from '@/test/utils';
import { ForgotPasswordPage } from './forgot-password-page';
import { ResetPasswordPage } from './reset-password-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ForgotPasswordPage', () => {
  it('sends the link and says so without revealing whether the account exists', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/forgot-password': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 204 };
      },
    });
    renderWithRouter([{ path: '/forgot-password', element: <ForgotPasswordPage /> }], '/forgot-password');

    await userEvent.type(await screen.findByLabelText('Email address'), ' kiri@example.co.nz ');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByText(/If there's a Rento Vroom account for/)).toBeInTheDocument();
    expect(sent).toEqual({ email: 'kiri@example.co.nz' });
  });
});

describe('ResetPasswordPage', () => {
  const render = (path: string) =>
    renderWithRouter([{ path: '/reset-password', element: <ResetPasswordPage /> }], path);

  it('sets the new password from the link, and takes the token out of the address bar', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/reset-password': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { email: 'kiri@example.co.nz' } };
      },
    });
    const { router } = render('/reset-password?token=abcdefghijklmnopqrstuvwxyz');

    expect(router.state.location.search).toBe('');
    await userEvent.type(await screen.findByLabelText('New password'), 'kererū over the bush');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'kererū over the bush');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('heading', { name: 'Password changed' })).toBeInTheDocument();
    expect(sent).toEqual({ token: 'abcdefghijklmnopqrstuvwxyz', password: 'kererū over the bush' });
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it("says when the passwords don't match, without sending them", async () => {
    let sent = false;
    mockApi({
      'POST /auth/reset-password': () => {
        sent = true;
        return { status: 200, body: { email: 'kiri@example.co.nz' } };
      },
    });
    render('/reset-password?token=abcdefghijklmnopqrstuvwxyz');

    await userEvent.type(await screen.findByLabelText('New password'), 'kererū over the bush');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'kererū over the hill');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText("The passwords don't match")).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it("shows the API's reason next to the password, and offers a new link when the old one has expired", async () => {
    let tries = 0;
    mockApi({
      'POST /auth/reset-password': () => {
        tries += 1;
        return tries === 1
          ? {
              status: 400,
              body: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Fix',
                  fields: { password: 'That password is too common.' },
                },
              },
            }
          : { status: 400, body: { error: { code: 'LINK_INVALID', message: 'Expired' } } };
      },
    });
    render('/reset-password?token=abcdefghijklmnopqrstuvwxyz');

    await userEvent.type(await screen.findByLabelText('New password'), 'password123456');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'password123456');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('That password is too common.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password');
  });
});
