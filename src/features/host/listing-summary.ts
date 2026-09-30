import type { HostVehicle, PublicPolicies } from '@/api/types';
import { formatNzdFromCents } from '@/lib/format';
import { formatHours } from './availability-options';
import { BODY_TYPE_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, needsRuc } from './vehicle-labels';

/** "12 hours' notice", "1 day's notice". */
function noticeText(hours: number): string {
  if (hours === 0) return 'no notice needed';
  const text = formatHours(hours).toLowerCase();
  return `${text}${text.endsWith('s') ? "'" : "'s"} notice`;
}

/** One line about what each onboarding step holds, for the listing overview. */
export function stepSummary(vehicle: HostVehicle, step: number, policies?: PublicPolicies): string {
  switch (step) {
    case 1: {
      const parts = [
        [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' '),
        vehicle.bodyType && BODY_TYPE_LABELS[vehicle.bodyType],
        vehicle.fuelType && FUEL_LABELS[vehicle.fuelType],
        vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission],
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : 'Not started';
    }
    case 2: {
      const count = vehicle.documents.length;
      const waiting = vehicle.documents.filter((document) => document.status === 'PENDING').length;
      if (count === 0) return 'No documents yet';
      const ruc = needsRuc(vehicle.fuelType) && vehicle.rucValidToKm !== undefined ? ' · RUC recorded' : '';
      return `${count} ${count === 1 ? 'document' : 'documents'}${waiting ? `, ${waiting} waiting for review` : ''}${ruc}`;
    }
    case 3: {
      const photos = vehicle.photos.filter((photo) => photo.status !== 'REJECTED');
      const waiting = photos.filter((photo) => photo.status === 'PENDING').length;
      const retakes = vehicle.photos.length - photos.length;
      if (vehicle.photos.length === 0) return 'No photos yet';
      return [
        `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`,
        waiting && `${waiting} waiting for approval`,
        retakes && `${retakes} to retake`,
      ]
        .filter(Boolean)
        .join(', ');
    }
    case 4: {
      if (!vehicle.pricing) return 'No price yet';
      const tier = policies?.cancellation.tiers.find(
        (candidate) => candidate.code === vehicle.rules.cancellationTier,
      );
      return [
        `${formatNzdFromCents(vehicle.pricing.dailyCents)} a day`,
        vehicle.unlimitedKm
          ? 'Unlimited km'
          : vehicle.kmAllowancePerDay && `${vehicle.kmAllowancePerDay} km a day`,
        tier && `${tier.name} cancellation`,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 5:
      return [
        vehicle.rules.instantBook ? 'Instant Book' : 'Requests to book',
        noticeText(vehicle.rules.minNoticeHours),
        vehicle.rules.bufferHours === 0
          ? 'no gap between trips'
          : `${formatHours(vehicle.rules.bufferHours).toLowerCase()} between trips`,
      ].join(' · ');
    case 6: {
      const pickup = vehicle.deliveryOptions.find((option) => option.type === 'PICKUP');
      if (!pickup) return 'No pickup location yet';
      const extras = [
        vehicle.deliveryOptions.some((option) => option.type === 'AIRPORT') && 'airport delivery',
        vehicle.deliveryOptions.some((option) => option.type === 'DELIVERY') && 'delivery',
        vehicle.deliveryOptions.some((option) => option.type === 'CUSTOM') && 'delivery points',
      ].filter(Boolean);
      return `Pickup in ${pickup.label}${extras.length ? ` · ${extras.join(', ')}` : ''}`;
    }
    default:
      return '';
  }
}

/** The checklist's missing items, grouped by the step they belong to, in step order. */
export function missingByStep(vehicle: HostVehicle): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const item of [...vehicle.checklist.missing].sort((a, b) => a.step - b.step)) {
    groups.set(item.step, [...(groups.get(item.step) ?? []), item.message]);
  }
  return groups;
}

/** The cover photo: the front if there is one, else the first not rejected. */
export function coverPhoto(vehicle: HostVehicle): string | undefined {
  const usable = vehicle.photos.filter((photo) => photo.status !== 'REJECTED');
  return (usable.find((photo) => photo.type === 'FRONT') ?? usable[0])?.url;
}
