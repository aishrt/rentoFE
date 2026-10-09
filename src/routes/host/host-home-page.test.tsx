import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  });

  it('shows the application under review, and each car with its status and what is left', async () => {
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
    const [draft, live] = await screen.findAllByRole('listitem');
    expect(within(draft!).getByText('Draft')).toBeInTheDocument();
    expect(within(draft!).getByText(/5 things left to add · you reached documents/)).toBeInTheDocument();
    expect(within(draft!).getByRole('link', { name: /Continue listing/ })).toHaveAttribute(
      'href',
      '/host/vehicles/v1',
    );
    expect(within(live!).getByText('Live')).toBeInTheDocument();
    expect(within(live!).getByText('New photos or documents waiting for approval')).toBeInTheDocument();
    expect(within(live!).getByRole('link', { name: 'Calendar' })).toHaveAttribute(
      'href',
      '/host/vehicles/v2/calendar',
    );
    expect(within(live!).getByRole('link', { name: 'Maintenance' })).toHaveAttribute(
      'href',
      '/host/vehicles/v2/maintenance',
    );
    // A draft has no calendar or maintenance yet.
    expect(within(draft!).queryByRole('link', { name: 'Calendar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a car' })).toHaveAttribute('href', '/host/vehicles/new');
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

  it('deletes a draft after asking once', async () => {
    let listed = [summary({})];
    const remove = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /host/vehicles': () => ({ status: 200, body: { vehicles: listed } }),
      'DELETE /host/vehicles/v1': () => {
        remove();
        listed = [];
        return { status: 204 };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete the draft Your new listing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Add your first car')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(1);
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
