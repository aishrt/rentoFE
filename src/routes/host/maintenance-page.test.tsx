import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MaintenanceReminders } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { hostUser, sampleVehicle } from '@/features/host/host-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { MaintenancePage } from './maintenance-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const car = sampleVehicle({ status: 'ACTIVE', title: '2021 Toyota Corolla', onboardingStep: 6 });

const service = {
  id: 'r1',
  title: 'Service',
  dueAt: '2026-12-01',
  dueOdometer: 45000,
};

function api(start: MaintenanceReminders['reminders'] = []) {
  let reminders = start;
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: hostUser } };
      case 'GET /host/vehicles/v1':
        return { status: 200, body: { vehicle: car } };
      case 'GET /host/vehicles/v1/maintenance-reminders':
        return { status: 200, body: { reminders, latestOdometer: 42350 } };
      case 'PUT /host/vehicles/v1/maintenance-reminders': {
        const sent = (request.body as { reminders: { id?: string; title: string }[] }).reminders;
        reminders = sent.map((reminder, index) => ({ ...reminder, id: reminder.id ?? `r${index + 10}` }));
        return { status: 200, body: { reminders, latestOdometer: 42350 } };
      }
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      {
        path: '/host/vehicles/:id/maintenance',
        element: (
          <>
            <MaintenancePage />
            <Toaster />
          </>
        ),
      },
    ],
    '/host/vehicles/v1/maintenance',
  );

describe('MaintenancePage', () => {
  it('names the car, as its calendar does', async () => {
    api();
    render();

    expect(await screen.findByRole('link', { name: '2021 Toyota Corolla' })).toHaveAttribute(
      'href',
      '/host/vehicles/v1',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Maintenance reminders' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My vehicles' })).toHaveAttribute('href', '/host');
  });

  it('starts with no reminders and nothing to save, then adds and saves one', async () => {
    const user = userEvent.setup();
    const sent = api();
    render();

    expect(await screen.findByRole('heading', { name: 'No reminders yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save reminders' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a reminder' }));
    const title = screen.getByLabelText('What’s due');
    expect(title).toHaveFocus();
    await user.type(title, 'Tyre change');
    await user.click(screen.getByRole('button', { name: 'Save reminders' }));

    expect(await screen.findByText('Reminders saved')).toBeInTheDocument();
    const put = sent.find((request) => request.method === 'PUT');
    expect(put?.body).toEqual({ reminders: [{ title: 'Tyre change', done: false }] });
    // Saved, so nothing is left to save.
    expect(screen.getByRole('button', { name: 'Save reminders' })).toBeDisabled();
  });

  it('saves only once something changes, including removing every reminder', async () => {
    const user = userEvent.setup();
    const sent = api([service]);
    render();

    expect(await screen.findByDisplayValue('Service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save reminders' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Remove Service' }));
    expect(screen.getByRole('heading', { name: 'All reminders removed' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save reminders' }));

    expect(await screen.findByRole('heading', { name: 'No reminders yet' })).toBeInTheDocument();
    expect(sent.find((request) => request.method === 'PUT')?.body).toEqual({ reminders: [] });
    expect(screen.queryByRole('button', { name: 'Save reminders' })).not.toBeInTheDocument();
  });
});
