import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { AdminHelpArticle } from '@/api/types';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { ConfirmDialog } from '@/features/admin/listings/confirm-dialog';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { wholeField } from '@/features/admin/platform-settings/field-rules';
import { formatNzDate } from '@/features/booking/booking-format';
import {
  AUDIENCE_LABELS,
  categoriesOf,
  contentErrorMessage,
  deleteHelpArticleRequest,
  helpArticlesQueryKey,
  isApiError,
  saveHelpArticleRequest,
  slugify,
  useAdminHelpArticles,
} from './content-api';
import { AudienceField, CategoryField, DialogActions, MarkdownField, WebsiteLink } from './content-fields';

// The API's limits.
const TITLE_MAX = 160;
const BODY_MAX = 50_000;
const CATEGORY_MAX = 60;

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Enter its web address, like changing-a-booking')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words joined by dashes, like changing-a-booking'),
  title: z
    .string()
    .trim()
    .min(3, 'Give it a title of at least 3 characters')
    .max(TITLE_MAX, `Use ${TITLE_MAX} characters or fewer`),
  body: z
    .string()
    .refine((value) => value.trim().length >= 20, 'Write at least 20 characters')
    .refine(
      (value) => value.length <= BODY_MAX,
      `Use ${BODY_MAX.toLocaleString('en-NZ')} characters or fewer`,
    ),
  category: z
    .string()
    .trim()
    .min(2, 'Give it a category, like Payments')
    .max(CATEGORY_MAX, `Use ${CATEGORY_MAX} characters or fewer`),
  audience: z.enum(['GUEST', 'HOST', 'ALL']),
  published: z.boolean(),
  order: wholeField(0, 1000),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['slug', 'title', 'body', 'category', 'audience', 'published', 'order'] as const;

