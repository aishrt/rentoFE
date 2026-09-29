import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyFieldErrors } from '@/features/account/form-errors';
import { codeSchema, digitsOnly, oneTimeCodeInputProps, type CodeValues } from '@/features/auth/code-schema';
import { mfaErrorMessage } from './use-mfa-status';

interface CodeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Sends the change with the code. An API error it throws shows in the form. */
  onConfirm: (code: string) => Promise<void>;
}

/**
 * Asks for a code from one of the staff member's authenticator apps before a change to their
 * two-factor sign-in, so a signed-in browser alone can't make it.
 */
export function CodeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  ...form
}: CodeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <CodeConfirmForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

function CodeConfirmForm({
  confirmLabel,
  onConfirm,
}: Pick<CodeConfirmDialogProps, 'confirmLabel' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    try {
      await confirm.mutateAsync(digitsOnly(code));
    } catch (error) {
      applyFieldErrors(error, ['code'] as const, setError);
    }
  });
  const serverError = confirm.isError ? mfaErrorMessage(confirm.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">Code from your authenticator app</legend>
        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}
        <Field label="Code from your authenticator app" error={errors.code?.message}>
          <Input leadingIcon={<ShieldCheck />} {...oneTimeCodeInputProps} {...register('code')} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="danger" loading={confirm.isPending}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
