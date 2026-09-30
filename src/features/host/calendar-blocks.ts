import type { CalendarBlock } from '@/api/types';
import { BLOCK_REASON_LABELS, type BlockReason } from './vehicle-labels';

/*
 * How each kind of block looks on the Host calendar (plan §9, Days 10–11). Trips are the brand blue, a
 * request waiting for the Host is pale blue, the Host's own blocks are ink, weekly times are a light tint,
 * preparation time is dashed, and staff blocks are red. Every text colour pair passes AA (UI_SYSTEM.md).
 */
export const BLOCK_TONES: Record<BlockReason, string> = {
  BOOKED: 'bg-primary text-surface',
  HOLD: 'bg-accent text-primary',
  HOST_BLOCK: 'bg-ink text-canvas',
  RECURRING: 'bg-ink/10 text-ink',
  BUFFER: 'border border-dashed border-muted/60 bg-surface text-muted',
  ADMIN: 'bg-danger text-surface',
};

/** The legend's order: trips first, then what the Host and our team set. */
export const LEGEND_ORDER: readonly BlockReason[] = [
  'BOOKED',
  'HOLD',
  'HOST_BLOCK',
  'RECURRING',
  'BUFFER',
  'ADMIN',
];

/** The short label on a block: the guest and booking for trips, or what it is. */
export function blockLabel(block: CalendarBlock): string {
  switch (block.reason) {
    case 'BOOKED':
      return block.booking ? `${block.booking.guestFirstName} · ${block.booking.ref}` : 'Booked';
    case 'HOLD':
      return block.booking ? `Request pending · ${block.booking.guestFirstName}` : 'Request pending';
    case 'HOST_BLOCK':
      return block.note ? `Blocked · ${block.note}` : 'Blocked by you';
    case 'RECURRING':
      return 'Unavailable (weekly)';
    case 'BUFFER':
      return 'Preparation time';
    case 'ADMIN':
      return 'Blocked by Rento Vroom';
  }
}

export const reasonLabel = (reason: BlockReason) => BLOCK_REASON_LABELS[reason];

/** Only the Host's own blocks can be removed here; trips, requests and staff blocks can't. */
export const isRemovable = (block: CalendarBlock) => block.reason === 'HOST_BLOCK';
