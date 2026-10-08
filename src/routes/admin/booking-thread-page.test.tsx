import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { staffThread } from '@/features/admin/bookings/test-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminBookingThreadPage } from './booking-thread-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (search = '') =>
  renderWithRouter(
    [{ path: '/admin/bookings/:ref/thread', element: <AdminBookingThreadPage /> }],
    `/admin/bookings/RV-7K2Q9M/thread${search}`,
  );

describe('AdminBookingThreadPage', () => {
  it('reads the messages opened from an incident, with both names and the audit notice', async () => {
    const fetchMock = mockApi({
      'GET /admin/bookings/RV-7K2Q9M/thread': { status: 200, body: staffThread() },
    });
    render('?context=INCIDENT:IN-4F7K2P');

    const log = within(await screen.findByRole('log', { name: 'Messages with Kiri and Liam' }));
    expect(log.getByText('Is the car ready for 10?')).toBeInTheDocument();
    expect(log.getByText('Yes, keys are in the lockbox.')).toBeInTheDocument();
    expect(log.getByText('Kiri (Guest) said:')).toBeInTheDocument();
    expect(log.getByText('Liam (Host) said:')).toBeInTheDocument();
    // Read-only: nothing to report or send.
    expect(screen.queryByRole('button', { name: /Report/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.getByText('Support staff read threads; they reply through the incident or ticket.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Opening these messages is recorded')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IN-4F7K2P' })).toHaveAttribute(
      'href',
      '/admin/incidents/IN-4F7K2P',
    );
    expect(screen.getByRole('link', { name: 'Booking RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    const url = new URL((fetchMock.mock.calls[0]![0] as Request).url);
    expect(url.searchParams.get('context')).toBe('INCIDENT:IN-4F7K2P');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['without a context', ''],
    ['with a context that names no case', '?context=TICKET'],
  ])('explains instead of loading %s', async (_name, search) => {
    const fetchMock = mockApi({});
    render(search);

    expect(
      await screen.findByRole('heading', { name: 'Open these messages from a case' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the booking' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's answer when the case isn't about this booking", async () => {
    mockApi({
      'GET /admin/bookings/RV-7K2Q9M/thread': {
        status: 403,
        body: {
          error: { code: 'NO_CONTEXT', message: 'That report, incident or ticket isn’t about this booking.' },
        },
      },
    });
    render('?context=TICKET:ST-8H2K4M');

    expect(
      await screen.findByRole('heading', { name: 'These messages can’t be opened from here' }),
    ).toBeInTheDocument();
    expect(screen.getByText('That report, incident or ticket isn’t about this booking.')).toBeInTheDocument();
  });

  it('says when there are no messages yet', async () => {
    mockApi({ 'GET /admin/bookings/RV-7K2Q9M/thread': { status: 200, body: staffThread({ messages: [] }) } });
    render('?context=TICKET:ST-8H2K4M');

    expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ST-8H2K4M' })).toHaveAttribute(
      'href',
      '/admin/support/ST-8H2K4M',
    );
  });
});
