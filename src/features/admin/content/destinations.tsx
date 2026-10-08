import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminDestination, DestinationEdit } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { wholeField } from '@/features/admin/platform-settings/field-rules';
import {
  contentErrorMessage,
  destinationsQueryKey,
  editDestinationRequest,
  useDestinations,
} from './content-api';
import { DialogActions, WebsiteLink } from './content-fields';

// The API's limits.
const TAGLINE_MAX = 160;
const INTRO_MAX = 5000;

const isWebAddress = (value: string) => {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** A page with a picture keeps one: the API can change it, not remove it. */
const destinationSchema = (hasPicture: boolean) =>
  z.object({
    tagline: z.string().trim().max(TAGLINE_MAX, `Use ${TAGLINE_MAX} characters or fewer`),
    intro: z
      .string()
      .trim()
      .min(20, 'Write at least 20 characters')
      .max(INTRO_MAX, `Use ${INTRO_MAX.toLocaleString('en-NZ')} characters or fewer`),
    heroImage: z
      .string()
      .trim()
      .superRefine((value, context) => {
        if (value && !isWebAddress(value)) {
          context.addIssue({ code: 'custom', message: 'Enter a full web address, starting with https://' });
        } else if (!value && hasPicture) {
          context.addIssue({
            code: 'custom',
            message: 'Enter the picture’s web address: this page keeps one',
          });
        }
      }),
    featured: z.boolean(),
    order: wholeField(0, 1000),
  });
type Values = z.infer<ReturnType<typeof destinationSchema>>;
const FIELDS = ['tagline', 'intro', 'heroImage', 'featured', 'order'] as const;

/** The destination pages (/rental/auckland and so on): their words, picture and place on the homepage. */
export function DestinationsPanel() {
  const queryClient = useQueryClient();
  const destinations = useDestinations();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [editing, setEditing] = useState<AdminDestination | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const saved = (destination: AdminDestination) => {
    queryClient.setQueryData<{ destinations: AdminDestination[] }>(
      destinationsQueryKey,
      (previous) =>
        previous && {
          destinations: previous.destinations.map((item) =>
            item.slug === destination.slug ? destination : item,
          ),
        },
    );
    // Featured pages and the order decide where it sits in the list.
    void queryClient.invalidateQueries({ queryKey: destinationsQueryKey });
    setDialogOpen(false);
    toast(`${destination.city} saved`, { description: 'The website shows the changes within a minute.' });
  };

  if (destinations.isPending) return <ListSkeleton label="Loading the destinations" rows={5} />;
  if (destinations.isError) {
    return (
      <LoadError
        title="We couldn’t load the destinations"
        error={destinations.error}
        onRetry={() => destinations.refetch()}
        retrying={destinations.isFetching}
      />
    );
  }
  if (destinations.data.length === 0) {
    return (
      <EmptyList
        icon={<MapPinned />}
        title="No destinations yet"
        description="Destination pages are added when the website is set up."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Featured destinations are the tiles on the homepage, lowest order number first.
      </p>
      <DataTable label="Destinations">
        <thead>
          <tr>
            <Th>Destination</Th>
            <Th>Region</Th>
            <Th>Homepage</Th>
            <Th align="right">Order</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {destinations.data.map((destination) => (
            <Tr key={destination.slug}>
              <Td>
                <p className="font-medium text-ink">{destination.city}</p>
                {destination.maoriName && (
                  <p lang="mi" className="text-muted">
                    {destination.maoriName}
                  </p>
                )}
              </Td>
              <Td className="text-muted">{destination.region}</Td>
              <Td>
                {destination.featured ? (
                  <Badge variant="primary">Featured</Badge>
                ) : (
                  <span className="text-muted">Not featured</span>
                )}
              </Td>
              <Td align="right">{destination.order}</Td>
              <Td align="right" className="py-2">
                <div className="flex justify-end gap-1">
                  <WebsiteLink to={`/rental/${destination.slug}`} label={`View the ${destination.city} page`}>
                    View
                  </WebsiteLink>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${destination.city}`}
                    onClick={() => {
                      setEditing(destination);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title={`Edit ${editing?.city ?? 'the destination'}`}
          description={`The page at /rental/${editing?.slug ?? ''}. Changes show on the website within a minute.`}
          className="w-[min(94vw,40rem)]"
        >
          {editing && <DestinationForm key={editing.slug} destination={editing} onSaved={saved} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DestinationForm({
  destination,
  onSaved,
}: {
  destination: AdminDestination;
  onSaved: (destination: AdminDestination) => void;
}) {
  const save = useMutation({ mutationFn: editDestinationRequest });
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(destinationSchema(Boolean(destination.heroImage))),
    defaultValues: {
      tagline: destination.tagline ?? '',
      intro: destination.intro,
      heroImage: destination.heroImage ?? '',
      featured: destination.featured,
      order: String(destination.order),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Only what changed is sent, so the audit log shows just that.
    const edit: DestinationEdit = {};
    if (dirtyFields.tagline) edit.tagline = values.tagline;
    if (dirtyFields.intro) edit.intro = values.intro;
    if (dirtyFields.heroImage && values.heroImage) edit.heroImage = values.heroImage;
    if (dirtyFields.featured) edit.featured = values.featured;
    if (dirtyFields.order) edit.order = Number(values.order);
    try {
      onSaved(await save.mutateAsync({ slug: destination.slug, edit }));
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
        <legend className="sr-only">The destination page</legend>
        <Field
          label="Tagline (optional)"
          description="A short line under the name, on the page and its homepage tile."
          error={errors.tagline?.message}
        >
          <Input autoComplete="off" maxLength={TAGLINE_MAX} {...register('tagline')} />
        </Field>
        <Field
          label="Introduction"
          description="The opening paragraph of the page."
          error={errors.intro?.message}
        >
          <Textarea rows={6} maxLength={INTRO_MAX} {...register('intro')} />
        </Field>
        <Field
          label="Picture"
          description="The web address of the large picture at the top, starting with https://."
          error={errors.heroImage?.message}
        >
          <Input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            {...register('heroImage')}
          />
        </Field>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="featured"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                label="Featured on the homepage"
                description="Shown as a homepage tile."
              />
            )}
          />
          <Field label="Order" description="Lower numbers come first." error={errors.order?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('order')} />
          </Field>
        </div>
      </fieldset>
      <DialogActions submitLabel="Save changes" pending={save.isPending} />
    </form>
  );
}
