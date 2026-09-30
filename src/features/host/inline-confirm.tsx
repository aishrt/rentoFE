import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface InlineConfirmProps {
  /** The first button, e.g. "Remove". */
  label: string;
  /** Its accessible name when the visible label is short, e.g. "Remove the WOF". */
  ariaLabel?: string;
  /** The question beside the confirm button, e.g. "Remove this photo?". */
  question: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
}

/**
 * A small destructive action that asks once, in place: "Remove" turns into "Remove this photo? Yes, remove ·
 * Cancel". Quicker than a dialog on a phone, and still hard to press by accident.
 */
export function InlineConfirm({
  label,
  ariaLabel,
  question,
  confirmLabel = 'Yes, remove',
  onConfirm,
  pending,
}: InlineConfirmProps) {
  const [asking, setAsking] = useState(false);

  if (!asking && !pending) {
    return (
      <Button variant="ghost" size="sm" aria-label={ariaLabel} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex animate-fade-in flex-wrap items-center gap-2">
      <span className="text-sm text-ink">{question}</span>
      <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  );
}
