import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminUser, mockApi, renderWithProviders } from '@/test/utils';
import { LoginForm } from './login-form';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginForm', () => {
  it('explains what is missing before calling the API', async () => {
    const fetchMock = mockApi({});
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email address')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a badly formed email address', async () => {
    mockApi({});
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText('Email address'), 'kiri@');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText(/Enter a valid email address/)).toBeInTheDocument();
  });

  it('shows the reason when the API refuses the sign-in', async () => {
    mockApi({
      'POST /auth/login': {
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid' } },
      },
    });
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(await screen.findByLabelText('Email address'), 'kiri@example.co.nz');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That email and password don't match our records",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a friendly message when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText('Email address'), 'kiri@example.co.nz');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach Rento Vroom");
  });

  it('signs in to the staff portal and hands back the user', async () => {
    let sentBody: unknown;
    const fetchMock = mockApi({
      'POST /auth/login': (init) => {
        sentBody = JSON.parse(String(init?.body));
        return { status: 200, body: { user: adminUser } };
      },
    });
    const onSuccess = vi.fn();
    renderWithProviders(
      <LoginForm portal="admin" submitLabel="Log in to the staff portal" onSuccess={onSuccess} />,
    );

    await userEvent.type(await screen.findByLabelText('Email address'), '  aroha@example.co.nz ');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Log in to the staff portal' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(adminUser));
    expect(sentBody).toEqual({ email: 'aroha@example.co.nz', password: 'correct horse', portal: 'admin' });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('lets the user reveal the password', async () => {
    mockApi({});
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });
});
