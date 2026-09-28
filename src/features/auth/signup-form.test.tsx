import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, mockApi, renderWithProviders } from '@/test/utils';
import { SignupForm } from './signup-form';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillIn(overrides: Partial<Record<'first' | 'last' | 'email' | 'password', string>> = {}) {
  await userEvent.type(await screen.findByLabelText('First name'), overrides.first ?? 'Kiri');
  await userEvent.type(screen.getByLabelText('Last name'), overrides.last ?? 'Tester');
  await userEvent.type(screen.getByLabelText('Email address'), overrides.email ?? 'kiri@example.co.nz');
  await userEvent.type(screen.getByLabelText('Password'), overrides.password ?? 'tui sing at dawn');
}

const termsBox = () => screen.getByRole('checkbox', { name: /I agree to the Terms and Conditions/ });

describe('SignupForm', () => {
  it('explains what is missing before calling the API, including the terms', async () => {
    const fetchMock = mockApi({});
    renderWithProviders(<SignupForm onSuccess={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter your first name')).toBeInTheDocument();
    expect(screen.getByText('Enter your last name')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();
    expect(screen.getByText(/Please accept the Terms and Conditions/)).toBeInTheDocument();
    expect(termsBox()).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates the account with the terms accepted and hands back the user', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/signup': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 201, body: { user: guestUser } };
      },
    });
    const onSuccess = vi.fn();
    const onSubmitting = vi.fn();
    renderWithProviders(<SignupForm onSubmitting={onSubmitting} onSuccess={onSuccess} />);

    await fillIn({ email: ' kiri@example.co.nz ' });
    await userEvent.click(termsBox());
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(guestUser));
    expect(onSubmitting).toHaveBeenCalledOnce();
    expect(sent).toEqual({
      firstName: 'Kiri',
      lastName: 'Tester',
      email: 'kiri@example.co.nz',
      password: 'tui sing at dawn',
      acceptTerms: true,
    });
  });

  it("shows the API's answer next to the field it's about", async () => {
    mockApi({
      'POST /auth/signup': {
        status: 409,
        body: {
          error: {
            code: 'EMAIL_TAKEN',
            message: 'An account with this email address already exists.',
            fields: { email: 'An account with this email already exists. Log in, or reset your password.' },
          },
        },
      },
    });
    renderWithProviders(<SignupForm onSuccess={vi.fn()} />);

    await fillIn();
    await userEvent.click(termsBox());
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/already exists. Log in, or reset your password/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens the legal pages in a new tab, so the form is kept', async () => {
    mockApi({});
    renderWithProviders(<SignupForm onSuccess={vi.fn()} />);

    expect(await screen.findByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });
});
