import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostApplication } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminHostApplicationsPage } from './host-applications-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/host-applications') =>
  renderWithRouter(
    [
      {
        path: '/admin/host-applications',
        element: (
          <>
            <AdminHostApplicationsPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const aroha: HostApplication = {
  userId: 'u10',
  firstName: 'Aroha',
  lastName: 'Ngata',
  email: 'aroha@example.co.nz',
  emailVerified: true,
  phone: '+64211234567',
  phoneVerified: true,
  identityStatus: 'APPROVED',
  status: 'APPLIED',
  // 10:30 am on 28 September in New Zealand.
  appliedAt: '2026-09-27T21:30:00.000Z',
  bio: 'Two well-kept cars in Ponsonby, available most weekends.',
  gstRegistered: true,
  gstNumber: '123-456-789',
  vehicles: { total: 2, underReview: 1 },
};

const rangi: HostApplication = {
  ...aroha,
  userId: 'u11',
  firstName: 'Rangi',
  lastName: 'Walker',
  email: 'rangi@example.co.nz',
  emailVerified: false,
  phone: undefined,
  phoneVerified: false,
  bio: undefined,
  gstRegistered: false,
  gstNumber: undefined,
  vehicles: { total: 0, underReview: 0 },
};

const card = async (name: string) => within(await screen.findByRole('listitem', { name }));

describe('AdminHostApplicationsPage', () => {
  it('lists each application with its contact details, GST, bio and cars', async () => {
    mockApi({ 'GET /admin/host-applications': { status: 200, body: { applications: [aroha, rangi] } } });
    render();

    const first = await card('Aroha Ngata');
    expect(first.getByText(/Applied 28\/09\/2026/)).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'aroha@example.co.nz' })).toHaveAttribute(
      'href',
      'mailto:aroha@example.co.nz',
    );
    // Email, mobile and identity.
    expect(first.getAllByText('(verified)')).toHaveLength(3);
    expect(first.getByText('+64211234567')).toBeInTheDocument();
    expect(first.getByText('Registered, 123-456-789')).toBeInTheDocument();
    expect(first.getByText('2 cars, 1 waiting for review')).toBeInTheDocument();
    expect(first.getByText('Two well-kept cars in Ponsonby, available most weekends.')).toBeInTheDocument();

    const second = await card('Rangi Walker');
    expect(second.getByText('Not verified')).toBeInTheDocument();
    expect(second.getByText('Not added')).toBeInTheDocument();
    expect(second.getByText('Not registered')).toBeInTheDocument();
    expect(second.getByText('None yet')).toBeInTheDocument();
    expect(screen.getByText('2 applications')).toBeInTheDocument();
  });

  it('approves an application with an optional note, then refreshes the list', async () => {
    let sent: unknown;
    let approved = false;
    const fetchMock = mockApi({
      'GET /admin/host-applications': () => ({
        status: 200,
        body: { applications: approved ? [rangi] : [aroha, rangi] },
      }),
      'POST /admin/host-applications/u10/approve': (init) => {
        sent = JSON.parse(String(init?.body));
        approved = true;
        return { status: 200, body: { status: 'APPROVED' } };
      },
    });
    render();

    await userEvent.click((await card('Aroha Ngata')).getByRole('button', { name: 'Approve Aroha Ngata' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Aroha Ngata?' }));
    await userEvent.type(dialog.getByLabelText('Note (optional)'), 'Welcome aboard!');
    await userEvent.click(dialog.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Aroha Ngata is approved to host')).toBeInTheDocument();
    expect(sent).toEqual({ notes: 'Welcome aboard!' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Aroha Ngata' })).not.toBeInTheDocument();
    expect(await screen.findByText('1 application')).toBeInTheDocument();
    // Loaded once, then again after the decision.
    const listRequests = fetchMock.mock.calls.filter(([input]) =>
      String((input as Request).url).includes('/admin/host-applications?'),
    );
    expect(listRequests.length).toBeGreaterThanOrEqual(2);
  });

  it('needs a note to reject an application', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/host-applications': { status: 200, body: { applications: [aroha] } },
      'POST /admin/host-applications/u10/reject': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { status: 'REJECTED' } };
      },
    });
    render();

    await userEvent.click((await card('Aroha Ngata')).getByRole('button', { name: 'Reject Aroha Ngata' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject Aroha Ngata?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reject application' }));
    expect(await dialog.findByText('Add a short note saying why')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(
      dialog.getByLabelText('Why, for Aroha'),
      "We couldn't confirm who owns the cars you listed.",
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Reject application' }));

    expect(await screen.findByText("Aroha Ngata's application was rejected")).toBeInTheDocument();
    expect(sent).toEqual({ notes: "We couldn't confirm who owns the cars you listed." });
  });

  it("explains that an applicant can't be approved until their email is confirmed", async () => {
    const fetchMock = mockApi({
      'GET /admin/host-applications': { status: 200, body: { applications: [rangi] } },
    });
    render();

    await userEvent.click((await card('Rangi Walker')).getByRole('button', { name: 'Approve Rangi Walker' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Rangi Walker?' }));
    expect(dialog.getByText("Their email address isn't confirmed yet")).toBeInTheDocument();
    expect(dialog.getByText(/needs to open the link we sent to rangi@example.co.nz/)).toBeInTheDocument();
    // There's nothing to confirm: only a way out.
    expect(dialog.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(fetchMock.mock.calls.some(([input]) => (input as Request).method === 'POST')).toBe(false);
  });

  it("shows the API's reason when the list was out of date about their email", async () => {
    mockApi({
      'GET /admin/host-applications': { status: 200, body: { applications: [aroha] } },
      'POST /admin/host-applications/u10/approve': {
        status: 409,
        body: {
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: "The applicant hasn't confirmed their email address yet.",
          },
        },
      },
    });
    render();

    await userEvent.click((await card('Aroha Ngata')).getByRole('button', { name: 'Approve Aroha Ngata' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Approve Aroha Ngata?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Approve' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      "The applicant hasn't confirmed their email address yet.",
    );
  });

  it('switches to approved applications, which have nothing to decide', async () => {
    const fetchMock = mockApi({
      'GET /admin/host-applications': (_init) => ({
        status: 200,
        body: { applications: fetchMock.mock.calls.length > 1 ? [{ ...aroha, status: 'APPROVED' }] : [] },
      }),
    });
    const { router } = render();

    expect(await screen.findByText('No applications waiting')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }));

    const approved = await card('Aroha Ngata');
    expect(approved.queryByRole('button')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=approved');
    const lastUrl = String((fetchMock.mock.calls.at(-1)?.[0] as Request).url);
    expect(lastUrl).toContain('status=APPROVED');
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/host-applications': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load the applications");
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
