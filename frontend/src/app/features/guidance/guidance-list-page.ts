import { ChangeDetectionStrategy, Component, inject, type OnDestroy, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Params } from '@angular/router';
import { skip } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { GuidancePostDto } from '../../core/models';
import {
  GUIDANCE_PAGE_SIZE,
  GUIDANCE_PAGE_SIZES,
  GuidanceGateway,
} from '../../gateways/guidance-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { Pagination } from '../../shared/pagination';

/**
 * /blog — the public crisis-guidance index (crisis-guidance D4/D6),
 * paged (guidance-index-paging).
 *
 * <p>Thin shell (01-TASK.md §7): state in signals, the gateway owns the
 * API (a permit-all read — no auth). The VIEW is the URL: ?page=N and
 * ?size=M (both optional — 1 and {@link GUIDANCE_PAGE_SIZE} are the
 * defaults and are omitted from the URL, so a link or a refresh keeps the
 * view). The SERVER does the paging (limit/offset over its stable order,
 * pinned first then publishedAt descending, id descending tie-break); the
 * page never fetches-and-slices client-side. The un-paged total arrives
 * as X-Total-Count (the gateway surfaces it), which is what makes an
 * out-of-range page distinguishable from a truly empty index: past-the-end
 * renders an explicit translated notice with a "show the first page"
 * action, never a bare empty list; the empty state is total === 0 only.
 *
 * <p>The page number belongs in the URL, and so does the size
 * (list-page-paging: 10..100 in steps of 10). The size is per-list —
 * the URL is the state, deliberately NOT a remembered cross-list
 * preference, so /blog and a later admin list cannot surprise each other.
 *
 * <p>Locale scope: the server answers ONE language per call (the gateway
 * sends the active locale), so a language switcher change is a re-fetch
 * of the CURRENT page (the fetchSeq guard keeps a slow response from the
 * previous language from landing over the new fetch).
 */
