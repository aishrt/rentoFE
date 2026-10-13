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
      [/^Reviews/, '/account/reviews'],
      [/^Help and support/, '/account/support'],
      [/^Settings/, '/account/settings'],
    ] as const) {
      expect(screen.getAllByRole('link', { name }).some((link) => link.getAttribute('href') === href)).toBe(
        true,
      );
    }
    // Reviews has a card of its own, for phones, where the sidebar is hidden.
    expect(screen.getByRole('link', { name: /Reviews to write/ })).toHaveAttribute(
      'href',
      '/account/reviews',
    );
  });

  it('shows what a booking needs: email, mobile, licence and the identity check', async () => {
    mockAccount(readiness({ identityStatus: 'NONE' }));
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(await details.findByText(/kiri@example\.co\.nz/)).toBeInTheDocument();
    expect(details.getByText(/is confirmed\./)).toBeInTheDocument();
    expect(await details.findByText(/\+64211234567/)).toBeInTheDocument();
    expect(details.getByText(/ending 456/)).toBeInTheDocument();
    // Not asked for before booking here, but the Guest can verify whenever they like (spec §8).
    expect(details.getByText(/Not checked yet, and optional for now/)).toBeInTheDocument();
    expect(details.getByRole('button', { name: 'Verify your identity' })).toBeInTheDocument();
  });

  it('says when the identity check is needed before the first booking, once', async () => {
    mockAccount(
      readiness({
        identityStatus: 'NONE',
        problems: [{ code: 'IDENTITY_REQUIRED', message: 'Verify your identity with a photo of your ID.' }],
      }),
    );
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(
      await details.findByText('Not checked yet. You’ll need it before your first booking.'),
    ).toBeInTheDocument();
    expect(details.getAllByRole('heading', { name: 'Your identity' })).toHaveLength(1);
    expect(details.getAllByRole('button', { name: 'Verify your identity' })).toHaveLength(1);
  });

  it('says once that the identity check was turned down', async () => {
    mockAccount(
      readiness({
        identityStatus: 'REJECTED',
        problems: [
          { code: 'IDENTITY_REJECTED', message: 'We couldn’t verify your identity. Please contact support.' },
        ],
      }),
    );
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(await details.findAllByText(/We couldn’t verify your identity/)).toHaveLength(1);
    expect(details.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      '/contact?category=ACCOUNT',
    );
    expect(details.queryByRole('button', { name: 'Verify your identity' })).not.toBeInTheDocument();
  });

  it('says when support is checking the licence, and that booking still works meanwhile', async () => {
    mockAccount(
      readiness({
        identityStatus: 'APPROVED',
        licenceInReview: true,
        licence: { ...readiness().licence!, status: 'PENDING' },
      }),
    );
    render();

    const details = within(await screen.findByRole('region', { name: 'Your details for booking' }));
    expect(await details.findByText('Our team is checking your licence')).toBeInTheDocument();
    expect(details.getByText(/You can still book: your card is authorised, not charged/)).toBeInTheDocument();
    expect(details.queryByText('Your licence details are saved.')).not.toBeInTheDocument();
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
