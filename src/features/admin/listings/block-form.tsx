import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { BlockInput } from '@/api/types';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from '@/components/ui/toast';
import { addBlockRequest, adminCalendarQueryKey, reviewErrorMessage } from './listing-api';
import { addDaysToValue, formatBlockRange } from './listing-format';

const NOTE_MAX = 200;

const blockSchema = z
  .object({
    wholeDays: z.boolean(),
    startDate: z.string().min(1, 'Choose a date'),
    startTime: z.string(),
    endDate: z.string().min(1, 'Choose a date'),
    endTime: z.string(),
    note: z.string().trim().max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters`),
  })
  .superRefine((values, context) => {
    if (!values.startDate || !values.endDate) return;
    // "2026-10-12T10:00" values sort as text, so they compare without parsing.
    if (values.wholeDays && values.endDate < values.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: "The last day can't be before the first",
      });
    } else if (
      !values.wholeDays &&
      `${values.endDate}T${values.endTime}` <= `${values.startDate}T${values.startTime}`
    ) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'The end needs to be after the start' });
    }
  });

type BlockValues = z.infer<typeof blockSchema>;

/** Whole days end at the start of the day after the last one: the API's end is exclusive. */
function toBlockInput(values: BlockValues): BlockInput {
  const note = values.note.trim() || undefined;
  return values.wholeDays
    ? { start: values.startDate, end: addDaysToValue(values.endDate, 1), note }
    : { start: `${values.startDate}T${values.startTime}`, end: `${values.endDate}T${values.endTime}`, note };
}

/**
 * Staff block a car's dates, for example while an incident is looked into (plan §9, Days 10–11). Times are
 * New Zealand's. The API refuses a block over a trip or a guest's hold (409 BOOKED_DATES).
 */
export function BlockForm({ vehicleId, today }: { vehicleId: string; today: string }) {
  const queryClient = useQueryClient();
  const add = useMutation({ mutationFn: addBlockRequest });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<BlockValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      wholeDays: true,
      startDate: today,
      startTime: '10:00',
      endDate: today,
      endTime: '10:00',
      note: '',
    },
  });
  const wholeDays = useWatch({ control, name: 'wholeDays' });
  const startDate = useWatch({ control, name: 'startDate' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const block = await add.mutateAsync({ id: vehicleId, block: toBlockInput(values) });
      toast('Dates blocked', { description: `${formatBlockRange(block)}. Guests can't book them.` });
      reset({ ...values, note: '' });
      await queryClient.invalidateQueries({ queryKey: adminCalendarQueryKey(vehicleId) });
    } catch (error) {
      // The API names the fields "start" and "end" (and "endAt" when the end is before the start).
      if (error instanceof ApiError && error.fields) {
        const { start, end, endAt } = error.fields;
        if (start) setError('startDate', { message: start }, { shouldFocus: true });
        if (end ?? endAt) setError(wholeDays ? 'endDate' : 'endTime', { message: (end ?? endAt)! });
      }
    }
  });
  const serverError = add.isError ? reviewErrorMessage(add.error) : null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="block-form-heading"
      className="grid gap-4 rounded-control border border-line bg-ink/3 p-4 sm:p-5"
    >
      <div>
        <h3 id="block-form-heading" className="text-sm font-semibold text-ink">
          Block dates
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          New Zealand time. The Host sees the block and your note on their calendar.
        </p>
      </div>

      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}

      <fieldset disabled={add.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">When to block</legend>
        <Checkbox label="Whole days" {...register('wholeDays')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={wholeDays ? undefined : 'grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2'}>
            <Field label={wholeDays ? 'First day' : 'Starts'} error={errors.startDate?.message}>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    ref={field.ref}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      // Keep the end on or after the start, so choosing a later start doesn't need two fixes.
                      if (getValues('endDate') < value) setValue('endDate', value);
                    }}
                    onBlur={field.onBlur}
                    min={today}
                    calendarLabel={wholeDays ? 'Choose the first day' : 'Choose the start date'}
                  />
                )}
              />
            </Field>
            {!wholeDays && (
              <Field label="Start time" error={errors.startTime?.message}>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <TimePicker
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      listLabel="Start times"
                    />
                  )}
                />
              </Field>
            )}
          </div>

          <div className={wholeDays ? undefined : 'grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2'}>
            <Field label={wholeDays ? 'Last day' : 'Ends'} error={errors.endDate?.message}>
              <Controller
                control={control}
                name="endDate"
                render={({ field }) => (
                  <DatePicker
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    min={startDate || today}
                    align="end"
                    calendarLabel={wholeDays ? 'Choose the last day' : 'Choose the end date'}
                  />
                )}
              />
            </Field>
            {!wholeDays && (
              <Field label="End time" error={errors.endTime?.message}>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <TimePicker
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      listLabel="End times"
                      align="end"
                    />
                  )}
                />
              </Field>
            )}
          </div>
        </div>

        <Field
          label="Note (optional)"
          description="Why, for the Host and other staff."
          error={errors.note?.message}
        >
          <Input maxLength={NOTE_MAX} {...register('note')} />
        </Field>
      </fieldset>

      <div>
        <Button type="submit" loading={add.isPending}>
          <CalendarPlus aria-hidden="true" />
          Block these dates
        </Button>
      </div>
    </form>
  );
}
