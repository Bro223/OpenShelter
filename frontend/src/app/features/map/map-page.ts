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
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { MessageKey } from '../../core/i18n/messages';
import type {
  ShelterDto,
  ShelterSourceFilter,
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
  openStatusBadgeText as openStatusBadgeTextShared,
  isOpenRow as isOpenRowShared,
  sourceTrustLabel as sourceTrustLabelShared,
  communityBadgeClass as communityBadgeClassShared,
  reportedBadgeText as reportedBadgeTextShared,
  straightLineText,
} from '../../shared/shelter-copy';
import { bannerMessage } from '../../shared/error-copy';
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM,
} from '../../shared/leaflet-service';
import {
  getCurrentPositionHighAccuracy,
  GeolocationError,
  type GeolocationFailureKind,
  haversineKm,
} from '../../shared/geolocation';

/** The three source-filter chips (server-side `?source=` refetch, design 4).
 *  `value` is the API param (never translated); the label is a message key
 *  resolved through the `t` pipe in the template (i18n-et-en M14 slice 2). */
const SOURCE_FILTERS: { value: ShelterSourceFilter; labelKey: MessageKey }[] = [
  { value: 'ALL', labelKey: 'map.filter.all' },
  { value: 'REGISTRY', labelKey: 'map.filter.registry' },
  { value: 'USER', labelKey: 'map.filter.user' },
];

/**
 * Message keys for the "Nearest shelter" action's inline errors
 * (map-crisis-actions D2), resolved through the `t` pipe in the template
 * (i18n-et-en M14 slice 2). The vocabulary mirrors the /submit geolocation
 * errors; the W9/W15 duplication convention keeps it documented, not
 * shared. The map page has no map-pick or link fallback, only a retry.
 */
const NEAREST_KEY: Record<GeolocationFailureKind, MessageKey> = {
  denied: 'map.nearest.denied',
  timeout: 'map.nearest.timeout',
  unsupported: 'map.nearest.unsupported',
  unavailable: 'map.nearest.unavailable',
  insecure: 'map.nearest.insecure',
};

/** The inline states of the address search (location-navigation M12). The
 *  copy is MIRRORED from the /submit page's GEOCODE_ERROR_KEY (the W9/W15
 *  duplication convention: documented, not shared across features); the
 *  trailing alternatives differ because the browse page has no map-pick or
 *  link fallback (its alternative is the geolocation CTA). A failed search
 *  changes nothing else: no anchor, no pin, list untouched. */
type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

/** Message keys for the inline address-search failures (location-navigation
 *  M12); resolved through the `t` pipe (i18n-et-en M14 slice 2). The /submit
 *  mirror keeps the same W9/W15 duplication convention. */
const GEOCODE_ERROR_KEY: Record<GeocodeErrorKind, MessageKey> = {
  'no-results': 'map.geocode.noResults',
  'rate-limited': 'map.geocode.rateLimited',
  network: 'map.geocode.network',
};

/** Neighbourhood scale for the anchor fly (M12): the anchor is a
 *  searched ADDRESS, not a shelter — SHELTER_ZOOM 16 would hide the
 *  surroundings the search exists to compare. */
const ANCHOR_ZOOM = 14;

/** Regional scale for the around-you fly (owner decision): the map shows
 *  the NEIGHBOURHOOD around the user's own position — not a single
 *  shelter's street. Same scale as the anchor fly, separate intent. */
const AROUND_ZOOM = 14;

