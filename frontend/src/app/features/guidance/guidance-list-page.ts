import { ChangeDetectionStrategy, Component, inject, type OnDestroy, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Params } from '@angular/router';
import { skip } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { GuidancePostDto, PagedRows } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { ListState } from '../../shared/list-state';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { PAGE_SIZE_DEFAULT, clampPage, lastPage, parsePage, parseSize } from '../../shared/paging';
import { Pagination } from '../../shared/pagination';

/**
 * /blog — the public crisis-guidance index.
 *
 * A thin shell: state in signals, the gateway owns the API (a permit-all
 * read — no auth). The VIEW is the URL: ?page=N and ?size=M, both
 * optional (the defaults are omitted, so a plain link or a refresh keeps
 * the view). The SERVER does the paging over its stable order (pinned
 * first, then publishedAt descending, id descending tie-break) — the page
 * never fetches-and-slices client-side. The un-paged total arrives as
 * X-Total-Count (the gateway surfaces it), which is what makes an
 * out-of-range page distinguishable from a truly empty index: past-the-end
 * renders the shared out-of-range notice with a first-page action, never a
 * bare empty list; the empty state is total === 0 only.
 *
 * The size is per-list: the URL is the state, deliberately not a
 * remembered cross-list preference, so /blog and a later admin list
 * cannot surprise each other. The server answers ONE language per call
 * (the gateway sends the active locale), so a language switch re-fetches
 * the CURRENT page.
 */
@Component({
  selector: 'app-guidance-list-page',
  imports: [
    DatePipe,
    RouterLink,
    BannerComponent,
    ListState,
    LoadingIndicator,
    Pagination,
    TranslatePipe,
  ],
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

  /** The current (effective) view: page is 1-based, size is one of the
      shared paging contract's sizes (shared/paging). */
  readonly page = signal(1);
  readonly size = signal(PAGE_SIZE_DEFAULT);

  /** The un-paged index length (X-Total-Count) and the derived page
      count — 1 even when 0, so "Page 1 of 1" can never say "of 0". */
  readonly total = signal(0);
  readonly pages = signal(1);

  /** The honest out-of-range state: total > 0 AND the URL's page past the
      end (a hand-typed number, a stale shared link, or a locale switch
      that shrank the index). Shown as an explicit notice, NOT the empty
      state (which is reserved for total === 0). */
  readonly outOfRange = signal(false);

  /** Slugs whose hero <img> failed to load (404/network): the broken
      image element is dropped and a fixed-size placeholder takes its
      place, so the card keeps its height and the title link stays the
      card's single accessible link. Reset per successful page load — a
      hero that failed on one page may exist on another (or its asset was
      re-set by an admin). */
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

  /** Superseded-fetch guard: a language switch or a page flip must not
      land the old view's rows over the newer fetch. */
  private fetchSeq = 0;

  /** The language switcher sets I18nService.locale and the index is
      locale-scoped on the server, so a switch re-fetches the CURRENT
      page (no URL change — the locale is not part of the view URL).
      A field initializer (an injection context — toObservable's
      requirement) builds the subscription; toObservable emits the
      current value on subscribe, so skip(1) — only a real switch
      triggers a load. */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.load());

  /** The view IS the URL: every emission (initial navigation and every
      query change — a page/size flip, a back-button step) parses the
      page/size, normalizes a hand-typed value, and loads. queryParams
      emits the current value on subscribe, so the initial load comes
      from here (there is no separate ngOnInit load). */
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
      clamped to the NEAREST legal value (the shared paging policy,
      shared/paging) and the URL is rewritten in place (replaceUrl — no
      history entry for the cosmetic fix), so the selector always shows
      the value that is actually in effect and the URL and the view can
      never quietly disagree. */
  private onQueryChange(params: Params): void {
    const rawPage = params['page'] ?? null;
    const rawSize = params['size'] ?? null;
    const page = parsePage(rawPage);
    const size = parseSize(rawSize);
    if (this.wasClamped(rawPage, page) || this.wasClamped(rawSize, size)) {
      // The normalized URL re-emits through this same subscription and
      // loads there — no double fetch.
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: this.canonicalUrlParams(params, page, size),
        replaceUrl: true,
      });
      return;
    }
    this.page.set(page);
    this.size.set(size);
    void this.load();
  }

  /** A PRESENT raw value that does not round-trip through the shared
      clamp: the policy turned it into a different legal value. */
  private wasClamped(raw: string | null, effective: number): boolean {
    return raw !== null && String(effective) !== raw;
  }

  /** The rewrite's URL parameters: every param the URL already carried,
      with page/size replaced by their normalized form. */
  private canonicalUrlParams(params: Params, page: number, size: number): Record<string, string> {
    const canonical: Record<string, string> = { ...params };
    delete canonical['page'];
    delete canonical['size'];
    return { ...canonical, ...this.viewParams(page, size) };
  }

  /** The view as URL parameters — the default page and size are omitted,
      so the plain /blog link IS the default view. */
  private viewParams(page: number, size: number): Record<string, string> {
    const params: Record<string, string> = {};
    if (page > 1) {
      params['page'] = String(page);
    }
    if (size !== PAGE_SIZE_DEFAULT) {
      params['size'] = String(size);
    }
    return params;
  }

  /** The pagination control's intent (prev/next/size). A SIZE change
      that would strand the current page past the last one clamps the
      page to the last page AT THE NEW SIZE (the total is known whenever
      the control is visible — it only renders at two or more pages), so
      a size flip never lands on a dead page; a page change is written
      verbatim. Either way the canonical URL is written and the fresh
      query emission loads. */
  onNavigate({ page, size }: { page: number; size: number }): void {
    const effectivePage = clampPage(page, this.total(), size);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.viewParams(effectivePage, size),
    });
  }

  /** The out-of-range notice's action: back to the first page (the
      current size is kept if it is non-default). */
  gotoFirstPage(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.viewParams(1, this.size()),
    });
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
        this.applyPage(value, page, size);
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

  /** The response for the requested page: derive the page count and the
      out-of-range flag (total > 0 AND the requested page past the end),
      then swap the rows in — an out-of-range page renders the explicit
      notice, not the empty state (which is total === 0 only). */
  private applyPage(value: PagedRows<GuidancePostDto>, page: number, size: number): void {
    const last = lastPage(value.total, size);
    this.total.set(value.total);
    this.pages.set(last);
    const outOfRange = value.total > 0 && page > last;
    this.outOfRange.set(outOfRange);
    this.posts.set(outOfRange ? [] : value.rows);
    this.failedHeroSlugs.set(new Set());
    this.loading.set(false);
  }
}
