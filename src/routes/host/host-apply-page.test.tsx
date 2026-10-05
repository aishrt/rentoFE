import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, mockApi, renderWithRouter } from '@/test/utils';
import { HostApplyPage } from './host-apply-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const guest = { ...guestUser, hostStatus: null };
const verifiedGuest = { ...guest, phone: '+64211234567', phoneVerified: true };
const hostProfile = {
  status: 'APPLIED',
  appliedAt: '2026-09-30T00:00:00.000Z',
  gstRegistered: false,
  payoutsEnabled: false,
  rating: { avg: 0, count: 0 },
  tripCount: 0,
};

const render = () =>
  renderWithRouter(
    [
      { path: '/host/apply', element: <HostApplyPage /> },
      { path: '/host/vehicles/new', element: <p>New car</p> },
      { path: '/host', element: <p>Host home</p> },
    ],
    '/host/apply',
  );

describe('HostApplyPage', () => {
  it('asks for a verified mobile before sending the application', async () => {
    const apply = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: guest } },
      'POST /me/host-application': () => {
        apply();
        return { status: 200, body: { host: hostProfile } };
      },
    });
    render();

    await userEvent.click(await screen.findByLabelText(/I've read and agree to the/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(
      await screen.findByText('Verify your mobile number first, then submit your application.'),
    ).toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
  });

  it('verifies the mobile inline, then applies, refreshes the session and moves on to the first car', async () => {
    let sent: unknown;
    let sessionCalls = 0;
    mockApi({
      'POST /auth/session': () => {
        sessionCalls += 1;
        return {
          status: 200,
          body: { user: sessionCalls === 1 ? guest : { ...verifiedGuest, hostStatus: 'APPLIED' } },
        };
      },
      'POST /auth/phone/otp': { status: 200, body: { phone: '+64211234567', sent: true } },
      'POST /auth/phone/verify': { status: 200, body: { user: verifiedGuest } },
      'POST /me/host-application': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { host: hostProfile } };
      },
    });
    const { router } = render();

    await userEvent.type(await screen.findByLabelText('Mobile number'), '021 123 4567');
    await userEvent.click(screen.getByRole('button', { name: 'Text me a code' }));
    await userEvent.type(await screen.findByLabelText('Code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify number' }));
    expect(await screen.findByText(/is verified/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('About you'), 'I look after my car.');
    await userEvent.click(screen.getByLabelText(/I've read and agree to the/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('New car')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/host/vehicles/new');
    expect(sent).toEqual({ bio: 'I look after my car.', gstRegistered: false, acceptHostAgreement: true });
    await vi.waitFor(() => expect(sessionCalls).toBe(2));
  });

  it('needs a GST number in the right shape when registered for GST', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: verifiedGuest } },
      'POST /me/host-application': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { host: { ...hostProfile, gstRegistered: true } } };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('switch', { name: "I'm registered for GST" }));
    await userEvent.click(screen.getByLabelText(/I've read and agree to the/));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Enter your GST number')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('GST number'), '12345');
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('GST numbers look like 123-456-789')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(screen.getByLabelText('GST number'));
    await userEvent.type(screen.getByLabelText('GST number'), '123-456-789');
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await vi.waitFor(() =>
      expect(sent).toEqual({ gstRegistered: true, gstNumber: '123-456-789', acceptHostAgreement: true }),
    );
  });

  it('sends anyone who has already applied to their Host home', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...verifiedGuest, hostStatus: 'APPLIED' } } },
    });
    render();

    expect(await screen.findByText('Host home')).toBeInTheDocument();
  });
});
