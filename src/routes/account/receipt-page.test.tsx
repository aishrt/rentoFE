import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Receipt } from '@/api/types';
import { receipt } from '@/features/account/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { ReceiptPage } from './receipt-page';

beforeEach(() => {
  // jsdom can't make object URLs for downloads.
  URL.createObjectURL = vi.fn(() => 'blob:receipt');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockReceipt(answer: { status: number; body: unknown }) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /bookings/RV-7K2Q9M/receipt':
        return answer;
      case 'GET /bookings/RV-7K2Q9M/receipt.pdf':
        return { status: 200, body: '%PDF-1.3' };
      default:
        return undefined;
    }
  });
}

const paid = (overrides: Partial<Receipt> = {}) => ({ status: 200, body: { receipt: receipt(overrides) } });

const render = () =>
  renderWithRouter(
    [
      { path: '/trips/:ref/receipt', element: <ReceiptPage /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
    ],
    '/trips/RV-7K2Q9M/receipt',
  );

describe('ReceiptPage', () => {
  it('shows every line, the GST included and how it was paid', async () => {
    mockReceipt(
      paid({ supplier: { name: 'Rento Vroom', gstNumber: '123-456-789', email: 'hi@rentovroom.com' } }),
    );
    render();

    expect(await screen.findByText('GST number 123-456-789')).toBeInTheDocument();
    const details = within(screen.getByRole('region', { name: 'Details' }));
    expect(details.getByText('Visa ending 4242')).toBeInTheDocument();
    expect(details.getByText('02/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Kiri Tester')).toBeInTheDocument();

    const charges = within(screen.getByRole('region', { name: 'Charges' }));
    expect(charges.getByText('3 days × $89')).toBeInTheDocument();
    expect(charges.getByText('$267.00')).toBeInTheDocument();
    expect(charges.getByText('$338.70')).toBeInTheDocument();
    expect(charges.getByText('GST included (15%)')).toBeInTheDocument();
    expect(charges.getByText('$44.18')).toBeInTheDocument();
    // The trip's dates carry the year, for a receipt kept for years.
    expect(
      screen.getByText(/Tue, 13 Oct 2026, 10:00 am to Fri, 16 Oct 2026, 10:00 am \(NZ time\), 3 days/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Refunds' })).not.toBeInTheDocument();
  });

  it('lists refunds and what was paid after them', async () => {
    mockReceipt(
      paid({
        refunds: [{ amountCents: 5_000, status: 'SUCCEEDED', at: '2026-10-05T01:00:00.000Z' }],
        refundedCents: 5_000,
        netPaidCents: 28_870,
      }),
    );
    render();

    const refunds = within(await screen.findByRole('region', { name: 'Refunds' }));
    expect(refunds.getByText('Refund, 05/10/2026')).toBeInTheDocument();
    expect(refunds.getByText('−$50.00')).toBeInTheDocument();
    expect(refunds.getByText('$288.70')).toBeInTheDocument();
  });

  it('lists the charges after the trip that were paid, with their GST', async () => {
    mockReceipt(
      paid({
        extraCharges: [
          {
            description: '100 km over the 250 km included, at $0.35 a km',
            amountCents: 3_500,
            gstCents: 457,
            paidAt: '2026-10-09T01:00:00.000Z',
            paidWith: 'Visa ending 4242',
          },
        ],
      }),
    );
    render();

    const charges = within(await screen.findByRole('region', { name: 'Charges after the trip' }));
    expect(charges.getByText('100 km over the 250 km included, at $0.35 a km')).toBeInTheDocument();
    expect(charges.getByText('$35.00')).toBeInTheDocument();
    expect(
      charges.getByText(/Paid 09\/10\/2026 with Visa ending 4242\. GST included \(15%\) \$4\.57\./),
    ).toBeInTheDocument();
  });

  it('downloads the PDF through the API', async () => {
    const sent = mockReceipt(paid());
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Download PDF' }));

    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(sent.some((request) => request.path === '/bookings/RV-7K2Q9M/receipt.pdf')).toBe(true);
  });

  it('explains that the receipt comes once the booking is paid', async () => {
    mockReceipt({
      status: 409,
      body: { error: { code: 'NO_RECEIPT', message: 'The receipt is ready once the booking is paid for.' } },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'No receipt yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the trip' })).toHaveAttribute(
      'href',
      '/trips/RV-7K2Q9M',
    );
  });

  it('sends a Host to their booking instead', async () => {
    mockReceipt({
      status: 403,
      body: { error: { code: 'FORBIDDEN', message: 'The receipt is the guest’s.' } },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'This receipt is the guest’s' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your booking' })).toHaveAttribute(
      'href',
      '/host/bookings/RV-7K2Q9M',
    );
  });
});
