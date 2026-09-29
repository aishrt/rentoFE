import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MfaStatus } from '@/api/types';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminSettingsPage } from './settings-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = () =>
  renderWithRouter([{ path: '/admin/settings', element: <AdminSettingsPage /> }], '/admin/settings');

const section = () => screen.findByRole('region', { name: 'Two-factor sign-in' });

const phone = { id: 'd1', name: 'Work phone', addedAt: '2026-09-01T00:00:00.000Z' };
const tablet = {
  id: 'd2',
  name: 'Backup phone',
  addedAt: '2026-09-02T00:00:00.000Z',
  lastUsedAt: '2026-09-20T00:00:00.000Z',
};
const statusWith = (devices: MfaStatus['devices']): MfaStatus => ({
  enabled: devices.length > 0,
  maxDevices: 2,
  devices,
});

const setupResponse = {
  status: 200,
  body: {
    secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/Rento%20Vroom:aroha',
    qrCode: 'data:image/png;base64,iVBORw0KGgo=',
  },
};

describe('AdminSettingsPage: two-factor sign-in', () => {
  it('turns it on with a QR code and the first code from the app', async () => {
    let status = statusWith([]);
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...adminUser, mfaEnabled: false } } },
      'GET /me/mfa': () => ({ status: 200, body: status }),
      'POST /me/mfa/setup': setupResponse,
      'POST /me/mfa/verify': (init) => {
        sent = JSON.parse(String(init?.body));
        status = statusWith([phone]);
        return { status: 200, body: { user: adminUser } };
      },
    });
    render();

    const twoFactor = within(await section());
    expect(await twoFactor.findByText('Two-factor sign-in is off')).toBeInTheDocument();
    await userEvent.click(twoFactor.getByRole('button', { name: 'Turn on two-factor sign-in' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Turn on two-factor sign-in' }));
    expect(await dialog.findByRole('img', { name: /QR code/ })).toHaveAttribute(
      'src',
      'data:image/png;base64,iVBORw0KGgo=',
    );
    // The key is shown in groups of four, for typing by hand.
    expect(dialog.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    // The first app needs no code from another.
    expect(dialog.queryByLabelText('Code from your current app')).not.toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('Name (optional)'), 'Work phone');
    await userEvent.type(dialog.getByLabelText('Code from the new app'), '123 456');
    await userEvent.click(dialog.getByRole('button', { name: 'Turn on' }));

    expect(
      await twoFactor.findByText(/Two-factor sign-in is on. You've been signed out/),
    ).toBeInTheDocument();
    expect(sent).toEqual({ code: '123456', name: 'Work phone' });
    expect(await twoFactor.findByText('Work phone')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('adds a backup app with a code from the current one', async () => {
    let status = statusWith([phone]);
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /me/mfa': () => ({ status: 200, body: status }),
      'POST /me/mfa/setup': setupResponse,
      'POST /me/mfa/verify': (init) => {
        sent = JSON.parse(String(init?.body));
        status = statusWith([phone, tablet]);
        return { status: 200, body: { user: adminUser } };
      },
    });
    render();

    const twoFactor = within(await section());
    await userEvent.click(await twoFactor.findByRole('button', { name: 'Add a backup app' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Add a backup authenticator app' }));
    await dialog.findByRole('img', { name: /QR code/ });
    await userEvent.type(dialog.getByLabelText('Code from the new app'), '111111');
    await userEvent.click(dialog.getByRole('button', { name: 'Add app' }));
    // A backup also needs the current app's code.
    expect(await dialog.findByText('Enter the 6-digit code')).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('Code from your current app'), '222 222');
    await userEvent.click(dialog.getByRole('button', { name: 'Add app' }));

    expect(await twoFactor.findByText(/Backup app added/)).toBeInTheDocument();
    expect(sent).toEqual({ code: '111111', currentCode: '222222' });
    expect(await twoFactor.findByText('Backup phone')).toBeInTheDocument();
    // Two is the most.
    expect(twoFactor.queryByRole('button', { name: 'Add a backup app' })).not.toBeInTheDocument();
  });

  it('removes one of two apps once a code is entered', async () => {
    const codes: unknown[] = [];
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /me/mfa': { status: 200, body: statusWith([phone, tablet]) },
      'POST /me/mfa/devices/d1/remove': (init) => {
        const { code } = JSON.parse(String(init?.body));
        codes.push(code);
        return code === '000000'
          ? {
              status: 400,
              body: {
                error: { code: 'CODE_INVALID', message: 'Wrong', fields: { code: "That code isn't right." } },
              },
            }
          : { status: 200, body: statusWith([tablet]) };
      },
    });
    render();

    const twoFactor = within(await section());
    expect(await twoFactor.findByText(/Last used 20 Sept? 2026/)).toBeInTheDocument();
    await userEvent.click(twoFactor.getByRole('button', { name: 'Remove Work phone' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Remove Work phone?' }));
    await userEvent.type(dialog.getByLabelText('Code from your authenticator app'), '000000');
    await userEvent.click(dialog.getByRole('button', { name: 'Remove app' }));
    expect(await dialog.findByText("That code isn't right.")).toBeInTheDocument();

    await userEvent.clear(dialog.getByLabelText('Code from your authenticator app'));
    await userEvent.type(dialog.getByLabelText('Code from your authenticator app'), '654321');
    await userEvent.click(dialog.getByRole('button', { name: 'Remove app' }));

    expect(await twoFactor.findByText(/Work phone was removed/)).toBeInTheDocument();
    expect(codes).toEqual(['000000', '654321']);
    // The last app can't be removed, only turned off.
    expect(twoFactor.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('turns it off once a code is entered', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /me/mfa': { status: 200, body: statusWith([phone]) },
      'POST /me/mfa/disable': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { user: { ...adminUser, mfaEnabled: false } } };
      },
    });
    render();

    const twoFactor = within(await section());
    await userEvent.click(await twoFactor.findByRole('button', { name: 'Turn off two-factor sign-in' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Turn off two-factor sign-in?' }));
    await userEvent.type(dialog.getByLabelText('Code from your authenticator app'), '123 456');
    await userEvent.click(dialog.getByRole('button', { name: 'Turn off' }));

    expect(
      await twoFactor.findByText(/Two-factor sign-in is off. Signing in now needs only/),
    ).toBeInTheDocument();
    expect(sent).toEqual({ code: '123456' });
    expect(twoFactor.getByRole('button', { name: 'Turn on two-factor sign-in' })).toBeInTheDocument();
  });
});
