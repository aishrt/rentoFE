import type {
  AdminBookingDetail,
  AdminBookingRow,
  AdminPayment,
  AdminPayout,
  StaffThread,
} from '@/api/types';
import { confirmedBooking } from '@/features/booking/test-fixtures';
import { message, threadDetail } from '@/features/messages/test-fixtures';

/*
 * Test data for the staff portal's booking pages, shaped like the API's responses (src/api/schema.d.ts).
 * Only imported by tests.
 */

/** Kiri's trip in Liam's RAV4, 1 to 9 December, as a row in the search. */
export function bookingRow(overrides: Partial<AdminBookingRow> = {}): AdminBookingRow {
  return {
    id: 'bk1',
    ref: 'RV-7K2Q9M',
    status: 'CONFIRMED',
    vehicleTitle: '2022 Toyota RAV4',
    guest: { id: 'u2', name: 'Kiri Tane' },
    host: { id: 'u3', name: 'Liam Walker' },
    start: '2026-11-30T21:00:00.000Z',
    end: '2026-12-08T21:00:00.000Z',
    totalCents: 105_080,
    createdAt: '2026-10-01T01:00:00.000Z',
    ...overrides,
  };
}

export function payment(overrides: Partial<AdminPayment> = {}): AdminPayment {
  return {
    id: 'pay1',
    bookingRef: 'RV-7K2Q9M',
    guestName: 'Kiri Tane',
    type: 'BOOKING',
    amountCents: 105_080,
    status: 'SUCCEEDED',
    method: 'Visa ending 4242',
    refundedCents: 0,
    refunds: [],
    createdAt: '2026-10-01T01:05:00.000Z',
    ...overrides,
  };
}

export function payout(overrides: Partial<AdminPayout> = {}): AdminPayout {
  return {
    id: 'po1',
    bookingRef: 'RV-7K2Q9M',
    host: { id: 'u3', name: 'Liam Walker' },
    type: 'TRIP',
    status: 'HELD',
    holdReason: 'TRIP_NOT_STARTED',
    amountCents: 73_600,
    deductedCents: 0,
    scheduledFor: '2026-12-01T21:00:00.000Z',
    ...overrides,
  };
}

/** The whole record of a confirmed booking with one refund, a held payout, an incident and a ticket. */
export function bookingDetail(overrides: Partial<AdminBookingDetail> = {}): AdminBookingDetail {
  return {
    booking: confirmedBooking({ role: 'STAFF' }),
    guest: { id: 'u2', name: 'Kiri Tane', email: 'kiri@example.co.nz', phone: '+64211112222' },
    host: { id: 'u3', name: 'Liam Walker', email: 'liam@example.co.nz' },
    statusHistory: [
      { status: 'PAYMENT_PENDING', at: '2026-10-01T01:00:00.000Z' },
      { status: 'CONFIRMED', at: '2026-10-01T01:05:00.000Z' },
    ],
    extraCharges: [],
    payments: [
      payment({
        status: 'PARTIALLY_REFUNDED',
        refundedCents: 2_500,
        refunds: [
          {
            amountCents: 2_500,
            reason: 'The car wasn’t cleaned before pick-up',
            fundedBy: 'HOST',
            status: 'SUCCEEDED',
            at: '2026-10-02T01:00:00.000Z',
          },
        ],
      }),
    ],
    payouts: [payout()],
    incidents: [{ ref: 'IN-4F7K2P', type: 'DAMAGE', status: 'INVESTIGATING' }],
    tickets: [{ ref: 'ST-8H2K4M', subject: 'Where do I pick up the keys?', status: 'OPEN' }],
    refundableCents: 102_580,
    ...overrides,
  };
}

/** The booking's conversation as staff read it: THEM is the Guest, ME the Host. */
export function staffThread(overrides: Partial<StaffThread> = {}): StaffThread {
  return {
    thread: threadDetail({
      role: 'STAFF',
      canSend: false,
      readOnlyReason: 'Support staff read threads; they reply through the incident or ticket.',
    }),
    guest: { id: 'u2', firstName: 'Kiri' },
    host: { id: 'u3', firstName: 'Liam' },
    messages: [
      message({ id: 'm1', from: 'THEM', sender: 'GUEST', body: 'Is the car ready for 10?' }),
      message({
        id: 'm2',
        from: 'ME',
        sender: 'HOST',
        body: 'Yes, keys are in the lockbox.',
        createdAt: '2026-10-06T01:05:00.000Z',
      }),
    ],
    ...overrides,
  };
}
