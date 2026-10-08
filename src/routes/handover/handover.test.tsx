import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Handover } from '@/api/types';
import type * as UploadModule from '@/features/host/upload';
import { ANGLES, handover, report } from '@/features/handover/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { HandoverPage } from './handover-page';
import { CheckInPage } from './inspection-page';

// Uploads go through XMLHttpRequest, which these tests don't run: each photo gets a key straight away.
vi.mock('@/features/host/upload', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile: vi.fn(async () => `bookings/b1/inspections/${Math.random().toString(36).slice(2)}.jpg`),
}));

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockHandover(current: () => Handover) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /bookings/RV-7K2Q9M/inspections':
        return { status: 200, body: { handover: current() } };
      case 'POST /bookings/RV-7K2Q9M/inspections':
        return {
          status: 201,
          body: {
            handover: handover({ bookingStatus: 'ACTIVE', checkIn: report({ submittedBy: 'GUEST' }) }),
          },
        };
      case 'POST /bookings/RV-7K2Q9M/inspections/CHECK_IN/confirm':
        return {
          status: 200,
          body: {
            handover: handover({
              bookingStatus: 'ACTIVE',
              checkIn: report({ confirmedByGuestAt: '2026-10-11T21:10:00.000Z' }),
              actions: { ...handover().actions, checkIn: false, checkOut: true },
            }),
          },
        };
      case 'POST /bookings/RV-7K2Q9M/inspections/CHECK_OUT/damage':
        return { status: 200, body: { handover: current() } };
      case 'POST /incidents':
        return { status: 201, body: { incident: { caseRef: 'IN-4F7K2Q' } } };
      case 'GET /bookings/RV-7K2Q9M':
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not here' } } };
      default:
        return undefined;
    }
  });
}

const render = (path: string) =>
  renderWithRouter(
    [
      { path: '/trips/:ref/check-in', element: <CheckInPage /> },
      { path: '/trips/:ref/handover', element: <HandoverPage /> },
      { path: '/incidents/:ref', element: <p>Case page</p> },
    ],
    path,
  );

const photo = (name: string) => new File(['jpeg'], name, { type: 'image/jpeg' });

describe('CheckInPage', () => {
  it('walks through every angle, the readings and damage, then records the check-in', async () => {
    const sent = mockHandover(() => handover());
    const { router } = render('/trips/RV-7K2Q9M/check-in');

    expect(await screen.findByRole('heading', { level: 1, name: 'Check-in' })).toBeInTheDocument();
    for (const [index, angle] of ANGLES.entries()) {
      await screen.findByText(new RegExp(`${index + 1}/8$`));
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await userEvent.upload(input, photo(`${angle}.jpg`));
      await screen.findByText(/^Taken /);
      await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    }

    expect(await screen.findByRole('heading', { name: 'Readings' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Enter the odometer reading in whole kilometres')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Odometer/), '45210');
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByRole('heading', { name: 'Any damage already?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByRole('heading', { name: 'Check and finish' })).toBeInTheDocument();
    const start = screen.getByRole('button', { name: 'Start the trip' });
    expect(start).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /show the car as it is now/ }));
    await vi.waitFor(() => expect(start).toBeEnabled());
    await userEvent.click(start);

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/trips/RV-7K2Q9M/handover'));
    const body = sent.find((request) => request.method === 'POST' && request.path.endsWith('/inspections'))
      ?.body as { stage: string; odometer: number; photos: { angle: string }[]; fuelOrBatteryPct: number };
    expect(body).toMatchObject({ stage: 'CHECK_IN', odometer: 45210, fuelOrBatteryPct: 100, damagePins: [] });
    expect(body.photos.map((taken) => taken.angle)).toEqual([...ANGLES]);
  });

  it('says when check-in opens, and asks a guest to confirm their email first', async () => {
    mockHandover(() => handover({ actions: { ...handover().actions, checkIn: false } }));
    render('/trips/RV-7K2Q9M/check-in');
    expect(
      await screen.findByRole('heading', { name: 'Check-in opens 2 hours before the trip' }),
    ).toBeInTheDocument();
  });

  it('asks the guest to confirm their email before the photos', async () => {
    mockHandover(() => handover({ emailVerificationNeeded: true }));
    render('/trips/RV-7K2Q9M/check-in');
    expect(await screen.findByRole('heading', { name: 'Confirm your email first' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resend the link' })).toHaveAttribute(
      'href',
      '/account/settings',
    );
  });
});

describe('HandoverPage', () => {
  it('shows the check-in for the guest to confirm', async () => {
    let current = handover({
      bookingStatus: 'ACTIVE',
      checkIn: report(),
      actions: { ...handover().actions, checkIn: false, checkOut: true, confirmCheckIn: true },
    });
    const sent = mockHandover(() => current);
    render('/trips/RV-7K2Q9M/handover');

    const checkIn = await screen.findByRole('region', { name: 'Check-in' });
    expect(within(checkIn).getByText('45,210 km')).toBeInTheDocument();
    expect(within(checkIn).getByText('Host confirmed')).toBeInTheDocument();
    expect(within(checkIn).getByText('Guest to confirm')).toBeInTheDocument();
    expect(within(checkIn).getByText('Front bumper')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start check-out' })).toHaveAttribute(
      'href',
      '/trips/RV-7K2Q9M/check-out',
    );

    current = { ...current, actions: { ...current.actions, confirmCheckIn: false } };
    await userEvent.click(within(checkIn).getByRole('button', { name: 'Confirm it’s right' }));
    await vi.waitFor(() =>
      expect(sent.some((request) => request.path.endsWith('/CHECK_IN/confirm'))).toBe(true),
    );
    expect(await within(checkIn).findByText('Guest confirmed')).toBeInTheDocument();
  });

  it('flags new damage, then opens an incident with it in one tap', async () => {
    const sent = mockHandover(() =>
      handover({
        bookingStatus: 'COMPLETED',
        checkIn: report(),
        checkOut: report({ stage: 'CHECK_OUT', submittedBy: 'GUEST', damagePins: [] }),
        damageWindowEndsAt: '2026-10-16T21:00:00.000Z',
        actions: { ...handover().actions, checkIn: false, confirmCheckOut: true, flagDamage: true },
      }),
    );
    const { router } = render('/trips/RV-7K2Q9M/handover');

    await userEvent.click(await screen.findByRole('button', { name: 'Flag new damage' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Flag new damage' }));
    // A tap on the diagram's rear right door, 80% across and 62% down.
    const diagram = dialog.getByRole('img', { name: /^A car seen from above/ });
    vi.spyOn(diagram, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 200));
    fireEvent.click(diagram, { clientX: 80, clientY: 124 });
    await userEvent.type(
      dialog.getByRole('textbox', { name: 'What’s the damage at rear right (driver) door?' }),
      'Dent',
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Flag damage' }));

    const done = within(await screen.findByRole('dialog', { name: 'New damage flagged' }));
    expect(sent.find((request) => request.path.endsWith('/CHECK_OUT/damage'))?.body).toEqual({
      damagePins: [{ x: 80, y: 62, note: 'Dent' }],
      photos: [],
    });
    await userEvent.click(done.getByRole('button', { name: 'Open an incident with this damage' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/incidents/IN-4F7K2Q'));
    expect(sent.find((request) => request.path === '/incidents')?.body).toEqual({
      bookingRef: 'RV-7K2Q9M',
      type: 'DAMAGE',
      fromCheckOutDamage: true,
      attachments: [],
    });
  });
});
