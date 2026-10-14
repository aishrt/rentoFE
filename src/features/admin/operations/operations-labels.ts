import type {
  Incident,
  IncidentChargeRequest,
  IncidentEvent,
  IncidentStatus,
  IncidentType,
  VerificationQueueItem,
} from '@/api/types';
import { VERIFICATION_LABELS } from '@/features/admin/ops/admin-labels';
import { LICENCE_CLASS_LABELS, type LicenceClass, type StatusLabel } from '@/features/booking/booking-format';

/*
 * Words for the verification queue and incident cases in the staff portal (plan §12.6). Guests and Hosts
 * see their own words for a case (features/incidents/incident-labels.ts); these are written for staff.
 */

export const personName = (person: Pick<VerificationQueueItem, 'firstName' | 'lastName'>) =>
  `${person.firstName} ${person.lastName}`;

// Stripe Identity's document types.
const DOCUMENT_TYPES: Record<string, string> = {
  passport: 'Passport',
  driving_license: 'Driver licence',
  id_card: 'ID card',
};

export function documentTypeLabel(type: string): string {
  const known = DOCUMENT_TYPES[type.toLowerCase()];
  if (known) return known;
  const words = type.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** What an overseas licence not in English comes with (plan §3). */
const ENGLISH_PROOF_LABELS: Record<string, string> = {
  IDP: 'International Driving Permit',
  APPROVED_TRANSLATION: 'Approved translation',
};

export const englishProofLabel = (proof: string) => ENGLISH_PROOF_LABELS[proof] ?? proof;

export const licenceClassLabel = (licenceClass: string) =>
  LICENCE_CLASS_LABELS[licenceClass as LicenceClass] ?? licenceClass;

export const verificationStatusLabel = (status: string) =>
  VERIFICATION_LABELS[status as keyof typeof VERIFICATION_LABELS] ?? status;

/** Case statuses as staff read them: "Waiting on them" is a Guest's or Host's "Waiting for you". */
export const STAFF_INCIDENT_STATUS: Record<IncidentStatus, StatusLabel> = {
  OPEN: { label: 'Open', tone: 'waiting' },
  INVESTIGATING: { label: 'Investigating', tone: 'waiting' },
  AWAITING_RESPONSE: { label: 'Waiting on them', tone: 'neutral' },
  RESOLVED: { label: 'Resolved', tone: 'positive' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'OPEN',
  'INVESTIGATING',
  'AWAITING_RESPONSE',
  'RESOLVED',
  'CLOSED',
];

export type EventVisibility = IncidentEvent['visibility'];

/** Who sees an update on a case. */
export const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  BOTH: 'Both parties',
  GUEST: 'Guest only',
  HOST: 'Host only',
  INTERNAL: 'Internal note',
};

export const VISIBILITY_HELP: Record<EventVisibility, string> = {
  BOTH: 'The Guest and the Host see it, and we let them know.',
  GUEST: 'Only the Guest sees it, and we let them know.',
  HOST: 'Only the Host sees it, and we let them know.',
  INTERNAL: 'Only staff see it. Nobody is told.',
};

export const EVENT_ACTION_WORDS: Record<string, string> = {
  OPENED: 'reported it',
  COMMENT: 'added an update',
  STATUS: 'changed the status',
  ASSIGNED: 'took the case',
  UNASSIGNED: 'unassigned the case',
  CHARGE_ADDED: 'added a charge',
};

/** What an event did, as words after who did it: handing a case on names who it went to. */
export const eventActionWords = (event: Pick<IncidentEvent, 'action' | 'assignedTo'>) =>
  event.action === 'ASSIGNED' && event.assignedTo
    ? `assigned it to ${event.assignedTo}`
    : (EVENT_ACTION_WORDS[event.action] ?? 'updated the case');

/** Who did something on a case, as a tag after their name. */
export const EVENT_BY_LABELS: Record<IncidentEvent['by'], string> = {
  YOU: 'Support',
  GUEST: 'Guest',
  HOST: 'Host',
  SUPPORT: 'Support',
};

export const REPORTED_BY_LABELS: Record<Incident['reportedBy'], string> = {
  GUEST: 'Guest',
  HOST: 'Host',
  SUPPORT: 'Support',
};

export type ChargeType = IncidentChargeRequest['type'];

/** What a resolved case can charge the Guest for, where the Guest Agreement allows (plan §8.1, item 11). */
export const CHARGE_TYPES: readonly { value: ChargeType; label: string }[] = [
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'FUEL', label: 'Fuel or charging' },
  { value: 'LATE_RETURN', label: 'Late return' },
  { value: 'TOLL', label: 'Toll' },
  { value: 'FINE', label: 'Fine' },
  { value: 'OTHER', label: 'Other' },
];

/** The charge type that matches the case, so a cleaning case starts on Cleaning. */
export const defaultChargeType = (type: IncidentType): ChargeType =>
  CHARGE_TYPES.find((option) => option.value === type)?.value ?? 'OTHER';

type ExtraCharge = Incident['extraCharges'][number];

export const extraChargeTypeLabel = (type: ExtraCharge['type']) =>
  type === 'EXTRA_KM'
    ? 'Extra kilometres'
    : (CHARGE_TYPES.find((option) => option.value === type)?.label ?? type);

export const CHARGE_STATUS: Record<ExtraCharge['status'], StatusLabel> = {
  PENDING: { label: 'Charging', tone: 'waiting' },
  SUCCEEDED: { label: 'Paid', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/** The API's limit for one charge: NZ$10,000. */
export const CHARGE_MAX_CENTS = 1_000_000;
