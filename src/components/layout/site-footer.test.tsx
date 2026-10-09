import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SiteFooter as FooterContent } from '@/api/types';
import { mockApi, renderWithProviders } from '@/test/utils';
import { SiteFooter } from './site-footer';

afterEach(() => {
  vi.unstubAllGlobals();
});

const footer = () => within(screen.getByRole('navigation', { name: 'Footer' }));

describe('SiteFooter', () => {
  it('shows the links admins chose: website pages in place, other websites in a new tab', async () => {
    const saved: FooterContent = {
      groups: [
        {
          title: 'Support',
          links: [
            { label: 'Help centre', href: '/help' },
            { label: 'Roadside help', href: 'https://aa.co.nz/roadservice' },
          ],
        },
        // No links: left out.
        { title: 'Legal', links: [] },
      ],
      socialLinks: [{ label: 'Instagram', href: 'https://instagram.com/rentovroom' }],
    };
    mockApi({ 'GET /cms/site.footer': { status: 200, body: { footer: saved } } });
    renderWithProviders(<SiteFooter />);

    // The original links show until the chosen ones load.
    expect(footer().getByRole('link', { name: 'Browse cars' })).toHaveAttribute('href', '/cars');
    expect(await footer().findByRole('link', { name: 'Roadside help' })).toHaveAttribute(
      'href',
      'https://aa.co.nz/roadservice',
    );
    expect(footer().getByRole('link', { name: 'Roadside help' })).toHaveAttribute('target', '_blank');
    expect(footer().getByRole('link', { name: 'Help centre' })).not.toHaveAttribute('target');
    expect(
      footer()
        .getAllByRole('heading')
        .map((heading) => heading.textContent),
    ).toEqual(['Support']);
    expect(
      within(screen.getByRole('list', { name: 'Rento Vroom on social media' })).getByRole('link', {
        name: 'Instagram',
      }),
    ).toHaveAttribute('href', 'https://instagram.com/rentovroom');
  });

  it('keeps the original links when the chosen ones can’t load', async () => {
    const fetchMock = mockApi({ 'GET /cms/site.footer': { status: 500 } });
    renderWithProviders(<SiteFooter />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      footer()
        .getAllByRole('heading')
        .map((heading) => heading.textContent),
    ).toEqual(['Rent', 'Host', 'Support', 'Legal']);
    expect(footer().getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByRole('list', { name: 'Rento Vroom on social media' })).not.toBeInTheDocument();
  });
});
