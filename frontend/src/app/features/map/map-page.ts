import {
  type AfterViewInit,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  EnvironmentInjector,
  inject,
  type OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import type {
  ShelterDto,
  ProvenanceFilter,
  ShelterTrustFilter,
  GeocodeResult,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { toApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  COMMUNITY_UNVERIFIED_WARNING,
  PRIVATE_LOCATION_BADGE,
  INACCURATE_WARNING,
  isPrivateLocation,
  hasReports as hasReportsShared,
  hasTrustBadges as hasTrustBadgesShared,
  occupancyText as occupancyTextShared,
  provenanceText as provenanceTextShared,
  provenanceBadgeClass as provenanceBadgeClassShared,
  ratingText as ratingTextShared,
  reportedBadgeText as reportedBadgeTextShared,
  statusFlagText as statusFlagTextShared,
  straightLineText,
} from '../../shared/shelter-copy';
import { bannerMessage } from '../../shared/error-copy';
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM,
} from '../../shared/leaflet-service';

/**
 * The provenance-filter chips (shelter-provenance-taxonomy M6 — server-side
 * `?provenance=` refetch, replacing the old source chips: provenance
 * strictly subdivides source, so the finer filter supersedes the coarser
 * one). The two hidden taxonomy values (REPORTED_INACTIVE / REJECTED)
 * have no chip — the public list is ACTIVE-only, so they would always
 * filter to empty.
 */
const PROVENANCE_FILTERS: { value: ProvenanceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'PARTNER_VERIFIED', label: 'Partner' },
  { value: 'COMMUNITY_REPORTED', label: 'Community' },
  { value: 'UNDER_REVIEW', label: 'Proposed' },
];

/**
 * Per-error copy for the "Nearest shelter" action (map-crisis-actions D2) —
 * the submit page's geolocation vocabulary, MIRRORED here, not shared (the
 * W9/W15 duplication convention: documented, not shared across features).
 * The trailing alternatives differ — the map page has no map-pick/link
 * fallback, only a retry.
 */
const NEAREST_COPY = {
  denied: 'Location permission is off. Allow location access in your browser, then try again.',
  timeout: 'Finding your location timed out. Try again in a moment.',
  unsupported: 'Your browser does not support location access. Check your browser settings.',
  unavailable: 'Your location could not be determined right now. Try again in a moment.',
  insecure: 'Location access needs a secure (https) connection.',
} as const;

/** The inline states of the address search (location-navigation M12) —
 *  MIRRORED from the /submit page's GEOCODE_ERROR_COPY (the W9/W15
 *  duplication convention: documented, not shared across features); the
 *  trailing alternatives differ — the browse page has no map-pick/link
 *  fallback, its alternative is the geolocation CTA. A failed search
 *  changes NOTHING else: no anchor, no pin, list untouched. */
type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

const GEOCODE_ERROR_COPY: Record<GeocodeErrorKind, string> = {
  'no-results': 'No Estonian address found — try another address, or “Show shelters around you”.',
  'rate-limited': 'The address search is busy — please wait a moment and try again.',
  network: 'Address search is unreachable right now. Try “Show shelters around you” instead.',
};

/** Neighbourhood scale for the anchor fly (M12): the anchor is a
 *  searched ADDRESS, not a shelter — SHELTER_ZOOM 16 would hide the
 *  surroundings the search exists to compare. */
const ANCHOR_ZOOM = 14;

/** Great-circle distance in kilometres (Haversine) — the client-side
 *  nearest-shelter + address-anchor distance computation (D2: no new
 *  endpoint). */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * Public home for signed-out/signed-in users: '/map' (and '/', the default
 * route). The read-only shelter browse experience (M4): a Leaflet map with
 * divIcon markers toned by the server-derived provenance (M6: OFFICIAL
 * blue, PARTNER_VERIFIED yellow, COMMUNITY_REPORTED green, UNDER_REVIEW
 * amber, plus the reported-state orange override) + a sidebar list,
 * provenance-filter chips that refetch server-side, trust filters
 * (shelter-trust-and-reports D6: Reviewed / Has capacity toggle chips —
 * all composable, all server-side; M11 rating demotion dropped the rating
 * select — the star summary stays a read-only display, not a filter),
 * a legend, and
 * loading/empty/error states.
 *
 * Thin shell (01-TASK.md §7): state in signals, business behaviour delegated —
 * the gateway owns the API, LeafletService owns the map. LeafletService is
 * page-scoped (one instance per visit, design decision 3) and destroyed in
 * ngOnDestroy so no map or listener leaks between visits (zoneless has no
 * safety net).
 *
 * Selection & zoom (design decision 5): a shared selectedId signal — a row
 * click OR a marker click SELECTS the shelter and flies the map to it at
 * street level (SHELTER_ZOOM). The user STAYS on /map: the zoom is the
 * payoff of the click, not a navigation. Opening the full /shelters/{id}
 * page is a separate explicit step — the selected row grows a "View
 * details" link, the only sidebar element that navigates.
 */
