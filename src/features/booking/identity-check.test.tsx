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
      request.path === '/me/verification' && request.method === 'POST'
        ? { status: 200, body: { url: 'https://verify.stripe.com/start/abc' } }
        : undefined,
    );
    renderWithProviders(
      <IdentityCheck readiness={readiness({ identityError: 'You declined consent.' })} />,
      '/book/toyota?start=2026-10-12T10:00',
    );

    expect(screen.getByText(/You declined consent\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Verify your identity' }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://verify.stripe.com/start/abc'));
    expect(sent[0]?.body).toEqual({ returnTo: '/book/toyota?start=2026-10-12T10:00' });
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
