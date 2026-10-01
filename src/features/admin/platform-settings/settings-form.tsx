import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import type { DecisionKey, PlatformSettings, PlatformSettingsUpdate } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { platformSettingsQueryKey, savePlatformSettingsRequest, settingsErrorMessages } from './settings-api';
import { useReportUnsaved } from './unsaved-changes';

interface SettingsFormProps<Values extends FieldValues> {
  /** The client's decision these settings wait for. */
  decision: DecisionKey;
  title: string;
  description: ReactNode;
  settings: PlatformSettings;
  schema: z.ZodType<Values, Values>;
  /** The form's values from the settings in force. */
  toValues: (settings: PlatformSettings) => Values;
  /** The groups to save, from the form's values and the settings in force. */
  toUpdate: (values: Values, settings: PlatformSettings) => PlatformSettingsUpdate;
  children: (form: UseFormReturn<Values>) => ReactNode;
  /** Two columns of fields from the small breakpoint up (the default), or one. */
  columns?: 1 | 2;
}

/**
 * One card on the Platform settings tab: a group of settings that wait for one of the client's decisions
 * (plan §16), saved together. The badge and the "Confirmed by the client" box show where the decision
 * stands; the values apply as soon as they're saved, confirmed or not.
 */
export function SettingsForm<Values extends FieldValues>({
  decision,
  title,
  description,
  settings,
  schema,
  toValues,
  toUpdate,
  children,
  columns = 2,
}: SettingsFormProps<Values>) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const saved = settings.decisions[decision];
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(settings) as DefaultValues<Values>,
  });
  const [confirmed, setConfirmed] = useState(saved.status === 'CONFIRMED');
  const [note, setNote] = useState(saved.note);
  const save = useMutation({ mutationFn: savePlatformSettingsRequest });
  const decisionChanged = confirmed !== (saved.status === 'CONFIRMED') || note.trim() !== saved.note;
  useReportUnsaved(decision, form.formState.isDirty || decisionChanged);

  const onSubmit = form.handleSubmit(async (values) => {
    // The latest settings, in case another card was saved since this one loaded.
    const current =
      queryClient.getQueryData<{ settings: PlatformSettings }>(platformSettingsQueryKey)?.settings ??
      settings;
    const response = await save
      .mutateAsync({
        ...toUpdate(values, current),
        decisions: {
          [decision]: { status: confirmed ? 'CONFIRMED' : 'PENDING', note: confirmed ? note.trim() : '' },
        },
      })
      // The error shows above the fields (save.isError).
      .catch(() => null);
    if (!response) return;
    queryClient.setQueryData(platformSettingsQueryKey, response);
    // Only this card starts again from what was saved; unsaved changes in the others stay.
    form.reset(toValues(response.settings));
    toast(`${title} saved`, { description: 'New quotes, listings and pages use them straight away.' });
  });

  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={headingId}>
        <div className="mb-6">
          {saved.status === 'CONFIRMED' ? (
            <Badge variant="primary">Confirmed by the client</Badge>
          ) : (
            <Badge variant="outline">Placeholder: waiting for the client</Badge>
          )}
          <h2 id={headingId} className="mt-3 text-lg font-semibold text-ink">
            {title}
          </h2>
          <div className="mt-1 max-w-2xl text-sm text-muted">{description}</div>
        </div>

        <FormProvider {...form}>
          <form noValidate onSubmit={onSubmit}>
            <fieldset disabled={save.isPending} className="grid min-w-0 gap-6">
              <legend className="sr-only">{title}</legend>
              {save.isError && (
                <Alert variant="danger" role="alert" title="These settings weren't saved">
                  {settingsErrorMessages(save.error).join(' ')}
                </Alert>
              )}
              <div className={cn('grid items-start gap-5', columns === 2 && 'sm:grid-cols-2')}>
                {children(form)}
              </div>

              <div className="grid gap-4 border-t border-line pt-5">
                <Checkbox
                  label="The client has confirmed these"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                {confirmed && (
                  <Field
                    label="How it was confirmed (optional)"
                    description="For example, the client's email of 3 October."
                  >
                    <Input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
                  </Field>
                )}
                <div>
                  <Button
                    type="submit"
                    loading={save.isPending}
                    disabled={!form.formState.isDirty && !decisionChanged}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </FormProvider>
      </section>
    </Card>
  );
}
