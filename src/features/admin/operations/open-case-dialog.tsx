import { zodResolver } from '@hookform/resolvers/zod';
import { FilePlus2, Hash, Shapes } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { IncidentType } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { ChoiceCards } from '@/features/host/choice-cards';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { INCIDENT_TYPES } from '@/features/incidents/incident-labels';
import { useEvidence } from '@/features/incidents/use-evidence';
import { useOpenIncident } from './operations-api';
import { VISIBILITY_LABELS, type EventVisibility } from './operations-labels';

// The API's limits for a case.
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;
const BOOKING_REF = /^RV-[A-Z0-9]{6}$/i;
const FORM_FIELDS = ['bookingRef', 'type', 'description'] as const;
const VISIBILITIES = ['BOTH', 'GUEST', 'HOST', 'INTERNAL'] as const satisfies readonly EventVisibility[];

const caseSchema = z.object({
  bookingRef: z.string().trim().regex(BOOKING_REF, 'Enter a booking reference like RV-7K2Q9M'),
  type: z.string().min(1, 'Choose what happened'),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Say what happened (at least ${DESCRIPTION_MIN} characters)`)
    .max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX.toLocaleString('en-NZ')} characters`),
  visibility: z.enum(VISIBILITIES),
});

type CaseValues = z.infer<typeof caseSchema>;

/** Who a case is for: the case itself, not only its first note, is hidden from anyone it isn't for. */
const CASE_VISIBILITY_HELP: Record<EventVisibility, string> = {
  BOTH: 'The Guest and the Host see the case, and we let them both know.',
  GUEST: 'Only the Guest sees the case, and we let them know. The Host doesn’t.',
  HOST: 'Only the Host sees the case, and we let them know. The Guest doesn’t.',
  INTERNAL: 'Only staff see it, until you share an update with the Guest or Host.',
};

const VISIBILITY_CHOICES = VISIBILITIES.map((value) => ({
  value,
  label: VISIBILITY_LABELS[value],
  description: CASE_VISIBILITY_HELP[value],
}));

const TYPE_OPTIONS = INCIDENT_TYPES.map((option) => ({ value: option.value, label: option.label }));

const isType = (value: string): value is IncidentType =>
  INCIDENT_TYPES.some((option) => option.value === value);

function OpenCaseForm({ bookingRef }: { bookingRef?: string }) {
  const navigate = useNavigate();
  const open = useOpenIncident();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: { bookingRef: bookingRef ?? '', type: '', description: '', visibility: 'BOTH' },
  });
  // Evidence is uploaded to the booking's folder, so it waits for a booking reference that looks right.
  const typedRef = useWatch({ control, name: 'bookingRef' }).trim().toUpperCase();
  const evidenceRef = BOOKING_REF.test(typedRef) ? typedRef : '';
  const evidence = useEvidence(evidenceRef);

  const onSubmit = handleSubmit(async (values) => {
    if (!isType(values.type)) return;
    try {
      const incident = await open.mutateAsync({
        bookingRef: values.bookingRef.trim().toUpperCase(),
        type: values.type,
        description: values.description,
        attachments: evidence.attachments,
        visibility: values.visibility,
      });
      toast(`Case ${incident.caseRef} is open`, {
        description: 'It’s assigned to you, and the booking’s payouts are held until it’s settled.',
      });
      void navigate(`/admin/incidents/${incident.caseRef}`);
    } catch (error) {
      applyFieldErrors(error, FORM_FIELDS, setError);
    }
  });

  // Field errors show under their fields; anything else above the buttons.
  const apiFields = open.error instanceof ApiError ? open.error.fields : undefined;
  const serverError =
    open.error && !FORM_FIELDS.some((field) => apiFields?.[field]) ? open.error.message : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5" aria-label="Open a case">
      <fieldset disabled={open.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">The case</legend>
        {bookingRef ? (
          <p className="text-sm text-ink">
            On booking <span className="font-semibold">{bookingRef}</span>. The damage-report window doesn’t
            apply to cases staff open.
          </p>
        ) : (
          <Field
            label="Booking reference"
            description="The damage-report window doesn’t apply to cases staff open."
            error={errors.bookingRef?.message}
          >
            <Input
              leadingIcon={<Hash />}
              autoComplete="off"
              spellCheck={false}
              placeholder="RV-7K2Q9M"
              // Files already uploaded belong to this booking.
              readOnly={evidence.files.length > 0}
              {...register('bookingRef')}
            />
          </Field>
        )}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Field label="What happened" error={errors.type?.message}>
              <Select
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={TYPE_OPTIONS}
                placeholder="Choose a type"
                icon={<Shapes />}
                listLabel="Incident types"
              />
            </Field>
          )}
        />
        <Field
          label="Description"
          description="The case’s opening note. Write it for whoever sees the case."
          error={errors.description?.message}
        >
          <Textarea rows={4} maxLength={DESCRIPTION_MAX} {...register('description')} />
        </Field>
        {evidenceRef && <EvidencePicker evidence={evidence} />}
        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend="Who sees the case"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={VISIBILITY_CHOICES}
            />
          )}
        />
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
        <Button type="submit" loading={open.isPending} disabled={evidence.uploading}>
          Open the case
        </Button>
      </div>
    </form>
  );
}

/**
 * "Open a case" for staff (plan §3: support can open one, outside the damage-report window): on a booking's
 * record with the booking chosen, or on the incidents list with its reference typed in. The new case opens
 * once it's made.
 */
export function OpenCaseButton({ bookingRef, className }: { bookingRef?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" className={className} onClick={() => setOpen(true)}>
        <FilePlus2 aria-hidden="true" />
        Open a case
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Open a case"
          description="For anything the Guest or Host hasn’t reported themselves: a toll or fine notice, damage found later, or a dispute."
        >
          {open && <OpenCaseForm bookingRef={bookingRef} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
