import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarBlock } from '@/api/types';
import { hostUser, samplePolicies, sampleVehicle } from '@/features/host/host-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { VehicleCalendarPage } from './vehicle-calendar-page';

// 1 October 2026, 9 am in New Zealand: the calendar's "today".
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-30T20:00:00.000Z') });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const liveCar = sampleVehicle({ status: 'ACTIVE', title: '2021 Toyota Corolla', onboardingStep: 6 });

const blocks: CalendarBlock[] = [
  {
    id: 'b1',
    reason: 'BOOKED',
    start: '2026-10-13T11:00:00.000Z',
    end: '2026-10-15T11:00:00.000Z',
    booking: { id: 'k1', ref: 'RV-4HX8PA', status: 'CONFIRMED', guestFirstName: 'Kiri', toAnswer: false },
  },
  { id: 'b2', reason: 'BUFFER', start: '2026-10-15T11:00:00.000Z', end: '2026-10-15T13:00:00.000Z' },
  {
    id: 'b3',
    reason: 'HOLD',
    start: '2026-10-19T21:00:00.000Z',
    end: '2026-10-20T05:00:00.000Z',
    holdExpiresAt: '2026-10-02T20:00:00.000Z',
    booking: { id: 'k2', ref: 'RV-7QM2ZD', status: 'PENDING', guestFirstName: 'Mere', toAnswer: true },
  },
  {
    id: 'b4',
    reason: 'HOST_BLOCK',
    note: 'Service',
    start: '2026-10-21T11:00:00.000Z',
    end: '2026-10-22T11:00:00.000Z',
  },
  { id: 'b5', reason: 'RECURRING', start: '2026-10-05T19:00:00.000Z', end: '2026-10-06T05:00:00.000Z' },
  { id: 'b6', reason: 'ADMIN', start: '2026-10-26T11:00:00.000Z', end: '2026-10-27T11:00:00.000Z' },
];

function api(handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /auth/session': { status: 200, body: { user: hostUser } },
    'GET /policies': { status: 200, body: samplePolicies },
    'GET /host/vehicles/v1': { status: 200, body: { vehicle: liveCar } },
    'GET /host/vehicles/v1/calendar': {
      status: 200,
      body: {
        from: '2026-09-27T11:00:00.000Z',
        to: '2026-11-08T11:00:00.000Z',
        blocks,
        rules: { minNoticeHours: 12, bufferHours: 2 },
      },
    },
    ...handlers,
  });
}

const render = (search = '?date=2026-10-12') =>
  renderWithRouter(
    [{ path: '/host/vehicles/:id/calendar', element: <VehicleCalendarPage /> }],
    `/host/vehicles/v1/calendar${search}`,
  );

const day = (name: string | RegExp) => screen.findByRole('button', { name });

