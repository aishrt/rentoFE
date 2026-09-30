import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewQueueItem } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminVehicleQueuePage } from './vehicle-queue-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter([{ path: '/admin/vehicles', element: <AdminVehicleQueuePage /> }], '/admin/vehicles');

const corolla: ReviewQueueItem = {
  id: 'v1',
  title: '2021 Toyota Corolla',
  status: 'UNDER_REVIEW',
  host: { id: 'h1', name: 'Mere Parata', status: 'APPROVED' },
  city: 'Auckland',
  pendingPhotos: 8,
  pendingDocuments: 3,
  flags: 2,
  // 9 am on 26 September in New Zealand.
  updatedAt: '2026-09-25T21:00:00.000Z',
};

const rav4: ReviewQueueItem = {
  id: 'v2',
  title: '2019 Toyota RAV4',
  status: 'ACTIVE',
  host: { id: 'h2', name: 'Tama Rewi', status: 'APPLIED' },
  pendingPhotos: 1,
  pendingDocuments: 0,
  flags: 0,
  updatedAt: '2026-09-28T21:00:00.000Z',
};

const row = async (name: string) =>
  within((await screen.findByRole('link', { name })).closest('tr') as HTMLElement);

describe('AdminVehicleQueuePage', () => {
  it('lists listings under review and live ones with new files, each linking to its review', async () => {
    mockApi({ 'GET /admin/vehicles': { status: 200, body: { vehicles: [corolla, rav4] } } });
    render();

    expect(await screen.findByRole('link', { name: '2021 Toyota Corolla' })).toHaveAttribute(
      'href',
      '/admin/vehicles/v1',
    );
    const first = await row('2021 Toyota Corolla');
    expect(first.getByText('Under review')).toBeInTheDocument();
    expect(first.getByText('Mere Parata')).toBeInTheDocument();
    expect(first.getByText('Approved')).toBeInTheDocument();
    expect(first.getByText('Auckland')).toBeInTheDocument();
    expect(first.getByText('8 photos, 3 documents')).toBeInTheDocument();
    expect(first.getByText('2 flags')).toBeInTheDocument();
    expect(first.getByText('26/09/2026')).toBeInTheDocument();

    const second = await row('2019 Toyota RAV4');
    expect(second.getByText('Live, new photos')).toBeInTheDocument();
    expect(second.getByText('1 photo')).toBeInTheDocument();
    expect(second.getByText('None')).toBeInTheDocument();
    // The Host isn't approved yet, so the listing can't be either.
    expect(second.getByText('Applied')).toBeInTheDocument();
    expect(second.getByRole('link', { name: 'Host application' })).toHaveAttribute(
      'href',
      '/admin/host-applications',
    );
    expect(screen.getByText('2 listings waiting')).toBeInTheDocument();
  });

  it('says when the queue is empty', async () => {
    mockApi({ 'GET /admin/vehicles': { status: 200, body: { vehicles: [] } } });
    render();

    expect(await screen.findByRole('heading', { name: 'Nothing to review' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/vehicles': {
        status: 500,
        body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load the queue");
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
