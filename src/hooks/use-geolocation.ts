"use client";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Best-effort one-shot geolocation read. Resolves `null` (never rejects) on
 * unsupported browsers, denied permission, or timeout — callers decide what
 * to do with "no location" based on the organization's verification setting
 * (see lib/sla.ts / the LocationVerification enum). We never poll or watch
 * position continuously — see spec section 24: no continuous GPS tracking.
 */
export function requestGeolocationOnce(timeoutMs = 6000): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
