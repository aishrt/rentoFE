import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { LegalPage } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { legalDocuments, type LegalDocument } from '@/routes/legal/legal-documents';
import { contentErrorMessage, legalPagesQueryKey, saveLegalPageRequest, useLegalPages } from './content-api';
import { DialogActions, MarkdownField, WebsiteLink } from './content-fields';

// The API's limits.
const TITLE_MAX = 120;
const MARKDOWN_MAX = 200_000;

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Give it a title of at least 3 characters')
    .max(TITLE_MAX, `Use ${TITLE_MAX} characters or fewer`),
  markdown: z
    .string()
    .refine((value) => value.trim().length >= 20, 'Write at least 20 characters')
    .refine(
      (value) => value.length <= MARKDOWN_MAX,
      `Use ${MARKDOWN_MAX.toLocaleString('en-NZ')} characters or fewer`,
    ),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['title', 'markdown'] as const;

type Editing = { page: LegalPage; document: LegalDocument };

/**
 * The five legal pages. Staff correct their wording here; the version members accepted stays the same,
 * so nobody is asked to accept them again. A new version is published with a release.
 */
export function LegalPagesPanel() {
  const queryClient = useQueryClient();
  const pages = useLegalPages();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const saved = (page: LegalPage) => {
    queryClient.setQueryData<{ pages: LegalPage[] }>(
      legalPagesQueryKey,
      (previous) =>
        previous && { pages: previous.pages.map((item) => (item.key === page.key ? page : item)) },
    );
    setDialogOpen(false);
    toast(`${editing?.document.label ?? page.title} saved`, {
      description: `The website shows the new wording within a minute. It’s still version ${page.version}.`,
    });
  };

  if (pages.isPending) return <ListSkeleton label="Loading the legal pages" rows={5} />;
  if (pages.isError) {
    return (
      <LoadError
        title="We couldn’t load the legal pages"
        error={pages.error}
        onRetry={() => pages.refetch()}
        retrying={pages.isFetching}
      />
    );
  }

  const rows = legalDocuments.flatMap((document) => {
    const page = pages.data.find((item) => item.key === document.key);
    return page ? [{ document, page }] : [];
  });

  return (
    <div className="grid gap-6">
      <Alert title="For corrections">
        Saving changes the wording on the website but keeps the version members accepted, so nobody is asked
        to accept it again. A new version, which members accept again, is published with a release.
      </Alert>

      {rows.length === 0 ? (
        <EmptyList title="No legal pages yet" description="They’re added when the website is set up." />
      ) : (
        <DataTable label="Legal pages">
          <thead>
            <tr>
              <Th>Page</Th>
              <Th>Title</Th>
              <Th>Version</Th>
              <Th>Last updated</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ document, page }) => (
              <Tr key={page.key}>
                <Td className="font-medium text-ink">{document.label}</Td>
                <Td className="text-muted">{page.title}</Td>
                <Td className="tabular-nums">{page.version}</Td>
                <Td className="whitespace-nowrap text-muted">{formatNzDateTime(page.updatedAt)}</Td>
                <Td align="right" className="py-2">
                  <div className="flex justify-end gap-1">
                    <WebsiteLink to={document.path} label={`View the ${document.label.toLowerCase()}`}>
                      View
                    </WebsiteLink>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit the ${document.label.toLowerCase()}`}
                      onClick={() => {
                        setEditing({ page, document });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title={`Edit the ${editing?.document.label.toLowerCase() ?? 'page'}`}
          description={`Version ${editing?.page.version ?? ''} stays the same, so use this for corrections. A new version that members accept again is published with a release.`}
          className="w-[min(94vw,52rem)]"
        >
          {editing && <LegalPageForm key={editing.page.key} page={editing.page} onSaved={saved} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegalPageForm({ page, onSaved }: { page: LegalPage; onSaved: (page: LegalPage) => void }) {
  const save = useMutation({ mutationFn: saveLegalPageRequest });
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: page.title, markdown: page.markdown },
  });
  const markdown = useWatch({ control, name: 'markdown' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      onSaved(
        await save.mutateAsync({ key: page.key, edit: { title: values.title, markdown: values.markdown } }),
      );
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
        <legend className="sr-only">The page’s wording</legend>
        <Field label="Title" error={errors.title?.message}>
          <Input autoComplete="off" maxLength={TITLE_MAX} {...register('title')} />
        </Field>
        <MarkdownField
          label="Text"
          description="In Markdown: # starts a heading, - starts a list item, **bold** and [a link](/terms)."
          error={errors.markdown?.message}
          value={markdown}
          rows={18}
          {...register('markdown')}
        />
      </fieldset>
      <DialogActions submitLabel="Save changes" pending={save.isPending} />
    </form>
  );
}
