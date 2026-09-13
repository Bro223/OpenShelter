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
import { AuthStore } from '../../session/auth-store';
import type {
  OccupancyBand,
  ReportReviewRequest,
  ReportShelterRequest,
  ReviewReportReason,
  ShelterDetailDto,
  ShelterDto,
  ShelterReportType,
  ShelterReviewDto,
} from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  COMMUNITY_UNVERIFIED_WARNING,
  NO_RATINGS_YET,
  PRIVATE_LOCATION_BADGE,
  PRIVATE_LOCATION_NOTE,
  REPORT_SUBMITTED,
  REPORT_SUBMITTED_DAMPED,
  isPrivateLocation,
  hasReports as hasReportsShared,
  hasTrustBadges as hasTrustBadgesShared,
  occupancyText as occupancyTextShared,
  provenanceBadgeClass as provenanceBadgeClassShared,
  provenanceText as provenanceTextShared,
  reviewCountText as reviewCountTextShared,
  reportedBadgeText as reportedBadgeTextShared,
  lastVerifiedText as lastVerifiedTextShared,
  communityReportsText as communityReportsTextShared,
  hasCommunityReports as hasCommunityReportsShared,
  statusFlagText as statusFlagTextShared,
} from '../../shared/shelter-copy';
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM,
} from '../../shared/leaflet-service';
import { RatingStars } from '../../shared/rating-stars';
import { ReviewForm } from './review-form';

