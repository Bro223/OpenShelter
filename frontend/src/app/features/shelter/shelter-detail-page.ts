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
  OccupancyBand,
  OpenState,
  ReportShelterRequest,
  ShelterDetailDto,
  ShelterDto,
  ShelterReportType,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  COMMUNITY_UNVERIFIED_WARNING,
  INACCURATE_WARNING,
  PRIVATE_LOCATION_BADGE,
  PRIVATE_LOCATION_NOTE,
  REPORT_SUBMITTED,
  REPORT_SUBMITTED_DAMPED,
  isPrivateLocation,
  hasReports as hasReportsShared,
  hasTrustBadges as hasTrustBadgesShared,
  occupancyText as occupancyTextShared,
  sourceTrustLabel as sourceTrustLabelShared,
  communityBadgeClass as communityBadgeClassShared,
  shelterStatusText as shelterStatusTextShared,
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

/**
 * Per-error copy for the "Distance from you" action (location-navigation
 * M12) — the map page's NEAREST_COPY vocabulary, MIRRORED here, not shared
 * (the W9/W15 duplication convention: documented, not shared across
 * features). The trailing alternatives differ — the detail page has no
 * retry-of-a-list: its alternatives are the two deep links beside the
 * action.
 */
const DISTANCE_COPY = {
  denied: 'Location permission is off. Allow location access in your browser, then try again.',
  timeout: 'Finding your location timed out. Try again in a moment.',
  unsupported: 'Your browser does not support location access. Check your browser settings.',
  unavailable: 'Your location could not be determined right now. Try again in a moment.',
  insecure: 'Location access needs a secure (https) connection.',
} as const;

/** Great-circle distance in kilometres (Haversine) — the client-side
 *  distance-from-you computation (the map page's own copy, mirrored: the
 *  W9/W15 convention, the D2 "no new endpoint" precedent). */
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
 * /shelters/:id — the public shelter detail page (M5), replacing the M4
 * stub at the same route (05-shelter-review-flow.puml).
 *
 * Thin shell (01-TASK.md §7): state in signals, behaviour delegated —
 * gateways own the API, AuthStore owns the session. Fetches the shelter on
 * init; after any successful trust-layer write (report / occupancy /
 * open-status) it refetches — the backend owns the derived state, a cheap
 * full refetch is always consistent.
 *
 * The reviews model is GONE (owner decision): no review list, no review
 * form, no per-review reports. In place of the old Reviews section the
 * page shows a small practical info block (the derived display status —
 * "Open" / "Reported closed" / "Closed" — shared rule with the map's
 * "Open" chip, existing row data only).
 *
 * Location map: a small STATIC map under the header (page-scoped
 * LeafletService, same pattern as the /submit mini-map). The container is
 * mounted in every FOUND state — loading, error and shelter, all inside the
 * not-found @else branch (it is NOT inside the shelter branch, so the async
 * fetch never races the map). The not-found state renders no container at
 * all, so the map lifetime is tracked explicitly (M4): create() runs in
 * ngAfterViewInit at the Estonia default (null-guarded when the container is
 * absent, e.g. an invalid :id on first load); a flip to the not-found state
 * (load 404 / invalid id) destroys the live map, otherwise the unmounted
 * container would leak the instance; a not-found -> found flip re-creates
 * the map on the FRESH div when the load settles (see ensureLocationMap()).
 * On load success the page flies to the shelter at SHELTER_ZOOM + pins it
 * with showShelter (one non-interactive marker — no picking, no marker
 * navigation).
 */
