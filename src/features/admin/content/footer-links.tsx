import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useId } from 'react';
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type Path,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { AdminSiteFooter } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import {
  LINK_ADDRESS_MESSAGE,
  contentErrorMessage,
  footerQueryKey,
  isHttpsAddress,
  isLinkAddress,
  saveFooterLinksRequest,
  useFooterLinks,
} from './content-api';

// The API's limits.
const MAX_GROUPS = 4;
const MAX_LINKS = 8;
const MAX_SOCIAL = 6;
const LABEL_MAX = 40;
const TITLE_MAX = 30;

const label = z
  .string()
  .trim()
  .min(1, 'Give the link a name')
  .max(LABEL_MAX, `Use ${LABEL_MAX} characters or fewer`);

const schema = z.object({
  groups: z
    .array(
      z.object({
        title: z
          .string()
          .trim()
          .min(1, 'Give the group a heading')
          .max(TITLE_MAX, `Use ${TITLE_MAX} characters or fewer`),
        links: z
          .array(z.object({ label, href: z.string().trim().refine(isLinkAddress, LINK_ADDRESS_MESSAGE) }))
          .max(MAX_LINKS),
      }),
    )
    .min(1)
    .max(MAX_GROUPS),
  socialLinks: z
    .array(
      z.object({
        label,
        href: z.string().trim().refine(isHttpsAddress, 'Use a full address starting with https://'),
      }),
    )
    .max(MAX_SOCIAL),
});
type Values = z.infer<typeof schema>;

/**
 * The footer's links (plan §12.6): its groups of links and the social media accounts, on every public
 * page. Links go to a page on this website, like /help, or to a full https:// address.
 */
export function FooterLinksPanel() {
  const footer = useFooterLinks();

  if (footer.isPending) return <ListSkeleton label="Loading the footer links" rows={4} height="h-24" />;
  if (footer.isError) {
    return (
      <LoadError
        title="We couldn’t load the footer links"
        error={footer.error}
        onRetry={() => footer.refetch()}
        retrying={footer.isFetching}
      />
    );
  }
  return <FooterForm saved={footer.data} />;
}

function FooterForm({ saved }: { saved: AdminSiteFooter }) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const save = useMutation({ mutationFn: saveFooterLinksRequest });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: saved.footer });
  const groups = useFieldArray({ control, name: 'groups' });
  const socials = useFieldArray({ control, name: 'socialLinks' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await save.mutateAsync(values);
      queryClient.setQueryData(footerQueryKey, response);
      reset(response.footer);
      toast('Footer links saved', { description: 'Every page shows them within a minute.' });
    } catch (error) {
      // The API names each field by its place, like groups.0.links.1.href: the same names as the form's.
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields))
          setError(field as Path<Values>, { message });
      }
    }
  });
  const serverError = save.isError
    ? contentErrorMessage(
        save.error,
        save.error instanceof ApiError ? Object.keys(save.error.fields ?? {}) : [],
      )
    : null;

  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={headingId}>
        {!saved.saved && <Badge variant="outline">The original links</Badge>}
        <h2 id={headingId} className="mt-2 text-lg font-semibold text-ink">
          Footer links
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The groups of links at the foot of every page, and the social media accounts. A link goes to a page
          on this website, like /help, or to a full address starting with https://. A group with no links
          isn’t shown.
        </p>

        <form noValidate onSubmit={onSubmit} className="mt-6 grid gap-6">
          {serverError && (
            <Alert variant="danger" role="alert">
              {serverError}
            </Alert>
          )}
          <fieldset disabled={save.isPending} className="grid min-w-0 gap-6">
            <legend className="sr-only">The footer’s links</legend>
            <div className="grid gap-5 lg:grid-cols-2">
              {groups.fields.map((group, index) => (
                <fieldset
                  key={group.id}
                  aria-label={`Group ${index + 1}`}
                  className="grid min-w-0 content-start gap-4 rounded-card border border-line p-4 sm:p-5"
                >
                  <div className="flex items-end gap-2">
                    <Field
                      label="Heading"
                      error={errors.groups?.[index]?.title?.message}
                      className="min-w-0 flex-1"
                    >
                      <Input
                        autoComplete="off"
                        maxLength={TITLE_MAX}
                        {...register(`groups.${index}.title`)}
                      />
                    </Field>
                    <IconButton
                      label={`Remove group ${index + 1}`}
                      disabled={groups.fields.length <= 1}
                      onClick={() => groups.remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </IconButton>
                  </div>
                  <GroupLinks control={control} register={register} errors={errors} groupIndex={index} />
                </fieldset>
              ))}
            </div>
            {groups.fields.length < MAX_GROUPS && (
              <div>
                <Button variant="secondary" onClick={() => groups.append({ title: '', links: [] })}>
                  <Plus aria-hidden="true" />
                  Add a group
                </Button>
              </div>
            )}

            <fieldset
              aria-label="Social media"
              className="grid min-w-0 gap-4 rounded-card border border-line p-4 sm:p-5"
            >
              <div>
                <p className="text-sm font-medium text-ink">Social media</p>
                <p className="text-sm text-muted">
                  Each account’s name, like Instagram, and its https:// address.
                </p>
              </div>
              {socials.fields.length === 0 && <p className="text-sm text-muted">No accounts yet.</p>}
              {socials.fields.map((social, index) => (
                <LinkRow
                  key={social.id}
                  name={`Account ${index + 1}`}
                  labelField={register(`socialLinks.${index}.label`)}
                  hrefField={register(`socialLinks.${index}.href`)}
                  labelError={errors.socialLinks?.[index]?.label?.message}
                  hrefError={errors.socialLinks?.[index]?.href?.message}
                  hrefPlaceholder="https://"
                  onRemove={() => socials.remove(index)}
                />
              ))}
              {socials.fields.length < MAX_SOCIAL && (
                <div>
                  <Button variant="ghost" size="sm" onClick={() => socials.append({ label: '', href: '' })}>
                    <Plus aria-hidden="true" />
                    Add an account
                  </Button>
                </div>
              )}
            </fieldset>
          </fieldset>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              Save footer links
            </Button>
            {isDirty && (
              <Button variant="ghost" disabled={save.isPending} onClick={() => reset(saved.footer)}>
                Undo changes
              </Button>
            )}
          </div>
        </form>
      </section>
    </Card>
  );
}

