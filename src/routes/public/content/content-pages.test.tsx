import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteHeader } from '@/components/layout/site-header';
import { faqsFixture, policiesFixture } from '@/features/content/test-fixtures';
import { mockApi, renderWithProviders } from '@/test/utils';
import { AboutPage } from './about-page';
import { BecomeAHostPage } from './become-a-host-page';
import { HowItWorksPage } from './how-it-works-page';
import { SafetyPage } from './safety-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Header navigation', () => {
  it('links to the public pages instead of homepage sections', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: null } } });
    renderWithProviders(<SiteHeader />, '/faq');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works');
    expect(within(nav).getByRole('link', { name: 'Become a host' })).toHaveAttribute(
      'href',
      '/become-a-host',
    );
    const help = within(nav).getByRole('link', { name: 'Help' });
    expect(help).toHaveAttribute('href', '/faq');
    expect(help).toHaveAttribute('aria-current', 'page');
  });
});

describe('HowItWorksPage', () => {
  it('walks through both journeys and shows who can drive from the rules in force', async () => {
    const user = userEvent.setup();
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    renderWithProviders(<HowItWorksPage />, '/how-it-works');

    expect(await screen.findByRole('heading', { level: 3, name: 'Search and compare' })).toBeInTheDocument();
    expect(await screen.findByText('Be 21 or older')).toBeInTheDocument();
    expect(screen.getByText('Hold a full New Zealand licence or an overseas licence')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sharing your car' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Apply to host' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Search and compare' })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole('link', { name: /Browse cars/ })[0]).toHaveAttribute('href', '/cars');
  });
});

describe('BecomeAHostPage', () => {
  it('estimates earnings, lists what is needed and answers host questions', async () => {
    const fetchMock = mockApi({
      'GET /policies': { status: 200, body: policiesFixture },
      'GET /faqs': { status: 200, body: { faqs: faqsFixture.filter((faq) => faq.audience !== 'GUEST') } },
    });
    renderWithProviders(<BecomeAHostPage />, '/become-a-host');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Have a car? Earn money by sharing it.' }),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: /Start your listing/ })) {
      expect(link).toHaveAttribute('href', '/host/apply');
    }

    expect(await screen.findByText('You’d earn about')).toBeInTheDocument();
    expect(screen.getByText('Warrant of Fitness (WOF)')).toBeInTheDocument();
    expect(screen.getByText('You’ll also need the car’s VIN or chassis number.')).toBeInTheDocument();
    expect(screen.getByText('Driver’s side')).toBeInTheDocument();
    expect(screen.getByText('From $20 to $2,000 a day, set by you')).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'When do hosts get paid?' })).toBeInTheDocument();
    const faqRequest = fetchMock.mock.calls
      .map(([request]) => new URL((request as Request).url))
      .find((url) => url.pathname.endsWith('/faqs'));
    expect(faqRequest?.searchParams.get('audience')).toBe('HOST');
  });
});

describe('SafetyPage', () => {
  it('says what to do after an accident, theft or breakdown, 111 first', async () => {
    renderWithProviders(<SafetyPage />, '/safety');

    const steps = await screen.findByRole('heading', { name: 'Three steps, in this order' });
    const section = steps.closest('section')!;
    const headings = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings.slice(0, 3)).toEqual([
      'Call 111 in an emergency',
      'Call roadside assistance',
      'Report it from your trip',
    ]);
    expect(within(section).getByRole('link', { name: /Call 111/ })).toHaveAttribute('href', 'tel:111');
    expect(screen.getByRole('heading', { name: 'After an accident' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'If the car is stolen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'If it breaks down' })).toBeInTheDocument();
    expect(screen.getByText(/go to the car’s registered owner/)).toBeInTheDocument();
  });
});

describe('AboutPage', () => {
  it('tells the idea and the values', async () => {
    renderWithProviders(<AboutPage />, '/about');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cars from the people who live here.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Made for New Zealand' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Honest pricing' })).toBeInTheDocument();
  });
});
