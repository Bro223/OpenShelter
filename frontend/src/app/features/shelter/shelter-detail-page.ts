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
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type { ShelterDto, ShelterReviewDto } from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  NO_RATINGS_YET,
  reviewCountText as reviewCountTextShared,
  sourceLabel as sourceLabelShared,
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
 *   anonymous -> login prompt (returnUrl preserves the shelter)
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
  imports: [RouterLink, DatePipe, BannerComponent, RatingStars, ReviewForm, LoadingIndicator],
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
  readonly shelter = signal<ShelterDto | null>(null);
  readonly reviewsList = signal<ShelterReviewDto[]>([]);
  /** The reviews half of load() failed — the section shows its own error.
   *  (Promise.allSettled: a reviews 5xx never hides a loaded shelter, N11.) */
  readonly reviewsError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  /** A successful write is in flight (form buttons disable meanwhile). */
  readonly saving = signal(false);
  readonly notice = signal<{ severity: 'success'; text: string } | null>(null);

  /**
   * The user's own review, as saved THIS session (null = none known). The
   * v1 DTO carries no author identity, so this is the page's only "mine"
   * signal: a fresh page load starts in add mode, and a POST that answers
   * "updated" (200) simply adopts the returned review as ours.
   */
  readonly myReview = signal<ShelterReviewDto | null>(null);

  protected readonly auth = this.store;

  /** W24: the shared source/rating copy, exposed to the template (Angular's
   *  template scope is the component class). */
  protected readonly sourceLabel = sourceLabelShared;
  protected readonly reviewCountText = reviewCountTextShared;
  protected readonly noRatingsYet = NO_RATINGS_YET;

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
    this.load();
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
}
