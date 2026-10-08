import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import type { MaintenanceReminders, MaintenanceRemindersRequest } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useHostVehicle } from '@/features/host/host-api';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';
import { vehiclePath } from '@/features/host/use-step-save';
import { vehicleDisplayTitle } from '@/features/host/vehicle-labels';

interface Row {
  key: string;
  id?: string;
  title: string;
  dueAt: string;
  dueOdometer: string;
  notes: string;
  done: boolean;
}

let nextRow = 1;
const blank = (): Row => ({
  key: `new-${nextRow++}`,
  title: '',
  dueAt: '',
  dueOdometer: '',
  notes: '',
  done: false,
});

const rowsFrom = (data: MaintenanceReminders): Row[] =>
  data.reminders.map((reminder) => ({
    key: reminder.id,
    id: reminder.id,
    title: reminder.title,
    dueAt: reminder.dueAt ?? '',
    dueOdometer: reminder.dueOdometer?.toString() ?? '',
    notes: reminder.notes ?? '',
    done: Boolean(reminder.doneAt),
  }));

/** What a list of rows would save, to tell whether anything has changed since the last save. */
const fingerprint = (rows: Row[]) =>
  JSON.stringify(rows.map((row) => [row.id, row.title, row.dueAt, row.dueOdometer, row.notes, row.done]));

