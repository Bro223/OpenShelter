import { signal } from '@angular/core';
import type { MessageKey } from '../../core/i18n/messages';
import type { GeocodeResult, ShelterDto } from '../../core/models';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { toApiError } from '../../core/api-error';
import { haversineKm } from '../../shared/geolocation';

/** The inline states of the address search. The copy mirrors the
 *  /submit page's own key table rather than sharing it: the two pages
 *  keep divergent copy on purpose (the browse page's alternative is the
 *  geolocation CTA — it has no map-pick or link fallback). A failed
 *  search changes nothing else: no anchor, no pin, list untouched. */
export type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

/** Message keys for the inline address-search failures, resolved
 *  through the `t` pipe in the template. */
const GEOCODE_ERROR_KEY: Record<GeocodeErrorKind, MessageKey> = {
  'no-results': 'map.geocode.noResults',
  'rate-limited': 'map.geocode.rateLimited',
  network: 'map.geocode.network',
};

/**
 * The address search and its active browse anchor: the search input's
 * content, the one-deliberate-request Nominatim search (no autosuggest —
 * the usage policy), the ≤5 result list, and the selected result's point
 * — while an anchor is set, every row carries its straight-line distance
 * from that point and the list sorts by it (the name sort is the
 * tiebreak); Clear restores the name sort.
 *
 * A state object, not a component: the camera is the page's (a selection
 * flies to the searched point at neighbourhood scale, a Clear drops the
 * pin), and the search-selection focus — selecting the NEAREST loaded
 * row to the searched point — is the page's list orchestration.
 */
export class AnchorView {
  /** The search input's content (a capture affordance, not a field). */
  readonly anchorQuery = signal('');
  /** True while the Nominatim search is in flight (button pending state). */
  readonly anchorSearching = signal(false);
  /** The result list (≤5) of the last successful search. */
  readonly anchorResults = signal<GeocodeResult[]>([]);
  /** The last search failure's kind (null = none). */
  readonly anchorError = signal<GeocodeErrorKind | null>(null);
  /** The active browse anchor — the searched point + its display label. */
  readonly anchor = signal<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);

  constructor(private readonly deps: { geocode: GeocodeGateway }) {}

  onQueryChange(event: Event): void {
    this.anchorQuery.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the search input searches (the /submit convention). */
  onSearchKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.startSearch();
  }

  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request
   * per press — no autosuggest (Nominatim usage policy). A press while a
   * search is pending is IGNORED, never stacked; if the press lands
   * inside the gateway's 1000 ms spacing window it waits it out and the
   * button stays pending the whole time. A failure NEVER sets an anchor
   * and touches nothing else.
   */
  startSearch(): void {
    if (this.anchorSearching()) {
      return;
    }
    const query = this.anchorQuery().trim();
    if (query === '') {
      return;
    }
    this.anchorSearching.set(true);
    this.anchorError.set(null);
    this.anchorResults.set([]);
    void this.deps.geocode
      .search(query)
      .then((results) => {
        if (results.length === 0) {
          this.anchorError.set('no-results');
          return;
        }
        this.anchorResults.set(results);
      })
      .catch((failure: unknown) => {
        // 429 = the service throttles ("please wait a moment"); anything
        // else (network/CORS/5xx) gets the generic unavailable copy.
        const api = toApiError(failure);
        this.anchorError.set(api.status === 429 ? 'rate-limited' : 'network');
      })
      .finally(() => this.anchorSearching.set(false));
  }

  /**
   * Selecting a result sets the BROWSE ANCHOR and collapses the result
   * list. The camera (the fly to neighbourhood scale + the pin with its
   * localized title) and the search-selection focus (selecting the
   * nearest loaded row to the searched point) are the page's.
   */
  select(result: GeocodeResult): void {
    this.anchor.set({
      latitude: result.latitude,
      longitude: result.longitude,
      label: result.displayName,
    });
    this.anchorResults.set([]);
    this.anchorError.set(null);
  }

  /** Removes the anchor — the distances and the distance sort follow.
   *  The pin's removal is the page's (the camera is the page's). */
  clear(): void {
    this.anchor.set(null);
  }

  /** The failure's message key (null = none); the template resolves it
   *  through the `t` pipe. */
  errorText(): MessageKey | null {
    const kind = this.anchorError();
    return kind === null ? null : GEOCODE_ERROR_KEY[kind];
  }

  /** The straight-line distance from the active anchor to the row (km),
   *  or null when no anchor is set. Pure Haversine over already-loaded
   *  rows — client-side only, no backend call. */
  distanceTo(shelter: ShelterDto): number | null {
    const anchor = this.anchor();
    if (anchor === null) {
      return null;
    }
    return haversineKm(anchor.latitude, anchor.longitude, shelter.latitude, shelter.longitude);
  }
}
