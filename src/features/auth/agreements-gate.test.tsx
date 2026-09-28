import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteHeader } from '@/components/layout/site-header';
import { guestUser, mockApi, renderWithProviders } from '@/test/utils';
import { AgreementsGate } from './agreements-gate';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AgreementsGate', () => {
  it('shows nothing when there is nothing new to accept', async () => {
    const fetchMock = mockApi({ 'POST /auth/session': { status: 200, body: { user: guestUser } } });
    renderWithProviders(<AgreementsGate />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for the updated documents and closes once they are accepted', async () => {
    let accepted: unknown;
    mockApi({
      'POST /auth/session': {
        status: 200,
        body: { user: { ...guestUser, pendingAgreements: ['TERMS', 'PRIVACY'] } },
      },
      'POST /me/agreements': (init) => {
        accepted = JSON.parse(String(init?.body)).types;
        return { status: 200, body: { user: guestUser } };
      },
    });
    renderWithProviders(<AgreementsGate />);

    const dialog = await screen.findByRole('dialog', { name: "We've updated our terms" });
    expect(screen.getByRole('link', { name: /Terms & conditions/ })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Privacy policy/ })).toHaveAttribute('target', '_blank');

    // It can't be dismissed without a choice.
    await userEvent.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'I accept' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(accepted).toEqual(['TERMS', 'PRIVACY']);
  });

  it('appears on public pages through the signed-in header', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...guestUser, pendingAgreements: ['PRIVACY'] } } },
    });
    renderWithProviders(<SiteHeader />);

    expect(
      await screen.findByRole('dialog', { name: "We've updated our privacy policy" }),
    ).toBeInTheDocument();
  });

  it('names a single updated document', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...guestUser, pendingAgreements: ['GUEST'] } } },
    });
    renderWithProviders(<AgreementsGate />);

    expect(
      await screen.findByRole('dialog', { name: "We've updated our guest agreement" }),
    ).toBeInTheDocument();
  });

  it('shows the API’s message when saving fails, and lets the user log out instead', async () => {
    let loggedOut = false;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...guestUser, pendingAgreements: ['TERMS'] } } },
      'POST /me/agreements': {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Some details need fixing.' } },
      },
      'POST /auth/logout': () => {
        loggedOut = true;
        return { status: 204 };
      },
    });
    renderWithProviders(<AgreementsGate />);

    await userEvent.click(await screen.findByRole('button', { name: 'I accept' }));
    expect(await screen.findByText('Some details need fixing.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(loggedOut).toBe(true);
  });
});
