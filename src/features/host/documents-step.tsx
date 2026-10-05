import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Gauge, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type UseFormGetValues } from 'react-hook-form';
import type { HostVehicle } from '@/api/types';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatDateValue, toDateInputValue } from '@/lib/dates';
import { toast } from '@/components/ui/toast';
import {
  documentSlots,
  documentsDefaults,
  documentsFieldFor,
  documentsPatch,
  documentsSchema,
  type DocumentSlot,
  type DocumentsValues,
} from './documents-form';
import { FileButton } from './file-button';
import { FormSection } from './form-section';
import { hostKeys, removeDocumentRequest, storeVehicle } from './host-api';
import { InlineConfirm } from './inline-confirm';
import { DocumentStatusBadge, RequirementBadge } from './status-badges';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { uploadProblem } from './upload';
import { UploadProgress } from './upload-progress';
import { hostErrorMessage, placeFieldErrors, useStepSave, type StepTarget } from './use-step-save';
import { useUploads } from './use-uploads';
import { uploadVehicleDocument } from './vehicle-files';
import {
  DOCUMENT_HINTS,
  DOCUMENT_LABELS,
  needsRuc,
  type DocumentType,
  type VehicleDocument,
} from './vehicle-labels';

/** Links to private documents work for 10 minutes (plan §3), so the car is fetched again well before then. */
const LINK_REFRESH_MS = 5 * 60_000;

function DocumentFile({ vehicleId, document }: { vehicleId: string; document: VehicleDocument }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeDocumentRequest(vehicleId, document.id),
    onSuccess: (saved) => storeVehicle(queryClient, saved),
    onError: (error) =>
      toast("We couldn't remove that document", { description: hostErrorMessage(error), tone: 'danger' }),
  });
  const label = DOCUMENT_LABELS[document.type];

  return (
    <li className="flex animate-pop-in flex-wrap items-center gap-x-3 gap-y-2 rounded-control bg-canvas/70 px-3 py-2">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {document.expiry ? `Expires ${formatDateValue(document.expiry)}` : 'Uploaded'}
        </p>
        {document.status === 'REJECTED' && (
          <p className="text-sm text-danger">Our team couldn't accept this one. Please upload a new copy.</p>
        )}
      </div>
      <DocumentStatusBadge status={document.status} />
      <div className="flex items-center gap-1">
        <a
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-primary transition-colors duration-120 hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Open
          <ExternalLink aria-hidden="true" className="size-4" />
          <span className="sr-only">{label} (opens in a new tab)</span>
        </a>
        <InlineConfirm
          label="Remove"
          ariaLabel={`Remove ${label}`}
          question="Remove it?"
          pending={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </div>
    </li>
  );
}

function DocumentRow({
  vehicle,
  slot,
  uploads,
  getValues,
}: {
  vehicle: HostVehicle;
  slot: DocumentSlot;
  uploads: ReturnType<typeof useUploads<DocumentType>>;
  getValues: UseFormGetValues<DocumentsValues>;
}) {
  const documents = vehicle.documents.filter((document) => document.type === slot.type);
  const state = uploads.slots[slot.type];
  const label = DOCUMENT_LABELS[slot.type];

  const onFile = (file: File) => {
    const problem = uploadProblem(file, 'VEHICLE_DOCUMENT');
    if (problem) {
      uploads.fail(slot.type, problem);
      return;
    }
    // The dates from this step go with the file, so our team can check they match.
    const { regoExpiry, inspectionExpiry } = getValues();
    const expiry =
      slot.type === 'REGO' ? regoExpiry : slot.type === 'WOF' || slot.type === 'COF' ? inspectionExpiry : '';
    void uploads.run(
      slot.type,
      async () => file,
      (prepared, onProgress) =>
        uploadVehicleDocument({
          vehicleId: vehicle.id,
          type: slot.type,
          file: prepared,
          expiry: expiry || undefined,
          onProgress,
        }),
    );
  };

  return (
    <li className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-sm text-muted">{DOCUMENT_HINTS[slot.type]}</p>
        </div>
        <RequirementBadge required={slot.required} />
      </div>
      {documents.length > 0 && (
        <ul className="grid gap-2" aria-label={`${label}: uploaded`}>
          {documents.map((document) => (
            <DocumentFile key={document.id} vehicleId={vehicle.id} document={document} />
          ))}
        </ul>
      )}
      {state && <UploadProgress state={state} label={label} />}
      <div>
        <FileButton
          accept="application/pdf,image/*"
          variant={documents.length > 0 ? 'ghost' : 'secondary'}
          size="sm"
          disabled={state !== undefined && state.stage !== 'failed'}
          onFile={onFile}
          aria-label={`${documents.length > 0 ? 'Upload another' : 'Upload'} ${label}`}
        >
          <Upload aria-hidden="true" />
          {documents.length > 0 ? 'Upload another' : 'Upload'}
        </FileButton>
      </div>
    </li>
  );
}

