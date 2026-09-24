/**
 * Shared geolocation mechanics: the one-shot high-accuracy position
 * request the map "Nearest shelter" CTA and the detail page's "Distance
 * from you" action both run, the Geolocation error-code mapping, and the
 * Haversine distance both pages compute client-side (the "no new
 * endpoint" precedent).
 *
 * Stays page-local on purpose: the per-page
 * FAILURE COPY. The map page maps the failure kinds to i18n message keys
 * (its NEAREST_KEY) and the detail page to plain copy (its DISTANCE_COPY)
 * — their trailing alternatives differ, so each page keeps its own
 * documented mirror. This module owns the mechanism + mapping + math only,
 * never the copy.
 */

/** The failure kinds of a one-shot geolocation request: the API's error
 *  codes (denied / timeout / unavailable) plus the two "cannot run here"
 *  preconditions (insecure context, no geolocation API). */
export type GeolocationFailureKind =
  'insecure' | 'unsupported' | 'denied' | 'timeout' | 'unavailable';

/** A failed geolocation request, typed by kind. */
export class GeolocationError extends Error {
  constructor(readonly kind: GeolocationFailureKind) {
    super(kind);
  }
}

/** The request options every shared position call sends. The /submit page
 *  sends the same shape inline, and its spec pins the literal
 *  (submit-shelter-page.spec.ts's toHaveBeenCalledWith), so a change here
 *  must move that pin. */
const HIGH_ACCURACY_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * Map a GeolocationPositionError to its kind: 1 = denied, 3 = timeout,
 * everything else = unavailable (code 2, the catch-all). Duck-typed read —
 * jsdom does not define GeolocationPositionError, and a non-numeric (or
 * missing) code is "unavailable".
 */
function geolocationErrorKind(error: unknown): 'denied' | 'timeout' | 'unavailable' {
  const candidate =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  const code = typeof candidate === 'number' ? candidate : 2;
  if (code === 1) {
    return 'denied';
  }
  if (code === 3) {
    return 'timeout';
  }
  return 'unavailable';
}

/**
 * One-shot high-accuracy position, as a Promise: resolves with the
 * coordinates; rejects with a GeolocationError when the request cannot run
 * here ('insecure' — not a secure context, 'unsupported' — no
 * navigator.geolocation) or when it fails (the mapped error code). The
 * secure-context and API guards run BEFORE any geolocation call (a non-
 * secure context must never reach the API — the map page spec pins it).
 */
export function getCurrentPositionHighAccuracy(): Promise<GeolocationCoordinates> {
  if (window.isSecureContext === false) {
    return Promise.reject(new GeolocationError('insecure'));
  }
  const geolocation = navigator.geolocation;
  // jsdom leaves navigator.geolocation undefined — `!` covers null AND
  // undefined.
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.reject(new GeolocationError('unsupported'));
  }
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(new GeolocationError(geolocationErrorKind(error))),
      HIGH_ACCURACY_POSITION_OPTIONS,
    );
  });
}

/** Great-circle distance in kilometres (Haversine) — the client-side
 *  distance computation the map's nearest-shelter + address-anchor ranking
 *  and the detail page's distance-from-you line both run. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
