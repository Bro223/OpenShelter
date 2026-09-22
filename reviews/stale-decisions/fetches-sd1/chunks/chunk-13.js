import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-MYB5WGJP.js");import {
  Pagination
} from "/chunk-C7LBHSKJ.js";
import {
  GuidanceGateway,
  PAGE_SIZE_DEFAULT,
  clampPage,
  lastPage,
  parsePage,
  parseSize
} from "/chunk-K74CHFRN.js";
import {
  ListState
} from "/chunk-Q2EZNHWI.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  BannerComponent,
  bannerMessage
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import {
  __spreadValues
} from "/chunk-FDMHZOCR.js";

// src/app/features/guidance/guidance-list-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { DatePipe } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { ActivatedRoute, Router, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c0 = (a0) => ["/blog", a0];
var _forTrack0 = ($index, $item) => $item.slug;
function GuidanceListPage_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-loading-indicator", 5);
    i0.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i0.\u0275\u0275property("message", i0.\u0275\u0275pipeBind1(1, 1, "guidance.loading"));
  }
}
function GuidanceListPage_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "app-list-state", 7);
    i0.\u0275\u0275listener("onGoFirstPage", function GuidanceListPage_Conditional_10_Template_app_list_state_onGoFirstPage_0_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.gotoFirstPage());
    });
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275property("kind", "out-of-range")("messageKey", "guidance.pageOutOfRange")("page", ctx_r1.page())("pages", ctx_r1.pages())("actionKey", "guidance.pageFirst");
  }
}
function GuidanceListPage_Conditional_11_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-list-state", 8);
  }
  if (rf & 2) {
    i0.\u0275\u0275property("kind", "empty")("messageKey", "guidance.empty");
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "span", 16);
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "img", 18);
    i0.\u0275\u0275listener("error", function GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Conditional_1_Template_img_error_0_listener($event) {
      i0.\u0275\u0275restoreView(_r4);
      const post_r5 = i0.\u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(3);
      return i0.\u0275\u0275resetView(ctx_r1.onHeroImageError($event, post_r5.slug));
    });
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const heroUrl_r6 = i0.\u0275\u0275nextContext();
    const post_r5 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275property("src", heroUrl_r6, i0.\u0275\u0275sanitizeUrl)("alt", post_r5.heroImageAlt ?? "");
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Conditional_0_Template, 1, 0, "span", 16)(1, GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Conditional_1_Template, 1, 2, "img", 17);
  }
  if (rf & 2) {
    const post_r5 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(3);
    i0.\u0275\u0275conditional(ctx_r1.heroFailed(post_r5.slug) ? 0 : 1);
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "span", 12);
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_For_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "li", 10);
    i0.\u0275\u0275conditionalCreate(1, GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_1_Template, 2, 1)(2, GuidanceListPage_Conditional_11_Conditional_1_For_2_Conditional_2_Template, 1, 0, "span", 12);
    i0.\u0275\u0275elementStart(3, "h2", 13)(4, "a", 14);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(6, "p", 15);
    i0.\u0275\u0275text(7);
    i0.\u0275\u0275pipe(8, "date");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_13_0;
    const post_r5 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(3);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_13_0 = post_r5.heroImageUrl) ? 1 : 2, tmp_13_0);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("routerLink", i0.\u0275\u0275pureFunction1(9, _c0, post_r5.slug));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(post_r5.title);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind4(8, 4, post_r5.publishedAt, "medium", void 0, ctx_r1.i18n.locale()), " ");
  }
}
function GuidanceListPage_Conditional_11_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "ul", 9);
    i0.\u0275\u0275repeaterCreate(1, GuidanceListPage_Conditional_11_Conditional_1_For_2_Template, 9, 11, "li", 10, _forTrack0);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(3, "app-pagination", 11);
    i0.\u0275\u0275listener("onNavigate", function GuidanceListPage_Conditional_11_Conditional_1_Template_app_pagination_onNavigate_3_listener($event) {
      i0.\u0275\u0275restoreView(_r3);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate($event));
    });
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const list_r7 = i0.\u0275\u0275nextContext();
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275repeater(list_r7);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("page", ctx_r1.page())("pages", ctx_r1.pages())("size", ctx_r1.size());
  }
}
function GuidanceListPage_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, GuidanceListPage_Conditional_11_Conditional_0_Template, 1, 2, "app-list-state", 8)(1, GuidanceListPage_Conditional_11_Conditional_1_Template, 4, 3);
  }
  if (rf & 2) {
    i0.\u0275\u0275conditional(ctx.length === 0 ? 0 : 1);
  }
}
var GuidanceListPage = class _GuidanceListPage {
  gateway = inject(GuidanceGateway);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  i18n = inject(I18nService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  /** The posts of the CURRENT page; null while the first fetch is in flight. */
  posts = signal(
    null,
    ...ngDevMode ? [{ debugName: "posts" }] : (
      /* istanbul ignore next */
      []
    )
  );
  loading = signal(
    false,
    ...ngDevMode ? [{ debugName: "loading" }] : (
      /* istanbul ignore next */
      []
    )
  );
  error = signal(
    null,
    ...ngDevMode ? [{ debugName: "error" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The current (effective) view: page is 1-based, size is one of the
      shared paging contract's sizes (shared/paging). */
  page = signal(
    1,
    ...ngDevMode ? [{ debugName: "page" }] : (
      /* istanbul ignore next */
      []
    )
  );
  size = signal(
    PAGE_SIZE_DEFAULT,
    ...ngDevMode ? [{ debugName: "size" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The un-paged index length (X-Total-Count) and the derived page
      count — 1 even when 0, so "Page 1 of 1" can never say "of 0". */
  total = signal(
    0,
    ...ngDevMode ? [{ debugName: "total" }] : (
      /* istanbul ignore next */
      []
    )
  );
  pages = signal(
    1,
    ...ngDevMode ? [{ debugName: "pages" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The honest out-of-range state: the URL asks for a page past the end
   * (a hand-typed number, a stale shared link, or a locale switch that
   * shrank the index). total > 0 AND page > pages — shown as an explicit
   * notice, NOT the empty state (which is reserved for total === 0).
   */
  outOfRange = signal(
    false,
    ...ngDevMode ? [{ debugName: "outOfRange" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * Slugs whose hero <img> failed to load (404/network): the broken image
   * element is dropped and a fixed-size neutral placeholder takes its
   * place, so the row keeps its height and the title link stays the row's
   * single accessible link. Reset per successful page load — a hero that
   * 404'd on page 1 may exist on a re-visited page (or the post's hero
   * was re-set by an admin).
   */
  failedHeroSlugs = signal(
    /* @__PURE__ */ new Set(),
    ...ngDevMode ? [{ debugName: "failedHeroSlugs" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Template seam: did this post's hero image fail to load? */
  heroFailed(slug) {
    return this.failedHeroSlugs().has(slug);
  }
  /**
   * The <img (error)> handler: drop the broken thumbnail for this post.
   * Idempotent — a natural load error and a synthetic one may both arrive.
   */
  onHeroImageError(_event, slug) {
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
  fetchSeq = 0;
  /** The language switcher sets I18nService.locale: the index is
      locale-scoped on the server, so a switch re-fetches the CURRENT
      page (no URL change — the locale is not part of the view URL). A
      field initializer (an injection context — toObservable's
      requirement) builds the subscription; toObservable emits the
      CURRENT value on subscribe, so skip(1) — only a real switch
      triggers a load. */
  localeSub = toObservable(this.i18n.locale).pipe(skip(1)).subscribe(() => this.load());
  /** The view IS the URL: every emission (initial navigation and every
      query change — a page/size flip, a back-button step) parses the
      page/size, normalizes a hand-typed value, and loads. queryParamMap
      / queryParams emit the current value on subscribe, so the initial
      load comes from here (there is no separate ngOnInit load). */
  querySub = this.route.queryParams.subscribe((params) => this.onQueryChange(params));
  ngOnDestroy() {
    this.localeSub.unsubscribe();
    this.querySub.unsubscribe();
  }
  /** Parse + normalize the view parameters, then load.
      A raw value that is not a legal member of the domain (non-numeric,
      a size outside 10..100 or off the step of 10, a page below 1) is
      clamped to the NEAREST legal value (the shared paging policy,
      shared/paging) and the URL is normalized in place (replaceUrl — no
      history entry for the cosmetic fix), so the selector always shows
      the value that is actually in effect and the URL and the view can
      never quietly disagree. */
  onQueryChange(params) {
    const rawPage = params["page"] ?? null;
    const rawSize = params["size"] ?? null;
    const page = parsePage(rawPage);
    const size = parseSize(rawSize);
    const canonical = __spreadValues({}, params);
    if (page > 1) {
      canonical["page"] = String(page);
    } else {
      delete canonical["page"];
    }
    if (size !== PAGE_SIZE_DEFAULT) {
      canonical["size"] = String(size);
    } else {
      delete canonical["size"];
    }
    const dirty = rawPage !== null && String(page) !== rawPage || rawSize !== null && String(size) !== rawSize || rawPage === null && page !== 1 || rawSize === null && size !== PAGE_SIZE_DEFAULT;
    if (dirty) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: canonical,
        replaceUrl: true
      });
      return;
    }
    this.page.set(page);
    this.size.set(size);
    void this.load();
  }
  /** The pagination control's intent (prev/next/size). A SIZE change
      that would strand the current page past the last one clamps the
      page to the last page AT THE NEW SIZE (the total is known whenever
      the control is visible — it only renders at two or more pages), so
      a size flip never lands on a dead page; a page change is written
      verbatim. Either way the canonical URL is written and the fresh
      query emission loads. */
  onNavigate({ page, size }) {
    const effectivePage = clampPage(page, this.total(), size);
    const queryParams = {};
    if (effectivePage > 1) {
      queryParams["page"] = String(effectivePage);
    }
    if (size !== PAGE_SIZE_DEFAULT) {
      queryParams["size"] = String(size);
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }
  /** The out-of-range notice's action: back to the first page (the
      current size is kept if it is non-default). */
  gotoFirstPage() {
    const queryParams = {};
    if (this.size() !== PAGE_SIZE_DEFAULT) {
      queryParams["size"] = String(this.size());
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }
  /** Fetch the CURRENT page of the published index; a failure lands in
      the shared error banner with the page chrome intact (shared
      convention). */
  load() {
    const seq = ++this.fetchSeq;
    const page = this.page();
    const size = this.size();
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.listPage(page, size).then((value) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      const { rows, total } = value;
      this.total.set(total);
      this.pages.set(lastPage(total, size));
      const outOfRange = total > 0 && page > lastPage(total, size);
      this.outOfRange.set(outOfRange);
      this.posts.set(outOfRange ? [] : rows);
      this.failedHeroSlugs.set(/* @__PURE__ */ new Set());
      this.loading.set(false);
    }, (failure) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
      this.loading.set(false);
    });
  }
  static \u0275fac = function GuidanceListPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GuidanceListPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _GuidanceListPage, selectors: [["app-guidance-list-page"]], decls: 12, vars: 8, consts: [[1, "guidance-list"], [1, "guidance-list__header"], [1, "page-title"], [1, "page-subtitle"], ["severity", "error", 3, "message"], [1, "guidance-state", 3, "message"], [3, "kind", "messageKey", "page", "pages", "actionKey"], [3, "onGoFirstPage", "kind", "messageKey", "page", "pages", "actionKey"], [3, "kind", "messageKey"], [1, "guidance-list__posts"], [1, "guidance-post"], [3, "onNavigate", "page", "pages", "size"], ["aria-hidden", "true", 1, "guidance-post__thumb"], [1, "guidance-post__title"], [3, "routerLink"], [1, "guidance-post__date"], ["aria-hidden", "true", 1, "guidance-post__thumb", "guidance-post__thumb--failed"], ["width", "400", "height", "300", "loading", "lazy", "decoding", "async", 1, "guidance-post__hero", 3, "src", "alt"], ["width", "400", "height", "300", "loading", "lazy", "decoding", "async", 1, "guidance-post__hero", 3, "error", "src", "alt"]], template: function GuidanceListPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "section", 0)(1, "header", 1)(2, "h1", 2);
      i0.\u0275\u0275text(3);
      i0.\u0275\u0275pipe(4, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(5, "p", 3);
      i0.\u0275\u0275text(6);
      i0.\u0275\u0275pipe(7, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275element(8, "app-banner", 4);
      i0.\u0275\u0275conditionalCreate(9, GuidanceListPage_Conditional_9_Template, 2, 3, "app-loading-indicator", 5)(10, GuidanceListPage_Conditional_10_Template, 1, 5, "app-list-state", 6)(11, GuidanceListPage_Conditional_11_Template, 2, 1);
      i0.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_3_0;
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(4, 4, "guidance.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(7, 6, "guidance.subtitle"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("message", ctx.error());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.loading() ? 9 : ctx.outOfRange() ? 10 : (tmp_3_0 = ctx.posts()) ? 11 : -1, tmp_3_0);
    }
  }, dependencies: [
    RouterLink,
    BannerComponent,
    ListState,
    LoadingIndicator,
    Pagination,
    DatePipe,
    TranslatePipe
  ], styles: ['@charset "UTF-8";\n\n\n.guidance-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-20);\n}\n.guidance-list__posts[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: var(--%NS%space-16);\n}\n.guidance-post[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-12);\n  min-width: 0;\n  padding: var(--%NS%space-12);\n  background: var(--%NS%color-bg-surface);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n}\n.guidance-post__hero[_ngcontent-%COMP%], \n.guidance-post__thumb[_ngcontent-%COMP%] {\n  width: 100%;\n  aspect-ratio: 4/3;\n  border-radius: var(--%NS%radius-md);\n}\n.guidance-post__hero[_ngcontent-%COMP%] {\n  object-fit: cover;\n}\n.guidance-post__thumb[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border-subtle);\n  background: var(--%NS%color-bg-subtle);\n}\n.guidance-post__title[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-lg);\n}\n.guidance-post__title[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n}\n.guidance-post__title[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.guidance-post__date[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: 0;\n}\n.guidance-state[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0;\n}\n/*# sourceMappingURL=guidance-list-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(GuidanceListPage, [{
    type: Component,
    args: [{ selector: "app-guidance-list-page", imports: [
      DatePipe,
      RouterLink,
      BannerComponent,
      ListState,
      LoadingIndicator,
      Pagination,
      TranslatePipe
    ], changeDetection: ChangeDetectionStrategy.OnPush, template: `<!-- /blog \u2014 the public crisis-guidance index (crisis-guidance D4/D6).
     The server owns ordering (PUBLISHED only, pinned first, then
     publishedAt descending); the page renders the array as-is. The index
     does not carry the post body \u2014 the detail page does. -->
<section class="guidance-list">
  <header class="guidance-list__header">
    <h1 class="page-title">{{ 'guidance.title' | t }}</h1>
    <p class="page-subtitle">{{ 'guidance.subtitle' | t }}</p>
  </header>

  <app-banner severity="error" [message]="error()" />

  @if (loading()) {
    <app-loading-indicator class="guidance-state" [message]="'guidance.loading' | t" />
  } @else if (outOfRange()) {
    <!-- The honest out-of-range state (guidance-index-paging), in the
         shared component: the URL asks for a page past the end of a
         NON-EMPTY index \u2014 a hand-typed number, a stale shared link, or a
         locale switch that shrank the index. Explicit translated notice
         + first-page action; the empty state below is total === 0 only,
         never this. -->
    <app-list-state
      [kind]="'out-of-range'"
      [messageKey]="'guidance.pageOutOfRange'"
      [page]="page()"
      [pages]="pages()"
      [actionKey]="'guidance.pageFirst'"
      (onGoFirstPage)="gotoFirstPage()"
    />
  } @else if (posts(); as list) {
    @if (list.length === 0) {
      <!-- The empty state (the shared component's empty mode): nothing is
           published in the active locale. -->
      <app-list-state [kind]="'empty'" [messageKey]="'guidance.empty'" />
    } @else {
      <ul class="guidance-list__posts">
        @for (post of list; track post.slug) {
          <li class="guidance-post">
            <!-- Hero thumbnail on top (the index hero projection).
                 NO-HERO RULE REVISITED \u2014 supersedes the earlier rule
                 "a post WITHOUT a hero renders NO image element at all":
                 that rule evened out a TEXT ROW list, but a card GRID
                 aligns rows of CARDS, not text \u2014 a hero-less card with no
                 box is shorter than its neighbours and every grid row
                 goes ragged. In a grid the evenness comes from the BOX,
                 so a hero-less card now renders a NEUTRAL PLACEHOLDER
                 BOX of the SAME aspect ratio \u2014 one visual language for
                 "no image", shared with the load-failure case below.
                 A present URL renders a full-card-width box (object-fit:
                 cover, aspect-ratio + matching width/height attributes,
                 lazy + async \u2014 the admin hero-thumb media idiom at card
                 scale), so loading never shifts the card. -->
            @if (post.heroImageUrl; as heroUrl) {
              @if (heroFailed(post.slug)) {
                <!-- The thumbnail 404'd / the network failed: the SAME
                     placeholder box takes its place (the card keeps its
                     height, the title link stays the card's single
                     accessible link) \u2014 a broken-image icon is never the
                     feedback. -->
                <span class="guidance-post__thumb guidance-post__thumb--failed" aria-hidden="true"></span>
              } @else {
                <!-- Alt: the stored hero alt (the admin sets it; mandatory
                     whenever a hero exists). A null alt with a present URL
                     = decorative empty alt \u2014 never the post title, which
                     would duplicate the link text. -->
                <img
                  class="guidance-post__hero"
                  [src]="heroUrl"
                  [alt]="post.heroImageAlt ?? ''"
                  width="400"
                  height="300"
                  loading="lazy"
                  decoding="async"
                  (error)="onHeroImageError($event, post.slug)"
                />
              }
            } @else {
              <!-- No hero: the neutral placeholder box (see the comment
                   above \u2014 the grid's alignment comes from the box). -->
              <span class="guidance-post__thumb" aria-hidden="true"></span>
            }
            <h2 class="guidance-post__title">
              <a [routerLink]="['/blog', post.slug]">{{ post.title }}</a>
            </h2>
            <p class="guidance-post__date">
              {{ post.publishedAt | date: 'medium' : undefined : i18n.locale() }}
            </p>
          </li>
        }
      </ul>

      <!-- The shared page + size control (list-page-paging). It renders
           NOTHING at one page or an empty list (pages() < 2), so the
           chrome never appears when it would be pointless. Its default
           size list IS the endpoint's range (shared/paging PAGE_SIZES),
           so no [sizes] binding is needed. -->
      <app-pagination
        [page]="page()"
        [pages]="pages()"
        [size]="size()"
        (onNavigate)="onNavigate($event)"
      />
    }
  }
</section>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/guidance/guidance-list-page.scss */\n.guidance-list {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-20);\n}\n.guidance-list__posts {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: var(--space-16);\n}\n.guidance-post {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-12);\n  min-width: 0;\n  padding: var(--space-12);\n  background: var(--color-bg-surface);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n}\n.guidance-post__hero,\n.guidance-post__thumb {\n  width: 100%;\n  aspect-ratio: 4/3;\n  border-radius: var(--radius-md);\n}\n.guidance-post__hero {\n  object-fit: cover;\n}\n.guidance-post__thumb {\n  border: 1px solid var(--color-border-subtle);\n  background: var(--color-bg-subtle);\n}\n.guidance-post__title {\n  margin: 0;\n  font-size: var(--text-lg);\n}\n.guidance-post__title a {\n  color: var(--color-primary);\n  text-decoration: none;\n}\n.guidance-post__title a:hover {\n  text-decoration: underline;\n}\n.guidance-post__date {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: 0;\n}\n.guidance-state {\n  color: var(--color-muted);\n  margin: 0;\n}\n/*# sourceMappingURL=guidance-list-page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(GuidanceListPage, { className: "GuidanceListPage", filePath: "src/app/features/guidance/guidance-list-page.ts", lineNumber: 60 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fguidance%2Fguidance-list-page.ts%40GuidanceListPage";
  function GuidanceListPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(GuidanceListPage, m.default, [i0], [RouterLink, BannerComponent, ListState, LoadingIndicator, Pagination, DatePipe, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && GuidanceListPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && GuidanceListPage_HmrLoad(d.timestamp)));
})();
export {
  GuidanceListPage
};
//# debugId=5fbb2235-91df-5921-a098-3f2961916513


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvZ3VpZGFuY2UvZ3VpZGFuY2UtbGlzdC1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9ndWlkYW5jZS9ndWlkYW5jZS1saXN0LXBhZ2UuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbmplY3QsIHR5cGUgT25EZXN0cm95LCBzaWduYWwgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IHRvT2JzZXJ2YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvcnhqcy1pbnRlcm9wJztcbmltcG9ydCB7IERhdGVQaXBlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEFjdGl2YXRlZFJvdXRlLCBSb3V0ZXIsIFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHR5cGUgeyBQYXJhbXMgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgc2tpcCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHR5cGUgeyBHdWlkYW5jZVBvc3REdG8gfSBmcm9tICcuLi8uLi9jb3JlL21vZGVscyc7XG5pbXBvcnQgeyBHdWlkYW5jZUdhdGV3YXkgfSBmcm9tICcuLi8uLi9nYXRld2F5cy9ndWlkYW5jZS1nYXRld2F5JztcbmltcG9ydCB7IEJhbm5lckNvbXBvbmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9iYW5uZXIuY29tcG9uZW50JztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5pbXBvcnQgeyBMaXN0U3RhdGUgfSBmcm9tICcuLi8uLi9zaGFyZWQvbGlzdC1zdGF0ZSc7XG5pbXBvcnQgeyBMb2FkaW5nSW5kaWNhdG9yIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2xvYWRpbmctaW5kaWNhdG9yJztcbmltcG9ydCB7IFBBR0VfU0laRV9ERUZBVUxULCBjbGFtcFBhZ2UsIGxhc3RQYWdlLCBwYXJzZVBhZ2UsIHBhcnNlU2l6ZSB9IGZyb20gJy4uLy4uL3NoYXJlZC9wYWdpbmcnO1xuaW1wb3J0IHsgUGFnaW5hdGlvbiB9IGZyb20gJy4uLy4uL3NoYXJlZC9wYWdpbmF0aW9uJztcblxuLyoqXG4gKiAvYmxvZyDigJQgdGhlIHB1YmxpYyBjcmlzaXMtZ3VpZGFuY2UgaW5kZXggKGNyaXNpcy1ndWlkYW5jZSBENC9ENiksXG4gKiBwYWdlZCAoZ3VpZGFuY2UtaW5kZXgtcGFnaW5nKS5cbiAqXG4gKiA8cD5UaGluIHNoZWxsICgwMS1UQVNLLm1kIMKnNyk6IHN0YXRlIGluIHNpZ25hbHMsIHRoZSBnYXRld2F5IG93bnMgdGhlXG4gKiBBUEkgKGEgcGVybWl0LWFsbCByZWFkIOKAlCBubyBhdXRoKS4gVGhlIFZJRVcgaXMgdGhlIFVSTDogP3BhZ2U9TiBhbmRcbiAqID9zaXplPU0gKGJvdGggb3B0aW9uYWwg4oCUIDEgYW5kIHRoZSBkZWZhdWx0IHNpemUgYXJlIHRoZSBkZWZhdWx0cyBhbmRcbiAqIGFyZSBvbWl0dGVkIGZyb20gdGhlIFVSTCwgc28gYSBsaW5rIG9yIGEgcmVmcmVzaCBrZWVwcyB0aGUgdmlldykuIFRoZVxuICogU0VSVkVSIGRvZXMgdGhlIHBhZ2luZyAobGltaXQvb2Zmc2V0IG92ZXIgaXRzIHN0YWJsZSBvcmRlciwgcGlubmVkIGZpcnN0XG4gKiB0aGVuIHB1Ymxpc2hlZEF0IGRlc2NlbmRpbmcsIGlkIGRlc2NlbmRpbmcgdGllLWJyZWFrKTsgdGhlIHBhZ2UgbmV2ZXJcbiAqIGZldGNoZXMtYW5kLXNsaWNlcyBjbGllbnQtc2lkZS4gVGhlIHVuLXBhZ2VkIHRvdGFsIGFycml2ZXMgYXNcbiAqIFgtVG90YWwtQ291bnQgKHRoZSBnYXRld2F5IHN1cmZhY2VzIGl0KSwgd2hpY2ggaXMgd2hhdCBtYWtlcyBhblxuICogb3V0LW9mLXJhbmdlIHBhZ2UgZGlzdGluZ3Vpc2hhYmxlIGZyb20gYSB0cnVseSBlbXB0eSBpbmRleDogcGFzdC10aGUtZW5kXG4gKiByZW5kZXJzIHRoZSBzaGFyZWQgb3V0LW9mLXJhbmdlIG5vdGljZSB3aXRoIGEgXCJzaG93IHRoZSBmaXJzdCBwYWdlXCJcbiAqIGFjdGlvbiwgbmV2ZXIgYSBiYXJlIGVtcHR5IGxpc3Q7IHRoZSBlbXB0eSBzdGF0ZSBpcyB0b3RhbCA9PT0gMCBvbmx5LlxuICpcbiAqIDxwPlRoZSBwYWdlIG51bWJlciBiZWxvbmdzIGluIHRoZSBVUkwsIGFuZCBzbyBkb2VzIHRoZSBzaXplXG4gKiAobGlzdC1wYWdlLXBhZ2luZzogdGhlIHNoYXJlZCBwYWdpbmcgY29udHJhY3QsIHNoYXJlZC9wYWdpbmcpLiBUaGUgc2l6ZVxuICogaXMgcGVyLWxpc3Qg4oCUIHRoZSBVUkwgaXMgdGhlIHN0YXRlLCBkZWxpYmVyYXRlbHkgTk9UIGEgcmVtZW1iZXJlZFxuICogY3Jvc3MtbGlzdCBwcmVmZXJlbmNlLCBzbyAvYmxvZyBhbmQgYSBsYXRlciBhZG1pbiBsaXN0IGNhbm5vdCBzdXJwcmlzZVxuICogZWFjaCBvdGhlci5cbiAqXG4gKiA8cD5Mb2NhbGUgc2NvcGU6IHRoZSBzZXJ2ZXIgYW5zd2VycyBPTkUgbGFuZ3VhZ2UgcGVyIGNhbGwgKHRoZSBnYXRld2F5XG4gKiBzZW5kcyB0aGUgYWN0aXZlIGxvY2FsZSksIHNvIGEgbGFuZ3VhZ2Ugc3dpdGNoZXIgY2hhbmdlIGlzIGEgcmUtZmV0Y2hcbiAqIG9mIHRoZSBDVVJSRU5UIHBhZ2UgKHRoZSBmZXRjaFNlcSBndWFyZCBrZWVwcyBhIHNsb3cgcmVzcG9uc2UgZnJvbSB0aGVcbiAqIHByZXZpb3VzIGxhbmd1YWdlIGZyb20gbGFuZGluZyBvdmVyIHRoZSBuZXcgZmV0Y2gpLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtZ3VpZGFuY2UtbGlzdC1wYWdlJyxcbiAgaW1wb3J0czogW1xuICAgIERhdGVQaXBlLFxuICAgIFJvdXRlckxpbmssXG4gICAgQmFubmVyQ29tcG9uZW50LFxuICAgIExpc3RTdGF0ZSxcbiAgICBMb2FkaW5nSW5kaWNhdG9yLFxuICAgIFBhZ2luYXRpb24sXG4gICAgVHJhbnNsYXRlUGlwZSxcbiAgXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2d1aWRhbmNlLWxpc3QtcGFnZS5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2d1aWRhbmNlLWxpc3QtcGFnZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEd1aWRhbmNlTGlzdFBhZ2UgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGV3YXkgPSBpbmplY3QoR3VpZGFuY2VHYXRld2F5KTtcbiAgLyoqIExvY2FsZS1hd2FyZSBkYXRlIHJlbmRlcmluZyAodGhlIHBhZ2Utc2hlbGwgZm9vdGVyJ3MgcGF0dGVybikuICovXG4gIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvdXRlID0gaW5qZWN0KEFjdGl2YXRlZFJvdXRlKTtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcblxuICAvKiogVGhlIHBvc3RzIG9mIHRoZSBDVVJSRU5UIHBhZ2U7IG51bGwgd2hpbGUgdGhlIGZpcnN0IGZldGNoIGlzIGluIGZsaWdodC4gKi9cbiAgcmVhZG9ubHkgcG9zdHMgPSBzaWduYWw8R3VpZGFuY2VQb3N0RHRvW10gfCBudWxsPihudWxsKTtcbiAgcmVhZG9ubHkgbG9hZGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuXG4gIC8qKiBUaGUgY3VycmVudCAoZWZmZWN0aXZlKSB2aWV3OiBwYWdlIGlzIDEtYmFzZWQsIHNpemUgaXMgb25lIG9mIHRoZVxuICAgICAgc2hhcmVkIHBhZ2luZyBjb250cmFjdCdzIHNpemVzIChzaGFyZWQvcGFnaW5nKS4gKi9cbiAgcmVhZG9ubHkgcGFnZSA9IHNpZ25hbCgxKTtcbiAgcmVhZG9ubHkgc2l6ZSA9IHNpZ25hbChQQUdFX1NJWkVfREVGQVVMVCk7XG5cbiAgLyoqIFRoZSB1bi1wYWdlZCBpbmRleCBsZW5ndGggKFgtVG90YWwtQ291bnQpIGFuZCB0aGUgZGVyaXZlZCBwYWdlXG4gICAgICBjb3VudCDigJQgMSBldmVuIHdoZW4gMCwgc28gXCJQYWdlIDEgb2YgMVwiIGNhbiBuZXZlciBzYXkgXCJvZiAwXCIuICovXG4gIHJlYWRvbmx5IHRvdGFsID0gc2lnbmFsKDApO1xuICByZWFkb25seSBwYWdlcyA9IHNpZ25hbCgxKTtcblxuICAvKipcbiAgICogVGhlIGhvbmVzdCBvdXQtb2YtcmFuZ2Ugc3RhdGU6IHRoZSBVUkwgYXNrcyBmb3IgYSBwYWdlIHBhc3QgdGhlIGVuZFxuICAgKiAoYSBoYW5kLXR5cGVkIG51bWJlciwgYSBzdGFsZSBzaGFyZWQgbGluaywgb3IgYSBsb2NhbGUgc3dpdGNoIHRoYXRcbiAgICogc2hyYW5rIHRoZSBpbmRleCkuIHRvdGFsID4gMCBBTkQgcGFnZSA+IHBhZ2VzIOKAlCBzaG93biBhcyBhbiBleHBsaWNpdFxuICAgKiBub3RpY2UsIE5PVCB0aGUgZW1wdHkgc3RhdGUgKHdoaWNoIGlzIHJlc2VydmVkIGZvciB0b3RhbCA9PT0gMCkuXG4gICAqL1xuICByZWFkb25seSBvdXRPZlJhbmdlID0gc2lnbmFsKGZhbHNlKTtcblxuICAvKipcbiAgICogU2x1Z3Mgd2hvc2UgaGVybyA8aW1nPiBmYWlsZWQgdG8gbG9hZCAoNDA0L25ldHdvcmspOiB0aGUgYnJva2VuIGltYWdlXG4gICAqIGVsZW1lbnQgaXMgZHJvcHBlZCBhbmQgYSBmaXhlZC1zaXplIG5ldXRyYWwgcGxhY2Vob2xkZXIgdGFrZXMgaXRzXG4gICAqIHBsYWNlLCBzbyB0aGUgcm93IGtlZXBzIGl0cyBoZWlnaHQgYW5kIHRoZSB0aXRsZSBsaW5rIHN0YXlzIHRoZSByb3cnc1xuICAgKiBzaW5nbGUgYWNjZXNzaWJsZSBsaW5rLiBSZXNldCBwZXIgc3VjY2Vzc2Z1bCBwYWdlIGxvYWQg4oCUIGEgaGVybyB0aGF0XG4gICAqIDQwNCdkIG9uIHBhZ2UgMSBtYXkgZXhpc3Qgb24gYSByZS12aXNpdGVkIHBhZ2UgKG9yIHRoZSBwb3N0J3MgaGVyb1xuICAgKiB3YXMgcmUtc2V0IGJ5IGFuIGFkbWluKS5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgZmFpbGVkSGVyb1NsdWdzID0gc2lnbmFsPFJlYWRvbmx5U2V0PHN0cmluZz4+KG5ldyBTZXQoKSk7XG5cbiAgLyoqIFRlbXBsYXRlIHNlYW06IGRpZCB0aGlzIHBvc3QncyBoZXJvIGltYWdlIGZhaWwgdG8gbG9hZD8gKi9cbiAgaGVyb0ZhaWxlZChzbHVnOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mYWlsZWRIZXJvU2x1Z3MoKS5oYXMoc2x1Zyk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIDxpbWcgKGVycm9yKT4gaGFuZGxlcjogZHJvcCB0aGUgYnJva2VuIHRodW1ibmFpbCBmb3IgdGhpcyBwb3N0LlxuICAgKiBJZGVtcG90ZW50IOKAlCBhIG5hdHVyYWwgbG9hZCBlcnJvciBhbmQgYSBzeW50aGV0aWMgb25lIG1heSBib3RoIGFycml2ZS5cbiAgICovXG4gIG9uSGVyb0ltYWdlRXJyb3IoX2V2ZW50OiBFdmVudCwgc2x1Zzogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgZmFpbGVkID0gbmV3IFNldCh0aGlzLmZhaWxlZEhlcm9TbHVncygpKTtcbiAgICBpZiAoZmFpbGVkLmhhcyhzbHVnKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmYWlsZWQuYWRkKHNsdWcpO1xuICAgIHRoaXMuZmFpbGVkSGVyb1NsdWdzLnNldChmYWlsZWQpO1xuICB9XG5cbiAgLyoqIFRoZSBmZXRjaFNlcSBndWFyZCBkcm9wcyBhIHN1cGVyc2VkZWQgaW4tZmxpZ2h0IHJlc3BvbnNlICh0aGVcbiAgICAgIGd1aWRhbmNlLWRldGFpbCdzIHBhdHRlcm46IGEgbGFuZ3VhZ2Ugc3dpdGNoIG9yIGEgcGFnZSBmbGlwIG11c3Qgbm90XG4gICAgICBsYW5kIHRoZSBvbGQgdmlldydzIHJvd3Mgb3ZlciB0aGUgbmV3IGZldGNoKS4gKi9cbiAgcHJpdmF0ZSBmZXRjaFNlcSA9IDA7XG5cbiAgLyoqIFRoZSBsYW5ndWFnZSBzd2l0Y2hlciBzZXRzIEkxOG5TZXJ2aWNlLmxvY2FsZTogdGhlIGluZGV4IGlzXG4gICAgICBsb2NhbGUtc2NvcGVkIG9uIHRoZSBzZXJ2ZXIsIHNvIGEgc3dpdGNoIHJlLWZldGNoZXMgdGhlIENVUlJFTlRcbiAgICAgIHBhZ2UgKG5vIFVSTCBjaGFuZ2Ug4oCUIHRoZSBsb2NhbGUgaXMgbm90IHBhcnQgb2YgdGhlIHZpZXcgVVJMKS4gQVxuICAgICAgZmllbGQgaW5pdGlhbGl6ZXIgKGFuIGluamVjdGlvbiBjb250ZXh0IOKAlCB0b09ic2VydmFibGUnc1xuICAgICAgcmVxdWlyZW1lbnQpIGJ1aWxkcyB0aGUgc3Vic2NyaXB0aW9uOyB0b09ic2VydmFibGUgZW1pdHMgdGhlXG4gICAgICBDVVJSRU5UIHZhbHVlIG9uIHN1YnNjcmliZSwgc28gc2tpcCgxKSDigJQgb25seSBhIHJlYWwgc3dpdGNoXG4gICAgICB0cmlnZ2VycyBhIGxvYWQuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYWxlU3ViID0gdG9PYnNlcnZhYmxlKHRoaXMuaTE4bi5sb2NhbGUpXG4gICAgLnBpcGUoc2tpcCgxKSlcbiAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMubG9hZCgpKTtcblxuICAvKiogVGhlIHZpZXcgSVMgdGhlIFVSTDogZXZlcnkgZW1pc3Npb24gKGluaXRpYWwgbmF2aWdhdGlvbiBhbmQgZXZlcnlcbiAgICAgIHF1ZXJ5IGNoYW5nZSDigJQgYSBwYWdlL3NpemUgZmxpcCwgYSBiYWNrLWJ1dHRvbiBzdGVwKSBwYXJzZXMgdGhlXG4gICAgICBwYWdlL3NpemUsIG5vcm1hbGl6ZXMgYSBoYW5kLXR5cGVkIHZhbHVlLCBhbmQgbG9hZHMuIHF1ZXJ5UGFyYW1NYXBcbiAgICAgIC8gcXVlcnlQYXJhbXMgZW1pdCB0aGUgY3VycmVudCB2YWx1ZSBvbiBzdWJzY3JpYmUsIHNvIHRoZSBpbml0aWFsXG4gICAgICBsb2FkIGNvbWVzIGZyb20gaGVyZSAodGhlcmUgaXMgbm8gc2VwYXJhdGUgbmdPbkluaXQgbG9hZCkuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgcXVlcnlTdWIgPSB0aGlzLnJvdXRlLnF1ZXJ5UGFyYW1zLnN1YnNjcmliZSgocGFyYW1zKSA9PlxuICAgIHRoaXMub25RdWVyeUNoYW5nZShwYXJhbXMpLFxuICApO1xuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMubG9jYWxlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgdGhpcy5xdWVyeVN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLyoqIFBhcnNlICsgbm9ybWFsaXplIHRoZSB2aWV3IHBhcmFtZXRlcnMsIHRoZW4gbG9hZC5cbiAgICAgIEEgcmF3IHZhbHVlIHRoYXQgaXMgbm90IGEgbGVnYWwgbWVtYmVyIG9mIHRoZSBkb21haW4gKG5vbi1udW1lcmljLFxuICAgICAgYSBzaXplIG91dHNpZGUgMTAuLjEwMCBvciBvZmYgdGhlIHN0ZXAgb2YgMTAsIGEgcGFnZSBiZWxvdyAxKSBpc1xuICAgICAgY2xhbXBlZCB0byB0aGUgTkVBUkVTVCBsZWdhbCB2YWx1ZSAodGhlIHNoYXJlZCBwYWdpbmcgcG9saWN5LFxuICAgICAgc2hhcmVkL3BhZ2luZykgYW5kIHRoZSBVUkwgaXMgbm9ybWFsaXplZCBpbiBwbGFjZSAocmVwbGFjZVVybCDigJQgbm9cbiAgICAgIGhpc3RvcnkgZW50cnkgZm9yIHRoZSBjb3NtZXRpYyBmaXgpLCBzbyB0aGUgc2VsZWN0b3IgYWx3YXlzIHNob3dzXG4gICAgICB0aGUgdmFsdWUgdGhhdCBpcyBhY3R1YWxseSBpbiBlZmZlY3QgYW5kIHRoZSBVUkwgYW5kIHRoZSB2aWV3IGNhblxuICAgICAgbmV2ZXIgcXVpZXRseSBkaXNhZ3JlZS4gKi9cbiAgcHJpdmF0ZSBvblF1ZXJ5Q2hhbmdlKHBhcmFtczogUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3QgcmF3UGFnZSA9IHBhcmFtc1sncGFnZSddID8/IG51bGw7XG4gICAgY29uc3QgcmF3U2l6ZSA9IHBhcmFtc1snc2l6ZSddID8/IG51bGw7XG4gICAgY29uc3QgcGFnZSA9IHBhcnNlUGFnZShyYXdQYWdlKTtcbiAgICBjb25zdCBzaXplID0gcGFyc2VTaXplKHJhd1NpemUpO1xuICAgIGNvbnN0IGNhbm9uaWNhbDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgLi4ucGFyYW1zIH07XG4gICAgaWYgKHBhZ2UgPiAxKSB7XG4gICAgICBjYW5vbmljYWxbJ3BhZ2UnXSA9IFN0cmluZyhwYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGNhbm9uaWNhbFsncGFnZSddO1xuICAgIH1cbiAgICBpZiAoc2l6ZSAhPT0gUEFHRV9TSVpFX0RFRkFVTFQpIHtcbiAgICAgIGNhbm9uaWNhbFsnc2l6ZSddID0gU3RyaW5nKHNpemUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgY2Fub25pY2FsWydzaXplJ107XG4gICAgfVxuICAgIGNvbnN0IGRpcnR5ID1cbiAgICAgIChyYXdQYWdlICE9PSBudWxsICYmIFN0cmluZyhwYWdlKSAhPT0gcmF3UGFnZSkgfHxcbiAgICAgIChyYXdTaXplICE9PSBudWxsICYmIFN0cmluZyhzaXplKSAhPT0gcmF3U2l6ZSkgfHxcbiAgICAgIChyYXdQYWdlID09PSBudWxsICYmIHBhZ2UgIT09IDEpIHx8XG4gICAgICAocmF3U2l6ZSA9PT0gbnVsbCAmJiBzaXplICE9PSBQQUdFX1NJWkVfREVGQVVMVCk7XG4gICAgaWYgKGRpcnR5KSB7XG4gICAgICAvLyBUaGUgbm9ybWFsaXplZCBVUkwgcmUtZW1pdHMgdGhyb3VnaCB0aGlzIHNhbWUgc3Vic2NyaXB0aW9uIGFuZFxuICAgICAgLy8gbG9hZHMgdGhlcmUg4oCUIG5vIGRvdWJsZSBmZXRjaC5cbiAgICAgIHZvaWQgdGhpcy5yb3V0ZXIubmF2aWdhdGUoW10sIHtcbiAgICAgICAgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSxcbiAgICAgICAgcXVlcnlQYXJhbXM6IGNhbm9uaWNhbCxcbiAgICAgICAgcmVwbGFjZVVybDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnBhZ2Uuc2V0KHBhZ2UpO1xuICAgIHRoaXMuc2l6ZS5zZXQoc2l6ZSk7XG4gICAgdm9pZCB0aGlzLmxvYWQoKTtcbiAgfVxuXG4gIC8qKiBUaGUgcGFnaW5hdGlvbiBjb250cm9sJ3MgaW50ZW50IChwcmV2L25leHQvc2l6ZSkuIEEgU0laRSBjaGFuZ2VcbiAgICAgIHRoYXQgd291bGQgc3RyYW5kIHRoZSBjdXJyZW50IHBhZ2UgcGFzdCB0aGUgbGFzdCBvbmUgY2xhbXBzIHRoZVxuICAgICAgcGFnZSB0byB0aGUgbGFzdCBwYWdlIEFUIFRIRSBORVcgU0laRSAodGhlIHRvdGFsIGlzIGtub3duIHdoZW5ldmVyXG4gICAgICB0aGUgY29udHJvbCBpcyB2aXNpYmxlIOKAlCBpdCBvbmx5IHJlbmRlcnMgYXQgdHdvIG9yIG1vcmUgcGFnZXMpLCBzb1xuICAgICAgYSBzaXplIGZsaXAgbmV2ZXIgbGFuZHMgb24gYSBkZWFkIHBhZ2U7IGEgcGFnZSBjaGFuZ2UgaXMgd3JpdHRlblxuICAgICAgdmVyYmF0aW0uIEVpdGhlciB3YXkgdGhlIGNhbm9uaWNhbCBVUkwgaXMgd3JpdHRlbiBhbmQgdGhlIGZyZXNoXG4gICAgICBxdWVyeSBlbWlzc2lvbiBsb2Fkcy4gKi9cbiAgb25OYXZpZ2F0ZSh7IHBhZ2UsIHNpemUgfTogeyBwYWdlOiBudW1iZXI7IHNpemU6IG51bWJlciB9KTogdm9pZCB7XG4gICAgY29uc3QgZWZmZWN0aXZlUGFnZSA9IGNsYW1wUGFnZShwYWdlLCB0aGlzLnRvdGFsKCksIHNpemUpO1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKGVmZmVjdGl2ZVBhZ2UgPiAxKSB7XG4gICAgICBxdWVyeVBhcmFtc1sncGFnZSddID0gU3RyaW5nKGVmZmVjdGl2ZVBhZ2UpO1xuICAgIH1cbiAgICBpZiAoc2l6ZSAhPT0gUEFHRV9TSVpFX0RFRkFVTFQpIHtcbiAgICAgIHF1ZXJ5UGFyYW1zWydzaXplJ10gPSBTdHJpbmcoc2l6ZSk7XG4gICAgfVxuICAgIHZvaWQgdGhpcy5yb3V0ZXIubmF2aWdhdGUoW10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSwgcXVlcnlQYXJhbXMgfSk7XG4gIH1cblxuICAvKiogVGhlIG91dC1vZi1yYW5nZSBub3RpY2UncyBhY3Rpb246IGJhY2sgdG8gdGhlIGZpcnN0IHBhZ2UgKHRoZVxuICAgICAgY3VycmVudCBzaXplIGlzIGtlcHQgaWYgaXQgaXMgbm9uLWRlZmF1bHQpLiAqL1xuICBnb3RvRmlyc3RQYWdlKCk6IHZvaWQge1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKHRoaXMuc2l6ZSgpICE9PSBQQUdFX1NJWkVfREVGQVVMVCkge1xuICAgICAgcXVlcnlQYXJhbXNbJ3NpemUnXSA9IFN0cmluZyh0aGlzLnNpemUoKSk7XG4gICAgfVxuICAgIHZvaWQgdGhpcy5yb3V0ZXIubmF2aWdhdGUoW10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSwgcXVlcnlQYXJhbXMgfSk7XG4gIH1cblxuICAvKiogRmV0Y2ggdGhlIENVUlJFTlQgcGFnZSBvZiB0aGUgcHVibGlzaGVkIGluZGV4OyBhIGZhaWx1cmUgbGFuZHMgaW5cbiAgICAgIHRoZSBzaGFyZWQgZXJyb3IgYmFubmVyIHdpdGggdGhlIHBhZ2UgY2hyb21lIGludGFjdCAoc2hhcmVkXG4gICAgICBjb252ZW50aW9uKS4gKi9cbiAgbG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzZXEgPSArK3RoaXMuZmV0Y2hTZXE7XG4gICAgY29uc3QgcGFnZSA9IHRoaXMucGFnZSgpO1xuICAgIGNvbnN0IHNpemUgPSB0aGlzLnNpemUoKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLmxvYWRpbmcuc2V0KHRydWUpO1xuICAgIHJldHVybiB0aGlzLmdhdGV3YXkubGlzdFBhZ2UocGFnZSwgc2l6ZSkudGhlbihcbiAgICAgICh2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoc2VxICE9PSB0aGlzLmZldGNoU2VxKSB7XG4gICAgICAgICAgcmV0dXJuOyAvLyBhIG5ld2VyIGZldGNoIHN1cGVyc2VkZWQgdGhpcyBvbmUgKHN3aXRjaC9wYWdlIGZsaXApXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyByb3dzLCB0b3RhbCB9ID0gdmFsdWU7XG4gICAgICAgIHRoaXMudG90YWwuc2V0KHRvdGFsKTtcbiAgICAgICAgdGhpcy5wYWdlcy5zZXQobGFzdFBhZ2UodG90YWwsIHNpemUpKTtcbiAgICAgICAgY29uc3Qgb3V0T2ZSYW5nZSA9IHRvdGFsID4gMCAmJiBwYWdlID4gbGFzdFBhZ2UodG90YWwsIHNpemUpO1xuICAgICAgICB0aGlzLm91dE9mUmFuZ2Uuc2V0KG91dE9mUmFuZ2UpO1xuICAgICAgICB0aGlzLnBvc3RzLnNldChvdXRPZlJhbmdlID8gW10gOiByb3dzKTtcbiAgICAgICAgdGhpcy5mYWlsZWRIZXJvU2x1Z3Muc2V0KG5ldyBTZXQoKSk7XG4gICAgICAgIHRoaXMubG9hZGluZy5zZXQoZmFsc2UpO1xuICAgICAgfSxcbiAgICAgIChmYWlsdXJlOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChzZXEgIT09IHRoaXMuZmV0Y2hTZXEpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvci5zZXQoYmFubmVyTWVzc2FnZShmYWlsdXJlLCAnc2hlbHRlcicsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICAgICAgdGhpcy5sb2FkaW5nLnNldChmYWxzZSk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cbn1cbiIsIjwhLS0gL2Jsb2cg4oCUIHRoZSBwdWJsaWMgY3Jpc2lzLWd1aWRhbmNlIGluZGV4IChjcmlzaXMtZ3VpZGFuY2UgRDQvRDYpLlxuICAgICBUaGUgc2VydmVyIG93bnMgb3JkZXJpbmcgKFBVQkxJU0hFRCBvbmx5LCBwaW5uZWQgZmlyc3QsIHRoZW5cbiAgICAgcHVibGlzaGVkQXQgZGVzY2VuZGluZyk7IHRoZSBwYWdlIHJlbmRlcnMgdGhlIGFycmF5IGFzLWlzLiBUaGUgaW5kZXhcbiAgICAgZG9lcyBub3QgY2FycnkgdGhlIHBvc3QgYm9keSDigJQgdGhlIGRldGFpbCBwYWdlIGRvZXMuIC0tPlxuPHNlY3Rpb24gY2xhc3M9XCJndWlkYW5jZS1saXN0XCI+XG4gIDxoZWFkZXIgY2xhc3M9XCJndWlkYW5jZS1saXN0X19oZWFkZXJcIj5cbiAgICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2d1aWRhbmNlLnRpdGxlJyB8IHQgfX08L2gxPlxuICAgIDxwIGNsYXNzPVwicGFnZS1zdWJ0aXRsZVwiPnt7ICdndWlkYW5jZS5zdWJ0aXRsZScgfCB0IH19PC9wPlxuICA8L2hlYWRlcj5cblxuICA8YXBwLWJhbm5lciBzZXZlcml0eT1cImVycm9yXCIgW21lc3NhZ2VdPVwiZXJyb3IoKVwiIC8+XG5cbiAgQGlmIChsb2FkaW5nKCkpIHtcbiAgICA8YXBwLWxvYWRpbmctaW5kaWNhdG9yIGNsYXNzPVwiZ3VpZGFuY2Utc3RhdGVcIiBbbWVzc2FnZV09XCInZ3VpZGFuY2UubG9hZGluZycgfCB0XCIgLz5cbiAgfSBAZWxzZSBpZiAob3V0T2ZSYW5nZSgpKSB7XG4gICAgPCEtLSBUaGUgaG9uZXN0IG91dC1vZi1yYW5nZSBzdGF0ZSAoZ3VpZGFuY2UtaW5kZXgtcGFnaW5nKSwgaW4gdGhlXG4gICAgICAgICBzaGFyZWQgY29tcG9uZW50OiB0aGUgVVJMIGFza3MgZm9yIGEgcGFnZSBwYXN0IHRoZSBlbmQgb2YgYVxuICAgICAgICAgTk9OLUVNUFRZIGluZGV4IOKAlCBhIGhhbmQtdHlwZWQgbnVtYmVyLCBhIHN0YWxlIHNoYXJlZCBsaW5rLCBvciBhXG4gICAgICAgICBsb2NhbGUgc3dpdGNoIHRoYXQgc2hyYW5rIHRoZSBpbmRleC4gRXhwbGljaXQgdHJhbnNsYXRlZCBub3RpY2VcbiAgICAgICAgICsgZmlyc3QtcGFnZSBhY3Rpb247IHRoZSBlbXB0eSBzdGF0ZSBiZWxvdyBpcyB0b3RhbCA9PT0gMCBvbmx5LFxuICAgICAgICAgbmV2ZXIgdGhpcy4gLS0+XG4gICAgPGFwcC1saXN0LXN0YXRlXG4gICAgICBba2luZF09XCInb3V0LW9mLXJhbmdlJ1wiXG4gICAgICBbbWVzc2FnZUtleV09XCInZ3VpZGFuY2UucGFnZU91dE9mUmFuZ2UnXCJcbiAgICAgIFtwYWdlXT1cInBhZ2UoKVwiXG4gICAgICBbcGFnZXNdPVwicGFnZXMoKVwiXG4gICAgICBbYWN0aW9uS2V5XT1cIidndWlkYW5jZS5wYWdlRmlyc3QnXCJcbiAgICAgIChvbkdvRmlyc3RQYWdlKT1cImdvdG9GaXJzdFBhZ2UoKVwiXG4gICAgLz5cbiAgfSBAZWxzZSBpZiAocG9zdHMoKTsgYXMgbGlzdCkge1xuICAgIEBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIDwhLS0gVGhlIGVtcHR5IHN0YXRlICh0aGUgc2hhcmVkIGNvbXBvbmVudCdzIGVtcHR5IG1vZGUpOiBub3RoaW5nIGlzXG4gICAgICAgICAgIHB1Ymxpc2hlZCBpbiB0aGUgYWN0aXZlIGxvY2FsZS4gLS0+XG4gICAgICA8YXBwLWxpc3Qtc3RhdGUgW2tpbmRdPVwiJ2VtcHR5J1wiIFttZXNzYWdlS2V5XT1cIidndWlkYW5jZS5lbXB0eSdcIiAvPlxuICAgIH0gQGVsc2Uge1xuICAgICAgPHVsIGNsYXNzPVwiZ3VpZGFuY2UtbGlzdF9fcG9zdHNcIj5cbiAgICAgICAgQGZvciAocG9zdCBvZiBsaXN0OyB0cmFjayBwb3N0LnNsdWcpIHtcbiAgICAgICAgICA8bGkgY2xhc3M9XCJndWlkYW5jZS1wb3N0XCI+XG4gICAgICAgICAgICA8IS0tIEhlcm8gdGh1bWJuYWlsIG9uIHRvcCAodGhlIGluZGV4IGhlcm8gcHJvamVjdGlvbikuXG4gICAgICAgICAgICAgICAgIE5PLUhFUk8gUlVMRSBSRVZJU0lURUQg4oCUIHN1cGVyc2VkZXMgdGhlIGVhcmxpZXIgcnVsZVxuICAgICAgICAgICAgICAgICBcImEgcG9zdCBXSVRIT1VUIGEgaGVybyByZW5kZXJzIE5PIGltYWdlIGVsZW1lbnQgYXQgYWxsXCI6XG4gICAgICAgICAgICAgICAgIHRoYXQgcnVsZSBldmVuZWQgb3V0IGEgVEVYVCBST1cgbGlzdCwgYnV0IGEgY2FyZCBHUklEXG4gICAgICAgICAgICAgICAgIGFsaWducyByb3dzIG9mIENBUkRTLCBub3QgdGV4dCDigJQgYSBoZXJvLWxlc3MgY2FyZCB3aXRoIG5vXG4gICAgICAgICAgICAgICAgIGJveCBpcyBzaG9ydGVyIHRoYW4gaXRzIG5laWdoYm91cnMgYW5kIGV2ZXJ5IGdyaWQgcm93XG4gICAgICAgICAgICAgICAgIGdvZXMgcmFnZ2VkLiBJbiBhIGdyaWQgdGhlIGV2ZW5uZXNzIGNvbWVzIGZyb20gdGhlIEJPWCxcbiAgICAgICAgICAgICAgICAgc28gYSBoZXJvLWxlc3MgY2FyZCBub3cgcmVuZGVycyBhIE5FVVRSQUwgUExBQ0VIT0xERVJcbiAgICAgICAgICAgICAgICAgQk9YIG9mIHRoZSBTQU1FIGFzcGVjdCByYXRpbyDigJQgb25lIHZpc3VhbCBsYW5ndWFnZSBmb3JcbiAgICAgICAgICAgICAgICAgXCJubyBpbWFnZVwiLCBzaGFyZWQgd2l0aCB0aGUgbG9hZC1mYWlsdXJlIGNhc2UgYmVsb3cuXG4gICAgICAgICAgICAgICAgIEEgcHJlc2VudCBVUkwgcmVuZGVycyBhIGZ1bGwtY2FyZC13aWR0aCBib3ggKG9iamVjdC1maXQ6XG4gICAgICAgICAgICAgICAgIGNvdmVyLCBhc3BlY3QtcmF0aW8gKyBtYXRjaGluZyB3aWR0aC9oZWlnaHQgYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgbGF6eSArIGFzeW5jIOKAlCB0aGUgYWRtaW4gaGVyby10aHVtYiBtZWRpYSBpZGlvbSBhdCBjYXJkXG4gICAgICAgICAgICAgICAgIHNjYWxlKSwgc28gbG9hZGluZyBuZXZlciBzaGlmdHMgdGhlIGNhcmQuIC0tPlxuICAgICAgICAgICAgQGlmIChwb3N0Lmhlcm9JbWFnZVVybDsgYXMgaGVyb1VybCkge1xuICAgICAgICAgICAgICBAaWYgKGhlcm9GYWlsZWQocG9zdC5zbHVnKSkge1xuICAgICAgICAgICAgICAgIDwhLS0gVGhlIHRodW1ibmFpbCA0MDQnZCAvIHRoZSBuZXR3b3JrIGZhaWxlZDogdGhlIFNBTUVcbiAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyIGJveCB0YWtlcyBpdHMgcGxhY2UgKHRoZSBjYXJkIGtlZXBzIGl0c1xuICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0LCB0aGUgdGl0bGUgbGluayBzdGF5cyB0aGUgY2FyZCdzIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICAgYWNjZXNzaWJsZSBsaW5rKSDigJQgYSBicm9rZW4taW1hZ2UgaWNvbiBpcyBuZXZlciB0aGVcbiAgICAgICAgICAgICAgICAgICAgIGZlZWRiYWNrLiAtLT5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImd1aWRhbmNlLXBvc3RfX3RodW1iIGd1aWRhbmNlLXBvc3RfX3RodW1iLS1mYWlsZWRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgICAgICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgICAgICAgIDwhLS0gQWx0OiB0aGUgc3RvcmVkIGhlcm8gYWx0ICh0aGUgYWRtaW4gc2V0cyBpdDsgbWFuZGF0b3J5XG4gICAgICAgICAgICAgICAgICAgICB3aGVuZXZlciBhIGhlcm8gZXhpc3RzKS4gQSBudWxsIGFsdCB3aXRoIGEgcHJlc2VudCBVUkxcbiAgICAgICAgICAgICAgICAgICAgID0gZGVjb3JhdGl2ZSBlbXB0eSBhbHQg4oCUIG5ldmVyIHRoZSBwb3N0IHRpdGxlLCB3aGljaFxuICAgICAgICAgICAgICAgICAgICAgd291bGQgZHVwbGljYXRlIHRoZSBsaW5rIHRleHQuIC0tPlxuICAgICAgICAgICAgICAgIDxpbWdcbiAgICAgICAgICAgICAgICAgIGNsYXNzPVwiZ3VpZGFuY2UtcG9zdF9faGVyb1wiXG4gICAgICAgICAgICAgICAgICBbc3JjXT1cImhlcm9VcmxcIlxuICAgICAgICAgICAgICAgICAgW2FsdF09XCJwb3N0Lmhlcm9JbWFnZUFsdCA/PyAnJ1wiXG4gICAgICAgICAgICAgICAgICB3aWR0aD1cIjQwMFwiXG4gICAgICAgICAgICAgICAgICBoZWlnaHQ9XCIzMDBcIlxuICAgICAgICAgICAgICAgICAgbG9hZGluZz1cImxhenlcIlxuICAgICAgICAgICAgICAgICAgZGVjb2Rpbmc9XCJhc3luY1wiXG4gICAgICAgICAgICAgICAgICAoZXJyb3IpPVwib25IZXJvSW1hZ2VFcnJvcigkZXZlbnQsIHBvc3Quc2x1ZylcIlxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgICAgICA8IS0tIE5vIGhlcm86IHRoZSBuZXV0cmFsIHBsYWNlaG9sZGVyIGJveCAoc2VlIHRoZSBjb21tZW50XG4gICAgICAgICAgICAgICAgICAgYWJvdmUg4oCUIHRoZSBncmlkJ3MgYWxpZ25tZW50IGNvbWVzIGZyb20gdGhlIGJveCkuIC0tPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImd1aWRhbmNlLXBvc3RfX3RodW1iXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgPGgyIGNsYXNzPVwiZ3VpZGFuY2UtcG9zdF9fdGl0bGVcIj5cbiAgICAgICAgICAgICAgPGEgW3JvdXRlckxpbmtdPVwiWycvYmxvZycsIHBvc3Quc2x1Z11cIj57eyBwb3N0LnRpdGxlIH19PC9hPlxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZ3VpZGFuY2UtcG9zdF9fZGF0ZVwiPlxuICAgICAgICAgICAgICB7eyBwb3N0LnB1Ymxpc2hlZEF0IHwgZGF0ZTogJ21lZGl1bScgOiB1bmRlZmluZWQgOiBpMThuLmxvY2FsZSgpIH19XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9saT5cbiAgICAgICAgfVxuICAgICAgPC91bD5cblxuICAgICAgPCEtLSBUaGUgc2hhcmVkIHBhZ2UgKyBzaXplIGNvbnRyb2wgKGxpc3QtcGFnZS1wYWdpbmcpLiBJdCByZW5kZXJzXG4gICAgICAgICAgIE5PVEhJTkcgYXQgb25lIHBhZ2Ugb3IgYW4gZW1wdHkgbGlzdCAocGFnZXMoKSA8IDIpLCBzbyB0aGVcbiAgICAgICAgICAgY2hyb21lIG5ldmVyIGFwcGVhcnMgd2hlbiBpdCB3b3VsZCBiZSBwb2ludGxlc3MuIEl0cyBkZWZhdWx0XG4gICAgICAgICAgIHNpemUgbGlzdCBJUyB0aGUgZW5kcG9pbnQncyByYW5nZSAoc2hhcmVkL3BhZ2luZyBQQUdFX1NJWkVTKSxcbiAgICAgICAgICAgc28gbm8gW3NpemVzXSBiaW5kaW5nIGlzIG5lZWRlZC4gLS0+XG4gICAgICA8YXBwLXBhZ2luYXRpb25cbiAgICAgICAgW3BhZ2VdPVwicGFnZSgpXCJcbiAgICAgICAgW3BhZ2VzXT1cInBhZ2VzKClcIlxuICAgICAgICBbc2l6ZV09XCJzaXplKClcIlxuICAgICAgICAob25OYXZpZ2F0ZSk9XCJvbk5hdmlnYXRlKCRldmVudClcIlxuICAgICAgLz5cbiAgICB9XG4gIH1cbjwvc2VjdGlvbj5cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBUyx5QkFBeUIsV0FBVyxRQUF3QixjQUFjO0FBQ25GLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsZ0JBQWdCO0FB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Q0E7TUFDQTtNQUNBO01BQ0E7T0FDRCxpQkFHZ0Isd0JBQXdCLFFBQU0sVUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBQUEsUUFBQSxDQUFBLG8wQ0FBQSxFQUFBLENBQUE7Ozs7Z0ZBRXBDLGtCQUFnQixFQUFBLFdBQUEsb0JBQUEsVUFBQSxtREFBQSxZQUFBLEdBQUEsQ0FBQTtBQUFBLEdBQUE7Ozs7Ozs7OERBQWhCLGtCQUFnQixFQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLGlCQUFBLFdBQUEsa0JBQUEsWUFBQSxVQUFBLGVBQUEsV0FBQSx1QkFBQSxHQUFBLGFBQUEsRUFBQSxDQUFBO0VBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGNBQUEseUJBQUEsS0FBQSxJQUFBLENBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGVBQUEsWUFBQSxPQUFBLFlBQUEsSUFBQSxHQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsTUFBQSx5QkFBQSxFQUFBLFNBQUEsQ0FBQTtBQUFBLEdBQUE7IiwibmFtZXMiOltdLCJkZWJ1Z0lkIjoiNWZiYjIyMzUtOTFkZi01OTIxLWEwOTgtM2YyOTYxOTE2NTEzIn0=