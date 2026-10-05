import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { policiesFixture } from '@/features/content/test-fixtures';
import { mockApi, renderWithProviders } from '@/test/utils';
import { InsurancePage } from './insurance-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InsurancePage', () => {
  it('lists the protection plans in force, with the one included by default', async () => {
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    renderWithProviders(<InsurancePage />, '/insurance');

    const plans = await screen.findAllByRole('article');
    expect(plans.map((plan) => within(plan).getByRole('heading').textContent)).toEqual([
      'Basic',
      'Standard',
      'Premium',
    ]);

    const basic = screen.getByRole('article', { name: 'Basic' });
    expect(within(basic).getByText('Included by default')).toBeInTheDocument();
    expect(within(basic).getByText('Damage and theft cover with a $3,000 excess.')).toBeInTheDocument();
    expect(within(basic).getByText('$15')).toBeInTheDocument();
    expect(within(basic).getByText('$3,000')).toBeInTheDocument();

    const premium = screen.getByRole('article', { name: 'Premium' });
    expect(within(premium).queryByText('Included by default')).not.toBeInTheDocument();
    expect(within(premium).getByText('$45')).toBeInTheDocument();
    expect(within(premium).getByText('$500')).toBeInTheDocument();

    expect(
      screen.getByText('Basic is included with every trip unless you choose another plan at checkout.'),
    ).toBeInTheDocument();
  });

  it('shows the roadside assistance number once an admin has set it', async () => {
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    const { unmount } = renderWithProviders(<InsurancePage />, '/insurance');
    await screen.findAllByRole('article');
    expect(screen.queryByText(/Call roadside assistance/)).not.toBeInTheDocument();
    unmount();

    mockApi({
      'GET /policies': {
        status: 200,
        body: { ...policiesFixture, roadsideAssistance: { phone: '0800 123 456' } },
      },
    });
    renderWithProviders(<InsurancePage />, '/insurance');
    expect(await screen.findByRole('link', { name: '0800 123 456' })).toHaveAttribute(
      'href',
      'tel:0800123456',
    );
  });

  it('explains the excess for each plan, and that final terms come from the insurance partner', async () => {
    mockApi({ 'GET /policies': { status: 200, body: policiesFixture } });
    renderWithProviders(<InsurancePage />, '/insurance');

    const excess = await screen.findByText('Excess by plan');
    const comparison = excess.parentElement!;
    expect(await within(comparison).findByText('$1,500')).toBeInTheDocument();
    expect(within(comparison).getAllByText(/You’d pay up to/)).toHaveLength(3);
    expect(screen.getByText('Final cover terms come from our insurance partner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choosing a plan' })).toBeInTheDocument();
  });

  it('offers to try again when the plans can’t load', async () => {
    let calls = 0;
    mockApi({
      'GET /policies': () => (++calls === 1 ? { status: 503 } : { status: 200, body: policiesFixture }),
    });
    renderWithProviders(<InsurancePage />, '/insurance');

    expect(await screen.findByText('We couldn’t load the protection plans')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article', { name: 'Standard' })).toBeInTheDocument();
  });
});
