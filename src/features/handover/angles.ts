import type { InspectionAngle } from '@/api/types';
import { formatNzDateTimeWithYear } from '@/features/booking/booking-format';
import type { PhotoType } from '@/features/host/vehicle-labels';

/* What each inspection photo shows, and how to take it (plan §12.6, Inspection). */

export const ANGLE_LABELS: Record<InspectionAngle, string> = {
  FRONT: 'Front',
  REAR: 'Rear',
  DRIVER_SIDE: 'Driver side',
  PASSENGER_SIDE: 'Passenger side',
  WHEELS: 'Wheels',
  WINDSCREEN: 'Windscreen',
  INTERIOR: 'Interior',
  DASHBOARD: 'Dashboard',
  DAMAGE: 'Damage',
};

export const ANGLE_HINTS: Record<InspectionAngle, string> = {
  FRONT: 'Stand back so the whole front is in the photo, number plate included.',
  REAR: 'The whole back of the car, with the number plate.',
  DRIVER_SIDE: 'The right-hand side, front to back, from a few steps away.',
  PASSENGER_SIDE: 'The left-hand side, front to back, from a few steps away.',
  WHEELS: 'Close up on a wheel and tyre, to show the rims and tread.',
  WINDSCREEN: 'The windscreen from the front, to show any chips or cracks.',
  INTERIOR: 'The front and back seats, from the open driver’s door.',
  DASHBOARD: 'With the car on: the odometer and the fuel or charge level must be readable.',
  DAMAGE: 'Close up on the damage, with something nearby for scale.',
};

/** The listing photos' example drawing that fits each inspection angle. */
export const ANGLE_DRAWINGS: Record<InspectionAngle, PhotoType> = {
  FRONT: 'FRONT',
  REAR: 'REAR',
  DRIVER_SIDE: 'DRIVER',
  PASSENGER_SIDE: 'PASSENGER',
  WHEELS: 'TYRES',
  WINDSCREEN: 'FRONT',
  INTERIOR: 'INTERIOR',
  DASHBOARD: 'DASH',
  DAMAGE: 'DAMAGE',
};

/** "Taken Mon, 12 Oct 2026, 10:04 am": the capture time shown on every photo (plan §12.6). */
export const takenLabel = (iso: string) => `Taken ${formatNzDateTimeWithYear(iso)}`;

const HOUR_MS = 60 * 60 * 1000;

/**
 * "Photo taken earlier: Mon, 5 Jan 2026, 9:30 am" when the date a photo carries (its EXIF date) is more than
 * an hour from when it came into the inspection, so an old gallery photo can't pass for a new one (plan §3,
 * conditionReports). A camera clock ahead says "dated later" instead. Null when there's nothing to say.
 */
export function photoDateNote(photo: { takenAt: string; exifTakenAt?: string }): string | null {
  if (!photo.exifTakenAt) return null;
  const gap = new Date(photo.exifTakenAt).getTime() - new Date(photo.takenAt).getTime();
  if (!(Math.abs(gap) > HOUR_MS)) return null;
  const when = formatNzDateTimeWithYear(photo.exifTakenAt);
  return gap < 0 ? `Photo taken earlier: ${when}` : `Photo dated later: ${when}`;
}
