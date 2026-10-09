import { useState } from 'react';
import type { ReportRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ChoiceCards } from '@/features/host/choice-cards';
import { useReport } from './messages-api';

type Reason = ReportRequest['reason'];

const REASONS: { value: Reason; label: string }[] = [
  { value: 'HARASSMENT', label: 'Abusive or harassing' },
  { value: 'SCAM', label: 'A scam or fraud' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'CONTACT_DETAILS', label: 'Asking to deal off the platform' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'FAKE', label: 'Fake or misleading' },
  { value: 'SAFETY', label: 'A safety concern' },
  { value: 'OTHER', label: 'Something else' },
];

interface ReportDialogContentProps {
  targetType: ReportRequest['targetType'];
  targetId: string;
  /** "Kiri", "this message", "this review". */
  subject: string;
  /** A person reported from a booking's conversation: that booking, so support can read it (plan §6.2). */
  bookingRef?: string;
  onDone: () => void;
}

/**
 * Reporting a person, message, review or listing to Rento Vroom's support team (spec §13, §16). Render
 * inside a <Dialog>. Reports are reviewed by people, so it says what happens next.
 */
export function ReportDialogContent({
  targetType,
  targetId,
  subject,
  bookingRef,
  onDone,
}: ReportDialogContentProps) {
  const report = useReport();
  const [reason, setReason] = useState<Reason | ''>('');
  const [note, setNote] = useState('');
  const [missingReason, setMissingReason] = useState(false);

  const submit = () => {
    if (!reason) {
      setMissingReason(true);
      return;
    }
    report.mutate(
      {
        targetType,
        targetId,
        reason,
        ...(note.trim() && { note: note.trim() }),
        ...(bookingRef && { bookingRef }),
      },
      {
        onSuccess: () => {
          toast('Thanks for telling us', {
            description: 'Our support team will look into it. In an emergency, call 111.',
          });
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent
      title={`Report ${subject}`}
      description="Our support team reviews every report. They won’t tell the other person who reported them."
      className="w-[min(92vw,36rem)]"
    >
      <div className="grid gap-5">
        <ChoiceCards
          legend="What’s wrong?"
          name="report-reason"
          value={reason}
          onChange={(value) => {
            setReason(value);
            setMissingReason(false);
          }}
          choices={REASONS}
          columns={2}
          compact
          error={missingReason ? 'Choose a reason' : undefined}
        />
        <Field label="Anything else we should know? (optional)">
          <Textarea
            rows={3}
            maxLength={2000}
            className="min-h-24"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {report.isError && (
          <Alert variant="danger" role="alert">
            {report.error.message}
          </Alert>
        )}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button loading={report.isPending} onClick={submit}>
          Send report
        </Button>
      </div>
    </DialogContent>
  );
}
