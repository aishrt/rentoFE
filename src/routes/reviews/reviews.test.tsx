import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MyReviews, Review } from '@/api/types';
import { confirmedBooking } from '@/features/booking/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { ReviewsPage } from '@/routes/account/reviews-page';
import { guestUser, renderWithRouter } from '@/test/utils';
import { WriteReviewPage } from './write-review-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const review = (overrides: Partial<Review> = {}): Review => ({
  id: 'r1',
  bookingRef: 'RV-7K2Q9M',
  direction: 'HOST_TO_GUEST',
  author: { id: 'h1', firstName: 'Hana' },
  subject: { id: 'u2', firstName: 'Kiri' },
  vehicleTitle: '2022 Toyota RAV4',
  overall: 5,
  communication: 5,
  pickupReturn: 4,
  care: 5,
  body: 'A careful, friendly guest.',
  status: 'PUBLISHED',
  createdAt: '2026-10-06T01:00:00.000Z',
  ...overrides,
});

function mockReviews(mine: MyReviews) {
  const booking = { ...confirmedBooking(), status: 'COMPLETED' as const };
  // The booking fixture's Host is Liam.
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /me/reviews':
        return { status: 200, body: mine };
      case `GET /bookings/${booking.ref}`:
        return { status: 200, body: { booking } };
      case 'POST /reviews':
        return {
          status: 201,
          body: {
            review: review({
              direction: 'GUEST_TO_HOST',
              status: 'AWAITING_REVEAL',
              moderation: 'CLEAR',
              revealAt: '2026-10-20T01:00:00.000Z',
            }),
          },
        };
      default:
        return undefined;
    }
  });
}

const toWrite = {
  bookingRef: 'RV-7K2Q9M',
  role: 'GUEST' as const,
  otherParty: { firstName: 'Hana' },
  vehicleTitle: '2022 Toyota RAV4',
  end: '2026-10-05T01:00:00.000Z',
  closesAt: '2026-10-19T01:00:00.000Z',
};

describe('ReviewsPage', () => {
  it('lists trips to review, then reviews about the user and by them', async () => {
    mockReviews({ toWrite: [toWrite], written: [], received: [review()] });
    renderWithRouter([{ path: '/account/reviews', element: <ReviewsPage /> }], '/account/reviews');

    const waiting = within(await screen.findByRole('region', { name: 'Waiting for your review' }));
    expect(waiting.getByRole('link', { name: 'Write a review' })).toHaveAttribute(
      'href',
      '/trips/RV-7K2Q9M/review',
    );
    expect(screen.getByText('A careful, friendly guest.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'By you' }));
    expect(await screen.findByRole('heading', { name: 'No reviews written yet' })).toBeInTheDocument();
  });
});

describe('WriteReviewPage', () => {
  it('asks for every rating, then publishes the review to be revealed later', async () => {
    const sent = mockReviews({ toWrite: [toWrite], written: [], received: [] });
    renderWithRouter(
      [{ path: '/trips/:ref/review', element: <WriteReviewPage /> }],
      '/trips/RV-7K2Q9M/review',
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /Review Liam and the car/ }),
    ).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Publish review' }));
    expect(screen.getAllByText('Choose a rating')).toHaveLength(4);

    for (const group of [
      'Overall, how was the trip?',
      'Communication',
      'Pick-up and return',
      'Cleanliness and condition of the car',
    ]) {
      await userEvent.click(
        within(screen.getByRole('group', { name: group })).getByRole('radio', { name: /^5 stars/ }),
      );
    }
    await userEvent.type(screen.getByLabelText(/Your review/), 'Spotless car.');
    await userEvent.click(screen.getByRole('button', { name: 'Publish review' }));

    expect(await screen.findByRole('heading', { name: 'Thanks for your review' })).toBeInTheDocument();
    expect(screen.getByText(/published once Liam reviews you too/)).toBeInTheDocument();
    expect(sent.find((request) => request.path === '/reviews')?.body).toEqual({
      bookingRef: 'RV-7K2Q9M',
      overall: 5,
      communication: 5,
      pickupReturn: 5,
      cleanliness: 5,
      body: 'Spotless car.',
    });
  });
});
