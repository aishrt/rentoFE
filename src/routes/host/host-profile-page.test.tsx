import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostProfile } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { HostProfilePage } from './host-profile-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const hostUser = { ...guestUser, roles: ['GUEST', 'HOST'], hostStatus: 'APPROVED' };

const profile: HostProfile = {
  status: 'APPROVED',
  appliedAt: '2026-09-20T21:00:00.000Z',
  bio: 'Two well-kept cars in Ponsonby.',
  gstRegistered: false,
  payoutsEnabled: false,
  rating: { avg: 4.8, count: 12 },
  tripCount: 15,
  responseRate: 96,
};

function api(host: HostProfile = profile) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: hostUser } };
      case 'GET /me/host-profile':
        return { status: 200, body: { host } };
      case 'PATCH /me/host-profile':
        return { status: 200, body: { host: { ...host, ...(request.body as object) } } };
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      {
        path: '/host/profile',
        element: (
          <>
            <HostProfilePage />
            <Toaster />
          </>
        ),
      },
    ],
    '/host/profile',
  );

describe('HostProfilePage', () => {
  it('shows how guests see the Host, and where payouts and notifications are set', async () => {
    api();
    render();

    expect(await screen.findByLabelText('About you')).toHaveValue('Two well-kept cars in Ponsonby.');
    expect(screen.getByText('4.8 (12)')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up payouts' })).toHaveAttribute('href', '/host/earnings');
    expect(screen.getByRole('link', { name: 'Notification settings' })).toHaveAttribute(
      'href',
      '/account/settings',
    );
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('saves the bio and GST number', async () => {
    const user = userEvent.setup();
    const sent = api();
    render();

    const bio = await screen.findByLabelText('About you');
    await user.clear(bio);
    await user.type(bio, 'Kia ora, I’m Aroha.');
    await user.click(screen.getByRole('switch', { name: /registered for GST/ }));
    const gst = screen.getByLabelText('GST number');
    await user.type(gst, '12345');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('GST numbers look like 123-456-789')).toBeInTheDocument();

    await user.clear(gst);
    await user.type(gst, '123-456-789');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(sent.find((request) => request.method === 'PATCH')?.body).toEqual({
      bio: 'Kia ora, I’m Aroha.',
      gstRegistered: true,
      gstNumber: '123-456-789',
    });
  });

  it('waits for approval before the profile can be edited', async () => {
    api({ ...profile, status: 'APPLIED' });
    render();

    expect(await screen.findByText('Your profile opens once you’re approved to host')).toBeInTheDocument();
    expect(screen.queryByLabelText('About you')).not.toBeInTheDocument();
  });
});
