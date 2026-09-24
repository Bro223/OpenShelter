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
import { ActivatedRoute, Router, RouterLink, type Params } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { MessageKey } from '../../core/i18n/messages';
import type {
  OpenStatusDto,
  ReviewStatus,
  ShelterDto,
  ShelterOccupancy,
  ShelterSource,
  ShelterTrustFilter,
  GeocodeResult,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { toApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import { BannerComponent } from '../../shared/banner.component';
import { ListState } from '../../shared/list-state';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
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
  markerTone,
} from '../../shared/leaflet-service';
import {
  getCurrentPositionHighAccuracy,
  GeolocationError,
  type GeolocationFailureKind,
  haversineKm,
} from '../../shared/geolocation';

/** The legend's five SELECTABLE pin tones, in legend order (the
 *  legend IS the filter). The order is the canonical URL order for the
 *  `tones` param; the names are the markerTone() vocabulary (the same words
 *  the marker classes use — `shelter-marker--{tone}`), so a selected entry
 *  is exactly the pin the map draws. The sixth legend entry (the anchor
 *  diamond, the searched ADDRESS) is a UI reference point, not a shelter
 *  pin tone — it is deliberately not a member.
 *
 * The legend is the page's ONLY filter control: the source-kind
 *  chips (All / Registry / User) were removed as the leftover duplicate of
 *  the legend filter — the registry-versus-user distinction they carried is
 *  the legend's registry entry vs. its four community tones (unverified /
 *  partial / full / reported). Display-only: the loaded list is filtered
 *  client-side, never refetched by source. */
const LEGEND_TONES = ['registry', 'user', 'partial', 'full', 'reported'] as const;
/** One selectable legend (pin-tone) entry. */
type LegendTone = (typeof LEGEND_TONES)[number];

/** Parse the URL's `tones` value into a legal set: split on ',', trim, keep
 *  the known tone names (case-sensitive, exactly the marker vocabulary) and
 *  drop the rest. Absent (null) or all-garbage → the empty set = no filter.
 *  The clamp/normalize discipline of the paging/filter work: a hand-typed
 *  value sanitizes to the nearest legal value, never an error. */
function parseTones(raw: string | null): Set<LegendTone> {
  const tones = new Set<LegendTone>();
  if (raw !== null) {
    for (const token of raw.split(',')) {
      const name = token.trim();
      if ((LEGEND_TONES as readonly string[]).includes(name)) {
        tones.add(name as LegendTone);
      }
    }
  }
  return tones;
}

/** The canonical URL string for a tone set: legend order, comma-joined,
 *  '' when empty (the omit-defaults convention — the default is the
 *  ABSENCE of the param). */
function canonicalTones(tones: ReadonlySet<LegendTone>): string {
  return LEGEND_TONES.filter((tone) => tones.has(tone)).join(',');
}

/** Set equality over two tone sets (same members, either order). */
function sameTones(a: ReadonlySet<LegendTone>, b: ReadonlySet<LegendTone>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const tone of a) {
    if (!b.has(tone)) {
      return false;
    }
  }
  return true;
}

/**
 * Message keys for the "Nearest shelter" action's inline errors
 * (map-crisis-actions), resolved through the `t` pipe in the template
 * (i18n-et-en). The vocabulary mirrors the /submit geolocation
 * errors; the two pages keep divergent copy on purpose, so this list stays
 * page-local. The map page has no map-pick or link fallback, only a retry.
 */
const NEAREST_KEY: Record<GeolocationFailureKind, MessageKey> = {
  denied: 'map.nearest.denied',
  timeout: 'map.nearest.timeout',
  unsupported: 'map.nearest.unsupported',
  unavailable: 'map.nearest.unavailable',
  insecure: 'map.nearest.insecure',
};

/** The inline states of the address search (location-navigation). The
 *  copy mirrors the /submit page's GEOCODE_ERROR_KEY rather than sharing it,
 *  since the two pages keep their own copy on purpose; the trailing
 *  alternatives differ because the browse page has no map-pick or link
 *  fallback (its alternative is the geolocation CTA). A failed search
 *  changes nothing else: no anchor, no pin, list untouched. */
type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

/** Message keys for the inline address-search failures (location-navigation);
 *  resolved through the `t` pipe (i18n-et-en). The /submit
 *  mirror stays page-local for the same reason. */
const GEOCODE_ERROR_KEY: Record<GeocodeErrorKind, MessageKey> = {
  'no-results': 'map.geocode.noResults',
  'rate-limited': 'map.geocode.rateLimited',
  network: 'map.geocode.network',
};

