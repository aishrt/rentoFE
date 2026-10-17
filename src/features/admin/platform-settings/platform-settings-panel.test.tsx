import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformSettingsResponse, PlatformSettingsUpdate } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { AdminSettingsPage } from '@/routes/admin/settings-page';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { settingsFixture, settingsResponseFixture } from './test-fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const supportUser = { ...adminUser, id: 'u3', email: 'sam@example.co.nz', roles: ['SUPPORT'] };

const render = (path = '/admin/settings?tab=platform') =>
  renderWithRouter(
    [
      {
        path: '/admin/settings',
        element: (
          <>
            <AdminSettingsPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

/** The API: GET returns the saved settings; PATCH merges like the backend (groups replace, decisions merge). */
function mockSettingsApi(saved: PlatformSettingsResponse = settingsResponseFixture) {
  let current = saved;
  const sent: PlatformSettingsUpdate[] = [];
  const fetchMock = mockApi({
    'POST /auth/session': { status: 200, body: { user: adminUser } },
    'GET /me/mfa': { status: 200, body: { enabled: false, maxDevices: 2, devices: [] } },
    'GET /admin/settings': () => ({ status: 200, body: current }),
    'PATCH /admin/settings': (init) => {
      const update = JSON.parse(String(init?.body)) as PlatformSettingsUpdate;
      sent.push(update);
      current = {
        settings: {
          ...current.settings,
          ...update,
          decisions: { ...current.settings.decisions, ...update.decisions },
        } as PlatformSettingsResponse['settings'],
        updatedAt: '2026-10-01T09:00:00.000Z',
        updatedBy: 'Aroha Admin',
      };
      return { status: 200, body: current };
    },
  });
  return { sent, fetchMock };
}

const menu = async () => within(await screen.findByRole('navigation', { name: 'Settings' }));
const card = async (name: string) => within(await screen.findByRole('region', { name }));
const openGroup = async (name: RegExp) => userEvent.click((await menu()).getByRole('link', { name }));

describe('Settings menu', () => {
  it('opens on the sign-in settings, with Platform settings and its groups listed below', async () => {
    mockSettingsApi();
    render('/admin/settings');

    expect(await screen.findByRole('region', { name: 'Two-factor sign-in' })).toBeInTheDocument();
    const nav = await menu();
    expect(nav.getByRole('link', { name: 'Your sign-in' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('button', { name: /^Platform settings/ })).toHaveAttribute('aria-expanded', 'true');
    // The count of decisions waiting arrives with the settings.
    expect(
      await nav.findByRole('button', { name: 'Platform settings, 13 waiting for the client' }),
    ).toBeInTheDocument();
    const groups = [
      'Overview',
      'Fees',
      'Cancellations',
      'Security deposit',
      'Driver eligibility',
      'GST',
      'Protection and roadside',
      'Reviews and trips',
      'Company and brand',
      'Other booking rules',
      'Listings and search',
      'Licence and plate checks',
      'Become a Host estimator',
      'Retention and risk',
    ];
    for (const name of groups) {
      expect(nav.getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    expect(nav.getByRole('link', { name: 'Fees, placeholder' })).toBeInTheDocument();
  });

  it('shows the overview, then one group at a time', async () => {
    mockSettingsApi();
    const { router } = render('/admin/settings');

    await openGroup(/^Overview/);
    expect(await screen.findByText('13 of 13 decisions are still placeholders')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=platform');
    expect(screen.queryByRole('region', { name: 'Two-factor sign-in' })).not.toBeInTheDocument();
    const overview = within(screen.getByRole('list', { name: 'Settings groups' }));
    expect(overview.getAllByRole('listitem')).toHaveLength(13);
    expect(overview.getByRole('link', { name: 'Fees' })).toHaveAccessibleDescription(
      'Placeholder 10% Guest service fee, 20% Host commission',
    );

    // A card on the overview opens its group.
    await userEvent.click(overview.getByRole('link', { name: 'GST' }));
    expect((await card('GST')).getByLabelText('GST rate')).toHaveValue('15');
    expect(router.state.location.search).toBe('?tab=platform&section=gst');
    // The overview stays mounted, hidden, like the groups.
    expect(screen.getByText('13 of 13 decisions are still placeholders')).not.toBeVisible();

    await openGroup(/^Fees/);
    expect((await card('Fees')).getByLabelText('Guest service fee')).toHaveValue('10');
    expect(screen.queryByRole('region', { name: 'GST' })).not.toBeInTheDocument();
    expect((await menu()).getByRole('link', { name: /^Fees/ })).toHaveAttribute('aria-current', 'page');
  });

  it('opens and closes the Platform settings group', async () => {
    mockSettingsApi();
    render('/admin/settings');

    const nav = await menu();
    const toggle = nav.getByRole('button', { name: /^Platform settings/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(nav.queryByRole('link', { name: /^Fees/ })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(nav.getByRole('link', { name: /^Fees/ })).toBeInTheDocument();
  });

  it('keeps unsaved changes when moving between groups, and marks them in the menu', async () => {
    mockSettingsApi();
    render('/admin/settings?tab=platform&section=fees');

    const field = (await card('Fees')).getByLabelText('Guest service fee');
    await userEvent.clear(field);
    await userEvent.type(field, '12');
    expect(
      await (await menu()).findByRole('link', { name: 'Fees, unsaved changes, placeholder' }),
    ).toBeInTheDocument();

    await openGroup(/^GST/);
    await card('GST');
    await openGroup(/^Fees/);
    expect((await card('Fees')).getByLabelText('Guest service fee')).toHaveValue('12');
  });

  it('is not shown to the support team, who only see their own sign-in', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /me/mfa': { status: 200, body: { enabled: false, maxDevices: 2, devices: [] } },
    });
    render();

    expect(await screen.findByRole('region', { name: 'Two-factor sign-in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument();
    const calls = fetchMock.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
    expect(calls.some((url) => url.includes('/admin/settings'))).toBe(false);
  });
});

describe('Platform settings', () => {
  it('saves a new service fee, keeping the rest of the fees', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=fees');

    const fees = await card('Fees');
    const field = fees.getByLabelText('Guest service fee');
    await userEvent.clear(field);
    await userEvent.type(field, '12');
    await userEvent.click(fees.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Fees saved')).toBeInTheDocument();
    expect(sent).toEqual([
      {
        fees: { ...settingsFixture.fees, guestServiceFeePct: 12 },
        decisions: { fees: { status: 'PENDING', note: '' } },
      },
    ]);
    expect(await (await menu()).findByRole('link', { name: 'Fees, placeholder' })).toBeInTheDocument();
  });

  it('marks a decision confirmed by the client, with a note', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=gst');

    const gst = await card('GST');
    expect(gst.getByText('Placeholder: waiting for the client')).toBeInTheDocument();
    await userEvent.click(gst.getByLabelText('The client has confirmed these'));
    await userEvent.type(gst.getByLabelText('How it was confirmed (optional)'), "Accountant's email");
    await userEvent.click(gst.getByRole('button', { name: 'Save changes' }));

    expect(await gst.findByText('Confirmed by the client')).toBeInTheDocument();
    expect(sent[0]?.decisions).toEqual({ gst: { status: 'CONFIRMED', note: "Accountant's email" } });
    const nav = await menu();
    expect(nav.getByRole('link', { name: 'GST, confirmed' })).toBeInTheDocument();
    expect(
      nav.getByRole('button', { name: 'Platform settings, 12 waiting for the client' }),
    ).toBeInTheDocument();

    await openGroup(/^Overview/);
    expect(await screen.findByText('12 of 13 decisions are still placeholders')).toBeInTheDocument();
    expect(screen.getByText(/Last saved by Aroha Admin on/)).toBeInTheDocument();
  });

  it('changes a cancellation tier’s refund rules and the Host cancellation fee', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=cancellation');

    const cancellations = await card('Cancellations');
    const refunds = cancellations.getAllByLabelText('Refund');
    // Flexible's second rule: 50% from 0 hours.
    await userEvent.clear(refunds[1]!);
    await userEvent.type(refunds[1]!, '25');
    const fee = cancellations.getByLabelText('Host cancellation fee');
    await userEvent.clear(fee);
    await userEvent.type(fee, '50');
    await userEvent.click(cancellations.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Cancellations saved')).toBeInTheDocument();
    const cancellation = sent[0]?.cancellation;
    expect(cancellation?.tiers[0]?.refunds).toEqual([
      { minHoursBefore: 24, refundPct: 100 },
      { minHoursBefore: 0, refundPct: 25 },
    ]);
    expect(cancellation?.hostCancellationFeeCents).toBe(5_000);
    expect(cancellation?.tiers.map((tier) => tier.code)).toEqual(['FLEXIBLE', 'MODERATE', 'STRICT']);
  });

  it('checks the values before sending them', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=fees');

    const fees = await card('Fees');
    const field = fees.getByLabelText('Host commission');
    await userEvent.clear(field);
    await userEvent.type(field, '150');
    await userEvent.click(fees.getByRole('button', { name: 'Save changes' }));

    expect(await fees.findByText('Enter 0–100')).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it('changes the quiet hours for texts, checking each is a 24-hour time', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=reviewsAndTrips');

    const section = await card('Reviews and trips');
    const start = section.getByLabelText('Quiet hours for texts start at');
    const end = section.getByLabelText('Quiet hours end at');
    expect(start).toHaveValue('21:00');
    expect(end).toHaveValue('07:00');

    await userEvent.clear(start);
    await userEvent.type(start, '25:00');
    await userEvent.clear(end);
    await userEvent.type(end, '25:00');
    await userEvent.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await section.findAllByText('Enter a 24-hour time, like 21:00')).toHaveLength(2);

    await userEvent.clear(start);
    await userEvent.type(start, '7:00');
    await userEvent.clear(end);
    await userEvent.type(end, '07:00');
    await userEvent.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await section.findByText('Choose an end time different from the start')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(start);
    await userEvent.type(start, '22:30');
    await userEvent.clear(end);
    await userEvent.type(end, '6:45');
    await userEvent.click(section.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Reviews and trips saved')).toBeInTheDocument();
    expect(sent[0]?.sms).toEqual({ quietHoursStart: '22:30', quietHoursEnd: '06:45' });
    expect(sent[0]?.reviews).toEqual(settingsFixture.reviews);
  });

  it('saves the roadside assistance number with the protection plans', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=protection');

    const protection = await card('Protection plans and roadside assistance');
    await userEvent.type(protection.getByLabelText('Roadside assistance number'), '0800 123 456');
    await userEvent.click(protection.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Protection plans and roadside assistance saved')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({
      roadsideAssistance: { phone: '0800 123 456' },
      protectionPlans: settingsFixture.protectionPlans,
    });
  });

  it('gives a protection plan its own roadside number, and leaves the others on the main one', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=protection');

    const protection = await card('Protection plans and roadside assistance');
    const planNumbers = protection.getAllByLabelText('Roadside assistance number (optional)');
    expect(planNumbers).toHaveLength(settingsFixture.protectionPlans.length);
    await userEvent.type(planNumbers[1]!, 'roadside');
    await userEvent.click(protection.getByRole('button', { name: 'Save changes' }));
    expect(await protection.findByText('Enter a phone number, like 0800 123 456')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(planNumbers[1]!);
    await userEvent.type(planNumbers[1]!, '0800 765 432');
    await userEvent.click(protection.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Protection plans and roadside assistance saved')).toBeInTheDocument();
    expect(sent[0]?.protectionPlans?.map((plan) => plan.roadsidePhone)).toEqual([
      undefined,
      '0800 765 432',
      undefined,
    ]);
  });

  it('keeps the retention periods above their floors, and saves them with the risk thresholds', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=retentionAndRisk');

    const retention = await card('Retention and risk');
    const auditLog = retention.getByLabelText('Audit log');
    expect(auditLog).toHaveValue('7');
    await userEvent.clear(auditLog);
    await userEvent.type(auditLog, '0');
    const flags = retention.getByLabelText('Bookings started in 24 hours');
    await userEvent.clear(flags);
    await userEvent.type(flags, '0');
    await userEvent.click(retention.getByRole('button', { name: 'Save changes' }));
    expect(await retention.findByText('Enter 7–50 years')).toBeInTheDocument();
    expect(retention.getByText('Enter 1–100')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(auditLog);
    await userEvent.type(auditLog, '10');
    await userEvent.clear(flags);
    await userEvent.type(flags, '8');
    await userEvent.click(retention.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Retention and risk saved')).toBeInTheDocument();
    expect(sent).toEqual([
      {
        retention: { ...settingsFixture.retention, auditLogYears: 10 },
        risk: { ...settingsFixture.risk, bookingsPerDay: 8 },
        decisions: { retentionAndRisk: { status: 'PENDING', note: '' } },
      },
    ]);
  });

  it('changes how long messages stay open after a trip, keeping the other trip settings', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=reviewsAndTrips');

    const trips = await card('Reviews and trips');
    expect(trips.getByLabelText('Time to leave a review')).toHaveAccessibleDescription(
      'From when the trip is completed: at check-out, or when our team completes it.',
    );
    const field = trips.getByLabelText('Messages stay open for');
    expect(field).toHaveValue('30');
    await userEvent.clear(field);
    await userEvent.type(field, '60');
    await userEvent.click(trips.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Reviews and trips saved')).toBeInTheDocument();
    expect(sent[0]?.trips).toEqual({ ...settingsFixture.trips, threadReadOnlyDays: 60 });
  });

  it('changes when extra kilometres are checked before they’re charged', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=reviewsAndTrips');

    const trips = await card('Reviews and trips');
    const field = trips.getByLabelText('Check extra kilometres above');
    expect(field).toHaveValue('1000');
    await userEvent.clear(field);
    await userEvent.type(field, '0');
    await userEvent.click(trips.getByRole('button', { name: 'Save changes' }));
    expect(await trips.findByText('Enter 1–10,000 km')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(field);
    await userEvent.type(field, '600');
    await userEvent.click(trips.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Reviews and trips saved')).toBeInTheDocument();
    expect(sent[0]?.trips).toEqual({ ...settingsFixture.trips, extraKmReviewAboveKmPerDay: 600 });
  });

  it('saves what a listing needs and the search limits, checking each range', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=listingsAndSearch');

    const listings = await card('Listings and search');
    expect(listings.getByLabelText('Insurance')).toBeChecked();
    expect(listings.getByLabelText('Boot')).toBeChecked();
    expect(listings.getByLabelText('Lowest daily price')).toHaveValue('20');
    const fewest = listings.getByLabelText('Fewest seats');
    const most = listings.getByLabelText('Most seats');
    await userEvent.clear(most);
    await userEvent.type(most, '1');
    const start = listings.getByLabelText('Search radius to start with');
    await userEvent.clear(start);
    await userEvent.type(start, '400');
    await userEvent.click(listings.getByRole('button', { name: 'Save changes' }));
    expect(await listings.findByText('Make it at least the fewest seats')).toBeInTheDocument();
    expect(listings.getByText('Choose a default between the smallest and largest')).toBeInTheDocument();
    expect(fewest).toHaveValue('2');
    expect(sent).toEqual([]);

    await userEvent.clear(most);
    await userEvent.type(most, '9');
    await userEvent.clear(start);
    await userEvent.type(start, '30');
    await userEvent.click(listings.getByLabelText('Boot'));
    const discount = listings.getByLabelText('Weekly and monthly discounts up to');
    await userEvent.clear(discount);
    await userEvent.type(discount, '40');
    const highest = listings.getByLabelText('Highest daily price');
    await userEvent.clear(highest);
    await userEvent.type(highest, '1,500');
    const longest = listings.getByLabelText('Longest trip');
    await userEvent.clear(longest);
    await userEvent.type(longest, '60');
    await userEvent.click(listings.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Listings and search saved')).toBeInTheDocument();
    expect(sent).toEqual([
      {
        vehicles: {
          ...settingsFixture.vehicles,
          requiredPhotoAngles: ['FRONT', 'REAR', 'DRIVER', 'PASSENGER', 'INTERIOR', 'DASH', 'TYRES'],
          seats: { min: 2, max: 9 },
          dailyPriceCents: { min: 2_000, max: 150_000 },
          maxDiscountPct: 40,
        },
        search: { maxTripDays: 60, radiusKm: { min: 5, default: 30, max: 300 } },
        decisions: { listingsAndSearch: { status: 'PENDING', note: '' } },
      },
    ]);
  });

  it('saves the Become a Host estimator’s typical prices and booked days', async () => {
    const { sent } = mockSettingsApi();
    render('/admin/settings?tab=platform&section=hostEstimator');

    const estimator = await card('Become a Host estimator');
    const days = estimator.getByLabelText('Days booked each month');
    expect(days).toHaveValue('10');
    await userEvent.clear(days);
    await userEvent.type(days, '31');
    await userEvent.click(estimator.getByRole('button', { name: 'Save changes' }));
    expect(await estimator.findByText('Enter 1–30 days')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(days);
    await userEvent.type(days, '12');
    const suv = estimator.getByLabelText('SUV');
    expect(suv).toHaveValue('95');
    await userEvent.clear(suv);
    await userEvent.type(suv, '99.50');
    await userEvent.click(estimator.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Become a Host estimator saved')).toBeInTheDocument();
    expect(sent[0]?.hostEstimator).toEqual({
      bookedDaysPerMonth: 12,
      dailyCentsByBodyType: { ...settingsFixture.hostEstimator.dailyCentsByBodyType, SUV: 9_950 },
    });
  });

  it('saves the company card with a GST number saved before the check digit was checked, but checks a new one', async () => {
    const { sent } = mockSettingsApi({
      settings: { ...settingsFixture, business: { ...settingsFixture.business, gstNumber: '123-456-789' } },
    });
    render('/admin/settings?tab=platform&section=company');

    const company = await card('Company and brand');
    const name = company.getByLabelText('Legal name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Rento Vroom Limited');
    await userEvent.click(company.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Company and brand saved')).toBeInTheDocument();
    expect(sent[0]?.business).toEqual({
      legalName: 'Rento Vroom Limited',
      gstNumber: '123-456-789',
      supportEmail: 'rentovroom@gmail.com',
    });

    const gst = company.getByLabelText('GST number');
    await userEvent.clear(gst);
    await userEvent.type(gst, '123-456-788');
    await userEvent.click(company.getByRole('button', { name: 'Save changes' }));

    expect(
      await company.findByText('That isn’t a valid GST number. Check it on the IRD registration.'),
    ).toBeInTheDocument();
    expect(sent).toHaveLength(1);
  });

  it("shows the API's reason when it refuses the change", async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /me/mfa': { status: 200, body: { enabled: false, maxDevices: 2, devices: [] } },
      'GET /admin/settings': { status: 200, body: settingsResponseFixture },
      'PATCH /admin/settings': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some details need fixing.',
            fields: {
              'cancellation.tiers': 'Adding, removing or renaming cancellation tiers needs a code change.',
            },
          },
        },
      },
    });
    render('/admin/settings?tab=platform&section=securityDeposit');

    const deposit = await card('Security deposit');
    const field = deposit.getByLabelText('Deposit');
    await userEvent.clear(field);
    await userEvent.type(field, '500');
    await userEvent.click(deposit.getByRole('button', { name: 'Save changes' }));

    expect(await deposit.findByRole('alert')).toHaveTextContent('needs a code change');
  });
});
