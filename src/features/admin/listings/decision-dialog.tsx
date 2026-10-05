import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { applyFieldErrors } from '@/features/account/form-errors';
import { reviewErrorMessage } from './listing-api';
import { Textarea } from './textarea';

// The API's limits: notes that go to the Host or applicant need a few words (plan §9, Days 8–11).
const NOTES_MAX = 1000;
const tooLong = `Keep it under ${NOTES_MAX.toLocaleString('en-NZ')} characters`;
const requiredNotesSchema = z.object({
  notes: z.string().trim().min(3, 'Add a short note saying why').max(NOTES_MAX, tooLong),
});
const optionalNotesSchema = z.object({ notes: z.string().trim().max(NOTES_MAX, tooLong) });

type NotesValues = z.infer<typeof optionalNotesSchema>;

interface DecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Danger for decisions that turn someone away. */
  tone?: 'primary' | 'danger';
  /** Required for a rejection or a request for changes: the person is told why. */
  notes: 'optional' | 'required';
  notesLabel: string;
  notesDescription?: ReactNode;
  /** Shown above the notes, e.g. why this can't be approved yet. */
  notice?: ReactNode;
  /** Stops the decision; say why in `notice`. */
  blocked?: boolean;
  /** Sends the decision. An API error it throws shows in the dialog. */
  onConfirm: (notes: string | undefined) => Promise<void>;
  /** Extra help under an API error, such as a link to where it can be fixed. */
  errorAction?: (error: unknown) => ReactNode;
}

/** Confirms a staff decision, with notes for the person it affects. Every decision is in the audit log. */
export function DecisionDialog({ open, onOpenChange, title, description, ...form }: DecisionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <DecisionForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

function DecisionForm({
  confirmLabel,
  tone = 'primary',
  notes: notesMode,
  notesLabel,
  notesDescription,
  notice,
  blocked,
  onConfirm,
  errorAction,
}: Omit<DecisionDialogProps, 'open' | 'onOpenChange' | 'title' | 'description'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NotesValues>({
    resolver: zodResolver(notesMode === 'required' ? requiredNotesSchema : optionalNotesSchema),
    defaultValues: { notes: '' },
  });

  const onSubmit = handleSubmit(async ({ notes }) => {
    try {
      await confirm.mutateAsync(notes || undefined);
    } catch (error) {
      applyFieldErrors(error, ['notes'] as const, setError);
    }
  });
  const serverError = confirm.isError ? reviewErrorMessage(confirm.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {notice}
      {serverError && (
        <Alert variant="danger" role="alert" action={errorAction?.(confirm.error)}>
          {serverError}
        </Alert>
      )}
      {!blocked && (
        <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
          <legend className="sr-only">{notesLabel}</legend>
          <Field label={notesLabel} description={notesDescription} error={errors.notes?.message}>
            <Textarea maxLength={NOTES_MAX} {...register('notes')} />
          </Field>
        </fieldset>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">{blocked ? 'Close' : 'Cancel'}</Button>
        </DialogClose>
        {!blocked && (
          <Button type="submit" variant={tone} loading={confirm.isPending}>
            {confirmLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
