import { Controller, useFormContext } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Map as MapIcon } from 'lucide-react';
import { regionOptions, type DeliveryValues } from './delivery-form';
import { addressPartsOf } from './place-choice';
import { PlacePicker } from './place-picker';

type AddressName = 'pickup.address' | `custom.${number}.address`;

/**
 * A structured NZ address (plan §3): unit, number and street typed, then the suburb or town chosen from our
 * places for its coordinates, with the region filled in from it, and the postcode.
 */
export function AddressFields({ name }: { name: AddressName }) {
  const { register, control, setValue, getFieldState, formState } = useFormContext<DeliveryValues>();
  const error = (part: 'unit' | 'streetNumber' | 'street' | 'place' | 'region' | 'postcode') =>
    getFieldState(`${name}.${part}`, formState).error?.message;

  return (
    <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-6">
      <Field label="Unit (optional)" error={error('unit')} className="sm:col-span-2">
        <Input autoComplete="off" placeholder="2B" {...register(`${name}.unit`)} />
      </Field>
      <Field label="Street number" error={error('streetNumber')} className="sm:col-span-2">
        <Input autoComplete="off" inputMode="text" placeholder="12" {...register(`${name}.streetNumber`)} />
      </Field>
      <Field label="Street" error={error('street')} className="col-span-2 sm:col-span-6">
        <Input autoComplete="off" placeholder="Queen Street" {...register(`${name}.street`)} />
      </Field>
      <Field
        label="Suburb or town"
        error={error('place')}
        description="Choose it from the list. Guests see this area before they book, never the street."
        className="col-span-2 sm:col-span-6"
      >
        <Controller
          control={control}
          name={`${name}.place`}
          render={({ field }) => (
            <PlacePicker
              ref={field.ref}
              name={field.name}
              value={field.value}
              onValueChange={(place) => {
                field.onChange(place);
                const { region } = addressPartsOf(place);
                if (place.id && region)
                  setValue(`${name}.region`, region, { shouldDirty: true, shouldValidate: true });
              }}
              onBlur={field.onBlur}
              types={['SUBURB', 'CITY']}
              listLabel="Popular places"
              placeholder="Start typing, e.g. Ponsonby"
            />
          )}
        />
      </Field>
      <Field label="Region" error={error('region')} className="sm:col-span-4">
        <Controller
          control={control}
          name={`${name}.region`}
          render={({ field }) => (
            <Select
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={regionOptions}
              icon={<MapIcon />}
              listLabel="Regions"
            />
          )}
        />
      </Field>
      <Field label="Postcode" error={error('postcode')} className="sm:col-span-2">
        <Input
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="1010"
          {...register(`${name}.postcode`)}
        />
      </Field>
    </div>
  );
}