/** The closest row to a point (or null for an empty list) + its distance. */
function nearestShelterAt(
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
 * Public home for signed-out/signed-in users: '/map' (and '/', the default
 * route). The read-only shelter browse experience (M4): a Leaflet map with
 * divIcon markers toned by the trust palette (community-review-queue D5:
 * registry blue, community NEW amber, community CONFIRMED green, plus the
 * reported-state orange override) + a sidebar list, source-filter chips
 * that refetch server-side, the practical filter chips ("Open" /
 * "Has capacity" — see the Filters note below), a legend, and
 * loading/empty/error states.
 *
 * Thin shell (01-TASK.md §7): state in signals, business behaviour delegated —
 * the gateway owns the API, LeafletService owns the map. LeafletService is
 * page-scoped (one instance per visit, design decision 3) and destroyed in
 * ngOnDestroy so no map or listener leaks between visits (zoneless has no
 * safety net).
 *
 * Filters: the source chips refetch server-side (`?source=`); the
 * practical chips are "Open" (client-side — the BE has no open/closed
 * param, it filters the loaded list + re-renders the markers) and
 * "Has capacity" (server-side `?hasCapacity=`). All composable.
 * Selection & zoom (design decision 5): a shared selectedId signal — a row
 * click OR a marker click SELECTS the shelter and flies the map to it at
 * street level (SHELTER_ZOOM). The user STAYS on /map: the zoom is the
 * payoff of the click, not a navigation. Opening the full /shelters/{id}
 * page is a separate explicit step — the selected row grows a "View
 * details" link, the only sidebar element that navigates.
 */
@Component({
  selector: 'app-map-page',
  imports: [NgClass, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe],
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

  protected readonly sourceFilters = SOURCE_FILTERS;
  /** W24: the shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The row badge shows the
   *  source label (registry) or the trust-state label (USER rows);
   *  the trust badges (D6) reuse the shared openStatus/occupancy copy. */
  protected readonly sourceTrustLabel = sourceTrustLabelShared;
  protected readonly communityBadgeClass = communityBadgeClassShared;
  /** The row's fresh-CLOSED badge text (open-status wave) — fresh OPEN rows
   *  render no badge (open is the default). */
  protected readonly openStatusBadgeText = openStatusBadgeTextShared;
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
  protected readonly anchorErrorText = (): MessageKey | null => {
    const kind = this.anchorError();
    return kind === null ? null : GEOCODE_ERROR_KEY[kind];
  };
  protected readonly filter = signal<ShelterSourceFilter>('ALL');

  // ---- shelter filters ------------------------------------------------------
  /** Has capacity toggle chip -> `hasCapacity=true` (server-side). */
  protected readonly hasCapacity = signal(false);
  /** Open toggle chip (client-side): keeps the rows whose derived display
   *  status reads OPEN (open-status wave: fresh OPEN + nothing-fresh),
   *  dropping the fresh-CLOSED rows (and lifecycle-INACTIVE rows, which
   *  never reach the public list). The BE has no such param, so the chip
   *  filters the loaded list WITHOUT a refetch and re-renders the markers
   *  from the filtered view. */
  protected readonly openOnly = signal(false);

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
  /** The nearest shelter (last success) — drives the one-line result under
   *  the CTA (name, distance, warnings) and the distance sort. It carries
   *  NO row emphasis (removed by owner decision — the list must not focus
   *  a single shelter). */
  protected readonly nearest = signal<ShelterDto | null>(null);
  /** The Haversine distance to the nearest shelter in km (last success) —
   *  shown as "≈ … straight line" (D6: distance honesty). Cleared with
   *  `nearest` everywhere (the two signals move as one). */
  protected readonly nearestKm = signal<number | null>(null);
  /** The user's position from the last around-you success (null = none).
   *  While set, the sidebar list sorts by straight-line distance to it —
   *  the ranking the around-you action promises. A manual selection does
   *  NOT clear it (the position stays true); a new around-you run replaces
   *  it. */
  protected readonly userPosition = signal<{ latitude: number; longitude: number } | null>(null);
  /** The loaded list was empty when the action ran — the "add the first one"
   *  offer (with the /submit link for authenticated users). */
  protected readonly nearestEmpty = signal(false);
  /** The last locate failure's message key (null = none); the template
   *  resolves it through the `t` pipe (i18n-et-en M14 slice 2). */
  protected readonly nearestError = signal<MessageKey | null>(null);

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

  /**
   * Sidebar rows: the "Open" chip's client-side filter first, then the
   * distance sort — the around-you user position wins (the action's
   * ranking), the browse anchor next (M12), the stable name sort is the
   * default and the tiebreak everywhere (05-CONTEXT-MAP).
   */
  protected readonly sorted = computed<ShelterDto[]>(() => {
    const rows = this.shelters().filter((row) => !this.openOnly() || isOpenRowShared(row));
    const list = [...rows];
    const userPosition = this.userPosition();
    if (userPosition !== null) {
      return list.sort((a, b) => {
        const da = haversineKm(
          userPosition.latitude,
          userPosition.longitude,
          a.latitude,
          a.longitude,
        );
        const db = haversineKm(
          userPosition.latitude,
          userPosition.longitude,
          b.latitude,
          b.longitude,
        );
        return da - db || a.name.localeCompare(b.name);
      });
    }
    const anchor = this.anchor();
    if (anchor === null) {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort((a, b) => {
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
  /** A search selection made while the list was empty: the result's point,
   *  whose nearest row must be selected once the refresh settles (the
   *  search-selection focus). Cleared on every load outcome and by any
   *  manual selection (the newer intent wins). */
  private pendingAnchorSelection: { latitude: number; longitude: number } | null = null;
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

  /** Chip click — refetch with the server-side source param (no client
   *  filter). Public so specs can drive it (M2 page convention).
   *  Re-selecting the ACTIVE chip retries the last failed refetch — the
   *  equality guard must not swallow that click while an error banner is
   *  up (reviewer N8). */
  setFilter(source: ShelterSourceFilter): void {
    if (source === this.filter() && this.error() === null) {
      return;
    }
    this.load(source);
  }

  /** Open toggle chip — flip + re-render the markers from the filtered
   *  list. Client-side: the BE has no open/closed param, so NO refetch —
   *  the loaded list is filtered and the marker layer follows the same
   *  `sorted()` view the sidebar renders. */
  toggleOpen(): void {
    this.openOnly.update((active) => !active);
    this.leaflet.renderShelters(this.sorted());
  }

  /** Has capacity toggle chip — flip + refetch with the current source. */
  toggleHasCapacity(): void {
    this.hasCapacity.update((active) => !active);
    this.load(this.filter());
  }

  /**
   * The active trust filter, or undefined when none is active (D5).
   * An undefined result keeps the legacy single-arg `list(source)` call
   * shape — the query string is byte-identical to M4 until the filter is
   * actually set. (The `reviewed` param is gone with the review model;
   * "Open" is client-side and never reaches the query string.)
   */
  private activeTrustFilter(): ShelterTrustFilter | undefined {
    return this.hasCapacity() ? { hasCapacity: true } : undefined;
  }

  /**
   * Row click: select (highlight) + fly the map to the shelter at street
   * level. Does NOT navigate — the selected row's "View details" link is
   * the explicit step to /shelters/{id} (design decision 5). Public so
   * specs can drive it (M2 page convention).
   */
  selectShelter(shelter: ShelterDto): void {
    // A manual selection supersedes the Nearest emphasis (D2: the temporary
    // highlight clears on the next interaction) and any pending search
    // selection (a manual pick is the newer intent).
    this.pendingAnchorSelection = null;
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
      this.pendingAnchorSelection = null; // a manual pick supersedes it
      this.nearest.set(null); // an interaction outside the list still supersedes it
      this.nearestKm.set(null);
      this.selectedId.set(id);
    }
    // The accent (selection ring) may have landed on a row below the fold in
    // the list — scroll it into view so the user sees WHAT was zoomed to.
    this.scrollRowIntoView(id);
  }

  /**
   * "Nearest shelter" (map-crisis-actions D1/D2): a high-accuracy
   * geolocation request (the shared mechanism, options and error mapping —
   * shared/geolocation.ts), then the closest shelter computed CLIENT-SIDE
   * from the already-loaded list — no backend call. On success:
   * the map flies to the USER'S OWN POSITION at regional scale
   * (AROUND_ZOOM 14 — a neighbourhood, not a single shelter's street) and
   * does NOT select any row; the nearest shelter stays the RESULT of the
   * action (row emphasis + the one-line "Nearest: …" state), and the list
   * sorts by straight-line distance to the user's position. On failure:
   * per-error copy (the submit page's vocabulary); the list and map stay
   * untouched. Public so specs can drive it (page convention).
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
    this.locating.set(true);
    // The mechanism (secure-context + API guards, the request options, the
    // error-code mapping) is shared/geolocation.ts (F-14); the per-kind
    // COPY stays page-local (the W9/W15 mirror — NEAREST_KEY).
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
   * Around-you success (owner decision): the map flies to the user's OWN
   * position at regional scale (AROUND_ZOOM 14) — NOT to the nearest
   * shelter, and NO row is selected, emphasized or scrolled to. The nearest
   * shelter is the action's RESULT: the one-line result (name,
   * straight-line distance, the unverified warning when it is a community
   * row), and the sidebar list sorts by straight-line distance to the
   * user's position while it is set.
   */
  private focusNearestShelter(latitude: number, longitude: number): void {
    // Nearest is computed over `shelters()` — the list the gateway last
    // loaded, the UNFILTERED-by-client view: no further narrowing on top of
    // the server-side filter, and not the name-sorted `sorted()` display
    // view (same rows, different order). D2: the already-loaded list, not a
    // new fetch.
    const hit = nearestShelterAt(latitude, longitude, this.shelters());
    if (hit === null) {
      // F5: the list may have emptied (and FAILED to load) while the locate
      // was in flight — the error banner is the state; offering "add the
      // first one" beside it would mislead.
      if (this.error() === null) {
        this.nearestEmpty.set(true);
      }
      return;
    }
    this.nearest.set(hit.row);
    this.nearestKm.set(hit.km);
    this.userPosition.set({ latitude, longitude });
    // Regional view centred on the user, NOT a street-level fly to the
    // nearest shelter (the owner's correction) — the user surveys the
    // neighbourhood and picks.
    this.leaflet.flyTo(latitude, longitude, AROUND_ZOOM);
    // No row emphasis, no auto-scroll (the owner's correction): the nearest
    // shelter is the action's RESULT — the one-line state under the CTA —
    // the list itself stays unfocused (distance-sorted via userPosition).
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
   *
   * Search-selection focus: on top of the existing fly-to, the result's
   * NEAREST shelter is selected in the sidebar list — the same selected
   * state a marker click gives (highlight + "View details" link, NO extra
   * fly: the camera already went to the searched point) — and scrolled
   * into view with block 'center'. The search result is an address, not a
   * shelter row, so "the shelter the user selected" is the nearest loaded
   * row to that address (the M12 anchor contract: the search exists to
   * compare the surroundings). If nothing is loaded, the list is re-loaded
   * with the CURRENT filters and the nearest row is selected once the load
   * settles (pendingAnchorSelection).
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
    const loaded = this.shelters();
    const hit = nearestShelterAt(result.latitude, result.longitude, loaded);
    if (hit === null) {
      // Empty list — refresh with the current filters; the selection lands
      // when the load settles (load's success path consumes the pending).
      this.pendingAnchorSelection = { latitude: result.latitude, longitude: result.longitude };
      this.load(this.filter());
    } else {
      this.selectRow(hit.row.id, 'center');
    }
  }

  /**
   * Select a row by id with the SAME selected state as a marker click
   * (highlight + "View details" link) and scroll it into view. No fly —
   * the caller owns the camera (a marker click flies to the shelter, the
   * search selection flies to the searched point).
   */
  private selectRow(id: number, block: ScrollLogicalPosition): void {
    this.selectedId.set(id);
    this.scrollRowIntoView(id, block);
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
   * `block` defaults to 'nearest': a no-op when the row is already visible
   * (no jumpy re-scroll), the minimum scroll when it isn't. The search-
   * selection focus passes 'center' — the selected row is the point of
   * interest and must sit mid-viewport. A missing list (loading / empty /
   * destroyed) or a missing row (filtered out) is a no-op. Under the list's
   * proximity scroll-snap, the smooth scroll simply settles on the nearest
   * row edge after it finishes (proximity never forces a position).
   */
  private scrollRowIntoView(id: number, block: ScrollLogicalPosition = 'nearest'): void {
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
          row.scrollIntoView({ block, behavior: 'smooth' });
        }
      },
      { injector: this.injector },
    );
  }

  private load(source: ShelterSourceFilter): void {
    const seq = ++this.fetchSeq;
    this.filter.set(source);
    this.error.set(null);
    this.loading.set(true);
    // Trust filters compose with the source filter (D5); with none active
    // the call is the plain list(source) shape — no second argument.
    const trust = this.activeTrustFilter();
    const request =
      trust === undefined ? this.gateway.list(source) : this.gateway.list(source, trust);
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
        // A search selection made while the list was empty lands now: the
        // nearest loaded row is selected with the marker-click selected
        // state, scrolled into view centered.
        const pending = this.pendingAnchorSelection;
        this.pendingAnchorSelection = null;
        if (pending !== null) {
          const hit = nearestShelterAt(pending.latitude, pending.longitude, rows);
          if (hit !== null) {
            this.selectRow(hit.row.id, 'center');
          }
        }
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.pendingAnchorSelection = null; // the refresh failed — the selection never lands
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
