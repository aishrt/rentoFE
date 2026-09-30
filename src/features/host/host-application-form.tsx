import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ReceiptText } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { HostProfile } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { applyFieldErrors, formErrorMessage } from '@/features/account/form-errors';
import { applicationSchema, type ApplicationValues } from './application-schema';
import { applyToHostRequest } from './host-api';
import { Textarea } from './textarea';

const FIELDS = ['bio', 'gstNumber', 'acceptHostAgreement'] as const;

interface HostApplicationFormProps {
  /** Whether the mobile is verified yet; the API refuses the application without it. */
  phoneVerified: boolean;
  /** Points the Host back at the mobile step. */
  onPhoneRequired: () => void;
  onApplied: (host: HostProfile) => void;
}

/** The Host application (plan §9, Days 8–11): a short profile, GST status and the Host Agreement. */
export function HostApplicationForm({ phoneVerified, onPhoneRequired, onApplied }: HostApplicationFormProps) {
  const apply = useMutation({ mutationFn: applyToHostRequest });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { bio: '', gstRegistered: false, gstNumber: '', acceptHostAgreement: false },
    mode: 'onTouched',
  });
  const gstRegistered = useWatch({ control, name: 'gstRegistered' });

  const onSubmit = handleSubmit(async (values) => {
    if (!phoneVerified) {
      onPhoneRequired();
      return;
    }
    try {
      const host = await apply.mutateAsync({
        ...(values.bio && { bio: values.bio }),
        gstRegistered: values.gstRegistered,
        ...(values.gstRegistered && { gstNumber: values.gstNumber }),
        acceptHostAgreement: true,
      });
      onApplied(host);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PHONE_NOT_VERIFIED') onPhoneRequired();
      else applyFieldErrors(error, FIELDS, setError);
    }
  });

  const serverError =
    apply.isError && !(apply.error instanceof ApiError && apply.error.code === 'PHONE_NOT_VERIFIED')
      ? apply.error instanceof ApiError && apply.error.code === 'HOST_SUSPENDED'
        ? apply.error.message
        : formErrorMessage(apply.error)
      : null;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Your Host application">
      <fieldset disabled={apply.isPending} className="grid min-w-0 gap-6">
        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}

        <Field
          label="About you"
          error={errors.bio?.message}
          description="Optional. A few friendly lines for guests: who you are, and how you look after your car. It shows on your listings."
        >
          <Textarea
            rows={4}
            maxLength={1100}
            placeholder="Kia ora! I'm Aroha. My Corolla is serviced every six months and loves a road trip."
            {...register('bio')}
          />
        </Field>

        <div className="grid gap-4 rounded-card border border-line bg-canvas/60 p-4 sm:p-5">
          <Controller
            control={control}
            name="gstRegistered"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                label="I'm registered for GST"
                description="So your earnings statements and our commission invoices show GST correctly."
              />
            )}
          />
          {gstRegistered && (
            <Field label="GST number" error={errors.gstNumber?.message} className="animate-fade-up">
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="123-456-789"
                leadingIcon={<ReceiptText />}
                {...register('gstNumber')}
              />
            </Field>
          )}
        </div>

        <Checkbox
          label={
            <>
              I've read and agree to the{' '}
              <Link
                to="/host-agreement"
                target="_blank"
                rel="noopener"
                className="link-underline font-medium text-primary"
              >
                Host Agreement
              </Link>
              , including looking after guests' safety and keeping my car's rego, WOF and insurance current.
            </>
          }
          error={errors.acceptHostAgreement?.message}
          {...register('acceptHostAgreement')}
        />

        <Button type="submit" size="lg" loading={apply.isPending} className="sm:justify-self-start">
          {apply.isPending ? 'Sending your application…' : 'Submit application'}
        </Button>
      </fieldset>
    </form>
  );
}
