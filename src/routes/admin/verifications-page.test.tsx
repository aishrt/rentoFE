import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerificationQueueItem } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminVerificationsPage } from './verifications-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/admin/verifications',
        element: (
          <>
            <AdminVerificationsPage />
            <Toaster />
          </>
        ),
      },
    ],
    '/admin/verifications',
  );

const kiri: VerificationQueueItem = {
  userId: 'u20',
  kind: 'IDENTITY',
  firstName: 'Kiri',
  lastName: 'Smith',
  email: 'kiri@example.co.nz',
  reason: 'The name on the ID doesn’t match the account',
  // 9 am on 6 October in New Zealand.
  since: '2026-10-05T20:00:00.000Z',
  identity: { status: 'PENDING', documentType: 'passport' },
  licence: {
    class: 'NZ_FULL',
    country: 'New Zealand',
    numberEnding: '4821',
    version: '123',
    expiry: '2030-05-01',
    issuedAt: '2020-05-01',
    status: 'PENDING',
  },
  dob: '1995-03-14',
  riskFlags: ['DUPLICATE_LICENCE'],
  waitingBookings: [
    { ref: 'RV-7K2Q9M', vehicleTitle: '2022 Toyota RAV4', expiresAt: '2026-10-08T21:00:00.000Z' },
  ],
};

const sam: VerificationQueueItem = {
  userId: 'u21',
  kind: 'LICENCE',
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@example.com',
  reason: 'Their ID was a passport, not the licence: check the licence by hand',
  since: '2026-10-06T20:00:00.000Z',
  identity: { status: 'APPROVED', documentType: 'passport' },
  licence: {
    class: 'OVERSEAS',
    country: 'Germany',
    numberEnding: '9921',
    expiry: '2029-01-01',
    englishProof: 'IDP',
    status: 'PENDING',
  },
  riskFlags: [],
  waitingBookings: [],
};

const card = async (name: string) => within(await screen.findByRole('listitem', { name }));

