import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon, MapPinned, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminDestination, DestinationCreate, DestinationEdit } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { wholeField } from '@/features/admin/platform-settings/field-rules';
import { NZ_REGIONS } from '@/features/host/vehicle-labels';
import {
  LINK_ADDRESS_MESSAGE,
  contentErrorMessage,
  createDestinationRequest,
  destinationsQueryKey,
  editDestinationRequest,
  isLinkAddress,
  slugify,
  useDestinations,
} from './content-api';
import { DialogActions, WebsiteLink } from './content-fields';

// The API's limits.
const NAME_MAX = 60;
const MAORI_NAME_MAX = 80;
const TAGLINE_MAX = 160;
const INTRO_MAX = 5000;
const MAX_AIRPORTS = 5;
/** New Zealand, roughly: from Stewart Island to Cape Reinga, and east to East Cape. */
const LATITUDE = { min: -48, max: -34 };
const LONGITUDE = { min: 166, max: 179 };

const REGION_OPTIONS = NZ_REGIONS.map((region) => ({ value: region, label: region }));

/** "akl, zqn" → ["AKL", "ZQN"]. */
const airportCodes = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

const coordinate = (bounds: { min: number; max: number }, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      const number = Number(value);
      return value !== '' && Number.isFinite(number) && number >= bounds.min && number <= bounds.max;
    }, message);

/** The web address is chosen once, when the page is added: links to it keep working. */
const destinationSchema = (adding: boolean) =>
  z.object({
    slug: adding
      ? z
          .string()
          .trim()
          .min(1, 'Choose the web address')
          .max(NAME_MAX, `Use ${NAME_MAX} characters or fewer`)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words joined by dashes, like bay-of-islands')
      : z.string(),
    city: z.string().trim().min(2, 'Enter the name').max(NAME_MAX, `Use ${NAME_MAX} characters or fewer`),
    maoriName: z.string().trim().max(MAORI_NAME_MAX, `Use ${MAORI_NAME_MAX} characters or fewer`),
    region: z
      .string()
      .refine((value) => (NZ_REGIONS as readonly string[]).includes(value), 'Choose the region'),
    tagline: z.string().trim().max(TAGLINE_MAX, `Use ${TAGLINE_MAX} characters or fewer`),
    intro: z
      .string()
      .trim()
      .min(20, 'Write at least 20 characters')
      .max(INTRO_MAX, `Use ${INTRO_MAX.toLocaleString('en-NZ')} characters or fewer`),
    heroImage: z
      .string()
      .trim()
      .refine((value) => !value || isLinkAddress(value), LINK_ADDRESS_MESSAGE),
    lat: coordinate(LATITUDE, 'Enter a latitude in New Zealand, between -48 and -34'),
    lng: coordinate(LONGITUDE, 'Enter a longitude in New Zealand, between 166 and 179'),
    airports: z
      .string()
      .refine(
        (value) => airportCodes(value).every((code) => /^[A-Z]{3}$/.test(code)),
        'Use 3-letter airport codes, like AKL, separated by commas',
      )
      .refine((value) => airportCodes(value).length <= MAX_AIRPORTS, `Up to ${MAX_AIRPORTS} airports`),
    featured: z.boolean(),
    order: wholeField(0, 1000),
    published: z.boolean(),
  });
type Values = z.infer<ReturnType<typeof destinationSchema>>;
const FIELDS = [
  'slug',
  'city',
  'maoriName',
  'region',
  'tagline',
  'intro',
  'heroImage',
  'lat',
  'lng',
  'airports',
  'featured',
  'order',
  'published',
] as const;

const valuesOf = (destination: AdminDestination | null): Values => ({
  slug: destination?.slug ?? '',
  city: destination?.city ?? '',
  maoriName: destination?.maoriName ?? '',
  region: destination?.region ?? '',
  tagline: destination?.tagline ?? '',
  intro: destination?.intro ?? '',
  heroImage: destination?.heroImage ?? '',
  lat: destination ? String(destination.lat) : '',
  lng: destination ? String(destination.lng) : '',
  airports: destination?.airports.join(', ') ?? '',
  featured: destination?.featured ?? false,
  order: String(destination?.order ?? 0),
  published: destination?.published ?? true,
});

