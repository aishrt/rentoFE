import { screen } from '@testing-library/react';
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

describe('UnsubscribePage', () => {
  it('turns off marketing from a marketing email’s link, without signing in', async () => {
    const sent = render('u1.sig', { status: 200, body: { unsubscribedFrom: 'MARKETING' } });
    expect(await screen.findByRole('heading', { name: 'You’re unsubscribed' })).toBeInTheDocument();
    expect(screen.getByText(/We won’t send you news or offers/)).toBeInTheDocument();
    expect(sent.find((request) => request.path === '/notifications/unsubscribe')?.body).toEqual({
      token: 'u1.sig',
    });
  });

  it('says it was the unread-message emails when the link came from one', async () => {
    render('u1.MESSAGE_EMAILS.sig', { status: 200, body: { unsubscribedFrom: 'MESSAGE_EMAILS' } });
    expect(await screen.findByRole('heading', { name: 'You’re unsubscribed' })).toBeInTheDocument();
    expect(screen.getByText(/We won’t email you about unread messages/)).toBeInTheDocument();
  });

  it('says so when the link isn’t valid', async () => {
    render('bad.link', {
      status: 400,
      body: { error: { code: 'INVALID_LINK', message: 'This unsubscribe link isn’t valid.' } },
    });
    expect(await screen.findByRole('heading', { name: 'That link didn’t work' })).toBeInTheDocument();
  });
});
