import { Controller, useFormContext } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Map as MapIcon } from 'lucide-react';
import { regionOptions, type AddressValues, type DeliveryValues } from './delivery-form';
import { addressFromPlace, type AddressFill } from './place-choice';
import { PlacePicker } from './place-picker';

type AddressName = 'pickup.address' | `custom.${number}.address`;

/**
 * A structured NZ address (plan §3): found from Google Places or our suburbs and towns for its coordinates,
 * which fills in the unit, number, street, suburb, town or city, region and postcode. Each stays editable.
 */
export function AddressFields({ name }: { name: AddressName }) {
  const { register, control, setValue, getFieldState, formState } = useFormContext<DeliveryValues>();
  const error = (part: keyof AddressValues) => getFieldState(`${name}.${part}`, formState).error?.message;

  return (
    <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-6">
      <Field
        label="Address"
        error={error('place')}
        description="Choose it from the list to fill in the rest. Guests see the suburb before they book, never the street."
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
                const fill = addressFromPlace(place);
                (Object.keys(fill) as (keyof AddressFill)[]).forEach((part) =>
                  setValue(`${name}.${part}`, fill[part] ?? '', { shouldDirty: true, shouldValidate: true }),
                );
              }}
              onBlur={field.onBlur}
              types={['ADDRESS', 'SUBURB', 'CITY']}
              listLabel="Popular places"
              placeholder="Start typing, e.g. 12 Ponsonby Road"
            />
          )}
        />
      </Field>
      <Field label="Unit (optional)" error={error('unit')} className="sm:col-span-2">
        <Input autoComplete="off" placeholder="2B" {...register(`${name}.unit`)} />
      </Field>
      <Field label="Street number" error={error('streetNumber')} className="sm:col-span-2">
        <Input autoComplete="off" inputMode="text" placeholder="12" {...register(`${name}.streetNumber`)} />
      </Field>
      <Field label="Street" error={error('street')} className="col-span-2 sm:col-span-6">
        <Input autoComplete="off" placeholder="Queen Street" {...register(`${name}.street`)} />
      </Field>
      <Field label="Suburb (optional)" error={error('suburb')} className="sm:col-span-3">
        <Input autoComplete="off" placeholder="Ponsonby" {...register(`${name}.suburb`)} />
      </Field>
      <Field label="Town or city" error={error('city')} className="sm:col-span-3">
        <Input autoComplete="off" placeholder="Auckland" {...register(`${name}.city`)} />
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
