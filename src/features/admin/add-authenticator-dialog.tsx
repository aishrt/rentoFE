import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { addMfaDeviceRequest, startMfaSetupRequest } from '@/features/account/account-api';
import { applyFieldErrors } from '@/features/account/form-errors';
import { codeSchema, digitsOnly, oneTimeCodeInputProps } from '@/features/auth/code-schema';
import { sessionQueryKey } from '@/features/auth/use-session';
import { mfaErrorMessage, mfaSetupQueryKey, mfaStatusQueryKey } from './use-mfa-status';

/** The key in groups of four, easier to type into an app by hand. */
const grouped = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

const firstAppSchema = z.object({
  name: z.string().trim().max(40, 'Use 40 characters or fewer'),
  code: codeSchema.shape.code,
  currentCode: z.string(),
});
const backupAppSchema = firstAppSchema.extend({ currentCode: codeSchema.shape.code });
type Values = z.infer<typeof firstAppSchema>;

interface AddAuthenticatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A second app, which also needs a code from the app already set up. */
  backup: boolean;
  onAdded: () => void;
}

/**
 * Adds an authenticator app (plan §6.1): scan the QR code or type the key, then enter the first code the
 * app shows. The first app turns two-factor sign-in on; a backup also needs a code from the current app.
 */
export function AddAuthenticatorDialog({ open, onOpenChange, backup, onAdded }: AddAuthenticatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={backup ? 'Add a backup authenticator app' : 'Turn on two-factor sign-in'}
        description="Use an app like Google Authenticator, Microsoft Authenticator or 1Password, on a device you keep with you."
      >
        <AddAuthenticatorForm backup={backup} onAdded={onAdded} />
      </DialogContent>
    </Dialog>
  );
}

function AddAuthenticatorForm({ backup, onAdded }: Pick<AddAuthenticatorDialogProps, 'backup' | 'onAdded'>) {
  const queryClient = useQueryClient();
  // A query, so the secret is fetched once even when React renders twice. It's kept if the dialog is
  // closed and opened again, so an app that already scanned it still works.
  const setup = useQuery({
    queryKey: mfaSetupQueryKey,
    queryFn: startMfaSetupRequest,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const add = useMutation({
    mutationFn: addMfaDeviceRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryKey, user);
      queryClient.removeQueries({ queryKey: mfaSetupQueryKey });
      void queryClient.invalidateQueries({ queryKey: mfaStatusQueryKey });
      onAdded();
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(backup ? backupAppSchema : firstAppSchema),
    defaultValues: { name: '', code: '', currentCode: '' },
  });

  const onSubmit = handleSubmit(async ({ name, code, currentCode }) => {
    try {
      await add.mutateAsync({
        code: digitsOnly(code),
        ...(name && { name }),
        ...(backup && { currentCode: digitsOnly(currentCode) }),
      });
    } catch (error) {
      applyFieldErrors(error, ['name', 'code', 'currentCode'] as const, setError);
      if (error instanceof ApiError && error.code === 'MFA_SETUP_NOT_STARTED') void setup.refetch();
    }
  });
  const serverError = add.isError ? mfaErrorMessage(add.error) : null;

  return (
    <ol className="grid gap-6">
      <li>
        <p className="font-medium text-ink">1. Scan this QR code with the app</p>
        {setup.isPending && <Skeleton className="mt-3 size-40 rounded-card" />}
        {setup.isError && (
          <Alert variant="danger" role="alert" className="mt-3">
            {mfaErrorMessage(setup.error)}{' '}
            <button type="button" className="link-underline font-medium" onClick={() => void setup.refetch()}>
              Try again
            </button>
          </Alert>
        )}
        {setup.data && (
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <img
              src={setup.data.qrCode}
              alt="QR code to add Rento Vroom to your authenticator app"
              width={160}
              height={160}
              className="size-40 rounded-card border border-line bg-white p-2"
            />
            <p className="min-w-0 flex-1 basis-40 text-sm text-muted">
              Can't scan it? Add an account in the app and type this key:
              <span className="mt-1 block font-mono text-sm tracking-wide break-all text-ink">
                {grouped(setup.data.secret)}
              </span>
            </p>
          </div>
        )}
      </li>

      <li>
        <p className="font-medium text-ink">2. Enter the code it shows</p>
        <form noValidate onSubmit={onSubmit} className="mt-3 grid gap-5">
          <fieldset disabled={add.isPending || !setup.data} className="grid min-w-0 gap-4">
            <legend className="sr-only">The new authenticator app</legend>
            {serverError && (
              <Alert variant="danger" role="alert">
                {serverError}
              </Alert>
            )}
            <Field
              label="Name (optional)"
              description="So you can tell your apps apart, like “Work phone”."
              error={errors.name?.message}
            >
              <Input
                leadingIcon={<Smartphone />}
                maxLength={40}
                placeholder={backup ? 'Backup authenticator' : 'Authenticator app'}
                {...register('name')}
              />
            </Field>
            <Field label="Code from the new app" error={errors.code?.message}>
              <Input leadingIcon={<ShieldCheck />} {...oneTimeCodeInputProps} {...register('code')} />
            </Field>
            {backup && (
              <Field
                label="Code from your current app"
                description="The app you already sign in with, so we know it's you."
                error={errors.currentCode?.message}
              >
                <Input
                  leadingIcon={<ShieldCheck />}
                  {...oneTimeCodeInputProps}
                  autoComplete="off"
                  {...register('currentCode')}
                />
              </Field>
            )}
            {!backup && (
              <p className="text-sm text-muted">Turning it on signs you out on your other devices.</p>
            )}
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={add.isPending} disabled={!setup.data}>
              {backup ? 'Add app' : 'Turn on'}
            </Button>
          </div>
        </form>
      </li>
    </ol>
  );
}
