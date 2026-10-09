import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicProfile, Review } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { MemberPage } from './member-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const hana: PublicProfile = {
  id: 'host-1',
  firstName: 'Hana',
  joinedYear: 2024,
  verified: true,
  asGuest: { rating: { avg: 5, count: 1 }, tripCount: 2 },
  asHost: { rating: { avg: 4.8, count: 12 }, tripCount: 31, responseRate: 96, bio: 'Kia ora!' },
};

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'rev1',
    bookingRef: '',
    direction: 'GUEST_TO_HOST',
    author: { id: 'g1', firstName: 'Kiri' },
    subject: { id: 'host-1', firstName: 'Hana' },
    vehicleTitle: '2022 Toyota RAV4',
    overall: 5,
    cleanliness: 5,
    body: 'Spotless car and a friendly host.',
    status: 'PUBLISHED',
    createdAt: '2026-09-20T01:00:00.000Z',
    ...overrides,
  };
}

function mockProfile(answer: { status: number; body: unknown }, user: typeof guestUser | null = guestUser) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /users/host-1/reviews':
        return answer;
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/members/:id', element: <MemberPage /> },
      { path: '/login', element: <p>Log in page</p> },
    ],
    '/members/host-1',
  );

describe('MemberPage', () => {
  it('shows what members may see of someone, and the reviews about them as host and as guest', async () => {
    mockProfile({
      status: 200,
      body: {
        profile: hana,
        reviews: [
          review(),
          review({
            id: 'rev2',
            direction: 'HOST_TO_GUEST',
            author: { id: 'h2', firstName: 'Mere' },
            cleanliness: undefined,
            care: 5,
            body: 'Left the car spotless.',
          }),
        ],
      },
    });
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana' })).toBeInTheDocument();
    expect(screen.getByText('Identity verified')).toBeInTheDocument();
    expect(screen.getByText('Member since 2024')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    // Only the fields plan §6.2 allows: the Host bio stays on their listings.
    expect(screen.queryByText('Kia ora!')).not.toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    const fromGuests = within(screen.getByRole('region', { name: 'Reviews from guests' }));
    expect(fromGuests.getByText('Spotless car and a friendly host.')).toBeInTheDocument();
    expect(fromGuests.queryByText('Left the car spotless.')).not.toBeInTheDocument();
    const fromHosts = within(screen.getByRole('region', { name: 'Reviews from hosts' }));
    expect(fromHosts.getByText('Left the car spotless.')).toBeInTheDocument();
    expect(fromHosts.getByRole('button', { name: 'Report Mere’s review' })).toBeInTheDocument();
  });

  it('shows a guest without host reviews, and says when nobody has reviewed them', async () => {
    mockProfile({
      status: 200,
      body: {
        profile: {
          ...hana,
          verified: false,
          asHost: undefined,
          asGuest: { rating: { avg: 0, count: 0 }, tripCount: 0 },
        },
        reviews: [],
      },
    });
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana' })).toBeInTheDocument();
    expect(screen.queryByText('Identity verified')).not.toBeInTheDocument();
    expect(screen.getByText('New guest')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reviews from guests' })).not.toBeInTheDocument();
    expect(screen.getByText('No host has reviewed Hana yet.')).toBeInTheDocument();
  });

  it('says so when the member can’t be found, such as a closed account', async () => {
    mockProfile({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'We couldn’t find that member.' } },
    });
    render();
    expect(await screen.findByRole('heading', { name: 'We couldn’t find this member' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse cars' })).toHaveAttribute('href', '/cars');
  });

  it('offers to try again when the profile doesn’t load', async () => {
    mockProfile({ status: 500, body: { error: { code: 'INTERNAL', message: 'Something went wrong.' } } });
    render();
    expect(await screen.findByRole('heading', { name: 'We couldn’t load this profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('is open to visitors, as the listing that links to it is, and sends them to log in to report', async () => {
    mockProfile({ status: 200, body: { profile: hana, reviews: [] } }, null);
    render();
    expect(await screen.findByRole('heading', { level: 1, name: 'Hana' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Report Hana' }));
    expect(await screen.findByText('Log in page')).toBeInTheDocument();
  });

  it('reports a member to the support team', async () => {
    const sent = mockRoutes((request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /auth/session':
          return { status: 200, body: { user: guestUser } };
        case 'GET /users/host-1/reviews':
          return { status: 200, body: { profile: hana, reviews: [] } };
        case 'POST /reports':
          return { status: 201, body: { report: { id: 'r1' } } };
        default:
          return undefined;
      }
    });
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Report Hana' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getAllByRole('radio')[0]!);
    await userEvent.click(dialog.getByRole('button', { name: 'Send report' }));
    await vi.waitFor(() =>
      expect(sent.find((entry) => entry.path === '/reports')?.body).toMatchObject({
        targetType: 'USER',
        targetId: 'host-1',
      }),
    );
  });

  it('doesn’t offer members a report on their own profile', async () => {
    mockProfile({ status: 200, body: { profile: { ...hana, id: guestUser.id }, reviews: [] } });
    render();
    expect(await screen.findByRole('heading', { level: 1, name: 'Hana' })).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByText('Member since 2024')).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Report Hana' })).not.toBeInTheDocument();
  });
});
