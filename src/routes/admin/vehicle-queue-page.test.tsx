import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminVehicleRow, AdminVehicles, ReviewQueueItem } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminVehicleQueuePage } from './vehicle-queue-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/vehicles') =>
  renderWithRouter([{ path: '/admin/vehicles', element: <AdminVehicleQueuePage /> }], path);

const corolla: ReviewQueueItem = {
  id: 'v1',
  title: '2021 Toyota Corolla',
  status: 'UNDER_REVIEW',
  host: { id: 'h1', name: 'Mere Parata', status: 'APPROVED' },
  city: 'Auckland',
  pendingPhotos: 8,
  pendingDocuments: 3,
  keyChanges: [],
  flags: 2,
  // 9 am on 26 September in New Zealand.
  updatedAt: '2026-09-25T21:00:00.000Z',
};

const rav4: ReviewQueueItem = {
  id: 'v2',
  title: '2019 Toyota RAV4',
  status: 'ACTIVE',
  host: { id: 'h2', name: 'Tama Rewi', status: 'APPLIED' },
  pendingPhotos: 1,
  pendingDocuments: 0,
  keyChanges: [],
  flags: 0,
  updatedAt: '2026-09-28T21:00:00.000Z',
};

const row = async (name: string) =>
  within((await screen.findByRole('link', { name })).closest('tr') as HTMLElement);

