import {
  afterEveryRender,
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { AuthStore } from '../../session/auth-store';
import type {
  CommunityPulseOccupancy,
  CommunityPulseOpenClosed,
  CommunityPulseRecentReport,
  OccupancyBand,
  OpenState,
  OpenStatusDto,
  ReportShelterRequest,
  ReviewStatus,
  ShelterDetailDto,
  ShelterDto,
  ShelterOccupancy,
  ShelterReportType,
  ShelterSource,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { ListState } from '../../shared/list-state';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ReportGauge } from '../../shared/report-gauge';
import {
  isPrivateLocation,
  hasReports as hasReportsShared,
  hasTrustBadges as hasTrustBadgesShared,
  occupancyText as occupancyTextShared,
  recencyText as recencyTextShared,
  sourceTrustLabel as sourceTrustLabelShared,
  submitterVerificationKey as submitterVerificationKeyShared,
  communityBadgeClass as communityBadgeClassShared,
  reportedBadgeText as reportedBadgeTextShared,
  lastVerifiedText as lastVerifiedTextShared,
  communityReportsText as communityReportsTextShared,
  hasCommunityReports as hasCommunityReportsShared,
  openStatusBadgeText as openStatusBadgeTextShared,
  straightLineText as straightLineTextShared,
} from '../../shared/shelter-copy';
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
import { MONTH_ABBREVS } from '../../core/i18n/locale';

/** Per-error copy for the "Distance from you" action — the map page's
 *  nearest-key vocabulary, reused so each failure kind is translated once
 *  for both pages. */
const DISTANCE_KEY: Record<GeolocationFailureKind, MessageKey> = {
  denied: 'map.nearest.denied',
  timeout: 'map.nearest.timeout',
  unsupported: 'map.nearest.unsupported',
  unavailable: 'map.nearest.unavailable',
  insecure: 'map.nearest.insecure',
};

/** Recent-log kind → localized state-noun key. The lookup is total over
 *  the five-value kind union; the call-site fallback is defensive only. */
const RECENT_KIND_KEYS: Record<CommunityPulseRecentReport['kind'], MessageKey> = {
  OPEN: 'detail.pulse.kind.open',
  CLOSED: 'detail.pulse.kind.closed',
  SPACE: 'detail.pulse.kind.space',
  GETTING_FULL: 'detail.pulse.kind.gettingFull',
  FULL: 'detail.pulse.kind.full',
};

/**
 * /shelters/:id — the public shelter detail page: where a citizen reads a
 * shelter's trust state and reports on it.
 *
 * State in signals, behaviour delegated — the gateway owns the API, the
 * AuthStore the session. After any successful trust-layer write (report /
 * occupancy / open-status) the page refetches: the backend owns the
 * derived state, and a cheap full refetch is always consistent.
 *
 * Location map: a static page-scoped map mounted in every found state
 * (loading, error and shelter — deliberately NOT inside the shelter
 * branch, so the async fetch never races the container). The not-found
 * state renders no container at all, so the map lifetime is tracked
 * explicitly: a flip to not-found destroys the live map (the unmounted
 * container would leak the instance), a found re-render re-creates it on
 * the fresh div. On load success the page flies to the shelter at
 * SHELTER_ZOOM and pins it with one non-interactive marker.
 */
@Component({
  selector: 'app-shelter-detail-page',
  imports: [
    RouterLink,
    NgClass,
    DatePipe,
    ReactiveFormsModule,
    BannerComponent,
    ListState,
    LoadingIndicator,
    ReportGauge,
    TranslatePipe,
  ],
  providers: [LeafletService],
  templateUrl: './shelter-detail-page.html',
  styleUrl: './shelter-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelterDetailPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly store = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly leaflet = inject(LeafletService);
  /** Resolves the report detail field's per-type placeholder. Also the
   *  seam the shared copy helpers resolve their copy through, so every
   *  badge reads in the active locale. */
  private readonly i18n = inject(I18nService);
  /** The active-locale resolver passed to the shared copy helpers. */
  private readonly translate = (
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string => this.i18n.t(key, params);
  /** The active UI locale, exposed to the template so the Info section's
   *  <time> stamps format in the viewer's language, not the content
   *  language. */
  protected readonly uiLocale = this.i18n.locale;

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  /** The shelter id from /shelters/:id (null = invalid id → not-found). */
  readonly id = signal<number | null>(null);
  /** Detail projection — the list fields + yourOccupancyBand. */
  readonly shelter = signal<ShelterDetailDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  /** A trust-layer write (report / occupancy) is in flight. */
  readonly reporting = signal(false);
  readonly notice = signal<{ severity: 'success'; text: string } | null>(null);

  protected readonly auth = this.store;

  /** The shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The header badge shows the
   *  source label (registry rows) or the trust-state label (USER rows)
   *  plus the trust badges; the shared helpers render the same copy as
   *  the map row, one word per fact. */
  protected readonly sourceTrustLabel = (s: {
    source: ShelterSource;
    reviewStatus: ReviewStatus;
  }): string => sourceTrustLabelShared(s, this.translate);
  /** The submitter's verification depth badge key — null renders NO
   *  badge. Rendered through the `| t` pipe so it follows the locale. */
  protected readonly submitterVerificationKey = submitterVerificationKeyShared;
  protected readonly communityBadgeClass = communityBadgeClassShared;
  /** The fresh-CLOSED badge — the same copy the status row uses; fresh
   *  OPEN rows render no badge. */
  protected readonly openStatusBadgeText = (openStatus: OpenStatusDto | null) =>
    openStatusBadgeTextShared(openStatus, this.translate);
  protected readonly occupancyText = (occupancy: ShelterOccupancy) =>
    occupancyTextShared(occupancy, Date.now(), this.translate);
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;
  /** Last-verified meta: the reported badge with its count (the open
   *  trust-report sum), the per-entry verification line and the
   *  community report count line, each a self-contained fact — never
   *  spliced together. */
  protected readonly reportedBadgeText = (shelter: {
    nonexistentReports: number;
    inaccurateReports?: number;
  }) => reportedBadgeTextShared(shelter, this.translate);
  protected readonly lastVerifiedText = (s: {
    lastVerifiedAt: string | null;
    reviewStatus: ReviewStatus;
    createdAt: string;
    source: ShelterSource;
  }): string =>
    lastVerifiedTextShared(s, Date.now(), this.translate, MONTH_ABBREVS[this.i18n.locale()]);
  protected readonly communityReportsText = (reportCount: number) =>
    communityReportsTextShared(reportCount, this.translate);
  /** The shared straight-line distance formatter — the map rows and this
   *  page's distance line share the same honesty format. */
  protected readonly straightLineText = (km: number) => straightLineTextShared(km, this.translate);
  protected readonly hasCommunityReports = hasCommunityReportsShared;

  // ---- community pulse (report aggregation UI) -----------------------
  /**
   * The how-full gauge's aggregate: the fresh (≤ 2 h) band counts + the
   * trust-weighted empty→full share. null = nothing fresh → the explicit
   * empty state (never a neutral arrow). An older backend omits the
   * field (undefined → null).
   */
  protected occupancyPulse(): CommunityPulseOccupancy | null {
    return this.shelter()?.communityPulse?.occupancy ?? null;
  }

  /** The open/closed gauge's aggregate — same rules as {@link occupancyPulse}. */
  protected openPulse(): CommunityPulseOpenClosed | null {
    return this.shelter()?.communityPulse?.openClosed ?? null;
  }

  /** The merged recent-report log: newest first, capped server-side.
   *  Empty → the section's empty state. */
  protected recentReports(): CommunityPulseRecentReport[] {
    return this.shelter()?.communityPulse?.recentReports ?? [];
  }

  /** The open/closed gauge's visible + accessible count line (the PLAIN
   *  fresh counts — the angle is never the only carrier of meaning). */
  protected openPulseText(pulse: CommunityPulseOpenClosed): string {
    return this.i18n.t('detail.pulse.openClosedText', {
      open: pulse.openReports,
      closed: pulse.closedReports,
    });
  }

  /** The how-full gauge's visible + accessible count line. */
  protected occupancyPulseText(pulse: CommunityPulseOccupancy): string {
    return this.i18n.t('detail.pulse.occupancyText', {
      space: pulse.spaceReports,
      gettingFull: pulse.gettingFullReports,
      full: pulse.fullReports,
    });
  }

  /** The log entry's relative time (the shared recency formatter). */
  protected recentReportTime(entry: CommunityPulseRecentReport): string {
    return recencyTextShared(entry.reportedAt, Date.now(), this.translate);
  }

  /** The log entry's "a community member reported: {kind}" line — the
   *  log says what + when, never WHO (privacy: no reporter identity). */
  protected recentReportKind(entry: CommunityPulseRecentReport): string {
    const kindKey: MessageKey = RECENT_KIND_KEYS[entry.kind] ?? 'detail.pulse.kind.full';
    return this.i18n.t('detail.pulse.recentEntry', { kind: this.i18n.t(kindKey) });
  }

  // ---- info section: the last reported status/capacity ----------------
  /**
   * The newest report among the given kinds over the merged recent log.
   * The log is server-ordered newest-first, but the explicit max keeps
   * the rule honest if the order ever drifts. null = no report of those
   * kinds in the log — the row renders its explicit empty state, never a
   * stale or invented status.
   */
  private newestReportOf(
    kinds: readonly CommunityPulseRecentReport['kind'][],
  ): CommunityPulseRecentReport | null {
    let newest: CommunityPulseRecentReport | null = null;
    for (const entry of this.recentReports()) {
      if (!kinds.includes(entry.kind)) {
        continue;
      }
      if (newest === null || Date.parse(entry.reportedAt) > Date.parse(newest.reportedAt)) {
        newest = entry;
      }
    }
    return newest;
  }

  /** The "Status" row's entry: the newest OPEN/CLOSED report — the
   *  newest entry overall may be a how-full report and never becomes the
   *  status. null → the row's empty state. */
  protected lastOpenClosedReport(): CommunityPulseRecentReport | null {
    return this.newestReportOf(['OPEN', 'CLOSED']);
  }

  /** The "Capacity" row's entry: the newest SPACE/GETTING_FULL/FULL
   *  report — an OPEN/CLOSED report never becomes the capacity.
   *  null → the row's empty state. */
  protected lastCapacityReport(): CommunityPulseRecentReport | null {
    return this.newestReportOf(['SPACE', 'GETTING_FULL', 'FULL']);
  }

  /** The reported row's value ("Last reported as {kind}"): the kind noun
   *  reuses the recent log's vocabulary. */
  protected lastReportText(entry: CommunityPulseRecentReport): string {
    const kindKey: MessageKey = RECENT_KIND_KEYS[entry.kind] ?? 'detail.pulse.kind.full';
    return this.i18n.t('detail.lastReported', { kind: this.i18n.t(kindKey) });
  }

  // ---- distance from you ----------------------------------------------
  /** True while the geolocation request for the distance is in flight. */
  protected readonly distancePending = signal(false);
  /** The last success's straight-line distance in km (null = none yet). */
  protected readonly distanceKm = signal<number | null>(null);
  /** The last locate failure's per-error copy (null = none). A failure
   *  renders the error line and NO distance line (the success line is
   *  cleared up front). */
  protected readonly distanceError = signal<string | null>(null);
  /** The private-location predicate — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;

  // ---- trust layer ------------------------------------------------------
  /** The three NEGATIVE report types + their picker labels: the picker is
   *  negative-only — open/closed has its own live-report section below.
   *  CLOSED and OPEN_CONFIRMED stay in the ShelterReportType union, the
   *  admin label map and the historical rendering (they exist in stored
   *  data) but the picker no longer offers them. The factual types
   *  (WRONG_LOCATION / OTHER) carry the detail field's per-type
   *  placeholder; the binary type stays claim-only. */
  protected readonly REPORT_TYPES: {
    value: ShelterReportType;
    labelKey: MessageKey;
    detailKey?: MessageKey;
  }[] = [
    { value: 'NON_EXISTENT', labelKey: 'detail.reportType.nonExistent' },
    {
      value: 'WRONG_LOCATION',
      labelKey: 'detail.reportType.wrongLocation',
      detailKey: 'detail.reportDetailPlaceholder.wrongLocation',
    },
    {
      value: 'OTHER',
      labelKey: 'detail.reportType.other',
      detailKey: 'detail.reportDetailPlaceholder.other',
    },
  ];

  /** The three occupancy bands — the picker's large buttons. */
  protected readonly BANDS: { value: OccupancyBand; labelKey: MessageKey }[] = [
    { value: 'SPACE', labelKey: 'detail.band.space' },
    { value: 'GETTING_FULL', labelKey: 'detail.band.gettingFull' },
    { value: 'FULL', labelKey: 'detail.band.full' },
  ];

  /** The two open/closed states — the picker's large buttons, the band
   *  picker's language mirrored 1:1. */
  protected readonly OPEN_STATES: { value: OpenState; labelKey: MessageKey }[] = [
    { value: 'OPEN', labelKey: 'detail.openState.open' },
    { value: 'CLOSED', labelKey: 'detail.openState.closed' },
  ];

  /** The shelter-report picker is open (the "Report" button toggles it). */
  readonly reportOpen = signal(false);
  readonly reportType = signal<ShelterReportType | null>(null);
  readonly reportDetail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });
  /** Plain sentence-case duplicate (409) line for the open shelter picker. */
  readonly reportDuplicate = signal<string | null>(null);

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;

  /** The tapped open/closed state while the upsert is in flight: the
   *  optimistic pressed state — cleared on settle, the refetch's
   *  yourOpenStatus is the settled pre-select. */
  private readonly openStatusPending = signal<OpenState | null>(null);

  /** True while the Location map instance is alive (the found branch
   *  re-mounts a fresh #mapEl after any not-found flip, so the page must
   *  know when the container outlived the map). */
  private locationMapAlive = false;

  constructor() {
    /**
     * Fires after EVERY render. The found branch RE-MOUNTS a fresh #mapEl
     * after any not-found flip (which destroyed the map) — this re-creates
     * the instance the moment the fresh container is in the DOM (create is
     * a no-op while an instance is alive or the container is absent), and
     * re-pins when the shelter is already loaded (its pin ran on the dead
     * map and no-oped). No re-pin on ordinary renders: the live map
     * already carries the pin and re-flying would restart the animation.
     */
    afterEveryRender(() => {
      const recreated = this.ensureLocationMap();
      if (recreated) {
        const shelter = this.shelter();
        if (shelter !== null) {
          this.pinShelter(shelter);
        }
      }
    });
  }

  /**
   * The Location map container exists at view-init time in every found
   * state (it is NOT inside the shelter branch), so the async fetch never
   * races the map: create at the Estonia default here. A missing
   * container (an invalid :id on first load renders the not-found branch)
   * is a safe no-op via create's null guard. The not-found flip destroys
   * the map (see load() / readShelterId()); a found re-render re-creates
   * it (see the afterRender hook).
   */
  ngAfterViewInit(): void {
    this.ensureLocationMap();
  }

  /**
   * Ensures the Location map instance matches the rendered container:
   * creates it when the found branch's #mapEl is mounted and no instance
   * is alive (first load, or the re-mount after a not-found flip). No-op
   * otherwise — safe to call from every found render and load outcome.
   * @returns true when a fresh instance was created on this call.
   */
  private ensureLocationMap(): boolean {
    const el = this.mapEl()?.nativeElement ?? null;
    if (el === null || this.locationMapAlive) {
      return false;
    }
    this.leaflet.create(el, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.locationMapAlive = true;
    return true;
  }

  /**
   * Drops the live Location map with the unmounting container: the
   * not-found branch renders no #mapEl, so a live instance would leak
   * with its listeners. Null-safe when create was a no-op; the afterRender
   * hook re-arms on the next found render.
   */
  private destroyLocationMap(): void {
    this.locationMapAlive = false;
    this.leaflet.destroy();
  }

  /** Destroys the map with the page (page-scoped instance — zoneless has
   *  no safety net). */
  ngOnDestroy(): void {
    this.destroyLocationMap();
  }

  ngOnInit(): void {
    // Re-read the :id on EVERY navigation to this route — a manual URL
    // edit (/shelters/1 → /shelters/2) must swap the data, not keep the
    // old shelter (a trust-layer write would otherwise land on the wrong
    // shelter). paramMap replays the current params on subscribe; it
    // completes when the route deactivates, so the subscription needs no
    // manual teardown. The fetchSeq guard in load() drops the superseded
    // in-flight response.
    this.route.paramMap.subscribe((params) => this.readShelterId(params.get('id')));
  }

  /** Parse + adopt the :id param (invalid id → not-found state). */
  private readShelterId(raw: string | null): void {
    const parsed = Number(raw);
    if (raw === null || !Number.isInteger(parsed) || parsed <= 0) {
      // The not-found branch unmounts the map container — drop the live
      // map with it, else the instance and its listeners leak.
      this.destroyLocationMap();
      this.notFound.set(true);
      return;
    }
    if (parsed === this.id()) {
      return; // the same shelter — nothing changed
    }
    // A different shelter: drop the previous one's state before the new
    // load resolves (the fetchSeq guard drops the superseded response).
    this.id.set(parsed);
    this.notFound.set(false);
    this.shelter.set(null);
    this.notice.set(null);
    // The trust-layer pickers belong to the previous shelter — close them
    // with the data they were reporting on.
    this.resetTrustPickers();
    // Clear the PREVIOUS shelter's pin (showShelter(null) is the service's
    // clear API) — the new fetch's pin lands on settle; without this the
    // stale marker sits over the map during the load.
    this.leaflet.showShelter(null);
    this.load();
  }

  /** Closes every open trust-layer picker and drops its draft state. */
  private resetTrustPickers(): void {
    this.reportOpen.set(false);
    this.reportType.set(null);
    this.reportDetail.reset();
    this.reportDuplicate.set(null);
    this.openStatusPending.set(null);
  }

  /**
   * Fetch the shelter. 404 → not-found state; any other failure → the
   * error banner with the page chrome intact (shared convention). A
   * superseded response is dropped in full — including its loading-state
   * write, so only the newest load settles the indicator.
   */
  async load(): Promise<void> {
    const id = this.id();
    if (id === null) {
      return;
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    try {
      const shelter = await this.gateway.get(id);
      if (seq !== this.fetchSeq) {
        return; // a newer load (or a page leave) owns the state from here
      }
      this.applyLoadedShelter(shelter);
    } catch (failure: unknown) {
      if (seq !== this.fetchSeq) {
        return; // a newer load (or a page leave) owns the state from here
      }
      this.applyLoadFailure(failure);
    } finally {
      if (seq === this.fetchSeq) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Applies a fresh detail read: the data, then the map — ensure the
   * container holds a live instance (a not-found flip destroyed it and
   * the found re-render mounted a fresh div), then fly to the shelter at
   * street level and pin it.
   */
  private applyLoadedShelter(shelter: ShelterDetailDto): void {
    this.shelter.set(shelter);
    this.ensureLocationMap();
    this.pinShelter(shelter);
  }

  /**
   * Applies a load failure. A failed post-write refetch clears the stale
   * success notice either way, so it never stacks above the error. 404 →
   * the not-found state, which unmounts the map container — the live map
   * is destroyed with it. Any other failure keeps the container mounted
   * (placeholder) — re-creating the map a prior not-found flip destroyed.
   */
  private applyLoadFailure(failure: unknown): void {
    this.notice.set(null);
    if (failure instanceof ApiError && failure.status === 404) {
      this.shelter.set(null);
      this.destroyLocationMap();
      this.notFound.set(true);
      return;
    }
    this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
    this.ensureLocationMap();
  }

  /** Pins the shelter on the Location map: fly to it at street level
   * (SHELTER_ZOOM) + one static marker (showShelter is idempotent — the
   * post-write refetch simply replaces the pin). Skips when the
   * coordinates are missing/non-finite: the map then keeps its
   * placeholder view instead of half-drawing a broken state. */
  private pinShelter(shelter: ShelterDto): void {
    if (!Number.isFinite(shelter.latitude) || !Number.isFinite(shelter.longitude)) {
      return;
    }
    this.leaflet.flyTo(shelter.latitude, shelter.longitude, SHELTER_ZOOM);
    this.leaflet.showShelter(shelter);
  }

  protected hasUserDetails(): boolean {
    const s = this.shelter();
    return s !== null && (s.description !== null || s.capacity !== null);
  }

  // ---- navigate actions -------------------------------------------------
  /**
   * Google Maps walking-directions deep link — a hand-rolled href (no
   * navigation library): the phone opens its own app choice. Coordinates
   * at 5 decimals (the app-wide coordinate format).
   */
  protected navigateUrl(shelter: ShelterDto): string {
    return (
      'https://www.google.com/maps/dir/?api=1' +
      `&destination=${shelter.latitude.toFixed(5)},${shelter.longitude.toFixed(5)}` +
      '&travelmode=walking'
    );
  }

  /** Apple Maps fallback (iOS): the same point, the shelter name as query. */
  protected appleMapsUrl(shelter: ShelterDto): string {
    return (
      `https://maps.apple.com/?daddr=${shelter.latitude.toFixed(5)},${shelter.longitude.toFixed(5)}` +
      `&q=${encodeURIComponent(shelter.name)}`
    );
  }

  /** The header's coordinate line (tabular figures via .num-tabular). */
  protected coordinateLine(shelter: ShelterDto): string {
    return `${shelter.latitude.toFixed(5)}, ${shelter.longitude.toFixed(5)}`;
  }

  /** Coordinates are required on the DTO; the finite guard mirrors
   *  pinShelter — a non-finite point must not render a broken link or
   *  line. */
  protected hasCoordinates(shelter: ShelterDto): boolean {
    return Number.isFinite(shelter.latitude) && Number.isFinite(shelter.longitude);
  }

  /**
   * "Distance from you": the shared high-accuracy geolocation mechanism
   * (secure-context guard, request options, error mapping —
   * shared/geolocation.ts), then the Haversine distance to the shelter's
   * coordinates, computed CLIENT-SIDE — no backend call, no IP
   * geolocation. On success: the straight-line honesty line (never a
   * walking-route or official claim). On failure: the per-error copy, the
   * page otherwise untouched. Public so specs can drive it (page
   * convention).
   */
  distanceFromMe(): void {
    const shelter = this.shelter();
    if (this.distancePending() || shelter === null || !this.hasCoordinates(shelter)) {
      return; // busy, or no point to measure against
    }
    // Drop the last success up front — a failed retry must not leave the
    // stale distance line beside the error.
    this.distanceKm.set(null);
    this.distanceError.set(null);
    this.distancePending.set(true);
    void getCurrentPositionHighAccuracy().then(
      (coords) => {
        this.distancePending.set(false);
        this.distanceKm.set(
          haversineKm(coords.latitude, coords.longitude, shelter.latitude, shelter.longitude),
        );
      },
      (failure: unknown) => {
        this.distancePending.set(false);
        const kind = failure instanceof GeolocationError ? failure.kind : 'unavailable';
        this.distanceError.set(this.i18n.t(DISTANCE_KEY[kind]));
      },
    );
  }

  // ---- report how full --------------------------------------------------
  /**
   * One-tap occupancy upsert: the latest edit wins (the backend keeps ONE
   * live band per user). Success refetches — the aggregate + recency and
   * the picker's pre-select (yourOccupancyBand) both come from the fresh
   * detail projection. Occupancy is display-only: it never hides or
   * recolours anything, so the failure path only surfaces the shared
   * banner copy.
   */
  async reportBand(band: OccupancyBand): Promise<void> {
    const id = this.id();
    if (id === null || this.reporting()) {
      return;
    }
    this.reporting.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.gateway.reportOccupancy(id, band);
      this.notice.set({ severity: 'success', text: this.i18n.t('shelter.notice.occupancySaved') });
      await this.load();
    } catch (failure: unknown) {
      this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.reporting.set(false);
    }
  }

  // ---- report open/closed -------------------------------------------------
  /**
   * The picker's pressed state for a state: the user's current live
   * report (yourOpenStatus) OR the optimistic tap in flight — radio-style,
   * exactly one of the two buttons can be pressed. The refetch's
   * yourOpenStatus is the settled pre-select, so the optimistic flag
   * clears with no flicker on success and reverts on failure.
   */
  protected openStatusPressed(state: OpenState): boolean {
    const shelter = this.shelter();
    return shelter?.yourOpenStatus === state || this.openStatusPending() === state;
  }

  /**
   * One-tap open/closed upsert: the latest edit wins (the backend keeps
   * ONE live state per user). Same shape as the band picker — optimistic
   * pressed state, success refetches (the aggregate + the pre-select both
   * come from the fresh detail projection), the shared banner copy on
   * failure. Open/closed is display-only: the status row and the badges
   * derive from the fresh aggregate.
   */
  async reportOpenStatus(state: OpenState): Promise<void> {
    const id = this.id();
    if (id === null || this.reporting()) {
      return;
    }
    this.reporting.set(true);
    this.openStatusPending.set(state);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.gateway.putOpenStatus(id, state);
      this.notice.set({
        severity: 'success',
        text: this.i18n.t('shelter.notice.openClosedSaved'),
      });
      await this.load();
    } catch (failure: unknown) {
      // The finally reverts the optimistic pressed state — the failed tap
      // must not stay lit.
      this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.reporting.set(false);
      this.openStatusPending.set(null);
    }
  }

  // ---- report this shelter ----------------------------------------------
  /** The verified viewer opens the type picker (inline — no modal). */
  openReport(): void {
    this.reportDuplicate.set(null);
    this.reportOpen.set(true);
  }

  closeReport(): void {
    this.reportOpen.set(false);
    this.reportType.set(null);
    this.reportDetail.reset();
    this.reportDuplicate.set(null);
  }

  /** Radio change in the shelter-report picker. */
  onReportTypeChange(event: Event): void {
    this.reportType.set((event.target as HTMLInputElement).value as ShelterReportType);
  }

  /**
   * The factual-report detail field's per-type placeholder for the picked
   * type — null for the binary types (the claim stands alone). The
   * template renders the field whenever this is non-null, and submit
   * sends a non-blank detail exactly then.
   */
  reportDetailPlaceholder(): string | null {
    const type = this.reportType();
    if (type === null) {
      return null;
    }
    const option = this.REPORT_TYPES.find((t) => t.value === type);
    return option?.detailKey ? this.i18n.t(option.detailKey) : null;
  }

  /**
   * Submit the typed report (verified only — the template gates it). One
   * report per (shelter, user, type): a 409 answers with a PLAIN
   * sentence-case line in the picker (not an error banner). Detail is
   * sent for the factual types (WRONG_LOCATION / OTHER) and only when
   * non-blank.
   */
  async submitReport(): Promise<void> {
    const id = this.id();
    const type = this.reportType();
    if (id === null || type === null || this.reporting()) {
      return;
    }
    const detail = this.reportDetail.value.trim();
    if (this.reportDetailPlaceholder() !== null && this.reportDetail.invalid) {
      this.reportDetail.markAsTouched();
      return;
    }
    const request: ReportShelterRequest = { type };
    if (this.reportDetailPlaceholder() !== null && detail !== '') {
      request.detail = detail;
    }
    this.reporting.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.reportDuplicate.set(null);
    try {
      const result = await this.gateway.report(id, request);
      this.closeReport();
      // The damp flag picks the notice: a self-interested rival vote
      // (the reporter's own similar listing) is recorded with reduced
      // weight and says so — single-sourced copy.
      this.notice.set({
        severity: 'success',
        text: this.i18n.t(
          result?.damped
            ? 'shelter.notice.reportSubmittedDamped'
            : 'shelter.notice.reportSubmitted',
        ),
      });
      // The derived state (nonexistentReports, openStatus) moved
      // server-side — refetch so the header badges reflect it.
      await this.load();
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.status === 409) {
        // The server's standard duplicate message is the source of truth;
        // the fixed line is only the fallback for an empty body.
        this.reportDuplicate.set(failure.message || this.i18n.t('shelter.notice.reportDuplicate'));
      } else {
        this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
      }
    } finally {
      this.reporting.set(false);
    }
  }
}
