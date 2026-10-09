import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminReport, ModerationReview } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminModerationPage } from './moderation-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/moderation') =>
  renderWithRouter(
    [
      {
        path: '/admin/moderation',
        element: (
          <>
            <AdminModerationPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const messageReport: AdminReport = {
  id: 'r1',
  targetType: 'MESSAGE',
  targetId: 'm9',
  reason: 'CONTACT_DETAILS',
  note: 'They asked me to pay cash outside the app.',
  status: 'OPEN',
  reporter: { id: 'u2', name: 'Kiri Ngata' },
  subject: { id: 'u5', name: 'Mere Walker' },
  preview: 'Text me on 021 555 0101 and we can sort it out',
  bookingRef: 'RV-7K2M9Q',
  createdAt: '2026-09-27T21:30:00.000Z',
};

const listingReport: AdminReport = {
  id: 'r2',
  targetType: 'VEHICLE',
  targetId: 'v7',
  reason: 'FAKE',
  status: 'OPEN',
  reporter: { id: 'u3', name: 'Tama Rua' },
  subject: { id: 'u5', name: 'Mere Walker' },
  preview: '2019 Toyota Corolla',
  createdAt: '2026-09-26T21:30:00.000Z',
};

const heldReview: ModerationReview = {
  id: 'rev1',
  bookingRef: 'RV-7K2M9Q',
  direction: 'GUEST_TO_HOST',
  author: { id: 'u2', firstName: 'Kiri' },
  subject: { id: 'u5', firstName: 'Mere' },
  vehicleTitle: '2019 Toyota Corolla',
  overall: 2,
  communication: 3,
  pickupReturn: 2,
  cleanliness: 1,
  body: 'Call me on 021 555 0101 if you want the real story.',
  status: 'AWAITING_REVEAL',
  moderation: 'HELD',
  createdAt: '2026-09-27T21:30:00.000Z',
  moderationReason: 'Looks like a phone number',
};

const publishedReview: ModerationReview = {
  ...heldReview,
  id: 'rev2',
  overall: 1,
  communication: 1,
  pickupReturn: 1,
  cleanliness: 1,
  body: 'The worst host in Aotearoa. A liar and a cheat.',
  status: 'PUBLISHED',
  moderation: 'CLEAR',
  moderationReason: '',
};

const reviewReport: AdminReport = {
  id: 'r3',
  targetType: 'REVIEW',
  targetId: 'rev2',
  reason: 'HARASSMENT',
  status: 'OPEN',
  reporter: { id: 'u5', name: 'Mere Walker' },
  subject: { id: 'u2', name: 'Kiri Ngata' },
  preview: '1★ The worst host in Aotearoa. A liar and a cheat.',
  review: publishedReview,
  createdAt: '2026-09-28T21:30:00.000Z',
};

/** The query of the latest request. */
const lastQuery = (fetchMock: ReturnType<typeof mockApi>) =>
  new URL((fetchMock.mock.calls.at(-1)?.[0] as Request).url).searchParams;

const card = async (name: string) => within(await screen.findByRole('listitem', { name }));

describe('AdminModerationPage', () => {
  it('lists open reports with what was reported, why, by whom and where to look', async () => {
    const fetchMock = mockApi({
      'GET /admin/moderation/reports': { status: 200, body: { reports: [messageReport, listingReport] } },
    });
    render();

    const message = await card('Message reported by Kiri Ngata');
    expect(message.getByText('Text me on 021 555 0101 and we can sort it out')).toBeInTheDocument();
    expect(message.getAllByText('Sharing contact details')).not.toHaveLength(0);
    expect(message.getByText('They asked me to pay cash outside the app.')).toBeInTheDocument();
    expect(message.getByRole('link', { name: 'Kiri Ngata' })).toHaveAttribute('href', '/admin/users/u2');
    expect(message.getByRole('link', { name: 'Mere Walker' })).toHaveAttribute('href', '/admin/users/u5');
    expect(message.getByRole('link', { name: 'Open the conversation' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q/thread?context=REPORT:r1',
    );

    const listing = await card('Listing reported by Tama Rua');
    expect(listing.getAllByText('Fake or misleading')).not.toHaveLength(0);
    expect(listing.getByRole('link', { name: 'Open the listing' })).toHaveAttribute(
      'href',
      '/admin/vehicles/v7',
    );
    expect(screen.getByText('2 open reports')).toBeInTheDocument();
    expect(lastQuery(fetchMock).get('status')).toBe('OPEN');
  });

  it('opens the conversation a person was reported from, and only then', async () => {
    const person: AdminReport = {
      ...listingReport,
      id: 'r4',
      targetType: 'USER',
      targetId: 'u5',
      reason: 'SCAM',
      preview: 'Mere Walker',
    };
    mockApi({
      'GET /admin/moderation/reports': {
        status: 200,
        body: {
          reports: [
            { ...person, reporter: { id: 'u2', name: 'Kiri Ngata' }, bookingRef: 'RV-7K2M9Q' },
            { ...person, id: 'r5' },
          ],
        },
      },
    });
    render();

    const fromThread = await card('Profile reported by Kiri Ngata');
    expect(fromThread.getByRole('link', { name: 'Open the conversation' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q/thread?context=REPORT:r4',
    );
    expect(fromThread.getByRole('link', { name: 'Open their account' })).toHaveAttribute(
      'href',
      '/admin/users/u5',
    );

    // Reported from elsewhere: no conversation to open.
    const elsewhere = await card('Profile reported by Tama Rua');
    expect(elsewhere.queryByRole('link', { name: 'Open the conversation' })).not.toBeInTheDocument();
    expect(elsewhere.getByRole('link', { name: 'Open their account' })).toBeInTheDocument();
  });

  it('resolves a report with what was done', async () => {
    let sent: unknown;
    let resolved = false;
    mockApi({
      'GET /admin/moderation/reports': () => ({
        status: 200,
        body: { reports: resolved ? [listingReport] : [messageReport, listingReport] },
      }),
      'POST /admin/moderation/reports/r1/resolve': (init) => {
        sent = JSON.parse(String(init?.body));
        resolved = true;
        return {
          status: 200,
          body: { report: { ...messageReport, status: 'ACTIONED', resolution: 'Warned Mere.' } },
        };
      },
    });
    render();
    const user = userEvent.setup();

    await user.click((await card('Message reported by Kiri Ngata')).getByRole('button', { name: 'Resolve' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Resolve this report' }));
    await user.click(dialog.getByRole('button', { name: 'Resolve report' }));
    expect(await dialog.findByText('Choose what happened')).toBeInTheDocument();
    expect(dialog.getByText('Say what was done')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await user.click(dialog.getByRole('radio', { name: /Action taken/ }));
    await user.type(
      dialog.getByRole('textbox', { name: 'What was done' }),
      'Warned Mere about sharing numbers.',
    );
    await user.click(dialog.getByRole('button', { name: 'Resolve report' }));

    expect(await screen.findByText('Report resolved')).toBeInTheDocument();
    expect(sent).toEqual({ status: 'ACTIONED', resolution: 'Warned Mere about sharing numbers.' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('listitem', { name: 'Message reported by Kiri Ngata' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('1 open report')).toBeInTheDocument();
  });

  it('dismisses a report', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/moderation/reports': { status: 200, body: { reports: [listingReport] } },
      'POST /admin/moderation/reports/r2/resolve': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { report: { ...listingReport, status: 'DISMISSED' } } };
      },
    });
    render();
    const user = userEvent.setup();

    await user.click((await card('Listing reported by Tama Rua')).getByRole('button', { name: 'Resolve' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Resolve this report' }));
    await user.click(dialog.getByRole('radio', { name: /Dismiss/ }));
    await user.type(dialog.getByRole('textbox', { name: 'What was done' }), 'Checked the rego: it’s real.');
    await user.click(dialog.getByRole('button', { name: 'Resolve report' }));

    expect(await screen.findByText('Report dismissed')).toBeInTheDocument();
    expect(sent).toEqual({ status: 'DISMISSED', resolution: 'Checked the rego: it’s real.' });
  });

  it('shows resolved reports with what was done, and nothing to decide', async () => {
    const fetchMock = mockApi({
      'GET /admin/moderation/reports': () => ({
        status: 200,
        body: {
          reports:
            lastQuery(fetchMock).get('status') === 'ACTIONED'
              ? [{ ...messageReport, status: 'ACTIONED', resolution: 'Warned Mere.' }]
              : [],
        },
      }),
    });
    const { router } = render();

    expect(await screen.findByText('No open reports')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Actioned' }));

    const actioned = await card('Message reported by Kiri Ngata');
    expect(actioned.getByText('Warned Mere.')).toBeInTheDocument();
    expect(actioned.getByText('Action taken')).toBeInTheDocument();
    expect(actioned.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=actioned');
  });

  it('shows a reported review in full, and hides it with a reason, which resolves the report', async () => {
    let moderated: unknown;
    let resolved: unknown;
    mockApi({
      'GET /admin/moderation/reports': () => ({
        status: 200,
        body: { reports: resolved ? [] : [reviewReport] },
      }),
      'POST /admin/reviews/rev2/moderate': (init) => {
        moderated = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: { review: { ...publishedReview, status: 'HIDDEN', moderation: 'HIDDEN' } },
        };
      },
      'POST /admin/moderation/reports/r3/resolve': (init) => {
        resolved = JSON.parse(String(init?.body));
        return { status: 200, body: { report: { ...reviewReport, status: 'ACTIONED' } } };
      },
    });
    render();
    const user = userEvent.setup();

    const report = await card('Review reported by Mere Walker');
    expect(report.getByText('The worst host in Aotearoa. A liar and a cheat.')).toBeInTheDocument();
    expect(report.getByText('Published')).toBeInTheDocument();
    expect(report.getByRole('img', { name: 'Rated 1.0 out of 5' })).toBeInTheDocument();
    expect(report.getByRole('link', { name: 'Kiri' })).toHaveAttribute('href', '/admin/users/u2');
    expect(report.getByRole('link', { name: 'Mere' })).toHaveAttribute('href', '/admin/users/u5');
    expect(report.getByRole('link', { name: 'RV-7K2M9Q' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q',
    );

    await user.click(report.getByRole('button', { name: 'Hide review' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Hide Kiri’s review?' }));
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(moderated).toBeUndefined();

    await user.type(dialog.getByLabelText('Why it’s hidden'), 'Abuse aimed at the Host.');
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));

    expect(await screen.findByText('Review hidden and report resolved')).toBeInTheDocument();
    expect(moderated).toEqual({ action: 'HIDE', reason: 'Abuse aimed at the Host.' });
    expect(resolved).toEqual({ status: 'ACTIONED', resolution: 'Hid the review. Abuse aimed at the Host.' });
    expect(
      screen.queryByRole('listitem', { name: 'Review reported by Mere Walker' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('No open reports')).toBeInTheDocument();
  });

  it('shows why a reported review was hidden, with nothing left to hide', async () => {
    mockApi({
      'GET /admin/moderation/reports': {
        status: 200,
        body: {
          reports: [
            {
              ...reviewReport,
              review: {
                ...publishedReview,
                status: 'HIDDEN',
                moderation: 'HIDDEN',
                moderationReason: 'Abuse aimed at the Host.',
              },
            },
          ],
        },
      },
    });
    render();

    const report = await card('Review reported by Mere Walker');
    expect(report.getByText('Hidden')).toBeInTheDocument();
    expect(report.getByText('Why the review was hidden').nextElementSibling).toHaveTextContent(
      'Abuse aimed at the Host.',
    );
    expect(report.queryByRole('button', { name: 'Hide review' })).not.toBeInTheDocument();
    expect(report.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('lists held reviews with why they were held', async () => {
    const fetchMock = mockApi({
      'GET /admin/reviews': { status: 200, body: { reviews: [heldReview] } },
    });
    render('/admin/moderation?tab=reviews');

    const review = await card('Review by Kiri');
    expect(review.getByText('Call me on 021 555 0101 if you want the real story.')).toBeInTheDocument();
    expect(review.getByRole('img', { name: 'Rated 2.0 out of 5' })).toBeInTheDocument();
    expect(review.getByRole('link', { name: 'Kiri' })).toHaveAttribute('href', '/admin/users/u2');
    expect(review.getByRole('link', { name: 'Mere' })).toHaveAttribute('href', '/admin/users/u5');
    expect(review.getByRole('link', { name: 'RV-7K2M9Q' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q',
    );
    expect(review.getByText('Why it was held')).toBeInTheDocument();
    expect(review.getByText('Looks like a phone number')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveAttribute('aria-selected', 'true');
    expect(lastQuery(fetchMock).get('state')).toBe('HELD');
  });

  it('hides a held review with a reason', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/reviews': () => ({ status: 200, body: { reviews: sent ? [] : [heldReview] } }),
      'POST /admin/reviews/rev1/moderate': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { review: { ...heldReview, status: 'HIDDEN', moderation: 'HIDDEN' } } };
      },
    });
    render('/admin/moderation?tab=reviews');
    const user = userEvent.setup();

    await user.click((await card('Review by Kiri')).getByRole('button', { name: 'Hide' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Hide Kiri’s review?' }));
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await user.type(dialog.getByLabelText('Why it’s hidden'), 'Shares a phone number.');
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));

    expect(await screen.findByText('Review hidden')).toBeInTheDocument();
    expect(sent).toEqual({ action: 'HIDE', reason: 'Shares a phone number.' });
    expect(screen.queryByRole('listitem', { name: 'Review by Kiri' })).not.toBeInTheDocument();
    expect(await screen.findByText('No reviews held')).toBeInTheDocument();
  });

  it('publishes a held review with a reason', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/reviews': { status: 200, body: { reviews: [heldReview] } },
      'POST /admin/reviews/rev1/moderate': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { review: { ...heldReview, moderation: 'CLEAR' } } };
      },
    });
    render('/admin/moderation?tab=reviews');
    const user = userEvent.setup();

    await user.click((await card('Review by Kiri')).getByRole('button', { name: 'Publish' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Publish Kiri’s review?' }));
    await user.type(
      dialog.getByLabelText('Why it’s fine to publish'),
      'The number is the Host’s listed one.',
    );
    await user.click(dialog.getByRole('button', { name: 'Publish review' }));

    expect(await screen.findByText('Review published')).toBeInTheDocument();
    expect(sent).toEqual({ action: 'CLEAR', reason: 'The number is the Host’s listed one.' });
  });

  it('shows the API’s message under the reason', async () => {
    mockApi({
      'GET /admin/reviews': { status: 200, body: { reviews: [heldReview] } },
      'POST /admin/reviews/rev1/moderate': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the highlighted fields.',
            fields: { reason: 'Keep it under 500 characters' },
          },
        },
      },
    });
    render('/admin/moderation?tab=reviews');
    const user = userEvent.setup();

    await user.click((await card('Review by Kiri')).getByRole('button', { name: 'Hide' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Hide Kiri’s review?' }));
    await user.type(dialog.getByLabelText('Why it’s hidden'), 'Too long, as far as the API is concerned.');
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));

    expect(await dialog.findByText('Keep it under 500 characters')).toBeInTheDocument();
  });

  it('keeps the tab in the address', async () => {
    mockApi({
      'GET /admin/moderation/reports': { status: 200, body: { reports: [] } },
      'GET /admin/reviews': { status: 200, body: { reviews: [] } },
    });
    const { router } = render();

    expect(await screen.findByText('No open reports')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Reviews' }));
    expect(router.state.location.search).toBe('?tab=reviews');
    expect(await screen.findByText('No reviews held')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Hidden' }));
    expect(router.state.location.search).toBe('?tab=reviews&state=hidden');
    expect(await screen.findByText('No hidden reviews')).toBeInTheDocument();
  });

  it('lists published reviews, to hide one that breaks the rules', async () => {
    let sent: unknown;
    const fetchMock = mockApi({
      'GET /admin/reviews': () => ({
        status: 200,
        body: {
          reviews: lastQuery(fetchMock).get('state') === 'PUBLISHED' && !sent ? [publishedReview] : [],
        },
      }),
      'POST /admin/reviews/rev2/moderate': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: { review: { ...publishedReview, status: 'HIDDEN', moderation: 'HIDDEN' } },
        };
      },
    });
    const { router } = render('/admin/moderation?tab=reviews');
    const user = userEvent.setup();

    expect(await screen.findByText('No reviews held')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Published' }));
    expect(router.state.location.search).toBe('?tab=reviews&state=published');

    const review = await card('Review by Kiri');
    expect(review.getByText('The worst host in Aotearoa. A liar and a cheat.')).toBeInTheDocument();
    expect(review.queryByText(/^Why it was/)).not.toBeInTheDocument();
    expect(review.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByText('1 published review')).toBeInTheDocument();

    await user.click(review.getByRole('button', { name: 'Hide' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Hide Kiri’s review?' }));
    await user.type(dialog.getByLabelText('Why it’s hidden'), 'Abuse aimed at the Host.');
    await user.click(dialog.getByRole('button', { name: 'Hide review' }));

    // The toast is the same as for a held review (above).
    expect(await screen.findByText('No published reviews')).toBeInTheDocument();
    expect(sent).toEqual({ action: 'HIDE', reason: 'Abuse aimed at the Host.' });
  });
});
