import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutReadiness } from '@/api/types';
import { readiness } from '@/features/booking/test-fixtures';
import { mockRoutes, policies } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { AccountPage } from './account-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockAccount(
  details: CheckoutReadiness,
  user = { ...guestUser, phoneVerified: true, phone: '+64211234567' },
) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /me/checkout':
        return { status: 200, body: details };
      case 'GET /policies':
        return { status: 200, body: policies };
      default:
        return undefined;
    }
  });
}

const render = () => renderWithRouter([{ path: '/account', element: <AccountPage /> }], '/account');

describe('AccountPage', () => {
  it('links to each part of the dashboard', async () => {
    mockAccount(readiness());
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    for (const [name, href] of [
      [/^Trips/, '/trips'],
      [/^Saved cars/, '/saved'],
      [/^Payments/, '/account/payments'],
      [/^Help and support/, '/account/support'],
      [/^Settings/, '/account/settings'],
    ] as const) {
      expect(screen.getAllByRole('link', { name }).some((link) => link.getAttribute('href') === href)).toBe(
        true,
      );
    }
  });

  it('shows what a booking needs: email, mobile, licence and the identity check', async () => {
    mockAccount(readiness({ identityStatus: 'NONE' }));
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(await details.findByText(/kiri@example\.co\.nz/)).toBeInTheDocument();
    expect(details.getByText(/is confirmed\./)).toBeInTheDocument();
    expect(await details.findByText(/\+64211234567/)).toBeInTheDocument();
    expect(details.getByText(/ending 456/)).toBeInTheDocument();
    expect(
      details.getByText(/We’ll ask for a photo of your ID and a selfie before your first trip/),
    ).toBeInTheDocument();
  });

  it('says what stops the Guest booking, and to confirm their email', async () => {
    mockAccount(
      readiness({
        problems: [{ code: 'LICENCE_EXPIRES', message: 'Your licence has expired.' }],
        identityStatus: 'REJECTED',
      }),
      { ...guestUser, emailVerified: false, phoneVerified: true, phone: '+64211234567' },
    );
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(await details.findByText(/isn’t confirmed yet/)).toBeInTheDocument();
    expect(details.getByRole('link', { name: 'Confirm it in Settings' })).toHaveAttribute(
      'href',
      '/account/settings',
    );
    expect(await details.findByRole('alert')).toHaveTextContent('Before you can book');
    expect(details.getByText(/Your licence has expired/)).toBeInTheDocument();
    expect(details.getByText(/We couldn’t verify your identity/)).toBeInTheDocument();
  });
});
