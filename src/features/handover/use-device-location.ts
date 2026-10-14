import { useEffect, useState } from 'react';

/** Where the device is, kept with each inspection photo (plan §3, conditionReports.photos lat and lng). */
export interface DeviceLocation {
  lat: number;
  lng: number;
}

/** Long enough for a phone's first fix outdoors; the inspection carries on meanwhile either way. */
const TIMEOUT_MS = 10_000;
/** A fix from the last few minutes is as good: the car hasn't moved. */
const MAX_AGE_MS = 5 * 60_000;
/** Five decimal places: about a metre, plenty to show where the handover happened. */
const round = (degrees: number) => Math.round(degrees * 100_000) / 100_000;

/**
 * Asks for the device's location once, when an inspection starts. It never holds the inspection up: when
 * the person says no, the browser can't tell or it takes too long, the photos simply go without it.
 */
export function useDeviceLocation(): DeviceLocation | null {
  const [location, setLocation] = useState<DeviceLocation | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!cancelled) setLocation({ lat: round(coords.latitude), lng: round(coords.longitude) });
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
      );
    } catch {
      // Some browsers throw rather than call back, e.g. on a page that isn't secure.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
