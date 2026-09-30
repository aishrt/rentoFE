import { zodResolver } from '@hookform/resolvers/zod';
import { Armchair, CarFront, Cog, DoorOpen, Fuel, Gauge } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { VehiclePatch } from '@/api/types';
import { ChoiceCards } from './choice-cards';
import {
  POPULAR_MAKES,
  bodyTypeOptions,
  changedKeyDetails,
  countOptions,
  detailsDefaults,
  detailsFieldFor,
  detailsPatch,
  detailsSchema,
  fuelTypeOptions,
  transmissionChoices,
  type DetailsValues,
} from './details-form';
import { FeatureChips } from './feature-chips';
import { FormSection } from './form-section';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { Textarea } from './textarea';
import { placeFieldErrors, useStepSave, type StepTarget } from './use-step-save';
import { hasBattery, isLive } from './vehicle-labels';

/** Step 1: what the car is (plan §9, Days 8–11), with its extras for the search filters. */
export function DetailsStep({ vehicle, policies, missing, registerSave }: StepProps) {
  const { save, savingTo, problem } = useStepSave(vehicle, 1);
  const featuresLabelId = useId();
  const [confirm, setConfirm] = useState<{
    patch: VehiclePatch;
    target: StepTarget;
    changes: string[];
  } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: detailsDefaults(vehicle),
    mode: 'onTouched',
  });
  const [noVin, fuelType] = useWatch({ control, name: ['noVin', 'fuelType'] });

  const send = (patch: VehiclePatch, target: StepTarget) =>
    save(patch, target, {
      changed: isDirty,
      onFieldErrors: (fields) => placeFieldErrors(fields, detailsFieldFor, setError),
    });

  const saveTo = (target: StepTarget) =>
    handleSubmit((values) => {
      const patch = detailsPatch(values);
      const changes = isLive(vehicle.status) ? changedKeyDetails(vehicle, patch) : [];
      // A new plate, VIN, chassis number, make, model or year sends a live listing back for review.
      if (changes.length > 0) setConfirm({ patch, target, changes });
      else return send(patch, target);
    })();

  useEffect(() => registerSave(saveTo));

  const engine = fuelType !== 'EV';
  const battery = hasBattery(fuelType);

  return (
    <StepFrame
      step={1}
      title="Tell us about your car"
      description="Guests search and compare on these details, so accurate ones mean better matches."
      onSubmit={(event) => {
        event.preventDefault();
        void saveTo({ step: 2 });
      }}
      onExit={() => void saveTo('exit')}
      savingTo={savingTo}
      problem={problem}
      missing={missing}
    >
      <FormSection
        title="Registration"
        description="Your number plate stays private: guests see it only once their booking is confirmed."
      >
        <Field label="Number plate" error={errors.regoPlate?.message}>
          <Input
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC123"
            maxLength={8}
            leadingIcon={<CarFront />}
            className="uppercase"
            {...register('regoPlate')}
          />
        </Field>
        {noVin ? (
          <Field
            label="Chassis number"
            error={errors.chassisNo?.message}
            description="On imports it's on the rego paperwork and a plate in the engine bay."
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="uppercase"
              {...register('chassisNo')}
            />
          </Field>
        ) : (
          <Field
            label="VIN"
            error={errors.vin?.message}
            description="17 characters, at the bottom of the windscreen on the driver's side, or on your rego."
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={17}
              className="uppercase tracking-wide"
              {...register('vin')}
            />
          </Field>
        )}
        <Checkbox
          label="My car is an import without a VIN"
          className="sm:col-span-2"
          {...register('noVin')}
        />
      </FormSection>

      <FormSection title="Make and model">
        <Field label="Make" error={errors.make?.message}>
          <Controller
            control={control}
            name="make"
            render={({ field }) => (
              <Combobox
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                options={POPULAR_MAKES}
                listLabel="Popular makes"
                placeholder="Toyota"
              />
            )}
          />
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <Input autoComplete="off" placeholder="Corolla" {...register('model')} />
        </Field>
        <Field label="Year" error={errors.year?.message}>
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="2021"
            maxLength={4}
            {...register('year')}
          />
        </Field>
        <Field
          label="Variant"
          error={errors.variant?.message}
          description="Optional, e.g. GX Hybrid or Limited."
        >
          <Input autoComplete="off" {...register('variant')} />
        </Field>
      </FormSection>

      <FormSection title="Body and drive">
        <Field label="Body type" error={errors.bodyType?.message}>
          <Controller
            control={control}
            name="bodyType"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={bodyTypeOptions}
                icon={<CarFront />}
                listLabel="Body types"
              />
            )}
          />
        </Field>
        <Field label="Fuel type" error={errors.fuelType?.message}>
          <Controller
            control={control}
            name="fuelType"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={fuelTypeOptions}
                icon={<Fuel />}
                listLabel="Fuel types"
              />
            )}
          />
        </Field>
        <Controller
          control={control}
          name="transmission"
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend="Transmission"
              name={field.name}
              value={field.value as 'AUTOMATIC' | 'MANUAL' | ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={transmissionChoices}
              compact
              error={errors.transmission?.message}
              className="sm:col-span-2"
            />
          )}
        />
        <Field label="Seats" error={errors.seats?.message}>
          <Controller
            control={control}
            name="seats"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={countOptions(policies.vehicles.seats)}
                icon={<Armchair />}
                listLabel="Seats"
              />
            )}
          />
        </Field>
        <Field label="Doors" error={errors.doors?.message}>
          <Controller
            control={control}
            name="doors"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={countOptions(policies.vehicles.doors)}
                icon={<DoorOpen />}
                listLabel="Doors"
              />
            )}
          />
        </Field>
      </FormSection>

      <FormSection
        title={battery && engine ? 'Engine and battery' : battery ? 'Battery' : 'Engine'}
        description="Optional, but guests like to know."
      >
        {engine && (
          <>
            <Field label="Engine size (cc)" error={errors.engineCc?.message}>
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="1800"
                leadingIcon={<Cog />}
                {...register('engineCc')}
              />
            </Field>
            <Field label="Cylinders" error={errors.cylinders?.message}>
              <Input inputMode="numeric" autoComplete="off" placeholder="4" {...register('cylinders')} />
            </Field>
          </>
        )}
        {battery && (
          <>
            <Field label="Range on a full charge (km)" error={errors.evRangeKm?.message}>
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="420"
                leadingIcon={<Gauge />}
                {...register('evRangeKm')}
              />
            </Field>
            <Field label="Battery size (kWh)" error={errors.batteryKwh?.message}>
              <Input inputMode="decimal" autoComplete="off" placeholder="64" {...register('batteryKwh')} />
            </Field>
          </>
        )}
      </FormSection>

      <FormSection
        title="Features and extras"
        description="Guests filter on these, so add everything your car has."
      >
        <div className="grid gap-2 sm:col-span-2">
          <p id={featuresLabelId} className="text-sm font-medium text-ink">
            Key features
          </p>
          <Controller
            control={control}
            name="features"
            render={({ field }) => (
              <FeatureChips
                value={field.value}
                onChange={field.onChange}
                labelId={featuresLabelId}
                error={errors.features?.message}
              />
            )}
          />
        </div>
        <div className="grid gap-2 divide-y divide-line rounded-card border border-line bg-surface px-4 sm:col-span-2">
          <Controller
            control={control}
            name="petFriendly"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Pet friendly"
                description="Guests may bring a dog or cat, and clean up after them."
                className="py-2"
              />
            )}
          />
          <Controller
            control={control}
            name="childSeat"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Child seat available"
                description="You can put a child seat in the car when a guest asks."
                className="py-2"
              />
            )}
          />
        </div>
      </FormSection>

      <FormSection
        title="Existing damage"
        description="Note any dents, scratches or chips now, so no one is charged for them later. You can photograph them in step 3."
      >
        <Field label="Damage notes" error={errors.damageNotes?.message} className="sm:col-span-2">
          <Textarea
            rows={3}
            placeholder="Small scratch on the rear bumper, left side."
            {...register('damageNotes')}
          />
        </Field>
      </FormSection>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        {confirm && (
          <DialogContent
            title="Send your listing back for review?"
            description={`You changed the ${confirm.changes.join(', ')}. Our team checks these again, and your car is hidden from search until it's approved.`}
          >
            <div className="flex flex-wrap justify-end gap-3">
              <DialogClose asChild>
                <Button variant="secondary">Keep editing</Button>
              </DialogClose>
              <Button
                loading={savingTo !== null}
                onClick={async () => {
                  await send(confirm.patch, confirm.target);
                  setConfirm(null);
                }}
              >
                Save and send for review
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </StepFrame>
  );
}
