import { ChevronDown, ListFilter } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { AuditEntry } from '@/api/types';
import { IconButton } from '@/components/ui/icon-button';
import { Td, Tr } from '@/features/admin/ops/admin-table';
import { formatNzDateTimeWithYear } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import { formatAuditValue } from './platform-api';

const COLUMNS = 6;

function ValueBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <h4 className="text-xs font-semibold text-muted">{title}</h4>
      <pre className="mt-1.5 max-h-80 overflow-auto rounded-inner border border-line bg-surface p-3 font-mono text-xs whitespace-pre-wrap break-words text-ink">
        {formatAuditValue(value)}
      </pre>
    </div>
  );
}

/** One entry in the audit log, with its before and after values behind "Details". */
export function AuditEntryRow({
  entry,
  onActorFilter,
}: {
  entry: AuditEntry;
  /** Shows only this person's entries. */
  onActorFilter: (actorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const hasDetails = entry.before !== undefined || entry.after !== undefined;
  const actor = entry.actor;

  return (
    <>
      <Tr>
        <Td className="whitespace-nowrap">{formatNzDateTimeWithYear(entry.createdAt)}</Td>
        <Td>
          {actor ? (
            <div className="flex items-center gap-1">
              <Link to={`/admin/users/${actor.id}`} className="rounded-inner text-primary hover:underline">
                {actor.name}
              </Link>
              <IconButton
                label={`Only ${actor.name}’s changes`}
                tooltip="none"
                onClick={() => onActorFilter(actor.id)}
              >
                <ListFilter aria-hidden="true" />
              </IconButton>
            </div>
          ) : (
            <span className="text-muted">The system</span>
          )}
        </Td>
        <Td>
          <code className="font-mono text-xs text-ink">{entry.action}</code>
        </Td>
        <Td>
          <p>{entry.entity}</p>
          {entry.entityId && <p className="font-mono text-xs text-muted">{entry.entityId}</p>}
        </Td>
        <Td className="whitespace-nowrap">{entry.ip ?? <span className="text-muted">—</span>}</Td>
        <Td align="right">
          {hasDetails ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((current) => !current)}
              className="inline-flex min-h-8 items-center gap-1 rounded-inner text-sm font-medium text-primary hover:underline"
            >
              Details
              <ChevronDown
                aria-hidden="true"
                className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
              />
            </button>
          ) : (
            <span className="text-muted">—</span>
          )}
        </Td>
      </Tr>
      {hasDetails && (
        <tr id={detailsId} hidden={!open}>
          <td colSpan={COLUMNS} className="px-4 pb-4">
            <div className="grid gap-4 rounded-inner bg-ink/3 p-3 md:grid-cols-2">
              <ValueBlock title="Before" value={entry.before} />
              <ValueBlock title="After" value={entry.after} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
