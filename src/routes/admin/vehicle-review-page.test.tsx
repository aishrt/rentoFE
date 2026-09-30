import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminVehicle, CalendarBlock, HostCalendar, HostVehicle } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminVehicleReviewPage } from './vehicle-review-page';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/admin/vehicles/:id',
        element: (
          <>
            <AdminVehicleReviewPage />
            <Toaster />
          </>
        ),
      },
    ],
    '/admin/vehicles/v1',
  );

const vehicle: HostVehicle = {
  id: 'v1',
  slug: '2021-toyota-corolla-auckland',
  title: '2021 Toyota Corolla',
  status: 'UNDER_REVIEW',
  onboardingStep: 6,
  regoPlate: 'ABC123',
  vin: 'JTDBR32E720123456',
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  variant: 'GX',
  bodyType: 'HATCHBACK',
  fuelType: 'HYBRID',
  transmission: 'AUTOMATIC',
  seats: 5,
  doors: 5,
  powertrain: { engineCc: 1798, cylinders: 4 },
  features: ['Apple CarPlay', 'Reversing camera'],
  petFriendly: true,
  childSeat: false,
  damageNotes: 'Small dent on the rear bumper',
  regoExpiry: '2099-03-31',
  wofExpiry: '2020-08-01',
  ownerIsHost: true,
  pricing: { dailyCents: 8900, weeklyDiscountPct: 10, monthlyDiscountPct: 20, extraKmCents: 35 },
  kmAllowancePerDay: 200,
  unlimitedKm: false,
  fuelPolicy: 'SAME_LEVEL',
  rules: {
    minDays: 1,
    maxDays: 30,
    minNoticeHours: 24,
    bufferHours: 3,
    instantBook: true,
    cancellationTier: 'MODERATE',
  },
  photos: [
    { id: 'p2', type: 'REAR', url: 'https://img.test/rear.jpg', status: 'PENDING', qualityFlag: 'DARK' },
    { id: 'p1', type: 'FRONT', url: 'https://img.test/front.jpg', status: 'PENDING', qualityFlag: 'OK' },
    { id: 'p3', type: 'INTERIOR', url: 'https://img.test/inside.jpg', status: 'APPROVED', qualityFlag: 'OK' },
  ],
  documents: [
    { id: 'd2', type: 'WOF', status: 'PENDING', expiry: '2099-02-01', link: 'https://files.test/wof?s=1' },
    { id: 'd1', type: 'REGO', status: 'PENDING', expiry: '2099-03-31', link: 'https://files.test/rego?s=1' },
  ],
  deliveryOptions: [
    {
      id: 'o1',
      type: 'PICKUP',
      label: 'Pick-up from the Host',
      address: {
        streetNumber: '14',
        street: 'Ponsonby Road',
        suburb: 'Ponsonby',
        city: 'Auckland',
        region: 'Auckland',
        postcode: '1011',
        lat: -36.85,
        lng: 174.75,
      },
      feeCents: 0,
    },
    {
      id: 'o2',
      type: 'AIRPORT',
      label: 'Auckland Airport',
      airportCode: 'AKL',
      feeCents: 4500,
      instructions: 'Meet at the domestic terminal pick-up zone.',
    },
  ],
  recurringRules: [],
  suburb: 'Ponsonby',
  city: 'Auckland',
  rating: { avg: 0, count: 0 },
  tripCount: 0,
  checklist: {
    complete: false,
    missing: [{ step: 3, field: 'photos.BOOT', message: 'Add a photo of the boot' }],
    flags: [
      { code: 'LOW_QUALITY_PHOTO', message: 'The rear photo may be too dark' },
      { code: 'DAMAGE_WITHOUT_PHOTO', message: 'Existing damage is declared but there is no damage photo' },
    ],
  },
  createdAt: '2026-09-20T01:00:00.000Z',
  updatedAt: '2026-09-28T01:00:00.000Z',
};

const host: AdminVehicle['host'] = {
  id: 'h1',
  name: 'Mere Parata',
  email: 'mere@example.co.nz',
  status: 'APPROVED',
  emailVerified: true,
  phoneVerified: false,
};