@Component({
  selector: 'app-guidance-list-page',
  imports: [DatePipe, RouterLink, BannerComponent, LoadingIndicator, Pagination, TranslatePipe],
  templateUrl: './guidance-list-page.html',
  styleUrl: './guidance-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceListPage implements OnDestroy {
  private readonly gateway = inject(GuidanceGateway);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The posts of the CURRENT page; null while the first fetch is in flight. */
  readonly posts = signal<GuidancePostDto[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** The current (effective) view: page is 1-based, size is one of
      {@link GUIDANCE_PAGE_SIZES}. */
  readonly page = signal(1);
  readonly size = signal(GUIDANCE_PAGE_SIZE);
  /** The selectable sizes — the range the ENDPOINT actually serves
      (limit 1..200 honours all of them). */
  readonly pageSizes: number[] = GUIDANCE_PAGE_SIZES;

  /** The un-paged index length (X-Total-Count) and the derived page
      count — 1 even when 0, so "Page 1 of 1" can never say "of 0". */
  readonly total = signal(0);
  readonly pages = signal(1);

  /**
   * The honest out-of-range state: the URL asks for a page past the end
   * (a hand-typed number, a stale shared link, or a locale switch that
   * shrank the index). total > 0 AND page > pages — shown as an explicit
   * notice, NOT the empty state (which is reserved for total === 0).
   */
  readonly outOfRange = signal(false);

  /**
   * Slugs whose hero <img> failed to load (404/network): the broken image
   * element is dropped and a fixed-size neutral placeholder takes its
   * place, so the row keeps its height and the title link stays the row's
   * single accessible link. Reset per successful page load — a hero that
   * 404'd on page 1 may exist on a re-visited page (or the post's hero
   * was re-set by an admin).
   */
  private readonly failedHeroSlugs = signal<ReadonlySet<string>>(new Set());

  /** Template seam: did this post's hero image fail to load? */
  heroFailed(slug: string): boolean {
    return this.failedHeroSlugs().has(slug);
  }

  /**
   * The <img (error)> handler: drop the broken thumbnail for this post.
   * Idempotent — a natural load error and a synthetic one may both arrive.
   */
  onHeroImageError(_event: Event, slug: string): void {
    const failed = new Set(this.failedHeroSlugs());
    if (failed.has(slug)) {
      return;
    }
    failed.add(slug);
    this.failedHeroSlugs.set(failed);
  }

  /** The fetchSeq guard drops a superseded in-flight response (the
      guidance-detail's pattern: a language switch or a page flip must not
      land the old view's rows over the new fetch). */
  private fetchSeq = 0;

  /** The language switcher sets I18nService.locale: the index is
      locale-scoped on the server, so a switch re-fetches the CURRENT
      page (no URL change — the locale is not part of the view URL). A
      field initializer (an injection context — toObservable's
      requirement) builds the subscription; toObservable emits the
      CURRENT value on subscribe, so skip(1) — only a real switch
      triggers a load. */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.load());

  /** The view IS the URL: every emission (initial navigation and every
      query change — a page/size flip, a back-button step) parses the
      page/size, normalizes a hand-typed value, and loads. queryParamMap
      / queryParams emit the current value on subscribe, so the initial
      load comes from here (there is no separate ngOnInit load). */
  private readonly querySub = this.route.queryParams.subscribe((params) =>
    this.onQueryChange(params),
  );

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
    this.querySub.unsubscribe();
  }

  /** Parse + normalize the view parameters, then load.
      A raw value that is not a legal member of the domain (non-numeric,
      a size outside 10..100 or off the step of 10, a page below 1) is
      clamped to the NEAREST legal value and the URL is normalized in
      place (replaceUrl — no history entry for the cosmetic fix), so the
      selector always shows the value that is actually in effect and the
      URL and the view can never quietly disagree. */
  private onQueryChange(params: Params): void {
    const rawPage = params['page'] ?? null;
    const rawSize = params['size'] ?? null;
    const page = this.parsePage(rawPage);
    const size = this.parseSize(rawSize);
    const canonical: Record<string, string> = { ...params };
    if (page > 1) {
      canonical['page'] = String(page);
    } else {
      delete canonical['page'];
    }
    if (size !== GUIDANCE_PAGE_SIZE) {
      canonical['size'] = String(size);
    } else {
      delete canonical['size'];
    }
    const dirty =
      (rawPage !== null && String(page) !== rawPage) ||
      (rawSize !== null && String(size) !== rawSize) ||
      (rawPage === null && page !== 1) ||
      (rawSize === null && size !== GUIDANCE_PAGE_SIZE);
    if (dirty) {
      // The normalized URL re-emits through this same subscription and
      // loads there — no double fetch.
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: canonical,
        replaceUrl: true,
      });
      return;
    }
    this.page.set(page);
    this.size.set(size);
    void this.load();
  }

  /** page: 1-based integer; missing/non-numeric/below 1 -> 1. */
  private parsePage(raw: string | null): number {
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 1 ? n : 1;
  }

  /** size: clamp to the nearest member of 10..100 step 10; missing ->
      the default. The selector can only offer legal values, so this
      only matters for hand-typed URLs. */
  private parseSize(raw: string | null): number {
    const n = raw === null ? NaN : Number(raw);
    if (!Number.isFinite(n)) {
      return GUIDANCE_PAGE_SIZE;
    }
    const stepped = Math.round(n / 10) * 10;
    return Math.min(100, Math.max(10, stepped));
  }

  /** The pagination control's intent (prev/next/size). A SIZE change
      that would strand the current page past the last one clamps the
      page to the last page AT THE NEW SIZE (the total is known whenever
      the control is visible — it only renders at two or more pages), so
      a size flip never lands on a dead page; a page change is written
      verbatim. Either way the canonical URL is written and the fresh
      query emission loads. */
  onNavigate({ page, size }: { page: number; size: number }): void {
    const knownTotal = this.total();
    const lastPage = knownTotal > 0 ? Math.max(1, Math.ceil(knownTotal / size)) : 1;
    const effectivePage = Math.min(Math.max(1, page), lastPage);
    const queryParams: Record<string, string> = {};
    if (effectivePage > 1) {
      queryParams['page'] = String(effectivePage);
    }
    if (size !== GUIDANCE_PAGE_SIZE) {
      queryParams['size'] = String(size);
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  /** The out-of-range notice's action: back to the first page (the
      current size is kept if it is non-default). */
  gotoFirstPage(): void {
    const queryParams: Record<string, string> = {};
    if (this.size() !== GUIDANCE_PAGE_SIZE) {
      queryParams['size'] = String(this.size());
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  /** Fetch the CURRENT page of the published index; a failure lands in
      the shared error banner with the page chrome intact (shared
      convention). */
  load(): Promise<void> {
    const seq = ++this.fetchSeq;
    const page = this.page();
    const size = this.size();
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.listPage(page, size).then(
      (value) => {
        if (seq !== this.fetchSeq) {
          return; // a newer fetch superseded this one (switch/page flip)
        }
        const { posts, total } = value;
        this.total.set(total);
        const pages = total > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
        this.pages.set(pages);
        const outOfRange = total > 0 && page > pages;
        this.outOfRange.set(outOfRange);
        this.posts.set(outOfRange ? [] : posts);
        this.failedHeroSlugs.set(new Set());
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
        this.loading.set(false);
      },
    );
  }
}
