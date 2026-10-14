import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { AdminFaq } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { ConfirmDialog } from '@/features/admin/listings/confirm-dialog';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { wholeField } from '@/features/admin/platform-settings/field-rules';
import {
  categoriesOf,
  contentErrorMessage,
  deleteFaqRequest,
  faqsQueryKey,
  groupByCategory,
  saveFaqRequest,
  useAdminFaqs,
} from './content-api';
import { AudienceBadge, AudienceField, CategoryField, DialogActions } from './content-fields';

// The API's limits.
const QUESTION_MAX = 300;
const ANSWER_MAX = 5000;
const CATEGORY_MAX = 60;

const schema = z.object({
  question: z
    .string()
    .trim()
    .min(5, 'Write a question of at least 5 characters')
    .max(QUESTION_MAX, `Use ${QUESTION_MAX} characters or fewer`),
  answer: z
    .string()
    .trim()
    .min(5, 'Write an answer of at least 5 characters')
    .max(ANSWER_MAX, `Use ${ANSWER_MAX.toLocaleString('en-NZ')} characters or fewer`),
  category: z
    .string()
    .trim()
    .min(2, 'Give it a category, like Booking')
    .max(CATEGORY_MAX, `Use ${CATEGORY_MAX} characters or fewer`),
  audience: z.enum(['GUEST', 'HOST', 'ALL']),
  showOnHome: z.boolean(),
  order: wholeField(0, 1000),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['question', 'answer', 'category', 'audience', 'showOnHome', 'order'] as const;

/** The questions on the FAQ pages, by category. Those marked for the homepage show there too. */
export function FaqsPanel() {
  const queryClient = useQueryClient();
  const faqs = useAdminFaqs();
  // Kept while each dialog closes, so its text doesn't change as it animates out.
  const [editing, setEditing] = useState<AdminFaq | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminFaq | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openForm = (faq: AdminFaq | null) => {
    setEditing(faq);
    setFormOpen(true);
  };

  const saved = (faq: AdminFaq, added: boolean) => {
    setFormOpen(false);
    toast(added ? 'Question added' : 'Question saved', {
      description: 'The FAQ pages show it within a minute.',
    });
    void queryClient.invalidateQueries({ queryKey: faqsQueryKey });
    // Shown straight away while the list refreshes.
    queryClient.setQueryData<{ faqs: AdminFaq[] }>(
      faqsQueryKey,
      (previous) =>
        previous && {
          faqs: added
            ? [...previous.faqs, faq]
            : previous.faqs.map((item) => (item.id === faq.id ? faq : item)),
        },
    );
  };

  const remove = async () => {
    if (!deleting) return;
    await deleteFaqRequest(deleting.id);
    setDeleteOpen(false);
    toast('Question deleted', { description: 'It comes off the FAQ pages within a minute.' });
    queryClient.setQueryData<{ faqs: AdminFaq[] }>(
      faqsQueryKey,
      (previous) => previous && { faqs: previous.faqs.filter((item) => item.id !== deleting.id) },
    );
    void queryClient.invalidateQueries({ queryKey: faqsQueryKey });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          The questions on the FAQ pages, by category. Those marked for the homepage show there too.
        </p>
        <Button onClick={() => openForm(null)}>
          <Plus aria-hidden="true" />
          Add a question
        </Button>
      </div>

      {faqs.isPending && <ListSkeleton label="Loading the questions" rows={5} height="h-20" />}
      {faqs.isError && (
        <LoadError
          title="We couldn’t load the questions"
          error={faqs.error}
          onRetry={() => faqs.refetch()}
          retrying={faqs.isFetching}
        />
      )}
      {faqs.data?.length === 0 && (
        <EmptyList
          icon={<CircleHelp />}
          title="No questions yet"
          description="Questions you add show on the FAQ pages."
        />
      )}
      {faqs.data &&
        groupByCategory(faqs.data).map((group) => (
          <FaqGroup
            key={group.category}
            category={group.category}
            faqs={group.items}
            onEdit={openForm}
            onDelete={(faq) => {
              setDeleting(faq);
              setDeleteOpen(true);
            }}
          />
        ))}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          title={editing ? 'Edit the question' : 'Add a question'}
          description="The FAQ pages show it within a minute of saving."
          className="w-[min(94vw,40rem)]"
        >
          <FaqForm
            key={editing?.id ?? 'new'}
            faq={editing}
            categories={categoriesOf(faqs.data ?? [])}
            onSaved={saved}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this question?"
        description={`“${deleting?.question ?? ''}” comes off the FAQ pages. This can’t be undone.`}
        confirmLabel="Delete question"
        onConfirm={remove}
      />
    </div>
  );
}

function FaqGroup({
  category,
  faqs,
  onEdit,
  onDelete,
}: {
  category: string;
  faqs: AdminFaq[];
  onEdit: (faq: AdminFaq) => void;
  onDelete: (faq: AdminFaq) => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-ink">
        {category}
        <span className="text-sm font-normal text-muted">({faqs.length})</span>
      </h2>
      <Card className="mt-3 px-5 sm:px-6">
        <ul aria-label={`${category} questions`} className="divide-y divide-line">
          {faqs.map((faq) => (
            <li
              key={faq.id}
              aria-label={faq.question}
              className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4"
            >
              <div className="min-w-0 flex-1 basis-64">
                <p className="font-medium text-ink">{faq.question}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{faq.answer}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AudienceBadge audience={faq.audience} />
                  {faq.showOnHome && <Badge variant="primary">On the homepage</Badge>}
                  <span className="text-xs text-muted tabular-nums">Order {faq.order}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit the question “${faq.question}”`}
                  onClick={() => onEdit(faq)}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete the question “${faq.question}”`}
                  onClick={() => onDelete(faq)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function FaqForm({
  faq,
  categories,
  onSaved,
}: {
  faq: AdminFaq | null;
  categories: string[];
  onSaved: (faq: AdminFaq, added: boolean) => void;
}) {
  const save = useMutation({ mutationFn: saveFaqRequest });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: faq?.question ?? '',
      answer: faq?.answer ?? '',
      category: faq?.category ?? '',
      audience: faq?.audience ?? 'ALL',
      showOnHome: faq?.showOnHome ?? false,
      order: String(faq?.order ?? 0),
    },
  });
  const category = useWatch({ control, name: 'category' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await save.mutateAsync({ id: faq?.id, faq: { ...values, order: Number(values.order) } });
      onSaved(result, !faq);
    } catch (error) {
      applyFieldErrors(error, FIELDS, setError);
    }
  });
  const serverError = save.isError ? contentErrorMessage(save.error, FIELDS) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">The question and its answer</legend>
        <Field label="Question" error={errors.question?.message}>
          <Input autoComplete="off" maxLength={QUESTION_MAX} {...register('question')} />
        </Field>
        <Field label="Answer" description="Plain text." error={errors.answer?.message}>
          <Textarea rows={6} maxLength={ANSWER_MAX} {...register('answer')} />
        </Field>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <CategoryField
            registration={register('category')}
            error={errors.category?.message}
            description="Questions are grouped by it."
            categories={categories}
            current={category}
            onPick={(picked) => setValue('category', picked, { shouldDirty: true, shouldValidate: true })}
          />
          <AudienceField registration={register('audience')} error={errors.audience?.message} />
          <Controller
            control={control}
            name="showOnHome"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                label="Show on the homepage"
                description="With the other homepage questions."
              />
            )}
          />
          <Field label="Order" description="Lower numbers come first." error={errors.order?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('order')} />
          </Field>
        </div>
      </fieldset>
      <DialogActions submitLabel={faq ? 'Save changes' : 'Add question'} pending={save.isPending} />
    </form>
  );
}
