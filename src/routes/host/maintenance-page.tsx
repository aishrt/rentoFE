import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import type { MaintenanceReminders, MaintenanceRemindersRequest } from '@/api/types';
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
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';

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

function Editor({ vehicleId, data }: { vehicleId: string; data: MaintenanceReminders }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(data));
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
          title="No reminders yet"
          description="Add a service, a tyre change or anything else, due by a date or an odometer reading."
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
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => setRows((current) => [...current, blank()])}
          disabled={rows.length >= 20}
        >
          <Plus aria-hidden="true" />
          Add a reminder
        </Button>
        <Button loading={save.isPending} onClick={submit}>
          Save reminders
        </Button>
      </div>
    </div>
  );
}

function Maintenance({ vehicleId }: { vehicleId: string }) {
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
  if (reminders.isError) {
    return (
      <Alert variant="danger" role="alert" title="We couldn’t load the reminders">
        {reminders.error.message}
      </Alert>
    );
  }
  if (!reminders.data) return <Skeleton aria-hidden="true" className="h-64 rounded-card" />;
  return <Editor vehicleId={vehicleId} data={reminders.data} />;
}

/** A car's maintenance reminders (spec §9: vehicle maintenance and document reminders). */
export function MaintenancePage() {
  const { id = '' } = useParams();
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageMeta title="Maintenance reminders" noindex />
      <div className="grid gap-8">
        <HostSubNav />
        <HostPageHeader
          back={<BackLink to="/host">My vehicles</BackLink>}
          eyebrow="Hosting"
          title="Maintenance reminders"
          description="Reminders you set for this car: we email you at 9 am when one is near."
        />
        <RequireSignedIn fallback={<Skeleton aria-hidden="true" className="h-64 rounded-card" />}>
          {() => <Maintenance vehicleId={id} />}
        </RequireSignedIn>
      </div>
    </Container>
  );
}
