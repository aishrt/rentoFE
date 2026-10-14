import { CircleCheck, CircleX, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  DOCUMENT_STATUS_LABELS,
  HOST_STATUS_LABELS,
  PHOTO_STATUS_LABELS,
  VEHICLE_STATUS_LABELS,
  hostStatusLabel,
  type HostStatus,
  type Photo,
  type QueueHostStatus,
  type VehicleDocument,
  type VehicleStatus,
} from './listing-labels';

/**
 * How far along a review is: waiting for staff, done, refused, or quiet (nothing for staff to do).
 * Success green is too light for text (UI_SYSTEM.md, WCAG pairs), so it only colours the tick.
 */
export type ReviewTone = 'waiting' | 'done' | 'refused' | 'quiet';

const tones: Record<
  ReviewTone,
  { variant: 'primary' | 'neutral' | 'outline'; className?: string; icon: ReactNode }
> = {
  waiting: { variant: 'primary', icon: <Clock aria-hidden="true" /> },
  done: { variant: 'neutral', icon: <CircleCheck aria-hidden="true" className="text-success" /> },
  refused: { variant: 'neutral', className: 'bg-danger/8 text-danger', icon: <CircleX aria-hidden="true" /> },
  quiet: { variant: 'outline', icon: null },
};

export function ReviewBadge({
  tone,
  children,
  className,
}: {
  tone: ReviewTone;
  children: ReactNode;
  className?: string;
}) {
  const style = tones[tone];
  return (
    <Badge variant={style.variant} className={cn('whitespace-nowrap', style.className, className)}>
      {style.icon}
      {children}
    </Badge>
  );
}

const vehicleTones: Record<VehicleStatus, ReviewTone> = {
  DRAFT: 'quiet',
  UNDER_REVIEW: 'waiting',
  CHANGES_REQUESTED: 'quiet',
  REJECTED: 'refused',
  ACTIVE: 'done',
  INACTIVE: 'done',
  SUSPENDED: 'refused',
};

/** An approved listing out of search until its Host sets up payouts (plan §8.2) says so. */
export function VehicleStatusBadge({
  status,
  waitingForPayouts = false,
}: {
  status: VehicleStatus;
  waitingForPayouts?: boolean;
}) {
  if (waitingForPayouts && status === 'ACTIVE') {
    return <ReviewBadge tone="waiting">Waiting for payout setup</ReviewBadge>;
  }
  return <ReviewBadge tone={vehicleTones[status]}>{VEHICLE_STATUS_LABELS[status]}</ReviewBadge>;
}

const hostTones: Record<HostStatus, ReviewTone> = {
  APPLIED: 'waiting',
  APPROVED: 'done',
  REJECTED: 'refused',
  SUSPENDED: 'refused',
};

export function HostStatusBadge({ status }: { status: QueueHostStatus }) {
  return (
    <ReviewBadge tone={status ? hostTones[status] : 'quiet'}>
      {status ? HOST_STATUS_LABELS[status] : hostStatusLabel(status)}
    </ReviewBadge>
  );
}

const fileTones: Record<Photo['status'] | VehicleDocument['status'], ReviewTone> = {
  PENDING: 'waiting',
  APPROVED: 'done',
  VERIFIED: 'done',
  REJECTED: 'refused',
};

export function PhotoStatusBadge({ status }: { status: Photo['status'] }) {
  return <ReviewBadge tone={fileTones[status]}>{PHOTO_STATUS_LABELS[status]}</ReviewBadge>;
}

export function DocumentStatusBadge({ status }: { status: VehicleDocument['status'] }) {
  return <ReviewBadge tone={fileTones[status]}>{DOCUMENT_STATUS_LABELS[status]}</ReviewBadge>;
}