/** Step 2: registration, WOF or CoF, RUC and ownership, with their documents (plan §9, Days 8–11). */
export function DocumentsStep({ vehicle, policies, missing, registerSave }: StepProps) {
  const queryClient = useQueryClient();
  const { save, savingTo, problem } = useStepSave(vehicle, 2);
  const uploads = useUploads<DocumentType>();
  const {
    control,
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isDirty },
  } = useForm<DocumentsValues>({
    resolver: zodResolver(documentsSchema),
    defaultValues: documentsDefaults(vehicle),
    mode: 'onTouched',
  });
  const [needsCof, ownerIsHost] = useWatch({ control, name: ['needsCof', 'ownerIsHost'] });
  const [today] = useState(() => toDateInputValue(new Date()));
  const ruc = needsRuc(vehicle.fuelType);

  const saveTo = (target: StepTarget) =>
    handleSubmit((values) =>
      save(documentsPatch(values, vehicle.fuelType), target, {
        changed: isDirty,
        onFieldErrors: (fields) => placeFieldErrors(fields, documentsFieldFor, setError),
      }),
    )();

  useEffect(() => registerSave(saveTo));

  useEffect(() => {
    const timer = setInterval(
      () => void queryClient.invalidateQueries({ queryKey: hostKeys.vehicle(vehicle.id), exact: true }),
      LINK_REFRESH_MS,
    );
    return () => clearInterval(timer);
  }, [queryClient, vehicle.id]);

  const slots = documentSlots(policies, vehicle, { needsCof, ownerIsHost }, vehicle.fuelType);

  return (
    <StepFrame
      step={2}
      title="Documents"
      description="Our team checks these before your car goes live. Photos of the paperwork are fine, as long as every word is readable."
      onSubmit={(event) => {
        event.preventDefault();
        void saveTo({ step: 3 });
      }}
      onBack={() => void saveTo({ step: 1 })}
      onExit={() => void saveTo('exit')}
      savingTo={savingTo}
      problem={problem}
      missing={missing}
    >
      <FormSection
        title="Registration and warrant"
        description="Guests see that your rego and WOF are current, with the month they expire, but never the dates or your plate."
      >
        <Field label="Registration expires" error={errors.regoExpiry?.message}>
          <Controller
            control={control}
            name="regoExpiry"
            render={({ field }) => (
              <DatePicker
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={today}
                calendarLabel="Choose the registration expiry date"
              />
            )}
          />
        </Field>
        <Field label={needsCof ? 'CoF expires' : 'WOF expires'} error={errors.inspectionExpiry?.message}>
          <Controller
            control={control}
            name="inspectionExpiry"
            render={({ field }) => (
              <DatePicker
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={today}
                calendarLabel={needsCof ? 'Choose the CoF expiry date' : 'Choose the WOF expiry date'}
              />
            )}
          />
        </Field>
        <Checkbox
          label="My car needs a Certificate of Fitness (CoF) instead of a WOF"
          className="sm:col-span-2"
          {...register('needsCof')}
        />
        {ruc && (
          <Field
            label="Road User Charges: licence end reading (km)"
            error={errors.rucValidToKm?.message}
            description="The odometer reading your current RUC licence runs to. We'll remind you as trips bring you close to it."
            className="sm:col-span-2"
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              placeholder="152000"
              leadingIcon={<Gauge />}
              {...register('rucValidToKm')}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Ownership" columns={1}>
        <Controller
          control={control}
          name="ownerIsHost"
          render={({ field }) => (
            <Switch
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              label="I'm the registered owner"
              description={
                field.value
                  ? 'Your name is on the registration.'
                  : 'Someone else owns it, such as family or your company. Upload their written consent below.'
              }
            />
          )}
        />
      </FormSection>

      <section aria-labelledby="documents-uploads" className="grid gap-4">
        <div>
          <h3 id="documents-uploads" className="text-base font-semibold text-ink">
            Upload your documents
          </h3>
          <p className="mt-1 text-sm text-muted">
            PDFs or photos, up to 15 MB each. They stay private: only you and our team can open them.
          </p>
        </div>
        <ul className="grid gap-3">
          {slots.map((slot) => (
            <DocumentRow
              key={slot.type}
              vehicle={vehicle}
              slot={slot}
              uploads={uploads}
              getValues={getValues}
            />
          ))}
        </ul>
      </section>
    </StepFrame>
  );
}
