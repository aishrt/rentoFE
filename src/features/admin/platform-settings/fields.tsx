import type { ReactNode } from 'react';
import { Controller, useFormContext, type FieldValues } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/* The fields of the Platform settings tab, wired to the card's form (react-hook-form context). */

/** A unit inside a number box on the right, as in the listing editor's pricing step. */
export function Unit({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="pointer-events-none flex items-center pr-3 text-sm text-muted">
      {children}
    </span>
  );
}

const Dollar = () => <span className="text-base text-muted">$</span>;

/** A text box for a number, with its unit beside it. */
export function NumberField({
  name,
  label,
  description,
  unit,
  money,
}: {
  name: string;
  label: string;
  description?: ReactNode;
  /** Shown inside the box on the right, e.g. "%" or "days". */
  unit?: string;
  /** A dollar sign inside the box on the left. */
  money?: boolean;
}) {
  const { register, getFieldState, formState } = useFormContext<FieldValues>();
  const { error } = getFieldState(name, formState);
  return (
    <Field label={label} error={error?.message} description={description}>
      <Input
        inputMode="decimal"
        autoComplete="off"
        leadingIcon={money ? <Dollar /> : undefined}
        trailing={unit ? <Unit>{unit}</Unit> : undefined}
        // Room for a word such as "minutes" beside the number, not just a "%".
        className={unit && unit.length > 1 ? 'pr-20' : undefined}
        {...register(name)}
      />
    </Field>
  );
}

export function TextInputField({
  name,
  label,
  description,
  type = 'text',
}: {
  name: string;
  label: string;
  description?: ReactNode;
  type?: 'text' | 'email' | 'tel';
}) {
  const { register, getFieldState, formState } = useFormContext<FieldValues>();
  const { error } = getFieldState(name, formState);
  return (
    <Field label={label} error={error?.message} description={description}>
      <Input type={type} autoComplete="off" spellCheck={type === 'text'} {...register(name)} />
    </Field>
  );
}

/** An on/off setting, saved with the rest of its card. */
export function SwitchField({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description?: ReactNode;
}) {
  const { control } = useFormContext<FieldValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          label={label}
          description={description}
        />
      )}
    />
  );
}