function Editor({ vehicleId, data }: { vehicleId: string; data: MaintenanceReminders }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(data));
  const changed = fingerprint(rows) !== fingerprint(rowsFrom(data));
  const save = useMutation({
    mutationFn: (body: MaintenanceRemindersRequest) =>
      unwrap(
        client.PUT('/host/vehicles/{id}/maintenance-reminders', {
          params: { path: { id: vehicleId } },
          body,
        }),
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(['host', 'maintenance', vehicleId], saved);
      void queryClient.invalidateQueries({ queryKey: ['host', 'todo'] });
      setRows(rowsFrom(saved));
      toast('Reminders saved', { description: 'We’ll remind you at 9 am when one is near.' });
    },
  });
  const fields = save.error instanceof ApiError ? (save.error.fields ?? {}) : {};
  const update = (key: string, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const submit = () =>
    save.mutate({
      reminders: rows.map((row) => ({
        ...(row.id && { id: row.id }),
        title: row.title.trim(),
        ...(row.dueAt && { dueAt: row.dueAt }),
        ...(row.dueOdometer.trim() && { dueOdometer: Number(row.dueOdometer.replace(/[,\s]/g, '')) }),
        ...(row.notes.trim() && { notes: row.notes.trim() }),
        done: row.done,
      })),
    });

  // A reminder just added takes the focus, as the button that added it may have gone with the empty state.
  const [added, setAdded] = useState<string | null>(null);
  const add = () => {
    const row = blank();
    setRows((current) => [...current, row]);
    setAdded(row.key);
  };

  const addButton = (variant: 'primary' | 'secondary') => (
    <Button variant={variant} onClick={add} disabled={rows.length >= 20}>
      <Plus aria-hidden="true" />
      Add a reminder
    </Button>
  );
  // Only once there's a change to save; with no reminders and nothing removed, it's left out.
  const saveButton = (
    <Button loading={save.isPending} disabled={!changed} onClick={submit}>
      Save reminders
    </Button>
  );

  return (
    <div className="grid gap-6">
      {data.latestOdometer !== null && (
        <p className="text-sm text-muted">
          Last odometer reading: {data.latestOdometer.toLocaleString('en-NZ')} km, from the latest handover.
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState
          className="mx-auto py-6"
          titleAs="h2"
          visual={
            <IconBadge size="xl">
              <Wrench />
            </IconBadge>
          }
          title={changed ? 'All reminders removed' : 'No reminders yet'}
          description={
            changed
              ? 'Save to remove them for good, or add a new one.'
              : 'Add a service, a tyre change or anything else, due by a date or an odometer reading.'
          }
          actions={
            changed ? (
              <>
                {addButton('secondary')}
                {saveButton}
              </>
            ) : (
              addButton('primary')
            )
          }
        />
      ) : (
        <ul className="grid gap-4">
          {rows.map((row, index) => (
            <li key={row.key}>
              <Card className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="What’s due" error={fields[`reminders.${index}.title`]}>
                  <Input
                    value={row.title}
                    maxLength={120}
                    placeholder="Service"
                    autoFocus={row.key === added}
                    onChange={(event) => update(row.key, { title: event.target.value })}
                  />
                </Field>
                <Field label="Notes (optional)">
                  <Input
                    value={row.notes}
                    maxLength={500}
                    onChange={(event) => update(row.key, { notes: event.target.value })}
                  />
                </Field>
                <Field label="Due by" error={fields[`reminders.${index}.dueAt`]}>
                  <DatePicker
                    value={row.dueAt}
                    onChange={(value) => update(row.key, { dueAt: value })}
                    placeholder="Choose a date"
                  />
                </Field>
                <Field label="Or at (km)">
                  <Input
                    inputMode="numeric"
                    value={row.dueOdometer}
                    onChange={(event) => update(row.key, { dueOdometer: event.target.value })}
                  />
                </Field>
                <div className="flex items-center justify-between sm:col-span-2">
                  <Checkbox
                    label="Done"
                    checked={row.done}
                    onChange={(event) => update(row.key, { done: event.target.checked })}
                  />
                  <IconButton
                    label={`Remove ${row.title || 'this reminder'}`}
                    onClick={() => setRows((current) => current.filter((other) => other.key !== row.key))}
                  >
                    <Trash2 aria-hidden="true" />
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {save.isError && (
        <Alert variant="danger" role="alert">
          {save.error.message}
        </Alert>
      )}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {addButton('secondary')}
          {saveButton}
        </div>
      )}
    </div>
  );
}

function Header({ eyebrow }: { eyebrow: ReactNode }) {
  return (
    <HostPageHeader
      back={<BackLink to="/host">My vehicles</BackLink>}
      eyebrow={eyebrow}
      title="Maintenance reminders"
      description="Reminders you set for this car: we email you at 9 am when one is near."
    />
  );
}

/** Stands in for the car's name while it loads, at the eyebrow's height. */
const eyebrowSkeleton = <span aria-hidden="true" className="skeleton inline-block h-3 w-40 rounded-md" />;

function MaintenanceSkeleton() {
  return (
    <>
      <Header eyebrow={eyebrowSkeleton} />
      <Skeleton aria-hidden="true" className="h-64 max-w-3xl rounded-card" />
    </>
  );
}

function Maintenance({ vehicleId }: { vehicleId: string }) {
  // The car names the page, as on its calendar.
  const vehicle = useHostVehicle(vehicleId);
  const reminders = useQuery({
    queryKey: ['host', 'maintenance', vehicleId],
    queryFn: ({ signal }) =>
      unwrap(
        client.GET('/host/vehicles/{id}/maintenance-reminders', {
          params: { path: { id: vehicleId } },
          signal,
        }),
      ),
  });
  const car = vehicle.data;
  return (
    <>
      <Header
        eyebrow={
          car ? (
            <Link to={vehiclePath(car.id)} className="link-underline">
              {vehicleDisplayTitle(car.title)}
            </Link>
          ) : vehicle.isPending ? (
            eyebrowSkeleton
          ) : (
            'Hosting'
          )
        }
      />
      {/* The tabs and heading line up with the other Host pages; the reminders keep a narrower width. */}
      <div className="max-w-3xl">
        {reminders.isError ? (
          <Alert variant="danger" role="alert" title="We couldn’t load the reminders">
            {reminders.error.message}
          </Alert>
        ) : reminders.data ? (
          <Editor vehicleId={vehicleId} data={reminders.data} />
        ) : (
          <Skeleton aria-hidden="true" className="h-64 rounded-card" />
        )}
      </div>
    </>
  );
}

/** A car's maintenance reminders (spec §9: vehicle maintenance and document reminders). */
export function MaintenancePage() {
  const { id = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Maintenance reminders" noindex />
      <div className="grid gap-8">
        <HostSubNav />
        <RequireSignedIn fallback={<MaintenanceSkeleton />}>
          {() => <Maintenance vehicleId={id} />}
        </RequireSignedIn>
      </div>
    </Container>
  );
}
