import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Quote, QuoteRequest, VehicleDetail } from '@/api/types';
import { mockRoutes, quote, vehicleDetail } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { VehiclePage } from './vehicle-page';

const TRIP = 'start=2026-12-01T10:00&end=2026-12-09T10:00';

const REVIEWS = {
  reviews: [
    {
      id: 'r1',
      author: { firstName: 'Nikau' },
      overall: 5,
      body: 'Handled the mountain roads with ease.',
      createdAt: '2026-09-23T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 10,
  rating: { avg: 5, count: 2 },
  categories: { cleanliness: 4.5, communication: 5, pickupReturn: 5 },
};

function mockListing({
  vehicle = vehicleDetail(),
  answer = () => quote(),
}: { vehicle?: VehicleDetail; answer?: (request: QuoteRequest) => Quote } = {}) {
  return mockRoutes(({ method, path, body }) => {
    if (path === `/vehicles/${vehicle.slug}`) return { status: 200, body: { vehicle } };
    if (path === `/vehicles/${vehicle.id}/availability`)
      return {
        status: 200,
        body: {
          from: '2026-09-30T00:00:00.000Z',
          to: '2027-03-30T00:00:00.000Z',
          busy: [{ start: '2026-12-20T21:00:00.000Z', end: '2026-12-23T21:00:00.000Z' }],
          minNoticeHours: 4,
          bufferHours: 2,
          minDays: 1,
          maxDays: 30,
        },
      };
    if (path === `/vehicles/${vehicle.id}/reviews`) return { status: 200, body: REVIEWS };
    if (method === 'POST' && path === `/vehicles/${vehicle.id}/quote`)
      return { status: 200, body: { quote: answer(body as QuoteRequest) } };
    return undefined;
  });
}

const renderListing = (search = '') =>
  renderWithRouter(
    [
      { path: '/cars/:slug', element: <VehiclePage /> },
      { path: '/book/:slug', element: <h1>Checkout</h1> },
    ],
    `/cars/2022-toyota-rav4-queenstown${search}`,
  );

const panel = () => within(screen.getByRole('complementary', { name: 'Book this car' }));
const quotes = (sent: ReturnType<typeof mockListing>) =>
  sent.filter((request) => request.method === 'POST').map((request) => request.body as QuoteRequest);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('VehiclePage', () => {
  it('shows the car, its host, specs, rego and WOF, policies, options, reviews and area', async () => {
    mockListing();
    renderListing();

    expect(await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 2022' })).toBeInTheDocument();
    expect(screen.getByText('GXL Hybrid AWD')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('2022 Toyota RAV4 for rent in Queenstown · Rento Vroom'));

    // The first photo carries the car's transition name, so a card's photo morphs into it.
    expect(screen.getByRole('img', { name: '2022 Toyota RAV4: front' })).toHaveStyle({
      viewTransitionName: 'vehicle-photo-car-rav4',
    });

    const host = within(screen.getByRole('region', { name: 'Hosted by Liam' }));
    expect(host.getByText('Identity verified')).toBeInTheDocument();
    expect(host.getByText('100%')).toBeInTheDocument();

    const car = within(screen.getByRole('region', { name: 'The car' }));
    expect(car.getByText('Automatic')).toBeInTheDocument();
    expect(car.getByText('2.5L petrol hybrid, AWD')).toBeInTheDocument();

    const compliance = within(screen.getByRole('region', { name: 'Registration and WOF' }));
    expect(compliance.getByText('Current, until December 2026')).toBeInTheDocument();
    expect(compliance.getByText('Warrant of Fitness (WOF)')).toBeInTheDocument();
    expect(compliance.queryByText(/Road user charges/)).not.toBeInTheDocument();

    const policies = within(screen.getByRole('region', { name: 'Policies' }));
    expect(
      policies.getByText('250 km a day included, then $0.40 for each extra kilometre.'),
    ).toBeInTheDocument();
    expect(policies.getByText('Cancellation: Moderate')).toBeInTheDocument();
    expect(policies.getByText('5 days or more before pick-up').nextElementSibling).toHaveTextContent(
      'Full refund',
    );
    expect(policies.getByText('Less than 24 hours before').nextElementSibling).toHaveTextContent('No refund');

    expect(
      within(screen.getByRole('region', { name: 'Pick-up and delivery' })).getByText('$20'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Protection' })).getByText('Included'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Handled the mountain roads with ease.')).toBeInTheDocument();
    expect(screen.getByText(/Approximate area: Frankton, Queenstown/)).toBeInTheDocument();
    expect(
      screen.getByText(/The exact address is shared once your booking is confirmed/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Already booked:/)).toBeInTheDocument();
  });

  it('asks for dates before booking', async () => {
    const sent = mockListing();
    const user = userEvent.setup();
    renderListing();

    await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 2022' });
    expect(panel().getByText(/Add your dates to see the total price/)).toBeInTheDocument();
    await user.click(panel().getByRole('button', { name: 'Book' }));
    expect(await panel().findByText('Choose a pick-up date')).toBeInTheDocument();
    expect(quotes(sent)).toEqual([]);
  });

  it('prices the trip from the URL and links Book to checkout with the choices', async () => {
    const sent = mockListing();
    const user = userEvent.setup();
    const { router } = renderListing(`?${TRIP}`);
    await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 2022' });

    expect(await panel().findByText('Total NZD')).toBeInTheDocument();
    expect(panel().getByText('Weekly discount (10%)')).toBeInTheDocument();
    expect(quotes(sent)[0]).toEqual({
      start: '2026-12-01T10:00',
      end: '2026-12-09T10:00',
      pickupOptionId: 'opt-pickup',
      returnOptionId: 'opt-pickup',
      protectionPlanCode: 'BASIC',
    });
    // Collecting from the host and the mandatory plan are left out of the checkout link.
    expect(panel().getByRole('link', { name: 'Book' })).toHaveAttribute(
      'href',
      '/book/2022-toyota-rav4-queenstown?start=2026-12-01T10%3A00&end=2026-12-09T10%3A00',
    );

    await user.click(panel().getByRole('radio', { name: /Premium/ }));
    await user.click(panel().getByRole('button', { name: /^Return to/ }));
    await user.click(screen.getByRole('option', { name: 'Queenstown Airport · $20' }));

    await waitFor(() =>
      expect(quotes(sent).at(-1)).toMatchObject({
        returnOptionId: 'opt-airport',
        protectionPlanCode: 'PREMIUM',
      }),
    );
    const book = await panel().findByRole('link', { name: 'Book' });
    await waitFor(() =>
      expect(book).toHaveAttribute(
        'href',
        '/book/2022-toyota-rav4-queenstown?start=2026-12-01T10%3A00&end=2026-12-09T10%3A00&return=opt-airport&plan=PREMIUM',
      ),
    );
    await user.click(book);
    await waitFor(() => expect(router.state.location.pathname).toBe('/book/2022-toyota-rav4-queenstown'));
  });

  it('explains what stops a trip, and holds Book back', async () => {
    mockListing({
      answer: () =>
        quote({
          available: false,
          problems: [
            {
              code: 'DATES_UNAVAILABLE',
              field: 'start',
              message: 'The car is already booked for some of those dates.',
            },
          ],
        }),
    });
    renderListing(`?${TRIP}`);
    await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 2022' });

    const problem = await panel().findByRole('alert');
    expect(problem).toHaveTextContent("This trip can't be booked yet");
    expect(problem).toHaveTextContent('The car is already booked for some of those dates.');
    expect(panel().queryByRole('link', { name: 'Book' })).not.toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Book' })).toBeDisabled();
  });

  it('asks the host for a request when the car isn’t Instant Book, and a delivery address waits for checkout', async () => {
    const vehicle = vehicleDetail({ rules: { ...vehicleDetail().rules, instantBook: false } });
    mockListing({
      vehicle,
      answer: () =>
        quote({
          problems: [{ code: 'ADDRESS_NEEDED', field: 'deliveryAddress', message: 'Enter the address.' }],
        }),
    });
    renderListing(`?${TRIP}`);
    await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 2022' });

    expect(await panel().findByRole('link', { name: 'Request to book' })).toBeInTheDocument();
    expect(panel().getByText(/You'll add the address to deliver to at checkout/)).toBeInTheDocument();
    expect(panel().getByText(/The host has 24 hours to accept your request/)).toBeInTheDocument();
  });

  it('says so when the car isn’t listed', async () => {
    mockRoutes(({ path }) =>
      path === '/vehicles/2022-toyota-rav4-queenstown'
        ? { status: 404, body: { error: { code: 'NOT_FOUND', message: "We couldn't find that car." } } }
        : undefined,
    );
    renderListing();

    expect(await screen.findByRole('heading', { name: "This car isn't available" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse cars' })).toHaveAttribute('href', '/cars');
  });
});
