import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockNotificationsApi, notification } from '@/features/notifications/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { AdminNotificationsPage } from './notifications-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      { path: '/admin/notifications', element: <AdminNotificationsPage /> },
      { path: '/admin/bookings/:ref', element: <p>The booking’s record</p> },
    ],
    '/admin/notifications',
  );

describe('AdminNotificationsPage', () => {
  it('lists the staff member’s alerts, each opening its page in the portal and marked read', async () => {
    const sent = mockNotificationsApi([
      notification({
        type: 'VERIFICATION_BOOKING_WAITING',
        title: 'A booking waits for a verification check',
        link: '/admin/bookings/RV-7K2Q9M',
      }),
    ]);
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Staff portal')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('link', { name: /A booking waits for a verification check/ }),
    );

    expect(await screen.findByText('The booking’s record')).toBeInTheDocument();
    expect(sent.find((request) => request.path === '/notifications/read')?.body).toEqual({ ids: ['n1'] });
  });

  it('says what will show there when there’s nothing yet', async () => {
    mockNotificationsApi([]);
    render();

    expect(await screen.findByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
    expect(screen.getByText(/Alerts for the team, such as checks to make/)).toBeInTheDocument();
  });
});
