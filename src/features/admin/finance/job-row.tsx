import { RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';
import type { AdminJob } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Td, Tr } from '@/features/admin/ops/admin-table';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { formatNumber } from '@/lib/format';

/** How much of an error shows before "Show all". */
const ERROR_PREVIEW = 120;

function LastError({ error }: { error: string | undefined }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!error) return <span className="text-muted">—</span>;
  const long = error.length > ERROR_PREVIEW;
  return (
    <div className="max-w-md whitespace-normal">
      <pre id={id} className="font-mono text-xs break-words whitespace-pre-wrap text-danger">
        {open || !long ? error : `${error.slice(0, ERROR_PREVIEW).trimEnd()}…`}
      </pre>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((current) => !current)}
          className="mt-1 inline-flex min-h-8 items-center rounded-inner text-xs font-medium text-primary hover:underline"
        >
          {open ? 'Show less' : 'Show all'}
        </button>
      )}
    </div>
  );
}

/** One background job; a failed one can run again. */
export function JobRow({
  job,
  onRetry,
  retrying,
}: {
  job: AdminJob;
  /** Set for failed jobs. */
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <Tr>
      <Td>
        <code className="font-mono text-xs font-medium text-ink">{job.type}</code>
      </Td>
      <Td className="whitespace-nowrap tabular-nums">
        {formatNumber(job.attempts)} of {formatNumber(job.maxAttempts)}
      </Td>
      <Td>
        <LastError error={job.lastError} />
      </Td>
      <Td>
        {job.refId ? (
          <span className="font-mono text-xs">{job.refId}</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </Td>
      <Td className="whitespace-nowrap">{formatNzDateTime(job.runAt)}</Td>
      <Td className="whitespace-nowrap">
        {job.finishedAt ? formatNzDateTime(job.finishedAt) : <span className="text-muted">—</span>}
      </Td>
      {onRetry && (
        <Td align="right">
          <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
            <RotateCcw aria-hidden="true" />
            Run again <span className="sr-only">{job.type}</span>
          </Button>
        </Td>
      )}
    </Tr>
  );
}
