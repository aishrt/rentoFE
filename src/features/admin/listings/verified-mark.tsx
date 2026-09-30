import { BadgeCheck, CircleDashed } from 'lucide-react';

/**
 * Whether an email address or mobile number is confirmed: a green tick, or a visible "Not verified",
 * so staff can't miss it. The tick's meaning is in words for screen readers.
 */
export function VerifiedMark({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex shrink-0 items-center align-middle" title="Verified">
        <BadgeCheck aria-hidden="true" className="size-4 text-success" />
        <span className="sr-only">(verified)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap text-muted">
      <CircleDashed aria-hidden="true" className="size-3.5" />
      Not verified
    </span>
  );
}
