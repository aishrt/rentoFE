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

  it('asks for a verified mobile before texts about unread messages can be turned on', async () => {
    mockRoutes(({ method, path }) => {
      if (path === '/auth/session') return { status: 200, body: { user: guestUser } };
      if (method === 'GET' && path === '/me/notification-prefs') return { status: 200, body: { prefs } };
      return undefined;
    });
    renderWithProviders(<NotificationsSection />);

    const text = await screen.findByRole('switch', { name: /Text me about unread messages/ });
    await vi.waitFor(() => expect(text).toBeDisabled());
    expect(text).toHaveAccessibleDescription(/Add and verify your mobile first/);
    expect(screen.getByRole('link', { name: 'Mobile number' })).toHaveAttribute(
      'href',
      '#section-mobile-number',
    );
  });

  it('lets texts about unread messages be turned on once the mobile is verified', async () => {
    mockRoutes(({ method, path }) => {
      if (path === '/auth/session')
        return { status: 200, body: { user: { ...guestUser, phone: '+64211112222', phoneVerified: true } } };
      if (method === 'GET' && path === '/me/notification-prefs') return { status: 200, body: { prefs } };
      return undefined;
    });
    renderWithProviders(<NotificationsSection />);

    const text = await screen.findByRole('switch', { name: /Text me about unread messages/ });
    await vi.waitFor(() => expect(text).toHaveAccessibleDescription(/still unread after 10 minutes/));
    expect(text).toBeEnabled();
  });
});
