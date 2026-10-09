import { zodResolver } from '@hookform/resolvers/zod';
import { Flag } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { Incident, IncidentStatus, StaffIncidentUpdateRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ChoiceCards } from '@/features/host/choice-cards';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { useEvidence } from '@/features/incidents/use-evidence';
import { useStaffIncidentUpdate } from './operations-api';
import {
  INCIDENT_STATUSES,
  STAFF_INCIDENT_STATUS,
  VISIBILITY_HELP,
  VISIBILITY_LABELS,
  type EventVisibility,
} from './operations-labels';

// The API's limit for an update.
const NOTE_MAX = 5000;
const VISIBILITIES = ['BOTH', 'GUEST', 'HOST', 'INTERNAL'] as const satisfies readonly EventVisibility[];

const updateSchema = z.object({
  note: z
    .string()
    .trim()
    .max(NOTE_MAX, `Keep it under ${NOTE_MAX.toLocaleString('en-NZ')} characters`),
  visibility: z.enum(VISIBILITIES),
  status: z.string(),
  assignToMe: z.boolean(),
});

type UpdateValues = z.infer<typeof updateSchema>;

const DEFAULTS: UpdateValues = { note: '', visibility: 'BOTH', status: '', assignToMe: false };

const isStatus = (value: string): value is IncidentStatus =>
  INCIDENT_STATUSES.some((status) => status === value);

const VISIBILITY_CHOICES = VISIBILITIES.map((value) => ({
  value,
  label: VISIBILITY_LABELS[value],
  description: VISIBILITY_HELP[value],
}));

const SEEN_BY: Record<EventVisibility, string> = {
  BOTH: 'The Guest and the Host can see your update.',
  GUEST: 'Only the Guest can see your update.',
  HOST: 'Only the Host can see your update.',
  INTERNAL: 'Only staff can see your note.',
};

/** The toast after an update: what changed, and who can see it. */
function updatedToast(body: StaffIncidentUpdateRequest) {
  const parts = [
    body.status && `It’s now ${STAFF_INCIDENT_STATUS[body.status].label.toLowerCase()}.`,
    body.assignToMe && 'It’s assigned to you.',
    (body.note || body.attachments.length > 0) && SEEN_BY[body.visibility],
  ];
  toast('Case updated', { description: parts.filter(Boolean).join(' ') });
}

/**
 * Support's update to a case (spec §15): a note for both parties, one of them or staff only, with photos or
 * documents, a new status, and taking the case. Resolving or closing it can release held payouts.
 */
export function IncidentUpdateForm({ incident }: { incident: Incident }) {
  const update = useStaffIncidentUpdate(incident.caseRef);
  const evidence = useEvidence(incident.bookingRef);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateValues>({ resolver: zodResolver(updateSchema), defaultValues: DEFAULTS });

  // Only where the case can go from here (the API's workflow): a resolved case can be reopened, a closed
  // one is final.
  const reopening = incident.status === 'RESOLVED';
  const statusOptions = [
    { value: '', label: `No change (${STAFF_INCIDENT_STATUS[incident.status].label})` },
    ...(incident.nextStatuses ?? []).map((status) => ({
      value: status,
      label:
        reopening && status !== 'CLOSED'
          ? `Reopen: ${STAFF_INCIDENT_STATUS[status].label.toLowerCase()}`
          : STAFF_INCIDENT_STATUS[status].label,
    })),
  ];
  const statusFinal = statusOptions.length === 1;

  const onSubmit = handleSubmit(async ({ note, visibility, status, assignToMe }) => {
    const body: StaffIncidentUpdateRequest = {
      note,
      attachments: evidence.attachments,
      visibility,
      ...(isStatus(status) && status !== incident.status && { status }),
      ...(assignToMe && { assignToMe: true }),
    };
    if (!body.note && body.attachments.length === 0 && !body.status && !body.assignToMe) {
      setError(
        'note',
        { message: 'Write an update, change the status or take the case' },
        { shouldFocus: true },
      );
      return;
    }
    try {
      await update.mutateAsync(body);
    } catch (error) {
      const noteError = error instanceof ApiError ? error.fields?.note : undefined;
      if (noteError) setError('note', { message: noteError }, { shouldFocus: true });
      return;
    }
    reset(DEFAULTS);
    evidence.reset();
    updatedToast(body);
  });

  // Field errors show under the field; anything else, such as a case that's gone, above the button.
  const serverError =
    update.error && !(update.error instanceof ApiError && update.error.fields?.note)
      ? update.error.message
      : null;

  return (
    <Card asChild className="p-5 sm:p-6">
      <form noValidate onSubmit={onSubmit} aria-labelledby="case-update-title">
        <h2 id="case-update-title" className="font-semibold text-ink">
          Update the case
        </h2>
        <fieldset disabled={update.isPending} className="mt-4 grid min-w-0 gap-5">
          <legend className="sr-only">Update the case</legend>
          <Field
            label="Update"
            description="Write it for whoever sees it. Leave it empty to change only the status or take the case."
            error={errors.note?.message}
          >
            <Textarea rows={4} maxLength={NOTE_MAX} {...register('note')} />
          </Field>
          <EvidencePicker evidence={evidence} />
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <ChoiceCards
                ref={field.ref}
                legend="Who sees it"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                choices={VISIBILITY_CHOICES}
              />
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Field
                  label="Status"
                  description={
                    statusFinal
                      ? 'A closed case is final. Open a new case for anything new.'
                      : reopening
                        ? 'Reopening holds the booking’s unpaid payouts again.'
                        : undefined
                  }
                >
                  <Select
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={statusOptions}
                    icon={<Flag />}
                    listLabel="Statuses"
                    disabled={statusFinal}
                  />
                </Field>
              )}
            />
            <Checkbox
              label={
                incident.assignedTo ? `Assign to me (${incident.assignedTo} has it now)` : 'Assign to me'
              }
              className="sm:pb-3"
              {...register('assignToMe')}
            />
          </div>
        </fieldset>
        {serverError && (
          <Alert variant="danger" role="alert" className="mt-5">
            {serverError}
          </Alert>
        )}
        <div className="mt-5 flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={evidence.uploading}>
            Save update
          </Button>
        </div>
      </form>
    </Card>
  );
}
