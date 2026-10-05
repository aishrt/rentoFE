import { zodResolver } from '@hookform/resolvers/zod';
import { IdCard } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { DriverLicenceInput } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { applyFieldErrors, formErrorMessage } from '@/features/account/form-errors';
import { useSaveLicence } from './booking-api';
import { LICENCE_CLASS_LABELS, nzWallClockParts, type LicenceClass } from './booking-format';
import { DatePartsField } from './date-parts-field';

const CLASS_OPTIONS = (Object.keys(LICENCE_CLASS_LABELS) as LicenceClass[]).map((value) => ({
  value,
  label: LICENCE_CLASS_LABELS[value],
}));

const PROOF_OPTIONS = [
  { value: 'IDP', label: 'International Driving Permit' },
  { value: 'APPROVED_TRANSLATION', label: 'Approved translation' },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether "YYYY-MM-DD" is a real day on the calendar. */
function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * The same rules as the API (plan §3, Validation rules: booking): NZ licences have 2 letters and 6 digits and
 * a 3-digit version; an overseas licence that isn't in English needs an IDP or an approved translation.
 */
const licenceSchema = z
  .object({
    class: z.enum(['NZ_FULL', 'NZ_RESTRICTED', 'NZ_LEARNER', 'OVERSEAS']),
    number: z.string().trim(),
    version: z.string().trim(),
    country: z.string().trim(),
    notInEnglish: z.boolean(),
    englishProof: z.enum(['', 'IDP', 'APPROVED_TRANSLATION']),
    issuedAt: z.string(),
    expiry: z.string(),
    dob: z.string(),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const number = value.number.toUpperCase().replace(/\s+/g, '');
    const today = nzWallClockParts(new Date()).date;
    if (value.class === 'OVERSEAS') {
      if (!/^[A-Z0-9-]{4,20}$/.test(number))
        issue('number', 'Enter the licence number as it appears on the card');
      if (value.country.length < 2) issue('country', 'Enter the country that issued your licence');
      if (value.notInEnglish && !value.englishProof)
        issue('englishProof', 'Choose what you’ll bring with it');
    } else {
      if (!/^[A-Z]{2}\d{6}$/.test(number)) issue('number', 'NZ licence numbers have 2 letters and 6 digits');
      if (!/^\d{3}$/.test(value.version)) issue('version', 'Enter the 3-digit version number');
    }
    if (!isRealDate(value.dob)) issue('dob', 'Enter your date of birth');
    if (!isRealDate(value.issuedAt)) issue('issuedAt', 'Enter the date your licence was first issued');
    else if (value.issuedAt > today) issue('issuedAt', 'The issue date can’t be in the future');
    else if (isRealDate(value.dob) && value.dob > value.issuedAt) issue('issuedAt', 'Check the issue date');
    if (!isRealDate(value.expiry)) issue('expiry', 'Enter the expiry date');
    else if (value.expiry <= today) issue('expiry', 'This licence has expired');
  });

type LicenceValues = z.infer<typeof licenceSchema>;

const FIELDS = [
  'class',
  'number',
  'version',
  'country',
  'englishProof',
  'issuedAt',
  'expiry',
  'dob',
] as const;

/**
 * Driver licence details at checkout (plan §9, Days 11–13: "mobile SMS code and licence details now; the
 * identity check is connected on Days 19–20"). The number is encrypted by the API, and support staff check
 * the details until the identity check arrives. Saved details are never shown back in full, so changing
 * them means typing them again.
 */
export function LicenceForm({ onSaved, hasLicence }: { onSaved: () => void; hasLicence: boolean }) {
  const save = useSaveLicence();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LicenceValues>({
    resolver: zodResolver(licenceSchema),
    defaultValues: {
      class: 'NZ_FULL',
      number: '',
      version: '',
      country: '',
      notInEnglish: false,
      englishProof: '',
      issuedAt: '',
      expiry: '',
      dob: '',
    },
    mode: 'onTouched',
  });
  const licenceClass = useWatch({ control, name: 'class' });
  const notInEnglish = useWatch({ control, name: 'notInEnglish' });
  const overseas = licenceClass === 'OVERSEAS';

  const onSubmit = handleSubmit(async (values) => {
    const input: DriverLicenceInput = {
      class: values.class,
      number: values.number.toUpperCase().replace(/\s+/g, ''),
      country: overseas ? values.country : 'New Zealand',
      notInEnglish: overseas && values.notInEnglish,
      issuedAt: values.issuedAt,
      expiry: values.expiry,
      dob: values.dob,
      ...(!overseas && { version: values.version }),
      ...(overseas && values.notInEnglish && values.englishProof && { englishProof: values.englishProof }),
    };
    try {
      await save.mutateAsync(input);
      onSaved();
    } catch (error) {
      applyFieldErrors(error, FIELDS, setError);
    }
  });
  const serverError = save.isError ? formErrorMessage(save.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Driver licence details">
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Licence type" error={errors.class?.message}>
            <Controller
              control={control}
              name="class"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={CLASS_OPTIONS}
                  icon={<IdCard />}
                  listLabel="Licence types"
                />
              )}
            />
          </Field>
          {overseas && (
            <Field label="Issued in" error={errors.country?.message}>
              <Input autoComplete="country-name" placeholder="Australia" {...register('country')} />
            </Field>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field
            label="Licence number"
            error={errors.number?.message}
            description={overseas ? 'As it appears on the card.' : 'Field 5a on the card, like AB123456.'}
          >
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              {...register('number')}
            />
          </Field>
          {!overseas && (
            <Field label="Version" error={errors.version?.message} description="Field 5b, 3 digits.">
              <Input inputMode="numeric" maxLength={3} autoComplete="off" {...register('version')} />
            </Field>
          )}
        </div>
        {overseas && (
          <div className="grid gap-4">
            <Checkbox label="My licence isn’t in English" {...register('notInEnglish')} />
            {notInEnglish && (
              <Field
                label="What you’ll bring with it"
                error={errors.englishProof?.message}
                description="Carry it with your licence whenever you drive in New Zealand."
              >
                <Controller
                  control={control}
                  name="englishProof"
                  render={({ field }) => (
                    <Select
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={PROOF_OPTIONS}
                      icon={<IdCard />}
                      placeholder="Choose one"
                      listLabel="English proof"
                    />
                  )}
                />
              </Field>
            )}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="issuedAt"
            render={({ field }) => (
              <DatePartsField
                ref={field.ref}
                legend="First issued"
                description="When you first held this licence, not when the card was renewed."
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.issuedAt?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="expiry"
            render={({ field }) => (
              <DatePartsField
                ref={field.ref}
                legend="Expires"
                description={overseas ? undefined : 'Field 4b on the card.'}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.expiry?.message}
              />
            )}
          />
        </div>
        <Controller
          control={control}
          name="dob"
          render={({ field }) => (
            <DatePartsField
              ref={field.ref}
              legend="Date of birth"
              autoComplete="bday"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.dob?.message}
            />
          )}
        />
        <p className="text-sm text-muted">
          Your licence number is encrypted, and your host never sees it. Our team checks the details before
          your trip.
        </p>
        <div>
          <Button type="submit" size="lg" loading={save.isPending} className="max-sm:w-full">
            {hasLicence ? 'Update licence details' : 'Save licence details'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
