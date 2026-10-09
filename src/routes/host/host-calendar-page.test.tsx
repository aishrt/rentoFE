import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarBlock, HostVehicleSummary } from '@/api/types';
import { hostUser, samplePolicies, sampleVehicle } from '@/features/host/host-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { HostCalendarPage } from './host-calendar-page';

// 1 October 2026, 9 am in New Zealand: the calendar's "today".
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-30T20:00:00.000Z') });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const car = (overrides: Partial<HostVehicleSummary>): HostVehicleSummary => ({
  id: 'v1',
  slug: 'corolla-v1',
  title: '2021 Toyota Corolla',
  status: 'ACTIVE',
  waitingForPayouts: false,
  onboardingStep: 6,
  photo: null,
  missingCount: 0,
  pendingChanges: false,
  dailyCents: 8900,
  updatedAt: '2026-09-30T00:00:00.000Z',
  ...overrides,
});

/** Midnight 14 October to midnight 16 October, NZ time. */
const booked = (ref: string, guestFirstName: string): CalendarBlock => ({
  id: `b-${ref}`,
  reason: 'BOOKED',
  start: '2026-10-13T11:00:00.000Z',
  end: '2026-10-15T11:00:00.000Z',
  booking: { id: `k-${ref}`, ref, status: 'CONFIRMED', guestFirstName, toAnswer: false },
});

const servicing: CalendarBlock = {
  id: 'h1',
  reason: 'HOST_BLOCK',
  note: 'Servicing',
  start: '2026-10-19T11:00:00.000Z',
  end: '2026-10-20T11:00:00.000Z',
};

const calendar = (blocks: CalendarBlock[]) => ({
  status: 200,
  body: {
    from: '2026-09-27T11:00:00.000Z',
    to: '2026-11-08T11:00:00.000Z',
    blocks,
    rules: { minNoticeHours: 12, bufferHours: 2 },
  },
});

function api(vehicles: HostVehicleSummary[]) {
  return mockApi({
    'POST /auth/session': { status: 200, body: { user: { ...hostUser, hostStatus: 'APPROVED' } } },
    'GET /threads/unread': { status: 200, body: { count: 0 } },
    'GET /policies': { status: 200, body: samplePolicies },
    'GET /host/vehicles': { status: 200, body: { vehicles } },
    'GET /host/vehicles/v1': {
      status: 200,
      body: { vehicle: sampleVehicle({ status: 'ACTIVE', title: '2021 Toyota Corolla', onboardingStep: 6 }) },
    },
    'GET /host/vehicles/v1/calendar': calendar([booked('RV-4HX8PA', 'Kiri')]),
    'GET /host/vehicles/v2': {
      status: 200,
      body: {
        vehicle: sampleVehicle({ id: 'v2', status: 'INACTIVE', title: '2019 Mazda 3', onboardingStep: 6 }),
      },
    },
    'GET /host/vehicles/v2/calendar': calendar([booked('RV-9TR4NM', 'Mere')]),
    'GET /host/calendar': {
      status: 200,
      body: {
        from: '2026-10-11T11:00:00.000Z',
        to: '2026-10-25T11:00:00.000Z',
        vehicles: [
          {
            id: 'v1',
            title: '2021 Toyota Corolla',
            photo: null,
            status: 'ACTIVE',
            blocks: [booked('RV-4HX8PA', 'Kiri'), servicing],
          },
          { id: 'v2', title: '2019 Mazda 3', photo: null, status: 'INACTIVE', blocks: [] },
        ],
      },
    },
  });
}

/** The ranges asked of the all-cars calendar, as "from to". */
const ranges = (fetchMock: ReturnType<typeof api>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL(input instanceof Request ? input.url : String(input)))
    .filter((url) => url.pathname.endsWith('/host/calendar'))
    .map((url) => `${url.searchParams.get('from')} ${url.searchParams.get('to')}`);

/** A large screen, where the all-cars calendar shows a month. */
function wideScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 64rem)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const render = (search = '') =>
  renderWithRouter([{ path: '/host/calendar', element: <HostCalendarPage /> }], `/host/calendar${search}`);

const day = (name: string | RegExp) => screen.findByRole('button', { name });

