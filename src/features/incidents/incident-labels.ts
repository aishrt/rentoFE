import {
  BadgeAlert,
  Banknote,
  Car,
  CarFront,
  Clock,
  Droplets,
  Fuel,
  CircleHelp,
  Hammer,
  Siren,
  TicketX,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import type { IncidentStatus, IncidentType } from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';

export const INCIDENT_TYPES: { value: IncidentType; label: string; description: string; icon: LucideIcon }[] =
  [
    { value: 'ACCIDENT', label: 'Accident', description: 'A crash or collision, however small', icon: Siren },
    { value: 'BREAKDOWN', label: 'Breakdown', description: 'The car won’t start or go', icon: CarFront },
    {
      value: 'DAMAGE',
      label: 'Damage',
      description: 'Scratches, dents, chips or anything broken',
      icon: Hammer,
    },
    {
      value: 'THEFT',
      label: 'Theft',
      description: 'The car or something in it was stolen',
      icon: BadgeAlert,
    },
    {
      value: 'CLEANING',
      label: 'Cleaning',
      description: 'Returned dirty, or smelling of smoke',
      icon: Droplets,
    },
    {
      value: 'FUEL',
      label: 'Fuel or charge',
      description: 'Not returned as the fuel policy says',
      icon: Fuel,
    },
    {
      value: 'LATE_RETURN',
      label: 'Late return',
      description: 'The car came back late, or hasn’t yet',
      icon: Clock,
    },
    { value: 'NO_SHOW', label: 'No-show', description: 'The other side didn’t turn up', icon: UserX },
    { value: 'TOLL', label: 'Toll', description: 'An unpaid toll-road charge', icon: TicketX },
    { value: 'FINE', label: 'Fine', description: 'A parking or traffic infringement notice', icon: Banknote },
    { value: 'DISPUTE', label: 'Dispute', description: 'A disagreement you need help with', icon: Car },
    { value: 'OTHER', label: 'Something else', description: 'Anything not listed', icon: CircleHelp },
  ];

export const incidentTypeLabel = (type: IncidentType) =>
  INCIDENT_TYPES.find((option) => option.value === type)?.label ?? type;

/** Types that start with emergency guidance: 111, then the roadside number (plan §9, Days 20–21). */
export const EMERGENCY_TYPES: readonly IncidentType[] = ['ACCIDENT', 'THEFT', 'BREAKDOWN'];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, StatusLabel> = {
  OPEN: { label: 'Open', tone: 'waiting' },
  INVESTIGATING: { label: 'Being looked at', tone: 'waiting' },
  AWAITING_RESPONSE: { label: 'Waiting for you', tone: 'positive' },
  RESOLVED: { label: 'Resolved', tone: 'neutral' },
  CLOSED: { label: 'Closed', tone: 'ended' },
};
