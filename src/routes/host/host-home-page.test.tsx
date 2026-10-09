import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostVehicleSummary } from '@/api/types';
import { confirmedBooking, readiness, summary as bookingSummary } from '@/features/booking/test-fixtures';
import { handover } from '@/features/handover/test-fixtures';
import { hostUser } from '@/features/host/host-fixtures';
import { policies } from '@/features/vehicles/test-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { HostHomePage } from './host-home-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () => renderWithRouter([{ path: '/host', element: <HostHomePage /> }], '/host');

const summary = (overrides: Partial<HostVehicleSummary>): HostVehicleSummary => ({
  id: 'v1',
  slug: 'draft-v1',
  title: 'Untitled car',
  status: 'DRAFT',
  waitingForPayouts: false,
  onboardingStep: 2,
  photo: null,
  missingCount: 5,
  pendingChanges: false,
  dailyCents: null,
  updatedAt: '2026-09-30T00:00:00.000Z',
  ...overrides,
});

describe('HostHomePage', () => {
  it('invites someone who has not applied to start hosting', async () => {
    mockApi({
      'POST /auth/session': {
        status: 200,
        body: { user: { ...hostUser, roles: ['GUEST'], hostStatus: null } },
      },
    });
    render();

    expect(
      await screen.findByRole('heading', { name: 'Earn from your car when you’re not using it' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start hosting' })).toHaveAttribute('href', '/host/apply');
    // Not a Host yet: no Host area around it.
    expect(screen.queryByRole('navigation', { name: 'Hosting' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Hosting, quick links' })).not.toBeInTheDocument();
  });

  it('is Today in the Host area, with the places the phone’s tabs leave out', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
    });
    render();

    const sidebar = within(await screen.findByRole('navigation', { name: 'Hosting' }));
    expect(sidebar.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    const tabs = within(screen.getByRole('navigation', { name: 'Hosting, quick links' }));
    expect(tabs.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    const more = within(screen.getByRole('navigation', { name: 'More hosting' }));
    expect(more.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Bookings', '/host/bookings'],
      ['Reviews', '/account/reviews?as=host'],
      ['Profile', '/host/profile'],
    ]);
  });

  it('shows the application under review, and the cars at a glance with the way to My vehicles', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /host/vehicles': {
        status: 200,
        body: {
          vehicles: [
            summary({}),
            summary({
              id: 'v2',
              title: '2021 Toyota Corolla',
              status: 'ACTIVE',
              pendingChanges: true,
              missingCount: 0,
              dailyCents: 8900,
            }),
          ],
        },
      },
    });
    render();

    expect(await screen.findByText('Your application is under review')).toBeInTheDocument();
    const cars = within(await screen.findByRole('region', { name: 'My vehicles' }));
    expect(cars.getByText('2 cars · 1 live · 1 draft to finish')).toBeInTheDocument();
    expect(cars.getByRole('link', { name: /Your new listing/ })).toHaveAttribute('href', '/host/vehicles/v1');
    expect(cars.getByRole('link', { name: /2021 Toyota Corolla/ })).toHaveAttribute(
      'href',
      '/host/vehicles/v2',
    );
    expect(cars.getByRole('link', { name: 'All vehicles' })).toHaveAttribute('href', '/host/vehicles');
  });

  it('asks an applicant to verify their identity before the application is approved', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /me/host-profile': {
        status: 200,
        body: {
          host: {
            status: 'APPLIED',
            appliedAt: '2026-10-08T00:00:00.000Z',
            gstRegistered: false,
            payoutsEnabled: false,
            identityRequired: true,
            rating: { avg: 0, count: 0 },
            tripCount: 0,
          },
        },
      },
      'GET /me/checkout': { status: 200, body: readiness({ identityStatus: 'NONE' }) },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
    });
    render();

    expect(await screen.findByText('One step left: verify your identity')).toBeInTheDocument();
    expect(screen.queryByText('Your application is under review')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verify your identity' })).toBeInTheDocument();
  });

  it("shows our team's notes when the application wasn't approved", async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...hostUser, hostStatus: 'REJECTED' } } },
      'GET /me/host-profile': {
        status: 200,
        body: {
          host: {
            status: 'REJECTED',
            appliedAt: '2026-09-29T00:00:00.000Z',
            reviewNotes: 'We could not verify your licence.',
            gstRegistered: false,
            payoutsEnabled: false,
            rating: { avg: 0, count: 0 },
            tripCount: 0,
          },
        },
      },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
    });
    render();

    expect(await screen.findByText('We could not verify your licence.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apply again' })).toHaveAttribute('href', '/host/apply');
    expect(screen.queryByRole('link', { name: 'Add a car' })).not.toBeInTheDocument();
  });

  it('asks a Host with no cars yet to add their first', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'Add your first car' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a car' })).toHaveAttribute('href', '/host/vehicles/new');
  });

  it('shows an approved Host what to do, urgent first', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...hostUser, hostStatus: 'APPROVED' } } },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
      'GET /bookings': { status: 200, body: { bookings: [] } },
      'GET /host/todo': {
        status: 200,
        body: {
          items: [
            {
              kind: 'PAYOUT_SETUP',
              title: 'Set up payouts',
              detail: 'An approved listing goes live once it’s done.',
              link: '/host/earnings',
              urgent: true,
            },
            {
              kind: 'MAINTENANCE',
              title: '2021 Toyota Corolla: Service',
              link: '/host/vehicles/v1/maintenance',
              urgent: false,
            },
          ],
        },
      },
    });
    render();

    const todo = within(await screen.findByRole('region', { name: 'To do' }));
    expect(todo.getByRole('link', { name: /Set up payouts/ })).toHaveAttribute('href', '/host/earnings');
    expect(todo.getByText('Now')).toBeInTheDocument();
    expect(todo.getByRole('link', { name: /Service/ })).toHaveAttribute(
      'href',
      '/host/vehicles/v1/maintenance',
    );
    expect(screen.queryByRole('region', { name: 'Trips under way' })).not.toBeInTheDocument();
  });

  it('puts the trips under way at the top: one on the road, and one to check in', async () => {
    const HOUR = 3_600_000;
    const end = new Date(Date.now() + 26 * HOUR).toISOString();
    const kiri = { firstName: 'Kiri' };
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...hostUser, hostStatus: 'APPROVED' } } },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
      'GET /host/todo': { status: 200, body: { items: [] } },
      'GET /policies': { status: 200, body: policies },
      'GET /bookings': {
        status: 200,
        body: {
          bookings: [
            bookingSummary({ id: 'bk1', ref: 'RV-ONROAD', status: 'ACTIVE', otherParty: kiri, end }),
            bookingSummary({
              id: 'bk2',
              ref: 'RV-STARTED',
              otherParty: kiri,
              start: new Date(Date.now() - HOUR).toISOString(),
            }),
          ],
        },
      },
      'GET /bookings/RV-ONROAD': {
        status: 200,
        body: {
          booking: confirmedBooking({
            ref: 'RV-ONROAD',
            status: 'ACTIVE',
            role: 'HOST',
            end,
            guest: { ...confirmedBooking().guest, phone: '+64219876543' },
          }),
        },
      },
      'GET /bookings/RV-STARTED/inspections': {
        status: 200,
        body: { handover: handover({ ref: 'RV-STARTED', role: 'HOST' }) },
      },
    });
    render();

    const now = within(await screen.findByRole('region', { name: 'Trips under way' }));
    expect(await now.findByRole('heading', { name: /^Kiri returns it by/ })).toBeInTheDocument();
    expect(now.getByRole('link', { name: 'Call Kiri' })).toHaveAttribute('href', 'tel:+64219876543');
    // A day from the return time: no check-out yet.
    expect(now.queryByRole('link', { name: 'Start check-out' })).not.toBeInTheDocument();

    expect(now.getByRole('heading', { name: 'Check in with Kiri' })).toBeInTheDocument();
    expect(await now.findByRole('link', { name: 'Start check-in' })).toHaveAttribute(
      'href',
      '/host/bookings/RV-STARTED/check-in',
    );
    expect(
      now.getAllByRole('link', { name: 'Open booking' }).map((link) => link.getAttribute('href')),
    ).toEqual(['/host/bookings/RV-ONROAD', '/host/bookings/RV-STARTED']);
    expect(now.getAllByRole('link', { name: 'Message Kiri' })).toHaveLength(2);
  });
});
