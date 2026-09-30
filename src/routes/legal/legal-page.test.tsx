import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { legalPageFixture, policiesFixture } from '@/features/content/test-fixtures';
import { mockApi, renderWithProviders } from '@/test/utils';
import { LegalPage } from './legal-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LegalPage', () => {
  it('reads the document for its path from the CMS, with its version and NZ date', async () => {
    const fetchMock = mockApi({
      'GET /cms/legal.privacy': {
        status: 200,
        body: {
          page: legalPageFixture({
            key: 'legal.privacy',
            title: 'Privacy Policy',
            version: '2026-09-28',
            // 12:30 on 27 September UTC is already the 28th in New Zealand.
            updatedAt: '2026-09-27T12:30:00.000Z',
            markdown:
              '# Privacy Policy\n\nWe keep **only** what we need.\n\n## Your rights\n\nAsk us any time.',
          }),
        },
      },
    });
    renderWithProviders(<LegalPage />, '/privacy');

    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Version 2026-09-28/)).toHaveTextContent(
      'Version 2026-09-28 · Last updated 28/09/2026',
    );
    expect(screen.getByText('only', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your rights' })).toBeInTheDocument();
    // The document's own title isn't repeated under the page's h1.
    expect(screen.getAllByRole('heading', { name: 'Privacy Policy' })).toHaveLength(1);

    const [request] = fetchMock.mock.calls[0] as [Request];
    expect(new URL(request.url).pathname).toBe('/api/v1/cms/legal.privacy');

    const documents = screen.getByRole('navigation', { name: 'Legal documents' });
    expect(within(documents).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(documents).getByRole('link', { name: 'Guest agreement' })).toHaveAttribute(
      'href',
      '/guest-agreement',
    );
  });

  it('shows the live cancellation tiers next to the Cancellation Policy text', async () => {
    mockApi({
      'GET /cms/legal.cancellation-policy': {
        status: 200,
        body: {
          page: legalPageFixture({
            key: 'legal.cancellation-policy',
            title: 'Cancellation Policy',
            markdown: '# Cancellation Policy\n\n*This is placeholder text.*',
          }),
        },
      },
      'GET /policies': { status: 200, body: policiesFixture },
    });
    renderWithProviders(<LegalPage />, '/cancellation-policy');

    const moderate = await screen.findByRole('article', { name: 'Moderate' });
    expect(within(moderate).getByText('Default')).toBeInTheDocument();
    const rows = within(moderate).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      '5 days or more before pickupFull refund',
      'Between 24 hours and 5 days before pickup50% refund',
      'Less than 24 hours before pickupNo refund',
    ]);
    expect(screen.getByRole('article', { name: 'Flexible' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Strict' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hosts choose Flexible, Moderate or Strict for each car. Moderate applies unless they choose another.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('This is placeholder text.', { selector: 'em' })).toBeInTheDocument();
  });

  it('leaves the tiers off the other legal pages', async () => {
    mockApi({ 'GET /cms/legal.host-agreement': { status: 200, body: { page: legalPageFixture() } } });
    renderWithProviders(<LegalPage />, '/host-agreement');

    expect(await screen.findByText('Be kind.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cancellation tiers' })).not.toBeInTheDocument();
  });

  it('says when a document can’t load, and tries again', async () => {
    let calls = 0;
    mockApi({
      'GET /cms/legal.terms': () =>
        ++calls === 1
          ? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No such page.' } } }
          : { status: 200, body: { page: legalPageFixture() } },
    });
    renderWithProviders(<LegalPage />, '/terms');

    expect(await screen.findByText('We couldn’t load this document')).toBeInTheDocument();
    // The heading falls back to the page's name from the SEO table.
    expect(screen.getByRole('heading', { level: 1, name: 'Terms and conditions' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Using Rento Vroom' })).toBeInTheDocument();
  });
});
