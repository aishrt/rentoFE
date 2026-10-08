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
