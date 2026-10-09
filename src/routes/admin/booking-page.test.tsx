import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBookingDetail, AdminCancellationPreview } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { bookingDetail, payment, payout } from '@/features/admin/bookings/test-fixtures';
import { handover, report } from '@/features/handover/test-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminBookingPage } from './booking-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/bookings/RV-7K2Q9M') =>
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
    path,
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

const hostNoShowPreview: AdminCancellationPreview = {
  reason: 'HOST_NO_SHOW',
  allowed: true,
  kind: 'HOST_CANCELLATION',
  refundCents: 102_580,
  feeCents: 0,
  hostShareCents: 0,
  hostFeeCents: 5_000,
  releasedCents: 0,
  refundPct: 100,
  hoursBeforeStart: 0,
  message:
    'A Host cancellation: the Guest gets $1025.80 back, a full refund. A Host cancellation fee of $50.00 comes off the Host’s next payout.',
};

const platformPreview: AdminCancellationPreview = {
  ...hostNoShowPreview,
  reason: 'PLATFORM',
  kind: 'PLATFORM_CANCELLATION',
  hostFeeCents: 0,
  message: 'The Guest gets $1025.80 back, a full refund, and the Host pays no fee.',
};

/** The reason the cancel dialog last asked the preview for. */
const previewReason = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/cancellation-preview'))
    .at(-1)
    ?.searchParams.get('reason');

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
    // Without readings there's no check-out record, so the dialog points to the handover form instead.
    expect(
      dialog.getByText(/no readings are recorded, so extra kilometres can’t be charged/),
    ).toBeInTheDocument();
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
    expect(dialog.getByText('Up to $1,025.80.')).toBeInTheDocument();

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
      // The policy engine's answer for whichever reason is chosen.
      'GET /admin/bookings/RV-7K2Q9M/cancellation-preview': () =>
        ok(previewReason(fetchMock) === 'HOST_NO_SHOW' ? hostNoShowPreview : platformPreview),
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

    // The refund preview follows the reason chosen (plan §8.2).
    await userEvent.click(dialog.getByRole('radio', { name: /The Host didn’t show/ }));
    const preview = within(await dialog.findByRole('region', { name: 'What this cancellation does' }));
    expect(await preview.findByText('Host cancellation fee')).toBeInTheDocument();
    expect(preview.getByText('$50')).toBeInTheDocument();
    expect(preview.getByText(hostNoShowPreview.message)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('radio', { name: /Platform cancellation/ }));
    expect(await preview.findByText(platformPreview.message)).toBeInTheDocument();
    expect(preview.getByText('Refund to the Guest')).toBeInTheDocument();
    expect(preview.getByText('$1,025.80')).toBeInTheDocument();
    expect(preview.queryByText('Host cancellation fee')).not.toBeInTheDocument();
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

  it('cancels a pending request as a platform cancellation, releasing the hold on the card', async () => {
    let sent: unknown;
    let cancelled = false;
    const requested: AdminBookingDetail = {
      ...bookingDetail(),
      booking: { ...bookingDetail().booking, status: 'PENDING' },
      payments: [payment({ status: 'AUTHORISED' })],
      payouts: [],
      refundableCents: 0,
    };
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': () =>
        ok(cancelled ? withStatus(requested, 'CANCELLED', 'The car failed its WOF') : requested),
      'GET /admin/bookings/RV-7K2Q9M/cancellation-preview': ok({
        ...platformPreview,
        refundCents: 0,
        releasedCents: 105_080,
        message:
          'Nothing has been charged yet: the $1050.80 held on the Guest’s card is released, and nobody pays a fee.',
      }),
      'POST /admin/bookings/RV-7K2Q9M/cancel': (init) => {
        sent = JSON.parse(String(init?.body));
        cancelled = true;
        return ok({ booking: { ...requested.booking, status: 'CANCELLED' } });
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel request' }));
    // A request has no trip yet, so no handover either.
    expect(screen.queryByRole('region', { name: 'Handover' })).not.toBeInTheDocument();
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this request?' }));
    // A no-show needs a confirmed trip: only a platform cancellation is offered, already chosen.
    const reasons = dialog.getAllByRole('radio');
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toBeChecked();
    const preview = within(await dialog.findByRole('region', { name: 'What this cancellation does' }));
    expect(await preview.findByText('Released from the Guest’s card')).toBeInTheDocument();
    expect(preview.getByText('$1,050.80')).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('Note'), 'The car failed its WOF');
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel request' }));

    expect(await screen.findByText('Request cancelled')).toBeInTheDocument();
    expect(sent).toEqual({ reason: 'PLATFORM', note: 'The car failed its WOF' });
    expect(await (await header()).findByText('Cancelled')).toBeInTheDocument();
  });

  it('says in the dialog when the policy engine refuses a cancellation', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'GET /admin/bookings/RV-7K2Q9M/cancellation-preview': ok({
        ...platformPreview,
        allowed: false,
        kind: null,
        refundCents: 0,
        message: "This booking's payment isn't complete, so there's nothing to refund yet.",
      }),
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this booking?' }));
    await userEvent.click(dialog.getByRole('radio', { name: /Platform cancellation/ }));
    expect(await dialog.findByText('This cancellation isn’t possible')).toBeInTheDocument();
    expect(dialog.getByText(/nothing to refund yet/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Cancel booking' })).toBeDisabled();
  });
});

