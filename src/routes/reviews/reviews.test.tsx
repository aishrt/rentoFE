import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MyReviews, Review } from '@/api/types';
import { confirmedBooking } from '@/features/booking/test-fixtures';
import { policiesFixture } from '@/features/content/test-fixtures';
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

const waitingReview = review({
  direction: 'GUEST_TO_HOST',
  status: 'AWAITING_REVEAL',
  moderation: 'CLEAR',
  revealAt: '2026-10-20T01:00:00.000Z',
});

function mockReviews(
  mine: MyReviews,
  {
    revealTogether = true,
    submitted = { review: waitingReview, otherPublished: false },
  }: { revealTogether?: boolean; submitted?: { review: Review; otherPublished: boolean } } = {},
) {
  const booking = { ...confirmedBooking(), status: 'COMPLETED' as const };
  // The booking fixture's Host is Liam.
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /policies':
        return {
          status: 200,
          body: { ...policiesFixture, reviews: { ...policiesFixture.reviews, revealTogether } },
        };
      case 'GET /me/reviews':
        return { status: 200, body: mine };
      case `GET /bookings/${booking.ref}`:
        return { status: 200, body: { booking } };
      case 'POST /reports':
        return { status: 201, body: { id: 'rep1', status: 'OPEN' } };
      case 'POST /reviews':
        return { status: 201, body: submitted };
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

  it('reports a review about the user, but not one they wrote', async () => {
    const sent = mockReviews({
      toWrite: [],
      written: [
        review({
          id: 'r2',
          author: { id: guestUser.id, firstName: 'Kiri' },
          subject: { id: 'h1', firstName: 'Hana' },
        }),
      ],
      received: [review()],
    });
    const user = userEvent.setup();
    renderWithRouter([{ path: '/account/reviews', element: <ReviewsPage /> }], '/account/reviews');

    await user.click(await screen.findByRole('button', { name: 'Report Hana’s review' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Report Hana’s review' }));
    await user.click(dialog.getByRole('radio', { name: /Abusive or harassing/ }));
    await user.click(dialog.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent.find((request) => request.path === '/reports')?.body).toEqual({
      targetType: 'REVIEW',
      targetId: 'r1',
      reason: 'HARASSMENT',
    });

    await user.click(screen.getByRole('tab', { name: 'By you' }));
    expect(await screen.findByText('About Hana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Report/ })).not.toBeInTheDocument();
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

  const renderWrite = () =>
    renderWithRouter(
      [{ path: '/trips/:ref/review', element: <WriteReviewPage /> }],
      '/trips/RV-7K2Q9M/review',
    );
  async function rateAndPublish() {
    for (const group of [
      'Overall, how was the trip?',
      'Communication',
      'Pick-up and return',
      'Cleanliness and condition of the car',
    ]) {
      await userEvent.click(
        within(await screen.findByRole('group', { name: group })).getByRole('radio', { name: /^5 stars/ }),
      );
    }
    await userEvent.click(screen.getByRole('button', { name: 'Publish review' }));
    await screen.findByRole('heading', { name: 'Thanks for your review' });
  }
  const published = review({ direction: 'GUEST_TO_HOST', status: 'PUBLISHED', moderation: 'CLEAR' });

  it('says the other review is out too only when it is', async () => {
    mockReviews(
      { toWrite: [toWrite], written: [], received: [] },
      { submitted: { review: published, otherPublished: true } },
    );
    renderWrite();
    await rateAndPublish();
    expect(screen.getByText('It’s published, and so is Liam’s review of you.')).toBeInTheDocument();
  });

  it('doesn’t claim the other review is out when it’s held or not written', async () => {
    mockReviews(
      { toWrite: [toWrite], written: [], received: [] },
      { submitted: { review: published, otherPublished: false } },
    );
    renderWrite();
    await rateAndPublish();
    expect(screen.getByText('It’s published.')).toBeInTheDocument();
    expect(screen.queryByText(/Liam’s review of you/)).not.toBeInTheDocument();
  });

  it('says a review is published straight away when reviews aren’t revealed together', async () => {
    mockReviews({ toWrite: [toWrite], written: [], received: [] }, { revealTogether: false });
    renderWrite();

    expect(
      await screen.findByText(
        'Your review is published as soon as you send it, unless our team needs to check it first.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/can’t see your review until/)).not.toBeInTheDocument();
  });
});

describe('ReviewsPage when reviews aren’t revealed together', () => {
  it('doesn’t say they wait for both sides', async () => {
    mockReviews({ toWrite: [], written: [], received: [] }, { revealTogether: false });
    renderWithRouter([{ path: '/account/reviews', element: <ReviewsPage /> }], '/account/reviews');

    expect(
      await screen.findByText(
        'Reviews are published as soon as they’re written, unless our team needs to check them first.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Reviews show here once they’re published.')).toBeInTheDocument();
    expect(screen.queryByText(/after both sides have written one/)).not.toBeInTheDocument();
  });
});
