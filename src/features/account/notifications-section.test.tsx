import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPrefs } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithProviders } from '@/test/utils';
import { NotificationsSection } from './notifications-section';

afterEach(() => {
  vi.unstubAllGlobals();
});

const prefs: NotificationPrefs = {
  marketingEmail: false,
  marketingSms: false,
  unreadMessageSms: false,
  unreadMessageEmail: true,
};

describe('NotificationsSection', () => {
  it('turns off emails about unread messages, the non-essential email people choose (plan §7)', async () => {
    const sent = mockRoutes(({ method, path, body }) => {
      if (path === '/auth/session') return { status: 200, body: { user: guestUser } };
      if (method === 'GET' && path === '/me/notification-prefs') return { status: 200, body: { prefs } };
      if (method === 'PATCH' && path === '/me/notification-prefs')
        return { status: 200, body: { prefs: { ...prefs, ...(body as Partial<NotificationPrefs>) } } };
      return undefined;
    });
    renderWithProviders(<NotificationsSection />);

    const email = await screen.findByRole('switch', { name: /Email me about unread messages/ });
    expect(email).toBeChecked();
    expect(screen.getByRole('switch', { name: /Text me about unread messages/ })).not.toBeChecked();

    await userEvent.click(email);
    await vi.waitFor(() =>
      expect(sent.find((request) => request.method === 'PATCH')?.body).toEqual({ unreadMessageEmail: false }),
    );
    expect(screen.getByRole('switch', { name: /Email me about unread messages/ })).not.toBeChecked();
  });
});