// Whole days in NZ time: 12 to 14 October (the end is exclusive: midnight starting the 15th).
const staffBlock: CalendarBlock = {
  id: 'b1',
  start: '2026-10-11T11:00:00.000Z',
  end: '2026-10-14T11:00:00.000Z',
  reason: 'ADMIN',
  note: 'Windscreen repair',
};
const trip: CalendarBlock = {
  id: 'b2',
  start: '2026-10-20T21:00:00.000Z',
  end: '2026-10-23T21:00:00.000Z',
  reason: 'BOOKED',
  booking: { id: 'bk1', ref: 'RV-7K2P9Q', status: 'CONFIRMED', guestFirstName: 'Sam' },
};
const hostBlock: CalendarBlock = {
  id: 'b3',
  start: '2026-10-30T11:00:00.000Z',
  end: '2026-10-31T11:00:00.000Z',
  reason: 'HOST_BLOCK',
};

const calendarWith = (blocks: CalendarBlock[]): HostCalendar => ({
  from: '2026-10-04T11:00:00.000Z',
  to: '2026-12-04T11:00:00.000Z',
  blocks,
  rules: { minNoticeHours: 24, bufferHours: 3 },
});

const listing = (patch: Partial<HostVehicle> = {}, hostPatch: Partial<AdminVehicle['host']> = {}) => ({
  status: 200,
  body: { vehicle: { ...vehicle, ...patch }, host: { ...host, ...hostPatch } } satisfies AdminVehicle,
});

const baseHandlers = {
  'GET /admin/vehicles/v1': listing(),
  'GET /admin/vehicles/v1/calendar': { status: 200, body: calendarWith([]) },
};

const section = async (name: string) => within(await screen.findByRole('region', { name }));
const decisionBar = async () => section('Decision');

