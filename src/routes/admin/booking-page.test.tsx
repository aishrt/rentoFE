import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBookingDetail } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { bookingDetail, payment, payout } from '@/features/admin/bookings/test-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminBookingPage } from './booking-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/admin/bookings/:ref',
        element: (
          <>
            <AdminBookingPage />
            <Toaster />
          </>
        ),
      },
    ],
    '/admin/bookings/RV-7K2Q9M',
  );

const ok = (body: unknown) => ({ status: 200, body });
const section = async (name: string) => within(await screen.findByRole('region', { name }));
const header = async () => within((await screen.findByRole('heading', { level: 1 })).closest('header')!);

/** The same booking after a change: its status and history, as the API returns it. */
const withStatus = (
  detail: AdminBookingDetail,
  status: AdminBookingDetail['booking']['status'],
  reason: string,
) => ({
  ...detail,
  booking: { ...detail.booking, status },
  statusHistory: [...detail.statusHistory, { status, at: '2026-12-01T00:00:00.000Z', reason }],
});

describe('AdminBookingPage: the record', () => {
  it('shows the trip, both parties, the history, payments, payouts and cases', async () => {
    mockApi({ 'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()) });
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Booking RV-7K2Q9M' })).toBeInTheDocument();
    const top = await header();
    expect(top.getByRole('link', { name: '2022 Toyota RAV4' })).toHaveAttribute(
      'href',
      '/admin/vehicles/car-rav4',
    );
    expect(top.getByText('Confirmed')).toBeInTheDocument();

    const trip = await section('Trip');
    expect(trip.getByText('Pickup in Frankton')).toBeInTheDocument();
    expect(trip.getByText('12 Hawthorne Drive, Frankton, Queenstown 9300')).toBeInTheDocument();
    expect(trip.getByText('Queenstown Airport')).toBeInTheDocument();
    expect(trip.getByText(/Basic protection$/)).toBeInTheDocument();
    expect(trip.getByText('Weekly discount (10%)')).toBeInTheDocument();
    expect(trip.getByText('$1,050.80')).toBeInTheDocument();

    const parties = await section('Guest and Host');
    expect(parties.getByRole('link', { name: 'Kiri Tane' })).toHaveAttribute('href', '/admin/users/u2');
    expect(parties.getByRole('link', { name: 'kiri@example.co.nz' })).toHaveAttribute(
      'href',
      'mailto:kiri@example.co.nz',
    );
    expect(parties.getByRole('link', { name: '+64211112222' })).toHaveAttribute('href', 'tel:+64211112222');
    expect(parties.getByRole('link', { name: 'Liam Walker' })).toHaveAttribute('href', '/admin/users/u3');
    expect(parties.getByText('No mobile number')).toBeInTheDocument();

    const history = await section('Status history');
    expect(history.getByText('Checkout')).toBeInTheDocument();
    expect(history.getByText('Confirmed')).toBeInTheDocument();

    const payments = await section('Payments');
    expect(payments.getByText('Part refunded')).toBeInTheDocument();
    expect(payments.getByText(/Visa ending 4242/)).toBeInTheDocument();
    expect(payments.getByText('$25')).toBeInTheDocument();
    expect(payments.getByText(/Funded by the Host/)).toBeInTheDocument();
    expect(payments.getByText('The car wasn’t cleaned before pick-up')).toBeInTheDocument();
    expect(payments.getByText('$1,025.80 can still be refunded.')).toBeInTheDocument();

    const payouts = await section('Payouts');
    // A hold is a wait, not a failure: not in the danger colour.
    expect(payouts.getByText('Held')).not.toHaveClass('text-danger');
    expect(payouts.getByText('Held: Waiting for check-in')).toBeInTheDocument();

    const cases = await section('Incidents and tickets');
    const incident = within(cases.getByRole('listitem', { name: 'Incident IN-4F7K2P' }));
    expect(incident.getByRole('link', { name: 'IN-4F7K2P' })).toHaveAttribute(
      'href',
      '/admin/incidents/IN-4F7K2P',
    );
    expect(incident.getByText('Incident: Damage')).toBeInTheDocument();
    expect(incident.getByRole('link', { name: /^Messages/ })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M/thread?context=INCIDENT:IN-4F7K2P',
    );
    const ticket = within(cases.getByRole('listitem', { name: 'Ticket ST-8H2K4M' }));
    expect(ticket.getByRole('link', { name: 'ST-8H2K4M' })).toHaveAttribute(
      'href',
      '/admin/support/ST-8H2K4M',
    );
    expect(ticket.getByRole('link', { name: /^Messages/ })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M/thread?context=TICKET:ST-8H2K4M',
    );
    expect(cases.getByText(/Each opening is recorded in the audit log/)).toBeInTheDocument();
  });

  it('shows extra charges, failures, a paid payout and a failed one', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(
        bookingDetail({
          extraCharges: [
            {
              id: 'x1',
              type: 'EXTRA_KM',
              description: '120 km over the allowance',
              amountCents: 4_200,
              status: 'FAILED',
            },
          ],
          payments: [
            payment({ type: 'EXTRA_CHARGE', status: 'FAILED', failureReason: 'Your card was declined.' }),
          ],
          payouts: [
            payout({
              status: 'PAID',
              holdReason: undefined,
              paidAt: '2026-12-02T01:00:00.000Z',
              deductedCents: 1_500,
            }),
            payout({
              id: 'po2',
              type: 'EXTRA_CHARGE',
              status: 'FAILED',
              holdReason: undefined,
              failureReason: "No such destination: 'acct_1Q2w3E'",
            }),
          ],
          incidents: [],
          tickets: [],
          refundableCents: 0,
        }),
      ),
    });
    render();

    const charges = await section('Extra charges');
    expect(charges.getByText('120 km over the allowance')).toBeInTheDocument();
    expect(charges.getByText('Failed')).toBeInTheDocument();
    const payments = await section('Payments');
    expect(payments.getByText('Your card was declined.')).toBeInTheDocument();
    expect(payments.getByText('Nothing left to refund.')).toBeInTheDocument();
    const payouts = await section('Payouts');
    expect(payouts.getByText(/^Paid Wed, 2 Dec 2026/)).toBeInTheDocument();
    expect(payouts.getByText('$15')).toBeInTheDocument();
    // A plain sentence first, and Stripe's own words under it for staff to look into.
    expect(
      payouts.getByText('The transfer didn’t go through. Retry it, or check the Host’s payout setup.'),
    ).toBeInTheDocument();
    expect(payouts.getByText("No such destination: 'acct_1Q2w3E'")).not.toHaveClass('text-danger');
    expect(
      (await section('Incidents and tickets')).getByText('No incidents or support tickets.'),
    ).toBeInTheDocument();
    // Nothing to refund: no Refund button.
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('says when the booking is missing', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No such booking.' } },
      },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that booking' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search bookings' })).toHaveAttribute('href', '/admin/bookings');
  });
});