describe('AdminVerificationsPage', () => {
  it('lists identity checks, then licences, with what to compare and the bookings waiting', async () => {
    mockApi({ 'GET /admin/verifications': { status: 200, body: { items: [kiri, sam] } } });
    render();

    const identities = within(await screen.findByRole('list', { name: 'Identity checks' }));
    const first = within(identities.getByRole('listitem', { name: 'Kiri Smith' }));
    expect(first.getByRole('link', { name: 'Kiri Smith' })).toHaveAttribute('href', '/admin/users/u20');
    expect(first.getByText('The name on the ID doesn’t match the account')).toBeInTheDocument();
    expect(first.getByText('14 Mar 1995')).toBeInTheDocument();
    expect(first.getByText('Passport')).toBeInTheDocument();
    expect(first.getByText('Full NZ licence')).toBeInTheDocument();
    expect(first.getByText('4821')).toBeInTheDocument();
    expect(first.getByText('1 May 2030')).toBeInTheDocument();
    expect(first.getByText('Licence used on another account')).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(first.getByText(/Expires Fri, 9 Oct/)).toBeInTheDocument();

    const licences = within(screen.getByRole('list', { name: 'Licences to check by hand' }));
    const second = within(licences.getByRole('listitem', { name: 'Sam Lee' }));
    expect(second.getByText('Overseas licence')).toBeInTheDocument();
    expect(second.getByText('Germany')).toBeInTheDocument();
    expect(second.getByText('International Driving Permit')).toBeInTheDocument();
    expect(screen.getByText('2 checks waiting')).toBeInTheDocument();
  });

  it('approves an identity check, which confirms the booking waiting on it', async () => {
    let sent: unknown;
    let decided = false;
    mockApi({
      'GET /admin/verifications': () => ({ status: 200, body: { items: decided ? [sam] : [kiri, sam] } }),
      'POST /admin/users/u20/identity-review': (init) => {
        sent = JSON.parse(String(init?.body));
        decided = true;
        return {
          status: 200,
          body: { identityStatus: 'APPROVED', confirmed: ['RV-7K2Q9M'], waitingForHost: [], released: [] },
        };
      },
    });
    render();

    await userEvent.click(
      (await card('Kiri Smith')).getByRole('button', { name: 'Approve Kiri Smith’s identity check' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Kiri Smith’s identity?' }));
    expect(dialog.getByText(/Bookings waiting on this check are confirmed/)).toBeInTheDocument();
    await userEvent.type(dialog.getByLabelText('Note (optional)'), 'Matches the passport.');
    await userEvent.click(dialog.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Kiri Smith is verified')).toBeInTheDocument();
    expect(screen.getByText('We’ve emailed them. Confirmed RV-7K2Q9M.')).toBeInTheDocument();
    expect(sent).toEqual({ decision: 'APPROVE', note: 'Matches the passport.' });
    expect(screen.queryByRole('listitem', { name: 'Kiri Smith' })).not.toBeInTheDocument();
    expect(await screen.findByText('1 check waiting')).toBeInTheDocument();
  });

  it('rejects an identity check without a note, releasing the booking', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/verifications': { status: 200, body: { items: [kiri] } },
      'POST /admin/users/u20/identity-review': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: { identityStatus: 'REJECTED', confirmed: [], waitingForHost: [], released: ['RV-7K2Q9M'] },
        };
      },
    });
    render();

    await userEvent.click(
      (await card('Kiri Smith')).getByRole('button', { name: 'Reject Kiri Smith’s identity check' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject Kiri Smith’s identity check?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('Kiri Smith’s identity check was rejected')).toBeInTheDocument();
    expect(screen.getByText(/Released RV-7K2Q9M and the card authorisation/)).toBeInTheDocument();
    expect(sent).toEqual({ decision: 'REJECT' });
  });

  it('needs a note to reject a licence, as it’s emailed to them', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/verifications': { status: 200, body: { items: [sam] } },
      'POST /admin/users/u21/licence-review': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { licenceStatus: 'REJECTED' } };
      },
    });
    render();

    await userEvent.click((await card('Sam Lee')).getByRole('button', { name: 'Reject Sam Lee’s licence' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject Sam Lee’s licence?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reject' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(
      dialog.getByLabelText('Why, for Sam'),
      'The licence number doesn’t match the photo.',
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('Sam Lee’s licence was rejected')).toBeInTheDocument();
    expect(sent).toEqual({ decision: 'REJECT', note: 'The licence number doesn’t match the photo.' });
  });

  it('approves a licence', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/verifications': { status: 200, body: { items: [sam] } },
      'POST /admin/users/u21/licence-review': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { licenceStatus: 'APPROVED' } };
      },
    });
    render();

    await userEvent.click((await card('Sam Lee')).getByRole('button', { name: 'Approve Sam Lee’s licence' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Sam Lee’s licence?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Sam Lee’s licence is approved')).toBeInTheDocument();
    expect(sent).toEqual({ decision: 'APPROVE' });
  });

  it('takes a check someone else already decided off the queue', async () => {
    let tried = false;
    mockApi({
      // Someone else decided it before the page refreshed.
      'GET /admin/verifications': () => ({ status: 200, body: { items: tried ? [] : [kiri] } }),
      'POST /admin/users/u20/identity-review': () => {
        tried = true;
        return {
          status: 409,
          body: {
            error: {
              code: 'NOT_IN_REVIEW',
              message: "This person's identity check isn't waiting for a review.",
            },
          },
        };
      },
    });
    render();

    await userEvent.click(
      (await card('Kiri Smith')).getByRole('button', { name: 'Approve Kiri Smith’s identity check' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Kiri Smith’s identity?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Kiri Smith was already decided')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Kiri Smith' })).not.toBeInTheDocument();
  });

  it('says when there’s nothing to check', async () => {
    mockApi({ 'GET /admin/verifications': { status: 200, body: { items: [] } } });
    render();

    expect(await screen.findByText('Nothing to check')).toBeInTheDocument();
    expect(screen.getByText('0 checks waiting')).toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/verifications': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the queue');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
