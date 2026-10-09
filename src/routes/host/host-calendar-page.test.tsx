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

const booked = (ref: string, guestFirstName: string): CalendarBlock => ({
  id: `b-${ref}`,
  reason: 'BOOKED',
  start: '2026-10-13T11:00:00.000Z',
  end: '2026-10-15T11:00:00.000Z',
  booking: { id: `k-${ref}`, ref, status: 'CONFIRMED', guestFirstName, toAnswer: false },
});

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
  });
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

  it('opens on the first car, and switches car from the picker, keeping the choice in the link', async () => {
    api(cars);
    const { router } = render('?date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Kiri · RV-4HX8PA/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2021 Toyota Corolla' })).toHaveAttribute(
      'href',
      '/host/vehicles/v1',
    );
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');

    // Only cars with a calendar: no draft, nor a car taken down for good.
    await userEvent.click(screen.getByRole('button', { name: /^Car/ }));
    const list = within(screen.getByRole('listbox', { name: 'Your cars' }));
    expect(list.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '2021 Toyota Corolla',
      '2019 Mazda 3',
    ]);
    await userEvent.click(list.getByRole('option', { name: '2019 Mazda 3' }));

    expect(await day(/^Wednesday, 14 October 2026: Mere · RV-9TR4NM/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2019 Mazda 3' })).toHaveAttribute('href', '/host/vehicles/v2');
    const params = router.state.location.search;
    expect(new URLSearchParams(params).get('car')).toBe('v2');
    // The date shown stays the same, to compare cars.
    expect(new URLSearchParams(params).get('date')).toBe('2026-10-12');
  });

  it('opens on the car in the link', async () => {
    api(cars);
    render('?car=v2&date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Mere · RV-9TR4NM/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Car/ })).toHaveTextContent('2019 Mazda 3');
  });

  it('has no picker for a Host with one car', async () => {
    api([car({})]);
    render('?date=2026-10-12');

    expect(await day(/^Wednesday, 14 October 2026: Kiri/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Car/ })).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Your cars' })).toHaveAttribute('href', '/host');
  });
});
