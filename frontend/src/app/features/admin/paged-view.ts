import {
  computed,
  signal,
} from '@angular/core';
import type { ActivatedRoute, Router, Params } from '@angular/router';
import { bannerMessage } from '../../shared/error-copy';
import {
  PAGE_SIZE_DEFAULT,
  clampPage,
  lastPage,
  parsePage,
  parseSize,
} from '../../shared/paging';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * The host-page dependencies the view reads: the route/router for the
 * URL contract, i18n for the banner copy, and the fetch — the gateway
 * call differs per tab, so it is injected.
 */
interface PagedViewDeps<T> {
  /** The tab's namespaced URL params on the shared /admin route
   *  (e.g. `reportPage` / `reportSize`). */
  pageParam: string;
  sizeParam: string;
  i18n: I18nService;
  route: ActivatedRoute;
  router: Router;
  /** The tab's extra view scope (the reports filter) as part of the
   *  last-applied key — an absent part never re-loads on its own. */
  keyPart?: () => string;
  fetch: (page: number, size: number) => Promise<{ rows: T[]; total: number }>;
}

/**
 * The paged list's URL→state→load seam, shared by the four server-paged
 * admin tabs (the report queue, the accounts, the media library, the
 * audit trail): the page/size signals, the un-paged total
 * (X-Total-Count) with the derived page count / out-of-range flag, the
 * in-flight fetch-sequence guard, and the URL write (defaults omitted —
 * page 1, size 20 — so a hand-opened /admin?… pre-fills the view and a
 * default never appears in the URL).
 *
 * A state object, not a component: the tabs' presentation is already
 * extracted (the presentational panel contract: OnPush, inputs in,
 * outputs out), and the state must survive tab switches (a visit after
 * a load keeps the in-memory rows — the lazy-load rule), so it lives on
 * the page's lifetime, one level below the page: the page constructs it
 * once, hands it the fetch, and the template feeds the panel's
 * inputs/outputs through it.
 *
 * The URL contract: the view IS the URL (a link or a refresh keeps the
 * page and the size). `syncFromParams` is the only writer of the view
 * signals from the URL (the page's queryParams subscription and the tab
 * switch both funnel through it); `navigate` is the only writer of the
 * URL from the view. The hand-typed-value normalization (replaceUrl)
 * stays with the page's shared normalizer: it is one atomic pass over
 * ALL the tabs' params, one history entry — a tab's half cannot
 * navigate separately without fragmenting that single replaceUrl.
 */
export class PagedView<T> {
  /** null = not loaded yet (lazy on first switch); [] = loaded and
   *  empty. */
  readonly rows = signal<T[] | null>(null);
  /** The load error (the page-level banner copy). */
  readonly loadError = signal<string | null>(null);
  readonly page = signal(1);
  readonly size = signal(PAGE_SIZE_DEFAULT);
  /** The un-paged (filtered) total (X-Total-Count) and the derived
   *  page count / out-of-range flag — a past-the-end page renders an
   *  explicit notice, never a bare empty list. */
  readonly total = signal(0);
  readonly pages = computed(() => lastPage(this.total(), this.size()));
  readonly outOfRange = computed(() => this.total() > 0 && this.page() > this.pages());
  /** The monotonic fetch sequence — a stale (out-of-order) response is
   *  dropped (a filter/page change during an in-flight load supersedes). */
  private fetchSeq = 0;
  /** The last-applied view key — a queryParams emission re-loads only
   *  when the view's own params differ from the last load. */
  private viewKey = '';

  constructor(private readonly deps: PagedViewDeps<T>) {}

  /** The tab's view (the URL's page/size params) into the signals,
   *  loading when `firstVisit` (the lazy-load rule) or the view actually
   *  changed. A query-param change that lands WHILE A LOAD IS IN FLIGHT
   *  (rows nulled, no error yet) must re-load with the new view — never
   *  return early (a dropped change leaves the URL reading the new view
   *  while the list renders the old one, and re-clicking cannot recover
   *  because the router skips a same-URL navigation). The load's
   *  fetch-sequence guard drops the superseded response. */
  syncFromParams(params: Params, firstVisit: boolean): void {
    const page = parsePage(params[this.deps.pageParam] ?? null);
    const size = parseSize(params[this.deps.sizeParam] ?? null);
    const key = this.deps.keyPart
      ? [page, size, this.deps.keyPart()].join('|')
      : [page, size].join('|');
    if (!firstVisit && key === this.viewKey) {
      return;
    }
    this.viewKey = key;
    this.page.set(page);
    this.size.set(size);
    this.load();
  }

  /** The tab's current page: the server slices with limit/offset and the
   *  un-paged total arrives as X-Total-Count. */
  load(): void {
    this.rows.set(null);
    this.loadError.set(null);
    const seq = ++this.fetchSeq;
    const page = this.page();
    const size = this.size();
    void this.deps.fetch(page, size).then(
      (paged) => {
        if (seq !== this.fetchSeq) {
          return; // a newer load superseded this response
        }
        this.total.set(paged.total);
        this.rows.set(paged.rows);
      },
      (error: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.loadError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
      },
    );
  }

  /** Write the tab's view to the URL (merging the other tab's params —
   *  the tabs share one route); the query emission re-loads via the
   *  sync. Defaults are omitted from the URL (page 1, size 20). `extra`
   *  applies the tab's own control params alongside (a null value
   *  removes the param — the default's URL form is its absence). */
  navigate(view: { page?: number; size?: number; extra?: Record<string, string | null> }): void {
    const params: Record<string, string> = { ...this.deps.route.snapshot.queryParams };
    for (const [name, value] of Object.entries(view.extra ?? {})) {
      if (value === null) {
        delete params[name];
      } else {
        params[name] = value;
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params[this.deps.pageParam] = String(view.page);
      } else {
        delete params[this.deps.pageParam];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params[this.deps.sizeParam] = String(view.size);
      } else {
        delete params[this.deps.sizeParam];
      }
    }
    void this.deps.router.navigate([], {
      relativeTo: this.deps.route,
      queryParams: params,
    });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page. */
  onNavigate({ page, size }: { page: number; size: number }): void {
    this.navigate({ page: clampPage(page, this.total(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size is kept). */
  gotoFirstPage(): void {
    this.navigate({ page: 1 });
  }
}
