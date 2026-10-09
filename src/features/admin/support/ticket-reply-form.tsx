import { CircleDot, NotebookPen, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/api/client';
import type { StaffTicket } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { TICKET_STATUS } from '@/features/admin/ops/admin-labels';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { useTicketFiles } from '@/features/support/use-ticket-files';
import { cn } from '@/lib/cn';
import { TICKET_STATUSES, useReplyToTicket, type TicketStatus } from './support-api';

/** The API's limit. */
const BODY_MAX = 5000;

/**
 * A reply to the sender, which we email to them, or an internal note for the team, which nobody else
 * sees. A reply leaves the ticket waiting on them unless another status is chosen; a note leaves it as it is.
 * Either can carry photos and PDFs, but a reply only when the sender has an account to see them in.
 */
export function TicketReplyForm({ ticket, ticketRef }: { ticket: StaffTicket; ticketRef: string }) {
  const reply = useReplyToTicket(ticketRef);
  const files = useTicketFiles();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  // Null until a status is chosen, so the default follows the Internal note switch.
  const [chosenStatus, setChosenStatus] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | undefined>();

  const status = chosenStatus ?? (internal ? ticket.status : 'PENDING');
  const statusOptions = TICKET_STATUSES.map((value) => ({
    value,
    label: value === ticket.status ? `${TICKET_STATUS[value].label} (no change)` : TICKET_STATUS[value].label,
  }));
  const firstName = ticket.from.name.split(' ')[0] ?? ticket.from.name;
  const fields = reply.error instanceof ApiError ? reply.error.fields : undefined;
  const fieldError = fields?.body;
  // Files on a reply are seen in the sender's account; a visitor from the Contact form has none.
  const canAttach = internal || Boolean(ticket.from.userId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      setError(internal ? 'Write a note' : 'Write a reply');
      return;
    }
    setError(undefined);
    reply.mutate(
      // A reply always says its status, as the API would otherwise mark it waiting on them.
      {
        body: text,
        internal,
        attachments: canAttach ? files.attachments : [],
        ...((!internal || status !== ticket.status) && { status }),
      },
      {
        onSuccess: () => {
          setBody('');
          setChosenStatus(null);
          if (canAttach) files.reset();
          const now = TICKET_STATUS[status].label;
          if (internal) {
            toast('Note added', {
              description:
                status === ticket.status
                  ? 'Only staff can see it.'
                  : `Only staff can see it. Status: ${now}.`,
            });
          } else {
            toast('Reply sent', { description: `We’ve emailed ${ticket.from.name}. Status: ${now}.` });
          }
        },
      },
    );
  };

  return (
    <Card asChild className={cn('grid gap-5 p-5 sm:p-6', internal && 'border-dashed bg-ink/3')}>
      <form noValidate onSubmit={submit} aria-labelledby="ticket-reply-heading">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h2 id="ticket-reply-heading" className="text-base font-semibold text-ink">
            {internal ? 'Add an internal note' : `Reply to ${firstName}`}
          </h2>
          <Switch
            checked={internal}
            onCheckedChange={setInternal}
            label="Internal note"
            description="Only staff see it, and nothing is emailed."
            disabled={reply.isPending}
            className="gap-3"
          />
        </div>

        <Field
          label={internal ? 'Note for the team' : 'Your reply'}
          description={
            internal
              ? undefined
              : ticket.from.email
                ? `We’ll email it to ${ticket.from.email}${ticket.from.userId ? ' and show it in their account' : ''}.`
                : undefined
          }
          error={error ?? fieldError}
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            maxLength={BODY_MAX}
            disabled={reply.isPending}
          />
        </Field>

        {canAttach ? (
          <EvidencePicker evidence={files} />
        ) : (
          <p className="text-sm text-muted">
            {ticket.from.name} has no account to see files in. Add them to an internal note instead.
          </p>
        )}

        {reply.isError && !fieldError && (
          <Alert variant="danger" role="alert">
            {fields?.attachments ?? reply.error.message}
          </Alert>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <Field label="Then set the status to" className="w-full sm:w-72">
            <Select
              value={status}
              onChange={(value) =>
                setChosenStatus(TICKET_STATUSES.find((option) => option === value) ?? null)
              }
              options={statusOptions}
              icon={<CircleDot />}
              listLabel="Statuses"
              disabled={reply.isPending}
            />
          </Field>
          <Button
            type="submit"
            loading={reply.isPending}
            disabled={canAttach && files.uploading}
            className="w-full sm:w-auto"
          >
            {internal ? <NotebookPen aria-hidden="true" /> : <Send aria-hidden="true" />}
            {internal ? 'Add note' : 'Send reply'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
