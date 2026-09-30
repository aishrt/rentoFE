import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { faqsFixture } from '@/features/content/test-fixtures';
import { mockApi, renderWithProviders } from '@/test/utils';
import { FaqPage } from './faq-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const question = (name: string) => screen.queryByRole('button', { name });

function renderFaqs() {
  const fetchMock = mockApi({ 'GET /faqs': { status: 200, body: { faqs: faqsFixture } } });
  const view = renderWithProviders(<FaqPage />, '/faq');
  return { ...view, fetchMock };
}

describe('FaqPage', () => {
  it('groups every question by category, in the order the team set', async () => {
    const { fetchMock } = renderFaqs();

    const panel = await screen.findByRole('tabpanel');
    await within(panel).findByRole('heading', { level: 2, name: 'Getting started' });
    expect(
      within(panel)
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Getting started', 'Booking', 'Hosting']);
    const booking = within(panel).getByRole('region', { name: 'Booking' });
    expect(
      within(booking)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Who can rent a car?', 'Can I cancel a booking?']);
    // One request for all of them: the switch filters on the page.
    const [request] = fetchMock.mock.calls[0] as [Request];
    expect(new URL(request.url).search).toBe('');
  });

  it('switches between everyone’s, guests’ and hosts’ questions', async () => {
    const user = userEvent.setup();
    renderFaqs();
    await screen.findByRole('button', { name: 'Who can rent a car?' });

    await user.click(screen.getByRole('tab', { name: 'Hosts' }));
    await waitFor(() => expect(question('Who can rent a car?')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'How do I list my car?' })).toBeInTheDocument();
    // Questions for everyone stay in both lists.
    expect(question('Can I cancel a booking?')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hosts' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Guests' }));
    await waitFor(() => expect(question('How do I list my car?')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Who can rent a car?' })).toBeInTheDocument();
    expect(question('How is Rento Vroom different from a rental company?')).toBeInTheDocument();
  });

  it('opens and closes each answer', async () => {
    const user = userEvent.setup();
    renderFaqs();

    const button = await screen.findByRole('button', { name: 'When do hosts get paid?' });
    const answer = screen.getByText('Your earnings for a trip are released after the trip starts.');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(answer).not.toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(answer).toBeVisible();
    expect(screen.getByRole('region', { name: 'When do hosts get paid?' })).toContainElement(answer);

    await user.click(button);
    expect(answer).not.toBeVisible();
  });

  it('adds FAQPage structured data with every question', async () => {
    const { container } = renderFaqs();
    await screen.findByRole('button', { name: 'Who can rent a car?' });

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]!.textContent ?? '');
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(faqsFixture.length);
    expect(data.mainEntity[1]).toEqual({
      '@type': 'Question',
      name: 'Who can rent a car?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You need a valid driver licence and to complete our verification checks.',
      },
    });
  });

  it('escapes the structured data so an answer can’t close the script', async () => {
    mockApi({
      'GET /faqs': {
        status: 200,
        body: { faqs: [{ ...faqsFixture[0]!, answer: '</script><script>alert(1)</script>' }] },
      },
    });
    const { container } = renderWithProviders(<FaqPage />, '/faq');
    await screen.findByRole('button', { name: faqsFixture[0]!.question });

    const script = container.querySelector('script[type="application/ld+json"]')!;
    expect(script.textContent).not.toContain('</script>');
    expect(JSON.parse(script.textContent ?? '').mainEntity[0].acceptedAnswer.text).toBe(
      '</script><script>alert(1)</script>',
    );
    expect(container.querySelectorAll('script')).toHaveLength(1);
  });

  it('offers to try again when the questions can’t load', async () => {
    let calls = 0;
    mockApi({
      'GET /faqs': () => (++calls === 1 ? { status: 500 } : { status: 200, body: { faqs: faqsFixture } }),
    });
    renderWithProviders(<FaqPage />, '/faq');

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Who can rent a car?' })).toBeInTheDocument();
    expect(screen.queryByText('We couldn’t load the questions')).not.toBeInTheDocument();
  });
});
