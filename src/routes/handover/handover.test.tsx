import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Handover } from '@/api/types';
import type * as UploadModule from '@/features/host/upload';
import { uploadFile } from '@/features/host/upload';
import { ANGLES, handover, jpegWithExif, report } from '@/features/handover/test-fixtures';
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
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'mediaDevices');
});

type MockAnswer = { status: number; body?: unknown };

function mockHandover(
  current: () => Handover,
  resend: () => MockAnswer = () => ({ status: 200, body: { sent: true } }),
) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'POST /auth/verify-email/resend':
        return resend();
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
    const locate = vi.fn((found: PositionCallback) =>
      found({ coords: { latitude: -36.8484597, longitude: 174.7633315 } } as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: locate },
    });
    const { router } = render('/trips/RV-7K2Q9M/check-in');

    expect(await screen.findByRole('heading', { level: 1, name: 'Check-in' })).toBeInTheDocument();
    // The location is asked for once, as the inspection starts, and never holds it up.
    expect(locate).toHaveBeenCalledTimes(1);
    for (const [index, angle] of ANGLES.entries()) {
      await screen.findByText(new RegExp(`${index + 1}/8$`));
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      // The front one is a photo from January, chosen from the phone's gallery.
      await userEvent.upload(
        input,
        index === 0
          ? jpegWithExif(
              { dateTimeOriginal: '2026:01:05 09:30:00', offsetTimeOriginal: '+13:00' },
              'FRONT.jpg',
            )
          : photo(`${angle}.jpg`),
      );
      await screen.findByText(/^Taken /);
      if (index === 0) expect(screen.getByText(/^Photo taken earlier: .*5 Jan 2026/)).toBeInTheDocument();
      else expect(screen.queryByText(/^Photo taken earlier/)).not.toBeInTheDocument();
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
      ?.body as {
      stage: string;
      odometer: number;
      photos: Record<string, unknown>[];
      fuelOrBatteryPct: number;
    };
    expect(body).toMatchObject({ stage: 'CHECK_IN', odometer: 45210, fuelOrBatteryPct: 100, damagePins: [] });
    expect(body.photos.map((taken) => taken.angle)).toEqual([...ANGLES]);
    const where = { lat: -36.84846, lng: 174.76333 };
    expect(body.photos[0]).toEqual({
      angle: 'FRONT',
      key: expect.any(String),
      takenAt: expect.any(String),
      exifTakenAt: '2026-01-04T20:30:00.000Z',
      ...where,
    });
    expect(body.photos[1]).toEqual({
      angle: 'REAR',
      key: expect.any(String),
      takenAt: expect.any(String),
      ...where,
    });
  });

  it('takes a photo with the in-app camera and uploads it like any other', async () => {
    mockHandover(() => handover());
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['frame'], { type: 'image/jpeg' })),
    );
    render('/trips/RV-7K2Q9M/check-in');

    await userEvent.click(await screen.findByRole('button', { name: 'Take the front photo' }));
    const camera = within(await screen.findByRole('dialog', { name: 'Front, photo 1 of 8' }));
    const video = document.querySelector('video')!;
    await vi.waitFor(() => expect(video.srcObject).toBe(stream));
    Object.defineProperty(video, 'videoWidth', { value: 1600 });
    Object.defineProperty(video, 'videoHeight', { value: 1200 });
    fireEvent.loadedMetadata(video);
    await userEvent.click(camera.getByRole('button', { name: 'Take the front photo' }));

    // The same way as a chosen photo: kept on the device, uploaded, then shown with its time.
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByText(/^Taken /)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Front, now' })).toBeInTheDocument();
    expect(vi.mocked(uploadFile)).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'INSPECTION_PHOTO',
        filename: 'front.jpg',
        contentType: 'image/jpeg',
      }),
    );
    expect(track.stop).toHaveBeenCalled();
    expect(screen.queryByText(/^Photo taken earlier/)).not.toBeInTheDocument();
  });

  it('says when check-in opens, and asks a guest to confirm their email first', async () => {
    mockHandover(() => handover({ actions: { ...handover().actions, checkIn: false } }));
    render('/trips/RV-7K2Q9M/check-in');
    expect(
      await screen.findByRole('heading', { name: 'Check-in opens 2 hours before the trip' }),
    ).toBeInTheDocument();
  });

  it('emails an unverified guest the link in one tap, then opens the photos once it’s confirmed', async () => {
    let current = handover({ emailVerificationNeeded: true });
    const sent = mockHandover(() => current);
    render('/trips/RV-7K2Q9M/check-in');

    expect(await screen.findByRole('heading', { name: 'Confirm your email first' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Email me the link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('We’ve sent a link to kiri@example.co.nz');
    expect(sent.filter((request) => request.path === '/auth/verify-email/resend')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Send it again' })).toBeInTheDocument();

    // Not opened yet: it says so.
    await userEvent.click(screen.getByRole('button', { name: 'I’ve confirmed it' }));
    expect(await screen.findByText(/Your email isn’t confirmed yet/)).toBeInTheDocument();

    current = handover();
    await userEvent.click(screen.getByRole('button', { name: 'I’ve confirmed it' }));
    expect(await screen.findByText(/1\/8$/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Confirm your email first' })).not.toBeInTheDocument();
  });

  it('checks the email again when the guest comes back, and says when the link can’t be sent', async () => {
    let current = handover({ emailVerificationNeeded: true });
    mockHandover(
      () => current,
      () => ({
        status: 429,
        body: { error: { code: 'RATE_LIMITED', message: 'Too many emails. Please wait a few minutes.' } },
      }),
    );
    render('/trips/RV-7K2Q9M/check-in');

    await userEvent.click(await screen.findByRole('button', { name: 'Email me the link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many emails. Please wait a few minutes.');

    // Back from the email app, after opening the link there.
    current = handover();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(await screen.findByText(/1\/8$/)).toBeInTheDocument();
  });

  it('opens the photos when the link turns out to be confirmed already', async () => {
    let current = handover({ emailVerificationNeeded: true });
    mockHandover(
      () => current,
      () => {
        current = handover();
        return { status: 200, body: { sent: false } };
      },
    );
    render('/trips/RV-7K2Q9M/check-in');
    await userEvent.click(await screen.findByRole('button', { name: 'Email me the link' }));
    expect(await screen.findByText(/1\/8$/)).toBeInTheDocument();
  });
});

describe('HandoverPage', () => {
  it('shows the check-in for the guest to confirm', async () => {
    const checkInReport = report();
    // The host chose the front photo from their gallery: it was taken in January.
    checkInReport.photos[0] = { ...checkInReport.photos[0]!, exifTakenAt: '2026-01-04T20:30:00.000Z' };
    // The rear one's camera clock is a few minutes out: nothing to say.
    checkInReport.photos[1] = { ...checkInReport.photos[1]!, exifTakenAt: '2026-10-11T21:20:00.000Z' };
    let current = handover({
      bookingStatus: 'ACTIVE',
      checkIn: checkInReport,
      actions: { ...handover().actions, checkIn: false, checkOut: true, confirmCheckIn: true },
    });
    const sent = mockHandover(() => current);
    render('/trips/RV-7K2Q9M/handover');

    const checkIn = await screen.findByRole('region', { name: 'Check-in' });
    expect(within(checkIn).getByText('45,210 km')).toBeInTheDocument();
    expect(within(checkIn).getByText('Host confirmed')).toBeInTheDocument();
    expect(within(checkIn).getByText('Guest to confirm')).toBeInTheDocument();
    expect(within(checkIn).getByText('Front bumper')).toBeInTheDocument();
    expect(within(checkIn).getAllByText(/^Photo taken earlier: /)).toHaveLength(1);
    expect(within(checkIn).getByText(/^Photo taken earlier: .*5 Jan 2026/)).toBeInTheDocument();
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

    // The guest did the check-out and it counts as confirmed, but they can still flag until the window closes.
    expect(await screen.findByText(/^Found new damage\? You can flag it until .*17 Oct/)).toBeInTheDocument();
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

  it('offers the case straight after a check-out that recorded new damage', async () => {
    const sent = mockHandover(() =>
      handover({
        bookingStatus: 'COMPLETED',
        checkIn: report(),
        checkOut: report({
          stage: 'CHECK_OUT',
          submittedBy: 'GUEST',
          damagePins: [{ id: 'p2', x: 80, y: 62, note: 'Dent', newDamage: true, flaggedBy: 'GUEST' }],
        }),
        actions: { ...handover().actions, checkIn: false, flagDamage: true },
      }),
    );
    // The check-out page goes here with this state once it's recorded.
    const { router } = render('/trips/RV-7K2Q9M/check-in');
    await router.navigate('/trips/RV-7K2Q9M/handover', { state: { checkOutDamage: true } });

    const offer = within(await screen.findByRole('dialog', { name: 'Your check-out recorded new damage' }));
    await userEvent.click(offer.getByRole('button', { name: 'Open an incident with this damage' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/incidents/IN-4F7K2Q'));
    expect(sent.find((request) => request.path === '/incidents')?.body).toMatchObject({
      type: 'DAMAGE',
      fromCheckOutDamage: true,
    });
  });

  it('doesn’t offer it again once it’s turned down', async () => {
    mockHandover(() =>
      handover({
        bookingStatus: 'COMPLETED',
        checkIn: report(),
        checkOut: report({
          stage: 'CHECK_OUT',
          submittedBy: 'GUEST',
          damagePins: [{ id: 'p2', x: 80, y: 62, note: 'Dent', newDamage: true, flaggedBy: 'GUEST' }],
        }),
        actions: { ...handover().actions, checkIn: false, flagDamage: true },
      }),
    );
    const { router } = render('/trips/RV-7K2Q9M/check-in');
    await router.navigate('/trips/RV-7K2Q9M/handover', { state: { checkOutDamage: true } });
    const offer = within(await screen.findByRole('dialog', { name: 'Your check-out recorded new damage' }));
    await userEvent.click(offer.getByRole('button', { name: 'Not now' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.state).toBeNull();
  });
});
