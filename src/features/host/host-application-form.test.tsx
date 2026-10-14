import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithRouter } from '@/test/utils';
import { HostApplicationForm } from './host-application-form';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter(
    [
      {
        path: '/host/apply',
        element: <HostApplicationForm phoneVerified onPhoneRequired={vi.fn()} onApplied={vi.fn()} />,
      },
    ],
    '/host/apply',
  );

describe('HostApplicationForm', () => {
  it('says why the API refused, in its own words', async () => {
    mockApi({
      'POST /me/host-application': {
        status: 409,
        body: {
          error: { code: 'HOST_SUSPENDED', message: 'Your hosting is suspended. Please contact support.' },
        },
      },
    });
    render();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Host Agreement/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your hosting is suspended. Please contact support.',
    );
  });

  it('shows a field message the form has no field for above the form', async () => {
    mockApi({
      'POST /me/host-application': {
        status: 409,
        body: {
          error: {
            code: 'PHONE_TAKEN',
            message: 'Some details need fixing.',
            fields: { phone: 'That mobile is on another account' },
          },
        },
      },
    });
    render();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Host Agreement/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That mobile is on another account');
  });
});