/** Neighbourhood scale for the anchor fly: the anchor is a
 *  searched ADDRESS, not a shelter — SHELTER_ZOOM 16 would hide the
 *  surroundings the search exists to compare. */
const ANCHOR_ZOOM = 14;

/** Regional scale for the around-you fly (owner decision): the map shows
 *  the NEIGHBOURHOOD around the user's own position — not a single
 *  shelter's street. Same scale as the anchor fly, separate intent. */
const AROUND_ZOOM = 14;

/** The closest row to a point (or null for an empty list) + its distance.
 *  The point is an ORIGIN — the user's geolocation fix or the geocoded
 *  address anchor — and the distance is the Haversine straight line to the
 *  row's coordinates. See the component doc comment's "Distance numbers"
 *  section for the full rule (two points / formula / zoom / meaning). */
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
 * route). The read-only shelter browse experience: a Leaflet map with
 * divIcon markers toned by the trust palette (community-review-queue:
 * registry blue, community rows the verification-depth shapes (the
 * verified green family) or the neutral unverified tone when the depth is
 * absent, plus the reported-state orange override — the pin carries depth,
 * not recency) + a sidebar list, the practical filter chips ("Open" /
 * "Has capacity" — see the Filters note below), a legend, and
 * loading/empty/error states.
 *
 * Thin shell (01-TASK.md §7): state in signals, business behaviour delegated —
 * the gateway owns the API, LeafletService owns the map. LeafletService is
 * page-scoped (one instance per visit, design decision 3) and destroyed in
 * ngOnDestroy so no map or listener leaks between visits (zoneless has no
 * safety net).
 *
 * Distance numbers (the "≈ N m / km straight line" figures):
 * WHICH TWO POINTS —
 *   1. Around-you ("Show shelters around you" CTA): the user's BROWSER
 *      geolocation fix (one-shot high-accuracy request, shared/
 *      geolocation.ts) and the coordinates of each listed shelter (the
 *      DTO's WGS84 decimal degrees). The one-line result measures to the
 *      NEAREST loaded row.
 *   2. Address anchor ("Find shelters near an address" search): the
 *      GEODECODED address point (the selected Nominatim result) and each
 *      shelter's coordinates — every row's "≈ N m straight line" figure
 *      is anchor → that row. "≈ 222 m" therefore answers "from what":
 *      the origin (the searched address) carries its own marker on the
 *      map — the teal diamond (`.shelter-marker--anchor`, 12 px, legend
 *      entry, accessible name "Searched address"), distinct from the
 *      circle shelter markers on shape, not colour alone — and the rows
 *      measure from it.
 * FORMULA — Haversine great-circle distance between the two WGS84
 *   points, Earth radius 6371 km (`haversineKm`, shared/geolocation.ts),
 *   computed CLIENT-SIDE over the already-loaded rows: no backend call,
 *   no IP geolocation, the points never leave the device.
 * ZOOM — the number is a property of the two points, not of the view: it
 *   does not change with zoom. The camera flies to the ORIGIN (the user
 *   fix / the searched address) at neighbourhood scale (AROUND_ZOOM /
 *   ANCHOR_ZOOM 14) — never to a shelter; selecting a row is a separate
 *   step that flies to that shelter at SHELTER_ZOOM 16.
 * WHAT THE NUMBER MEANS TO THE USER — an approximate STRAIGHT LINE over
 *   the earth's surface: never a walking/driving route, never an official
 * distance (distance honesty). The "≈" is the honesty marker; at a
 *   few hundred metres the route-vs-line difference is negligible, but
 *   the copy never claims a route. Canonical write-up: frontend/docs/
 *   agent/05-CONTEXT-MAP.md, "Distance numbers" section.
 *
 * Filters (the legend is the page's ONLY filter control — the
 * source-kind chips are gone, the registry-versus-user distinction is the
 * legend's registry entry vs. its four community tones): the LEGEND is the
 * pin-tone filter: the five tone entries are
 * toggle buttons — the selection is the URL's `tones` param (URL-only,
 * no localStorage, the paging/filter clamp+normalize discipline) and is
 * display-only (the loaded list is filtered and the markers re-render
 * from the same `sorted()` view — no refetch, the data is never
 * altered). The sixth entry (the anchor diamond) is a UI reference
 * point, not a tone — it is not a filter. "Open" (client-side — the BE
 * has no open/closed param, it filters the loaded list + re-renders the
 * markers) and "Has capacity" (server-side `?hasCapacity=`) compose with
 * it. The list always fetches ALL sources (the `?source=` refetch went
 * with the chips).
 * Selection & zoom (design decision 5): a shared selectedId signal — a row
 * click OR a marker click SELECTS the shelter and flies the map to it at
 * street level (SHELTER_ZOOM). The user STAYS on /map: the zoom is the
 * payoff of the click, not a navigation. Opening the full /shelters/{id}
 * page is a separate explicit step — the selected row grows a "View
 * details" link, the only sidebar element that navigates.
 */
@Component({
  selector: 'app-map-page',
  imports: [NgClass, RouterLink, BannerComponent, ListState, LoadingIndicator, TranslatePipe],
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
  /** The legend filter's URL seam (the view IS the URL — the paging/
   *  filter idiom): the `tones` param is read on every query emission and
   *  written on every toggle. */
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** The i18n seam: the shared shelter-copy helpers resolve their copy
   *  through the active locale (N7 i18n-completeness), and the anchor pin
   *  title is the localized `map.searched` label. */
  private readonly i18n = inject(I18nService);
  /** The active-locale resolver passed to the shared copy helpers. */
  private readonly translate = (
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string => this.i18n.t(key, params);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  /** The sidebar's scroll container — the scrollRowIntoView target. Null
   *  while the list is not rendered (loading / empty / error / destroyed). */
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('listEl');
  /** The component's own environment injector — passed explicitly to
   *  afterNextRender (scrollRowIntoView runs from Leaflet/geolocation
   *  callbacks, outside an injection context) and ties the deferred
   *  callback to the component's lifecycle (never fires after destroy). */
  private readonly injector = inject(EnvironmentInjector);

  /** The shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The row badge shows the
   *  source label (registry) or the trust-state label (USER rows);
   * the trust badges reuse the shared openStatus/occupancy copy.
   *  Each wrapper injects the i18n seam so the badge reads in the active
   *  locale (the catalog keys behind them are the same ones the /mine
   *  panel and the band picker already render — one word per fact). */
  protected readonly sourceTrustLabel = (s: {
    source: ShelterSource;
    reviewStatus: ReviewStatus;
  }): string => sourceTrustLabelShared(s, this.translate);
  protected readonly communityBadgeClass = communityBadgeClassShared;
  /** The row's fresh-CLOSED badge text — fresh OPEN rows render no badge
   *  (open is the default). */
  protected readonly openStatusBadgeText = (openStatus: OpenStatusDto | null) =>
    openStatusBadgeTextShared(openStatus, this.translate);
  protected readonly occupancyText = (occupancy: ShelterOccupancy) =>
    occupancyTextShared(occupancy, Date.now(), this.translate);
  /** The reported badge with its count (last-verified-meta): the count is
   * the open trust-report sum — nonexistent + inaccurate. */
  protected readonly reportedBadgeText = (shelter: {
    nonexistentReports: number;
    inaccurateReports?: number;
  }) => reportedBadgeTextShared(shelter, this.translate);
  /** The nearest result's straight-line distance line (honesty). */
  protected readonly straightLineText = (km: number) => straightLineText(km, this.translate);
  /** The private-location predicate — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;
  /** Trust-badge predicates — the template keeps the `>` comparisons
   *  in code, not in the template expressions. */
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;
  /** The address-search inline state (location-navigation) — the
   *  template renders the mapped copy, the kind stays in code. */
  protected readonly anchorErrorText = (): MessageKey | null => {
    const kind = this.anchorError();
    return kind === null ? null : GEOCODE_ERROR_KEY[kind];
  };

  // ---- legend filter (the legend IS the filter) ------------------
  /** The selected pin tones (the legend's toggle entries). The URL's
   *  `tones` param is the SINGLE source of truth (URL-only persistence —
   *  no localStorage); this signal mirrors it for the display view. Empty
   *  set = no filter (the default = the param's absence, the omit-defaults
   *  convention). Display-only: a change re-renders the markers from the
   *  filtered view — NO refetch, the loaded data is never altered. */
  protected readonly selectedTones = signal<ReadonlySet<LegendTone>>(new Set());

  /** The entry's pressed state (the template seam — the template stays
   *  branch-free). */
  protected toneSelected(tone: LegendTone): boolean {
    return this.selectedTones().has(tone);
  }

  /**
   * Toggle a legend entry: compute the next selection and write it to the
   *  URL (the view IS the URL — the paging/filter idiom). The
   * query-subscription sync (onQueryChange) applies it to the display view
   *  and re-renders the markers. Display-only: no refetch.
   */
  protected toggleTone(tone: LegendTone): void {
    const next = new Set(this.selectedTones());
    if (next.has(tone)) {
      next.delete(tone);
    } else {
      next.add(tone);
    }
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    const value = canonicalTones(next);
    if (value === '') {
      delete params['tones'];
    } else {
      params['tones'] = value;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /**
   * Keyboard activation for the legend entries (the page's own
   * anchor-search keydown idiom, made explicit for the <button>): Enter
   * and Space toggle the selection. preventDefault() suppresses the
   * button's native activation click (and the Space page-scroll), so every
   * keystroke toggles EXACTLY once — and the path is testable (jsdom
   * synthesises no click from a keydown).
   */
  protected onToneToggleKey(tone: LegendTone, event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleTone(tone);
    }
  }

  // ---- shelter filters ------------------------------------------------------
  /** Has capacity toggle chip -> `hasCapacity=true` (server-side). */
  protected readonly hasCapacity = signal(false);
  /** Open toggle chip (client-side): keeps the rows whose derived display
   *  status reads OPEN (fresh OPEN + nothing-fresh),
   *  dropping the fresh-CLOSED rows (and lifecycle-INACTIVE rows, which
   *  never reach the public list). The BE has no such param, so the chip
   *  filters the loaded list WITHOUT a refetch and re-renders the markers
   *  from the filtered view. */
  protected readonly openOnly = signal(false);

  protected readonly shelters = signal<ShelterDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  // ---- nearest shelter (map-crisis-actions +) ------------------------
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
   * shown as "≈ … straight line" (distance honesty). Cleared with
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
   *  resolves it through the `t` pipe (i18n-et-en). */
  protected readonly nearestError = signal<MessageKey | null>(null);

  // ---- address-search anchor (location-navigation) ----------------------
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
   * legend tone filter (display-only, keyed on the SAME
   * markerTone() the map draws with, so a selected entry is exactly the
   * pin the map renders and the filter can never fork the geometry or the
   * colour), then the distance sort — the around-you user position wins
   * (the action's ranking), the browse anchor next, the stable name sort
   * is the default and the tiebreak everywhere (05-CONTEXT-MAP).
   */
  protected readonly sorted = computed<ShelterDto[]>(() => {
    const tones = this.selectedTones();
    const rows = this.shelters().filter(
      (row) =>
        (!this.openOnly() || isOpenRowShared(row)) &&
        (tones.size === 0 || tones.has(markerTone(row))),
    );
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

  /** Zero rows for the CURRENT view (the legend tone filter + the Open chip
   *  applied to the loaded list) — only when the fetch settled cleanly.
   *  `sorted()`, not `shelters()`: a filter that matches nothing must get
   *  the shared empty state, never a blank map. */
  protected readonly showEmpty = computed(
    () => !this.loading() && this.error() === null && this.sorted().length === 0,
  );

  /** The legend filter's URL sync (the view IS the URL — the paging/filter
   *  idiom applied to the display-only `tones` param): every emission
   *  (the initial navigation and every query change — a toggle, a
   *  back-button step, a hand-typed URL) parses + clamps the tones,
   *  normalizes a hand-typed value in place (replaceUrl — no history entry
   *  for the cosmetic fix), and applies a changed selection to the display
   *  view. The initial emission lands before the map exists (create runs in
   *  ngAfterViewInit), so its marker re-render is a no-op there — the first
   *  load's success path renders from the already-filtered view. Declared
   *  after `sorted`/`showEmpty`: the field initializers run in order, and
   *  the first emission calls sorted(). Unsubscribed in ngOnDestroy. */
  private readonly querySub = this.route.queryParams.subscribe((params) =>
    this.onQueryChange(params),
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
    this.load();
  }
  ngOnDestroy(): void {
    // Cancel any in-flight response, drop the URL sync, then drop the map
    // instance + listeners.
    this.destroyed = true;
    this.fetchSeq++;
    this.querySub.unsubscribe();
    this.leaflet.destroy();
  }

  /** Open toggle chip — flip + re-render the markers from the filtered
   *  list. Client-side: the BE has no open/closed param, so NO refetch —
   *  the loaded list is filtered and the marker layer follows the same
   *  `sorted()` view the sidebar renders. */
  toggleOpen(): void {
    this.openOnly.update((active) => !active);
    this.leaflet.renderShelters(this.sorted());
  }

  /** Has capacity toggle chip — flip + refetch (ALL sources). */
  toggleHasCapacity(): void {
    this.hasCapacity.update((active) => !active);
    this.load();
  }

  /**
   * The active trust filter, or undefined when none is active.
   * An undefined result keeps the legacy single-arg `list(source)` call
   * shape — the query string stays minimal (only `source`) until the filter is
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
   * specs can drive it (page convention).
   */
  selectShelter(shelter: ShelterDto): void {
    // A manual selection supersedes the Nearest emphasis (the temporary
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
   * "Nearest shelter" (map-crisis-actions): a high-accuracy
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
    this.nearest.set(null); // Drop the LAST SUCCESS up front — a failed
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
    // error-code mapping) is shared/geolocation.ts; the per-kind
    // COPY stays page-local and mirrored per kind (NEAREST_KEY).
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
    // view (same rows, different order). the already-loaded list, not a
    // new fetch.
    const hit = nearestShelterAt(latitude, longitude, this.shelters());
    if (hit === null) {
      // The list may have emptied (and FAILED to load) while the locate
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

  // ---- address-search anchor (location-navigation) -----------------------

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
   * Selecting a result sets the BROWSE ANCHOR: the anchor pin, the
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
   * row to that address (the anchor contract: the search exists to
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
    this.leaflet.setAnchor(result.latitude, result.longitude, this.i18n.t('map.searched'));
    this.leaflet.flyTo(result.latitude, result.longitude, ANCHOR_ZOOM);
    const loaded = this.shelters();
    const hit = nearestShelterAt(result.latitude, result.longitude, loaded);
    if (hit === null) {
      // Empty list — refresh with the current filters; the selection lands
      // when the load settles (load's success path consumes the pending).
      this.pendingAnchorSelection = { latitude: result.latitude, longitude: result.longitude };
      this.load();
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
    this.leaflet.setAnchor(null, null, ''); // removal — the title is unused
  }

  /** The straight-line distance from the active anchor to the row (km),
   *  or null when no anchor is set. Pure Haversine over already-loaded
   * rows — the "no new endpoint" precedent (client-side only). */
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

  /**
   * Parse + clamp the `tones` param, then apply a changed selection to the
   * display view. A value outside the tone vocabulary (a hand-typed token,
   * a stale share) sanitizes to the nearest legal value (the known members
   * stay, the rest drop; an empty result is the param's ABSENCE — the
   * omit-defaults convention) and the URL is normalized in place
   * (replaceUrl), so the control and the URL can never quietly disagree.
   * A changed selection re-renders the markers from the filtered view —
   * display-only, NO refetch (the loaded data is never altered).
   */
  private onQueryChange(params: Params): void {
    const raw = params['tones'] ?? null;
    const parsed = parseTones(raw);
    const canonical = canonicalTones(parsed);
    if (raw !== null && canonical !== raw) {
      const next: Record<string, string> = { ...params };
      if (canonical === '') {
        delete next['tones'];
      } else {
        next['tones'] = canonical;
      }
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: next,
        replaceUrl: true,
      });
      return; // the normalized emission applies the filter there
    }
    if (sameTones(parsed, this.selectedTones())) {
      return;
    }
    this.selectedTones.set(parsed);
    this.leaflet.renderShelters(this.sorted());
  }

  /**
   * Load the shelter list (always ALL sources — the server-side `?source=`
   * refetch went with the source chips, ; source is a DISPLAY
   * distinction the legend tones cover, never a fetch param here).
   */
  private load(): void {
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    // Trust filters compose with the source; with none active the
    // call is the plain list('ALL') shape — no second argument.
    const trust = this.activeTrustFilter();
    const request =
      trust === undefined ? this.gateway.list('ALL') : this.gateway.list('ALL', trust);
    void request.then(
      (rows) => {
        if (seq !== this.fetchSeq) {
          return; // a newer filter refetch superseded this response
        }
        this.shelters.set(rows);
        this.selectedId.set(null);
        // A filter change re-loads the list — the previous Nearest emphasis
        // (and empty-list offer) is stale by definition (cleared on the
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
        // Same banner/error-copy path as every other page:
        // e.g. a 429 gets the rate-limited copy, not the raw backend text.
        // The translate callback routes the client-authored error.* copy
        // through the active locale (N7 i18n-completeness — a 5xx on the
        // map must not read English to an ET/RU reader).
        this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
        this.loading.set(false);
      },
    );
  }
}
