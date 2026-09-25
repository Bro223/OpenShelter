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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { haversineKm } from '../../shared/geolocation';
import type { LegendTone } from './legend-view';
import { LegendFilterView } from './legend-view';
import { AnchorView } from './anchor-view';
import { NearestView, nearestShelterAt } from './nearest-view';

/** Neighbourhood scale for the anchor fly: the anchor is a searched
 *  ADDRESS, not a shelter — street scale (SHELTER_ZOOM 16) would hide
 *  the surroundings the search exists to compare. */
const ANCHOR_ZOOM = 14;

/**
 * Public home: '/map' (and '/', the default route). The read-only
 * shelter browse experience: a Leaflet map with divIcon markers toned
 * by verification depth (registry blue; community rows the
 * verification-depth shapes or the plain default community marker; the
 * reported-state red-orange override — the pin carries depth, not
 * recency) + a sidebar list, the "Open" / "Has capacity" chips, and
 * loading/empty/error states.
 *
 * Thin shell: state in signals and the page-owned view objects below,
 * business behaviour delegated — the gateway owns the API,
 * LeafletService owns the map. LeafletService is page-scoped (one
 * instance per visit) and destroyed in ngOnDestroy so no map or
 * listener leaks between visits (zoneless has no safety net).
 *
 * Distance numbers ("≈ N m / km straight line"): the Haversine
 * great-circle distance between two WGS84 points, computed
 * CLIENT-SIDE over the already-loaded rows — no backend call, no IP
 * geolocation, the points never leave the device. An approximate
 * straight line, never a route or an official distance (the "≈" is the
 * honesty marker; the copy never claims a route).
 *
 * Filters: the LEGEND is the pin-tone filter — five toggle entries
 * (LegendFilterView), the selection the URL's `tones` param
 * (URL-only, display-only: the list is filtered and the markers
 * re-render from the same `sorted()` view, no refetch, the loaded data
 * is never altered); the sixth entry (the anchor diamond) is a UI
 * reference point, not a filter. "Open" (client-side — the BE has no
 * open/closed param: the loaded list is filtered, the markers
 * re-render) and "Has capacity" (server-side `?hasCapacity=`) compose
 * with it. The list always fetches ALL sources — source is a display
 * distinction the legend tones cover, never a fetch param here.
 *
 * Camera & selection: the around-you action and an address search fly
 * to the ORIGIN (the user fix / the searched address) at neighbourhood
 * scale, never to a shelter. A row click OR a marker click SELECTS the
 * shelter and flies to it at street level (SHELTER_ZOOM); the user
 * STAYS on /map — the zoom is the payoff of the click, not a
 * navigation. Opening /shelters/{id} is a separate explicit step: the
 * selected row grows a "View details" link, the only sidebar element
 * that navigates.
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  /** The active-locale resolver for the shared copy helpers — the badge
   *  terms read in the active locale (the same catalog keys the /mine
   *  panel and the band picker render — one word per fact). */
  private readonly translate = (
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string => this.i18n.t(key, params);

  /** The legend filter (the legend IS the filter — URL-only,
   *  display-only). */
  protected readonly legend = new LegendFilterView({ route: this.route, router: this.router });
  /** The address search + the active browse anchor. */
  protected readonly anchor = new AnchorView({ geocode: this.geocode });
  /** The "Nearest shelter" action. */
  protected readonly nearest = new NearestView({
    rows: () => this.shelters(),
    busy: () => this.loading() || this.error() !== null,
    leaflet: this.leaflet,
  });

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  /** The sidebar's scroll container — the scrollRowIntoView target. Null
   *  while the list is not rendered (loading / empty / error /
   *  destroyed). */
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('listEl');
  /** The component's own environment injector — passed explicitly to
   *  afterNextRender (scrollRowIntoView runs from Leaflet/geolocation
   *  callbacks, outside an injection context) and ties the deferred
   *  callback to the component's lifecycle (never fires after destroy). */
  private readonly injector = inject(EnvironmentInjector);

  // ---- shared copy, exposed to the template (Angular's template scope
  // ---- is the component class) ----------------------------------------
  /** The session (the "Add shelter" CTA and the empty-list offer render
   *  only for authenticated users). */
  protected readonly auth = this.store;
  /** The row badge: the source label (registry rows) or the trust-state
   *  label (USER rows). */
  protected readonly sourceTrustLabel = (s: {
    source: ShelterSource;
    reviewStatus: ReviewStatus;
  }): string => sourceTrustLabelShared(s, this.translate);
  protected readonly communityBadgeClass = communityBadgeClassShared;
  /** The fresh-CLOSED badge text — fresh OPEN rows render no badge (open
   *  is the default). */
  protected readonly openStatusBadgeText = (openStatus: OpenStatusDto | null) =>
    openStatusBadgeTextShared(openStatus, this.translate);
  protected readonly occupancyText = (occupancy: ShelterOccupancy) =>
    occupancyTextShared(occupancy, Date.now(), this.translate);
  /** The reported badge with its count — the count is the open
   *  trust-report sum (nonexistent + inaccurate). */
  protected readonly reportedBadgeText = (shelter: {
    nonexistentReports: number;
    inaccurateReports?: number;
  }) => reportedBadgeTextShared(shelter, this.translate);
  /** The straight-line distance line (the honesty format). */
  protected readonly straightLineText = (km: number) => straightLineText(km, this.translate);
  /** The private-location predicate — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;
  /** Trust-badge predicates — the `>` comparisons stay in code, not in
   *  the template expressions. */
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;

  // ---- shelter filters ------------------------------------------------------
  /** Has capacity toggle chip → `hasCapacity=true` (server-side). */
  protected readonly hasCapacity = signal(false);
  /** Open toggle chip (client-side): keeps the rows whose derived display
   *  status reads OPEN (fresh OPEN + nothing-fresh), dropping the
   *  fresh-CLOSED rows (and lifecycle-INACTIVE rows, which never reach
   *  the public list). The BE has no such param, so the chip filters the
   *  loaded list WITHOUT a refetch and re-renders the markers from the
   *  filtered view. */
  protected readonly openOnly = signal(false);

  protected readonly shelters = signal<ShelterDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  /**
   * Sidebar rows: the "Open" chip's client-side filter first, then the
   * legend tone filter (keyed on the SAME markerTone() the map draws
   * with — a selected entry is exactly the pin the map renders, and the
   * filter can never fork the geometry or the colour), then the
   * distance sort — the around-you user position wins (the action's
   * ranking), the browse anchor next, the stable name sort is the
   * default and the tiebreak everywhere.
   */
  protected readonly sorted = computed<ShelterDto[]>(() => {
    const tones = this.legend.selectedTones();
    const rows = this.shelters().filter(
      (row) => (!this.openOnly() || isOpenRowShared(row)) && this.tonePasses(row, tones),
    );
    const list = [...rows];
    const userPosition = this.nearest.userPosition();
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
    const anchor = this.anchor.anchor();
    if (anchor === null) {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort((a, b) => {
      const da = haversineKm(anchor.latitude, anchor.longitude, a.latitude, a.longitude);
      const db = haversineKm(anchor.latitude, anchor.longitude, b.latitude, b.longitude);
      return da - db || a.name.localeCompare(b.name);
    });
  });

  /** True when the row's pin tone passes the legend's selection — a
   *  selection of zero tones shows everything. The selectable tones are
   *  a subset of the markerTone() vocabulary: `user` (the plain default
   *  community marker) is not a selectable tone, so such a row passes
   *  only while no tone is selected. */
  private tonePasses(row: ShelterDto, tones: ReadonlySet<LegendTone>): boolean {
    if (tones.size === 0) {
      return true;
    }
    const tone = markerTone(row);
    return tone !== 'user' && tones.has(tone);
  }

  /** Zero rows for the CURRENT view (the legend tone filter + the Open
   *  chip applied to the loaded list) — only when the fetch settled
   *  cleanly. `sorted()`, not `shelters()`: a filter that matches
   *  nothing must get the shared empty state, never a blank map. */
  protected readonly showEmpty = computed(
    () => !this.loading() && this.error() === null && this.sorted().length === 0,
  );

  /**
   * The legend filter's URL sync (the view IS the URL): every emission
   * (the initial navigation, a toggle, a back-button step, a hand-typed
   * URL) parses + clamps the tones through the view, normalizes a
   * hand-typed value in place (replaceUrl), and applies a changed
   * selection to the display view — the marker layer then re-renders
   * from the filtered view. The initial emission lands before the map
   * exists (create runs in ngAfterViewInit), so its marker re-render is
   * a no-op there — the first load's success path renders from the
   * already-filtered view. Declared after `sorted`/`showEmpty`: the
   * field initializers run in order, and the first emission calls
   * sorted(). Unsubscribed in ngOnDestroy.
   */
  private readonly querySub = this.route.queryParams.subscribe((params) => {
    if (this.legend.syncFromParams(params)) {
      this.leaflet.renderShelters(this.sorted());
    }
  });

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
   * The map container only exists once the view is rendered; a null
   * container (should never happen) skips map creation but never breaks
   * the page.
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
   * The active trust filter, or undefined when none is active. An
   * undefined result keeps the single-arg `list(source)` call shape —
   * the query string stays minimal until the filter is actually set.
   * ("Open" is client-side and never reaches the query string.)
   */
  private activeTrustFilter(): ShelterTrustFilter | undefined {
    return this.hasCapacity() ? { hasCapacity: true } : undefined;
  }

  /**
   * Row click: select (highlight) + fly the map to the shelter at street
   * level. Does NOT navigate — the selected row's "View details" link is
   * the explicit step to /shelters/{id}. Public so specs can drive it
   * (page convention).
   */
  selectShelter(shelter: ShelterDto): void {
    // A manual selection supersedes the Nearest result (the temporary
    // state clears on the next interaction) and any pending search
    // selection (a manual pick is the newer intent).
    this.pendingAnchorSelection = null;
    this.nearest.supersede();
    this.selectedId.set(shelter.id);
    this.leaflet.flyTo(shelter.latitude, shelter.longitude, SHELTER_ZOOM);
  }

  /**
   * Marker click (LeafletService callback): select + zoom exactly like a
   * row click — the user stays on the map looking at the clicked point.
   * Markers are rendered from `sorted()`, so the id lookup runs over the
   * same list. A not-found id (a marker click racing a filter refetch)
   * just selects without a fly — the map already shows that point.
   */
  private onMarkerClick(id: number): void {
    const row = this.sorted().find((s) => s.id === id);
    if (row) {
      this.selectShelter(row);
    } else {
      this.pendingAnchorSelection = null; // a manual pick supersedes it
      this.nearest.supersede(); // an interaction outside the list still supersedes it
      this.selectedId.set(id);
    }
    // The accent (selection ring) may have landed on a row below the fold
    // in the list — scroll it into view so the user sees WHAT was zoomed
    // to.
    this.scrollRowIntoView(id);
  }

  /**
   * Selecting a search result anchors the browse: the anchor pin, the
   * fly to neighbourhood scale, and every row's straight-line distance
   * follow the searched point. A selection supersedes the Nearest
   * result (the next-interaction-supersedes convention).
   *
   * Search-selection focus: on top of the fly-to, the result's NEAREST
   * shelter is selected in the sidebar list — the same selected state a
   * marker click gives (highlight + "View details" link, NO extra fly:
   * the camera already went to the searched point) — and scrolled into
   * view with block 'center'. The search result is an address, not a
   * shelter row, so "the shelter the user selected" is the nearest
   * loaded row to that address (the search exists to compare the
   * surroundings). If nothing is loaded, the list is re-loaded with the
   * CURRENT filters and the nearest row is selected once the load
   * settles (pendingAnchorSelection).
   */
  protected selectAnchorResult(result: GeocodeResult): void {
    this.nearest.supersede();
    this.anchor.select(result);
    this.leaflet.setAnchor(result.latitude, result.longitude, this.i18n.t('map.searched'));
    this.leaflet.flyTo(result.latitude, result.longitude, ANCHOR_ZOOM);
    const hit = nearestShelterAt(result.latitude, result.longitude, this.shelters());
    if (hit === null) {
      // Empty list — refresh with the current filters; the selection
      // lands when the load settles (load's success path consumes the
      // pending).
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
    this.anchor.clear();
    this.leaflet.setAnchor(null, null, ''); // removal — the title is unused
  }

  /**
   * Scroll the row for `id` into view inside the sidebar list — the
   * accent (the selection ring from a marker click) must land on a row
   * the user can actually see.
   *
   * Deferred to afterNextRender: the signal write that triggered this
   * call re-renders the row first (the selected row GROWS its "View
   * details" link), so the scroll measures the final layout, not the
   * pre-update one. `block` defaults to 'nearest': a no-op when the row
   * is already visible (no jumpy re-scroll), the minimum scroll when it
   * isn't. The search-selection focus passes 'center' — the selected
   * row is the point of interest and must sit mid-viewport. A missing
   * list (loading / empty / destroyed) or a missing row (filtered out)
   * is a no-op.
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
   * Load the shelter list (always ALL sources — source is a display
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
        // A filter change re-loads the list — the previous Nearest result
        // (and empty-list offer) is stale by definition (cleared on the
        // next interaction/filter change). nearestError survives: it
        // describes the user's browser, not the list.
        this.nearest.supersede();
        this.nearest.nearestEmpty.set(false);
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
        this.nearest.supersede();
        this.nearest.nearestEmpty.set(false);
        this.leaflet.renderShelters([]);
        // The same banner/error-copy path as every other page: a 429 gets
        // the rate-limited copy, not the raw backend text, resolved
        // through the active locale (a 5xx on the map must not read
        // English to an ET/RU reader).
        this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
        this.loading.set(false);
      },
    );
  }
}
