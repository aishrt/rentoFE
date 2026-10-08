/* The car diagram's parts, for marking and reading out damage (spec §14). */

/** Parts of the car, for marking damage without a pointer: each is a spot on the diagram. */
export const CAR_AREAS = [
  { label: 'Front bumper', x: 50, y: 6 },
  { label: 'Bonnet', x: 50, y: 20 },
  { label: 'Windscreen', x: 50, y: 33 },
  { label: 'Roof', x: 50, y: 52 },
  { label: 'Rear window', x: 50, y: 74 },
  { label: 'Boot', x: 50, y: 85 },
  { label: 'Rear bumper', x: 50, y: 95 },
  { label: 'Front left (passenger) door', x: 20, y: 44 },
  { label: 'Rear left (passenger) door', x: 20, y: 62 },
  { label: 'Front right (driver) door', x: 80, y: 44 },
  { label: 'Rear right (driver) door', x: 80, y: 62 },
  { label: 'Front left wheel', x: 13, y: 22 },
  { label: 'Front right wheel', x: 87, y: 22 },
  { label: 'Rear left wheel', x: 13, y: 79 },
  { label: 'Rear right wheel', x: 87, y: 79 },
] as const;

/** The nearest named part of the car to a spot, for reading a pin out. */
export function areaName(x: number, y: number): string {
  let best: (typeof CAR_AREAS)[number] = CAR_AREAS[0];
  let distance = Infinity;
  for (const area of CAR_AREAS) {
    const d = (area.x - x) ** 2 + (area.y - y) ** 2;
    if (d < distance) {
      best = area;
      distance = d;
    }
  }
  return best.label;
}
