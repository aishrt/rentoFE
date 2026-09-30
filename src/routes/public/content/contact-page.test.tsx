import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, mockApi, renderWithProviders } from '@/test/utils';
import { ContactPage } from './contact-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const signedOut = { status: 200, body: { user: null } };

type User = ReturnType<typeof userEvent.setup>;

async function fillIn(user: User, { bookingRef = '' } = {}) {
  await user.type(await screen.findByLabelText('Your name'), 'Aroha Ngata');
  await user.type(screen.getByLabelText('Email address'), 'aroha@example.co.nz');
  await user.click(screen.getByRole('button', { name: /What’s it about/ }));
  await user.click(screen.getByRole('option', { name: 'A booking' }));
  await user.type(screen.getByLabelText('Subject'), 'Changing my pickup time');
  await user.type(screen.getByLabelText('Message'), 'Could I collect the car an hour later on Friday?');
  if (bookingRef) await user.type(screen.getByLabelText('Booking reference (optional)'), bookingRef);
}

const send = (user: User) => user.click(screen.getByRole('button', { name: 'Send message' }));

describe('ContactPage', () => {
  it('explains what is missing before calling the API', async () => {
    const user = userEvent.setup();
    const createTicket = vi.fn(() => ({ status: 201, body: { ref: 'ST-4HX8PA' } }));
    mockApi({ 'POST /auth/session': signedOut, 'POST /support/tickets': createTicket });
    renderWithProviders(<ContactPage />, '/contact');

    await user.click(await screen.findByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Choose what your message is about')).toBeInTheDocument();
    expect(screen.getByText('Add a short subject')).toBeInTheDocument();
    expect(screen.getByText('Tell us a little more (at least 10 characters)')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Booking reference (optional)'), 'ABC123');
    await send(user);
    expect(await screen.findByText('Booking references look like RV-7K2Q9M')).toBeInTheDocument();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it('sends the message and shows the ticket reference', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockApi({
      'POST /auth/session': signedOut,
      'POST /support/tickets': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 201, body: { ref: 'ST-4HX8PA' } };
      },
    });
    renderWithProviders(<ContactPage />, '/contact');

    await fillIn(user, { bookingRef: 'rv-7k2q9m' });
    await send(user);

    const heading = await screen.findByRole('heading', { name: 'Message sent' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('ST-4HX8PA')).toBeInTheDocument();
    expect(screen.getByText('aroha@example.co.nz')).toBeInTheDocument();
    expect(sent).toEqual({
      name: 'Aroha Ngata',
      email: 'aroha@example.co.nz',
      category: 'BOOKING',
      subject: 'Changing my pickup time',
      message: 'Could I collect the car an hour later on Friday?',
      bookingRef: 'RV-7K2Q9M',
    });

    // Another message starts a fresh form, keeping who it's from.
    await user.click(screen.getByRole('button', { name: 'Send another message' }));
    expect(await screen.findByLabelText('Your name')).toHaveValue('Aroha Ngata');
    expect(screen.getByLabelText('Subject')).toHaveValue('');
  });

  it('leaves out an empty booking reference', async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> = {};
    mockApi({
      'POST /auth/session': signedOut,
      'POST /support/tickets': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 201, body: { ref: 'ST-4HX8PA' } };
      },
    });
    renderWithProviders(<ContactPage />, '/contact');

    await fillIn(user);
    await send(user);

    await screen.findByRole('heading', { name: 'Message sent' });
    expect(sent).not.toHaveProperty('bookingRef');
  });

  it("shows the API's answers next to the fields they're about", async () => {
    const user = userEvent.setup();
    mockApi({
      'POST /auth/session': signedOut,
      'POST /support/tickets': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Check the highlighted fields.',
            fields: {
              email: 'Enter a valid email address',
              bookingRef: 'We couldn’t find that booking',
            },
          },
        },
      },
    });
    renderWithProviders(<ContactPage />, '/contact');

    await fillIn(user, { bookingRef: 'RV-000000' });
    await send(user);

    expect(await screen.findByText('We couldn’t find that booking')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Booking reference (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says when too many messages have been sent', async () => {
    const user = userEvent.setup();
    const message =
      "You've sent a few messages already. We'll reply soon; please try again in an hour if it's urgent.";
    mockApi({
      'POST /auth/session': signedOut,
      'POST /support/tickets': { status: 429, body: { error: { code: 'RATE_LIMITED', message } } },
    });
    renderWithProviders(<ContactPage />, '/contact');

    await fillIn(user);
    await send(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    // The message is kept, so it can be sent later.
    expect(screen.getByLabelText('Subject')).toHaveValue('Changing my pickup time');
  });

  it('fills in the name and email of a signed-in member, and a topic from the link', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: guestUser } } });
    renderWithProviders(<ContactPage />, '/contact?category=PRIVACY&booking=RV-7K2Q9M');

    await waitFor(() => expect(screen.getByLabelText('Your name')).toHaveValue('Kiri Admin'));
    expect(screen.getByLabelText('Email address')).toHaveValue('kiri@example.co.nz');
    expect(screen.getByRole('button', { name: /What’s it about/ })).toHaveTextContent('Privacy and my data');
    expect(screen.getByLabelText('Booking reference (optional)')).toHaveValue('RV-7K2Q9M');
  });

  it('puts urgent help beside the form', async () => {
    mockApi({ 'POST /auth/session': signedOut });
    renderWithProviders(<ContactPage />, '/contact');

    expect(await screen.findByRole('link', { name: /Call 111/ })).toHaveAttribute('href', 'tel:111');
    expect(screen.getByRole('heading', { name: 'A problem on a trip?' })).toBeInTheDocument();
    expect(screen.getByText(/choose Report an incident/)).toBeInTheDocument();
  });
});