describe('HostCalendarPage', () => {
  const cars = [
    car({}),
    car({ id: 'v2', slug: 'mazda-v2', title: '2019 Mazda 3', status: 'INACTIVE' }),
    car({ id: 'v3', slug: 'draft-v3', title: 'Untitled car', status: 'DRAFT' }),
    car({ id: 'v4', slug: 'van-v4', title: '2015 Toyota Hiace', status: 'SUSPENDED' }),
  ];

  it('opens on all the cars, two weeks at a time on a phone, a row a car with its trips and blocks', async () => {
    const fetchMock = api(cars);
    render('?date=2026-10-12');

    const timeline = within(await screen.findByRole('region', { name: /^All cars/ }));
    expect(ranges(fetchMock)).toEqual(['2026-10-12 2026-10-26']);
    expect(screen.getByText('12–25 Oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Car/ })).toHaveTextContent('All cars');
    // The same key as each car's calendar.
    expect(screen.getByRole('list', { name: 'Calendar key' })).toBeInTheDocument();

    const corolla = within(timeline.getByRole('list', { name: '2021 Toyota Corolla: trips and blocks' }));
    // A trip opens its booking.
    expect(corolla.getByRole('link', { name: 'Kiri · RV-4HX8PA, 14–15 Oct' })).toHaveAttribute(
      'href',
      '/host/bookings/RV-4HX8PA',
    );
    expect(corolla.getByText('Blocked · Servicing, 20 Oct')).toBeInTheDocument();
    expect(timeline.getByText('Nothing booked or blocked in these dates.')).toBeInTheDocument();

    // A car opens its own calendar, at the same dates, where blocks are changed.
    expect(timeline.getByRole('link', { name: '2019 Mazda 3' })).toHaveAttribute(
      'href',
      '/host/calendar?car=v2&date=2026-10-12',
    );
    expect(
      timeline.getByRole('link', { name: 'Manage the calendar of the 2021 Toyota Corolla' }),
    ).toHaveAttribute('href', '/host/calendar?car=v1&date=2026-10-12');
    // In the Host area, under Calendar.
    const hosting = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(hosting.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves two weeks at a time, keeping the dates in the link', async () => {
    const fetchMock = api(cars);
    const { router } = render('?date=2026-10-12');

    await userEvent.click(await screen.findByRole('button', { name: 'Next two weeks' }));
    expect(await screen.findByText('26 Oct – 8 Nov 2026')).toBeInTheDocument();
    expect(ranges(fetchMock)).toContain('2026-10-26 2026-11-09');
    expect(new URLSearchParams(router.state.location.search).get('date')).toBe('2026-10-26');

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    // The two weeks from the Monday of today's week.
    expect(await screen.findByText('28 Sep – 11 Oct 2026')).toBeInTheDocument();
    expect(ranges(fetchMock)).toContain('2026-09-28 2026-10-12');
  });

  it('shows a month at a time on a large screen', async () => {
    wideScreen();
    const fetchMock = api(cars);
    render('?date=2026-10-12');

    expect(await screen.findByRole('region', { name: /^All cars/ })).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(ranges(fetchMock)).toEqual(['2026-10-01 2026-11-01']);

    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    expect(ranges(fetchMock)).toContain('2026-09-01 2026-10-01');
  });

  it('opens a car’s own calendar from its row, and goes back to all of them from the picker', async () => {
    api(cars);
    const { router } = render('?date=2026-10-12');

    await userEvent.click(await screen.findByRole('link', { name: '2019 Mazda 3' }));
    expect(await day(/^Wednesday, 14 October 2026: Mere · RV-9TR4NM/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Car/ })).toHaveTextContent('2019 Mazda 3');
    expect(screen.getByRole('link', { name: '2019 Mazda 3' })).toHaveAttribute('href', '/host/vehicles/v2');

    // Only cars with a calendar: no draft, nor a car taken down for good.
    await userEvent.click(screen.getByRole('button', { name: /^Car/ }));
    const list = within(screen.getByRole('listbox', { name: 'Your cars' }));
    expect(list.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All cars',
      '2021 Toyota Corolla',
      '2019 Mazda 3',
    ]);
    await userEvent.click(list.getByRole('option', { name: 'All cars' }));

    expect(await screen.findByRole('region', { name: /^All cars/ })).toBeInTheDocument();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.has('car')).toBe(false);
    // The dates shown stay the same.
    expect(params.get('date')).toBe('2026-10-12');
  });

  it('switches car from the picker, keeping the choice and the dates in the link', async () => {
    api(cars);
    const { router } = render('?car=v1&date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Kiri · RV-4HX8PA/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2021 Toyota Corolla' })).toHaveAttribute(
      'href',
      '/host/vehicles/v1',
    );

    await userEvent.click(screen.getByRole('button', { name: /^Car/ }));
    await userEvent.click(
      within(screen.getByRole('listbox', { name: 'Your cars' })).getByRole('option', {
        name: '2019 Mazda 3',
      }),
    );

    expect(await day(/^Wednesday, 14 October 2026: Mere · RV-9TR4NM/)).toBeInTheDocument();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('car')).toBe('v2');
    expect(params.get('date')).toBe('2026-10-12');
  });

  it('opens on the car in the link', async () => {
    api(cars);
    render('?car=v2&date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Mere · RV-9TR4NM/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Car/ })).toHaveTextContent('2019 Mazda 3');
  });

  it('opens on the only car of a Host with one, with no picker', async () => {
    api([car({})]);
    render('?date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Kiri/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Car/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^All cars/ })).not.toBeInTheDocument();
  });

  it('asks a Host with no cars to add one', async () => {
    api([]);
    render();

    expect(await screen.findByRole('heading', { name: 'No calendars yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a car' })).toHaveAttribute('href', '/host/vehicles/new');
  });

  it('sends a Host with only drafts to finish one', async () => {
    api([cars[2]!]);
    render();

    expect(await screen.findByText(/opens once you've submitted its listing/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your cars' })).toHaveAttribute('href', '/host/vehicles');
  });
});