describe('AdminBookingPage: actions', () => {
  it('marks a confirmed trip as started, with a reason', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'POST /admin/bookings/RV-7K2Q9M/status': (init) => {
        sent = JSON.parse(String(init?.body));
        return ok(withStatus(bookingDetail(), 'ACTIVE', 'Changed by support: Checked in by phone'));
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Mark trip as started' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Mark the trip as started?' }));
    expect(dialog.getByText(/the Host’s trip payout, held until check-in, can go out/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Mark trip as started' }));
    expect(await dialog.findByText('Add a short reason')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(dialog.getByLabelText('Reason'), 'Checked in by phone');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark trip as started' }));

    expect(await screen.findByText('Trip marked as started')).toBeInTheDocument();
    expect(sent).toEqual({ to: 'ACTIVE', reason: 'Checked in by phone' });
    expect((await header()).getByText('On trip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark trip as completed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(
      (await section('Status history')).getByText('Changed by support: Checked in by phone'),
    ).toBeInTheDocument();
  });

  it('marks a trip under way as completed, explaining what follows', async () => {
    let sent: unknown;
    const active = withStatus(bookingDetail(), 'ACTIVE', 'Checked in');
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(active),
      'POST /admin/bookings/RV-7K2Q9M/status': (init) => {
        sent = JSON.parse(String(init?.body));
        return ok(withStatus(active, 'COMPLETED', 'Returned'));
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Mark trip as completed' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Mark the trip as completed?' }));
    expect(dialog.getByText(/reviews, check the kilometres driven/)).toBeInTheDocument();
    await userEvent.type(dialog.getByLabelText('Reason'), 'Car returned, Host confirmed by email');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark trip as completed' }));

    expect(await screen.findByText('Trip marked as completed')).toBeInTheDocument();
    expect(sent).toEqual({ to: 'COMPLETED', reason: 'Car returned, Host confirmed by email' });
    expect(screen.queryByRole('button', { name: /^Mark trip/ })).not.toBeInTheDocument();
  });

  it("shows the API's reason when the status can't change", async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'POST /admin/bookings/RV-7K2Q9M/status': {
        status: 409,
        body: { error: { code: 'TOO_EARLY', message: 'This trip starts more than a day from now.' } },
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Mark trip as started' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Reason'), 'Guest asked');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark trip as started' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('This trip starts more than a day from now.');
  });

  it('refunds in cents, funded by the Host or Rento Vroom', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'POST /admin/bookings/RV-7K2Q9M/refunds': (init) => {
        sent = JSON.parse(String(init?.body));
        const detail = bookingDetail();
        const [first] = detail.payments;
        return ok({
          ...detail,
          refundableCents: 100_581,
          payments: [
            {
              ...first!,
              refunds: [
                ...first!.refunds,
                {
                  amountCents: 1_999,
                  reason: 'Late pick-up',
                  fundedBy: 'PLATFORM',
                  status: 'SUCCEEDED',
                  at: '2026-10-03T01:00:00.000Z',
                },
              ],
            },
          ],
        });
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Refund' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Refund the Guest' }));
    expect(dialog.getByText(/Up to \$1,025.80 can still be refunded/)).toBeInTheDocument();

    // More than is left, and nobody chosen to pay for it.
    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '1100');
    await userEvent.type(dialog.getByLabelText('Reason'), 'Late pick-up');
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await dialog.findByText('You can refund up to $1,025.80')).toBeInTheDocument();
    expect(dialog.getByText('Choose who pays for the refund')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(dialog.getByLabelText('Amount (NZD)'));
    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '19.99');
    await userEvent.click(dialog.getByRole('radio', { name: /Goodwill from Rento Vroom/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));

    expect(await screen.findByText('Refund sent')).toBeInTheDocument();
    expect(sent).toEqual({ amountCents: 1_999, reason: 'Late pick-up', fundedBy: 'PLATFORM' });
    const payments = await section('Payments');
    expect(payments.getByText('$19.99')).toBeInTheDocument();
    expect(payments.getByText(/Funded by Rento Vroom/)).toBeInTheDocument();
  });

  it('says when the refunds permission is missing', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'POST /admin/bookings/RV-7K2Q9M/refunds': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: 'You don’t have access to this.' } },
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Refund' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Refund the Guest' }));
    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '25');
    await userEvent.click(dialog.getByRole('radio', { name: /Comes off the Host’s payout/ }));
    await userEvent.type(dialog.getByLabelText('Reason'), 'Dirty car');
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('You need the refunds permission');
  });

  it('cancels a confirmed booking as a platform cancellation, then reloads it', async () => {
    let sent: unknown;
    let cancelled = false;
    const fetchMock = mockApi({
      'GET /admin/bookings/RV-7K2Q9M': () =>
        ok(
          cancelled
            ? withStatus(bookingDetail(), 'CANCELLED', 'Car suspended after hail damage')
            : bookingDetail(),
        ),
      'POST /admin/bookings/RV-7K2Q9M/cancel': (init) => {
        sent = JSON.parse(String(init?.body));
        cancelled = true;
        return ok({ booking: { ...bookingDetail().booking, status: 'CANCELLED' } });
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this booking?' }));
    expect(dialog.getByText(/Treated as a Guest cancellation at the start time/)).toBeInTheDocument();
    expect(
      dialog.getByText(/the Host cancellation fee comes off the Host’s next payout/),
    ).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel booking' }));
    expect(await dialog.findByText('Choose why it’s cancelled')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('radio', { name: /Platform cancellation/ }));
    await userEvent.type(dialog.getByLabelText('Note'), 'Car suspended after hail damage');
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel booking' }));

    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument();
    expect(sent).toEqual({ reason: 'PLATFORM', note: 'Car suspended after hail damage' });
    expect(await (await header()).findByText('Cancelled')).toBeInTheDocument();
    const detailLoads = fetchMock.mock.calls.filter(
      ([input]) =>
        (input as Request).method === 'GET' && (input as Request).url.endsWith('/admin/bookings/RV-7K2Q9M'),
    );
    expect(detailLoads).toHaveLength(2);
  });
});
