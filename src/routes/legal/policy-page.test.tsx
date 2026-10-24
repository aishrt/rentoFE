import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { policiesFixture } from '@/features/content/test-fixtures';
import { seoPages, isIndexable } from '@/seo/pages';
import { mockApi, renderWithProviders } from '@/test/utils';
import { policyDocuments } from './policy-documents';
import { PolicyPage } from './policy-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PolicyPage', () => {
  it('shows a draft policy with its notice, contents and related policies', async () => {
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    renderWithProviders(<PolicyPage />, '/late-returns-and-charges');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Late returns and charges' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Draft/, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getAllByText(/REQUIRES_BUSINESS_APPROVAL/).length).toBeGreaterThan(0);
    const related = screen.getByRole('navigation', { name: 'Related policies' });
    expect(within(related).getByRole('link', { name: 'Late returns and charges' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(related).getAllByRole('link')).toHaveLength(policyDocuments.length);
  });

  it('shows the current eligibility rules from the API on the driver page', async () => {
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    renderWithProviders(<PolicyPage />, '/driver-eligibility');

    expect(await screen.findByRole('heading', { name: 'Who can drive' })).toBeInTheDocument();
    expect(
      await screen.findByText(new RegExp(String(policiesFixture.eligibility.minAge))),
    ).toBeInTheDocument();
  });

  it('keeps every draft out of search results until it is signed off', () => {
    for (const policy of policyDocuments) {
      const page = seoPages.find((entry) => entry.path === policy.path);
      expect(page, policy.path).toBeDefined();
      expect(isIndexable(page!)).toBe(false);
    }
  });
});