describe('VehicleCalendarPage', () => {
  it("leads back to the car's listing when opened directly", async () => {
    api();
    render();

    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute('href', '/host/vehicles/v1');
  });

  it('shows every block by its reason, with a key', async () => {
    api();
    render();

    expect(await day(/^Wednesday, 14 October 2026: Kiri · RV-4HX8PA/)).toBeInTheDocument();
    expect(await day(/^Friday, 16 October 2026: Preparation time/)).toBeInTheDocument();
    expect(await day(/^Tuesday, 20 October 2026: Request pending · Mere/)).toBeInTheDocument();
    expect(await day(/^Thursday, 22 October 2026: Blocked · Service/)).toBeInTheDocument();
    expect(await day(/^Tuesday, 6 October 2026: Unavailable \(weekly\)/)).toBeInTheDocument();
    expect(await day(/^Tuesday, 27 October 2026: Blocked by Rento Vroom/)).toBeInTheDocument();
    expect(await day('Monday, 12 October 2026: free')).toBeEnabled();
    // Days before today can't be chosen.
    expect(await day('Wednesday, 30 September 2026: free')).toBeDisabled();

    const key = within(screen.getByRole('list', { name: 'Calendar key' }));
    for (const label of [
      'Booked',
      'Request pending',
      'Blocked by you',
      'Weekly availability',
      'Preparation time',
      'Blocked by Rento Vroom',
    ]) {
      expect(key.getByText(label)).toBeInTheDocument();
    }
  });

  it('blocks a range of days with a note', async () => {
    let sent: unknown;
    api({
      'POST /host/vehicles/v1/blocks': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 201,
          body: {
            block: {
              id: 'b9',
              reason: 'HOST_BLOCK',
              start: '2026-10-11T11:00:00.000Z',
              end: '2026-10-14T11:00:00.000Z',
            },
          },
        };
      },
    });
    render();

    await userEvent.click(await day('Monday, 12 October 2026: free'));
    await userEvent.click(await day(/^Wednesday, 14 October 2026/));
    expect(screen.getByText('12–14 Oct chosen')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Block 12–14 Oct' }));

    const dialog = await screen.findByRole('dialog', { name: 'Block 12–14 Oct' });
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Family trip');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));

    await vi.waitFor(() =>
      expect(sent).toEqual({ start: '2026-10-12', end: '2026-10-15', note: 'Family trip' }),
    );
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says when the dates clash with a trip, as the API refuses them', async () => {
    api({
      'POST /host/vehicles/v1/blocks': {
        status: 409,
        body: { error: { code: 'BOOKED_DATES', message: 'A trip or request is already booked then.' } },
      },
    });
    render();

    await userEvent.click(await day(/^Wednesday, 14 October 2026/));
    await userEvent.click(screen.getByRole('button', { name: 'Block 14 Oct' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));

    expect(await within(dialog).findByText('A trip or request is already booked then.')).toBeInTheDocument();
  });

  it('removes one of your own blocks', async () => {
    const remove = vi.fn();
    api({ 'DELETE /host/vehicles/v1/blocks/b4': () => (remove(), { status: 204 }) });
    render();

    await userEvent.click(await day(/^Thursday, 22 October 2026/));
    const details = within(screen.getByRole('region', { name: 'Thursday, 22 October 2026' }));
    await userEvent.click(details.getByRole('button', { name: /^Remove the block/ }));
    await userEvent.click(details.getByRole('button', { name: 'Yes, unblock' }));

    await vi.waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('blocks a time range from the week view', async () => {
    let sent: unknown;
    api({
      'POST /host/vehicles/v1/blocks': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 201, body: { block: { id: 'b9', reason: 'HOST_BLOCK', start: '', end: '' } } };
      },
    });
    render('?view=week&date=2026-10-12');

    await userEvent.click(await screen.findByRole('button', { name: 'Monday, 12 October 2026, 9:00 am' }));
    await userEvent.click(screen.getByRole('button', { name: 'Monday, 12 October 2026, 11:00 am' }));
    await userEvent.click(screen.getByRole('button', { name: 'Block these times' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block a time' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));

    await vi.waitFor(() => expect(sent).toEqual({ start: '2026-10-12T09:00', end: '2026-10-12T12:00' }));
    // The week's trips are listed under it.
    expect(screen.getByRole('region', { name: 'This week' })).toHaveTextContent('RV-4HX8PA');
  });

  it('saves weekly availability and lists the times left open for trips', async () => {
    let sent: unknown;
    api({
      'PUT /host/vehicles/v1/recurring-rules': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: {
            blocks: 250,
            skipped: [{ start: '2026-10-14T19:00:00.000Z', end: '2026-10-15T05:00:00.000Z' }],
          },
        };
      },
    });
    render();

    const weekly = within(await screen.findByRole('region', { name: 'Weekly availability' }));
    await userEvent.click(weekly.getByRole('button', { name: 'Add a time' }));
    await userEvent.click(weekly.getByRole('button', { name: 'Friday' }));
    await userEvent.click(weekly.getByRole('button', { name: 'Save weekly availability' }));

    expect(await weekly.findByText('250 times are blocked over the next 12 months.')).toBeInTheDocument();
    expect(weekly.getByText('Left open, because a trip or request is already there:')).toBeInTheDocument();
    expect(weekly.getByText('Thu 15 Oct, 8:00 am – 6:00 pm')).toBeInTheDocument();
    expect(sent).toEqual({ rules: [{ daysOfWeek: [1, 2, 3, 4], startTime: '08:00', endTime: '18:00' }] });
  });
});
