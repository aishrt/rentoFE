import { useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, ShieldOff, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MfaDevice, MfaStatus } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { disableMfaRequest, removeMfaDeviceRequest } from '@/features/account/account-api';
import { SettingsSection } from '@/features/account/settings-section';
import { sessionQueryKey } from '@/features/auth/use-session';
import { NZ_TIME_ZONE } from '@/lib/format';
import { AddAuthenticatorDialog } from './add-authenticator-dialog';
import { CodeConfirmDialog } from './code-confirm-dialog';
import { mfaStatusQueryKey, useMfaStatus } from './use-mfa-status';

// Here rather than in lib/format.ts, which the homepage loads: only the staff portal needs it.
const dateFormat = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: NZ_TIME_ZONE,
});

/** "25 Sept 2026" in NZ time. */
const formatDateNz = (iso: string) => dateFormat.format(new Date(iso));

/**
 * The staff member's own two-factor sign-in (plan §6.1): off or on, with up to two authenticator apps
 * so a lost phone doesn't lock them out. Adding a backup, removing an app and turning it off each ask
 * for a code from an app already set up.
 */
export function TwoFactorSection() {
  const queryClient = useQueryClient();
  const status = useMfaStatus();
  const [notice, setNotice] = useState<string | null>(null);
  // Each dialog's details are kept while it closes, so its text doesn't change as it animates out.
  const [adding, setAdding] = useState(false);
  const [addingBackup, setAddingBackup] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MfaDevice | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [bothApps, setBothApps] = useState(false);

  const startAdding = (backup: boolean) => {
    setNotice(null);
    setAddingBackup(backup);
    setAdding(true);
  };

  const startRemoving = (device: MfaDevice) => {
    setNotice(null);
    setRemoveTarget(device);
    setRemoving(true);
  };

  const removeDevice = async (code: string) => {
    if (!removeTarget) return;
    queryClient.setQueryData(mfaStatusQueryKey, await removeMfaDeviceRequest({ id: removeTarget.id, code }));
    setRemoving(false);
    setNotice(`${removeTarget.name} was removed, and its codes no longer work.`);
  };

  const disable = async (code: string) => {
    queryClient.setQueryData(sessionQueryKey, await disableMfaRequest(code));
    queryClient.setQueryData<MfaStatus>(
      mfaStatusQueryKey,
      (previous) => previous && { ...previous, enabled: false, devices: [] },
    );
    setDisabling(false);
    setNotice('Two-factor sign-in is off. Signing in now needs only your password.');
  };

  const deviceCount = status.data?.devices.length ?? 0;

  return (
    <SettingsSection
      title="Two-factor sign-in"
      description="A code from an authenticator app as well as your password, so a stolen password alone can't open the staff portal."
    >
      {notice && (
        <Alert variant="success" role="status" className="mb-5">
          {notice}
        </Alert>
      )}

      {status.isPending && (
        <div aria-busy="true">
          <span className="sr-only">Loading your two-factor sign-in</span>
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="mt-5 h-11 w-60" />
        </div>
      )}

      {status.isError && (
        <Alert
          variant="danger"
          role="alert"
          title="We couldn't load your two-factor sign-in"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => status.refetch()}
              loading={status.isFetching}
            >
              Try again
            </Button>
          }
        >
          {status.error.message}
        </Alert>
      )}

      {status.data && (
        <div className="grid gap-5">
          <div className="flex items-start gap-3">
            <IconBadge tone={status.data.enabled ? 'soft' : 'muted'}>
              {status.data.enabled ? <ShieldCheck /> : <ShieldOff />}
            </IconBadge>
            <div>
              <p className="font-medium text-ink">
                Two-factor sign-in is {status.data.enabled ? 'on' : 'off'}
              </p>
              <p className="text-sm text-muted">
                {status.data.enabled
                  ? `Signing in needs your password and a code from ${deviceCount > 1 ? 'one of these apps' : 'this app'}.`
                  : 'Signing in needs only your password.'}
              </p>
            </div>
          </div>

          {status.data.enabled ? (
            <>
              <ul
                aria-label="Your authenticator apps"
                className="divide-y divide-line rounded-control border border-line"
              >
                {status.data.devices.map((device) => (
                  <li key={device.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <IconBadge size="sm" tone="muted">
                      <Smartphone />
                    </IconBadge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{device.name}</p>
                      <p className="text-sm text-muted">
                        Added {formatDateNz(device.addedAt)}
                        {device.lastUsedAt && ` · Last used ${formatDateNz(device.lastUsedAt)}`}
                      </p>
                    </div>
                    {deviceCount > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${device.name}`}
                        onClick={() => startRemoving(device)}
                      >
                        <Trash2 aria-hidden="true" />
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              {deviceCount < status.data.maxDevices && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-control bg-ink/3 p-4">
                  <p className="min-w-0 flex-1 basis-60 text-sm text-muted">
                    Add a backup app, on another device or in a password manager, so losing your phone doesn't
                    lock you out.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => startAdding(true)}>
                    <Plus aria-hidden="true" />
                    Add a backup app
                  </Button>
                </div>
              )}

              <div className="border-t border-line pt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNotice(null);
                    setBothApps(deviceCount > 1);
                    setDisabling(true);
                  }}
                >
                  <ShieldOff aria-hidden="true" />
                  Turn off two-factor sign-in
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button onClick={() => startAdding(false)}>
                <ShieldCheck aria-hidden="true" />
                Turn on two-factor sign-in
              </Button>
            </div>
          )}
        </div>
      )}

      <AddAuthenticatorDialog
        open={adding}
        onOpenChange={setAdding}
        backup={addingBackup}
        onAdded={() => {
          setAdding(false);
          setNotice(
            addingBackup
              ? 'Backup app added. Codes from either app now sign you in.'
              : "Two-factor sign-in is on. You've been signed out on your other devices.",
          );
        }}
      />
      <CodeConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Remove ${removeTarget?.name ?? 'this app'}?`}
        description="Its codes will stop working. Enter a code from either of your authenticator apps; if you've lost this one, use the other."
        confirmLabel="Remove app"
        onConfirm={removeDevice}
      />
      <CodeConfirmDialog
        open={disabling}
        onOpenChange={setDisabling}
        title="Turn off two-factor sign-in?"
        description={
          bothApps
            ? 'Signing in will need only your password, and both your apps are removed. Enter a code from either app to confirm.'
            : 'Signing in will need only your password, and your app is removed. Enter a code from it to confirm.'
        }
        confirmLabel="Turn off"
        onConfirm={disable}
      />
    </SettingsSection>
  );
}
