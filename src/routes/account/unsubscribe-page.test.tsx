import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { UnsubscribePage } from './unsubscribe-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

function render(token: string, answer: { status: number; body?: unknown }) {
  const sent = mockRoutes(({ method, path }) =>
    method === 'POST' && path === '/notifications/unsubscribe' ? answer : undefined,
  );
  renderWithRouter([{ path: '/unsubscribe', element: <UnsubscribePage /> }], `/unsubscribe?token=${token}`);
  return sent;
}

const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Confirm unsubscribe' }));

describe('UnsubscribePage', () => {
  it('turns off marketing from a marketing email’s link once confirmed, without signing in', async () => {
    const sent = render('u1.sig', { status: 200, body: { unsubscribedFrom: 'MARKETING' } });
    expect(screen.getByRole('heading', { name: 'Stop news and offers?' })).toBeInTheDocument();

    await confirm();
    expect(await screen.findByRole('heading', { name: 'You’re unsubscribed' })).toBeInTheDocument();
    expect(screen.getByText(/We won’t send you news or offers/)).toBeInTheDocument();
    expect(sent.find((request) => request.path === '/notifications/unsubscribe')?.body).toEqual({
      token: 'u1.sig',
    });
  });

  it('does nothing until the button is pressed, so a link checker opening the page can’t unsubscribe', async () => {
    const sent = render('u1.sig', { status: 200, body: { unsubscribedFrom: 'MARKETING' } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent.some((request) => request.path === '/notifications/unsubscribe')).toBe(false);
    expect(screen.queryByRole('heading', { name: 'That link didn’t work' })).not.toBeInTheDocument();
  });

  it('says it was the unread-message emails when the link came from one', async () => {
    render('u1.MESSAGE_EMAILS.sig', { status: 200, body: { unsubscribedFrom: 'MESSAGE_EMAILS' } });
    expect(screen.getByRole('heading', { name: 'Stop emails about unread messages?' })).toBeInTheDocument();

    await confirm();
    expect(await screen.findByRole('heading', { name: 'You’re unsubscribed' })).toBeInTheDocument();
    expect(screen.getByText(/We won’t email you about unread messages/)).toBeInTheDocument();
  });

  it('says so when the link isn’t valid', async () => {
    render('bad.link', {
      status: 400,
      body: { error: { code: 'INVALID_LINK', message: 'This unsubscribe link isn’t valid.' } },
    });
    await confirm();
    expect(await screen.findByRole('heading', { name: 'That link didn’t work' })).toBeInTheDocument();
  });
});
