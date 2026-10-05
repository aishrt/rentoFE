import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { quote } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { PriceBreakdown } from './price-breakdown';

afterEach(() => localStorage.clear());

/** The label and amount of each line in a group, as read on screen. */
function lines(group: HTMLElement) {
  return within(group)
    .getAllByRole('term')
    .map((term) => `${term.textContent} ${term.nextElementSibling?.textContent}`);
}

describe('PriceBreakdown', () => {
  it('groups the lines as Mandatory and Optional, with the discount on its own line', () => {
    const { lineItems, price } = quote();
    renderWithProviders(<PriceBreakdown lineItems={lineItems} price={price} />);

    expect(lines(screen.getByRole('region', { name: 'Mandatory' }))).toEqual([
      '8 days × $115 $920.00',
      'Weekly discount (10%) −$92.00',
      'Service fee $82.80',
      'Basic protection (8 × $15) $120.00',
    ]);
    expect(lines(screen.getByRole('region', { name: 'Optional' }))).toEqual([
      'Airport return: Queenstown Airport $20.00',
    ]);
  });

  it('shows the GST included, then the total in NZD in bold', () => {
    const { lineItems, price } = quote();
    renderWithProviders(<PriceBreakdown lineItems={lineItems} price={price} />);

    expect(screen.getByText('GST included in the total').nextElementSibling).toHaveTextContent('$137.06');
    const total = screen.getByText('Total NZD');
    expect(total).toHaveClass('font-semibold');
    expect(total.nextElementSibling).toHaveTextContent('$1,050.80');
  });

  it('leaves out the Optional group when there is nothing optional', () => {
    const { lineItems, price } = quote();
    renderWithProviders(
      <PriceBreakdown lineItems={lineItems.filter((item) => item.mandatory)} price={price} />,
    );
    expect(screen.queryByRole('region', { name: 'Optional' })).not.toBeInTheDocument();
  });
});