@Component({
  selector: 'app-map-page',
  imports: [NgClass, RouterLink, BannerComponent, LoadingIndicator],
  providers: [LeafletService],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly geocode = inject(GeocodeGateway);
  private readonly leaflet = inject(LeafletService);
  private readonly store = inject(AuthStore);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  /** The sidebar's scroll container — the scrollRowIntoView target. Null
   *  while the list is not rendered (loading / empty / error / destroyed). */
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('listEl');
  /** The component's own environment injector — passed explicitly to
   *  afterNextRender (scrollRowIntoView runs from Leaflet/geolocation
   *  callbacks, outside an injection context) and ties the deferred
   *  callback to the component's lifecycle (never fires after destroy). */
  private readonly injector = inject(EnvironmentInjector);

  protected readonly provenanceFilters = PROVENANCE_FILTERS;
  /** W24: the shared provenance copy, exposed to the template (Angular's
   *  template scope is the component class). The row badge shows the
   *  server-derived provenance (shelter-provenance-taxonomy M6); the trust
   *  badges (D6) reuse the shared statusFlag/occupancy copy. */
  protected readonly provenanceText = provenanceTextShared;
  protected readonly provenanceBadgeClass = provenanceBadgeClassShared;
  protected readonly ratingText = ratingTextShared;
  protected readonly statusFlagText = statusFlagTextShared;
  protected readonly occupancyText = occupancyTextShared;
  /** The reported badge with its count (last-verified-meta M8). */
  protected readonly reportedBadgeText = reportedBadgeTextShared;
  /** The nearest result's straight-line distance line (D6 honesty). */
  protected readonly straightLineText = straightLineText;
  /** The community unverified warning line (community-review-queue). */
  protected readonly communityUnverifiedWarning = COMMUNITY_UNVERIFIED_WARNING;
  /** The single-sourced "reported inaccurate" warning (M10 slice 4). */
  protected readonly inaccurateWarning = INACCURATE_WARNING;
  /** The private-home declaration badge (D7). */
  protected readonly privateLocationBadge = PRIVATE_LOCATION_BADGE;
  /** The private-location predicate (D7) — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;
  /** Trust-badge predicates (D6) — the template keeps the `>` comparisons
   *  in code, not in the template expressions. */
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;
  /** The address-search inline state (location-navigation M12) — the
   *  template renders the mapped copy, the kind stays in code. */
  protected readonly anchorErrorText = (): string | null => {
    const kind = this.anchorError();
    return kind === null ? null : GEOCODE_ERROR_COPY[kind];
  };
  protected readonly filter = signal<ProvenanceFilter>('ALL');

  // ---- trust filters (shelter-trust-and-reports D5/D6) ----------------------
  /** Reviewed toggle chip -> `reviewed=true` (>= 1 visible review). */
  protected readonly reviewed = signal(false);
  /** Has capacity toggle chip -> `hasCapacity=true`. */
  protected readonly hasCapacity = signal(false);

  protected readonly shelters = signal<ShelterDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  // ---- nearest shelter (map-crisis-actions D1 + D2) ------------------------
  /** The session, exposed to the template (the "Add shelter" CTA and the
   *  empty-list offer render only for authenticated users). */
  protected readonly auth = this.store;
  /** True while the geolocation request for the nearest shelter is in flight. */
  protected readonly locating = signal(false);
  /** The nearest shelter (last success) — its row carries the temporary
   *  `shelter-row--nearest` emphasis while this is set. */
  protected readonly nearest = signal<ShelterDto | null>(null);
  /** The Haversine distance to the nearest shelter in km (last success) —
   *  shown as "≈ … straight line" (D6: distance honesty). Cleared with
   *  `nearest` everywhere (the two signals move as one). */
  protected readonly nearestKm = signal<number | null>(null);
  /** The loaded list was empty when the action ran — the "add the first one"
   *  offer (with the /submit link for authenticated users). */
  protected readonly nearestEmpty = signal(false);
  /** The last locate failure's per-error copy (null = none). */
  protected readonly nearestError = signal<string | null>(null);

  // ---- address-search anchor (location-navigation M12) ------------------
  /** The search input's content (a capture affordance, not a field). */
  protected readonly anchorQuery = signal('');
  /** True while the Nominatim search is in flight (button pending state). */
  protected readonly anchorSearching = signal(false);
  /** The result list (≤5) of the last successful search. */
  protected readonly anchorResults = signal<GeocodeResult[]>([]);
  /** The last search failure's kind (null = none). */
  protected readonly anchorError = signal<GeocodeErrorKind | null>(null);
  /** The active browse anchor — the searched point + its display label.
   *  While set, rows carry its straight-line distance and the list sorts
   *  by it (the name sort is the tiebreak); Clear restores the name sort. */
  protected readonly anchor = signal<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);

  /** Sidebar rows: stable name sort (05-CONTEXT-MAP) — EXCEPT while a
   *  browse anchor is active (M12), when the list sorts by the anchor's
   *  straight-line distance (name as the tiebreak). Clearing the anchor
   *  restores the name sort. */
  protected readonly sorted = computed<ShelterDto[]>(() => {
    const rows = [...this.shelters()];
    const anchor = this.anchor();
    if (anchor === null) {
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows.sort((a, b) => {
      const da = haversineKm(anchor.latitude, anchor.longitude, a.latitude, a.longitude);
      const db = haversineKm(anchor.latitude, anchor.longitude, b.latitude, b.longitude);
      return da - db || a.name.localeCompare(b.name);
    });
  });

  /** Zero rows for the current filter — only when the fetch settled cleanly. */
  protected readonly showEmpty = computed(
    () => !this.loading() && this.error() === null && this.shelters().length === 0,
  );

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;
  /** Set in ngOnDestroy — a stray callback after route leave (a Leaflet
   *  marker event racing the destroy, the geolocation-callback bug class)
   *  must not touch the DOM. */
  private destroyed = false;

  /**
   * The map container only exists once the view is rendered; a null container
   * (should never happen) skips map creation but never breaks the page.
   */
  ngAfterViewInit(): void {
    this.leaflet.markerClick = (id) => this.onMarkerClick(id);
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.load('ALL');
  }
  ngOnDestroy(): void {
    // Cancel any in-flight response, then drop the map instance + listeners.
    this.destroyed = true;
    this.fetchSeq++;
    this.leaflet.destroy();
  }

  /** Chip click — refetch with the server-side provenance param (no client
   *  filter, M6). Public so specs can drive it (M2 page convention).
   *  Re-selecting the ACTIVE chip retries the last failed refetch — the
   *  equality guard must not swallow that click while an error banner is
   *  up (reviewer N8). */
  setFilter(provenance: ProvenanceFilter): void {
    if (provenance === this.filter() && this.error() === null) {
      return;
    }
    this.load(provenance);
  }

  /** Reviewed toggle chip (D6) — flip + refetch with the current source. */
  toggleReviewed(): void {
    this.reviewed.update((active) => !active);
    this.load(this.filter());
  }

  /** Has capacity toggle chip (D6) — flip + refetch with the current source. */
  toggleHasCapacity(): void {
    this.hasCapacity.update((active) => !active);
    this.load(this.filter());
  }

  /**
   * The active trust filters, or undefined when none are active (D5).
   * An undefined result keeps the legacy single-arg `list(source)` call
   * shape — the query string is byte-identical to M4 until a trust filter
   * is actually set. (M11: the minRating rating filter is gone — the
   * rating is context, not a lever.)
   */
  private activeTrustFilter(): ShelterTrustFilter | undefined {
    if (!this.reviewed() && !this.hasCapacity()) {
      return undefined;
    }
    return {
      reviewed: this.reviewed() || undefined,
      hasCapacity: this.hasCapacity() || undefined,
    };
  }

  /**
   * Row click: select (highlight) + fly the map to the shelter at street
   * level. Does NOT navigate — the selected row's "View details" link is
   * the explicit step to /shelters/{id} (design decision 5). Public so
   * specs can drive it (M2 page convention).
   */
  selectShelter(shelter: ShelterDto): void {
    // A manual selection supersedes the Nearest emphasis (D2: the temporary
    // highlight clears on the next interaction).
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.selectedId.set(shelter.id);
    this.leaflet.flyTo(shelter.latitude, shelter.longitude, SHELTER_ZOOM);
  }

  /**
   * Marker click (LeafletService callback): select + zoom exactly like a
   * row click — the user stays on the map looking at the clicked point.
   * Markers are rendered from `sorted()`, so the id lookup runs over the
   * same list. A not-found id (a marker click racing a filter refetch) just
   * selects without a fly — the map already shows that point.
   */
  private onMarkerClick(id: number): void {
    const row = this.sorted().find((s) => s.id === id);
    if (row) {
      this.selectShelter(row);
    } else {
      this.nearest.set(null); // an interaction outside the list still supersedes it
      this.nearestKm.set(null);
      this.selectedId.set(id);
    }
    // The accent (selection ring) may have landed on a row below the fold in
    // the list — scroll it into view so the user sees WHAT was zoomed to.
    this.scrollRowIntoView(id);
  }

  /**
   * "Nearest shelter" (map-crisis-actions D1/D2): high-accuracy geolocation
   * with the submit page's exact options ({ enableHighAccuracy: true,
   * timeout: 10000, maximumAge: 0 }), then the closest shelter computed
   * CLIENT-SIDE from the already-loaded list — no backend call. On success:
   * fly to the shelter at street level (SHELTER_ZOOM) + emphasize its row +
   * the one-line "Nearest: …" state. On failure: per-error copy (the submit
   * page's vocabulary); the list and map stay untouched. Public so specs can
   * drive it (page convention).
   */
  findNearest(): void {
    if (this.locating() || this.loading() || this.error() !== null) {
      return; // busy, or the list itself is loading/failed — an offer state
      // would mislead
    }
    this.nearest.set(null); // F1: drop the LAST SUCCESS up front — a failed
    // retry must not leave the stale "Nearest: X" line (and its row
    // emphasis, driven by the same signal) rendered next to the error.
    this.nearestKm.set(null);
    this.nearestError.set(null);
    this.nearestEmpty.set(false);
    if (this.shelters().length === 0) {
      // Nothing loaded — nothing to measure against. The offer copy (with the
      // /submit link for authenticated users) renders from `nearestEmpty`.
      this.nearestEmpty.set(true);
      return;
    }
    if (window.isSecureContext === false) {
      this.nearestError.set(NEAREST_COPY.insecure);
      return;
    }
    const geolocation = navigator.geolocation;
    // jsdom leaves navigator.geolocation undefined — `!` covers null AND undefined.
    if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
      this.nearestError.set(NEAREST_COPY.unsupported);
      return;
    }
    this.locating.set(true);
    geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        this.focusNearestShelter(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        this.locating.set(false);
        // Duck-typed code read (the submit page's pattern — jsdom does not
        // define GeolocationPositionError). List and map are untouched.
        const code = typeof err?.code === 'number' ? err.code : 2;
        let kind: keyof typeof NEAREST_COPY;
        if (code === 1) {
          kind = 'denied';
        } else if (code === 3) {
          kind = 'timeout';
        } else {
          kind = 'unavailable';
        }
        this.nearestError.set(NEAREST_COPY[kind]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  /** Fly to the closest loaded shelter at street level and mark its row. */
  private focusNearestShelter(latitude: number, longitude: number): void {
    // Nearest is computed over `shelters()` — the list the gateway last
    // loaded, the UNFILTERED-by-client view: no further narrowing on top of
    // the server-side filter, and not the name-sorted `sorted()` display
    // view (same rows, different order). D2: the already-loaded list, not a
    // new fetch.
    let nearestShelter: ShelterDto | null = null;
    let nearestKm = Number.POSITIVE_INFINITY;
    for (const row of this.shelters()) {
      const km = haversineKm(latitude, longitude, row.latitude, row.longitude);
      if (km < nearestKm) {
        nearestKm = km;
        nearestShelter = row;
      }
    }
    if (nearestShelter === null) {
      // F5: the list may have emptied (and FAILED to load) while the locate
      // was in flight — the error banner is the state; offering "add the
      // first one" beside it would mislead.
      if (this.error() === null) {
        this.nearestEmpty.set(true);
      }
      return;
    }
    this.nearest.set(nearestShelter);
    this.nearestKm.set(nearestKm);
    this.leaflet.flyTo(nearestShelter.latitude, nearestShelter.longitude, SHELTER_ZOOM);
    // The emphasis may have landed on a row below the fold — scroll it into
    // view, the same way a marker click does.
    this.scrollRowIntoView(nearestShelter.id);
  }

  // ---- address-search anchor (location-navigation M12) -------------------

  protected onAnchorQueryChange(event: Event): void {
    this.anchorQuery.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the search input searches (the /submit convention). */
  protected onAnchorSearchKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.startAnchorSearch();
  }

  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request per
   * press — no autosuggest (Nominatim usage policy). A press while a
   * search is pending is IGNORED, never stacked; if the press lands inside
   * the gateway's 1000 ms spacing window it waits it out and the button
   * stays pending the whole time (the shelter-address-search contract,
   * mirrored). A failure NEVER sets an anchor and touches nothing else.
   */
  protected startAnchorSearch(): void {
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
    void this.geocode
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
   * Selecting a result sets the BROWSE ANCHOR (M12): the anchor pin, the
   * fly to neighbourhood scale, and every row's straight-line distance
   * follow this point. A selection supersedes the nearest emphasis (the
   * next-interaction-supersedes convention) and collapses the result list.
   */
  protected selectAnchorResult(result: GeocodeResult): void {
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.anchor.set({
      latitude: result.latitude,
      longitude: result.longitude,
      label: result.displayName,
    });
    this.anchorResults.set([]);
    this.anchorError.set(null);
    this.leaflet.setAnchor(result.latitude, result.longitude);
    this.leaflet.flyTo(result.latitude, result.longitude, ANCHOR_ZOOM);
  }

  /** Removes the anchor — pin, per-row distances, and the distance sort. */
  protected clearAnchor(): void {
    this.anchor.set(null);
    this.leaflet.setAnchor(null, null);
  }

  /** The straight-line distance from the active anchor to the row (km),
   *  or null when no anchor is set. Pure Haversine over already-loaded
   *  rows — the D2 "no new endpoint" precedent (client-side only). */
  protected anchorDistance(shelter: ShelterDto): number | null {
    const anchor = this.anchor();
    if (anchor === null) {
      return null;
    }
    return haversineKm(anchor.latitude, anchor.longitude, shelter.latitude, shelter.longitude);
  }

  /**
   * Scroll the row for `id` into view inside the sidebar list — the accent
   * (the selection ring from a marker click, the temporary emphasis from a
   * nearest success) must land on a row the user can actually see.
   *
   * Deferred to afterNextRender: the signal write that triggered this call
   * re-renders the row first (the selected row GROWS its "View details"
   * link), so the scroll measures the final layout, not the pre-update one.
   * block:'nearest' is deliberate: a no-op when the row is already visible
   * (no jumpy re-scroll), the minimum scroll when it isn't. A missing list
   * (loading / empty / destroyed) or a missing row (filtered out) is a
   * no-op. Under the list's proximity scroll-snap, the smooth scroll simply
   * settles on the nearest row edge after it finishes (proximity never
   * forces a position).
   */
  private scrollRowIntoView(id: number): void {
    if (this.destroyed) {
      return; // a stray callback after route leave must not touch the DOM
    }
    afterNextRender(
      () => {
        const list = this.listEl()?.nativeElement;
        if (!list) {
          return; // the list is gone (or the page was destroyed mid-flight)
        }
        const row = list.querySelector<HTMLElement>(`[data-shelter-id="${id}"]`);
        if (row) {
          row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      },
      { injector: this.injector },
    );
  }

  private load(provenance: ProvenanceFilter): void {
    const seq = ++this.fetchSeq;
    this.filter.set(provenance);
    this.error.set(null);
    this.loading.set(true);
    // Trust filters compose with the provenance (D5 + M6); with none active
    // the call is the plain list(provenance) shape — no second argument.
    const trust = this.activeTrustFilter();
    const request =
      trust === undefined ? this.gateway.list(provenance) : this.gateway.list(provenance, trust);
    void request.then(
      (rows) => {
        if (seq !== this.fetchSeq) {
          return; // a newer filter refetch superseded this response
        }
        this.shelters.set(rows);
        this.selectedId.set(null);
        // A filter change re-loads the list — the previous Nearest emphasis
        // (and empty-list offer) is stale by definition (D2: cleared on the
        // next interaction/filter change). nearestError survives: it describes
        // the user's browser, not the list.
        this.nearest.set(null);
        this.nearestKm.set(null);
        this.nearestEmpty.set(false);
        this.leaflet.renderShelters(this.sorted());
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.shelters.set([]);
        this.selectedId.set(null);
        this.nearest.set(null);
        this.nearestKm.set(null);
        this.nearestEmpty.set(false);
        this.leaflet.renderShelters([]);
        // Same banner/error-copy path as every other page (reviewer N9):
        // e.g. a 429 gets the rate-limited copy, not the raw backend text.
        this.error.set(bannerMessage(failure, 'shelter'));
        this.loading.set(false);
      },
    );
  }
}
