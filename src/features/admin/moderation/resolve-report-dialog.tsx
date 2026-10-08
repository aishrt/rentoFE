import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceCards, type Choice } from '@/features/host/choice-cards';
import { MODERATION_NOTE_MAX, type ReportOutcome } from './moderation-api';

const OUTCOMES: Choice<ReportOutcome>[] = [
  {
    value: 'ACTIONED',
    label: 'Action taken',
    description: 'You removed something, warned someone or suspended an account.',
  },
  {
    value: 'DISMISSED',
    label: 'Dismiss',
    description: 'Nothing here breaks the rules, so nothing needed doing.',
  },
];

interface Resolution {
  status: ReportOutcome;
  resolution: string;
}

interface ResolveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Message reported by Aroha for harassment": what's being resolved. */
  summary: string;
  /** Sends the decision. An API error it throws shows in the dialog. */
  onConfirm: (input: Resolution) => Promise<void>;
}

function ResolveForm({ onConfirm }: Pick<ResolveReportDialogProps, 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const [status, setStatus] = useState<ReportOutcome | ''>('');
  const [resolution, setResolution] = useState('');
  const [errors, setErrors] = useState<{ status?: string; resolution?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = resolution.trim();
    const next = {
      status: status ? undefined : 'Choose what happened',
      resolution: text.length < 3 ? 'Say what was done' : undefined,
    };
    setErrors(next);
    if (!status || next.resolution) return;
    confirm.mutate(
      { status, resolution: text },
      {
        onError: (error) => {
          const message = error instanceof ApiError ? error.fields?.resolution : undefined;
          if (message) setErrors({ resolution: message });
        },
      },
    );
  };
  const serverError =
    confirm.error && !(confirm.error instanceof ApiError && confirm.error.fields?.resolution)
      ? confirm.error.message
      : null;

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-5">
        <ChoiceCards
          legend="What happened?"
          name="report-outcome"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setErrors((current) => ({ ...current, status: undefined }));
          }}
          choices={OUTCOMES}
          columns={1}
          error={errors.status}
        />
        <Field
          label="What was done"
          description="Kept with the report and in the audit log, for the team."
          error={errors.resolution}
        >
          <Textarea
            rows={3}
            maxLength={MODERATION_NOTE_MAX}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
          />
        </Field>
      </fieldset>
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={confirm.isPending}>
          Resolve report
        </Button>
      </div>
    </form>
  );
}

/** Closes a member's report: action was taken, or it's dismissed, with a note of what was done. */
export function ResolveReportDialog({ open, onOpenChange, summary, onConfirm }: ResolveReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Resolve this report"
        description={`${summary}. It leaves the open reports once resolved.`}
        className="w-[min(92vw,34rem)]"
      >
        <ResolveForm onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}
