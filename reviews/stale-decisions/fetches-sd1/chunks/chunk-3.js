import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-65LR5ARB.js");import {
  safeReturnUrl
} from "/chunk-RVLWDZXM.js";
import {
  AuthStore
} from "/chunk-QATQGZY5.js";
import {
  ResendCountdown
} from "/chunk-PVMWPZKN.js";
import {
  CODE_SIX_DIGITS
} from "/chunk-SWSUI7DQ.js";
import "/chunk-T7PPW65J.js";
import {
  ApiClient,
  ApiError,
  BannerComponent,
  bannerMessage,
  toApiError
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/account/verify-page.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject as inject2, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { FormControl, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { ActivatedRoute, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";

// src/app/gateways/verify-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var VerifyGateway = class _VerifyGateway {
  api = inject(ApiClient);
  /** POST /verify/request {level} -> 202 + the resend-cooldown ack. Sends a code via the level's channel. */
  request(level) {
    const body = { level };
    return lastValueFrom(this.api.post("/verify/request", body));
  }
  /** POST /verify/confirm {level, code} -> 200. Claims the level on success. */
  confirm(level, code) {
    const body = { level, code };
    return lastValueFrom(this.api.post("/verify/confirm", body));
  }
  static \u0275fac = function VerifyGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VerifyGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _VerifyGateway, factory: _VerifyGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(VerifyGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/features/account/verify-page.ts
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c0 = (a0, a1) => [a0, a1];
var _c1 = (a0) => ({ destination: a0 });
var _c2 = (a0) => ({ time: a0 });
var _forTrack0 = ($index, $item) => $item.level;
function VerifyPage_For_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 10);
    i02.\u0275\u0275text(1, "\u2713");
    i02.\u0275\u0275elementEnd();
  }
}
function VerifyPage_For_10_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "li", 9);
    i02.\u0275\u0275conditionalCreate(1, VerifyPage_For_10_Conditional_1_Template, 2, 0, "span", 10);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r1 = ctx.$implicit;
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275classProp("level-chip--done", ctx_r1.auth.levels().includes(c_r1.level));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.auth.levels().includes(c_r1.level) ? 1 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate2(" ", ctx_r1.auth.levels().includes(c_r1.level) ? i02.\u0275\u0275pipeBind1(3, 5, "verify.verified") : i02.\u0275\u0275pipeBind1(4, 7, "verify.notVerified"), " \xB7 ", ctx_r1.nounText(c_r1), " ");
  }
}
function VerifyPage_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-banner", 5);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    const n_r3 = ctx;
    i02.\u0275\u0275property("severity", n_r3.severity)("message", i02.\u0275\u0275pipeBind2(1, 2, n_r3.key, n_r3.params));
  }
}
function VerifyPage_For_14_Conditional_8_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 17);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275nextContext(2);
    const ch_r5 = i02.\u0275\u0275readContextLet(0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, ch_r5.codeHintKey));
  }
}
function VerifyPage_For_14_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 14)(1, "label", 15);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 16);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(6, VerifyPage_For_14_Conditional_8_Conditional_6_Template, 3, 3, "p", 17);
    i02.\u0275\u0275elementStart(7, "p", 18);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(10, "div", 19)(11, "button", 20);
    i02.\u0275\u0275listener("click", function VerifyPage_For_14_Conditional_8_Template_button_click_11_listener() {
      i02.\u0275\u0275restoreView(_r4);
      const level_r6 = i02.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.confirm(level_r6));
    });
    i02.\u0275\u0275text(12);
    i02.\u0275\u0275pipe(13, "t");
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(15, "button", 21);
    i02.\u0275\u0275listener("click", function VerifyPage_For_14_Conditional_8_Template_button_click_15_listener() {
      i02.\u0275\u0275restoreView(_r4);
      const level_r6 = i02.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.request(level_r6));
    });
    i02.\u0275\u0275text(16);
    i02.\u0275\u0275pipe(17, "t");
    i02.\u0275\u0275pipe(18, "t");
    i02.\u0275\u0275pipe(19, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const level_r6 = i02.\u0275\u0275nextContext().$implicit;
    const ch_r5 = i02.\u0275\u0275readContextLet(0);
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("for", ctx_r1.codeId(level_r6));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 13, ch_r5.codeLabelKey));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("id", ctx_r1.codeId(level_r6))("formControl", ctx_r1.codes[level_r6])("placeholder", i02.\u0275\u0275pipeBind1(5, 15, ch_r5.placeholderKey));
    i02.\u0275\u0275attribute("inputmode", level_r6 === "PHONE" ? "numeric" : "text")("autocapitalize", level_r6 === "EMAIL" ? "characters" : "none");
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.codes[level_r6].touched && ctx_r1.codes[level_r6].invalid ? 6 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 17, ch_r5.sentHintKey));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r1.confirming() !== null || ctx_r1.sending() !== null);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.confirming() === level_r6 ? i02.\u0275\u0275pipeBind1(13, 19, "verify.verifying") : i02.\u0275\u0275pipeBind1(14, 21, "verify.verify"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r1.confirming() !== null || ctx_r1.sending() !== null || ctx_r1.countdowns[level_r6].active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.sending() === level_r6 ? i02.\u0275\u0275pipeBind1(17, 23, "account.sending") : ctx_r1.countdowns[level_r6].active ? i02.\u0275\u0275pipeBind2(18, 25, "account.resendIn", i02.\u0275\u0275pureFunction1(30, _c2, ctx_r1.countdowns[level_r6].label())) : i02.\u0275\u0275pipeBind1(19, 28, "account.resendCode"), " ");
  }
}
function VerifyPage_For_14_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 20);
    i02.\u0275\u0275listener("click", function VerifyPage_For_14_Conditional_9_Template_button_click_0_listener() {
      i02.\u0275\u0275restoreView(_r7);
      const level_r6 = i02.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.request(level_r6));
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const level_r6 = i02.\u0275\u0275nextContext().$implicit;
    const ch_r5 = i02.\u0275\u0275readContextLet(0);
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275property("disabled", ctx_r1.sending() !== null || ctx_r1.confirming() !== null || ctx_r1.countdowns[level_r6].active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.sending() === level_r6 ? i02.\u0275\u0275pipeBind1(2, 2, "account.sending") : ctx_r1.countdowns[level_r6].active ? i02.\u0275\u0275pipeBind2(3, 4, "account.sendIn", i02.\u0275\u0275pureFunction1(9, _c2, ctx_r1.countdowns[level_r6].label())) : i02.\u0275\u0275pipeBind1(4, 7, ch_r5.sendKey), " ");
  }
}
function VerifyPage_For_14_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275declareLet(0);
    i02.\u0275\u0275elementStart(1, "section", 7)(2, "h2", 11);
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(5, "p", 12);
    i02.\u0275\u0275text(6);
    i02.\u0275\u0275pipe(7, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(8, VerifyPage_For_14_Conditional_8_Template, 20, 32)(9, VerifyPage_For_14_Conditional_9_Template, 5, 11, "button", 13);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const level_r6 = ctx.$implicit;
    const ctx_r1 = i02.\u0275\u0275nextContext();
    const ch_r8 = i02.\u0275\u0275storeLet(ctx_r1.channel(level_r6));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(4, 4, ch_r8.titleKey));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind2(7, 6, "verify.intro", i02.\u0275\u0275pureFunction1(9, _c1, ctx_r1.destinationText(ch_r8))));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.phases[level_r6]() === "code" ? 8 : 9);
  }
}
function VerifyPage_Conditional_15_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "a", 22);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275property("routerLink", ctx_r1.returnUrl);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 2, "verify.continue"));
  }
}
function VerifyPage_Conditional_15_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "a", 23);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "verify.manageAccount"));
  }
}
function VerifyPage_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "section", 8)(1, "h2", 11);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "p", 12);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "div", 19);
    i02.\u0275\u0275conditionalCreate(8, VerifyPage_Conditional_15_Conditional_8_Template, 3, 4, "a", 22)(9, VerifyPage_Conditional_15_Conditional_9_Template, 3, 3, "a", 23);
    i02.\u0275\u0275elementStart(10, "a", 24);
    i02.\u0275\u0275text(11);
    i02.\u0275\u0275pipe(12, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 4, "verify.fullyVerified"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 6, "verify.fullyVerifiedCopy"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275conditional(ctx_r1.returnUrl ? 8 : 9);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(12, 8, "verify.backToMap"));
  }
}
function VerifyPage_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "section", 8)(1, "p", 12);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "div", 19)(5, "a", 22);
    i02.\u0275\u0275text(6);
    i02.\u0275\u0275pipe(7, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "verify.verifiedCopy"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("routerLink", ctx_r1.returnUrl);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(7, 5, "verify.continue"));
  }
}
var EMAIL_CODE_LENGTH = 8;
var EMAIL_CODE_PATTERN = new RegExp(`^[A-Za-z0-9]{${EMAIL_CODE_LENGTH}}$`);
var CHANNELS = [
  {
    level: "EMAIL",
    nounKey: "verify.email.noun",
    destinationKey: "verify.email.destination",
    titleKey: "verify.email.title",
    sendKey: "verify.email.send",
    sentHintKey: "verify.email.sentHint",
    codeLabelKey: "verify.email.codeLabel",
    codeHintKey: "verify.email.codeHint",
    placeholderKey: "verify.email.placeholder"
  },
  {
    level: "PHONE",
    nounKey: "verify.phone.noun",
    destinationKey: "verify.phone.destination",
    titleKey: "verify.phone.title",
    sendKey: "verify.phone.send",
    sentHintKey: "verify.phone.sentHint",
    codeLabelKey: "verify.phone.codeLabel",
    codeHintKey: "verify.phone.codeHint",
    placeholderKey: "verify.phone.placeholder"
  }
];
var CODE_PATTERNS = {
  EMAIL: EMAIL_CODE_PATTERN,
  PHONE: CODE_SIX_DIGITS
};
var VerifyPage = class _VerifyPage {
  store = inject2(AuthStore);
  verify = inject2(VerifyGateway);
  route = inject2(ActivatedRoute);
  /** i18n-et-en: the page copy is fully catalog-driven; a switcher change
   *  re-renders the cards (labels + the re-derived banners). The
   *  verification state itself is NOT locale-scoped — no re-fetch. */
  i18n = inject2(I18nService);
  cdr = inject2(ChangeDetectorRef);
  /** The language switcher sets I18nService.locale: re-derive the stored
   *  banners and re-render every | t label. toObservable emits the CURRENT
   *  value on subscribe, so skip(1) — only a real switch triggers it (the
   *  guidance-page idiom). Unsubscribed in ngOnDestroy. */
  localeSub = toObservable(this.i18n.locale).pipe(skip(1)).subscribe(() => this.cdr.markForCheck());
  auth = this.store;
  /**
   * Where to send the user once they are verified — set by
   * {@link verifiedGuard} (and the submit/report prompts) as
   * {@code /verify?returnUrl=…}. The verify page preserves it just as the
   * login page does, so a user who verifies from a shelter detail or /submit
   * lands back there instead of having to navigate manually. Null (no param /
   * unsafe value) keeps the default post-verify actions.
   */
  returnUrl = (() => {
    const raw = this.route.snapshot.queryParamMap.get("returnUrl");
    return raw !== null && safeReturnUrl(raw) === raw ? raw : null;
  })();
  /** Panels still open — a level drops off once AuthStore knows it is verified. */
  offered = computed(
    () => CHANNELS.map((c) => c.level).filter((level) => !this.store.levels().includes(level)),
    ...ngDevMode ? [{ debugName: "offered" }] : (
      /* istanbul ignore next */
      []
    )
  );
  allVerified = computed(
    () => this.offered().length === 0,
    ...ngDevMode ? [{ debugName: "allVerified" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Per-channel flow phase: idle (send button) vs code (input + verify/resend). */
  phases = {
    EMAIL: signal("idle"),
    PHONE: signal("idle")
  };
  /**
   * One countdown PER CHANNEL — the e-mail and phone cooldowns are
   * independent (a sent code does not consume the other channel's wait).
   */
  countdowns = {
    EMAIL: new ResendCountdown(),
    PHONE: new ResendCountdown()
  };
  ngOnDestroy() {
    this.countdowns.EMAIL.stop();
    this.countdowns.PHONE.stop();
    this.localeSub.unsubscribe();
  }
  /** Per-channel code inputs (public so specs can drive them — page convention). */
  codes = {
    EMAIL: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_PATTERNS.EMAIL)]
    }),
    PHONE: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_PATTERNS.PHONE)]
    })
  };
  /** Which channel has an in-flight request/confirm (disables both buttons). */
  sending = signal(
    null,
    ...ngDevMode ? [{ debugName: "sending" }] : (
      /* istanbul ignore next */
      []
    )
  );
  confirming = signal(
    null,
    ...ngDevMode ? [{ debugName: "confirming" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The RAW error (non-null -> banner; the "verify" copy is in the
   *  catalog — re-derived through the active locale at render time). */
  error = signal(
    null,
    ...ngDevMode ? [{ debugName: "error" }] : (
      /* istanbul ignore next */
      []
    )
  );
  notice = signal(
    null,
    ...ngDevMode ? [{ debugName: "notice" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The error banner text, re-derived through the active locale. */
  errorMessage() {
    const error = this.error();
    return error === null ? null : bannerMessage(error, "verify", (key) => this.i18n.t(key));
  }
  /** The channel's translated noun (for the {noun} params + the chips). */
  nounText(ch) {
    return this.i18n.t(ch.nounKey);
  }
  /** The channel's translated destination (for the {destination} param). */
  destinationText(ch) {
    return this.i18n.t(ch.destinationKey);
  }
  channel(level) {
    return CHANNELS.find((c) => c.level === level);
  }
  /** Stable DOM id for a level's code input (used by its <label for>). */
  codeId(level) {
    return `verify-code-${level.toLowerCase()}`;
  }
  /**
   * POST /verify/request. 202 -> the panel moves to the code-entry phase.
   * 409 -> the level is already verified (no code sent, no throttle consumed):
   * re-fetch the profile so the store reflects the real claim, and inform —
   * never an error banner.
   */
  async request(level) {
    if (this.sending() !== null || this.confirming() !== null) {
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.sending.set(level);
    try {
      const ack = await this.verify.request(level);
      this.countdowns[level].start(ack.resendAvailableAfterSeconds ?? 60);
      this.phases[level].set("code");
    } catch (error) {
      const api = error instanceof ApiError ? error : toApiError(error);
      if (api.status === 409) {
        await this.store.refreshProfile();
        this.notice.set({
          severity: "info",
          key: "verify.alreadyVerified",
          params: { noun: this.nounText(this.channel(level)) }
        });
      } else {
        if (api.status === 429) {
          this.countdowns[level].start(api.retryAfterSeconds ?? 60);
        }
        this.error.set(error);
      }
    } finally {
      this.sending.set(null);
    }
  }
  /** POST /verify/confirm. On 200 the claim is persisted backend-side; the
   *  profile is re-fetched so the level appears verified and the panel
   *  disappears (no optimistic write — the fetched state is the truth). */
  async confirm(level) {
    if (this.sending() !== null || this.confirming() !== null) {
      return;
    }
    const code = this.codes[level];
    if (code.invalid) {
      code.markAsTouched();
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.confirming.set(level);
    try {
      await this.verify.confirm(level, code.value.trim());
      await this.store.refreshProfile();
      this.notice.set({
        severity: "success",
        key: "verify.verifiedNotice",
        params: { noun: this.nounText(this.channel(level)) }
      });
      code.reset();
    } catch (error) {
      this.error.set(error);
    } finally {
      this.confirming.set(null);
    }
  }
  static \u0275fac = function VerifyPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VerifyPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i02.\u0275\u0275defineComponent({ type: _VerifyPage, selectors: [["app-verify-page"]], decls: 17, vars: 15, consts: [[1, "account-card"], [1, "page-title"], [1, "page-subtitle"], [1, "level-chips"], [1, "level-chip", 3, "level-chip--done"], [3, "severity", "message"], ["severity", "error", 3, "message"], [1, "verify-panel"], [1, "verify-panel", "verify-panel--done"], [1, "level-chip"], ["aria-hidden", "true", 1, "level-chip__mark"], [1, "panel-title"], [1, "panel-copy"], ["type", "button", 1, "btn", "btn--primary", 3, "disabled"], [1, "field"], [3, "for"], ["type", "text", "autocomplete", "one-time-code", 3, "id", "formControl", "placeholder"], [1, "field-error"], [1, "field-note"], [1, "panel-actions"], ["type", "button", 1, "btn", "btn--primary", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn--ghost", 3, "click", "disabled"], [1, "btn", "btn--primary", 3, "routerLink"], ["routerLink", "/account", 1, "btn", "btn--primary"], ["routerLink", "/map", 1, "btn", "btn--ghost"]], template: function VerifyPage_Template(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 1);
      i02.\u0275\u0275text(2);
      i02.\u0275\u0275pipe(3, "t");
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275elementStart(4, "p", 2);
      i02.\u0275\u0275text(5);
      i02.\u0275\u0275pipe(6, "t");
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275elementStart(7, "ul", 3);
      i02.\u0275\u0275pipe(8, "t");
      i02.\u0275\u0275repeaterCreate(9, VerifyPage_For_10_Template, 5, 9, "li", 4, _forTrack0);
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275conditionalCreate(11, VerifyPage_Conditional_11_Template, 2, 5, "app-banner", 5);
      i02.\u0275\u0275element(12, "app-banner", 6);
      i02.\u0275\u0275repeaterCreate(13, VerifyPage_For_14_Template, 10, 11, "section", 7, i02.\u0275\u0275repeaterTrackByIdentity);
      i02.\u0275\u0275conditionalCreate(15, VerifyPage_Conditional_15_Template, 13, 10, "section", 8)(16, VerifyPage_Conditional_16_Template, 8, 7, "section", 8);
      i02.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_4_0;
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 6, "verify.title"));
      i02.\u0275\u0275advance(3);
      i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 8, "verify.subtitle"));
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind1(8, 10, "verify.aria"));
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275repeater(i02.\u0275\u0275pureFunction2(12, _c0, ctx.channel("EMAIL"), ctx.channel("PHONE")));
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275conditional((tmp_4_0 = ctx.notice()) ? 11 : -1, tmp_4_0);
      i02.\u0275\u0275advance();
      i02.\u0275\u0275property("message", ctx.errorMessage());
      i02.\u0275\u0275advance();
      i02.\u0275\u0275repeater(ctx.offered());
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275conditional(ctx.allVerified() ? 15 : ctx.auth.isVerified() && ctx.returnUrl ? 16 : -1);
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, BannerComponent, TranslatePipe], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.account-card[_ngcontent-%COMP%] {\n  max-width: 34rem;\n  margin: var(--%NS%space-16) auto 0;\n}\n.level-chips[_ngcontent-%COMP%] {\n  list-style: none;\n  display: flex;\n  gap: var(--%NS%space-10);\n  padding: 0;\n  margin: 0 0 var(--%NS%space-20);\n  flex-wrap: wrap;\n}\n.level-chip[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--%NS%space-6);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-full);\n  padding: var(--%NS%space-6) var(--%NS%space-12);\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.level-chip--done[_ngcontent-%COMP%] {\n  border-color: var(--%NS%color-success-border);\n  background: var(--%NS%color-success-bg);\n  color: var(--%NS%color-success);\n}\n.level-chip__mark[_ngcontent-%COMP%] {\n  font-weight: var(--%NS%font-weight-bold);\n}\n.verify-panel[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  padding: var(--%NS%space-18) var(--%NS%space-20);\n  margin-bottom: var(--%NS%space-16);\n  background: var(--%NS%color-bg-surface);\n}\n.panel-title[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-xl);\n  margin: 0 0 var(--%NS%space-6);\n}\n.panel-copy[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0 0 var(--%NS%space-16);\n  font-size: var(--%NS%text-base);\n}\n.panel-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-10);\n  flex-wrap: wrap;\n}\n.field-note[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: var(--%NS%space-6) 0 0;\n}\n.verify-panel--done[_ngcontent-%COMP%] {\n  border-color: var(--%NS%color-success-border);\n  background: var(--%NS%color-success-bg-soft);\n}\n/*# sourceMappingURL=verify-page.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(VerifyPage, [{
    type: Component,
    args: [{ selector: "app-verify-page", imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<section class="account-card">
  <h1 class="page-title">{{ 'verify.title' | t }}</h1>
  <p class="page-subtitle">{{ 'verify.subtitle' | t }}</p>

  <ul class="level-chips" [attr.aria-label]="'verify.aria' | t">
    @for (c of [channel('EMAIL'), channel('PHONE')]; track c.level) {
      <li class="level-chip" [class.level-chip--done]="auth.levels().includes(c.level)">
        @if (auth.levels().includes(c.level)) {
          <span class="level-chip__mark" aria-hidden="true">\u2713</span>
        }
        {{
          auth.levels().includes(c.level) ? ('verify.verified' | t) : ('verify.notVerified' | t)
        }}
        \xB7 {{ nounText(c) }}
      </li>
    }
  </ul>

  @if (notice(); as n) {
    <app-banner [severity]="n.severity" [message]="n.key | t: n.params" />
  }
  <app-banner severity="error" [message]="errorMessage()" />

  @for (level of offered(); track level) {
    @let ch = channel(level);
    <section class="verify-panel">
      <h2 class="panel-title">{{ ch.titleKey | t }}</h2>
      <p class="panel-copy">{{ 'verify.intro' | t: { destination: destinationText(ch) } }}</p>

      @if (phases[level]() === 'code') {
        <div class="field">
          <label [for]="codeId(level)">{{ ch.codeLabelKey | t }}</label>
          <input
            [id]="codeId(level)"
            type="text"
            [formControl]="codes[level]"
            autocomplete="one-time-code"
            [attr.inputmode]="level === 'PHONE' ? 'numeric' : 'text'"
            [attr.autocapitalize]="level === 'EMAIL' ? 'characters' : 'none'"
            [placeholder]="ch.placeholderKey | t"
          />
          @if (codes[level].touched && codes[level].invalid) {
            <p class="field-error">{{ ch.codeHintKey | t }}</p>
          }
          <p class="field-note">{{ ch.sentHintKey | t }}</p>
        </div>

        <div class="panel-actions">
          <button
            type="button"
            class="btn btn--primary"
            (click)="confirm(level)"
            [disabled]="confirming() !== null || sending() !== null"
          >
            {{ confirming() === level ? ('verify.verifying' | t) : ('verify.verify' | t) }}
          </button>
          <button
            type="button"
            class="btn btn--ghost"
            (click)="request(level)"
            [disabled]="confirming() !== null || sending() !== null || countdowns[level].active"
          >
            {{
              sending() === level
                ? ('account.sending' | t)
                : countdowns[level].active
                  ? ('account.resendIn' | t: { time: countdowns[level].label() })
                  : ('account.resendCode' | t)
            }}
          </button>
        </div>
      } @else {
        <button
          type="button"
          class="btn btn--primary"
          (click)="request(level)"
          [disabled]="sending() !== null || confirming() !== null || countdowns[level].active"
        >
          {{
            sending() === level
              ? ('account.sending' | t)
              : countdowns[level].active
                ? ('account.sendIn' | t: { time: countdowns[level].label() })
                : (ch.sendKey | t)
          }}
        </button>
      }
    </section>
  }

  @if (allVerified()) {
    <section class="verify-panel verify-panel--done">
      <h2 class="panel-title">{{ 'verify.fullyVerified' | t }}</h2>
      <p class="panel-copy">{{ 'verify.fullyVerifiedCopy' | t }}</p>
      <div class="panel-actions">
        @if (returnUrl) {
          <a [routerLink]="returnUrl" class="btn btn--primary">{{ 'verify.continue' | t }}</a>
        } @else {
          <a routerLink="/account" class="btn btn--primary">{{ 'verify.manageAccount' | t }}</a>
        }
        <a routerLink="/map" class="btn btn--ghost">{{ 'verify.backToMap' | t }}</a>
      </div>
    </section>
  } @else if (auth.isVerified() && returnUrl) {
    <!-- One claim is enough to submit/report (backend canWrite): a user
         redirected here by verifiedGuard (e.g. from /submit) can continue
         once any channel is verified instead of being forced to do both. -->
    <section class="verify-panel verify-panel--done">
      <p class="panel-copy">{{ 'verify.verifiedCopy' | t }}</p>
      <div class="panel-actions">
        <a [routerLink]="returnUrl" class="btn btn--primary">{{ 'verify.continue' | t }}</a>
      </div>
    </section>
  }
</section>
`, styles: ["/* src/app/features/account/verify-page.scss */\n:host {\n  display: block;\n}\n.account-card {\n  max-width: 34rem;\n  margin: var(--space-16) auto 0;\n}\n.level-chips {\n  list-style: none;\n  display: flex;\n  gap: var(--space-10);\n  padding: 0;\n  margin: 0 0 var(--space-20);\n  flex-wrap: wrap;\n}\n.level-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--space-6);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-full);\n  padding: var(--space-6) var(--space-12);\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.level-chip--done {\n  border-color: var(--color-success-border);\n  background: var(--color-success-bg);\n  color: var(--color-success);\n}\n.level-chip__mark {\n  font-weight: var(--font-weight-bold);\n}\n.verify-panel {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  padding: var(--space-18) var(--space-20);\n  margin-bottom: var(--space-16);\n  background: var(--color-bg-surface);\n}\n.panel-title {\n  font-size: var(--text-xl);\n  margin: 0 0 var(--space-6);\n}\n.panel-copy {\n  color: var(--color-muted);\n  margin: 0 0 var(--space-16);\n  font-size: var(--text-base);\n}\n.panel-actions {\n  display: flex;\n  gap: var(--space-10);\n  flex-wrap: wrap;\n}\n.field-note {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: var(--space-6) 0 0;\n}\n.verify-panel--done {\n  border-color: var(--color-success-border);\n  background: var(--color-success-bg-soft);\n}\n/*# sourceMappingURL=verify-page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassDebugInfo(VerifyPage, { className: "VerifyPage", filePath: "src/app/features/account/verify-page.ts", lineNumber: 120 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Faccount%2Fverify-page.ts%40VerifyPage";
  function VerifyPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i02.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i02.\u0275\u0275replaceMetadata(VerifyPage, m.default, [i02, i1], [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && VerifyPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && VerifyPage_HmrLoad(d.timestamp)));
})();
export {
  VerifyPage
};
//# debugId=ed443aff-b4c2-5024-85ce-421996cd7175


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvYWNjb3VudC92ZXJpZnktcGFnZS50cyIsInNyYy9hcHAvZmVhdHVyZXMvYWNjb3VudC92ZXJpZnktcGFnZS5odG1sIiwic3JjL2FwcC9nYXRld2F5cy92ZXJpZnktZ2F0ZXdheS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgY29tcHV0ZWQsXG4gIGluamVjdCxcbiAgT25EZXN0cm95LFxuICBzaWduYWwsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgdG9PYnNlcnZhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZS9yeGpzLWludGVyb3AnO1xuaW1wb3J0IHsgRm9ybUNvbnRyb2wsIFJlYWN0aXZlRm9ybXNNb2R1bGUsIFZhbGlkYXRvcnMgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyTGluayB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBza2lwIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBBcGlFcnJvciwgdG9BcGlFcnJvciB9IGZyb20gJy4uLy4uL2NvcmUvYXBpLWVycm9yJztcbmltcG9ydCB7IEkxOG5TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL2kxOG4uc2VydmljZSc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2VLZXkgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vbWVzc2FnZXMnO1xuaW1wb3J0IHsgVHJhbnNsYXRlUGlwZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi90cmFuc2xhdGUtcGlwZSc7XG5pbXBvcnQgeyBBdXRoU3RvcmUgfSBmcm9tICcuLi8uLi9zZXNzaW9uL2F1dGgtc3RvcmUnO1xuaW1wb3J0IHsgc2FmZVJldHVyblVybCB9IGZyb20gJy4uLy4uL2NvcmUvZ3VhcmRzJztcbmltcG9ydCB7IFZlcmlmeUdhdGV3YXkgfSBmcm9tICcuLi8uLi9nYXRld2F5cy92ZXJpZnktZ2F0ZXdheSc7XG5pbXBvcnQgeyBCYW5uZXJDb21wb25lbnQgfSBmcm9tICcuLi8uLi9zaGFyZWQvYmFubmVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBiYW5uZXJNZXNzYWdlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Vycm9yLWNvcHknO1xuaW1wb3J0IHsgQ09ERV9TSVhfRElHSVRTIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Zvcm0taGVscGVycyc7XG5pbXBvcnQgeyBSZXNlbmRDb3VudGRvd24gfSBmcm9tICcuLi8uLi9zaGFyZWQvcmVzZW5kLWNvdW50ZG93bic7XG5cbi8qKiBUaGUgdHdvIGNoYW5uZWxzIHRoaXMgcGFnZSBvZmZlcnMuIFNNQVJUX0lEIGlzIGRlbGliZXJhdGVseSBOT1Qgb2ZmZXJlZCDigJRcbiAqICB0aGUgYmFja2VuZCByZWplY3RzIGl0IHdpdGggNDAwIChzdHViIGluIHYxKSwgc2VlIDA0LUNPTlRFWFQgZGVjaXNpb24gMS4gKi9cbnR5cGUgVmVyaWZ5Q2hhbm5lbCA9ICdFTUFJTCcgfCAnUEhPTkUnO1xuXG4vKipcbiAqIEEgY2hhbm5lbCdzIFVJIGNvcHkgYXMgY2F0YWxvZyBLRVlTIChpMThuLWV0LWVuKTogdGhlIHRlbXBsYXRlIHJlbmRlcnNcbiAqIHRoZW0gdGhyb3VnaCBgfCB0YCwgc28gYSBsYW5ndWFnZSBzd2l0Y2ggcmUtcmVuZGVycyB0aGUgY2FyZHMgaW4gdGhlXG4gKiBuZXcgbGFuZ3VhZ2UuIFRoZSB2YWx1ZXMgbXVzdCBiZSB2YWxpZCBNZXNzYWdlcyBrZXlzLlxuICovXG5pbnRlcmZhY2UgQ2hhbm5lbE1ldGEge1xuICBsZXZlbDogVmVyaWZ5Q2hhbm5lbDtcbiAgLyoqIENoaXAgKyBiYW5uZXIgbm91biAoXCJlbWFpbFwiIC8gXCJwaG9uZVwiKS4gKi9cbiAgbm91bktleTogTWVzc2FnZUtleTtcbiAgLyoqIEh1bWFuIGRlc3RpbmF0aW9uLCBlLmcuIFwiZW1haWwgYWRkcmVzc1wiLiAqL1xuICBkZXN0aW5hdGlvbktleTogTWVzc2FnZUtleTtcbiAgdGl0bGVLZXk6IE1lc3NhZ2VLZXk7XG4gIHNlbmRLZXk6IE1lc3NhZ2VLZXk7XG4gIHNlbnRIaW50S2V5OiBNZXNzYWdlS2V5O1xuICBjb2RlTGFiZWxLZXk6IE1lc3NhZ2VLZXk7XG4gIGNvZGVIaW50S2V5OiBNZXNzYWdlS2V5O1xuICBwbGFjZWhvbGRlcktleTogTWVzc2FnZUtleTtcbn1cblxuLyoqIEEgbm90aWNlIGJhbm5lcjogdGhlIGNhdGFsb2cgS0VZICsgcGFyYW1zIChyZW5kZXJlZCB0aHJvdWdoIGB8IHRgLCBzbyBhXG4gKiAgbGFuZ3VhZ2Ugc3dpdGNoIHJlLXJlbmRlcnMgaXQpLiAqL1xuaW50ZXJmYWNlIENoYW5uZWxOb3RpY2Uge1xuICBzZXZlcml0eTogJ2luZm8nIHwgJ3N1Y2Nlc3MnO1xuICBrZXk6IE1lc3NhZ2VLZXk7XG4gIHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyPjtcbn1cblxuLyoqIENvZGVzIG1pcnJvciB0aGUgYmFja2VuZCBnZW5lcmF0b3JzICh2ZXJpZmllZCBhZ2FpbnN0IHRoZSBKYXZhKTogdGhlIEVNQUlMXG4gKiAgdG9rZW4gaXMgOCBjaGFycyBmcm9tIFtBLVphLXowLTldLCB0aGUgUEhPTkUgY29kZSBpcyBhIDYtZGlnaXQgT1RQLiBJbnB1dFxuICogIHBhdHRlcm5zIGFyZSBubyBzdHJpY3RlciB0aGFuIHRoZSBnZW5lcmF0b3I7IGNvbXBhcmlzb24gaXMgY2FzZS1zZW5zaXRpdmUsXG4gKiAgc28gaW5wdXQgaXMgbmV2ZXIgY2FzZS1mb2xkZWQg4oCUIG9ubHkgdHJpbW1lZC4gKi9cbi8qKiBNaXJyb3JzIHRoZSBiYWNrZW5kIEVtYWlsVmVyaWZpY2F0aW9uUHJvdmlkZXIgY29kZSBsZW5ndGgg4oCUIGRvIG5vdCBkcmlmdC4gKi9cbmNvbnN0IEVNQUlMX0NPREVfTEVOR1RIID0gODtcblxuY29uc3QgRU1BSUxfQ09ERV9QQVRURVJOID0gbmV3IFJlZ0V4cChgXltBLVphLXowLTldeyR7RU1BSUxfQ09ERV9MRU5HVEh9fSRgKTtcblxuY29uc3QgQ0hBTk5FTFM6IENoYW5uZWxNZXRhW10gPSBbXG4gIHtcbiAgICBsZXZlbDogJ0VNQUlMJyxcbiAgICBub3VuS2V5OiAndmVyaWZ5LmVtYWlsLm5vdW4nLFxuICAgIGRlc3RpbmF0aW9uS2V5OiAndmVyaWZ5LmVtYWlsLmRlc3RpbmF0aW9uJyxcbiAgICB0aXRsZUtleTogJ3ZlcmlmeS5lbWFpbC50aXRsZScsXG4gICAgc2VuZEtleTogJ3ZlcmlmeS5lbWFpbC5zZW5kJyxcbiAgICBzZW50SGludEtleTogJ3ZlcmlmeS5lbWFpbC5zZW50SGludCcsXG4gICAgY29kZUxhYmVsS2V5OiAndmVyaWZ5LmVtYWlsLmNvZGVMYWJlbCcsXG4gICAgY29kZUhpbnRLZXk6ICd2ZXJpZnkuZW1haWwuY29kZUhpbnQnLFxuICAgIHBsYWNlaG9sZGVyS2V5OiAndmVyaWZ5LmVtYWlsLnBsYWNlaG9sZGVyJyxcbiAgfSxcbiAge1xuICAgIGxldmVsOiAnUEhPTkUnLFxuICAgIG5vdW5LZXk6ICd2ZXJpZnkucGhvbmUubm91bicsXG4gICAgZGVzdGluYXRpb25LZXk6ICd2ZXJpZnkucGhvbmUuZGVzdGluYXRpb24nLFxuICAgIHRpdGxlS2V5OiAndmVyaWZ5LnBob25lLnRpdGxlJyxcbiAgICBzZW5kS2V5OiAndmVyaWZ5LnBob25lLnNlbmQnLFxuICAgIHNlbnRIaW50S2V5OiAndmVyaWZ5LnBob25lLnNlbnRIaW50JyxcbiAgICBjb2RlTGFiZWxLZXk6ICd2ZXJpZnkucGhvbmUuY29kZUxhYmVsJyxcbiAgICBjb2RlSGludEtleTogJ3ZlcmlmeS5waG9uZS5jb2RlSGludCcsXG4gICAgcGxhY2Vob2xkZXJLZXk6ICd2ZXJpZnkucGhvbmUucGxhY2Vob2xkZXInLFxuICB9LFxuXTtcblxuY29uc3QgQ09ERV9QQVRURVJOUzogUmVjb3JkPFZlcmlmeUNoYW5uZWwsIFJlZ0V4cD4gPSB7XG4gIEVNQUlMOiBFTUFJTF9DT0RFX1BBVFRFUk4sXG4gIFBIT05FOiBDT0RFX1NJWF9ESUdJVFMsXG59O1xuXG4vKipcbiAqIC92ZXJpZnkgKEF1dGhHdWFyZCkg4oCUIHByb3ZlIG93bmVyc2hpcCBvZiB0aGUgZW1haWwgYW5kIHBob25lIG9uIHRoZSBhY2NvdW50XG4gKiAoMDQtQ09OVEVYVC1BQ0NPVU5ULVZFUklGWS5tZCwgMDMgcHVtbCkuIFBlciBjaGFubmVsOiBcInNlbmQgY29kZVwiIC0+IFwiZW50ZXJcbiAqIGNvZGVcIiAtPiB2ZXJpZmllZC4gUmVhZHMgd2hpY2ggbGV2ZWxzIGFyZSBzdGlsbCBvcGVuIGZyb20gdGhlIFJFQUwgY2xhaW1cbiAqIHNldCBpbiBBdXRoU3RvcmUubGV2ZWxzKCkgKGZldGNoZWQgZnJvbSBHRVQgL2FjY291bnQvbWUpIGFuZCByZS1mZXRjaGVzIHRoZVxuICogcHJvZmlsZSBhZnRlciBhIGNvbmZpcm0gKDA0LUNPTlRFWFQgZGVjaXNpb24gMywgcmV2ZXJzZWQpLCBzbyB0aGUgbmV3bHlcbiAqIHZlcmlmaWVkIGNoYW5uZWwgZGlzYXBwZWFycyB3aXRob3V0IGFueSBvcHRpbWlzdGljIHdyaXRlLlxuICpcbiAqIEVycm9yIG1hcHBpbmc6IDQwOSBvbiByZXF1ZXN0IG1lYW5zIHRoZSBsZXZlbCBpcyBBTFJFQURZIHZlcmlmaWVkIOKAlCBubyBjb2RlXG4gKiB3YXMgc2VudCAoYmFja2VuZCBBbHJlYWR5VmVyaWZpZWRFeGNlcHRpb24pIOKAlCB0aGUgcHJvZmlsZSBpcyByZS1mZXRjaGVkXG4gKiAoZGVmZW5zaXZlIG5ldDogdGhlIHN0b3JlIGNhbiBiZSBzdGFsZSBhZnRlciBhIGZhaWxlZCBmZXRjaCkgYW5kIGFuXG4gKiBpbmZvcm1hdGlvbmFsIG5vdGljZSBpcyBzaG93bi4gNDI5IChjb29sZG93bi9kYWlseSBjYXApIGFuZCA0MDBcbiAqICh3cm9uZy9leHBpcmVkIGNvZGUpIHVzZSBnZW5lcmljIGNvcHk7IG5vIGF1dG8tcmV0cnkgYW55d2hlcmUuIEEgY29vbGRvd25cbiAqIDQyOSBhZGRpdGlvbmFsbHkgY2FycmllcyBSZXRyeS1BZnRlciDigJQgdGhlIHBlci1jaGFubmVsIGJ1dHRvbiBjb3VudGRvd25cbiAqIHJ1bnMgZnJvbSBpdCAoYW5kIGZyb20gdGhlIGFjayBib2R5IGFmdGVyIGEgc3VjY2Vzc2Z1bCBzZW5kKSwgc28gdGhlIHVzZXJcbiAqIHNlZXMgdGhlIHdhaXQgb24gdGhlIGJ1dHRvbiBpbnN0ZWFkIG9mIHNwYW0tY2xpY2tpbmcgaW50byBhIGJhcmUgNDI5LlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtdmVyaWZ5LXBhZ2UnLFxuICBpbXBvcnRzOiBbUmVhY3RpdmVGb3Jtc01vZHVsZSwgUm91dGVyTGluaywgQmFubmVyQ29tcG9uZW50LCBUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL3ZlcmlmeS1wYWdlLmh0bWwnLFxuICBzdHlsZVVybDogJy4vdmVyaWZ5LXBhZ2Uuc2NzcycsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxufSlcbmV4cG9ydCBjbGFzcyBWZXJpZnlQYWdlIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSByZWFkb25seSBzdG9yZSA9IGluamVjdChBdXRoU3RvcmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IHZlcmlmeSA9IGluamVjdChWZXJpZnlHYXRld2F5KTtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZSA9IGluamVjdChBY3RpdmF0ZWRSb3V0ZSk7XG4gIC8qKiBpMThuLWV0LWVuOiB0aGUgcGFnZSBjb3B5IGlzIGZ1bGx5IGNhdGFsb2ctZHJpdmVuOyBhIHN3aXRjaGVyIGNoYW5nZVxuICAgKiAgcmUtcmVuZGVycyB0aGUgY2FyZHMgKGxhYmVscyArIHRoZSByZS1kZXJpdmVkIGJhbm5lcnMpLiBUaGVcbiAgICogIHZlcmlmaWNhdGlvbiBzdGF0ZSBpdHNlbGYgaXMgTk9UIGxvY2FsZS1zY29wZWQg4oCUIG5vIHJlLWZldGNoLiAqL1xuICByZWFkb25seSBpMThuID0gaW5qZWN0KEkxOG5TZXJ2aWNlKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjZHIgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuXG4gIC8qKiBUaGUgbGFuZ3VhZ2Ugc3dpdGNoZXIgc2V0cyBJMThuU2VydmljZS5sb2NhbGU6IHJlLWRlcml2ZSB0aGUgc3RvcmVkXG4gICAqICBiYW5uZXJzIGFuZCByZS1yZW5kZXIgZXZlcnkgfCB0IGxhYmVsLiB0b09ic2VydmFibGUgZW1pdHMgdGhlIENVUlJFTlRcbiAgICogIHZhbHVlIG9uIHN1YnNjcmliZSwgc28gc2tpcCgxKSDigJQgb25seSBhIHJlYWwgc3dpdGNoIHRyaWdnZXJzIGl0ICh0aGVcbiAgICogIGd1aWRhbmNlLXBhZ2UgaWRpb20pLiBVbnN1YnNjcmliZWQgaW4gbmdPbkRlc3Ryb3kuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYWxlU3ViID0gdG9PYnNlcnZhYmxlKHRoaXMuaTE4bi5sb2NhbGUpXG4gICAgLnBpcGUoc2tpcCgxKSlcbiAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpKTtcblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYXV0aCA9IHRoaXMuc3RvcmU7XG5cbiAgLyoqXG4gICAqIFdoZXJlIHRvIHNlbmQgdGhlIHVzZXIgb25jZSB0aGV5IGFyZSB2ZXJpZmllZCDigJQgc2V0IGJ5XG4gICAqIHtAbGluayB2ZXJpZmllZEd1YXJkfSAoYW5kIHRoZSBzdWJtaXQvcmVwb3J0IHByb21wdHMpIGFzXG4gICAqIHtAY29kZSAvdmVyaWZ5P3JldHVyblVybD3igKZ9LiBUaGUgdmVyaWZ5IHBhZ2UgcHJlc2VydmVzIGl0IGp1c3QgYXMgdGhlXG4gICAqIGxvZ2luIHBhZ2UgZG9lcywgc28gYSB1c2VyIHdobyB2ZXJpZmllcyBmcm9tIGEgc2hlbHRlciBkZXRhaWwgb3IgL3N1Ym1pdFxuICAgKiBsYW5kcyBiYWNrIHRoZXJlIGluc3RlYWQgb2YgaGF2aW5nIHRvIG5hdmlnYXRlIG1hbnVhbGx5LiBOdWxsIChubyBwYXJhbSAvXG4gICAqIHVuc2FmZSB2YWx1ZSkga2VlcHMgdGhlIGRlZmF1bHQgcG9zdC12ZXJpZnkgYWN0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSByZXR1cm5VcmwgPSAoKCkgPT4ge1xuICAgIGNvbnN0IHJhdyA9IHRoaXMucm91dGUuc25hcHNob3QucXVlcnlQYXJhbU1hcC5nZXQoJ3JldHVyblVybCcpO1xuICAgIC8vIFJldXNlIHRoZSBjYW5vbmljYWwgZ3VhcmQgc2FuaXRpemVyIChjb3JlL2d1YXJkcykg4oCUXG4gICAgLy8gaXQgYWNjZXB0cyBzdHJpbmcgfCBudWxsIGFuZCByZXR1cm5zIHRoZSB2YWx1ZSBvbmx5IGZvciBhIHNhZmVcbiAgICAvLyBpbnRlcm5hbCBhYnNvbHV0ZSBwYXRoLCBzbyB0aGUgaWRlbnRpdHkgY2hlY2sgSVMgdGhlIHNhZmV0eSB0ZXN0LlxuICAgIC8vIEFuIGFic2VudCAob3IgdW5zYWZlKSBwYXJhbSBzdGF5cyBudWxsOiB0aGUgcGFnZSBrZWVwcyBpdHMgZGVmYXVsdFxuICAgIC8vIHBvc3QtdmVyaWZ5IGFjdGlvbnMgaW5zdGVhZCBvZiBsaW5raW5nIHNvbWV3aGVyZS5cbiAgICByZXR1cm4gcmF3ICE9PSBudWxsICYmIHNhZmVSZXR1cm5VcmwocmF3KSA9PT0gcmF3ID8gcmF3IDogbnVsbDtcbiAgfSkoKTtcblxuICAvKiogUGFuZWxzIHN0aWxsIG9wZW4g4oCUIGEgbGV2ZWwgZHJvcHMgb2ZmIG9uY2UgQXV0aFN0b3JlIGtub3dzIGl0IGlzIHZlcmlmaWVkLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgb2ZmZXJlZCA9IGNvbXB1dGVkPFZlcmlmeUNoYW5uZWxbXT4oKCkgPT5cbiAgICBDSEFOTkVMUy5tYXAoKGMpID0+IGMubGV2ZWwpLmZpbHRlcigobGV2ZWwpID0+ICF0aGlzLnN0b3JlLmxldmVscygpLmluY2x1ZGVzKGxldmVsKSksXG4gICk7XG5cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbFZlcmlmaWVkID0gY29tcHV0ZWQoKCkgPT4gdGhpcy5vZmZlcmVkKCkubGVuZ3RoID09PSAwKTtcblxuICAvKiogUGVyLWNoYW5uZWwgZmxvdyBwaGFzZTogaWRsZSAoc2VuZCBidXR0b24pIHZzIGNvZGUgKGlucHV0ICsgdmVyaWZ5L3Jlc2VuZCkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBwaGFzZXM6IFJlY29yZDxWZXJpZnlDaGFubmVsLCBSZXR1cm5UeXBlPHR5cGVvZiBzaWduYWw8J2lkbGUnIHwgJ2NvZGUnPj4+ID0ge1xuICAgIEVNQUlMOiBzaWduYWw8J2lkbGUnIHwgJ2NvZGUnPignaWRsZScpLFxuICAgIFBIT05FOiBzaWduYWw8J2lkbGUnIHwgJ2NvZGUnPignaWRsZScpLFxuICB9O1xuXG4gIC8qKlxuICAgKiBPbmUgY291bnRkb3duIFBFUiBDSEFOTkVMIOKAlCB0aGUgZS1tYWlsIGFuZCBwaG9uZSBjb29sZG93bnMgYXJlXG4gICAqIGluZGVwZW5kZW50IChhIHNlbnQgY29kZSBkb2VzIG5vdCBjb25zdW1lIHRoZSBvdGhlciBjaGFubmVsJ3Mgd2FpdCkuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY291bnRkb3duczogUmVjb3JkPFZlcmlmeUNoYW5uZWwsIFJlc2VuZENvdW50ZG93bj4gPSB7XG4gICAgRU1BSUw6IG5ldyBSZXNlbmRDb3VudGRvd24oKSxcbiAgICBQSE9ORTogbmV3IFJlc2VuZENvdW50ZG93bigpLFxuICB9O1xuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuY291bnRkb3ducy5FTUFJTC5zdG9wKCk7XG4gICAgdGhpcy5jb3VudGRvd25zLlBIT05FLnN0b3AoKTtcbiAgICB0aGlzLmxvY2FsZVN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLyoqIFBlci1jaGFubmVsIGNvZGUgaW5wdXRzIChwdWJsaWMgc28gc3BlY3MgY2FuIGRyaXZlIHRoZW0g4oCUIHBhZ2UgY29udmVudGlvbikuICovXG4gIHJlYWRvbmx5IGNvZGVzOiBSZWNvcmQ8VmVyaWZ5Q2hhbm5lbCwgRm9ybUNvbnRyb2w8c3RyaW5nPj4gPSB7XG4gICAgRU1BSUw6IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgICB2YWxpZGF0b3JzOiBbVmFsaWRhdG9ycy5yZXF1aXJlZCwgVmFsaWRhdG9ycy5wYXR0ZXJuKENPREVfUEFUVEVSTlMuRU1BSUwpXSxcbiAgICB9KSxcbiAgICBQSE9ORTogbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkLCBWYWxpZGF0b3JzLnBhdHRlcm4oQ09ERV9QQVRURVJOUy5QSE9ORSldLFxuICAgIH0pLFxuICB9O1xuXG4gIC8qKiBXaGljaCBjaGFubmVsIGhhcyBhbiBpbi1mbGlnaHQgcmVxdWVzdC9jb25maXJtIChkaXNhYmxlcyBib3RoIGJ1dHRvbnMpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2VuZGluZyA9IHNpZ25hbDxWZXJpZnlDaGFubmVsIHwgbnVsbD4obnVsbCk7XG4gIHByb3RlY3RlZCByZWFkb25seSBjb25maXJtaW5nID0gc2lnbmFsPFZlcmlmeUNoYW5uZWwgfCBudWxsPihudWxsKTtcblxuICAvKiogVGhlIFJBVyBlcnJvciAobm9uLW51bGwgLT4gYmFubmVyOyB0aGUgXCJ2ZXJpZnlcIiBjb3B5IGlzIGluIHRoZVxuICAgKiAgY2F0YWxvZyDigJQgcmUtZGVyaXZlZCB0aHJvdWdoIHRoZSBhY3RpdmUgbG9jYWxlIGF0IHJlbmRlciB0aW1lKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPHVua25vd24gfCBudWxsPihudWxsKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG5vdGljZSA9IHNpZ25hbDxDaGFubmVsTm90aWNlIHwgbnVsbD4obnVsbCk7XG5cbiAgLyoqIFRoZSBlcnJvciBiYW5uZXIgdGV4dCwgcmUtZGVyaXZlZCB0aHJvdWdoIHRoZSBhY3RpdmUgbG9jYWxlLiAqL1xuICBwcm90ZWN0ZWQgZXJyb3JNZXNzYWdlKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGVycm9yID0gdGhpcy5lcnJvcigpO1xuICAgIHJldHVybiBlcnJvciA9PT0gbnVsbCA/IG51bGwgOiBiYW5uZXJNZXNzYWdlKGVycm9yLCAndmVyaWZ5JywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSk7XG4gIH1cblxuICAvKiogVGhlIGNoYW5uZWwncyB0cmFuc2xhdGVkIG5vdW4gKGZvciB0aGUge25vdW59IHBhcmFtcyArIHRoZSBjaGlwcykuICovXG4gIHByb3RlY3RlZCBub3VuVGV4dChjaDogQ2hhbm5lbE1ldGEpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmkxOG4udChjaC5ub3VuS2V5KTtcbiAgfVxuXG4gIC8qKiBUaGUgY2hhbm5lbCdzIHRyYW5zbGF0ZWQgZGVzdGluYXRpb24gKGZvciB0aGUge2Rlc3RpbmF0aW9ufSBwYXJhbSkuICovXG4gIHByb3RlY3RlZCBkZXN0aW5hdGlvblRleHQoY2g6IENoYW5uZWxNZXRhKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5pMThuLnQoY2guZGVzdGluYXRpb25LZXkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNoYW5uZWwobGV2ZWw6IFZlcmlmeUNoYW5uZWwpOiBDaGFubmVsTWV0YSB7XG4gICAgcmV0dXJuIENIQU5ORUxTLmZpbmQoKGMpID0+IGMubGV2ZWwgPT09IGxldmVsKSBhcyBDaGFubmVsTWV0YTtcbiAgfVxuXG4gIC8qKiBTdGFibGUgRE9NIGlkIGZvciBhIGxldmVsJ3MgY29kZSBpbnB1dCAodXNlZCBieSBpdHMgPGxhYmVsIGZvcj4pLiAqL1xuICBwcm90ZWN0ZWQgY29kZUlkKGxldmVsOiBWZXJpZnlDaGFubmVsKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYHZlcmlmeS1jb2RlLSR7bGV2ZWwudG9Mb3dlckNhc2UoKX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIFBPU1QgL3ZlcmlmeS9yZXF1ZXN0LiAyMDIgLT4gdGhlIHBhbmVsIG1vdmVzIHRvIHRoZSBjb2RlLWVudHJ5IHBoYXNlLlxuICAgKiA0MDkgLT4gdGhlIGxldmVsIGlzIGFscmVhZHkgdmVyaWZpZWQgKG5vIGNvZGUgc2VudCwgbm8gdGhyb3R0bGUgY29uc3VtZWQpOlxuICAgKiByZS1mZXRjaCB0aGUgcHJvZmlsZSBzbyB0aGUgc3RvcmUgcmVmbGVjdHMgdGhlIHJlYWwgY2xhaW0sIGFuZCBpbmZvcm0g4oCUXG4gICAqIG5ldmVyIGFuIGVycm9yIGJhbm5lci5cbiAgICovXG4gIGFzeW5jIHJlcXVlc3QobGV2ZWw6IFZlcmlmeUNoYW5uZWwpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5zZW5kaW5nKCkgIT09IG51bGwgfHwgdGhpcy5jb25maXJtaW5nKCkgIT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5ub3RpY2Uuc2V0KG51bGwpO1xuICAgIHRoaXMuc2VuZGluZy5zZXQobGV2ZWwpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCB0aGlzLnZlcmlmeS5yZXF1ZXN0KGxldmVsKTtcbiAgICAgIHRoaXMuY291bnRkb3duc1tsZXZlbF0uc3RhcnQoYWNrLnJlc2VuZEF2YWlsYWJsZUFmdGVyU2Vjb25kcyA/PyA2MCk7XG4gICAgICB0aGlzLnBoYXNlc1tsZXZlbF0uc2V0KCdjb2RlJyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGFwaSA9IGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IgPyBlcnJvciA6IHRvQXBpRXJyb3IoZXJyb3IpO1xuICAgICAgaWYgKGFwaS5zdGF0dXMgPT09IDQwOSkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3JlLnJlZnJlc2hQcm9maWxlKCk7XG4gICAgICAgIHRoaXMubm90aWNlLnNldCh7XG4gICAgICAgICAgc2V2ZXJpdHk6ICdpbmZvJyxcbiAgICAgICAgICBrZXk6ICd2ZXJpZnkuYWxyZWFkeVZlcmlmaWVkJyxcbiAgICAgICAgICBwYXJhbXM6IHsgbm91bjogdGhpcy5ub3VuVGV4dCh0aGlzLmNoYW5uZWwobGV2ZWwpKSB9LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgY29vbGRvd24gNDI5IGNhcnJpZXMgUmV0cnktQWZ0ZXIg4oCUIHJ1biB0aGUgcGVyLWNoYW5uZWxcbiAgICAgICAgLy8gY291bnRkb3duIGZyb20gaXQgKHRoZSBiYW5uZXIga2VlcHMgaXRzIGdlbmVyaWMgY29weSkuXG4gICAgICAgIGlmIChhcGkuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgICAgICB0aGlzLmNvdW50ZG93bnNbbGV2ZWxdLnN0YXJ0KGFwaS5yZXRyeUFmdGVyU2Vjb25kcyA/PyA2MCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvci5zZXQoZXJyb3IpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnNlbmRpbmcuc2V0KG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBQT1NUIC92ZXJpZnkvY29uZmlybS4gT24gMjAwIHRoZSBjbGFpbSBpcyBwZXJzaXN0ZWQgYmFja2VuZC1zaWRlOyB0aGVcbiAgICogIHByb2ZpbGUgaXMgcmUtZmV0Y2hlZCBzbyB0aGUgbGV2ZWwgYXBwZWFycyB2ZXJpZmllZCBhbmQgdGhlIHBhbmVsXG4gICAqICBkaXNhcHBlYXJzIChubyBvcHRpbWlzdGljIHdyaXRlIOKAlCB0aGUgZmV0Y2hlZCBzdGF0ZSBpcyB0aGUgdHJ1dGgpLiAqL1xuICBhc3luYyBjb25maXJtKGxldmVsOiBWZXJpZnlDaGFubmVsKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuc2VuZGluZygpICE9PSBudWxsIHx8IHRoaXMuY29uZmlybWluZygpICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNvZGUgPSB0aGlzLmNvZGVzW2xldmVsXTtcbiAgICBpZiAoY29kZS5pbnZhbGlkKSB7XG4gICAgICBjb2RlLm1hcmtBc1RvdWNoZWQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5ub3RpY2Uuc2V0KG51bGwpO1xuICAgIHRoaXMuY29uZmlybWluZy5zZXQobGV2ZWwpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnZlcmlmeS5jb25maXJtKGxldmVsLCBjb2RlLnZhbHVlLnRyaW0oKSk7XG4gICAgICBhd2FpdCB0aGlzLnN0b3JlLnJlZnJlc2hQcm9maWxlKCk7XG4gICAgICB0aGlzLm5vdGljZS5zZXQoe1xuICAgICAgICBzZXZlcml0eTogJ3N1Y2Nlc3MnLFxuICAgICAgICBrZXk6ICd2ZXJpZnkudmVyaWZpZWROb3RpY2UnLFxuICAgICAgICBwYXJhbXM6IHsgbm91bjogdGhpcy5ub3VuVGV4dCh0aGlzLmNoYW5uZWwobGV2ZWwpKSB9LFxuICAgICAgfSk7XG4gICAgICBjb2RlLnJlc2V0KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGVycm9yKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5jb25maXJtaW5nLnNldChudWxsKTtcbiAgICB9XG4gIH1cbn1cbiIsIjxzZWN0aW9uIGNsYXNzPVwiYWNjb3VudC1jYXJkXCI+XG4gIDxoMSBjbGFzcz1cInBhZ2UtdGl0bGVcIj57eyAndmVyaWZ5LnRpdGxlJyB8IHQgfX08L2gxPlxuICA8cCBjbGFzcz1cInBhZ2Utc3VidGl0bGVcIj57eyAndmVyaWZ5LnN1YnRpdGxlJyB8IHQgfX08L3A+XG5cbiAgPHVsIGNsYXNzPVwibGV2ZWwtY2hpcHNcIiBbYXR0ci5hcmlhLWxhYmVsXT1cIid2ZXJpZnkuYXJpYScgfCB0XCI+XG4gICAgQGZvciAoYyBvZiBbY2hhbm5lbCgnRU1BSUwnKSwgY2hhbm5lbCgnUEhPTkUnKV07IHRyYWNrIGMubGV2ZWwpIHtcbiAgICAgIDxsaSBjbGFzcz1cImxldmVsLWNoaXBcIiBbY2xhc3MubGV2ZWwtY2hpcC0tZG9uZV09XCJhdXRoLmxldmVscygpLmluY2x1ZGVzKGMubGV2ZWwpXCI+XG4gICAgICAgIEBpZiAoYXV0aC5sZXZlbHMoKS5pbmNsdWRlcyhjLmxldmVsKSkge1xuICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGV2ZWwtY2hpcF9fbWFya1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKckzwvc3Bhbj5cbiAgICAgICAgfVxuICAgICAgICB7e1xuICAgICAgICAgIGF1dGgubGV2ZWxzKCkuaW5jbHVkZXMoYy5sZXZlbCkgPyAoJ3ZlcmlmeS52ZXJpZmllZCcgfCB0KSA6ICgndmVyaWZ5Lm5vdFZlcmlmaWVkJyB8IHQpXG4gICAgICAgIH19XG4gICAgICAgIMK3IHt7IG5vdW5UZXh0KGMpIH19XG4gICAgICA8L2xpPlxuICAgIH1cbiAgPC91bD5cblxuICBAaWYgKG5vdGljZSgpOyBhcyBuKSB7XG4gICAgPGFwcC1iYW5uZXIgW3NldmVyaXR5XT1cIm4uc2V2ZXJpdHlcIiBbbWVzc2FnZV09XCJuLmtleSB8IHQ6IG4ucGFyYW1zXCIgLz5cbiAgfVxuICA8YXBwLWJhbm5lciBzZXZlcml0eT1cImVycm9yXCIgW21lc3NhZ2VdPVwiZXJyb3JNZXNzYWdlKClcIiAvPlxuXG4gIEBmb3IgKGxldmVsIG9mIG9mZmVyZWQoKTsgdHJhY2sgbGV2ZWwpIHtcbiAgICBAbGV0IGNoID0gY2hhbm5lbChsZXZlbCk7XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJ2ZXJpZnktcGFuZWxcIj5cbiAgICAgIDxoMiBjbGFzcz1cInBhbmVsLXRpdGxlXCI+e3sgY2gudGl0bGVLZXkgfCB0IH19PC9oMj5cbiAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPnt7ICd2ZXJpZnkuaW50cm8nIHwgdDogeyBkZXN0aW5hdGlvbjogZGVzdGluYXRpb25UZXh0KGNoKSB9IH19PC9wPlxuXG4gICAgICBAaWYgKHBoYXNlc1tsZXZlbF0oKSA9PT0gJ2NvZGUnKSB7XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgIDxsYWJlbCBbZm9yXT1cImNvZGVJZChsZXZlbClcIj57eyBjaC5jb2RlTGFiZWxLZXkgfCB0IH19PC9sYWJlbD5cbiAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgIFtpZF09XCJjb2RlSWQobGV2ZWwpXCJcbiAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJjb2Rlc1tsZXZlbF1cIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwib25lLXRpbWUtY29kZVwiXG4gICAgICAgICAgICBbYXR0ci5pbnB1dG1vZGVdPVwibGV2ZWwgPT09ICdQSE9ORScgPyAnbnVtZXJpYycgOiAndGV4dCdcIlxuICAgICAgICAgICAgW2F0dHIuYXV0b2NhcGl0YWxpemVdPVwibGV2ZWwgPT09ICdFTUFJTCcgPyAnY2hhcmFjdGVycycgOiAnbm9uZSdcIlxuICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cImNoLnBsYWNlaG9sZGVyS2V5IHwgdFwiXG4gICAgICAgICAgLz5cbiAgICAgICAgICBAaWYgKGNvZGVzW2xldmVsXS50b3VjaGVkICYmIGNvZGVzW2xldmVsXS5pbnZhbGlkKSB7XG4gICAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCI+e3sgY2guY29kZUhpbnRLZXkgfCB0IH19PC9wPlxuICAgICAgICAgIH1cbiAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLW5vdGVcIj57eyBjaC5zZW50SGludEtleSB8IHQgfX08L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJwYW5lbC1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIlxuICAgICAgICAgICAgKGNsaWNrKT1cImNvbmZpcm0obGV2ZWwpXCJcbiAgICAgICAgICAgIFtkaXNhYmxlZF09XCJjb25maXJtaW5nKCkgIT09IG51bGwgfHwgc2VuZGluZygpICE9PSBudWxsXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICB7eyBjb25maXJtaW5nKCkgPT09IGxldmVsID8gKCd2ZXJpZnkudmVyaWZ5aW5nJyB8IHQpIDogKCd2ZXJpZnkudmVyaWZ5JyB8IHQpIH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgICAgIChjbGljayk9XCJyZXF1ZXN0KGxldmVsKVwiXG4gICAgICAgICAgICBbZGlzYWJsZWRdPVwiY29uZmlybWluZygpICE9PSBudWxsIHx8IHNlbmRpbmcoKSAhPT0gbnVsbCB8fCBjb3VudGRvd25zW2xldmVsXS5hY3RpdmVcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt7XG4gICAgICAgICAgICAgIHNlbmRpbmcoKSA9PT0gbGV2ZWxcbiAgICAgICAgICAgICAgICA/ICgnYWNjb3VudC5zZW5kaW5nJyB8IHQpXG4gICAgICAgICAgICAgICAgOiBjb3VudGRvd25zW2xldmVsXS5hY3RpdmVcbiAgICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnJlc2VuZEluJyB8IHQ6IHsgdGltZTogY291bnRkb3duc1tsZXZlbF0ubGFiZWwoKSB9KVxuICAgICAgICAgICAgICAgICAgOiAoJ2FjY291bnQucmVzZW5kQ29kZScgfCB0KVxuICAgICAgICAgICAgfX1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICB9IEBlbHNlIHtcbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiXG4gICAgICAgICAgKGNsaWNrKT1cInJlcXVlc3QobGV2ZWwpXCJcbiAgICAgICAgICBbZGlzYWJsZWRdPVwic2VuZGluZygpICE9PSBudWxsIHx8IGNvbmZpcm1pbmcoKSAhPT0gbnVsbCB8fCBjb3VudGRvd25zW2xldmVsXS5hY3RpdmVcIlxuICAgICAgICA+XG4gICAgICAgICAge3tcbiAgICAgICAgICAgIHNlbmRpbmcoKSA9PT0gbGV2ZWxcbiAgICAgICAgICAgICAgPyAoJ2FjY291bnQuc2VuZGluZycgfCB0KVxuICAgICAgICAgICAgICA6IGNvdW50ZG93bnNbbGV2ZWxdLmFjdGl2ZVxuICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnNlbmRJbicgfCB0OiB7IHRpbWU6IGNvdW50ZG93bnNbbGV2ZWxdLmxhYmVsKCkgfSlcbiAgICAgICAgICAgICAgICA6IChjaC5zZW5kS2V5IHwgdClcbiAgICAgICAgICB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIH1cbiAgICA8L3NlY3Rpb24+XG4gIH1cblxuICBAaWYgKGFsbFZlcmlmaWVkKCkpIHtcbiAgICA8c2VjdGlvbiBjbGFzcz1cInZlcmlmeS1wYW5lbCB2ZXJpZnktcGFuZWwtLWRvbmVcIj5cbiAgICAgIDxoMiBjbGFzcz1cInBhbmVsLXRpdGxlXCI+e3sgJ3ZlcmlmeS5mdWxseVZlcmlmaWVkJyB8IHQgfX08L2gyPlxuICAgICAgPHAgY2xhc3M9XCJwYW5lbC1jb3B5XCI+e3sgJ3ZlcmlmeS5mdWxseVZlcmlmaWVkQ29weScgfCB0IH19PC9wPlxuICAgICAgPGRpdiBjbGFzcz1cInBhbmVsLWFjdGlvbnNcIj5cbiAgICAgICAgQGlmIChyZXR1cm5VcmwpIHtcbiAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJyZXR1cm5VcmxcIiBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIj57eyAndmVyaWZ5LmNvbnRpbnVlJyB8IHQgfX08L2E+XG4gICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgIDxhIHJvdXRlckxpbms9XCIvYWNjb3VudFwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiPnt7ICd2ZXJpZnkubWFuYWdlQWNjb3VudCcgfCB0IH19PC9hPlxuICAgICAgICB9XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvbWFwXCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiPnt7ICd2ZXJpZnkuYmFja1RvTWFwJyB8IHQgfX08L2E+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gIH0gQGVsc2UgaWYgKGF1dGguaXNWZXJpZmllZCgpICYmIHJldHVyblVybCkge1xuICAgIDwhLS0gT25lIGNsYWltIGlzIGVub3VnaCB0byBzdWJtaXQvcmVwb3J0IChiYWNrZW5kIGNhbldyaXRlKTogYSB1c2VyXG4gICAgICAgICByZWRpcmVjdGVkIGhlcmUgYnkgdmVyaWZpZWRHdWFyZCAoZS5nLiBmcm9tIC9zdWJtaXQpIGNhbiBjb250aW51ZVxuICAgICAgICAgb25jZSBhbnkgY2hhbm5lbCBpcyB2ZXJpZmllZCBpbnN0ZWFkIG9mIGJlaW5nIGZvcmNlZCB0byBkbyBib3RoLiAtLT5cbiAgICA8c2VjdGlvbiBjbGFzcz1cInZlcmlmeS1wYW5lbCB2ZXJpZnktcGFuZWwtLWRvbmVcIj5cbiAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPnt7ICd2ZXJpZnkudmVyaWZpZWRDb3B5JyB8IHQgfX08L3A+XG4gICAgICA8ZGl2IGNsYXNzPVwicGFuZWwtYWN0aW9uc1wiPlxuICAgICAgICA8YSBbcm91dGVyTGlua109XCJyZXR1cm5VcmxcIiBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIj57eyAndmVyaWZ5LmNvbnRpbnVlJyB8IHQgfX08L2E+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gIH1cbjwvc2VjdGlvbj5cbiIsImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHsgUmVzZW5kQWNrIH0gZnJvbSAnLi4vc2hhcmVkL3Jlc2VuZC1jb3VudGRvd24nO1xuaW1wb3J0IHR5cGUgeyBWZXJpZnlDb25maXJtUmVxdWVzdCwgVmVyaWZ5UmVxdWVzdCwgVmVyaWZpY2F0aW9uTGV2ZWwgfSBmcm9tICcuLi9jb3JlL21vZGVscyc7XG5cbi8qKlxuICogVGhlIGRvb3IgdG8gdGhlIC92ZXJpZnkgY29udHJvbGxlciBncm91cCAoMDEgcHVtbCArIDA0LUNPTlRFWFQtQUNDT1VOVC1WRVJJRlkubWQpLlxuICogQm90aCBjYWxscyByZXF1aXJlIGEgdmFsaWQgSldUIOKAlCB0aGUgYXBpSW50ZXJjZXB0b3IgYWRkcyB0aGUgQmVhcmVyIHRva2VuLlxuICpcbiAqICAtIHJlcXVlc3QobGV2ZWwpICAtPiAyMDIgKyBSZXNlbmRBY2sgfCA0MDkgYWxyZWFkeSB2ZXJpZmllZCB8IDQyOSBjb29sZG93bi9jYXBcbiAqICAtIGNvbmZpcm0obGV2ZWwpICAtPiAyMDAgZW1wdHkgICAgICAgfCA0MDAgd3JvbmcvZXhwaXJlZCAgICB8IDQyOVxuICpcbiAqIEEgY29vbGRvd24gNDI5IChub3QgdGhlIDUvZGF5IGNhcCwgbm90IHRoZSBnbG9iYWwgdG9rZW4gYnVja2V0KSBjYXJyaWVzIGFcbiAqIFJldHJ5LUFmdGVyIGhlYWRlciBpbiBzZWNvbmRzIOKAlCBzdXJmYWNlZCBhcyBBcGlFcnJvci5yZXRyeUFmdGVyU2Vjb25kcy5cbiAqXG4gKiBFTUFJTCBjb2RlcyBhcmUgOC1jaGFyIHRva2VucywgUEhPTkUgY29kZXMgYXJlIDYtZGlnaXQgb25lLXRpbWUgcGFzc3dvcmRzXG4gKiAoYmFja2VuZCBnZW5lcmF0b3JzIOKAlCBtaXJyb3JlZCBpbiB0aGUgcGFnZSdzIGlucHV0IGhpbnRzLCBub3QgcmUtaW1wbGVtZW50ZWQpLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIFZlcmlmeUdhdGV3YXkge1xuICBwcml2YXRlIHJlYWRvbmx5IGFwaSA9IGluamVjdChBcGlDbGllbnQpO1xuXG4gIC8qKiBQT1NUIC92ZXJpZnkvcmVxdWVzdCB7bGV2ZWx9IC0+IDIwMiArIHRoZSByZXNlbmQtY29vbGRvd24gYWNrLiBTZW5kcyBhIGNvZGUgdmlhIHRoZSBsZXZlbCdzIGNoYW5uZWwuICovXG4gIHJlcXVlc3QobGV2ZWw6IFZlcmlmaWNhdGlvbkxldmVsKTogUHJvbWlzZTxSZXNlbmRBY2s+IHtcbiAgICBjb25zdCBib2R5OiBWZXJpZnlSZXF1ZXN0ID0geyBsZXZlbCB9O1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8UmVzZW5kQWNrPignL3ZlcmlmeS9yZXF1ZXN0JywgYm9keSkpO1xuICB9XG5cbiAgLyoqIFBPU1QgL3ZlcmlmeS9jb25maXJtIHtsZXZlbCwgY29kZX0gLT4gMjAwLiBDbGFpbXMgdGhlIGxldmVsIG9uIHN1Y2Nlc3MuICovXG4gIGNvbmZpcm0obGV2ZWw6IFZlcmlmaWNhdGlvbkxldmVsLCBjb2RlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBib2R5OiBWZXJpZnlDb25maXJtUmVxdWVzdCA9IHsgbGV2ZWwsIGNvZGUgfTtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wb3N0PHZvaWQ+KCcvdmVyaWZ5L2NvbmZpcm0nLCBib2R5KSk7XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FDRSx5QkFDQSxtQkFDQSxXQUNBLFVBQ0EsVUFBQUEsU0FFQSxjQUNLO0FBQ1AsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxhQUFhLHFCQUFxQixrQkFBa0I7QUFDN0QsU0FBUyxnQkFBZ0Isa0JBQWtCO0FBQzNDLFNBQVMsWUFBWTs7O0FFWnJCLFNBQVMsUUFBUSxrQkFBa0I7QUFDbkMsU0FBUyxxQkFBcUI7O0FBbUJ4QixJQUFPLGdCQUFQLE1BQU8sZUFBYTtFQUNQLE1BQU0sT0FBTyxTQUFTOztFQUd2QyxRQUFRLE9BQTZD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