/**
 * The destination pages (/rental/auckland and so on): adding one, its words, place, picture and airports,
 * its place on the homepage, and whether it's published (plan §1.4: admins add destinations without code
 * changes). An unpublished page is off the homepage and the sitemap, and its address shows "not found".
 */
export function DestinationsPanel() {
  const queryClient = useQueryClient();
  const destinations = useDestinations();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [editing, setEditing] = useState<AdminDestination | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openForm = (destination: AdminDestination | null) => {
    setEditing(destination);
    setDialogOpen(true);
  };

  const saved = (destination: AdminDestination, added: boolean) => {
    queryClient.setQueryData<{ destinations: AdminDestination[] }>(
      destinationsQueryKey,
      (previous) =>
        previous && {
          destinations: added
            ? [...previous.destinations, destination]
            : previous.destinations.map((item) => (item.slug === destination.slug ? destination : item)),
        },
    );
    // Featured pages and the order decide where it sits in the list.
    void queryClient.invalidateQueries({ queryKey: destinationsQueryKey });
    setDialogOpen(false);
    toast(`${destination.city} ${added ? 'added' : 'saved'}`, {
      description: destination.published
        ? 'The website shows the changes within a minute.'
        : 'It’s unpublished, so the website doesn’t show it.',
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Featured destinations are the tiles on the homepage, lowest order number first. Unpublished pages
          are off the homepage and the sitemap, and their address shows “page not found”.
        </p>
        <Button onClick={() => openForm(null)}>
          <Plus aria-hidden="true" />
          Add a destination
        </Button>
      </div>

      {destinations.isPending && <ListSkeleton label="Loading the destinations" rows={5} />}
      {destinations.isError && (
        <LoadError
          title="We couldn’t load the destinations"
          error={destinations.error}
          onRetry={() => destinations.refetch()}
          retrying={destinations.isFetching}
        />
      )}
      {destinations.data?.length === 0 && (
        <EmptyList
          icon={<MapPinned />}
          title="No destinations yet"
          description="Destination pages you add show at /rental/ and their web address."
        />
      )}
      {destinations.data && destinations.data.length > 0 && (
        <DataTable label="Destinations">
          <thead>
            <tr>
              <Th>Destination</Th>
              <Th>Region</Th>
              <Th>Homepage</Th>
              <Th>Page</Th>
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
                <Td>
                  {destination.published ? (
                    <span className="text-muted">Published</span>
                  ) : (
                    <Badge variant="outline">Unpublished</Badge>
                  )}
                </Td>
                <Td align="right">{destination.order}</Td>
                <Td align="right" className="py-2">
                  <div className="flex justify-end gap-1">
                    {destination.published && (
                      <WebsiteLink
                        to={`/rental/${destination.slug}`}
                        label={`View the ${destination.city} page`}
                      >
                        View
                      </WebsiteLink>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit ${destination.city}`}
                      onClick={() => openForm(destination)}
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
          title={editing ? `Edit ${editing.city}` : 'Add a destination'}
          description={
            editing
              ? `The page at /rental/${editing.slug}. Changes show on the website within a minute.`
              : 'A landing page at /rental/ and its web address, shown on the website within a minute.'
          }
          className="w-[min(94vw,44rem)]"
        >
          <DestinationForm key={editing?.slug ?? 'new'} destination={editing} onSaved={saved} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DestinationForm({
  destination,
  onSaved,
}: {
  /** Null to add one. */
  destination: AdminDestination | null;
  onSaved: (destination: AdminDestination, added: boolean) => void;
}) {
  const adding = destination === null;
  const save = useMutation({
    mutationFn: (request: { create: DestinationCreate } | { slug: string; edit: DestinationEdit }) =>
      'create' in request ? createDestinationRequest(request.create) : editDestinationRequest(request),
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(destinationSchema(adding)),
    defaultValues: valuesOf(destination),
  });

  /** Only what changed is sent, so the audit log shows just that. */
  const editOf = (values: Values): DestinationEdit => {
    const edit: DestinationEdit = {};
    if (dirtyFields.city) edit.city = values.city;
    if (dirtyFields.maoriName) edit.maoriName = values.maoriName;
    if (dirtyFields.region) edit.region = values.region as DestinationEdit['region'];
    if (dirtyFields.tagline) edit.tagline = values.tagline;
    if (dirtyFields.intro) edit.intro = values.intro;
    if (dirtyFields.heroImage) edit.heroImage = values.heroImage;
    // The place is one point: both numbers go together.
    if (dirtyFields.lat || dirtyFields.lng) {
      edit.lat = Number(values.lat);
      edit.lng = Number(values.lng);
    }
    if (dirtyFields.airports) edit.airports = airportCodes(values.airports);
    if (dirtyFields.featured) edit.featured = values.featured;
    if (dirtyFields.order) edit.order = Number(values.order);
    if (dirtyFields.published) edit.published = values.published;
    return edit;
  };

  const createOf = (values: Values): DestinationCreate => ({
    slug: values.slug,
    city: values.city,
    ...(values.maoriName && { maoriName: values.maoriName }),
    region: values.region as DestinationCreate['region'],
    ...(values.tagline && { tagline: values.tagline }),
    intro: values.intro,
    ...(values.heroImage && { heroImage: values.heroImage }),
    lat: Number(values.lat),
    lng: Number(values.lng),
    airports: airportCodes(values.airports),
    featured: values.featured,
    order: Number(values.order),
    published: values.published,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const request = destination
        ? { slug: destination.slug, edit: editOf(values) }
        : { create: createOf(values) };
      onSaved(await save.mutateAsync(request), adding);
    } catch (error) {
      applyFieldErrors(error, FIELDS, setError);
    }
  });
  const serverError = save.isError ? contentErrorMessage(save.error, FIELDS) : null;

  // While adding, the web address follows the name until it's typed in itself.
  const nameField = register('city', {
    onChange: (event: { target: { value: string } }) => {
      if (adding && !getFieldState('slug').isDirty) setValue('slug', slugify(event.target.value));
    },
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">The destination page</legend>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Field label="Name" description="The town, city or area, in English." error={errors.city?.message}>
            <Input autoComplete="off" maxLength={NAME_MAX} {...nameField} />
          </Field>
          <Field
            label="Māori name (optional)"
            description="Shown with the English name, like Tāmaki Makaurau."
            error={errors.maoriName?.message}
          >
            <Input lang="mi" autoComplete="off" maxLength={MAORI_NAME_MAX} {...register('maoriName')} />
          </Field>
          {adding ? (
            <Field
              label="Web address"
              description="The page is at /rental/ and this. It can’t change once the page is added."
              error={errors.slug?.message}
            >
              <Input
                autoComplete="off"
                spellCheck={false}
                maxLength={NAME_MAX}
                {...register('slug', { setValueAs: (value: string) => value.toLowerCase() })}
              />
            </Field>
          ) : (
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Web address</p>
              <p className="flex min-h-12 items-center text-ink">/rental/{destination.slug}</p>
              <p className="text-sm text-muted">It stays the same, so links to the page keep working.</p>
            </div>
          )}
          <Field label="Region" error={errors.region?.message}>
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={REGION_OPTIONS}
                  placeholder="Choose the region"
                  icon={<MapIcon />}
                  listLabel="Regions"
                />
              )}
            />
          </Field>
        </div>
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
          <Textarea rows={5} maxLength={INTRO_MAX} {...register('intro')} />
        </Field>
        <Field
          label="Picture (optional)"
          description="The large picture at the top: a full address starting with https://, or a path on this website. Empty removes it."
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
          <Field
            label="Latitude"
            description="Where search for cars here centres, like -36.85."
            error={errors.lat?.message}
          >
            <Input inputMode="decimal" autoComplete="off" {...register('lat')} />
          </Field>
          <Field label="Longitude" description="Like 174.76." error={errors.lng?.message}>
            <Input inputMode="decimal" autoComplete="off" {...register('lng')} />
          </Field>
          <Field
            label="Airports (optional)"
            description="Airport codes, separated by commas, like AKL. The page lists them for airport pick-ups."
            error={errors.airports?.message}
          >
            <Input autoComplete="off" spellCheck={false} {...register('airports')} />
          </Field>
          <Field label="Order" description="Lower numbers come first." error={errors.order?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('order')} />
          </Field>
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
                description="Off: the page leaves the homepage and the sitemap, and its address shows “page not found”."
              />
            )}
          />
        </div>
      </fieldset>
      <DialogActions submitLabel={adding ? 'Add destination' : 'Save changes'} pending={save.isPending} />
    </form>
  );
}