@Component({
  selector: 'app-shelter-detail-page',
  imports: [
    RouterLink,
    NgClass,
    DatePipe,
    ReactiveFormsModule,
    BannerComponent,
    LoadingIndicator,
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
  /** Resolves the report detail field's per-type placeholder (i18n-et-en M14 slice 2). */
  private readonly i18n = inject(I18nService);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  /** The shelter id from /shelters/:id (null = invalid id -> not-found). */
  readonly id = signal<number | null>(null);
  /** Detail projection — the list fields + yourOccupancyBand (D5). */
  readonly shelter = signal<ShelterDetailDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  /** A trust-layer write (report / occupancy) is in flight. */
  readonly reporting = signal(false);
  readonly notice = signal<{ severity: 'success'; text: string } | null>(null);

  protected readonly auth = this.store;

  /** W24: the shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The header badge shows the
   *  source label (registry rows) or the trust-state label (USER rows,
   *  community-review-queue D5) and, from shelter-trust-and-reports, the
   *  trust badges (D6). */
  protected readonly sourceTrustLabel = sourceTrustLabelShared;
  protected readonly communityBadgeClass = communityBadgeClassShared;
  /** The derived display status ("Open" / "Reported closed" / "Closed" /
   *  "Open (no recent reports)") — the practical info block, shared rule
   *  with the map's "Open" chip. */
  protected readonly shelterStatusText = shelterStatusTextShared;
  /** The list row's fresh-CLOSED badge (open-status wave) — the same copy
   *  the status row uses; fresh OPEN rows render no badge. */
  protected readonly openStatusBadgeText = openStatusBadgeTextShared;
  protected readonly occupancyText = occupancyTextShared;
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;
  /** Last-verified meta (M8): the reported badge with its count, the per-
   *  entry verification line and the community report count line. */
  protected readonly reportedBadgeText = reportedBadgeTextShared;
  protected readonly lastVerifiedText = lastVerifiedTextShared;
  protected readonly communityReportsText = communityReportsTextShared;
  /** The shared straight-line distance formatter (location-navigation
   *  M12: moved to the shared copy module — the map rows + this page's
   *  distance line consume the same honesty format). */
  protected readonly straightLineText = straightLineTextShared;
  protected readonly hasCommunityReports = hasCommunityReportsShared;

  // ---- distance from you (location-navigation M12) -----------------------
  /** True while the geolocation request for the distance is in flight. */
  protected readonly distancePending = signal(false);
  /** The last success's straight-line distance in km (null = none yet). */
  protected readonly distanceKm = signal<number | null>(null);
  /** The last locate failure's per-error copy (null = none). A failure
   *  renders the error line and NO distance line (the success line clears
   *  up front, the same F1 convention as the map CTA). */
  protected readonly distanceError = signal<string | null>(null);
  /** The unverified warning for NEW community rows (community-review-
   *  queue): rendered in the header next to the trust-state badge. */
  protected readonly communityUnverifiedWarning = COMMUNITY_UNVERIFIED_WARNING;
  /** The single-sourced "reported inaccurate" warning (M10 slice 4):
   *  rendered in the header for a moderator-marked row — independent of
   *  the review state, the row stays visible. */
  protected readonly inaccurateWarning = INACCURATE_WARNING;
  /** The private-home declaration copy (D7): badge + the resident-offered
   *  detail note. */
  protected readonly privateLocationBadge = PRIVATE_LOCATION_BADGE;
  protected readonly privateLocationNote = PRIVATE_LOCATION_NOTE;
  /** The private-location predicate (D7) — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;

  // ---- trust layer (shelter-trust-and-reports D1/D4/D6) ----------------------
  /** The three NEGATIVE report types + their picker labels (open-status
   *  wave): the picker is negative-only now — "It does not exist" /
   *  "The location is wrong" / "Something else". CLOSED and OPEN_CONFIRMED
   *  stay in the ShelterReportType union, the admin label map and the
   *  historical rendering (they exist in stored data), but the picker no
   *  longer offers either — open/closed moved to its own live-report
   *  section below. M11 factual fields: the factual types (WRONG_LOCATION
   *  / OTHER) carry the detail field's per-type placeholder; the binary
   *  type stays claim-only. */
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

  /** The three occupancy bands (D4) — the picker's large buttons. */
  protected readonly BANDS: { value: OccupancyBand; labelKey: MessageKey }[] = [
    { value: 'SPACE', labelKey: 'detail.band.space' },
    { value: 'GETTING_FULL', labelKey: 'detail.band.gettingFull' },
    { value: 'FULL', labelKey: 'detail.band.full' },
  ];

  /** The two open/closed states (open-status wave) — the picker's large
   *  buttons, the band picker's language mirrored 1:1. */
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

  /** The tapped open/closed state while the upsert is in flight (open-
   *  status wave): the optimistic pressed state — cleared on settle, the
   *  refetch's yourOpenStatus is the settled pre-select. */
  private readonly openStatusPending = signal<OpenState | null>(null);

  /** True while the Location map instance is alive (M4 — see the afterRender
   *  hook: the found branch re-mounts a fresh #mapEl after any not-found
   *  flip, so the page must know when the container outlived the map). */
  private locationMapAlive = false;

  constructor() {
    /**
     * M4: fires after EVERY render of this component. The found branch
     * RE-MOUNTS a fresh #mapEl after any not-found flip (which destroyed
     * the map) — this re-creates the instance the moment the fresh
     * container is in the DOM (create is a no-op while an instance is
     * alive or the container is absent), and re-pins when the shelter is
     * already loaded (its pin ran on the dead map and no-oped). The
     * load-success path pins the other way (fetch in flight at re-render).
     */
    afterEveryRender(() => {
      const recreated = this.ensureLocationMap();
      if (recreated) {
        // The fresh map has no pin yet — the pre-recreation pin no-oped on
        // the dead instance. (No re-pin on ordinary renders: the live map
        // already carries the pin and re-flying would restart the
        // animation on every render.)
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
   * races the map: we create at the Estonia default here. A missing
   * container (an invalid :id on first load renders the not-found branch)
   * is a safe no-op via create's null guard. The not-found flip destroys
   * the map — see load() / readShelterId(); a found re-render re-creates
   * it — see the afterRender hook.
   */
  ngAfterViewInit(): void {
    this.ensureLocationMap();
  }

  /**
   * Ensures the Location map instance matches the rendered container (M4):
   * creates it when the found branch's #mapEl is mounted and no instance is
   * alive (first load, or the re-mount after a not-found flip). No-op
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
   * Drops the live Location map with the unmounting container (M4):
   * the not-found branch renders no #mapEl, so a live instance would leak with
   * its listeners. Null-safe when create was a no-op; the afterRender hook
   * re-arms on the next found render.
   */
  private destroyLocationMap(): void {
    this.locationMapAlive = false;
    this.leaflet.destroy();
  }

  ngOnDestroy(): void {
    // Drop the Location map instance + listeners (page-scoped, same
    // discipline as MapPage / SubmitShelterPage — zoneless has no safety
    // net).
    this.locationMapAlive = false;
    this.leaflet.destroy();
  }

  ngOnInit(): void {
    // Reviewer N7: re-read the :id on EVERY navigation to this route — a
    // manual URL edit (/shelters/1 -> /shelters/2) must swap the data, not
    // keep the old shelter (a trust-layer write would otherwise land on the
    // wrong shelter). paramMap replays the current params on subscribe,
    // replacing the old snapshot read; it completes when the route
    // deactivates, so the subscription needs no manual teardown. The
    // fetchSeq guard in load() drops the superseded in-flight response.
    this.route.paramMap.subscribe((params) => this.readShelterId(params.get('id')));
  }

  /** Parse + adopt the :id param (invalid id -> not-found state). */
  private readShelterId(raw: string | null): void {
    const parsed = Number(raw);
    if (raw === null || !Number.isInteger(parsed) || parsed <= 0) {
      // The not-found branch unmounts the map container — drop the live map
      // with it (null-safe when create was a no-op), else the instance and
      // its listeners leak (M4).
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
    // The trust-layer pickers (D1/D4) belong to the previous shelter —
    // close them with the data they were reporting on.
    this.resetTrustPickers();
    // F9: clear the PREVIOUS shelter's pin (showShelter(null) is the
    // service's clear API) — the new fetch's pin lands on settle; without
    // this the stale marker sits over the map during the load.
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
   * Fetch the shelter. 404 -> not-found state; any other failure -> error
   * banner with the page chrome intact (shared convention). A failed
   * post-write refetch clears the stale success notice (reviewer N12).
   */
  load(): Promise<void> {
    const id = this.id();
    if (id === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.get(id).then(
      (value) => {
        if (seq !== this.fetchSeq) {
          return; // page left or a newer write superseded this response
        }
        this.shelter.set(value);
        // Location map: ensure the container holds a live instance (the
        // not-found flip destroyed it and the found re-render mounted a
        // fresh div — M4), then fly to the shelter at street level + pin
        // it. Both calls are safe no-ops when create() was skipped, so no
        // guard is needed here.
        this.ensureLocationMap();
        this.pinShelter(value);
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        // Reviewer N12: a failed post-write refetch must not leave the stale
        // success notice stacked above the error banner.
        this.notice.set(null);
        if (failure instanceof ApiError && failure.status === 404) {
          this.shelter.set(null);
          // The not-found branch unmounts the map container — destroy the
          // live map with it (null-safe when create was a no-op) (M4).
          this.destroyLocationMap();
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.error.set(bannerMessage(failure, 'shelter'));
        // The error state keeps the container mounted (placeholder) — if a
        // prior not-found flip destroyed the map, re-create it here (M4);
        // a no-op when the instance is still alive.
        this.ensureLocationMap();
        this.loading.set(false);
      },
    );
  }

  /** Pins the shelter on the Location map: fly to it at street level
   * (SHELTER_ZOOM) + one static marker (showShelter is idempotent — the
   * post-write refetch simply replaces the pin). Skips when the
   * coordinates are missing/non-finite: the map then keeps its placeholder
   * view instead of half-drawing a broken state.
   */
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

  // ---- navigate actions (map-crisis-actions D3) ----------------------------
  /**
   * Google Maps walking-directions deep link — a hand-rolled href (no
   * navigation library): the phone opens its own app choice. Coordinates at
   * 5 decimals (the app-wide coordinate format).
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

  /** The header's coordinate line (D6 — tabular figures via .num-tabular). */
  protected coordinateLine(shelter: ShelterDto): string {
    return `${shelter.latitude.toFixed(5)}, ${shelter.longitude.toFixed(5)}`;
  }

  /** Coordinates are required on the DTO; the finite guard mirrors
   *  pinShelter — a non-finite point must not render a broken link or line. */
  protected hasCoordinates(shelter: ShelterDto): boolean {
    return Number.isFinite(shelter.latitude) && Number.isFinite(shelter.longitude);
  }

  /**
   * "Distance from you" (location-navigation M12): the map CTA's EXACT
   * geolocation options ({ enableHighAccuracy: true, timeout: 10000,
   * maximumAge: 0 }) + secure-context guard, then the Haversine distance
   * to the shelter's own coordinates, computed CLIENT-SIDE — no backend
   * call, no IP geolocation (locked). On success: the honesty line
   * "≈ … straight line from you" (never a walking-route or official
   * claim). On failure: per-error copy (the map CTA's mirrored
   * vocabulary); the page stays otherwise untouched. Public so specs can
   * drive it (page convention).
   */
  distanceFromMe(): void {
    const shelter = this.shelter();
    if (this.distancePending() || shelter === null || !this.hasCoordinates(shelter)) {
      return; // busy, or no point to measure against
    }
    // F1 convention: drop the last success up front — a failed retry must
    // not leave the stale distance line beside the error.
    this.distanceKm.set(null);
    this.distanceError.set(null);
    if (window.isSecureContext === false) {
      this.distanceError.set(DISTANCE_COPY.insecure);
      return;
    }
    const geolocation = navigator.geolocation;
    // jsdom leaves navigator.geolocation undefined — `!` covers null AND
    // undefined (the map page's guard).
    if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
      this.distanceError.set(DISTANCE_COPY.unsupported);
      return;
    }
    this.distancePending.set(true);
    geolocation.getCurrentPosition(
      (position) => {
        this.distancePending.set(false);
        this.distanceKm.set(
          haversineKm(
            position.coords.latitude,
            position.coords.longitude,
            shelter.latitude,
            shelter.longitude,
          ),
        );
      },
      (err) => {
        this.distancePending.set(false);
        // Duck-typed code read (the map page's pattern — jsdom does not
        // define GeolocationPositionError).
        const code = typeof err?.code === 'number' ? err.code : 2;
        let kind: keyof typeof DISTANCE_COPY;
        if (code === 1) {
          kind = 'denied';
        } else if (code === 3) {
          kind = 'timeout';
        } else {
          kind = 'unavailable';
        }
        this.distanceError.set(DISTANCE_COPY[kind]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  // ---- report how full (shelter-trust-and-reports D4/D6) --------------------
  /**
   * One-tap occupancy upsert: the latest edit wins (the backend keeps ONE
   * live band per user). Success refetches — the aggregate + recency and
   * the picker's pre-select (yourOccupancyBand) both come from the fresh
   * detail projection. Occupancy is display-only: it never hides or recolours
   * anything, so the failure path only surfaces the shared banner copy.
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
      this.notice.set({ severity: 'success', text: 'Your occupancy report was saved.' });
      await this.load();
    } catch (failure: unknown) {
      this.error.set(bannerMessage(failure, 'shelter'));
    } finally {
      this.reporting.set(false);
    }
  }

  // ---- report open/closed (open-status wave) --------------------------------
  /**
   * The picker's pressed state for a state (open-status wave): the user's
   * current live report (yourOpenStatus) OR the optimistic tap in flight —
   * radio-style, exactly one of the two buttons can be pressed. The
   * refetch's yourOpenStatus is the settled pre-select, so the optimistic
   * flag clears with no flicker on success and reverts on failure.
   */
  protected openStatusPressed(state: OpenState): boolean {
    const shelter = this.shelter();
    return shelter?.yourOpenStatus === state || this.openStatusPending() === state;
  }

  /**
   * One-tap open/closed upsert: the latest edit wins (the backend keeps ONE
   * live state per user). Same shape as the band picker — optimistic
   * pressed state, success refetches (the aggregate + the picker's
   * pre-select, yourOpenStatus, both come from the fresh detail
   * projection), the shared banner copy on failure. Open/closed is
   * display-only: it never hides or recolours anything itself — the status
   * row and the badges derive from the fresh aggregate.
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
      this.notice.set({ severity: 'success', text: 'Your open/closed report was saved.' });
      await this.load();
    } catch (failure: unknown) {
      // The finally below reverts the optimistic pressed state (the failed
      // tap must not stay lit); the shared banner copy surfaces the error.
      this.error.set(bannerMessage(failure, 'shelter'));
    } finally {
      this.reporting.set(false);
      this.openStatusPending.set(null);
    }
  }

  // ---- report this shelter (shelter-trust-and-reports D1/D6) ---------------
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
   * M11 (factual report fields): the detail field's per-type placeholder for
   * the picked type — null for the binary types (the claim stands alone).
   * The template renders the field whenever this is non-null, and submit
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
   * sentence-case line in the picker (not an error banner). M11: detail is
   * sent for the factual types (CLOSED / WRONG_LOCATION / OTHER) and only
   * when non-blank.
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
      // The damp flag picks the notice (M9): a self-interested rival vote
      // (the reporter's own similar listing) is recorded with reduced
      // weight and says so — single-sourced copy.
      this.notice.set({
        severity: 'success',
        text: result?.damped ? REPORT_SUBMITTED_DAMPED : REPORT_SUBMITTED,
      });
      // The derived state (nonexistentReports, openStatus) moved server-
      // side — refetch so the header badges reflect it (design decision 7).
      await this.load();
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.status === 409) {
        // The server's standard duplicate message is the source of truth
        // (map-browse delta: duplicate → the standard 409 message); the
        // fixed line is only the fallback for an empty body.
        this.reportDuplicate.set(
          failure.message || 'You have already reported this shelter with this report type.',
        );
      } else {
        this.error.set(bannerMessage(failure, 'shelter'));
      }
    } finally {
      this.reporting.set(false);
    }
  }
}
