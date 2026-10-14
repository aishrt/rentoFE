import { CircleAlert, CircleCheck, CircleDashed, CircleX, Clock, EyeOff, PencilLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  DOCUMENT_STATUS_LABELS,
  PHOTO_STATUS_LABELS,
  VEHICLE_STATUS_LABELS,
  type VehicleDocument,
  type VehiclePhoto,
  type VehicleStatus,
} from './vehicle-labels';

/*
 * Status badges for the Host's cars, photos and documents. Success green and warning amber are too light
 * for text (UI_SYSTEM.md, WCAG pairs), so they only colour the icon; the words stay ink or primary.
 */

type Tone = 'quiet' | 'waiting' | 'attention' | 'done' | 'refused' | 'off';

const tones: Record<
  Tone,
  { variant: 'primary' | 'neutral' | 'outline'; className?: string; icon: ReactNode }
> = {
  quiet: { variant: 'outline', icon: <PencilLine aria-hidden="true" /> },
  waiting: { variant: 'primary', icon: <Clock aria-hidden="true" /> },
  attention: {
    variant: 'neutral',
    className: 'bg-warning/15',
    icon: <CircleAlert aria-hidden="true" className="text-warning" />,
  },
  done: {
    variant: 'neutral',
    className: 'bg-success/10',
    icon: <CircleCheck aria-hidden="true" className="text-success" />,
  },
  refused: { variant: 'neutral', className: 'bg-danger/8 text-danger', icon: <CircleX aria-hidden="true" /> },
  off: { variant: 'outline', icon: <EyeOff aria-hidden="true" /> },
};

function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const style = tones[tone];
  return (
    <Badge variant={style.variant} className={cn('whitespace-nowrap', style.className, className)}>
      {style.icon}
      {children}
    </Badge>
  );
}

const vehicleTones: Record<VehicleStatus, Tone> = {
  DRAFT: 'quiet',
  UNDER_REVIEW: 'waiting',
  CHANGES_REQUESTED: 'attention',
  REJECTED: 'refused',
  ACTIVE: 'done',
  INACTIVE: 'off',
  SUSPENDED: 'refused',
};

/** An approved car waiting for its Host's payout setup isn't live yet (plan §8.2), so it says so. */
export function VehicleStatusBadge({
  status,
  waitingForPayouts = false,
  className,
}: {
  status: VehicleStatus;
  waitingForPayouts?: boolean;
  className?: string;
}) {
  if (waitingForPayouts && status === 'ACTIVE') {
    return (
      <StatusBadge tone="waiting" className={className}>
        Waiting for payout setup
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone={vehicleTones[status]} className={className}>
      {VEHICLE_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

const fileTones: Record<VehiclePhoto['status'] | VehicleDocument['status'], Tone> = {
  PENDING: 'waiting',
  APPROVED: 'done',
  VERIFIED: 'done',
  REJECTED: 'refused',
};

export function PhotoStatusBadge({
  status,
  className,
}: {
  status: VehiclePhoto['status'];
  className?: string;
}) {
  return (
    <StatusBadge tone={fileTones[status]} className={className}>
      {PHOTO_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

export function DocumentStatusBadge({ status }: { status: VehicleDocument['status'] }) {
  return <StatusBadge tone={fileTones[status]}>{DOCUMENT_STATUS_LABELS[status]}</StatusBadge>;
}

/** "Required" or "Optional" beside a document or photo angle. */
export function RequirementBadge({ required }: { required: boolean }) {
  return required ? (
    <Badge variant="primary">Required</Badge>
  ) : (
    <Badge variant="outline">
      <CircleDashed aria-hidden="true" />
      Optional
    </Badge>
  );
}
