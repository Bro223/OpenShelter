import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-VCM6ZS4I.js");import {
  GuidanceGateway
} from "/chunk-K74CHFRN.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  ApiError,
  BannerComponent,
  bannerMessage
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/guidance/guidance-detail-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { DatePipe } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { ActivatedRoute, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c0 = (a0, a1) => ({ locale: a0, reader: a1 });
var _c1 = (a0) => ({ locale: a0 });
function GuidanceDetailPage_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 2);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "p", 3);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275pipe(6, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(7, "a", 4);
    i0.\u0275\u0275text(8);
    i0.\u0275\u0275pipe(9, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 3, "guidance.notFoundTitle"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 5, "guidance.notFoundBody"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(9, 7, "guidance.backToList"));
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-loading-indicator", 7);
    i0.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i0.\u0275\u0275property("message", i0.\u0275\u0275pipeBind1(1, 1, "guidance.loadingDetail"));
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "span", 12);
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "img", 14);
    i0.\u0275\u0275listener("error", function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Conditional_1_Template_img_error_0_listener($event) {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext(4);
      return i0.\u0275\u0275resetView(ctx_r1.onHeroImageError($event));
    });
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const heroUrl_r3 = i0.\u0275\u0275nextContext();
    const p_r4 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275property("src", heroUrl_r3, i0.\u0275\u0275sanitizeUrl)("alt", p_r4.heroImageAlt ?? "");
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Conditional_0_Template, 1, 0, "span", 12)(1, GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Conditional_1_Template, 1, 2, "img", 13);
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(3);
    i0.\u0275\u0275conditional(ctx_r1.heroFailed() ? 0 : 1);
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_8_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "a", 15);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const fb_r5 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275property("routerLink", i0.\u0275\u0275interpolate1("/blog/", ctx));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind2(2, 3, "guidance.localeFallback.alternate", i0.\u0275\u0275pureFunction1(6, _c1, fb_r5.reader)));
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 10);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275conditionalCreate(3, GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_8_Conditional_3_Template, 3, 8, "a", 15);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_6_0;
    const fb_r5 = ctx;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind2(2, 2, "guidance.localeFallback", i0.\u0275\u0275pureFunction2(5, _c0, fb_r5.served, fb_r5.reader)), " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional((tmp_6_0 = fb_r5.alternateSlug) ? 3 : -1, tmp_6_0);
  }
}
function GuidanceDetailPage_Conditional_1_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_0_Template, 2, 1);
    i0.\u0275\u0275elementStart(1, "header", 8)(2, "h1", 2);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "p", 9);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275pipe(6, "t");
    i0.\u0275\u0275pipe(7, "date");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275conditionalCreate(8, GuidanceDetailPage_Conditional_1_Conditional_6_Conditional_8_Template, 4, 8, "p", 10);
    i0.\u0275\u0275element(9, "article", 11);
  }
  if (rf & 2) {
    let tmp_3_0;
    let tmp_6_0;
    const p_r4 = ctx;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275conditional((tmp_3_0 = p_r4.heroImageUrl) ? 0 : -1, tmp_3_0);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(p_r4.title);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate2(" ", i0.\u0275\u0275pipeBind1(6, 6, "guidance.published"), " ", i0.\u0275\u0275pipeBind4(7, 8, p_r4.publishedAt, "medium", void 0, ctx_r1.i18n.locale()), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275conditional((tmp_6_0 = ctx_r1.fallbackNotice()) ? 8 : -1, tmp_6_0);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("innerHTML", p_r4.bodyHtml ?? "", i0.\u0275\u0275sanitizeHtml);
  }
}
function GuidanceDetailPage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "section", 1)(1, "a", 5);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(4, "app-banner", 6);
    i0.\u0275\u0275conditionalCreate(5, GuidanceDetailPage_Conditional_1_Conditional_5_Template, 2, 3, "app-loading-indicator", 7)(6, GuidanceDetailPage_Conditional_1_Conditional_6_Template, 10, 13);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_3_0;
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1("\u2190 ", i0.\u0275\u0275pipeBind1(3, 3, "guidance.backToList"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("message", ctx_r1.error());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.loading() ? 5 : (tmp_3_0 = ctx_r1.post()) ? 6 : -1, tmp_3_0);
  }
}
var GuidanceDetailPage = class _GuidanceDetailPage {
  gateway = inject(GuidanceGateway);
  route = inject(ActivatedRoute);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  i18n = inject(I18nService);
  /** The active :slug; null until the first param replay. */
  slug = signal(
    null,
    ...ngDevMode ? [{ debugName: "slug" }] : (
      /* istanbul ignore next */
      []
    )
  );
  post = signal(
    null,
    ...ngDevMode ? [{ debugName: "post" }] : (
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
  notFound = signal(
    false,
    ...ngDevMode ? [{ debugName: "notFound" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The fetchSeq guard drops a superseded in-flight response (the
      shelter-detail's pattern: an id switch must not land the old
      post's data over the new load — the same guard covers a language
      switch, whose 404/200 outcome can flip between fetches). */
  fetchSeq = 0;
  /** Did the CURRENT post's hero <img> fail to load (404/network)? The
      index card's idiom (guidance-list-page): the neutral placeholder box
      takes its place — a broken-image icon is never the feedback. A plain
      boolean (one post at a time, unlike the index's per-slug set); reset
      on every load so a failed hero never carries over to the next slug. */
  heroFailed = signal(
    false,
    ...ngDevMode ? [{ debugName: "heroFailed" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Template seam for the hero <img>'s (error): the placeholder takes
      the image's place (the box keeps its height, no layout shift). */
  onHeroImageError(_event) {
    this.heroFailed.set(true);
  }
  /** The language switcher sets I18nService.locale: the detail is
      locale-scoped on the server, so a switch re-fetches (the guard
      keeps a stale response from the other language from landing).
      A field initializer (an injection context — toObservable's
      requirement) builds the subscription; toObservable emits the
      CURRENT value on subscribe, so skip(1) — only a real switch
      triggers a load. Unsubscribed in ngOnDestroy (the page shell's
      router-subscription idiom). */
  localeSub = toObservable(this.i18n.locale).pipe(skip(1)).subscribe(() => this.load());
  /**
   * The locale-fallback notice (bilingual-guidance): non-null ONLY when
   * the server served this post in a language OTHER than the reader's
   * (the `localeFallback` flag — the post has no translation in the
   * reader's language). The block then says plainly which language is
   * being shown and that the reader's is not available; when `alternates`
   * actually carries the reader's locale it offers a LINK to that
   * version (the reader's choice — the URL is never switched silently).
   * Nothing extra appears when a translation exists in the reader's
   * language (the flag is false then). A plain method (re-evaluated on
   * each CD pass — `post()` and the locale signal are the inputs).
   */
  fallbackNotice() {
    const p = this.post();
    if (p === null || !p.localeFallback) {
      return null;
    }
    const reader = this.i18n.locale();
    const alternates = p.alternates ?? {};
    const alternateSlug = alternates[reader];
    return { served: p.locale, reader, alternateSlug: alternateSlug ?? null };
  }
  ngOnInit() {
    this.route.paramMap.subscribe((params) => this.readSlug(params.get("slug")));
  }
  ngOnDestroy() {
    this.localeSub.unsubscribe();
  }
  /** Adopt the :slug param (an empty slug is not-found, mirroring the
      shelter-detail's invalid-id handling). */
  readSlug(raw) {
    if (raw === null || raw.length === 0) {
      this.notFound.set(true);
      return;
    }
    if (raw === this.slug()) {
      return;
    }
    this.slug.set(raw);
    this.notFound.set(false);
    this.post.set(null);
    this.load();
  }
  /** Fetch the post by slug. 404 (unknown slug, a draft slug, or a post
      in ANOTHER locale) -> not-found state; any other failure -> error
      banner with the page chrome intact (shared convention). */
  load() {
    const slug = this.slug();
    if (slug === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.notFound.set(false);
    this.heroFailed.set(false);
    this.loading.set(true);
    return this.gateway.getBySlug(slug).then((value) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.post.set(value);
      this.loading.set(false);
    }, (failure) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.loading.set(false);
      if (failure instanceof ApiError && failure.status === 404) {
        this.post.set(null);
        this.notFound.set(true);
        return;
      }
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
    });
  }
  static \u0275fac = function GuidanceDetailPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GuidanceDetailPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _GuidanceDetailPage, selectors: [["app-guidance-detail-page"]], decls: 2, vars: 1, consts: [[1, "guidance-detail", "guidance-detail--not-found"], [1, "guidance-detail"], [1, "page-title"], [1, "page-subtitle"], ["routerLink", "/blog", 1, "btn", "btn--primary"], ["routerLink", "/blog", 1, "back-link"], ["severity", "error", 3, "message"], [1, "guidance-state", 3, "message"], [1, "guidance-detail__header"], [1, "guidance-detail__date"], ["role", "note", 1, "guidance-detail__fallback"], [1, "guidance-detail__body", 3, "innerHTML"], ["aria-hidden", "true", 1, "guidance-detail__hero", "guidance-detail__hero--failed"], ["width", "704", "height", "528", "fetchpriority", "high", "decoding", "async", 1, "guidance-detail__hero", 3, "src", "alt"], ["width", "704", "height", "528", "fetchpriority", "high", "decoding", "async", 1, "guidance-detail__hero", 3, "error", "src", "alt"], [1, "guidance-detail__fallback-link", 3, "routerLink"]], template: function GuidanceDetailPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275conditionalCreate(0, GuidanceDetailPage_Conditional_0_Template, 10, 9, "section", 0)(1, GuidanceDetailPage_Conditional_1_Template, 7, 5, "section", 1);
    }
    if (rf & 2) {
      i0.\u0275\u0275conditional(ctx.notFound() ? 0 : 1);
    }
  }, dependencies: [RouterLink, BannerComponent, LoadingIndicator, DatePipe, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n.guidance-detail[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-20);\n  max-width: 44rem;\n}\n.guidance-detail--not-found[_ngcontent-%COMP%] {\n  align-items: flex-start;\n}\n.back-link[_ngcontent-%COMP%] {\n  align-self: flex-start;\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n  font-size: var(--%NS%text-md);\n}\n.back-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.guidance-detail__header[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n}\n.guidance-detail__hero[_ngcontent-%COMP%] {\n  width: 100%;\n  aspect-ratio: 4/3;\n  border-radius: var(--%NS%radius-md);\n}\n.guidance-detail__hero--failed[_ngcontent-%COMP%] {\n  display: block;\n  border: 1px solid var(--%NS%color-border-subtle);\n  background: var(--%NS%color-bg-subtle);\n}\n.guidance-detail__date[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: 0;\n}\n.guidance-detail__fallback[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: var(--%NS%space-12) var(--%NS%space-16);\n  border: 1px solid var(--%NS%color-border-subtle);\n  border-radius: var(--%NS%radius-md);\n  background: var(--%NS%color-bg-subtle);\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.guidance-detail__fallback-link[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.guidance-detail__fallback-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.guidance-detail__body[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-12);\n}\n.guidance-detail__body[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-20) 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-lg);\n}\n.guidance-detail__body[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%], \n.guidance-detail__body[_ngcontent-%COMP%]   ol[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-12);\n  padding-left: var(--%NS%space-16);\n}\n.guidance-detail__body[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] {\n  max-width: 100%;\n  height: auto;\n  border-radius: var(--%NS%radius-md);\n}\n.guidance-detail__body[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.guidance-state[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0;\n}\n/*# sourceMappingURL=guidance-detail-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(GuidanceDetailPage, [{
    type: Component,
    args: [{ selector: "app-guidance-detail-page", imports: [DatePipe, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (notFound()) {
  <section class="guidance-detail guidance-detail--not-found">
    <h1 class="page-title">{{ 'guidance.notFoundTitle' | t }}</h1>
    <p class="page-subtitle">{{ 'guidance.notFoundBody' | t }}</p>
    <a routerLink="/blog" class="btn btn--primary">{{ 'guidance.backToList' | t }}</a>
  </section>
} @else {
  <section class="guidance-detail">
    <a routerLink="/blog" class="back-link">&larr; {{ 'guidance.backToList' | t }}</a>

    <app-banner severity="error" [message]="error()" />

    @if (loading()) {
      <app-loading-indicator class="guidance-state" [message]="'guidance.loadingDetail' | t" />
    } @else if (post(); as p) {
      <!-- The hero image (crisis-guidance D1): the index card's visual
           language at article scale \u2014 full width in a fixed 4/3
           aspect-ratio box (object-fit: cover, matching width/height
           attributes, so the title never shifts while the image loads).
           NO-HERO RULE: no hero URL renders NO element at all \u2014 no
           broken image, no empty frame, no layout shift. A 404'd / 
           unreachable stored URL takes the index's neutral placeholder
           box (a broken-image icon is never the feedback). The hero is
           the article's first content (above the fold), so it loads
           eager with a high fetch priority \u2014 the index cards, below the
           fold, use lazy instead. -->
      @if (p.heroImageUrl; as heroUrl) {
        @if (heroFailed()) {
          <span class="guidance-detail__hero guidance-detail__hero--failed" aria-hidden="true"></span>
        } @else {
          <!-- Alt: the stored hero alt (the admin sets it; mandatory
               whenever a hero exists). A null alt with a present URL =
               decorative empty alt \u2014 never the post title. -->
          <img
            class="guidance-detail__hero"
            [src]="heroUrl"
            [alt]="p.heroImageAlt ?? ''"
            width="704"
            height="528"
            fetchpriority="high"
            decoding="async"
            (error)="onHeroImageError($event)"
          />
        }
      }
      <header class="guidance-detail__header">
        <h1 class="page-title">{{ p.title }}</h1>
        <p class="guidance-detail__date">
          {{ 'guidance.published' | t }}
          {{ p.publishedAt | date: 'medium' : undefined : i18n.locale() }}
        </p>
      </header>
      <!-- Locale-fallback notice (bilingual-guidance): the post has NO
           translation in the reader's language \u2014 the server served the
           default-locale copy with the flag (a 200, never a 404). The
           note says plainly which language is shown and that the
           reader's language is not available; it offers the
           reader's-language version as a LINK when \`alternates\` carries
           that locale (the reader's choice \u2014 the URL is never switched
           silently). When a translation exists in the reader's language
           the flag is false and nothing extra appears. -->
      @if (fallbackNotice(); as fb) {
        <p class="guidance-detail__fallback" role="note">
          {{ 'guidance.localeFallback' | t: { locale: fb.served, reader: fb.reader } }}
          @if (fb.alternateSlug; as altSlug) {
            <a class="guidance-detail__fallback-link" routerLink="/blog/{{ altSlug }}">{{
              'guidance.localeFallback.alternate' | t: { locale: fb.reader }
            }}</a>
          }
        </p>
      }
      <!-- Bound through Angular's sanitizer as well as the server's allowlist,
           so this site can never introduce a bypass. -->
      <article class="guidance-detail__body" [innerHTML]="p.bodyHtml ?? ''"></article>
    }
  </section>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/guidance/guidance-detail-page.scss */\n.guidance-detail {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-20);\n  max-width: 44rem;\n}\n.guidance-detail--not-found {\n  align-items: flex-start;\n}\n.back-link {\n  align-self: flex-start;\n  color: var(--color-primary);\n  text-decoration: none;\n  font-size: var(--text-md);\n}\n.back-link:hover {\n  text-decoration: underline;\n}\n.guidance-detail__header {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n}\n.guidance-detail__hero {\n  width: 100%;\n  aspect-ratio: 4/3;\n  border-radius: var(--radius-md);\n}\n.guidance-detail__hero--failed {\n  display: block;\n  border: 1px solid var(--color-border-subtle);\n  background: var(--color-bg-subtle);\n}\n.guidance-detail__date {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: 0;\n}\n.guidance-detail__fallback {\n  margin: 0;\n  padding: var(--space-12) var(--space-16);\n  border: 1px solid var(--color-border-subtle);\n  border-radius: var(--radius-md);\n  background: var(--color-bg-subtle);\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.guidance-detail__fallback-link {\n  color: var(--color-primary);\n}\n.guidance-detail__fallback-link:hover {\n  text-decoration: underline;\n}\n.guidance-detail__body p {\n  margin: 0 0 var(--space-12);\n}\n.guidance-detail__body h2 {\n  margin: var(--space-20) 0 var(--space-8);\n  font-size: var(--text-lg);\n}\n.guidance-detail__body ul,\n.guidance-detail__body ol {\n  margin: 0 0 var(--space-12);\n  padding-left: var(--space-16);\n}\n.guidance-detail__body img {\n  max-width: 100%;\n  height: auto;\n  border-radius: var(--radius-md);\n}\n.guidance-detail__body a {\n  color: var(--color-primary);\n}\n.guidance-state {\n  color: var(--color-muted);\n  margin: 0;\n}\n/*# sourceMappingURL=guidance-detail-page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(GuidanceDetailPage, { className: "GuidanceDetailPage", filePath: "src/app/features/guidance/guidance-detail-page.ts", lineNumber: 46 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fguidance%2Fguidance-detail-page.ts%40GuidanceDetailPage";
  function GuidanceDetailPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(GuidanceDetailPage, m.default, [i0], [RouterLink, BannerComponent, LoadingIndicator, DatePipe, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && GuidanceDetailPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && GuidanceDetailPage_HmrLoad(d.timestamp)));
})();
export {
  GuidanceDetailPage
};
//# debugId=1374c29e-d21e-5de7-b643-e2659708709c


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvZ3VpZGFuY2UvZ3VpZGFuY2UtZGV0YWlsLXBhZ2UudHMiLCJzcmMvYXBwL2ZlYXR1cmVzL2d1aWRhbmNlL2d1aWRhbmNlLWRldGFpbC1wYWdlLmh0bWwiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksIENvbXBvbmVudCwgaW5qZWN0LCB0eXBlIE9uRGVzdHJveSwgdHlwZSBPbkluaXQsIHNpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgdG9PYnNlcnZhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZS9yeGpzLWludGVyb3AnO1xuaW1wb3J0IHsgRGF0ZVBpcGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgQWN0aXZhdGVkUm91dGUsIFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgc2tpcCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpRXJyb3IgfSBmcm9tICcuLi8uLi9jb3JlL2FwaS1lcnJvcic7XG5pbXBvcnQgeyBJMThuU2VydmljZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnO1xuaW1wb3J0IHsgVHJhbnNsYXRlUGlwZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi90cmFuc2xhdGUtcGlwZSc7XG5pbXBvcnQgdHlwZSB7IEd1aWRhbmNlUG9zdER0byB9IGZyb20gJy4uLy4uL2NvcmUvbW9kZWxzJztcbmltcG9ydCB7IEd1aWRhbmNlR2F0ZXdheSB9IGZyb20gJy4uLy4uL2dhdGV3YXlzL2d1aWRhbmNlLWdhdGV3YXknO1xuaW1wb3J0IHsgQmFubmVyQ29tcG9uZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Jhbm5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgYmFubmVyTWVzc2FnZSB9IGZyb20gJy4uLy4uL3NoYXJlZC9lcnJvci1jb3B5JztcbmltcG9ydCB7IExvYWRpbmdJbmRpY2F0b3IgfSBmcm9tICcuLi8uLi9zaGFyZWQvbG9hZGluZy1pbmRpY2F0b3InO1xuXG4vKipcbiAqIC9ibG9nLzpzbHVnIOKAlCBvbmUgcHVibGljIGNyaXNpcy1ndWlkYW5jZSBwb3N0IChjcmlzaXMtZ3VpZGFuY2UgRDQpLlxuICpcbiAqIFRoaW4gc2hlbGwgKDAxLVRBU0subWQgwqc3KTogc3RhdGUgaW4gc2lnbmFscywgdGhlIGdhdGV3YXkgb3ducyB0aGUgQVBJXG4gKiAoYSBwZXJtaXQtYWxsIHJlYWQg4oCUIG5vIGF1dGgpLiBUaGUgYm9keSBpcyBhZG1pbi1hdXRob3JlZCBIVE1MIHRoZVxuICogc2VydmVyIGFscmVhZHkgc2FuaXRpemVkIChqc291cCBhbGxvd2xpc3QpIOKAlCBpdCBpcyByZW5kZXJlZCB0aHJvdWdoXG4gKiBbaW5uZXJIVE1MXSwgd2hpY2ggcnVucyBBbmd1bGFyJ3Mgc2FuaXRpemVyIGJlZm9yZSB0aGUgdmFsdWUgcmVhY2hlcyB0aGVcbiAqIERPTSwgc28gdGhlIHN0b3JlZCBIVE1MIGlzIHNhbml0aXplZCBhIHNlY29uZCB0aW1lIGNsaWVudC1zaWRlIChuZXZlclxuICogYnlwYXNzU2VjdXJpdHlUcnVzdEh0bWwsIG5ldmVyIGEgRG9tU2FuaXRpemVyIGJ5cGFzcykuXG4gKlxuICogQSA0MDQg4oCUIGFuIHVua25vd24gc2x1ZyBPUiBhIGRyYWZ0IHNsdWcgKHRoZSBTQU1FIGFuc3dlciwgYnkgZGVzaWduOiBhXG4gKiBkcmFmdCdzIGV4aXN0ZW5jZSBpcyBuZXZlciByZXZlYWxlZCkg4oCUIGxhbmRzIGluIHRoZSByZWFkYWJsZSBub3QtZm91bmRcbiAqIHN0YXRlLCBub3QgdGhlIGVycm9yIGJhbm5lci4gQW55IG90aGVyIGZhaWx1cmUgLT4gdGhlIHNoYXJlZCBlcnJvclxuICogYmFubmVyIHdpdGggdGhlIHBhZ2UgY2hyb21lIGludGFjdC5cbiAqXG4gKiBMb2NhbGUgc2NvcGU6IHRoZSBzZXJ2ZXIgYW5zd2VycyBPTkUgbGFuZ3VhZ2UgcGVyIGNhbGwgKHRoZSBnYXRld2F5XG4gKiBzZW5kcyB0aGUgYWN0aXZlIGxvY2FsZSksIGFuZCBhIGxhbmd1YWdlIHN3aXRjaCByZS1mZXRjaGVzLiBUaGUgZGV0YWlsXG4gKiBuZXZlciBkZWFkLWVuZHMgKGJpbGluZ3VhbC1ndWlkYW5jZSk6IGEgcG9zdCBXSVRIT1VUIGEgdHJhbnNsYXRpb24gaW5cbiAqIHRoZSBhY3RpdmUgbGFuZ3VhZ2UgaXMgc2VydmVkIGluIHRoZSBkZWZhdWx0IGxvY2FsZSB3aXRoXG4gKiBgbG9jYWxlRmFsbGJhY2s6IHRydWVgIOKAlCB0aGUgcmVhZGFibGUgbm90aWNlIG5hbWVzIHRoZSBsYW5ndWFnZSBiZWluZ1xuICogc2hvd24gKGFuZCBsaW5rcyB0aGUgcmVhZGVyJ3MtbGFuZ3VhZ2UgdmVyc2lvbiB3aGVuIGBhbHRlcm5hdGVzYCBoYXNcbiAqIGl0KS4gT25seSBhIGRyYWZ0IHNsdWcgb3IgYW4gdW5rbm93biBzbHVnIHN0aWxsIGxhbmRzIGluIHRoZSByZWFkYWJsZVxuICogbm90LWZvdW5kIHN0YXRlLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtZ3VpZGFuY2UtZGV0YWlsLXBhZ2UnLFxuICBpbXBvcnRzOiBbRGF0ZVBpcGUsIFJvdXRlckxpbmssIEJhbm5lckNvbXBvbmVudCwgTG9hZGluZ0luZGljYXRvciwgVHJhbnNsYXRlUGlwZV0sXG4gIHRlbXBsYXRlVXJsOiAnLi9ndWlkYW5jZS1kZXRhaWwtcGFnZS5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2d1aWRhbmNlLWRldGFpbC1wYWdlLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgR3VpZGFuY2VEZXRhaWxQYWdlIGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGV3YXkgPSBpbmplY3QoR3VpZGFuY2VHYXRld2F5KTtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZSA9IGluamVjdChBY3RpdmF0ZWRSb3V0ZSk7XG4gIC8qKiBMb2NhbGUtYXdhcmUgZGF0ZSByZW5kZXJpbmcgKHRoZSBwYWdlLXNoZWxsIGZvb3RlcidzIHBhdHRlcm4pLiAqL1xuICByZWFkb25seSBpMThuID0gaW5qZWN0KEkxOG5TZXJ2aWNlKTtcblxuICAvKiogVGhlIGFjdGl2ZSA6c2x1ZzsgbnVsbCB1bnRpbCB0aGUgZmlyc3QgcGFyYW0gcmVwbGF5LiAqL1xuICByZWFkb25seSBzbHVnID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICByZWFkb25seSBwb3N0ID0gc2lnbmFsPEd1aWRhbmNlUG9zdER0byB8IG51bGw+KG51bGwpO1xuICByZWFkb25seSBsb2FkaW5nID0gc2lnbmFsKGZhbHNlKTtcbiAgcmVhZG9ubHkgZXJyb3IgPSBzaWduYWw8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIHJlYWRvbmx5IG5vdEZvdW5kID0gc2lnbmFsKGZhbHNlKTtcblxuICAvKiogVGhlIGZldGNoU2VxIGd1YXJkIGRyb3BzIGEgc3VwZXJzZWRlZCBpbi1mbGlnaHQgcmVzcG9uc2UgKHRoZVxuICAgICAgc2hlbHRlci1kZXRhaWwncyBwYXR0ZXJuOiBhbiBpZCBzd2l0Y2ggbXVzdCBub3QgbGFuZCB0aGUgb2xkXG4gICAgICBwb3N0J3MgZGF0YSBvdmVyIHRoZSBuZXcgbG9hZCDigJQgdGhlIHNhbWUgZ3VhcmQgY292ZXJzIGEgbGFuZ3VhZ2VcbiAgICAgIHN3aXRjaCwgd2hvc2UgNDA0LzIwMCBvdXRjb21lIGNhbiBmbGlwIGJldHdlZW4gZmV0Y2hlcykuICovXG4gIHByaXZhdGUgZmV0Y2hTZXEgPSAwO1xuXG4gIC8qKiBEaWQgdGhlIENVUlJFTlQgcG9zdCdzIGhlcm8gPGltZz4gZmFpbCB0byBsb2FkICg0MDQvbmV0d29yayk/IFRoZVxuICAgICAgaW5kZXggY2FyZCdzIGlkaW9tIChndWlkYW5jZS1saXN0LXBhZ2UpOiB0aGUgbmV1dHJhbCBwbGFjZWhvbGRlciBib3hcbiAgICAgIHRha2VzIGl0cyBwbGFjZSDigJQgYSBicm9rZW4taW1hZ2UgaWNvbiBpcyBuZXZlciB0aGUgZmVlZGJhY2suIEEgcGxhaW5cbiAgICAgIGJvb2xlYW4gKG9uZSBwb3N0IGF0IGEgdGltZSwgdW5saWtlIHRoZSBpbmRleCdzIHBlci1zbHVnIHNldCk7IHJlc2V0XG4gICAgICBvbiBldmVyeSBsb2FkIHNvIGEgZmFpbGVkIGhlcm8gbmV2ZXIgY2FycmllcyBvdmVyIHRvIHRoZSBuZXh0IHNsdWcuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBoZXJvRmFpbGVkID0gc2lnbmFsKGZhbHNlKTtcblxuICAvKiogVGVtcGxhdGUgc2VhbSBmb3IgdGhlIGhlcm8gPGltZz4ncyAoZXJyb3IpOiB0aGUgcGxhY2Vob2xkZXIgdGFrZXNcbiAgICAgIHRoZSBpbWFnZSdzIHBsYWNlICh0aGUgYm94IGtlZXBzIGl0cyBoZWlnaHQsIG5vIGxheW91dCBzaGlmdCkuICovXG4gIG9uSGVyb0ltYWdlRXJyb3IoX2V2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuaGVyb0ZhaWxlZC5zZXQodHJ1ZSk7XG4gIH1cblxuICAvKiogVGhlIGxhbmd1YWdlIHN3aXRjaGVyIHNldHMgSTE4blNlcnZpY2UubG9jYWxlOiB0aGUgZGV0YWlsIGlzXG4gICAgICBsb2NhbGUtc2NvcGVkIG9uIHRoZSBzZXJ2ZXIsIHNvIGEgc3dpdGNoIHJlLWZldGNoZXMgKHRoZSBndWFyZFxuICAgICAga2VlcHMgYSBzdGFsZSByZXNwb25zZSBmcm9tIHRoZSBvdGhlciBsYW5ndWFnZSBmcm9tIGxhbmRpbmcpLlxuICAgICAgQSBmaWVsZCBpbml0aWFsaXplciAoYW4gaW5qZWN0aW9uIGNvbnRleHQg4oCUIHRvT2JzZXJ2YWJsZSdzXG4gICAgICByZXF1aXJlbWVudCkgYnVpbGRzIHRoZSBzdWJzY3JpcHRpb247IHRvT2JzZXJ2YWJsZSBlbWl0cyB0aGVcbiAgICAgIENVUlJFTlQgdmFsdWUgb24gc3Vic2NyaWJlLCBzbyBza2lwKDEpIOKAlCBvbmx5IGEgcmVhbCBzd2l0Y2hcbiAgICAgIHRyaWdnZXJzIGEgbG9hZC4gVW5zdWJzY3JpYmVkIGluIG5nT25EZXN0cm95ICh0aGUgcGFnZSBzaGVsbCdzXG4gICAgICByb3V0ZXItc3Vic2NyaXB0aW9uIGlkaW9tKS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhbGVTdWIgPSB0b09ic2VydmFibGUodGhpcy5pMThuLmxvY2FsZSlcbiAgICAucGlwZShza2lwKDEpKVxuICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5sb2FkKCkpO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9jYWxlLWZhbGxiYWNrIG5vdGljZSAoYmlsaW5ndWFsLWd1aWRhbmNlKTogbm9uLW51bGwgT05MWSB3aGVuXG4gICAqIHRoZSBzZXJ2ZXIgc2VydmVkIHRoaXMgcG9zdCBpbiBhIGxhbmd1YWdlIE9USEVSIHRoYW4gdGhlIHJlYWRlcidzXG4gICAqICh0aGUgYGxvY2FsZUZhbGxiYWNrYCBmbGFnIOKAlCB0aGUgcG9zdCBoYXMgbm8gdHJhbnNsYXRpb24gaW4gdGhlXG4gICAqIHJlYWRlcidzIGxhbmd1YWdlKS4gVGhlIGJsb2NrIHRoZW4gc2F5cyBwbGFpbmx5IHdoaWNoIGxhbmd1YWdlIGlzXG4gICAqIGJlaW5nIHNob3duIGFuZCB0aGF0IHRoZSByZWFkZXIncyBpcyBub3QgYXZhaWxhYmxlOyB3aGVuIGBhbHRlcm5hdGVzYFxuICAgKiBhY3R1YWxseSBjYXJyaWVzIHRoZSByZWFkZXIncyBsb2NhbGUgaXQgb2ZmZXJzIGEgTElOSyB0byB0aGF0XG4gICAqIHZlcnNpb24gKHRoZSByZWFkZXIncyBjaG9pY2Ug4oCUIHRoZSBVUkwgaXMgbmV2ZXIgc3dpdGNoZWQgc2lsZW50bHkpLlxuICAgKiBOb3RoaW5nIGV4dHJhIGFwcGVhcnMgd2hlbiBhIHRyYW5zbGF0aW9uIGV4aXN0cyBpbiB0aGUgcmVhZGVyJ3NcbiAgICogbGFuZ3VhZ2UgKHRoZSBmbGFnIGlzIGZhbHNlIHRoZW4pLiBBIHBsYWluIG1ldGhvZCAocmUtZXZhbHVhdGVkIG9uXG4gICAqIGVhY2ggQ0QgcGFzcyDigJQgYHBvc3QoKWAgYW5kIHRoZSBsb2NhbGUgc2lnbmFsIGFyZSB0aGUgaW5wdXRzKS5cbiAgICovXG4gIHByb3RlY3RlZCBmYWxsYmFja05vdGljZSgpOiB7IHNlcnZlZDogc3RyaW5nOyByZWFkZXI6IHN0cmluZzsgYWx0ZXJuYXRlU2x1Zzogc3RyaW5nIHwgbnVsbCB9IHwgbnVsbCB7XG4gICAgY29uc3QgcCA9IHRoaXMucG9zdCgpO1xuICAgIGlmIChwID09PSBudWxsIHx8ICFwLmxvY2FsZUZhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVhZGVyID0gdGhpcy5pMThuLmxvY2FsZSgpO1xuICAgIGNvbnN0IGFsdGVybmF0ZXMgPSBwLmFsdGVybmF0ZXMgPz8ge307XG4gICAgY29uc3QgYWx0ZXJuYXRlU2x1ZyA9IGFsdGVybmF0ZXNbcmVhZGVyXTtcbiAgICByZXR1cm4geyBzZXJ2ZWQ6IHAubG9jYWxlLCByZWFkZXIsIGFsdGVybmF0ZVNsdWc6IGFsdGVybmF0ZVNsdWcgPz8gbnVsbCB9O1xuICB9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgLy8gUmUtcmVhZCB0aGUgOnNsdWcgb24gRVZFUlkgbmF2aWdhdGlvbiB0byB0aGlzIHJvdXRlIOKAlCBiYWNrL2ZvcndhcmRcbiAgICAvLyBiZXR3ZWVuIHR3byBwb3N0cyAoL2Jsb2cvYSAtPiAvYmxvZy9iKSBtdXN0IHN3YXAgdGhlIGRhdGEsIG5vdCBrZWVwXG4gICAgLy8gdGhlIG9sZCBwb3N0LiBwYXJhbU1hcCByZXBsYXlzIHRoZSBjdXJyZW50IHBhcmFtcyBvbiBzdWJzY3JpYmUgYW5kXG4gICAgLy8gY29tcGxldGVzIHdoZW4gdGhlIHJvdXRlIGRlYWN0aXZhdGVzLCBzbyB0aGUgc3Vic2NyaXB0aW9uIG5lZWRzIG5vXG4gICAgLy8gbWFudWFsIHRlYXJkb3duLlxuICAgIHRoaXMucm91dGUucGFyYW1NYXAuc3Vic2NyaWJlKChwYXJhbXMpID0+IHRoaXMucmVhZFNsdWcocGFyYW1zLmdldCgnc2x1ZycpKSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2FsZVN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLyoqIEFkb3B0IHRoZSA6c2x1ZyBwYXJhbSAoYW4gZW1wdHkgc2x1ZyBpcyBub3QtZm91bmQsIG1pcnJvcmluZyB0aGVcbiAgICAgIHNoZWx0ZXItZGV0YWlsJ3MgaW52YWxpZC1pZCBoYW5kbGluZykuICovXG4gIHByaXZhdGUgcmVhZFNsdWcocmF3OiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKHJhdyA9PT0gbnVsbCB8fCByYXcubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLm5vdEZvdW5kLnNldCh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHJhdyA9PT0gdGhpcy5zbHVnKCkpIHtcbiAgICAgIHJldHVybjsgLy8gdGhlIHNhbWUgcG9zdCDigJQgbm90aGluZyBjaGFuZ2VkXG4gICAgfVxuICAgIC8vIEEgZGlmZmVyZW50IHBvc3Q6IGRyb3AgdGhlIHByZXZpb3VzIHN0YXRlIGJlZm9yZSB0aGUgbmV3IGxvYWRcbiAgICAvLyByZXNvbHZlcyAodGhlIGZldGNoU2VxIGd1YXJkIGRyb3BzIHRoZSBzdXBlcnNlZGVkIHJlc3BvbnNlKS5cbiAgICB0aGlzLnNsdWcuc2V0KHJhdyk7XG4gICAgdGhpcy5ub3RGb3VuZC5zZXQoZmFsc2UpO1xuICAgIHRoaXMucG9zdC5zZXQobnVsbCk7XG4gICAgdGhpcy5sb2FkKCk7XG4gIH1cblxuICAvKiogRmV0Y2ggdGhlIHBvc3QgYnkgc2x1Zy4gNDA0ICh1bmtub3duIHNsdWcsIGEgZHJhZnQgc2x1Zywgb3IgYSBwb3N0XG4gICAgICBpbiBBTk9USEVSIGxvY2FsZSkgLT4gbm90LWZvdW5kIHN0YXRlOyBhbnkgb3RoZXIgZmFpbHVyZSAtPiBlcnJvclxuICAgICAgYmFubmVyIHdpdGggdGhlIHBhZ2UgY2hyb21lIGludGFjdCAoc2hhcmVkIGNvbnZlbnRpb24pLiAqL1xuICBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHNsdWcgPSB0aGlzLnNsdWcoKTtcbiAgICBpZiAoc2x1ZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBjb25zdCBzZXEgPSArK3RoaXMuZmV0Y2hTZXE7XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgLy8gQSBmcmVzaCBmZXRjaCBtYXkgUkVTT0xWRSBhIHByZXZpb3VzbHktNDA0J2Qgc2x1ZyAoYSBsYW5ndWFnZVxuICAgIC8vIHN3aXRjaCBpbnRvIHRoZSBwb3N0J3Mgb3duIGxhbmd1YWdlKSwgc28gdGhlIG5vdC1mb3VuZCBzdGF0ZSBpc1xuICAgIC8vIGRyb3BwZWQgd2l0aCB0aGUgb3RoZXIgc3RhbGUgc3RhdGU7IHRoZSA0MDQgaGFuZGxlciByZS1zZXRzIGl0XG4gICAgLy8gd2hlbiB0aGUgcG9zdCBpcyBzdGlsbCBub3QgaW4gdGhpcyBsYW5ndWFnZS5cbiAgICB0aGlzLm5vdEZvdW5kLnNldChmYWxzZSk7XG4gICAgLy8gVGhlIHByZXZpb3VzIHBvc3QncyBmYWlsZWQtaGVybyBzdGF0ZSBuZXZlciBjYXJyaWVzIG92ZXIgdG8gYSBuZXdcbiAgICAvLyBzbHVnICh0aGUgbG9hZCBtYXkgbGFuZCBhIGRpZmZlcmVudCBwb3N0LCB3aXRoIG9yIHdpdGhvdXQgYSBoZXJvKS5cbiAgICB0aGlzLmhlcm9GYWlsZWQuc2V0KGZhbHNlKTtcbiAgICB0aGlzLmxvYWRpbmcuc2V0KHRydWUpO1xuICAgIHJldHVybiB0aGlzLmdhdGV3YXkuZ2V0QnlTbHVnKHNsdWcpLnRoZW4oXG4gICAgICAodmFsdWUpID0+IHtcbiAgICAgICAgaWYgKHNlcSAhPT0gdGhpcy5mZXRjaFNlcSkge1xuICAgICAgICAgIHJldHVybjsgLy8gdGhlIHJvdXRlIGRlYWN0aXZhdGVkIG9yIGEgbmV3ZXIgc2x1ZyBzdXBlcnNlZGVkIHRoaXNcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBvc3Quc2V0KHZhbHVlKTtcbiAgICAgICAgdGhpcy5sb2FkaW5nLnNldChmYWxzZSk7XG4gICAgICB9LFxuICAgICAgKGZhaWx1cmU6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKHNlcSAhPT0gdGhpcy5mZXRjaFNlcSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvYWRpbmcuc2V0KGZhbHNlKTtcbiAgICAgICAgaWYgKGZhaWx1cmUgaW5zdGFuY2VvZiBBcGlFcnJvciAmJiBmYWlsdXJlLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgICAgLy8gVW5rbm93biBzbHVnIE9SIGRyYWZ0IHNsdWcg4oCUIHRoZSBTQU1FIG5vdC1mb3VuZCBieSBkZXNpZ24uXG4gICAgICAgICAgdGhpcy5wb3N0LnNldChudWxsKTtcbiAgICAgICAgICB0aGlzLm5vdEZvdW5kLnNldCh0cnVlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvci5zZXQoYmFubmVyTWVzc2FnZShmYWlsdXJlLCAnc2hlbHRlcicsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuIiwiQGlmIChub3RGb3VuZCgpKSB7XG4gIDxzZWN0aW9uIGNsYXNzPVwiZ3VpZGFuY2UtZGV0YWlsIGd1aWRhbmNlLWRldGFpbC0tbm90LWZvdW5kXCI+XG4gICAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICdndWlkYW5jZS5ub3RGb3VuZFRpdGxlJyB8IHQgfX08L2gxPlxuICAgIDxwIGNsYXNzPVwicGFnZS1zdWJ0aXRsZVwiPnt7ICdndWlkYW5jZS5ub3RGb3VuZEJvZHknIHwgdCB9fTwvcD5cbiAgICA8YSByb3V0ZXJMaW5rPVwiL2Jsb2dcIiBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIj57eyAnZ3VpZGFuY2UuYmFja1RvTGlzdCcgfCB0IH19PC9hPlxuICA8L3NlY3Rpb24+XG59IEBlbHNlIHtcbiAgPHNlY3Rpb24gY2xhc3M9XCJndWlkYW5jZS1kZXRhaWxcIj5cbiAgICA8YSByb3V0ZXJMaW5rPVwiL2Jsb2dcIiBjbGFzcz1cImJhY2stbGlua1wiPiZsYXJyOyB7eyAnZ3VpZGFuY2UuYmFja1RvTGlzdCcgfCB0IH19PC9hPlxuXG4gICAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJlcnJvclwiIFttZXNzYWdlXT1cImVycm9yKClcIiAvPlxuXG4gICAgQGlmIChsb2FkaW5nKCkpIHtcbiAgICAgIDxhcHAtbG9hZGluZy1pbmRpY2F0b3IgY2xhc3M9XCJndWlkYW5jZS1zdGF0ZVwiIFttZXNzYWdlXT1cIidndWlkYW5jZS5sb2FkaW5nRGV0YWlsJyB8IHRcIiAvPlxuICAgIH0gQGVsc2UgaWYgKHBvc3QoKTsgYXMgcCkge1xuICAgICAgPCEtLSBUaGUgaGVybyBpbWFnZSAoY3Jpc2lzLWd1aWRhbmNlIEQxKTogdGhlIGluZGV4IGNhcmQncyB2aXN1YWxcbiAgICAgICAgICAgbGFuZ3VhZ2UgYXQgYXJ0aWNsZSBzY2FsZSDigJQgZnVsbCB3aWR0aCBpbiBhIGZpeGVkIDQvM1xuICAgICAgICAgICBhc3BlY3QtcmF0aW8gYm94IChvYmplY3QtZml0OiBjb3ZlciwgbWF0Y2hpbmcgd2lkdGgvaGVpZ2h0XG4gICAgICAgICAgIGF0dHJpYnV0ZXMsIHNvIHRoZSB0aXRsZSBuZXZlciBzaGlmdHMgd2hpbGUgdGhlIGltYWdlIGxvYWRzKS5cbiAgICAgICAgICAgTk8tSEVSTyBSVUxFOiBubyBoZXJvIFVSTCByZW5kZXJzIE5PIGVsZW1lbnQgYXQgYWxsIOKAlCBub1xuICAgICAgICAgICBicm9rZW4gaW1hZ2UsIG5vIGVtcHR5IGZyYW1lLCBubyBsYXlvdXQgc2hpZnQuIEEgNDA0J2QgLyBcbiAgICAgICAgICAgdW5yZWFjaGFibGUgc3RvcmVkIFVSTCB0YWtlcyB0aGUgaW5kZXgncyBuZXV0cmFsIHBsYWNlaG9sZGVyXG4gICAgICAgICAgIGJveCAoYSBicm9rZW4taW1hZ2UgaWNvbiBpcyBuZXZlciB0aGUgZmVlZGJhY2spLiBUaGUgaGVybyBpc1xuICAgICAgICAgICB0aGUgYXJ0aWNsZSdzIGZpcnN0IGNvbnRlbnQgKGFib3ZlIHRoZSBmb2xkKSwgc28gaXQgbG9hZHNcbiAgICAgICAgICAgZWFnZXIgd2l0aCBhIGhpZ2ggZmV0Y2ggcHJpb3JpdHkg4oCUIHRoZSBpbmRleCBjYXJkcywgYmVsb3cgdGhlXG4gICAgICAgICAgIGZvbGQsIHVzZSBsYXp5IGluc3RlYWQuIC0tPlxuICAgICAgQGlmIChwLmhlcm9JbWFnZVVybDsgYXMgaGVyb1VybCkge1xuICAgICAgICBAaWYgKGhlcm9GYWlsZWQoKSkge1xuICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZ3VpZGFuY2UtZGV0YWlsX19oZXJvIGd1aWRhbmNlLWRldGFpbF9faGVyby0tZmFpbGVkXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICA8IS0tIEFsdDogdGhlIHN0b3JlZCBoZXJvIGFsdCAodGhlIGFkbWluIHNldHMgaXQ7IG1hbmRhdG9yeVxuICAgICAgICAgICAgICAgd2hlbmV2ZXIgYSBoZXJvIGV4aXN0cykuIEEgbnVsbCBhbHQgd2l0aCBhIHByZXNlbnQgVVJMID1cbiAgICAgICAgICAgICAgIGRlY29yYXRpdmUgZW1wdHkgYWx0IOKAlCBuZXZlciB0aGUgcG9zdCB0aXRsZS4gLS0+XG4gICAgICAgICAgPGltZ1xuICAgICAgICAgICAgY2xhc3M9XCJndWlkYW5jZS1kZXRhaWxfX2hlcm9cIlxuICAgICAgICAgICAgW3NyY109XCJoZXJvVXJsXCJcbiAgICAgICAgICAgIFthbHRdPVwicC5oZXJvSW1hZ2VBbHQgPz8gJydcIlxuICAgICAgICAgICAgd2lkdGg9XCI3MDRcIlxuICAgICAgICAgICAgaGVpZ2h0PVwiNTI4XCJcbiAgICAgICAgICAgIGZldGNocHJpb3JpdHk9XCJoaWdoXCJcbiAgICAgICAgICAgIGRlY29kaW5nPVwiYXN5bmNcIlxuICAgICAgICAgICAgKGVycm9yKT1cIm9uSGVyb0ltYWdlRXJyb3IoJGV2ZW50KVwiXG4gICAgICAgICAgLz5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgPGhlYWRlciBjbGFzcz1cImd1aWRhbmNlLWRldGFpbF9faGVhZGVyXCI+XG4gICAgICAgIDxoMSBjbGFzcz1cInBhZ2UtdGl0bGVcIj57eyBwLnRpdGxlIH19PC9oMT5cbiAgICAgICAgPHAgY2xhc3M9XCJndWlkYW5jZS1kZXRhaWxfX2RhdGVcIj5cbiAgICAgICAgICB7eyAnZ3VpZGFuY2UucHVibGlzaGVkJyB8IHQgfX1cbiAgICAgICAgICB7eyBwLnB1Ymxpc2hlZEF0IHwgZGF0ZTogJ21lZGl1bScgOiB1bmRlZmluZWQgOiBpMThuLmxvY2FsZSgpIH19XG4gICAgICAgIDwvcD5cbiAgICAgIDwvaGVhZGVyPlxuICAgICAgPCEtLSBMb2NhbGUtZmFsbGJhY2sgbm90aWNlIChiaWxpbmd1YWwtZ3VpZGFuY2UpOiB0aGUgcG9zdCBoYXMgTk9cbiAgICAgICAgICAgdHJhbnNsYXRpb24gaW4gdGhlIHJlYWRlcidzIGxhbmd1YWdlIOKAlCB0aGUgc2VydmVyIHNlcnZlZCB0aGVcbiAgICAgICAgICAgZGVmYXVsdC1sb2NhbGUgY29weSB3aXRoIHRoZSBmbGFnIChhIDIwMCwgbmV2ZXIgYSA0MDQpLiBUaGVcbiAgICAgICAgICAgbm90ZSBzYXlzIHBsYWlubHkgd2hpY2ggbGFuZ3VhZ2UgaXMgc2hvd24gYW5kIHRoYXQgdGhlXG4gICAgICAgICAgIHJlYWRlcidzIGxhbmd1YWdlIGlzIG5vdCBhdmFpbGFibGU7IGl0IG9mZmVycyB0aGVcbiAgICAgICAgICAgcmVhZGVyJ3MtbGFuZ3VhZ2UgdmVyc2lvbiBhcyBhIExJTksgd2hlbiBgYWx0ZXJuYXRlc2AgY2Fycmllc1xuICAgICAgICAgICB0aGF0IGxvY2FsZSAodGhlIHJlYWRlcidzIGNob2ljZSDigJQgdGhlIFVSTCBpcyBuZXZlciBzd2l0Y2hlZFxuICAgICAgICAgICBzaWxlbnRseSkuIFdoZW4gYSB0cmFuc2xhdGlvbiBleGlzdHMgaW4gdGhlIHJlYWRlcidzIGxhbmd1YWdlXG4gICAgICAgICAgIHRoZSBmbGFnIGlzIGZhbHNlIGFuZCBub3RoaW5nIGV4dHJhIGFwcGVhcnMuIC0tPlxuICAgICAgQGlmIChmYWxsYmFja05vdGljZSgpOyBhcyBmYikge1xuICAgICAgICA8cCBjbGFzcz1cImd1aWRhbmNlLWRldGFpbF9fZmFsbGJhY2tcIiByb2xlPVwibm90ZVwiPlxuICAgICAgICAgIHt7ICdndWlkYW5jZS5sb2NhbGVGYWxsYmFjaycgfCB0OiB7IGxvY2FsZTogZmIuc2VydmVkLCByZWFkZXI6IGZiLnJlYWRlciB9IH19XG4gICAgICAgICAgQGlmIChmYi5hbHRlcm5hdGVTbHVnOyBhcyBhbHRTbHVnKSB7XG4gICAgICAgICAgICA8YSBjbGFzcz1cImd1aWRhbmNlLWRldGFpbF9fZmFsbGJhY2stbGlua1wiIHJvdXRlckxpbms9XCIvYmxvZy97eyBhbHRTbHVnIH19XCI+e3tcbiAgICAgICAgICAgICAgJ2d1aWRhbmNlLmxvY2FsZUZhbGxiYWNrLmFsdGVybmF0ZScgfCB0OiB7IGxvY2FsZTogZmIucmVhZGVyIH1cbiAgICAgICAgICAgIH19PC9hPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9wPlxuICAgICAgfVxuICAgICAgPCEtLSBCb3VuZCB0aHJvdWdoIEFuZ3VsYXIncyBzYW5pdGl6ZXIgYXMgd2VsbCBhcyB0aGUgc2VydmVyJ3MgYWxsb3dsaXN0LFxuICAgICAgICAgICBzbyB0aGlzIHNpdGUgY2FuIG5ldmVyIGludHJvZHVjZSBhIGJ5cGFzcy4gLS0+XG4gICAgICA8YXJ0aWNsZSBjbGFzcz1cImd1aWRhbmNlLWRldGFpbF9fYm9keVwiIFtpbm5lckhUTUxdPVwicC5ib2R5SHRtbCA/PyAnJ1wiPjwvYXJ0aWNsZT5cbiAgICB9XG4gIDwvc2VjdGlvbj5cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBUyx5QkFB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QUFBLGNBQUEsR0FBQSxDQUFBLGNBQUEsU0FBQSxHQUFBLFdBQUEsR0FBQSxDQUFBLFlBQUEsU0FBQSxHQUFBLFNBQUEsR0FBQSxDQUFBLEdBQUEsa0JBQUEsR0FBQSxTQUFBLEdBQUEsQ0FBQSxHQUFBLHlCQUFBLEdBQUEsQ0FBQSxHQUFBLHVCQUFBLEdBQUEsQ0FBQSxRQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLENBQUEsR0FBQSx5QkFBQSxHQUFBLFdBQUEsR0FBQSxDQUFBLGVBQUEsUUFBQSxHQUFBLHlCQUFBLCtCQUFBLEdBQUEsQ0FBQSxTQUFBLE9BQUEsVUFBQSxPQUFBLGlCQUFBLFFBQUEsWUFBQSxTQUFBLEdBQUEseUJBQUEsR0FBQSxPQUFBLEtBQUEsR0FBQSxDQUFBLFNBQUEsT0FBQSxVQUFBLE9BQUEsaUJBQUEsUUFBQSxZQUFBLFNBQUEsR0FBQSx5QkFBQSxHQUFBLFNBQUEsT0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLGtDQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsVUFBQSxTQUFBLDRCQUFBLElBQUEsS0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFBO0FDN0MvQixNQUFBLGlDQUFBLEdBQUEsMkNBQUEsSUFBQSxHQUFBLFdBQUEsQ0FBQSxFQUFrQixHQUFBLDJDQUFBLEdBQUEsR0FBQSxXQUFBLENBQUE7OztBQUFsQixNQUFBLDJCQUFBLElBQUEsU0FBQSxJQUFBLElBQUEsQ0FBQTs7b0JEd0NzQixZQUFZLGlCQUFpQixrQkFBdkMsVUFBeUQsYUFBYSxHQUFBLFFBQUEsQ0FBQSw4MkVBQUEsRUFBQSxDQUFBOzs7K0VBS3JFLG9CQUFrQixDQUFBO1VBUDlCO3VCQUNXLDRCQUEwQixTQUMzQixDQUFDLFVBQVUsWUFBWSxpQkFBaUIsa0JBQWtCLGFBQWEsR0FBQyxpQkFHaEUsd0JBQXdCLFFBQU0sVUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FBQSxRQUFBLENBQUEsNDJEQUFBLEVBQUEsQ0FBQTs7OztnRkFFcEMsb0JBQWtCLEVBQUEsV0FBQSxzQkFBQSxVQUFBLHFEQUFBLFlBQUEsR0FBQSxDQUFBO0FBQUEsR0FBQTs7Ozs7Ozs4REFBbEIsb0JBQWtCLEVBQUEsU0FBQSxDQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsaUJBQUEsa0JBQUEsVUFBQSxlQUFBLFdBQUEsdUJBQUEsR0FBQSxhQUFBLEVBQUEsQ0FBQTtFQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxjQUFBLDJCQUFBLEtBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxlQUFBLFlBQUEsT0FBQSxZQUFBLElBQUEsR0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE1BQUEsMkJBQUEsRUFBQSxTQUFBLENBQUE7QUFBQSxHQUFBOyIsIm5hbWVzIjpbXSwiZGVidWdJZCI6IjEzNzRjMjllLWQyMWUtNWRlNy1iNjQzLWUyNjU5NzA4NzA5YyJ9