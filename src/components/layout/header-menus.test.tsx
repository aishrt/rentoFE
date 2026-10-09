import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@/api/types';
import { hostUser } from '@/features/host/host-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { AccountMenu } from './account-menu';
import { MobileMenu } from './mobile-menu';

afterEach(() => {
  vi.unstubAllGlobals();
});

const guest: SessionUser = { ...hostUser, id: 'u2', firstName: 'Kiri', roles: ['GUEST'], hostStatus: null };

function mockHeaderApi(user: SessionUser, unread = 0) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /threads/unread':
        return { status: 200, body: { count: unread } };
      case 'GET /notifications':
        return { status: 200, body: { notifications: [], unreadCount: 0, total: 0 } };
      default:
        return undefined;
    }
  });
}

const hrefs = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => [item.textContent, item.getAttribute('href')]);

describe('AccountMenu', () => {
  it('gives a Guest their trips, the way in to hosting, and the bell', async () => {
    mockHeaderApi(guest);
    renderWithProviders(<AccountMenu user={guest} />);

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Account menu for Kiri' }));

    expect(hrefs(await screen.findByRole('menu'))).toEqual([
      ['Trips', '/trips'],
      ['Messages', '/messages'],
      ['Saved cars', '/saved'],
      ['Become a host', '/become-a-host'],
      ['Notifications', '/notifications'],
      ['Reviews', '/account/reviews'],
      ['Account', '/account'],
      ['Log out', null],
    ]);
  });

  it('gives anyone who has applied to host their Hosting pages', async () => {
    mockHeaderApi(hostUser);
    renderWithProviders(<AccountMenu user={hostUser} />);

    await userEvent.click(screen.getByRole('button', { name: 'Account menu for Aroha' }));

    expect(hrefs(await screen.findByRole('menu'))).toEqual([
      ['Trips', '/trips'],
      ['Messages', '/messages'],
      ['Saved cars', '/saved'],
      ['Hosting', '/host'],
      ['Notifications', '/notifications'],
      ['Reviews', '/account/reviews'],
      ['Account', '/account'],
      ['Log out', null],
    ]);
  });

  it('shows how many messages wait beside Messages', async () => {
    mockHeaderApi(guest, 3);
    renderWithProviders(<AccountMenu user={guest} />);

    await userEvent.click(screen.getByRole('button', { name: 'Account menu for Kiri' }));
    expect(await screen.findByRole('menuitem', { name: 'Messages, 3 unread' })).toHaveAttribute(
      'href',
      '/messages',
    );
  });
});

describe('MobileMenu', () => {
  // The signed-in sheet reads the unread count.
  beforeEach(() => {
    mockHeaderApi(hostUser);
  });

  const links = (name: string) =>
    within(screen.getByRole('navigation', { name }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);

  it('offers log in and sign up to a visitor', () => {
    renderWithProviders(<MobileMenu open onOpenChange={() => undefined} user={null} />);

    expect(links('Main').map(([label]) => label)).toEqual([
      'Browse cars',
      'How it works',
      'Become a host',
      'Help',
    ]);
    expect(screen.queryByRole('navigation', { name: 'Your account' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('adds Trips for a Guest and swaps Become a host for Hosting once they’ve applied', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<MobileMenu open onOpenChange={onOpenChange} user={hostUser} />);

    expect(links('Main').map(([label]) => label)).toEqual(['Browse cars', 'How it works', 'Help']);
    expect(links('Your account')).toEqual([
      ['Trips', '/trips'],
      ['Messages', '/messages'],
      ['Saved cars', '/saved'],
      ['Hosting', '/host'],
      ['Notifications', '/notifications'],
      ['Reviews', '/account/reviews'],
      ['Account', '/account'],
    ]);
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();

    // Choosing a link closes the sheet.
    await userEvent.click(screen.getByRole('link', { name: 'Trips' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps Become a host for a signed-in Guest who hasn’t applied', () => {
    renderWithProviders(<MobileMenu open onOpenChange={() => undefined} user={guest} />);

    expect(links('Main').map(([label]) => label)).toContain('Become a host');
    expect(links('Your account')).toEqual([
      ['Trips', '/trips'],
      ['Messages', '/messages'],
      ['Saved cars', '/saved'],
      ['Notifications', '/notifications'],
      ['Reviews', '/account/reviews'],
      ['Account', '/account'],
    ]);
  });

  it('shows how many messages wait beside Messages', async () => {
    mockHeaderApi(guest, 120);
    renderWithProviders(<MobileMenu open onOpenChange={() => undefined} user={guest} />);

    const messages = await screen.findByRole('link', { name: 'Messages, 120 unread' });
    expect(messages).toHaveAttribute('href', '/messages');
    // Short on screen, in full for screen readers.
    expect(within(messages).getByText('99+')).toBeInTheDocument();
  });
});
