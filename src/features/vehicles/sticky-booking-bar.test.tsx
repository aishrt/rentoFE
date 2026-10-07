import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { StickyBookingBar } from './sticky-booking-bar';
import { vehicleDetail } from './test-fixtures';
import type { Booking } from './use-booking';

const CHECKOUT = '/book/2022-toyota-rav4-queenstown?start=2026-12-01T10%3A00&end=2026-12-09T10%3A00';

/** Just the parts of the listing's booking state the bar reads. */
function booking(overrides: Partial<Record<keyof Booking, unknown>> = {}): Booking {
  return {
    hasDates: false,
    current: false,
    canBook: false,
    checkoutUrl: CHECKOUT,
    bookLabel: 'Book',
    quote: { data: undefined },
    ...overrides,
  } as unknown as Booking;
}

function renderBar(state: Booking, visible = true) {
  const onOpen = vi.fn();
  const utils = renderWithProviders(
    <StickyBookingBar vehicle={vehicleDetail()} booking={state} visible={visible} onOpen={onOpen} />,
  );
  return { ...utils, onOpen };
}

describe('StickyBookingBar', () => {
  it('shows the daily price and opens the booking sheet to choose dates', async () => {
    const { onOpen } = renderBar(booking());

    expect(screen.getByText('/day')).toBeInTheDocument();
    expect(screen.getByText('Add your dates for the total')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose dates' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('asks to review the trip when dates are chosen but it can’t be booked yet', async () => {
    const { onOpen } = renderBar(booking({ hasDates: true }));

    await userEvent.click(screen.getByRole('button', { name: 'Review trip' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('shows the total and goes straight to checkout once the trip is priced', () => {
    renderBar(
      booking({
        hasDates: true,
        current: true,
        canBook: true,
        quote: { data: { price: { totalCents: 34_000 } } },
      }),
    );

    expect(screen.getByText('$340')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book' })).toHaveAttribute('href', CHECKOUT);
  });

  it('says Request to book for a car without Instant Book', () => {
    renderBar(booking({ hasDates: true, current: true, canBook: true, bookLabel: 'Request to book' }));

    expect(screen.getByRole('link', { name: 'Request to book' })).toHaveAttribute('href', CHECKOUT);
  });

  it('stays out of reach until the gallery has scrolled away', () => {
    const { container } = renderBar(booking(), false);

    expect(container.querySelector('[inert]')).not.toBeNull();
  });
});
