import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithProviders } from '@/test/utils';
import { CurrencyPicker } from './currency-picker';
import { PriceWithEstimate } from './price-with-estimate';

const RATES = {
  base: 'NZD',
  date: '2026-09-28',
  source: 'European Central Bank',
  rates: { AUD: 0.89, USD: 0.585, EUR: 0.5, CAD: 0.81 },
};

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function Harness() {
  return (
    <>
      <CurrencyPicker />
      <p data-testid="price">
        <PriceWithEstimate cents={18_000} />
      </p>
    </>
  );
}

describe('CurrencyPicker', () => {
  it('shows estimates in the chosen currency and remembers the choice', async () => {
    const fetchMock = mockApi({ 'GET /exchange-rates': { status: 200, body: RATES } });
    renderWithProviders(<Harness />);

    // NZD by default: just the price, and no rates to fetch.
    expect(screen.getByTestId('price')).toHaveTextContent(/^\$180$/);
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText('Show prices in'));
    await userEvent.click(await screen.findByRole('option', { name: 'AUD · Australian dollar' }));

    await waitFor(() => expect(screen.getByTestId('price')).toHaveTextContent('NZ$180 · ≈ A$160'));
    expect(
      screen.getByTitle(/European Central Bank rate for 2026-09-28. You're charged in NZD/),
    ).toBeInTheDocument();
    expect(localStorage.getItem('rv:currency')).toBe('AUD');
  });

  it('starts with the currency chosen before', async () => {
    localStorage.setItem('rv:currency', 'EUR');
    mockApi({ 'GET /exchange-rates': { status: 200, body: RATES } });
    renderWithProviders(<Harness />);

    expect(screen.getByLabelText('Show prices in')).toHaveTextContent('EUR · Euro');
    await waitFor(() => expect(screen.getByTestId('price')).toHaveTextContent('NZ$180 · ≈ €90'));
  });

  it('shows the NZD price alone when the rates are unavailable', async () => {
    localStorage.setItem('rv:currency', 'USD');
    const fetchMock = mockApi({
      'GET /exchange-rates': {
        status: 503,
        body: { error: { code: 'RATES_UNAVAILABLE', message: 'Not available' } },
      },
    });
    renderWithProviders(<Harness />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId('price')).toHaveTextContent(/^\$180$/);
  });
});
