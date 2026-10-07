import { zodResolver } from '@hookform/resolvers/zod';
import { Plane, Plus, Truck, X } from 'lucide-react';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Controller, FormProvider, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AddressFields } from './address-fields';
import {
  deliveryDefaults,
  deliveryFieldFor,
  deliveryPatch,
  deliverySchema,
  emptyAddress,
  type DeliveryValues,
} from './delivery-form';
import { FormSection } from './form-section';
import { emptyPlace } from './place-choice';
import { PlacePicker } from './place-picker';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { Textarea } from './textarea';
import { placeFieldErrors, useStepSave, type StepTarget } from './use-step-save';
import { isSubmittable } from './vehicle-labels';

const Dollar = () => <span className="text-base text-muted">$</span>;

function FeeInput(props: ComponentProps<typeof Input>) {
  return <Input inputMode="decimal" autoComplete="off" placeholder="0" leadingIcon={<Dollar />} {...props} />;
}

/** A removable card for one airport or delivery point. */
function OptionCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <li className="grid animate-fade-up gap-5 rounded-card border border-line bg-canvas/50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">{title}</p>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${title}`}>
          <X aria-hidden="true" />
          Remove
        </Button>
      </div>
      {children}
    </li>
  );
}

function Airports({ control }: { control: Control<DeliveryValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'airports', keyName: 'key' });
  return (
    <FormSection
      title="Airport delivery"
      description="Meet guests at the airport. Your car also shows up when guests search for that airport."
      columns={1}
    >
      {fields.length > 0 && (
        <ul className="grid gap-4">
          {fields.map((item, index) => (
            <OptionCard key={item.key} title={`Airport ${index + 1}`} onRemove={() => remove(index)}>
              <Controller
                control={control}
                name={`airports.${index}.airport`}
                render={({ field, fieldState }) => (
                  <Field label="Airport" error={fieldState.error?.message}>
                    <PlacePicker
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      types={['AIRPORT']}
                      listLabel="Airports"
                      placeholder="Start typing, e.g. Auckland Airport"
                      leadingIcon={<Plane />}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name={`airports.${index}.fee`}
                render={({ field, fieldState }) => (
                  <Field
                    label="Delivery fee"
                    error={fieldState.error?.message}
                    description="Leave empty for free."
                    className="max-w-xs"
                  >
                    <FeeInput {...field} />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name={`airports.${index}.instructions`}
                render={({ field, fieldState }) => (
                  <Field
                    label="Where to meet"
                    error={fieldState.error?.message}
                    description="Shown to the guest once their booking is confirmed."
                  >
                    <Textarea rows={2} placeholder="Short-term car park, level 1, row C." {...field} />
                  </Field>
                )}
              />
            </OptionCard>
          ))}
        </ul>
      )}
      <div>
        <Button
          variant="secondary"
          onClick={() => append({ airport: emptyPlace, fee: '', instructions: '' })}
        >
          <Plus aria-hidden="true" />
          {fields.length > 0 ? 'Add another airport' : 'Add an airport'}
        </Button>
      </div>
    </FormSection>
  );
}

function CustomPoints({ control }: { control: Control<DeliveryValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'custom', keyName: 'key' });
  return (
    <FormSection
      title="Custom delivery points"
      description="Places you're happy to meet guests, such as a ferry terminal, a hotel or the train station."
      columns={1}
    >
      {fields.length > 0 && (
        <ul className="grid gap-4">
          {fields.map((item, index) => (
            <OptionCard key={item.key} title={`Delivery point ${index + 1}`} onRemove={() => remove(index)}>
              <Controller
                control={control}
                name={`custom.${index}.label`}
                render={({ field, fieldState }) => (
                  <Field label="Name" error={fieldState.error?.message}>
                    <Input autoComplete="off" placeholder="Ferry terminal" {...field} />
                  </Field>
                )}
              />
              <AddressFields name={`custom.${index}.address`} />
              <Controller
                control={control}
                name={`custom.${index}.fee`}
                render={({ field, fieldState }) => (
                  <Field
                    label="Delivery fee"
                    error={fieldState.error?.message}
                    description="Leave empty for free."
                    className="max-w-xs"
                  >
                    <FeeInput {...field} />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name={`custom.${index}.instructions`}
                render={({ field, fieldState }) => (
                  <Field
                    label="Where to meet"
                    error={fieldState.error?.message}
                    description="Optional. Shown once a booking is confirmed."
                  >
                    <Textarea rows={2} {...field} />
                  </Field>
                )}
              />
            </OptionCard>
          ))}
        </ul>
      )}
      <div>
        <Button
          variant="secondary"
          onClick={() => append({ label: '', address: emptyAddress, fee: '', instructions: '' })}
        >
          <Plus aria-hidden="true" />
          Add a delivery point
        </Button>
      </div>
    </FormSection>
  );
}

/** Step 6: where guests collect the car, and how it can come to them (plan §9, Days 8–11). */
export function DeliveryStep({ vehicle, missing, registerSave }: StepProps) {
  const { save, savingTo, problem } = useStepSave(vehicle, 6);
  const form = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: deliveryDefaults(vehicle),
    mode: 'onTouched',
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = form;
  const deliveryEnabled = useWatch({ control, name: 'delivery.enabled' });

  const saveTo = (target: StepTarget) =>
    handleSubmit((values) => {
      const { options, sources } = deliveryPatch(values);
      return save(options ? { deliveryOptions: options } : {}, target, {
        changed: isDirty && options !== undefined,
        onFieldErrors: (fields) => placeFieldErrors(fields, deliveryFieldFor(sources), setError),
      });
    })();

  useEffect(() => registerSave(saveTo, isDirty));

  return (
    <FormProvider {...form}>
      <StepFrame
        step={6}
        title="Pickup and delivery"
        description="Where guests collect your car, and any ways you'll bring it to them."
        onSubmit={(event) => {
          event.preventDefault();
          void saveTo(isSubmittable(vehicle.status) ? 'review' : 'overview');
        }}
        onBack={() => void saveTo({ step: 5 })}
        onExit={() => void saveTo('exit')}
        continueLabel={isSubmittable(vehicle.status) ? 'Review' : 'Done'}
        savingTo={savingTo}
        problem={problem}
        missing={missing}
      >
        <FormSection
          title="Pickup location"
          description="Where guests collect the car. Its suburb is where guests find it in search; the full address is shared once a booking is confirmed."
          columns={1}
        >
          <AddressFields name="pickup.address" />
          <Field
            label="Collection instructions"
            error={errors.pickup?.instructions?.message}
            description="Optional. For example: parked in the driveway, and where to find the key."
          >
            <Textarea rows={3} {...register('pickup.instructions')} />
          </Field>
        </FormSection>

        <Airports control={control} />

        <FormSection
          title="Delivery to the guest"
          description="Bring the car to a guest's address, within a distance you choose."
        >
          <Controller
            control={control}
            name="delivery.enabled"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                label="I'll deliver to guests' addresses"
                description="Guests enter where they're staying at checkout."
                className="sm:col-span-2"
              />
            )}
          />
          {deliveryEnabled && (
            <>
              <Field
                label="How far you'll go"
                error={errors.delivery?.radiusKm?.message}
                className="animate-fade-up"
              >
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="15"
                  leadingIcon={<Truck />}
                  trailing={
                    <span
                      aria-hidden="true"
                      className="pointer-events-none flex items-center pr-3 text-sm text-muted"
                    >
                      km
                    </span>
                  }
                  {...register('delivery.radiusKm')}
                />
              </Field>
              <Field
                label="Delivery fee"
                error={errors.delivery?.fee?.message}
                description="Leave empty for free."
                className="animate-fade-up"
              >
                <FeeInput {...register('delivery.fee')} />
              </Field>
            </>
          )}
        </FormSection>

        <CustomPoints control={control} />
      </StepFrame>
    </FormProvider>
  );
}
