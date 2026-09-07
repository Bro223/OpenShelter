import {
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
import { AuthStore } from '../../core/auth-store';
import type { ShelterDto, ShelterReviewDto } from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { ESTONIA_CENTER, ESTONIA_ZOOM, LeafletService, SHELTER_ZOOM } from '../map/leaflet-service';
import { RatingStars } from './rating-stars';
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
 * always mounted in every non-not-found state, so the async shelter fetch
 * never races it: create() runs in ngAfterViewInit at the Estonia default,
 * and the load-success handler flies to the shelter at SHELTER_ZOOM + pins
 * it with showShelter (one non-interactive marker — no picking, no marker
 * navigation). Not-found renders no container at all.
 */
@Component({
  selector: 'app-shelter-detail-page',
  imports: [RouterLink, DatePipe, BannerComponent, RatingStars, ReviewForm],
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

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;

  /**
   * The Location map container exists at view-init time in every non-
   * not-found state (it is NOT inside the shelter branch), so the async
   * fetch never races the map: we create at the Estonia default here and
   * fly to the shelter in the load-success handler. A missing container
   * (the not-found state renders no map) is a safe no-op via create's
   * null guard.
   */
  ngAfterViewInit(): void {
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
  }

  ngOnDestroy(): void {
    // Drop the Location map instance + listeners (page-scoped, same
    // discipline as MapPage / SubmitShelterPage — zoneless has no safety
    // net).
    this.leaflet.destroy();
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = Number(raw);
    if (raw === null || !Number.isInteger(parsed) || parsed <= 0) {
      this.notFound.set(true);
      return;
    }
    this.id.set(parsed);
    this.load();
  }

  /**
   * Fetch shelter + reviews in parallel. 404 -> not-found state; any other
   * failure -> error banner with the page chrome intact (shared convention).
   */
  load(): Promise<void> {
    const id = this.id();
    if (id === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    return Promise.all([this.gateway.get(id), this.reviews.list(id)]).then(
      ([shelter, reviews]) => {
        if (seq !== this.fetchSeq) {
          return; // page left or a newer write superseded this response
        }
        this.shelter.set(shelter);
        this.reviewsList.set(reviews);
        this.loading.set(false);
        // Location map: fly to the shelter at street level + pin it. Both
        // calls are safe no-ops when create() was skipped (not-found
        // renders no container), so no guard is needed here.
        this.pinShelter(shelter);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.loading.set(false);
        if (failure instanceof ApiError && failure.status === 404) {
          this.shelter.set(null);
          this.reviewsList.set([]);
          this.notFound.set(true);
          return;
        }
        this.error.set(bannerMessage(failure, 'shelter'));
      },
    );
  }

  /** Source badge copy (06-CONTEXT decision 6: USER vs registry). */
  protected sourceLabel(shelter: ShelterDto): string {
    return shelter.source === 'USER' ? 'User-submitted' : 'Registry';
  }

  /**
   * Pins the shelter on the Location map: fly to it at street level
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

  /** "2 reviews" / "1 review" — null average renders "No ratings yet". */
  protected reviewCountText(): string {
    const count = this.shelter()?.reviewCount ?? 0;
    return `${count} review${count === 1 ? '' : 's'}`;
  }

  protected hasUserDetails(): boolean {
    const s = this.shelter();
    return s !== null && (s.description !== null || s.capacity !== null);
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
