import type {
  PaymentHistoryItem,
  Receipt,
  SavedCar,
  SavedCard,
  SupportTicket,
  SupportTicketSummary,
} from '@/api/types';
import { carCard } from '@/features/vehicles/test-fixtures';

/*
 * Test data for the Guest dashboard's tests, shaped like the API's responses (src/api/schema.d.ts). Only
 * imported by tests.
 */

export function savedCar(overrides: Partial<SavedCar> = {}): SavedCar {
  return { ...carCard(), listed: true, availableForDates: null, ...overrides };
}

export function savedCard(overrides: Partial<SavedCard> = {}): SavedCard {
  return {
    id: 'pm_visa',
    brand: 'visa',
    last4: '4242',
    expMonth: 8,
    expYear: 2031,
    expired: false,
    ...overrides,
  };
}

export function paymentItem(overrides: Partial<PaymentHistoryItem> = {}): PaymentHistoryItem {
  return {
    id: 'pay1',
    bookingRef: 'RV-7K2Q9M',
    vehicleTitle: '2022 Toyota RAV4',
    type: 'BOOKING',
    amountCents: 33_870,
    status: 'SUCCEEDED',
    method: 'Visa ending 4242',
    at: '2026-10-02T01:15:00.000Z',
    refundedCents: 0,
    refunds: [],
    hasReceipt: true,
    ...overrides,
  };
}

export function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    ref: 'RV-7K2Q9M',
    paidAt: '2026-10-02T01:15:00.000Z',
    supplier: { name: 'Rento Vroom', email: 'rentovroom@gmail.com' },
    customer: { name: 'Kiri Tester', email: 'kiri@example.co.nz' },
    vehicleTitle: '2022 Toyota RAV4',
    start: '2026-10-12T21:00:00.000Z',
    end: '2026-10-15T21:00:00.000Z',
    days: 3,
    lines: [
      { label: '3 days × $89', amountCents: 26_700, gstCents: 3_483 },
      { label: 'Service fee', amountCents: 2_670, gstCents: 348 },
      { label: 'Basic protection', amountCents: 4_500, gstCents: 587 },
    ],
    totalCents: 33_870,
    gstCents: 4_418,
    gstRatePct: 15,
    paidWith: 'Visa ending 4242',
    refunds: [],
    refundedCents: 0,
    netPaidCents: 33_870,
    ...overrides,
  };
}

export function ticketSummary(overrides: Partial<SupportTicketSummary> = {}): SupportTicketSummary {
  return {
    ref: 'ST-4HX8PA',
    subject: 'Where do I collect the car?',
    category: 'BOOKING',
    status: 'OPEN',
    bookingRef: 'RV-7K2Q9M',
    createdAt: '2026-10-05T01:00:00.000Z',
    updatedAt: '2026-10-05T02:00:00.000Z',
    ...overrides,
  };
}

export function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    ...ticketSummary(),
    messages: [
      {
        id: '0',
        from: 'YOU',
        body: 'Is it at the airport?',
        attachments: [],
        createdAt: '2026-10-05T01:00:00.000Z',
      },
      {
        id: '1',
        from: 'SUPPORT',
        body: 'It’s at the Host’s home.',
        attachments: [],
        createdAt: '2026-10-05T02:00:00.000Z',
      },
    ],
    ...overrides,
  };
}
