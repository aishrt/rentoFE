import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { IdentityCheck } from './identity-check';
import { readiness } from './test-fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IdentityCheck', () => {
  it('sends the person to Stripe’s page and back to where they were', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const sent = mockRoutes((request) =>
      request.path === '/me/verification'
        ? request.method === 'POST'
          ? { status: 200, body: { url: 'https://verify.stripe.com/start/abc' } }
          : { status: 200, body: { identity: { status: 'NONE' } } }
        : undefined,
    );
    renderWithProviders(
      <IdentityCheck readiness={readiness({ identityError: 'You declined consent.' })} />,
      '/book/toyota?start=2026-10-12T10:00',
    );

    expect(screen.getByText(/You declined consent\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Verify your identity' }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://verify.stripe.com/start/abc'));
    // Back on this page, marked so the step looks for the result.
    expect(sent.find((request) => request.method === 'POST')?.body).toEqual({
      returnTo: '/book/toyota?start=2026-10-12T10:00&identityCheck=done',
    });
  });

  it('reads the check from Stripe as it opens, and waits for one Stripe is still checking', async () => {
    const sent = mockRoutes((request) =>
      request.path === '/me/verification'
        ? request.method === 'POST'
          ? {
              status: 409,
              body: {
                error: {
                  code: 'IDENTITY_PROCESSING',
                  message: 'We’re checking your ID. This usually takes a minute or two.',
                },
              },
            }
          : { status: 200, body: { identity: { status: 'NONE', sessionStatus: 'requires_input' } } }
        : undefined,
    );
    renderWithProviders(<IdentityCheck readiness={readiness()} />, '/book/toyota?identityCheck=done');
    await vi.waitFor(() =>
      expect(sent.some((request) => request.method === 'GET' && request.path === '/me/verification')).toBe(
        true,
      ),
    );

    // Started again before the result arrived: nothing new starts, and the step waits.
    await userEvent.click(screen.getByRole('button', { name: 'Verify your identity' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Stripe is checking your ID/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('waits while Stripe checks, and says when support is reviewing it', () => {
    const { unmount } = renderWithProviders(
      <IdentityCheck readiness={readiness({ identityProcessing: true })} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Stripe is checking your ID/);
    unmount();
    renderWithProviders(<IdentityCheck readiness={readiness({ identityStatus: 'PENDING' })} />);
    expect(screen.getByText('Our team is checking your ID')).toBeInTheDocument();
  });
});
