import { CalendarDays, Clock, MessageSquareText, Sparkles, Timer, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { bufferOptions, noticeOptions } from './availability-options';
import { ChoiceCards } from './choice-cards';
import { FormSection } from './form-section';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { fieldMap, placeFieldErrors, useStepSave, type StepTarget } from './use-step-save';

interface AvailabilityValues {
  minNoticeHours: string;
  bufferHours: string;
  booking: 'instant' | 'request';
}

const availabilityFieldFor = fieldMap<keyof AvailabilityValues>({
  'rules.minNoticeHours': 'minNoticeHours',
  'rules.bufferHours': 'bufferHours',
  'rules.instantBook': 'booking',
});

/**
 * Step 5: when the car can be booked (plan §9, Days 8–11): minimum notice, preparation time between trips,
 * and Instant Book on or off. Blocked dates and weekly availability live on the car's calendar.
 */
export function AvailabilityStep({ vehicle, missing, registerSave }: StepProps) {
  const { save, savingTo, problem } = useStepSave(vehicle, 5);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<AvailabilityValues>({
    defaultValues: {
      minNoticeHours: String(vehicle.rules.minNoticeHours),
      bufferHours: String(vehicle.rules.bufferHours),
      booking: vehicle.rules.instantBook ? 'instant' : 'request',
    },
  });

  const saveTo = (target: StepTarget) =>
    handleSubmit((values) =>
      save(
        {
          rules: {
            minNoticeHours: Number(values.minNoticeHours),
            bufferHours: Number(values.bufferHours),
            instantBook: values.booking === 'instant',
          },
        },
        target,
        {
          changed: isDirty,
          onFieldErrors: (fields) => placeFieldErrors(fields, availabilityFieldFor, setError),
        },
      ),
    )();

  useEffect(() => registerSave(saveTo));

  return (
    <StepFrame
      step={5}
      title="Availability"
      description="When guests can book, and how. You can change these any time."
      onSubmit={(event) => {
        event.preventDefault();
        void saveTo({ step: 6 });
      }}
      onBack={() => void saveTo({ step: 4 })}
      onExit={() => void saveTo('exit')}
      savingTo={savingTo}
      problem={problem}
      missing={missing}
    >
      <FormSection title="How guests book" columns={1}>
        <Controller
          control={control}
          name="booking"
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend="Instant Book"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.booking?.message}
              choices={[
                {
                  value: 'instant',
                  label: 'Instant Book on',
                  icon: <Zap />,
                  description:
                    'Guests who meet your rules book straight away, with no waiting. Your car shows the Instant Book badge, which guests can filter for.',
                },
                {
                  value: 'request',
                  label: 'Instant Book off',
                  icon: <MessageSquareText />,
                  description:
                    "Every booking is a request you accept or decline within 24 hours. If you don't answer in time, it expires.",
                },
              ]}
            />
          )}
        />
      </FormSection>

      <FormSection title="Notice and preparation">
        <Field
          label="Minimum notice"
          error={errors.minNoticeHours?.message}
          description="How long before a trip starts guests must book."
        >
          <Controller
            control={control}
            name="minNoticeHours"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={noticeOptions(vehicle.rules.minNoticeHours)}
                icon={<Timer />}
                listLabel="Minimum notice"
              />
            )}
          />
        </Field>
        <Field
          label="Preparation time between trips"
          error={errors.bufferHours?.message}
          description="Kept free after each trip, to clean and refuel."
        >
          <Controller
            control={control}
            name="bufferHours"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={bufferOptions(vehicle.rules.bufferHours)}
                icon={<Clock />}
                listLabel="Preparation time"
              />
            )}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Blocked dates and weekly availability"
        description="Block the days you need the car, or times it's never free, such as weekdays while you drive to work. Booked trips appear there automatically."
        columns={1}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void saveTo('calendar')}
            loading={savingTo === 'calendar'}
          >
            <CalendarDays aria-hidden="true" />
            Save and open the calendar
          </Button>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            Your car is available whenever it isn't blocked.
          </p>
        </div>
      </FormSection>
    </StepFrame>
  );
}
