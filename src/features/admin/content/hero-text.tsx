import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminHomeHero } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { WebsiteLink } from './content-fields';
import { contentErrorMessage, heroQueryKey, saveHeroTextRequest, useHeroText } from './content-api';

// The API's limits.
const HEADLINE_MAX = 100;
const SUBHEADING_MAX = 300;

const schema = z.object({
  headline: z
    .string()
    .trim()
    .min(10, 'Write a headline of at least 10 characters')
    .max(HEADLINE_MAX, `Use ${HEADLINE_MAX} characters or fewer`),
  subheading: z
    .string()
    .trim()
    .min(10, 'Write at least 10 characters')
    .max(SUBHEADING_MAX, `Use ${SUBHEADING_MAX} characters or fewer`),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['headline', 'subheading'] as const;

/** The homepage's headline and the line under it (plan §12.6), the original text until an admin saves. */
export function HeroTextPanel() {
  const hero = useHeroText();

  if (hero.isPending) return <ListSkeleton label="Loading the homepage headline" rows={2} height="h-24" />;
  if (hero.isError) {
    return (
      <LoadError
        title="We couldn’t load the homepage headline"
        error={hero.error}
        onRetry={() => hero.refetch()}
        retrying={hero.isFetching}
      />
    );
  }
  return <HeroTextForm saved={hero.data} />;
}

function HeroTextForm({ saved }: { saved: AdminHomeHero }) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const save = useMutation({ mutationFn: saveHeroTextRequest });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: saved.hero });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await save.mutateAsync(values);
      queryClient.setQueryData(heroQueryKey, response);
      reset(response.hero);
      toast('Homepage headline saved', { description: 'The homepage shows it within a minute.' });
    } catch (error) {
      applyFieldErrors(error, FIELDS, setError);
    }
  });
  const serverError = save.isError ? contentErrorMessage(save.error, FIELDS) : null;

  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={headingId}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {!saved.saved && <Badge variant="outline">The original text</Badge>}
            <h2 id={headingId} className="mt-2 text-lg font-semibold text-ink">
              Homepage headline
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The large headline at the top of the homepage, and the line under it, beside the search.
            </p>
          </div>
          <WebsiteLink to="/" label="View the homepage">
            View
          </WebsiteLink>
        </div>

        <form noValidate onSubmit={onSubmit} className="mt-6 grid gap-5">
          {serverError && (
            <Alert variant="danger" role="alert">
              {serverError}
            </Alert>
          )}
          <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
            <legend className="sr-only">The homepage headline</legend>
            <Field label="Headline" description="One short sentence." error={errors.headline?.message}>
              <Input autoComplete="off" maxLength={HEADLINE_MAX} {...register('headline')} />
            </Field>
            <Field
              label="Supporting line"
              description="A sentence or two under the headline."
              error={errors.subheading?.message}
            >
              <Textarea rows={3} maxLength={SUBHEADING_MAX} {...register('subheading')} />
            </Field>
          </fieldset>
          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              Save headline
            </Button>
            {isDirty && (
              <Button variant="ghost" disabled={save.isPending} onClick={() => reset(saved.hero)}>
                Undo changes
              </Button>
            )}
          </div>
        </form>
      </section>
    </Card>
  );
}
