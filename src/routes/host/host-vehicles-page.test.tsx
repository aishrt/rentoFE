import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostVehicleSummary } from '@/api/types';
import { hostUser } from '@/features/host/host-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { HostVehiclesPage } from './host-vehicles-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter([{ path: '/host/vehicles', element: <HostVehiclesPage /> }], '/host/vehicles');

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

describe('HostVehiclesPage', () => {
  it('lists each car with its status, what is left and where to go next, in the Host area', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /threads/unread': { status: 200, body: { count: 0 } },
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

    expect(screen.getByRole('heading', { level: 1, name: 'My vehicles' })).toBeInTheDocument();
    const hosting = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(hosting.getByRole('link', { name: 'Vehicles' })).toHaveAttribute('aria-current', 'page');
    const tabs = within(screen.getByRole('navigation', { name: 'Hosting, quick links' }));
    expect(tabs.getByRole('link', { name: 'Vehicles' })).toHaveAttribute('aria-current', 'page');

    expect(await screen.findByText('2 cars')).toBeInTheDocument();
    // The cars, not the Host area's tabs around them.
    const [draft, live] = screen.getAllByRole('listitem').filter((item) => !item.closest('nav'));
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

  it('deletes a draft after asking once', async () => {
    let listed = [summary({})];
    const remove = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: hostUser } },
      'GET /threads/unread': { status: 200, body: { count: 0 } },
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

  it('leaves out adding a car while hosting is suspended', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...hostUser, hostStatus: 'SUSPENDED' } } },
      'GET /threads/unread': { status: 200, body: { count: 0 } },
      'GET /host/vehicles': {
        status: 200,
        body: { vehicles: [summary({ id: 'v2', title: '2021 Toyota Corolla', status: 'ACTIVE' })] },
      },
    });
    render();

    expect(await screen.findByText('1 car')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add a car' })).not.toBeInTheDocument();
  });
});