describe('AdminVehicleReviewPage: what staff see', () => {
  it('shows the details, dates, prices, addresses, checks and Host', async () => {
    mockApi(baseHandlers);
    render();

    expect(await screen.findByRole('heading', { level: 1, name: '2021 Toyota Corolla' })).toBeInTheDocument();

    const details = await section('Vehicle details');
    expect(details.getAllByText('ABC123').length).toBeGreaterThan(0);
    expect(details.getByText('JTDBR32E720123456')).toBeInTheDocument();
    expect(details.getByText('1,798 cc · 4 cylinders')).toBeInTheDocument();
    expect(details.getByText('Hybrid')).toBeInTheDocument();
    expect(details.getByText('Pet friendly')).toBeInTheDocument();
    expect(details.getByText('Reversing camera')).toBeInTheDocument();
    expect(details.getByText('Small dent on the rear bumper')).toBeInTheDocument();
    expect(details.getByText('The Host')).toBeInTheDocument();

    const compliance = await section('Registration and WOF');
    expect(compliance.getByText('31/03/2099')).toBeInTheDocument();
    expect(compliance.getByText('Expired')).toBeInTheDocument();

    const pricing = await section('Pricing and trip rules');
    expect(pricing.getByText('$89')).toBeInTheDocument();
    expect(pricing.getByText('$0.35 a km')).toBeInTheDocument();
    expect(pricing.getByText('200 km a day')).toBeInTheDocument();
    expect(pricing.getByText('1 to 30 days')).toBeInTheDocument();
    expect(pricing.getByText('Moderate')).toBeInTheDocument();

    const delivery = await section('Pick-up and delivery');
    expect(delivery.getByText('14 Ponsonby Road, Ponsonby, Auckland 1011')).toBeInTheDocument();
    expect(delivery.getByText('$45 fee · Airport AKL')).toBeInTheDocument();
    expect(delivery.getByText('Meet at the domestic terminal pick-up zone.')).toBeInTheDocument();

    const checks = await section('Checks');
    expect(checks.getByText('Step 3: Photos')).toBeInTheDocument();
    expect(checks.getByText('Add a photo of the boot')).toBeInTheDocument();
    expect(checks.getByText('The rear photo may be too dark')).toBeInTheDocument();

    const hostPanel = await section('Host');
    expect(hostPanel.getByText('Mere Parata')).toBeInTheDocument();
    expect(hostPanel.getByText('(verified)')).toBeInTheDocument();
    expect(hostPanel.getByText('Not verified')).toBeInTheDocument();
    expect(hostPanel.queryByRole('link', { name: /Host applications/ })).not.toBeInTheDocument();
  });

  it('shows photos by angle with their quality flags, and opens documents in a new tab', async () => {
    mockApi(baseHandlers);
    render();

    const photos = await section('Photos');
    const names = photos.getAllByRole('listitem').map((item) => item.getAttribute('aria-label'));
    expect(names).toEqual(['Front photo', 'Rear photo', 'Interior photo']);
    const rear = within(photos.getByRole('listitem', { name: 'Rear photo' }));
    expect(rear.getByText('May be too dark')).toBeInTheDocument();
    expect(rear.getByText('Waiting')).toBeInTheDocument();
    // An approved photo can still be rejected, but not approved again.
    const interior = within(photos.getByRole('listitem', { name: 'Interior photo' }));
    expect(interior.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();

    const documents = await section('Documents');
    const rego = within(documents.getByRole('listitem', { name: 'Registration' }));
    expect(rego.getByText('Expires 31/03/2099')).toBeInTheDocument();
    const open = rego.getByRole('link', { name: 'Open the registration (new tab)' });
    expect(open).toHaveAttribute('href', 'https://files.test/rego?s=1');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it("says when the Host isn't approved, with a link to their application", async () => {
    mockApi({ ...baseHandlers, 'GET /admin/vehicles/v1': listing({}, { status: 'APPLIED' }) });
    render();

    const hostPanel = await section('Host');
    expect(hostPanel.getByText('Approve their Host application before this listing.')).toBeInTheDocument();
    expect(hostPanel.getByRole('link', { name: 'Open Host applications' })).toHaveAttribute(
      'href',
      '/admin/host-applications',
    );

    const bar = await decisionBar();
    const approve = bar.getByRole('button', { name: 'Approve listing' });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAccessibleDescription(/Approve the Host's application first/);
    expect(bar.getByRole('button', { name: 'Request changes' })).toBeEnabled();
  });

  it('says when the listing is missing', async () => {
    mockApi({
      'GET /admin/vehicles/v1': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No such car.' } },
      },
    });
    render();

    expect(await screen.findByRole('heading', { name: "We couldn't find that listing" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the review queue' })).toHaveAttribute(
      'href',
      '/admin/vehicles',
    );
  });
});

describe('AdminVehicleReviewPage: photos and documents', () => {
  it('approves a photo, and rejects one after asking', async () => {
    const sent: unknown[] = [];
    let photos = vehicle.photos;
    const decide = (photoId: string, status: 'APPROVED' | 'REJECTED') => (init: RequestInit | undefined) => {
      sent.push({ photoId, ...JSON.parse(String(init?.body)) });
      photos = photos.map((photo) =>
        photo.id === photoId
          ? { ...photo, status, qualityFlag: status === 'REJECTED' ? 'ADMIN_FLAGGED' : photo.qualityFlag }
          : photo,
      );
      return { status: 200, body: { vehicle: { ...vehicle, photos } } };
    };
    mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/photos/p1': decide('p1', 'APPROVED'),
      'POST /admin/vehicles/v1/photos/p2': decide('p2', 'REJECTED'),
    });
    render();

    const photoSection = await section('Photos');
    await userEvent.click(photoSection.getByRole('button', { name: 'Approve the front photo' }));
    expect(await screen.findByText('Front photo approved')).toBeInTheDocument();
    const front = within(photoSection.getByRole('listitem', { name: 'Front photo' }));
    expect(front.getByText('Approved')).toBeInTheDocument();
    expect(front.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();

    await userEvent.click(photoSection.getByRole('button', { name: 'Reject the rear photo' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject the rear photo?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reject photo' }));
    expect(await screen.findByText('Rear photo rejected')).toBeInTheDocument();
    const rear = within(photoSection.getByRole('listitem', { name: 'Rear photo' }));
    expect(rear.getByText('Rejected')).toBeInTheDocument();
    expect(rear.getByText('Flagged by staff')).toBeInTheDocument();

    expect(sent).toEqual([
      { photoId: 'p1', decision: 'APPROVE' },
      { photoId: 'p2', decision: 'REJECT' },
    ]);
  });

  it('verifies a document, and rejects one after asking', async () => {
    const sent: unknown[] = [];
    let documents = vehicle.documents;
    const decide =
      (documentId: string, status: 'VERIFIED' | 'REJECTED') => (init: RequestInit | undefined) => {
        sent.push({ documentId, ...JSON.parse(String(init?.body)) });
        documents = documents.map((document) =>
          document.id === documentId ? { ...document, status } : document,
        );
        return { status: 200, body: { vehicle: { ...vehicle, documents } } };
      };
    mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/documents/d1': decide('d1', 'VERIFIED'),
      'POST /admin/vehicles/v1/documents/d2': decide('d2', 'REJECTED'),
    });
    render();

    const documentSection = await section('Documents');
    await userEvent.click(documentSection.getByRole('button', { name: 'Verify the registration' }));
    expect(await screen.findByText('Registration verified')).toBeInTheDocument();
    expect(
      within(documentSection.getByRole('listitem', { name: 'Registration' })).getByText('Verified'),
    ).toBeInTheDocument();

    await userEvent.click(documentSection.getByRole('button', { name: 'Reject the WOF' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject the WOF?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reject document' }));
    expect(await screen.findByText('Warrant of Fitness (WOF) rejected')).toBeInTheDocument();

    expect(sent).toEqual([
      { documentId: 'd1', decision: 'VERIFY' },
      { documentId: 'd2', decision: 'REJECT' },
    ]);
  });
});

describe('AdminVehicleReviewPage: the decision', () => {
  it("shows why a listing can't be approved when the Host isn't approved after all", async () => {
    const fetchMock = mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/approve': {
        status: 409,
        body: { error: { code: 'HOST_NOT_APPROVED', message: "Approve the Host's application first." } },
      },
    });
    render();

    await userEvent.click((await decisionBar()).getByRole('button', { name: 'Approve listing' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve this listing?' }));
    await userEvent.type(dialog.getByLabelText('Note for the Host (optional)'), 'Looks great.');
    await userEvent.click(dialog.getByRole('button', { name: 'Approve listing' }));

    const alert = await dialog.findByRole('alert');
    expect(alert).toHaveTextContent("Approve the Host's application first.");
    expect(within(alert).getByRole('link', { name: 'Open Host applications' })).toBeInTheDocument();
    const approveCall = fetchMock.mock.calls.find(([input]) =>
      (input as Request).url.endsWith('/admin/vehicles/v1/approve'),
    );
    expect(approveCall).toBeDefined();
  });

  it('approves a listing, which then goes live', async () => {
    let sent: unknown;
    mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/approve': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { vehicle: { ...vehicle, status: 'ACTIVE' } } };
      },
    });
    render();

    await userEvent.click((await decisionBar()).getByRole('button', { name: 'Approve listing' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve this listing?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Approve listing' }));

    expect(await screen.findByText('Listing approved')).toBeInTheDocument();
    expect(sent).toEqual({});
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    // Once live, it can't be sent back: only single photos or documents can be rejected.
    const bar = await decisionBar();
    expect(bar.getByRole('button', { name: 'Request changes' })).toBeDisabled();
    expect(bar.getByText(/A live listing can't be sent back/)).toBeInTheDocument();
  });

  it('needs a note to request changes, then shows the listing as sent back', async () => {
    let sent: unknown;
    mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/request-changes': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: {
            vehicle: { ...vehicle, status: 'CHANGES_REQUESTED', reviewNotes: 'Add a photo of the boot.' },
          },
        };
      },
    });
    render();

    await userEvent.click((await decisionBar()).getByRole('button', { name: 'Request changes' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Request changes?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Request changes' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(dialog.getByLabelText('What needs changing'), 'Add a photo of the boot.');
    await userEvent.click(dialog.getByRole('button', { name: 'Request changes' }));

    expect(await screen.findByText('Sent back for changes')).toBeInTheDocument();
    expect(sent).toEqual({ notes: 'Add a photo of the boot.' });
    expect(screen.getByText('Last note to the Host')).toBeInTheDocument();
    const bar = await decisionBar();
    for (const name of ['Reject', 'Request changes', 'Approve listing']) {
      expect(bar.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('rejects a listing with a note', async () => {
    let sent: unknown;
    mockApi({
      ...baseHandlers,
      'POST /admin/vehicles/v1/reject': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { vehicle: { ...vehicle, status: 'REJECTED' } } };
      },
    });
    render();

    await userEvent.click((await decisionBar()).getByRole('button', { name: 'Reject' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject this listing?' }));
    await userEvent.type(dialog.getByLabelText("Why it's rejected"), 'The plate does not match the papers.');
    await userEvent.click(dialog.getByRole('button', { name: 'Reject listing' }));

    expect(await screen.findByText('Listing rejected')).toBeInTheDocument();
    expect(sent).toEqual({ notes: 'The plate does not match the papers.' });
  });

  it('offers only the new photos and documents on a live listing', async () => {
    mockApi({ ...baseHandlers, 'GET /admin/vehicles/v1': listing({ status: 'ACTIVE' }) });
    render();

    const bar = await decisionBar();
    expect(bar.getByRole('button', { name: 'Approve new photos and documents' })).toBeEnabled();
    expect(bar.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(bar.getByRole('button', { name: 'Reject' })).toHaveAccessibleDescription(
      "A live listing can't be sent back: reject single photos or documents instead.",
    );
  });
});

describe('AdminVehicleReviewPage: calendar override', () => {
  it('shows the next two months by reason, blocks dates and removes a block', async () => {
    // 1 pm on 5 October in New Zealand. Only Date is faked, so user events still run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T00:00:00.000Z'));

    let blocks = [staffBlock, trip, hostBlock];
    let sent: unknown;
    const fetchMock = mockApi({
      'GET /admin/vehicles/v1': listing(),
      'GET /admin/vehicles/v1/calendar': () => ({ status: 200, body: calendarWith(blocks) }),
      'POST /admin/vehicles/v1/blocks': (init) => {
        sent = JSON.parse(String(init?.body));
        const block: CalendarBlock = {
          id: 'b4',
          start: '2026-10-04T11:00:00.000Z',
          end: '2026-10-07T11:00:00.000Z',
          reason: 'ADMIN',
          note: 'Hail damage check',
        };
        blocks = [block, ...blocks];
        return { status: 201, body: { block } };
      },
      'DELETE /admin/vehicles/v1/blocks/b1': () => {
        blocks = blocks.filter((block) => block.id !== 'b1');
        return { status: 204 };
      },
    });
    render();

    const calendar = await section('Calendar override');
    expect(await calendar.findByText('Blocked by staff: 1')).toBeInTheDocument();
    expect(calendar.getByText('Trip: 1')).toBeInTheDocument();
    expect(calendar.getByText('RV-7K2P9Q')).toBeInTheDocument();
    expect(calendar.getByText(/Sam · Confirmed/)).toBeInTheDocument();
    expect(calendar.getByText('Mon, 12 Oct – Wed, 14 Oct')).toBeInTheDocument();
    expect(calendar.getByText('“Windscreen repair”')).toBeInTheDocument();
    // A trip's dates are never removed here; staff and Host blocks are.
    expect(calendar.getAllByRole('button', { name: /^Remove the block/ })).toHaveLength(2);
    const calendarUrl = String(
      (fetchMock.mock.calls.find(([input]) => (input as Request).url.includes('/calendar'))?.[0] as Request)
        .url,
    );
    expect(calendarUrl).toContain('from=2026-10-05');
    expect(calendarUrl).toContain('to=2026-12-05');

    // Block 5 to 7 October, whole days.
    await userEvent.click(calendar.getByRole('button', { name: /^Last day/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Wednesday, 7 October 2026' }));
    await userEvent.type(calendar.getByLabelText('Note (optional)'), 'Hail damage check');
    await userEvent.click(calendar.getByRole('button', { name: 'Block these dates' }));

    expect(await screen.findByText('Dates blocked')).toBeInTheDocument();
    expect(sent).toEqual({ start: '2026-10-05', end: '2026-10-08', note: 'Hail damage check' });
    expect(await calendar.findByText('Blocked by staff: 2')).toBeInTheDocument();

    await userEvent.click(
      calendar.getByRole('button', { name: 'Remove the block Mon, 12 Oct – Wed, 14 Oct' }),
    );
    expect(await screen.findByText('Block removed')).toBeInTheDocument();
    expect(await calendar.findByText('Blocked by staff: 1')).toBeInTheDocument();
    expect(calendar.queryByText('Mon, 12 Oct – Wed, 14 Oct')).not.toBeInTheDocument();
  });

  it("blocks set times, and says when they'd cover a trip", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T00:00:00.000Z'));

    let sent: unknown;
    mockApi({
      'GET /admin/vehicles/v1': listing(),
      'GET /admin/vehicles/v1/calendar': { status: 200, body: calendarWith([trip]) },
      'POST /admin/vehicles/v1/blocks': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 409,
          body: {
            error: {
              code: 'BOOKED_DATES',
              message:
                'Some of those dates are booked or held for a guest. Choose other dates, or cancel the booking first.',
            },
          },
        };
      },
    });
    render();

    const calendar = await section('Calendar override');
    await userEvent.click(await calendar.findByLabelText('Whole days'));
    // Same day, same time: the end has to be later.
    await userEvent.click(calendar.getByRole('button', { name: 'Block these dates' }));
    expect(await calendar.findByText('The end needs to be after the start')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.click(calendar.getByRole('button', { name: /^End time/ }));
    await userEvent.click(await screen.findByRole('option', { name: '4:00 pm' }));
    await userEvent.click(calendar.getByRole('button', { name: 'Block these dates' }));

    expect(await calendar.findByRole('alert')).toHaveTextContent(
      'Some of those dates are booked or held for a guest.',
    );
    expect(sent).toEqual({ start: '2026-10-05T10:00', end: '2026-10-05T16:00' });
  });
});
