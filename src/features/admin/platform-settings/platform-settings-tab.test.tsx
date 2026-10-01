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
function mockSettingsApi() {
  let current: PlatformSettingsResponse = settingsResponseFixture;
  const sent: PlatformSettingsUpdate[] = [];
  const fetchMock = mockApi({
    'POST /auth/session': { status: 200, body: { user: adminUser } },
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

const card = async (name: string) => within(await screen.findByRole('region', { name }));

describe('Platform settings tab', () => {
  it('shows the admin every group, with how many decisions are still placeholders', async () => {
    mockSettingsApi();
    render('/admin/settings');

    await userEvent.click(await screen.findByRole('tab', { name: 'Platform settings' }));
    expect(await screen.findByText('10 of 10 decisions are still placeholders')).toBeInTheDocument();
    for (const name of [
      'Fees',
      'Cancellations',
      'Security deposit',
      'Driver eligibility and verification',
      'GST',
      'Protection plans and roadside assistance',
      'Reviews and trips',
      'Company and brand',
      'Other booking rules',
      'NZ licence check and plate lookup',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect((await card('Fees')).getByLabelText('Guest service fee')).toHaveValue('10');
  });

  it('saves a new service fee, keeping the rest of the fees', async () => {
    const { sent } = mockSettingsApi();
    render();

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
  });

  it('marks a decision confirmed by the client, with a note', async () => {
    const { sent } = mockSettingsApi();
    render();

    const gst = await card('GST');
    expect(gst.getByText('Placeholder: waiting for the client')).toBeInTheDocument();
    await userEvent.click(gst.getByLabelText('The client has confirmed these'));
    await userEvent.type(gst.getByLabelText('How it was confirmed (optional)'), "Accountant's email");
    await userEvent.click(gst.getByRole('button', { name: 'Save changes' }));

    expect(await gst.findByText('Confirmed by the client')).toBeInTheDocument();
    expect(sent[0]?.decisions).toEqual({ gst: { status: 'CONFIRMED', note: "Accountant's email" } });
    expect(screen.getByText('9 of 10 decisions are still placeholders')).toBeInTheDocument();
  });

  it('changes a cancellation tier’s refund rules and the Host cancellation fee', async () => {
    const { sent } = mockSettingsApi();
    render();

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
    render();

    const fees = await card('Fees');
    const field = fees.getByLabelText('Host commission');
    await userEvent.clear(field);
    await userEvent.type(field, '150');
    await userEvent.click(fees.getByRole('button', { name: 'Save changes' }));

    expect(await fees.findByText('Enter 0–100')).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it('saves the roadside assistance number with the protection plans', async () => {
    const { sent } = mockSettingsApi();
    render();

    const protection = await card('Protection plans and roadside assistance');
    await userEvent.type(protection.getByLabelText('Roadside assistance number'), '0800 123 456');
    await userEvent.click(protection.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Protection plans and roadside assistance saved')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({
      roadsideAssistance: { phone: '0800 123 456' },
      protectionPlans: settingsFixture.protectionPlans,
    });
  });

  it("shows the API's reason when it refuses the change", async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
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
    render();

    const deposit = await card('Security deposit');
    const field = deposit.getByLabelText('Deposit');
    await userEvent.clear(field);
    await userEvent.type(field, '500');
    await userEvent.click(deposit.getByRole('button', { name: 'Save changes' }));

    expect(await deposit.findByRole('alert')).toHaveTextContent('needs a code change');
  });

  it('is not shown to the support team, who only see their own sign-in', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /me/mfa': { status: 200, body: { enabled: false, maxDevices: 2, devices: [] } },
    });
    render();

    expect(await screen.findByRole('region', { name: 'Two-factor sign-in' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Platform settings' })).not.toBeInTheDocument();
    const calls = fetchMock.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
    expect(calls.some((url) => url.includes('/admin/settings'))).toBe(false);
  });
});