/** One group's links, in order. */
function GroupLinks({
  control,
  register,
  errors,
  groupIndex,
}: {
  control: Control<Values>;
  register: UseFormRegister<Values>;
  errors: FieldErrors<Values>;
  groupIndex: number;
}) {
  const links = useFieldArray({ control, name: `groups.${groupIndex}.links` });
  const linkErrors = errors.groups?.[groupIndex]?.links;
  return (
    <div className="grid gap-3">
      {links.fields.length === 0 && <p className="text-sm text-muted">No links, so the group isn’t shown.</p>}
      {links.fields.map((link, index) => (
        <LinkRow
          key={link.id}
          name={`Link ${index + 1}`}
          labelField={register(`groups.${groupIndex}.links.${index}.label`)}
          hrefField={register(`groups.${groupIndex}.links.${index}.href`)}
          labelError={linkErrors?.[index]?.label?.message}
          hrefError={linkErrors?.[index]?.href?.message}
          hrefPlaceholder="/help or https://"
          onUp={index > 0 ? () => links.move(index, index - 1) : undefined}
          onDown={index < links.fields.length - 1 ? () => links.move(index, index + 1) : undefined}
          onRemove={() => links.remove(index)}
        />
      ))}
      {links.fields.length < MAX_LINKS && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => links.append({ label: '', href: '' })}>
            <Plus aria-hidden="true" />
            Add a link
          </Button>
        </div>
      )}
    </div>
  );
}

/** A link's name and address side by side, with buttons to move and remove it. */
function LinkRow({
  name,
  labelField,
  hrefField,
  labelError,
  hrefError,
  hrefPlaceholder,
  onUp,
  onDown,
  onRemove,
}: {
  /** "Link 2", naming the row's fields and buttons for screen readers. */
  name: string;
  labelField: ReturnType<UseFormRegister<Values>>;
  hrefField: ReturnType<UseFormRegister<Values>>;
  labelError?: string;
  hrefError?: string;
  hrefPlaceholder: string;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:items-start">
      <Field label={`${name} name`} hideLabel error={labelError}>
        <Input autoComplete="off" placeholder="Name" maxLength={LABEL_MAX} {...labelField} />
      </Field>
      <Field label={`${name} address`} hideLabel error={hrefError}>
        <Input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={hrefPlaceholder}
          {...hrefField}
        />
      </Field>
      <div className="flex items-center justify-end">
        {(onUp || onDown) && (
          <>
            <IconButton label={`Move ${name.toLowerCase()} up`} disabled={!onUp} onClick={onUp}>
              <ArrowUp aria-hidden="true" />
            </IconButton>
            <IconButton label={`Move ${name.toLowerCase()} down`} disabled={!onDown} onClick={onDown}>
              <ArrowDown aria-hidden="true" />
            </IconButton>
          </>
        )}
        <IconButton label={`Remove ${name.toLowerCase()}`} onClick={onRemove}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
