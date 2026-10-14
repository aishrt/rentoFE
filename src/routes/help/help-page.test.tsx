import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HelpArticleSummary } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { HelpArticlePage } from './help-article-page';
import { HelpPage } from './help-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const article = (overrides: Partial<HelpArticleSummary>): HelpArticleSummary => ({
  slug: 'how-booking-works',
  title: 'How booking works',
  category: 'Booking',
  audience: 'GUEST',
  summary: 'Search by place and dates, then book in a few steps.',
  ...overrides,
});

const ARTICLES = [
  article({}),
  article({
    slug: 'getting-paid',
    title: 'Getting paid',
    category: 'Hosting',
    audience: 'HOST',
    summary: 'Payouts.',
  }),
  article({
    slug: 'what-it-costs',
    title: 'What the price includes',
    category: 'Booking',
    summary: 'GST and fees.',
  }),
];

function mockHelp() {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: null } };
      case 'GET /help/articles': {
        const audience = request.query.get('audience');
        const articles = audience
          ? ARTICLES.filter((item) => item.audience === audience || item.audience === 'ALL')
          : ARTICLES;
        return { status: 200, body: { articles } };
      }
      case 'GET /help/articles/how-booking-works':
        return {
          status: 200,
          body: {
            article: {
              slug: 'how-booking-works',
              title: 'How booking works',
              category: 'Booking',
              audience: 'GUEST',
              body: 'Search by place and dates.\n\n## Instant Book and requests\n\n- **Instant Book** cars are confirmed at once.',
              updatedAt: '2026-10-01T00:00:00.000Z',
            },
          },
        };
      case 'GET /help/articles/gone':
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } };
      default:
        return undefined;
    }
  });
}

const render = (path: string) =>
  renderWithRouter(
    [
      { path: '/help', element: <HelpPage /> },
      { path: '/help/:slug', element: <HelpArticlePage /> },
    ],
    path,
  );

describe('HelpPage', () => {
  it('groups the guides by topic, in order, each opening its article', async () => {
    mockHelp();
    render('/help');

    const booking = within(await screen.findByRole('region', { name: 'Booking' }));
    expect(booking.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/help/how-booking-works',
      '/help/what-it-costs',
    ]);
    expect(booking.getByText('Search by place and dates, then book in a few steps.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Hosting' })).toBeInTheDocument();
  });

  it('asks for the guides for Guests or Hosts', async () => {
    const sent = mockHelp();
    render('/help');

    await screen.findByRole('region', { name: 'Hosting' });
    await userEvent.click(screen.getByRole('tab', { name: 'Hosts' }));

    expect(await screen.findByRole('link', { name: /Getting paid/ })).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByRole('region', { name: 'Booking' })).not.toBeInTheDocument());
    expect(sent.at(-1)?.query.get('audience')).toBe('HOST');
  });
});

describe('HelpArticlePage', () => {
  it('shows the guide from its Markdown, under the page’s one heading', async () => {
    mockHelp();
    render('/help/how-booking-works');

    expect(await screen.findByRole('heading', { level: 1, name: 'How booking works' })).toBeInTheDocument();
    expect(screen.getByText('Booking · For guests')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Instant Book and requests' })).toBeInTheDocument();
    expect(screen.getByText('Instant Book')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Help centre' })).toHaveAttribute('href', '/help');
  });

  it('says when a guide can’t be found', async () => {
    mockHelp();
    render('/help/gone');

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that guide' })).toBeInTheDocument();
  });
});
