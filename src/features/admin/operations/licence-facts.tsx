import { useMutation } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { fetchLicenceNumber } from './operations-api';

const linkButton =
  'inline-flex items-center gap-1 rounded-inner font-medium text-primary hover:underline disabled:opacity-60';

/**
 * A licence number as staff see it (plan §14): its last characters, and the full number only when they ask,
 * to check the licence by hand. The API writes each showing to the audit log, so the number is fetched
 * afresh every time and forgotten when it's hidden.
 */
export function LicenceNumber({ userId, numberEnding }: { userId: string; numberEnding: string }) {
  const [number, setNumber] = useState<string | null>(null);
  const reveal = useMutation({ mutationFn: () => fetchLicenceNumber(userId), onSuccess: setNumber });

  if (number) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono font-medium tracking-wide text-ink">{number}</span>
        <button type="button" className={linkButton} onClick={() => setNumber(null)}>
          <EyeOff aria-hidden="true" className="size-4" />
          Hide number
        </button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {numberEnding ? (
        <span className="tabular-nums">{`Ending ${numberEnding}`}</span>
      ) : (
        <span className="text-muted">Not given</span>
      )}
      <button
        type="button"
        className={linkButton}
        disabled={reveal.isPending}
        aria-busy={reveal.isPending || undefined}
        onClick={() => reveal.mutate()}
      >
        {reveal.isPending ? <Spinner className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        Show full number
      </button>
      {reveal.isError && (
        <span role="alert" className="basis-full text-danger">
          {reveal.error.message}
        </span>
      )}
    </span>
  );
}

/**
 * Whether what Stripe read from the ID matched the account: a tick, or a warning staff can't miss. The
 * words say it for everyone, not only the icon's colour.
 */
export function DocumentMatch({ matched }: { matched: boolean }) {
  return matched ? (
    <span className="inline-flex items-center gap-1.5 text-ink">
      <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
      Matches
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-medium text-danger">
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      Doesn’t match
    </span>
  );
}
