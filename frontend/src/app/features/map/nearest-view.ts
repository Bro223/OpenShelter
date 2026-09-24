import { signal } from '@angular/core';
import type { MessageKey } from '../../core/i18n/messages';
import type { ShelterDto } from '../../core/models';
import type { LeafletService } from '../../shared/leaflet-service';
import {
  getCurrentPositionHighAccuracy,
  GeolocationError,
  type GeolocationFailureKind,
  haversineKm,
} from '../../shared/geolocation';

/** Regional scale for the around-you fly: the camera shows the
 *  NEIGHBOURHOOD around the user's own position — never a single
 *  shelter's street. The user surveys the surroundings and picks; the
 *  nearest shelter is the action's RESULT (the one-line state), not the
 *  fly's destination. */
const AROUND_ZOOM = 14;

/** Message keys for the "Nearest shelter" action's inline errors,
 *  resolved through the `t` pipe in the template. The vocabulary
 *  mirrors the /submit geolocation errors; the two pages keep divergent
 *  copy on purpose (the browse page has no map-pick or link fallback,
 *  only a retry). */
const NEAREST_KEY: Record<GeolocationFailureKind, MessageKey> = {
  denied: 'map.nearest.denied',
  timeout: 'map.nearest.timeout',
  unsupported: 'map.nearest.unsupported',
  unavailable: 'map.nearest.unavailable',
  insecure: 'map.nearest.insecure',
};

/** The closest row to a point (null for an empty list) + its distance.
 *  The point is an ORIGIN (the user's geolocation fix or the geocoded
 *  address anchor); the distance is the Haversine straight line to the
 *  row's coordinates — client-side over already-loaded rows, never a
 *  route claim. */
export function nearestShelterAt(
  latitude: number,
  longitude: number,
  rows: ShelterDto[],
): { row: ShelterDto; km: number } | null {
  let best: ShelterDto | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const km = haversineKm(latitude, longitude, row.latitude, row.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  return best === null ? null : { row: best, km: bestKm };
}

/**
 * The "Nearest shelter" action: a high-accuracy geolocation request
 * (the shared mechanism, shared/geolocation.ts), then the closest
 * shelter computed CLIENT-SIDE from the already-loaded list — no
 * backend call. On success: the map flies to the USER'S OWN POSITION at
 * regional scale and NO row is selected, emphasized or scrolled to —
 * the nearest shelter stays the action's result (the one-line state
 * under the CTA), and the list sorts by straight-line distance to the
 * user's position while it is set. On failure: per-error copy; the list
 * and the map stay untouched.
 *
 * A state object, not a component: the CTA's rendering (including the
 * authenticated-only offer) is the page's template, and a failed retry
 * must clear the last success up front so the stale result line never
 * renders beside the error.
 */
export class NearestView {
  /** True while the geolocation request is in flight (CTA pending). */
  readonly locating = signal(false);
  /** The nearest shelter (last success) — drives the one-line result
   *  under the CTA and the distance sort. It carries NO row emphasis:
   *  the list must not focus a single shelter. */
  readonly nearest = signal<ShelterDto | null>(null);
  /** The Haversine distance to the nearest shelter in km (last
   *  success) — shown as "≈ … straight line". Moves as one with
   *  `nearest` (cleared with it everywhere). */
  readonly nearestKm = signal<number | null>(null);
  /** The user's position from the last around-you success (null =
   *  none). While set, the sidebar list sorts by straight-line
   *  distance to it — the ranking the action promises. A manual
   *  selection does NOT clear it (the position stays true); a new
   *  around-you run replaces it. */
  readonly userPosition = signal<{ latitude: number; longitude: number } | null>(null);
  /** The loaded list was empty when the action ran — the "add the first
   *  one" offer (with the /submit link for authenticated users). */
  readonly nearestEmpty = signal(false);
  /** The last locate failure's message key (null = none). It describes
   *  the user's BROWSER, not the list: a list refetch keeps it. */
  readonly nearestError = signal<MessageKey | null>(null);

  constructor(
    private readonly deps: {
      /** The list the gateway last loaded (the UNFILTERED-by-client view). */
      rows: () => ShelterDto[];
      /** The list is loading or failed — an offer state would mislead. */
      busy: () => boolean;
      leaflet: LeafletService;
    },
  ) {}

  findNearest(): void {
    if (this.locating() || this.deps.busy()) {
      return; // busy, or the list itself is loading/failed — an offer state would mislead
    }
    // Drop the LAST SUCCESS up front — a failed retry must not leave the
    // stale "Nearest: X" line rendered next to the error.
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.nearestError.set(null);
    this.nearestEmpty.set(false);
    if (this.deps.rows().length === 0) {
      // Nothing loaded — nothing to measure against. The offer copy (with
      // the /submit link for authenticated users) renders from nearestEmpty.
      this.nearestEmpty.set(true);
      return;
    }
    this.locating.set(true);
    void getCurrentPositionHighAccuracy().then(
      (coords) => {
        this.locating.set(false);
        this.focusNearestShelter(coords.latitude, coords.longitude);
      },
      (failure: unknown) => {
        this.locating.set(false);
        // List and map are untouched.
        const kind = failure instanceof GeolocationError ? failure.kind : 'unavailable';
        this.nearestError.set(NEAREST_KEY[kind]);
      },
    );
  }

  /**
   * Around-you success: the nearest shelter over the loaded list is the
   * action's RESULT (the one-line state), and the camera flies to the
   * user's OWN position at regional scale — NOT to the nearest shelter;
   * no row is selected, emphasized or scrolled to (the list stays
   * unfocused, distance-sorted via `userPosition`).
   */
  private focusNearestShelter(latitude: number, longitude: number): void {
    const hit = nearestShelterAt(latitude, longitude, this.deps.rows());
    if (hit === null) {
      // The list may have emptied (and failed to load) while the locate
      // was in flight — the error banner is the state; offering "add the
      // first one" beside it would mislead.
      if (!this.deps.busy()) {
        this.nearestEmpty.set(true);
      }
      return;
    }
    this.nearest.set(hit.row);
    this.nearestKm.set(hit.km);
    this.userPosition.set({ latitude, longitude });
    this.deps.leaflet.flyTo(latitude, longitude, AROUND_ZOOM);
  }

  /**
   * Clear the result line — an interaction outside the action supersedes
   * it (a row/marker selection, a search selection). The temporary
   * result clears on the next interaction; the user's position (the
   * distance sort) is untouched.
   */
  supersede(): void {
    this.nearest.set(null);
    this.nearestKm.set(null);
  }
}
