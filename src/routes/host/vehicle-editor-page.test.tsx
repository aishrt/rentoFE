import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostVehicle } from '@/api/types';
import { hostUser, samplePolicies, sampleVehicle } from '@/features/host/host-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { VehicleEditorPage } from './vehicle-editor-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path: string) =>
  renderWithRouter(
    [
      { path: '/host/vehicles/:id/:step?', element: <VehicleEditorPage /> },
      { path: '/host', element: <p>Host home</p> },
      { path: '/host/bookings', element: <p>Host bookings</p> },
    ],
    path,
  );

/** The session, the policies and the car, plus any other handlers. */
function api(vehicle: HostVehicle, handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /auth/session': { status: 200, body: { user: hostUser } },
    'GET /policies': { status: 200, body: samplePolicies },
    'GET /host/vehicles/v1': { status: 200, body: { vehicle } },
    'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
    ...handlers,
  });
}

const body = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;

describe('VehicleEditorPage', () => {
  it('saves step 1 with PATCH, including the furthest step, then moves on to documents', async () => {
    let sent: Record<string, unknown> | undefined;
    api(sampleVehicle(), {
      'PATCH /host/vehicles/v1': (init) => {
        sent = body(init);
        return { status: 200, body: { vehicle: sampleVehicle({ onboardingStep: 2, make: 'Toyota' }) } };
      },
    });
    const { router } = render('/host/vehicles/v1/1');

    await userEvent.type(await screen.findByLabelText('Number plate'), 'abc 123');
    await userEvent.type(screen.getByLabelText('VIN'), 'jtdkb20u093123456');
    await userEvent.type(screen.getByLabelText('Make'), 'Toyota');
    await userEvent.type(screen.getByLabelText('Model'), 'Corolla');
    await userEvent.type(screen.getByLabelText('Year'), '2021');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/host/vehicles/v1/2');
    expect(sent).toMatchObject({
      regoPlate: 'ABC123',
      vin: 'JTDKB20U093123456',
      chassisNo: null,
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      onboardingStep: 2,
    });
  });

  it("shows the API's field errors on the fields, and stays on the step", async () => {
    api(sampleVehicle({ make: 'Toyota' }), {
      'PATCH /host/vehicles/v1': {
        status: 409,
        body: {
          error: {
            code: 'PLATE_TAKEN',
            message: 'This number plate is already on another listing.',
            fields: {
              regoPlate: 'This number plate is already on another listing. Contact support if it’s your car.',
            },
          },
        },
      },
    });
    const { router } = render('/host/vehicles/v1/1');

    await userEvent.type(await screen.findByLabelText('Number plate'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText(
        'This number plate is already on another listing. Contact support if it’s your car.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Number plate')).toHaveAttribute('aria-invalid', 'true');
    expect(router.state.location.pathname).toBe('/host/vehicles/v1/1');
  });

  it('puts a dotted API error such as pricing.dailyCents on the daily price', async () => {
    api(sampleVehicle({ onboardingStep: 4 }), {
      'PATCH /host/vehicles/v1': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some details need fixing.',
            fields: { 'pricing.dailyCents': 'The daily price must be $20–$2000' },
          },
        },
      },
    });
    render('/host/vehicles/v1/4');

    await userEvent.type(await screen.findByLabelText('Price per day (NZD)'), '89');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('The daily price must be $20–$2000')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per day (NZD)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('checks formats before saving, without calling the API', async () => {
    const patch = vi.fn();
    api(sampleVehicle(), { 'PATCH /host/vehicles/v1': () => (patch(), { status: 200 }) });
    render('/host/vehicles/v1/1');

    await userEvent.type(await screen.findByLabelText('VIN'), 'NOT A VIN');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText('VINs have 17 letters and numbers, without I, O or Q'),
    ).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it('saves and returns to the Host home with Save & exit', async () => {
    let sent: Record<string, unknown> | undefined;
    api(sampleVehicle({ onboardingStep: 5 }), {
      'PATCH /host/vehicles/v1': (init) => {
        sent = body(init);
        return { status: 200, body: { vehicle: sampleVehicle({ onboardingStep: 5 }) } };
      },
    });
    render('/host/vehicles/v1/5');

    await userEvent.click(await screen.findByRole('radio', { name: /Instant Book on/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save & exit' }));

    expect(await screen.findByText('Host home')).toBeInTheDocument();
    expect(sent).toEqual({
      rules: { minNoticeHours: 12, bufferHours: 2, instantBook: true },
      onboardingStep: 5,
    });
  });

  it('saves the step on the way back to the Host home, as Save & exit does', async () => {
    const patch = vi.fn(() => ({ status: 200, body: { vehicle: sampleVehicle({ onboardingStep: 5 }) } }));
    api(sampleVehicle({ onboardingStep: 5 }), { 'PATCH /host/vehicles/v1': patch });
    render('/host/vehicles/v1/5');

    await userEvent.click(await screen.findByRole('radio', { name: /Instant Book on/ }));
    await userEvent.click(screen.getByRole('link', { name: 'Hosting' }));

    expect(await screen.findByText('Host home')).toBeInTheDocument();
    expect(patch).toHaveBeenCalledOnce();
  });

  describe('unsaved changes', () => {
    /** A link elsewhere on the site, such as the header's or the Host menu's. */
    const leaveFor = (router: ReturnType<typeof render>['router'], path: string) =>
      act(async () => {
        await router.navigate(path);
      });

    it('asks before another link leaves a changed step, and can leave without saving', async () => {
      const patch = vi.fn();
      api(sampleVehicle({ onboardingStep: 5 }), {
        'PATCH /host/vehicles/v1': () => (patch(), { status: 200 }),
      });
      const { router } = render('/host/vehicles/v1/5');

      await userEvent.click(await screen.findByRole('radio', { name: /Instant Book on/ }));
      await leaveFor(router, '/host/bookings');

      const dialog = await screen.findByRole('dialog', { name: 'Save your changes?' });
      expect(router.state.location.pathname).toBe('/host/vehicles/v1/5');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Leave without saving' }));

      expect(await screen.findByText('Host bookings')).toBeInTheDocument();
      expect(patch).not.toHaveBeenCalled();
    });

    it('saves the step, then leaves, with Save and leave', async () => {
      let sent: Record<string, unknown> | undefined;
      api(sampleVehicle({ onboardingStep: 5 }), {
        'PATCH /host/vehicles/v1': (init) => {
          sent = body(init);
          return { status: 200, body: { vehicle: sampleVehicle({ onboardingStep: 5 }) } };
        },
      });
      const { router } = render('/host/vehicles/v1/5');

      await userEvent.click(await screen.findByRole('radio', { name: /Instant Book on/ }));
      await leaveFor(router, '/host/bookings');
      await userEvent.click(await screen.findByRole('button', { name: 'Save and leave' }));

      expect(await screen.findByText('Host bookings')).toBeInTheDocument();
      expect(sent).toMatchObject({ rules: { instantBook: true } });
    });

    it('stays on the step when asked to', async () => {
      api(sampleVehicle({ onboardingStep: 5 }));
      const { router } = render('/host/vehicles/v1/5');

      await userEvent.click(await screen.findByRole('radio', { name: /Instant Book on/ }));
      await leaveFor(router, '/host/bookings');
      await userEvent.click(await screen.findByRole('button', { name: 'Stay on this step' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/host/vehicles/v1/5');
      expect(screen.getByRole('radio', { name: /Instant Book on/ })).toBeChecked();
    });

    it('has the browser ask before the tab closes, only while there are unsaved changes', async () => {
      api(sampleVehicle({ onboardingStep: 5 }));
      render('/host/vehicles/v1/5');
      const closeTab = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };

      await screen.findByRole('radio', { name: /Instant Book on/ });
      expect(closeTab()).toBe(false);
      await userEvent.click(screen.getByRole('radio', { name: /Instant Book on/ }));
      expect(closeTab()).toBe(true);
    });

    it('lets the Host leave an unchanged step without asking', async () => {
      api(sampleVehicle({ onboardingStep: 5 }));
      const { router } = render('/host/vehicles/v1/5');

      await screen.findByRole('radio', { name: /Instant Book on/ });
      await leaveFor(router, '/host/bookings');

      expect(await screen.findByText('Host bookings')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('resumes a draft at the step it reached', async () => {
    api(sampleVehicle({ onboardingStep: 4 }));
    const { router } = render('/host/vehicles/v1');

    expect(await screen.findByRole('heading', { name: 'Pricing' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/host/vehicles/v1/4');
  });

  it('lists what is missing by step, and shows what the API found when submitting', async () => {
    const vehicle = sampleVehicle({
      onboardingStep: 6,
      checklist: {
        complete: false,
        missing: [
          { step: 2, field: 'documents.WOF', message: 'Upload the WOF' },
          { step: 3, field: 'photos.REAR', message: 'Add a photo of the rear' },
        ],
        flags: [{ code: 'LOW_QUALITY_PHOTO', message: 'The front photo may be too dark' }],
      },
    });
    api(vehicle, {
      'POST /host/vehicles/v1/submit': {
        status: 400,
        body: {
          error: {
            code: 'LISTING_INCOMPLETE',
            message: 'A few things are missing before you can submit.',
            fields: { 'documents.WOF': 'Upload the WOF', 'photos.REAR': 'Add a photo of the rear' },
          },
        },
      },
    });
    render('/host/vehicles/v1/review');

    const missing = within(await screen.findByRole('region', { name: 'Still to do before you can submit' }));
    expect(missing.getByText(/Documents/)).toBeInTheDocument();
    expect(missing.getByText('Upload the WOF')).toBeInTheDocument();
    expect(missing.getByRole('button', { name: /Go to photos/ })).toBeInTheDocument();
    expect(screen.getByText('The front photo may be too dark')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A few things are missing before you can submit.');
    expect(alert).toHaveTextContent('Add a photo of the rear');
  });

  it('submits a complete listing and says what happens next', async () => {
    const vehicle = sampleVehicle({ onboardingStep: 6, title: '2021 Toyota Corolla' });
    api(vehicle, {
      'POST /host/vehicles/v1/submit': {
        status: 200,
        body: { vehicle: { ...vehicle, status: 'UNDER_REVIEW', slug: '2021-toyota-corolla-auckland' } },
      },
    });
    render('/host/vehicles/v1/review');

    expect(await screen.findByText("Everything's in place")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    expect(await screen.findByText('Submitted for review')).toBeInTheDocument();
    expect(screen.getByText('Our team reviews your listing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up the calendar' })).toHaveAttribute(
      'href',
      '/host/vehicles/v1/calendar',
    );
  });

  it('asks before a key detail sends a live listing back for review', async () => {
    let sent: Record<string, unknown> | undefined;
    const live = sampleVehicle({
      status: 'ACTIVE',
      onboardingStep: 6,
      title: '2021 Toyota Corolla',
      regoPlate: 'ABC123',
      vin: 'JTDKB20U093123456',
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
    });
    api(live, {
      'PATCH /host/vehicles/v1': (init) => {
        sent = body(init);
        return { status: 200, body: { vehicle: { ...live, status: 'UNDER_REVIEW', year: 2022 } } };
      },
    });
    render('/host/vehicles/v1/1');

    expect(await screen.findByText('Editing a live listing')).toBeInTheDocument();
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2022');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const dialog = await screen.findByRole('dialog', { name: 'Send your listing back for review?' });
    expect(dialog).toHaveTextContent('You changed the year.');
    expect(sent).toBeUndefined();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save and send for review' }));

    await vi.waitFor(() => expect(sent).toMatchObject({ year: 2022, onboardingStep: 6 }));
  });
});
