import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { PayPage } from './pay-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The pay link's charge, as GET /payments/{id} answers. */
function mockCharge(payment: Record<string, unknown>) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /payments/pay123':
        return {
          status: 200,
          body: {
            payment: {
              id: 'pay123',
              bookingRef: 'RV-7K2Q9M',
              vehicleTitle: '2021 Toyota Corolla',
              description: 'Sand through the back seats',
              type: 'CLEANING',
              amountCents: 6_000,
              ...payment,
            },
          },
        };
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/pay/:id', element: <PayPage /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
    ],
    '/pay/pay123',
  );

describe('PayPage', () => {
  it('offers to pay a charge that’s due', async () => {
    mockCharge({ status: 'DUE', failureReason: 'Your card was declined.' });
    render();
    expect(await screen.findByRole('button', { name: 'Pay now' })).toBeInTheDocument();
    expect(screen.getByText(/Your card was declined\./)).toBeInTheDocument();
  });

  it('says a refunded charge was refunded, with nothing to pay', async () => {
    mockCharge({ status: 'REFUNDED', refundedCents: 6_000 });
    render();
    expect(await screen.findByRole('heading', { name: 'Refunded' })).toBeInTheDocument();
    expect(screen.getByText(/refunded to your card in full\. There’s nothing to pay\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your trip' })).toHaveAttribute(
      'href',
      '/trips/RV-7K2Q9M',
    );
  });

  it('says a cancelled charge was cancelled, with nothing to pay', async () => {
    mockCharge({ status: 'CANCELLED' });
    render();
    expect(await screen.findByRole('heading', { name: 'This charge was cancelled' })).toBeInTheDocument();
    expect(screen.getByText(/cancelled by our team, so there’s nothing to pay/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('says how much of a paid charge was refunded', async () => {
    mockCharge({ status: 'PAID', refundedCents: 2_000 });
    render();
    expect(await screen.findByRole('heading', { name: 'Paid, thank you' })).toBeInTheDocument();
    expect(screen.getByText(/\$20(\.00)? of it was refunded to your card/)).toBeInTheDocument();
  });
});
