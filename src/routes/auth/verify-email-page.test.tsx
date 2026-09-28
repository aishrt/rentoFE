import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, mockApi, renderWithRouter } from '@/test/utils';
import { VerifyEmailPage } from './verify-email-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const unverified = { ...guestUser, emailVerified: false };
const render = (path: string) =>
  renderWithRouter([{ path: '/verify-email', element: <VerifyEmailPage /> }], path);

describe('VerifyEmailPage', () => {
  it('confirms the address from the link once, and takes the token out of the address bar', async () => {
    let confirmations = 0;
    let sentToken: unknown;
    mockApi({
      'POST /auth/verify-email': (init) => {
        confirmations += 1;
        sentToken = JSON.parse(String(init?.body)).token;
        return { status: 200, body: { email: 'kiri@example.co.nz' } };
      },
      'POST /auth/session': { status: 200, body: { user: null } },
    });

    const { router } = render('/verify-email?token=abcdefghijklmnopqrstuvwxyz&next=/cars');

    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
    expect(screen.getByText(/kiri@example.co.nz is confirmed/)).toBeInTheDocument();
    expect(sentToken).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(confirmations).toBe(1);
    expect(router.state.location.search).toBe('?next=%2Fcars');
    expect(screen.getByRole('link', { name: 'Continue to Rento Vroom' })).toHaveAttribute('href', '/cars');
  });

  it('offers a new link when an old one was used, and sends it', async () => {
    let resends = 0;
    mockApi({
      'POST /auth/verify-email': {
        status: 400,
        body: { error: { code: 'LINK_INVALID', message: 'This link has expired or was already used.' } },
      },
      'POST /auth/session': { status: 200, body: { user: unverified } },
      'POST /auth/verify-email/resend': () => {
        resends += 1;
        return { status: 200, body: { sent: true } };
      },
    });

    render('/verify-email?token=abcdefghijklmnopqrstuvwxyz');

    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Send a new link' }));

    expect(await screen.findByText(/We've sent a new link to kiri@example.co.nz/)).toBeInTheDocument();
    expect(resends).toBe(1);
  });

  it('asks a signed-out visitor with an old link to log in for a new one', async () => {
    mockApi({
      'POST /auth/verify-email': {
        status: 400,
        body: { error: { code: 'LINK_INVALID', message: 'This link has expired or was already used.' } },
      },
      'POST /auth/session': { status: 200, body: { user: null } },
    });

    render('/verify-email?token=abcdefghijklmnopqrstuvwxyz');

    expect(await screen.findByRole('link', { name: 'Log in to get a new link' })).toHaveAttribute(
      'href',
      '/login?next=/verify-email',
    );
  });

  it('after sign-up, tells the new user to check their inbox', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: unverified } } });

    render('/verify-email');

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByText('kiri@example.co.nz')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send a new link' })).toBeEnabled());
  });
});
