import { MapPin } from 'lucide-react';
import { useState } from 'react';
import type { VehicleDetail } from '@/api/types';
import { ListingSection } from './listing-section';
import { placeLine } from './vehicle-format';

/** Stands in for the map until Google is set up: a quiet sketch of streets with the area shaded. */
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
 * Where the car is (spec §6, §22): the suburb and an approximate area, never the address. The API serves
 * the map (a Maps Static API image with the area shaded, never a pin), so no Google key is in the website.
 * Without one (`mapUrl` null), or when Google refuses the image, a sketch. The exact address comes once
 * the booking is confirmed.
 */
export function LocationMap({ vehicle }: { vehicle: VehicleDetail }) {
  const area = placeLine(vehicle.location);
  const { mapUrl } = vehicle.location;
  const [mapFailed, setMapFailed] = useState(false);

  return (
    <ListingSection id="location" title="Location">
      <figure>
        <div className="relative aspect-video overflow-hidden rounded-card border border-line/80 bg-canvas shadow-card">
          {mapUrl && !mapFailed ? (
            <img
              src={mapUrl}
              alt={`Map of the area around ${area || 'the car'}`}
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
              onError={() => setMapFailed(true)}
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
