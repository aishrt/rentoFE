import { Database, Lock, RefreshCw, ScrollText, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AuditEntryRow } from '@/features/admin/finance/audit-entry-row';
import { isForbidden, pageFrom } from '@/features/admin/finance/finance-api';
import {
  AUDIT_ENTITIES,
  AUDIT_FILTER_KEYS,
  AUDIT_PAGE_SIZE,
  useAuditLog,
  type AuditFilters,
} from '@/features/admin/finance/platform-api';
import { DataTable, Pagination, Th } from '@/features/admin/ops/admin-table';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { cn } from '@/lib/cn';

const ALL = 'ALL';
const ENTITY_OPTIONS = [{ value: ALL, label: 'All records' }, ...AUDIT_ENTITIES];

type FilterKey = (typeof AUDIT_FILTER_KEYS)[number];

function readFilters(params: URLSearchParams): AuditFilters {
  const filters: AuditFilters = { page: pageFrom(params.get('page')) };
  for (const key of AUDIT_FILTER_KEYS) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  return filters;
}

/** The action, record and record id, applied together with Filter. */
function FilterForm({
  filters,
  onApply,
}: {
  filters: AuditFilters;
  onApply: (changes: Partial<Record<FilterKey, string>>) => void;
}) {
  const [action, setAction] = useState(filters.action ?? '');
  const [entity, setEntity] = useState(filters.entity ?? ALL);
  const [entityId, setEntityId] = useState(filters.entityId ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply({ action: action.trim(), entity: entity === ALL ? '' : entity, entityId: entityId.trim() });
  };

  return (
    <form
      role="search"
      aria-label="Filter the audit log"
      onSubmit={submit}
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Field label="Action">
        <Input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="e.g. payout.held"
          maxLength={80}
        />
      </Field>
      <Field label="Record">
        <Select
          value={entity}
          onChange={setEntity}
          options={ENTITY_OPTIONS}
          icon={<Database />}
          listLabel="Kinds of record"
        />
      </Field>
      <Field label="Record id">
        <Input value={entityId} onChange={(event) => setEntityId(event.target.value)} maxLength={100} />
      </Field>
      <Button type="submit" variant="secondary">
        <Search aria-hidden="true" />
        Filter
      </Button>
    </form>
  );
}

/**
 * The audit log (spec §18), for the admin: every staff action and sensitive change, newest first, with
 * what the record looked like before and after.
 */
export function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const log = useAuditLog(filters);
  const filtered = AUDIT_FILTER_KEYS.some((key) => filters[key]);
  const actorName =
    filters.actor && log.data?.entries.find((entry) => entry.actor?.id === filters.actor)?.actor?.name;

  /** Changes filters in the address; any change but the page's goes back to page 1. */
  const update = (changes: Partial<Record<FilterKey | 'page', string>>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  if (log.isError && isForbidden(log.error)) {
    return (
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader eyebrow="Platform" title="Audit log" />
        <EmptyList
          icon={<Lock />}
          title="The audit log is for the admin"
          description="Ask the admin if you need to know who changed something."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Platform"
        title="Audit log"
        description="Every staff action and sensitive change, newest first. Open Details to see the record before and after."
        actions={
          log.data && (
            <IconButton label="Refresh the log" onClick={() => log.refetch()} disabled={log.isFetching}>
              <RefreshCw aria-hidden="true" className={log.isFetching ? 'animate-spin' : undefined} />
            </IconButton>
          )
        }
      />

      <div className="mt-8">
        {/* Remounts when the address changes, so the fields show the filters in use. */}
        <FilterForm key={searchParams.toString()} filters={filters} onApply={update} />
        {filtered && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {filters.actor && (
              <Button variant="secondary" size="sm" onClick={() => update({ actor: '' })}>
                Changes by {actorName ?? 'one person'}
                <span className="sr-only">, show everyone’s instead</span>
                <X aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ action: '', entity: '', entityId: '', actor: '' })}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        {log.isPending && <ListSkeleton label="Loading the audit log" rows={8} />}

        {log.isError && (
          <LoadError
            title="We couldn't load the audit log"
            error={log.error}
            onRetry={() => log.refetch()}
            retrying={log.isFetching}
          />
        )}

        {log.data?.entries.length === 0 && (
          <EmptyList
            icon={<ScrollText />}
            title={filtered ? 'Nothing matches these filters' : 'Nothing logged yet'}
            description={filtered ? 'Try fewer filters, or check the action’s spelling.' : undefined}
          />
        )}

        {log.data && log.data.entries.length > 0 && (
          <div aria-busy={log.isPlaceholderData}>
            <DataTable label="Audit log" className={cn(log.isPlaceholderData && 'opacity-60')}>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>Record</Th>
                  <Th>IP address</Th>
                  <Th align="right">
                    <span className="sr-only">Details</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {log.data.entries.map((entry) => (
                  <AuditEntryRow key={entry.id} entry={entry} onActorFilter={(actor) => update({ actor })} />
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={log.data.page}
              total={log.data.total}
              pageSize={AUDIT_PAGE_SIZE}
              onChange={(next) => update({ page: next > 1 ? String(next) : '' })}
              noun="entries"
              nounOne="entry"
            />
          </div>
        )}
      </div>
    </div>
  );
}