describe('AdminBookingPage: opening a case', () => {
  it('opens a case on this booking for one party, and goes to it', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(bookingDetail()),
      'POST /admin/incidents': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 201, body: { incident: { caseRef: 'IN-NEW123', bookingRef: 'RV-7K2Q9M' } } };
      },
    });
    const { router } = renderWithRouter(
      [
        { path: '/admin/bookings/:ref', element: <AdminBookingPage /> },
        { path: '/admin/incidents/:ref', element: <p>Case page</p> },
      ],
      '/admin/bookings/RV-7K2Q9M',
    );

    await userEvent.click(
      (await section('Incidents and tickets')).getByRole('button', { name: 'Open a case' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Open a case' }));
    // The booking is this one; the damage-report window doesn't apply.
    expect(dialog.getByText('RV-7K2Q9M')).toBeInTheDocument();
    expect(dialog.queryByLabelText('Booking reference')).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Open the case' }));
    expect(await dialog.findByText('Choose what happened')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.click(dialog.getByRole('button', { name: /^What happened/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Toll' }));
    await userEvent.type(
      dialog.getByLabelText('Description'),
      'Unpaid toll on the Tauranga Eastern Link during the trip.',
    );
    await userEvent.click(dialog.getByRole('radio', { name: /Guest only/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Open the case' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/incidents/IN-NEW123'));
    expect(sent).toEqual({
      bookingRef: 'RV-7K2Q9M',
      type: 'TOLL',
      description: 'Unpaid toll on the Tauranga Eastern Link during the trip.',
      attachments: [],
      visibility: 'GUEST',
    });
  });
});

describe('AdminBookingPage: handover', () => {
  const NO_ACTIONS = {
    checkIn: false,
    checkOut: false,
    confirmCheckIn: false,
    confirmCheckOut: false,
    flagDamage: false,
  };

  it('shows both reports: photos with their capture times, readings, damage, and who recorded and confirmed them', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(withStatus(bookingDetail(), 'COMPLETED', 'Check-out done')),
      'GET /bookings/RV-7K2Q9M/inspections': ok({
        handover: handover({
          role: 'STAFF',
          bookingStatus: 'COMPLETED',
          checkIn: report({ confirmedByGuestAt: '2026-10-11T21:10:00.000Z' }),
          checkOut: report({
            stage: 'CHECK_OUT',
            submittedBy: 'GUEST',
            odometer: 46_010,
            fuelOrBatteryPct: 40,
            notes: 'Left at the airport car park',
            submittedAt: '2026-10-14T21:05:00.000Z',
            confirmedByGuestAt: '2026-10-14T21:05:00.000Z',
            confirmedByHostAt: undefined,
            photos: [
              {
                angle: 'DASHBOARD',
                url: 'https://api.test/files/private/out-dashboard.jpg',
                takenBy: 'GUEST',
                takenAt: '2026-10-14T21:00:00.000Z',
                uploadedAt: '2026-10-14T21:01:00.000Z',
              },
            ],
            damagePins: [{ id: 'p2', x: 50, y: 95, note: 'Dent', newDamage: true, flaggedBy: 'GUEST' }],
          }),
          kilometres: { driven: 800, allowance: 750, extra: 50, extraChargeCents: 1_750 },
          fuelShortfall: true,
          actions: NO_ACTIONS,
        }),
      }),
    });
    render();

    const card = await section('Handover');
    expect(await card.findByText('800 km driven of 750 km included')).toBeInTheDocument();
    expect(card.getByText('50 extra km: $17.50 charged to the Guest.')).toBeInTheDocument();
    expect(card.getByText('Returned with less fuel than the policy asks.')).toBeInTheDocument();

    const checkIn = within(card.getByRole('region', { name: 'Check-in' }));
    expect(checkIn.getByText(/^Recorded by the Host, /)).toBeInTheDocument();
    expect(checkIn.getByText('45,210 km')).toBeInTheDocument();
    expect(checkIn.getByText('80%')).toBeInTheDocument();
    expect(checkIn.getByText(/^Guest confirmed /)).toBeInTheDocument();
    expect(checkIn.getByText(/^Host confirmed /)).toBeInTheDocument();
    expect(checkIn.getByText('Scuff', { exact: false })).toBeInTheDocument();
    expect(checkIn.getByRole('img', { name: 'Front at check-in' })).toHaveAttribute(
      'src',
      'https://api.test/files/private/FRONT.jpg',
    );
    expect(checkIn.getAllByText(/Taken .* by the Host$/)).toHaveLength(8);

    const checkOut = within(card.getByRole('region', { name: 'Check-out' }));
    expect(checkOut.getByText(/^Recorded by the Guest, /)).toBeInTheDocument();
    expect(checkOut.getByText('46,010 km')).toBeInTheDocument();
    expect(checkOut.getByText('Left at the airport car park')).toBeInTheDocument();
    expect(checkOut.getByText('Host hasn’t confirmed')).toBeInTheDocument();
    expect(checkOut.getByText('(new)', { exact: false })).toBeInTheDocument();
    expect(checkOut.getByText(/marked by the Guest/)).toBeInTheDocument();
    expect(checkOut.getByRole('img', { name: 'Dashboard at check-out' })).toBeInTheDocument();
    expect(checkOut.getByText(/Taken .* by the Guest$/)).toBeInTheDocument();
    // Done: nothing left for staff to complete.
    expect(
      screen.queryByRole('region', { name: 'Complete the trip with the Host’s readings' }),
    ).not.toBeInTheDocument();
  });

  it('completes a trip whose check-out is missing with the Host’s readings, opened from the staff alert', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    let sent: unknown;
    let done = false;
    const active = withStatus(bookingDetail(), 'ACTIVE', 'Check-in done');
    const checkIn = report();
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': () =>
        ok(done ? withStatus(active, 'COMPLETED', 'Completed by support: check-out was missing') : active),
      'GET /bookings/RV-7K2Q9M/inspections': ok({
        handover: handover({ role: 'STAFF', bookingStatus: 'ACTIVE', checkIn, actions: NO_ACTIONS }),
      }),
      'POST /admin/bookings/RV-7K2Q9M/complete': (init) => {
        sent = JSON.parse(String(init?.body));
        done = true;
        return ok({
          handover: handover({
            role: 'STAFF',
            bookingStatus: 'COMPLETED',
            checkIn,
            checkOut: report({
              stage: 'CHECK_OUT',
              submittedBy: 'STAFF',
              completedBySupport: true,
              odometer: 46_010,
              fuelOrBatteryPct: 60,
              notes: 'From the Host’s photo',
              photos: [],
              damagePins: [],
              confirmedByHostAt: undefined,
            }),
            kilometres: { driven: 800, allowance: 750, extra: 50, extraChargeCents: 1_750 },
            actions: NO_ACTIONS,
          }),
        });
      },
    });
    render('/admin/bookings/RV-7K2Q9M#handover');

    const form = within(
      await screen.findByRole('region', { name: 'Complete the trip with the Host’s readings' }),
    );
    // The staff alert links here: the handover is brought into view.
    await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(form.getByText('At check-in: 45,210 km, fuel 80%.')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('Odometer (km)'), '45000');
    await userEvent.type(form.getByLabelText('Fuel (%)'), '60');
    await userEvent.click(form.getByRole('button', { name: 'Complete the trip' }));
    expect(await form.findByText('It can’t be lower than at check-in (45,210 km)')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(form.getByLabelText('Odometer (km)'));
    await userEvent.type(form.getByLabelText('Odometer (km)'), '46010');
    await userEvent.type(form.getByLabelText('Notes (optional)'), 'From the Host’s photo');
    await userEvent.click(form.getByRole('button', { name: 'Complete the trip' }));

    expect(await screen.findByText('Trip completed')).toBeInTheDocument();
    expect(screen.getByText(/50 extra km: \$17.50 is charged to the Guest’s saved card/)).toBeInTheDocument();
    expect(sent).toEqual({
      odometer: 46_010,
      fuelOrBatteryPct: 60,
      notes: 'From the Host’s photo',
      photos: [],
      damagePins: [],
    });
    const checkOut = within(await screen.findByRole('region', { name: 'Check-out' }));
    expect(checkOut.getByText('Completed by support')).toBeInTheDocument();
    expect(checkOut.getByText(/^Recorded by Rento Vroom support, /)).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Complete the trip with the Host’s readings' }),
    ).not.toBeInTheDocument();
    expect(await (await header()).findByText('Completed')).toBeInTheDocument();
    scroll.mockRestore();
  });

  it('shows the API’s reason when the trip can’t be completed', async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M': ok(withStatus(bookingDetail(), 'ACTIVE', 'Started by support')),
      'GET /bookings/RV-7K2Q9M/inspections': ok({
        handover: handover({ role: 'STAFF', bookingStatus: 'ACTIVE', actions: NO_ACTIONS }),
      }),
      'POST /admin/bookings/RV-7K2Q9M/complete': {
        status: 409,
        body: { error: { code: 'NOT_CHECK_OUT', message: 'Check-out is already done.' } },
      },
    });
    render();

    const form = within(
      await screen.findByRole('region', { name: 'Complete the trip with the Host’s readings' }),
    );
    // Marked started without a check-in: the readings are recorded, but there's nothing to compare them with.
    expect(form.getByText(/no check-in record, so extra kilometres can’t be worked out/)).toBeInTheDocument();
    expect((await section('Handover')).getByText('Check-in isn’t done yet.')).toBeInTheDocument();
    await userEvent.type(form.getByLabelText('Odometer (km)'), '46010');
    await userEvent.type(form.getByLabelText('Fuel (%)'), '55');
    await userEvent.click(form.getByRole('button', { name: 'Complete the trip' }));
    expect(await form.findByRole('alert')).toHaveTextContent('Check-out is already done.');
  });
});
