import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  type OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ShelterDto, ShelterSourceFilter } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { AuthStore } from '../../session/auth-store';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  provenanceLabel as provenanceLabelShared,
  ratingText as ratingTextShared,
} from '../../shared/shelter-copy';
import { bannerMessage } from '../../shared/error-copy';
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM,
} from '../../shared/leaflet-service';

/** The three source-filter chips (server-side `?source=` refetch, design 4). */
const SOURCE_FILTERS: { value: ShelterSourceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'REGISTRY', label: 'Registry' },
  { value: 'USER', label: 'User' },
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

/** Great-circle distance in kilometres (Haversine) — the client-side
 *  nearest-shelter computation (D2: no new endpoint). */
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
 * divIcon markers (REGISTRY=blue, USER=green) + a sidebar list, source-filter
 * chips that refetch server-side, a legend, and loading/empty/error states.
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
  imports: [RouterLink, BannerComponent, LoadingIndicator],
  providers: [LeafletService],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly leaflet = inject(LeafletService);
  private readonly store = inject(AuthStore);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  protected readonly sourceFilters = SOURCE_FILTERS;
  /** W24: the shared source/rating copy, exposed to the template (Angular's
   *  template scope is the component class). The row badge shows the
   *  four-valued provenance (accessibility-and-provenance D4). */
  protected readonly provenanceLabel = provenanceLabelShared;
  protected readonly ratingText = ratingTextShared;
  protected readonly filter = signal<ShelterSourceFilter>('ALL');
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
  /** The loaded list was empty when the action ran — the "add the first one"
   *  offer (with the /submit link for authenticated users). */
  protected readonly nearestEmpty = signal(false);
  /** The last locate failure's per-error copy (null = none). */
  protected readonly nearestError = signal<string | null>(null);

  /** Sidebar rows, sorted by name (05-CONTEXT-MAP: stable name sort). */
  protected readonly sorted = computed<ShelterDto[]>(() =>
    [...this.shelters()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  /** Zero rows for the current filter — only when the fetch settled cleanly. */
  protected readonly showEmpty = computed(
    () => !this.loading() && this.error() === null && this.shelters().length === 0,
  );

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;

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
    this.fetchSeq++;
    this.leaflet.destroy();
  }

  /** Chip click — refetch with the server-side source param (no client filter).
   *  Public so specs can drive it (M2 page convention). Re-selecting the
   *  ACTIVE chip retries the last failed refetch — the equality guard must
   *  not swallow that click while an error banner is up (reviewer N8). */
  setFilter(source: ShelterSourceFilter): void {
    if (source === this.filter() && this.error() === null) {
      return;
    }
    this.load(source);
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
      this.selectedId.set(id);
    }
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
    this.leaflet.flyTo(nearestShelter.latitude, nearestShelter.longitude, SHELTER_ZOOM);
  }

  private load(source: ShelterSourceFilter): void {
    const seq = ++this.fetchSeq;
    this.filter.set(source);
    this.error.set(null);
    this.loading.set(true);
    void this.gateway.list(source).then(
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