/** The help centre's articles, published or drafts. Each has its own page at /help/its-address. */
export function HelpArticlesPanel() {
  const queryClient = useQueryClient();
  const articles = useAdminHelpArticles();
  // Kept while each dialog closes, so its text doesn't change as it animates out.
  const [editing, setEditing] = useState<AdminHelpArticle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminHelpArticle | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openForm = (article: AdminHelpArticle | null) => {
    setEditing(article);
    setFormOpen(true);
  };

  const saved = (article: AdminHelpArticle, added: boolean) => {
    setFormOpen(false);
    toast(added ? `${article.title} added` : `${article.title} saved`, {
      description: article.published
        ? 'The help centre shows it within a minute.'
        : 'It’s a draft, so the help centre doesn’t show it.',
    });
    // Shown straight away while the list refreshes.
    queryClient.setQueryData<{ articles: AdminHelpArticle[] }>(
      helpArticlesQueryKey,
      (previous) =>
        previous && {
          articles: added
            ? [...previous.articles, article]
            : previous.articles.map((item) => (item.id === article.id ? article : item)),
        },
    );
    void queryClient.invalidateQueries({ queryKey: helpArticlesQueryKey });
  };

  const remove = async () => {
    if (!deleting) return;
    await deleteHelpArticleRequest(deleting.id);
    setDeleteOpen(false);
    toast(`${deleting.title} deleted`, { description: 'It comes off the help centre within a minute.' });
    queryClient.setQueryData<{ articles: AdminHelpArticle[] }>(
      helpArticlesQueryKey,
      (previous) => previous && { articles: previous.articles.filter((item) => item.id !== deleting.id) },
    );
    void queryClient.invalidateQueries({ queryKey: helpArticlesQueryKey });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Articles in the help centre, by category. Drafts stay here until you publish them.
        </p>
        <Button onClick={() => openForm(null)}>
          <Plus aria-hidden="true" />
          Add an article
        </Button>
      </div>

      {articles.isPending && <ListSkeleton label="Loading the help articles" rows={5} />}
      {articles.isError && (
        <LoadError
          title="We couldn’t load the help articles"
          error={articles.error}
          onRetry={() => articles.refetch()}
          retrying={articles.isFetching}
        />
      )}
      {articles.data?.length === 0 && (
        <EmptyList
          icon={<BookOpenText />}
          title="No help articles yet"
          description="Articles you publish show in the help centre."
        />
      )}
      {articles.data && articles.data.length > 0 && (
        <DataTable label="Help articles">
          <thead>
            <tr>
              <Th>Article</Th>
              <Th>Category</Th>
              <Th>For</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {articles.data.map((article) => (
              <Tr key={article.id}>
                <Td className="max-w-sm">
                  <p className="font-medium whitespace-normal text-ink">{article.title}</p>
                  <p className="text-muted">/help/{article.slug}</p>
                </Td>
                <Td className="text-muted">{article.category}</Td>
                <Td className="text-muted">{AUDIENCE_LABELS[article.audience]}</Td>
                <Td>
                  {article.published ? (
                    <Badge variant="primary">Published</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatNzDate(article.updatedAt)}</Td>
                <Td align="right" className="py-2">
                  <div className="flex justify-end gap-1">
                    {article.published && (
                      <WebsiteLink to={`/help/${article.slug}`} label={`View ${article.title}`}>
                        View
                      </WebsiteLink>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit ${article.title}`}
                      onClick={() => openForm(article)}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${article.title}`}
                      onClick={() => {
                        setDeleting(article);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          title={editing ? `Edit ${editing.title}` : 'Add a help article'}
          description="Published articles show in the help centre within a minute of saving."
          className="w-[min(94vw,52rem)]"
        >
          <HelpArticleForm
            key={editing?.id ?? 'new'}
            article={editing}
            categories={categoriesOf(articles.data ?? [])}
            onSaved={saved}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this article?"
        description={`“${deleting?.title ?? ''}” comes off the help centre, and links to /help/${deleting?.slug ?? ''} stop working. This can’t be undone.`}
        confirmLabel="Delete article"
        onConfirm={remove}
      />
    </div>
  );
}

function HelpArticleForm({
  article,
  categories,
  onSaved,
}: {
  article: AdminHelpArticle | null;
  categories: string[];
  onSaved: (article: AdminHelpArticle, added: boolean) => void;
}) {
  const save = useMutation({ mutationFn: saveHelpArticleRequest });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: article?.slug ?? '',
      title: article?.title ?? '',
      body: article?.body ?? '',
      category: article?.category ?? '',
      audience: article?.audience ?? 'ALL',
      published: article?.published ?? true,
      order: String(article?.order ?? 0),
    },
  });
  const body = useWatch({ control, name: 'body' });
  const category = useWatch({ control, name: 'category' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await save.mutateAsync({
        id: article?.id,
        article: { ...values, order: Number(values.order) },
      });
      onSaved(result, !article);
    } catch (error) {
      // Another article has this address: the API says so, and it belongs beside the field.
      if (error instanceof ApiError && error.code === 'SLUG_TAKEN') {
        setError('slug', { message: error.message }, { shouldFocus: true });
      }
      applyFieldErrors(error, FIELDS, setError);
    }
  });
  const serverError =
    save.isError && !isApiError(save.error, 'SLUG_TAKEN') ? contentErrorMessage(save.error, FIELDS) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">The article</legend>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Field label="Title" error={errors.title?.message}>
            <Input
              autoComplete="off"
              maxLength={TITLE_MAX}
              {...register('title', {
                // A new article's address follows its title until it's changed by hand.
                onChange: (event: { target: { value: string } }) => {
                  if (!article && !getFieldState('slug').isDirty)
                    setValue('slug', slugify(event.target.value));
                },
              })}
            />
          </Field>
          <Field
            label="Web address"
            description="Lowercase words joined by dashes. The page is at /help/ and then this."
            error={errors.slug?.message}
          >
            <Input autoComplete="off" autoCapitalize="none" spellCheck={false} {...register('slug')} />
          </Field>
        </div>
        <MarkdownField
          label="Article"
          description="In Markdown: ## starts a heading, - starts a list item, **bold** and [a link](/help)."
          error={errors.body?.message}
          value={body}
          rows={16}
          {...register('body')}
        />
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <CategoryField
            registration={register('category')}
            error={errors.category?.message}
            description="Articles are grouped by it."
            categories={categories}
            current={category}
            onPick={(picked) => setValue('category', picked, { shouldDirty: true, shouldValidate: true })}
          />
          <AudienceField registration={register('audience')} error={errors.audience?.message} />
          <Controller
            control={control}
            name="published"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                label="Published"
                description="Drafts aren’t shown in the help centre."
              />
            )}
          />
          <Field label="Order" description="Lower numbers come first." error={errors.order?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('order')} />
          </Field>
        </div>
      </fieldset>
      <DialogActions submitLabel={article ? 'Save changes' : 'Add article'} pending={save.isPending} />
    </form>
  );
}