/**
 * /shelters/:id — the public shelter detail page (M5), replacing the M4
 * stub at the same route (05-shelter-review-flow.puml).
 *
 * Thin shell (01-TASK.md §7): state in signals, behaviour delegated —
 * gateways own the API, AuthStore owns the session. Fetches shelter +
 * reviews in parallel on init; after any successful write it refetches both
 * (design decision 4 — the backend owns the rating aggregates, a cheap full
 * refetch is always consistent).
 *
 * "My review" branching lives HERE (design decision 2 — the page owns the
 * auth/verification UX, forms stay dumb):
 *   anonymous -> plain-text login prompt (no inline button — the header
 *                 login is the single entry point; no returnUrl to preserve)
 *   unverified -> verify prompt + link to /verify
 *   verified   -> ReviewForm (add mode, or edit mode once the user's review
 *                 is known this session — the v1 DTO has no author identity,
 *                 so "mine" is tracked locally per 06-CONTEXT decision 2).
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
    RatingStars,
    ReviewForm,
    LoadingIndicator,
  ],
  providers: [LeafletService],
  templateUrl: './shelter-detail-page.html',
  styleUrl: './shelter-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelterDetailPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly reviews = inject(ReviewGateway);
  private readonly store = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly leaflet = inject(LeafletService);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  /** The shelter id from /shelters/:id (null = invalid id -> not-found). */
  readonly id = signal<number | null>(null);
  /** Detail projection — the list fields + yourOccupancyBand (D5). */
  readonly shelter = signal<ShelterDetailDto | null>(null);
  readonly reviewsList = signal<ShelterReviewDto[]>([]);
  /** The reviews half of load() failed — the section shows its own error.
   *  (Promise.allSettled: a reviews 5xx never hides a loaded shelter, N11.) */
  readonly reviewsError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  /** A successful write is in flight (form buttons disable meanwhile). */
  readonly saving = signal(false);
  /** A report/occupancy write is in flight (the trust-layer pickers). */
  readonly reporting = signal(false);
  readonly notice = signal<{ severity: 'success'; text: string } | null>(null);

  /**
   * The user's own review, as saved THIS session (null = none known). The
   * v1 DTO carries no author identity, so this is the page's only "mine"
   * signal: a fresh page load starts in add mode, and a POST that answers
   * "updated" (200) simply adopts the returned review as ours.
   */
  readonly myReview = signal<ShelterReviewDto | null>(null);

  protected readonly auth = this.store;

  /** W24: the shared provenance/rating copy, exposed to the template
   *  (Angular's template scope is the component class). The header badge
   *  shows the server-derived provenance (shelter-provenance-taxonomy M6)
   *  and, from shelter-trust-and-reports, the trust badges (D6). */
  protected readonly provenanceText = provenanceTextShared;
  protected readonly provenanceBadgeClass = provenanceBadgeClassShared;
  protected readonly reviewCountText = reviewCountTextShared;
  protected readonly noRatingsYet = NO_RATINGS_YET;
  protected readonly statusFlagText = statusFlagTextShared;
  protected readonly occupancyText = occupancyTextShared;
  protected readonly hasReports = hasReportsShared;
  protected readonly hasTrustBadges = hasTrustBadgesShared;
  /** Last-verified meta (M8): the reported badge with its count, the per-
   *  entry verification line and the community report count line. */
  protected readonly reportedBadgeText = reportedBadgeTextShared;
  protected readonly lastVerifiedText = lastVerifiedTextShared;
  protected readonly communityReportsText = communityReportsTextShared;
  protected readonly hasCommunityReports = hasCommunityReportsShared;
  /** The unverified warning for NEW community rows (community-review-
   *  queue): rendered in the header next to the provenance chip. */
  protected readonly communityUnverifiedWarning = COMMUNITY_UNVERIFIED_WARNING;
  /** The private-home declaration copy (D7): badge + the resident-offered
   *  detail note. */
  protected readonly privateLocationBadge = PRIVATE_LOCATION_BADGE;
  protected readonly privateLocationNote = PRIVATE_LOCATION_NOTE;
  /** The private-location predicate (D7) — the template stays branch-free. */
  protected readonly isPrivateLocation = isPrivateLocation;

  // ---- trust layer (shelter-trust-and-reports D1/D2/D4/D6) ------------------
  /** The five report types + their picker labels (D1). */
  protected readonly REPORT_TYPES: { value: ShelterReportType; label: string }[] = [
    { value: 'NON_EXISTENT', label: 'It does not exist' },
    { value: 'CLOSED', label: 'It is closed' },
    { value: 'OPEN_CONFIRMED', label: 'It is open' },
    { value: 'WRONG_LOCATION', label: 'The location is wrong' },
    { value: 'OTHER', label: 'Something else' },
  ];

  /** The four review-report reasons + their picker labels (D2). */
  protected readonly REVIEW_REASONS: { value: ReviewReportReason; label: string }[] = [
    { value: 'FALSY_DATA', label: 'False or misleading' },
    { value: 'NOT_RELEVANT', label: 'Not relevant' },
    { value: 'SPAM', label: 'Spam' },
    { value: 'OTHER', label: 'Something else' },
  ];

  /** The three occupancy bands (D4) — the picker's large buttons. */
  protected readonly BANDS: { value: OccupancyBand; label: string }[] = [
    { value: 'SPACE', label: 'Space available' },
    { value: 'GETTING_FULL', label: 'Getting full' },
    { value: 'FULL', label: 'Full' },
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

  /** Per-review picker: the review whose picker is open (one at a time). */
  readonly reviewReportOpenId = signal<number | null>(null);
  readonly reviewReportReason = signal<ReviewReportReason | null>(null);
  readonly reviewReportDetail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });
  readonly reviewReportDuplicate = signal<{ reviewId: number; message: string } | null>(null);

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;

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
    // keep the old shelter (a review POST would otherwise land on the wrong
    // shelter). paramMap replays the current params on subscribe, replacing
    // the old snapshot read; it completes when the route deactivates, so
    // the subscription needs no manual teardown. The fetchSeq guard in
    // load() drops the superseded in-flight response.
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
    this.reviewsList.set([]);
    this.reviewsError.set(null);
    this.myReview.set(null);
    this.notice.set(null);
    // The trust-layer pickers (D1/D2/D4) belong to the previous shelter —
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
    this.reviewReportOpenId.set(null);
    this.reviewReportReason.set(null);
    this.reviewReportDetail.reset();
    this.reviewReportDuplicate.set(null);
  }

  /**
   * Fetch shelter + reviews in parallel. 404 on the shelter -> not-found
   * state; any other shelter failure -> error banner with the page chrome
   * intact (shared convention). A failed REVIEWS half never hides a
   * successfully loaded shelter (reviewer N11) — the reviews section shows
   * its own error state instead.
   */
  load(): Promise<void> {
    const id = this.id();
    if (id === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.reviewsError.set(null);
    this.loading.set(true);
    return Promise.allSettled([this.gateway.get(id), this.reviews.list(id)]).then(
      ([shelterResult, reviewsResult]) => {
        if (seq !== this.fetchSeq) {
          return; // page left or a newer write superseded this response
        }
        const shelterFailed = shelterResult.status === 'rejected';
        const reviewsFailed = reviewsResult.status === 'rejected';
        // Reviewer N12: a failed post-write refetch must not leave the stale
        // success notice stacked above the error banner.
        if (shelterFailed || reviewsFailed) {
          this.notice.set(null);
        }
        if (shelterFailed) {
          const failure = shelterResult.reason;
          if (failure instanceof ApiError && failure.status === 404) {
            this.shelter.set(null);
            this.reviewsList.set([]);
            // The not-found branch unmounts the map container — destroy the
            // live map with it (null-safe when create was a no-op) (M4).
            this.destroyLocationMap();
            this.notFound.set(true);
            this.loading.set(false);
            return;
          }
          this.error.set(bannerMessage(failure, 'shelter'));
          // The error state keeps the container mounted (placeholder) — if
          // a prior not-found flip destroyed the map, re-create it here
          // (M4); a no-op when the instance is still alive.
          this.ensureLocationMap();
        } else {
          this.shelter.set(shelterResult.value);
          // Location map: ensure the container holds a live instance (the
          // not-found flip destroyed it and the found re-render mounted a
          // fresh div — M4), then fly to the shelter at street level + pin
          // it. Both calls are safe no-ops when create() was skipped, so no
          // guard is needed here.
          this.ensureLocationMap();
          this.pinShelter(shelterResult.value);
        }
        if (reviewsFailed) {
          this.reviewsList.set([]);
          this.reviewsError.set(bannerMessage(reviewsResult.reason, 'shelter'));
        } else {
          this.reviewsList.set(reviewsResult.value);
        }
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
   * ReviewForm save (upsert): the backend POSTs-or-updates via /reviews,
   * PUT via /reviews/mine. We use POST when this session has no known
   * review (a prior-session review updates via the same POST — 200), and
   * PUT once the user's review is known. Either way: adopt the result as
   * "mine" + refetch (design decision 4).
   */
  async onSaveReview(review: { rating: number; comment: string | null }): Promise<void> {
    const id = this.id();
    if (id === null || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      let saved: ShelterReviewDto;
      if (this.myReview()) {
        saved = await this.reviews.updateMine(id, review.rating, review.comment);
        this.notice.set({ severity: 'success', text: 'Your review was updated.' });
      } else {
        saved = await this.reviews.add(id, review.rating, review.comment);
        this.notice.set({ severity: 'success', text: 'Your review was saved.' });
      }
      this.myReview.set(saved);
      await this.load();
    } catch (failure: unknown) {
      this.error.set(bannerMessage(failure, 'shelter'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Delete my review (author-only endpoint), then refetch. */
  async onDeleteMyReview(): Promise<void> {
    const id = this.id();
    if (id === null || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.reviews.deleteMine(id);
      this.myReview.set(null);
      this.notice.set({ severity: 'success', text: 'Your review was deleted.' });
      await this.load();
    } catch (failure: unknown) {
      this.error.set(bannerMessage(failure, 'shelter'));
    } finally {
      this.saving.set(false);
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
   * Submit the typed report (verified only — the template gates it). One
   * report per (shelter, user, type): a 409 answers with a PLAIN
   * sentence-case line in the picker (not an error banner). detail is sent
   * only for OTHER and only when non-blank.
   */
  async submitReport(): Promise<void> {
    const id = this.id();
    const type = this.reportType();
    if (id === null || type === null || this.reporting()) {
      return;
    }
    const detail = this.reportDetail.value.trim();
    if (type === 'OTHER' && this.reportDetail.invalid) {
      this.reportDetail.markAsTouched();
      return;
    }
    const request: ReportShelterRequest = { type };
    if (type === 'OTHER' && detail !== '') {
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
      // The derived state (nonexistentReports, statusFlag) moved server-
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

  // ---- per-review report (shelter-trust-and-reports D2) ---------------------
  /**
   * "Mine" detection for a review row: the v1 DTO carries no author id, so
   * a row is provably the viewer's when (a) it is hidden — hidden reviews
   * are NEVER returned to non-authors — or (b) the page saved it this
   * session (myReview). Only non-own rows get a Report action.
   */
  protected isMyReview(review: ShelterReviewDto): boolean {
    if (review.hidden) {
      return true;
    }
    const mine = this.myReview();
    return mine !== null && mine.id === review.id;
  }

  /** Open the reason picker on ONE review row (one at a time). */
  openReviewReport(review: ShelterReviewDto): void {
    if (this.isMyReview(review)) {
      return; // own content is edited/deleted, not reported
    }
    this.reviewReportReason.set(null);
    this.reviewReportDetail.reset();
    this.reviewReportDuplicate.set(null);
    this.reviewReportOpenId.set(review.id);
  }

  closeReviewReport(): void {
    this.reviewReportOpenId.set(null);
    this.reviewReportReason.set(null);
    this.reviewReportDetail.reset();
    this.reviewReportDuplicate.set(null);
  }

  onReviewReportReasonChange(event: Event): void {
    this.reviewReportReason.set((event.target as HTMLInputElement).value as ReviewReportReason);
  }

  /**
   * Submit the review report (verified, non-own rows only). 409 duplicate
   * -> the plain sentence-case line; the 5th report hides the review
   * server-side, so a success refetches (design decision 7) — the row may
   * legitimately disappear from the list after that.
   */
  async submitReviewReport(review: ShelterReviewDto): Promise<void> {
    const id = this.id();
    const reason = this.reviewReportReason();
    if (id === null || reason === null || this.reporting()) {
      return;
    }
    const detail = this.reviewReportDetail.value.trim();
    if (this.reviewReportDetail.invalid) {
      this.reviewReportDetail.markAsTouched();
      return;
    }
    const request: ReportReviewRequest = { reason };
    if (detail !== '') {
      request.detail = detail;
    }
    this.reporting.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.reviewReportDuplicate.set(null);
    try {
      await this.reviews.reportReview(id, review.id, request);
      this.closeReviewReport();
      this.notice.set({ severity: 'success', text: 'Your report was submitted.' });
      await this.load();
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.status === 409) {
        this.reviewReportDuplicate.set({
          reviewId: review.id,
          message: failure.message || 'You have already reported this review.',
        });
      } else {
        this.error.set(bannerMessage(failure, 'shelter'));
      }
    } finally {
      this.reporting.set(false);
    }
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
}
