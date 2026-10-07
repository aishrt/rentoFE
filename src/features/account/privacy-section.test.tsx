import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountClosure } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { Toaster } from '@/components/ui/toast';
import { renderWithProviders } from '@/test/utils';
import { PrivacySection } from './privacy-section';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockPrivacy({
  closure = { allowed: true, blockers: [] },
  alreadyOpen = false,
}: { closure?: AccountClosure; alreadyOpen?: boolean } = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'GET /me/account-closure':
        return { status: 200, body: closure };
      case 'POST /me/privacy-requests':
        return { status: 201, body: { ref: 'ST-4HX8PA', alreadyOpen } };
      default:
        return undefined;
    }
  });
}

describe('PrivacySection', () => {
  it('asks for a copy of the user’s information and gives its reference', async () => {
    const sent = mockPrivacy();
    renderWithProviders(
      <>
        <PrivacySection />
        <Toaster />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ask for a copy of my information' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ask for a copy of your information' });
    await userEvent.type(within(dialog).getByLabelText(/Anything in particular/), 'My trip history');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText(/Your reference is ST-4HX8PA/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sent.find((request) => request.method === 'POST')?.body).toEqual({
      type: 'ACCESS',
      message: 'My trip history',
    });
  });

  it('needs to know what to correct', async () => {
    const sent = mockPrivacy();
    renderWithProviders(
      <>
        <PrivacySection />
        <Toaster />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ask us to correct something' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ask us to correct your information' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));

    expect(await within(dialog).findByText(/Tell us what needs correcting/)).toBeInTheDocument();
    expect(sent.some((request) => request.method === 'POST')).toBe(false);
  });

  it('says when the same request is already being worked on', async () => {
    mockPrivacy({ alreadyOpen: true });
    renderWithProviders(
      <>
        <PrivacySection />
        <Toaster />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ask for a copy of my information' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Send request' }));

    expect(await screen.findByText('You’ve already asked')).toBeInTheDocument();
  });

  it('asks to close the account once nothing is under way', async () => {
    const sent = mockPrivacy();
    renderWithProviders(
      <>
        <PrivacySection />
        <Toaster />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close my account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Close your account?' });
    expect(within(dialog).getByText(/This can’t be undone/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Ask to close my account' });
    await vi.waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent.find((request) => request.method === 'POST')?.body).toEqual({ type: 'CLOSE_ACCOUNT' });
  });

  it('explains what stops the account closing, with no way to send', async () => {
    mockPrivacy({
      closure: {
        allowed: false,
        blockers: [
          { code: 'UPCOMING_TRIP', message: 'You have a trip that’s requested, booked or under way.' },
          { code: 'PAYOUT_DUE', message: 'A payout is still on its way to you.' },
        ],
      },
    });
    renderWithProviders(
      <>
        <PrivacySection />
        <Toaster />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close my account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Close your account?' });

    expect(await within(dialog).findByText('Your account can’t be closed yet')).toBeInTheDocument();
    expect(within(dialog).getByText(/You have a trip that’s requested/)).toBeInTheDocument();
    expect(within(dialog).getByText(/A payout is still on its way/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Ask to close my account' })).not.toBeInTheDocument();
  });
});
