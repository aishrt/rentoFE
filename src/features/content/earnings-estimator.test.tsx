import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { EarningsEstimator } from './earnings-estimator';
import { policiesFixture } from './test-fixtures';

const total = () => screen.getByText('You’d earn about').nextElementSibling;

function renderEstimator(commission = 20) {
  return renderWithProviders(
    <EarningsEstimator estimator={policiesFixture.hostEstimator} hostCommissionPct={commission} />,
  );
}

describe('EarningsEstimator', () => {
  it('starts from an SUV booked the typical number of days, after commission', async () => {
    renderEstimator();

    expect(await screen.findByRole('button', { name: /Your car's body type/ })).toHaveTextContent('SUV');
    expect(screen.getByRole('slider', { name: 'Days booked each month' })).toHaveValue('10');
    // $95 × 10 days = $950, less 20% ($190) = $760.
    expect(screen.getByText('$950')).toBeInTheDocument();
    expect(screen.getByText('−$190')).toBeInTheDocument();
    expect(total()).toHaveTextContent('$760');
    expect(screen.getByText(/An estimate, not a promise/)).toBeInTheDocument();
  });

  it('recalculates for another body type and more booked days', async () => {
    const user = userEvent.setup();
    renderEstimator();

    await user.click(await screen.findByRole('button', { name: /Your car's body type/ }));
    await user.click(screen.getByRole('option', { name: 'Convertible' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Days booked each month' }), {
      target: { value: '15' },
    });

    // $130 × 15 days = $1,950, less 20% = $1,560.
    expect(total()).toHaveTextContent('$1,560');
    expect(
      screen.getByText(/A typical convertible at \$130 a day, booked 15 days a month/),
    ).toBeInTheDocument();
  });

  it('steps a day at a time, within a month', async () => {
    const user = userEvent.setup();
    renderEstimator(10);

    await user.click(await screen.findByRole('button', { name: 'One day more' }));
    // $95 × 11 days = $1,045, less 10% = $940.50, shown as $941.
    expect(total()).toHaveTextContent('$941');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'One day fewer' })).toBeDisabled();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '1 day a month');
  });
});