describe('AdminVehicleQueuePage', () => {
  it('lists listings under review and live ones with new files, each linking to its review', async () => {
    mockApi({ 'GET /admin/vehicles': { status: 200, body: { vehicles: [corolla, rav4] } } });
    render();

    expect(await screen.findByRole('link', { name: '2021 Toyota Corolla' })).toHaveAttribute(
      'href',
      '/admin/vehicles/v1',
    );
    const first = await row('2021 Toyota Corolla');
    expect(first.getByText('Under review')).toBeInTheDocument();
    expect(first.getByText('Mere Parata')).toBeInTheDocument();
    expect(first.getByText('Approved')).toBeInTheDocument();
    expect(first.getByText('Auckland')).toBeInTheDocument();
    expect(first.getByText('8 photos, 3 documents')).toBeInTheDocument();
    expect(first.getByText('2 flags')).toBeInTheDocument();
    expect(first.getByText('Sat, 26 Sept 2026')).toBeInTheDocument();

    const second = await row('2019 Toyota RAV4');
    expect(second.getByText('Live, new photos')).toBeInTheDocument();
    expect(second.getByText('1 photo')).toBeInTheDocument();
    expect(second.getByText('None')).toBeInTheDocument();
    // The Host isn't approved yet, so the listing can't be either.
    expect(second.getByText('Applied')).toBeInTheDocument();
    expect(second.getByRole('link', { name: 'Host application' })).toHaveAttribute(
      'href',
      '/admin/host-applications',
    );
    expect(screen.getByText('2 listings waiting')).toBeInTheDocument();
  });

  it('says which key details a live listing changed, which sent it back for review', async () => {
    const yaris: ReviewQueueItem = {
      ...rav4,
      id: 'v5',
      title: '2019 Toyota Yaris',
      status: 'UNDER_REVIEW',
      host: { id: 'h2', name: 'Tama Rewi', status: 'APPROVED' },
      keyChanges: ['regoPlate', 'vin', 'model'],
    };
    const civic: ReviewQueueItem = { ...yaris, id: 'v6', title: '2020 Honda Civic', pendingPhotos: 0 };
    mockApi({
      'GET /admin/vehicles': { status: 200, body: { vehicles: [yaris, { ...civic, keyChanges: ['year'] }] } },
    });
    render();

    const first = await row('2019 Toyota Yaris');
    expect(first.getByText('Back for review')).toBeInTheDocument();
    expect(first.getByText('Key details changed')).toBeInTheDocument();
    expect(first.getByText('Number plate, VIN and model')).toBeInTheDocument();
    expect(first.getByText('1 photo')).toBeInTheDocument();
    expect(first.queryByText('Nothing new')).not.toBeInTheDocument();

    const second = await row('2020 Honda Civic');
    expect(second.getByText('Year')).toBeInTheDocument();
    expect(second.queryByText('Nothing new')).not.toBeInTheDocument();
  });

  it('says when the queue is empty', async () => {
    mockApi({ 'GET /admin/vehicles': { status: 200, body: { vehicles: [] } } });
    render();

    expect(await screen.findByRole('heading', { name: 'Nothing to review' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/vehicles': {
        status: 500,
        body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load the queue");
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

const HOST_ID = '64f0c0ffee0000000000abcd';

const mazda: AdminVehicleRow = {
  id: 'v3',
  title: '2020 Mazda CX-5',
  status: 'SUSPENDED',
  regoPlate: 'MZD123',
  city: 'Wellington',
  host: { id: HOST_ID, name: 'Tama Rewi', email: 'tama@example.co.nz' },
  waitingForPayouts: false,
  hostSuspended: false,
  tripCount: 4,
  // 10 am on 2 October in New Zealand.
  updatedAt: '2026-10-01T21:00:00.000Z',
};

const tesla: AdminVehicleRow = {
  id: 'v4',
  title: '2023 Tesla Model 3',
  status: 'ACTIVE',
  host: { id: HOST_ID, name: 'Tama Rewi', email: 'tama@example.co.nz' },
  waitingForPayouts: true,
  hostSuspended: true,
  tripCount: 0,
  updatedAt: '2026-10-03T21:00:00.000Z',
};

const cars = (vehicles: AdminVehicleRow[], extra: Partial<AdminVehicles> = {}) => ({
  status: 200,
  body: { vehicles, total: vehicles.length, page: 1, ...extra } satisfies AdminVehicles,
});

const searches = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/admin/vehicles/search'));

describe('AdminVehicleQueuePage: all cars', () => {
  it('switches between the review queue and every car, keeping the tab in the address', async () => {
    mockApi({
      'GET /admin/vehicles': { status: 200, body: { vehicles: [corolla] } },
      'GET /admin/vehicles/search': cars([mazda, tesla]),
    });
    const { router } = render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Review queue' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('link', { name: '2021 Toyota Corolla' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'All cars' }));
    expect(router.state.location.search).toBe('?view=all');
    const table = within(await screen.findByRole('table', { name: 'Cars' }));
    expect(table.getByRole('link', { name: '2020 Mazda CX-5' })).toHaveAttribute(
      'href',
      '/admin/vehicles/v3',
    );
    const suspended = within(table.getByRole('link', { name: '2020 Mazda CX-5' }).closest('tr')!);
    expect(suspended.getByText('Suspended')).toBeInTheDocument();
    expect(suspended.getByText('MZD123')).toBeInTheDocument();
    expect(suspended.getByRole('link', { name: 'Tama Rewi' })).toHaveAttribute(
      'href',
      `/admin/users/${HOST_ID}`,
    );
    expect(suspended.getByText('Wellington')).toBeInTheDocument();
    expect(suspended.getByText('Fri, 2 Oct 2026')).toBeInTheDocument();
    const waiting = within(table.getByRole('link', { name: '2023 Tesla Model 3' }).closest('tr')!);
    expect(waiting.getByText('Waiting for payout setup')).toBeInTheDocument();
    expect(waiting.getByText('Host suspended')).toBeInTheDocument();
    expect(waiting.getByText('No plate yet')).toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 cars')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '2021 Toyota Corolla' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Review queue' }));
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('link', { name: '2021 Toyota Corolla' })).toBeInTheDocument();
  });

  it('searches by name, plate or Host, and filters by status', async () => {
    const fetchMock = mockApi({
      'GET /admin/vehicles/search': () => {
        const query = searches(fetchMock).at(-1)!.searchParams;
        return query.get('q') || query.get('status') ? cars([mazda]) : cars([mazda, tesla]);
      },
    });
    const { router } = render('/admin/vehicles?view=all');

    await screen.findByRole('link', { name: '2023 Tesla Model 3' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'mzd 123');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('1 car')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?view=all&q=mzd+123');
    expect(searches(fetchMock).at(-1)!.searchParams.get('q')).toBe('mzd 123');

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Suspended' }));
    expect(router.state.location.search).toBe('?view=all&q=mzd+123&status=SUSPENDED');
    await vi.waitFor(() => expect(searches(fetchMock).at(-1)!.searchParams.get('status')).toBe('SUSPENDED'));

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('?view=all');
    expect(await screen.findByRole('link', { name: '2023 Tesla Model 3' })).toBeInTheDocument();
  });

  it("shows one Host's cars from their record, with a way back to every Host's", async () => {
    const fetchMock = mockApi({
      'GET /admin/vehicles/search': () =>
        searches(fetchMock).at(-1)!.searchParams.get('hostId')
          ? cars([mazda, tesla], { host: { id: HOST_ID, name: 'Tama Rewi' } })
          : cars([mazda, tesla, { ...tesla, id: 'v5', title: '2018 Nissan Leaf' }]),
    });
    const { router } = render(`/admin/vehicles?view=all&hostId=${HOST_ID}`);

    expect(await screen.findByText('Tama Rewi’s cars')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Tama Rewi’s record' })).toHaveAttribute(
      'href',
      `/admin/users/${HOST_ID}`,
    );
    expect(searches(fetchMock).at(-1)!.searchParams.get('hostId')).toBe(HOST_ID);

    await userEvent.click(screen.getByRole('button', { name: 'Every Host' }));
    expect(router.state.location.search).toBe('?view=all');
    expect(await screen.findByRole('link', { name: '2018 Nissan Leaf' })).toBeInTheDocument();
    expect(screen.queryByText('Tama Rewi’s cars')).not.toBeInTheDocument();
  });

  it('says when nothing matches, and when the list fails to load', async () => {
    let fail = false;
    mockApi({
      'GET /admin/vehicles/search': () =>
        fail
          ? {
              status: 500,
              body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
            }
          : cars([]),
    });
    render('/admin/vehicles?view=all&q=delorean');

    expect(await screen.findByRole('heading', { name: 'No cars match' })).toBeInTheDocument();
    fail = true;
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the cars');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
