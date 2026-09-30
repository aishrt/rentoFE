import { MapPin } from 'lucide-react';
import type { VehicleDetail } from '@/api/types';
import { colors } from '@/styles/tokens';
import { ListingSection } from './listing-section';
import { placeLine } from './vehicle-format';

type Approx = NonNullable<VehicleDetail['location']['approx']>;

/** The browser key for the Maps Static API, restricted to our domain. Unset until the client's Google account arrives. */
const MAPS_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || undefined;

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Points around the circle, "lat,lng|lat,lng|…", for the static map's shaded area. */
function circlePath({ lat, lng, radiusM }: Approx, points = 48): string {
  const distance = radiusM / EARTH_RADIUS_M;
  const latR = toRadians(lat);
  const lngR = toRadians(lng);
  return Array.from({ length: points + 1 }, (_, index) => {
    const bearing = (index / points) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(distance) + Math.cos(latR) * Math.sin(distance) * Math.cos(bearing),
    );
    const lng2 =
      lngR +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(latR),
        Math.cos(distance) - Math.sin(latR) * Math.sin(lat2),
      );
    return `${toDegrees(lat2).toFixed(5)},${toDegrees(lng2).toFixed(5)}`;
  }).join('|');
}

/** A zoom where the circle fills about a third of the map's height. */
function zoomFor({ lat, radiusM }: Approx): number {
  const metresPerPixel = radiusM / 60;
  const zoom = Math.log2((156_543.03 * Math.cos(toRadians(lat))) / metresPerPixel);
  return Math.max(8, Math.min(15, Math.floor(zoom)));
}

/** A Maps Static API image of the area as a shaded circle: never a pin (plan §1.2, spec §22). */
function staticMapUrl(approx: Approx, key: string): string {
  const blue = colors.primary.replace('#', '0x');
  const params = new URLSearchParams({
    center: `${approx.lat},${approx.lng}`,
    zoom: String(zoomFor(approx)),
    size: '640x360',
    scale: '2',
    maptype: 'roadmap',
    key,
  });
  params.append('path', `color:${blue}B3|weight:2|fillcolor:${blue}2E|${circlePath(approx)}`);
  params.append('style', 'feature:poi|visibility:off');
  params.append('style', 'feature:transit|visibility:off');
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Stands in for the map until the Google key arrives: a quiet sketch of streets with the area shaded. */
function MapSketch() {
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="size-full">
      <rect width="640" height="360" className="fill-canvas" />
      <path d="M-20 290 C120 250 170 300 300 270 S520 190 660 220 V380 H-20 Z" className="fill-primary/6" />
      <g className="fill-none stroke-line" strokeWidth="1.5">
        <path d="M-10 70 C120 40 220 110 360 80 S560 30 650 60" />
        <path d="M-10 130 C140 100 250 170 380 140 S560 100 650 120" />
        <path d="M-10 200 C100 190 220 230 350 205 S540 160 650 185" />
      </g>
      <g className="fill-none stroke-surface" strokeLinecap="round">
        <path d="M-10 250 L200 160 L420 190 L650 90" strokeWidth="14" />
        <path d="M150 -10 L240 380" strokeWidth="10" />
        <path d="M470 -10 C440 120 520 220 470 380" strokeWidth="10" />
      </g>
      <g className="fill-none stroke-ink/12" strokeLinecap="round">
        <path d="M-10 250 L200 160 L420 190 L650 90" strokeWidth="2" />
        <path d="M150 -10 L240 380" strokeWidth="1.5" />
        <path d="M470 -10 C440 120 520 220 470 380" strokeWidth="1.5" />
      </g>
      <circle cx="320" cy="180" r="96" className="fill-primary/14 stroke-primary/60" strokeWidth="2" />
      <circle cx="320" cy="180" r="96" className="fill-none stroke-primary/25" strokeWidth="14" />
    </svg>
  );
}

/**
 * Where the car is (spec §6, §22): the suburb and an approximate area, never the address. With the Maps
 * Static API key set, a real map with the area shaded; otherwise a sketch. The exact address comes once
 * the booking is confirmed.
 */
export function LocationMap({ vehicle }: { vehicle: VehicleDetail }) {
  const area = placeLine(vehicle.location);
  const approx = vehicle.location.approx;

  return (
    <ListingSection id="location" title="Location">
      <figure>
        <div className="relative aspect-video overflow-hidden rounded-card border border-line/80 bg-canvas shadow-card">
          {approx && MAPS_KEY ? (
            <img
              src={staticMapUrl(approx, MAPS_KEY)}
              alt={`Map of the area around ${area || 'the car'}`}
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
              className="size-full object-cover"
            />
          ) : (
            <MapSketch />
          )}
          {area && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-sm font-medium text-ink shadow-card">
              <MapPin aria-hidden="true" className="size-4 text-primary" />
              {area}
            </span>
          )}
        </div>
        <figcaption className="mt-3 text-sm text-muted">
          <span className="font-medium text-ink">Approximate area: {area || 'shared after booking'}.</span>{' '}
          The exact address is shared once your booking is confirmed.
        </figcaption>
      </figure>
    </ListingSection>
  );
}
