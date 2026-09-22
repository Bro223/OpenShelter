import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-WDUFX5JK.js");import {
  ResendCountdown
} from "/chunk-PVMWPZKN.js";
import {
  CODE_SIX_DIGITS
} from "/chunk-SWSUI7DQ.js";
import {
  AuthGateway
} from "/chunk-T7PPW65J.js";
import {
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

// src/app/features/auth/reset-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { Router, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c0 = (a0) => ({ time: a0 });
function ResetPage_Case_1_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 7);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "authPage.reset.emailRequired"), " ");
  }
}
function ResetPage_Case_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "h1", 1);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(3, "p", 2);
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275pipe(5, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(6, "form", 3);
    i0.\u0275\u0275listener("ngSubmit", function ResetPage_Case_1_Template_form_ngSubmit_6_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.requestReset());
    });
    i0.\u0275\u0275elementStart(7, "div", 4)(8, "label", 5);
    i0.\u0275\u0275text(9);
    i0.\u0275\u0275pipe(10, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(11, "input", 6);
    i0.\u0275\u0275pipe(12, "t");
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(13, ResetPage_Case_1_Conditional_13_Template, 3, 3, "p", 7);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(14, "app-banner", 8);
    i0.\u0275\u0275elementStart(15, "button", 9);
    i0.\u0275\u0275text(16);
    i0.\u0275\u0275pipe(17, "t");
    i0.\u0275\u0275pipe(18, "t");
    i0.\u0275\u0275pipe(19, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 11, "authPage.reset.title"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(5, 13, "authPage.reset.subtitle"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("formGroup", ctx_r1.requestForm);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(10, 15, "authPage.reset.emailLabel"));
    const emailInvalid_r3 = ctx_r1.requestForm.controls.email.touched && ctx_r1.requestForm.controls.email.invalid;
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(12, 17, "authPage.reset.emailPlaceholder"));
    i0.\u0275\u0275attribute("aria-invalid", emailInvalid_r3 ? "true" : null)("aria-describedby", emailInvalid_r3 ? "reset-email-error" : null);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(emailInvalid_r3 ? 13 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("message", ctx_r1.error());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("disabled", ctx_r1.pending() || ctx_r1.countdown.active);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.pending() ? i0.\u0275\u0275pipeBind1(17, 19, "authPage.reset.sending") : ctx_r1.countdown.active ? i0.\u0275\u0275pipeBind2(18, 21, "authPage.reset.sendIn", i0.\u0275\u0275pureFunction1(26, _c0, ctx_r1.countdown.label())) : i0.\u0275\u0275pipeBind1(19, 24, "authPage.reset.send"), " ");
  }
}
function ResetPage_Case_2_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 13);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "authPage.reset.codeRequired"), " ");
  }
}
function ResetPage_Case_2_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 17);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.confirmForm.controls.password.hasError("required") ? i0.\u0275\u0275pipeBind1(2, 1, "authPage.reset.newPasswordRequired") : i0.\u0275\u0275pipeBind1(3, 3, ctx_r1.newPasswordTooShortKey), " ");
  }
}
function ResetPage_Case_2_Conditional_29_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 24);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "authPage.reset.repeatRequired"));
  }
}
function ResetPage_Case_2_Conditional_29_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 24);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "authPage.reset.mismatch"));
  }
}
function ResetPage_Case_2_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 20);
    i0.\u0275\u0275conditionalCreate(1, ResetPage_Case_2_Conditional_29_Conditional_1_Template, 3, 3, "p", 24);
    i0.\u0275\u0275conditionalCreate(2, ResetPage_Case_2_Conditional_29_Conditional_2_Template, 3, 3, "p", 24);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275nextContext();
    const repeatInvalid_r5 = i0.\u0275\u0275readContextLet(26);
    const repeatMismatch_r6 = i0.\u0275\u0275readContextLet(27);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(repeatInvalid_r5 ? 1 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(repeatMismatch_r6 ? 2 : -1);
  }
}
function ResetPage_Case_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "h1", 1);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(3, "app-banner", 10);
    i0.\u0275\u0275pipe(4, "t");
    i0.\u0275\u0275elementStart(5, "form", 3);
    i0.\u0275\u0275listener("ngSubmit", function ResetPage_Case_2_Template_form_ngSubmit_5_listener() {
      i0.\u0275\u0275restoreView(_r4);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.confirmReset());
    });
    i0.\u0275\u0275elementStart(6, "div", 4)(7, "label", 11);
    i0.\u0275\u0275text(8);
    i0.\u0275\u0275pipe(9, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(10, "input", 12);
    i0.\u0275\u0275pipe(11, "t");
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(12, ResetPage_Case_2_Conditional_12_Template, 3, 3, "p", 13);
    i0.\u0275\u0275elementStart(13, "p", 14);
    i0.\u0275\u0275text(14);
    i0.\u0275\u0275pipe(15, "t");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(16, "div", 4)(17, "label", 15);
    i0.\u0275\u0275text(18);
    i0.\u0275\u0275pipe(19, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(20, "input", 16);
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(21, ResetPage_Case_2_Conditional_21_Template, 4, 5, "p", 17);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(22, "div", 4)(23, "label", 18);
    i0.\u0275\u0275text(24);
    i0.\u0275\u0275pipe(25, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275declareLet(26)(27);
    i0.\u0275\u0275element(28, "input", 19);
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(29, ResetPage_Case_2_Conditional_29_Template, 3, 2, "div", 20);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(30, "app-banner", 8);
    i0.\u0275\u0275elementStart(31, "button", 9);
    i0.\u0275\u0275text(32);
    i0.\u0275\u0275pipe(33, "t");
    i0.\u0275\u0275pipe(34, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(35, "button", 21);
    i0.\u0275\u0275listener("click", function ResetPage_Case_2_Template_button_click_35_listener() {
      i0.\u0275\u0275restoreView(_r4);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.resendCode());
    });
    i0.\u0275\u0275text(36);
    i0.\u0275\u0275pipe(37, "t");
    i0.\u0275\u0275pipe(38, "t");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(39, "p", 22)(40, "a", 23);
    i0.\u0275\u0275text(41);
    i0.\u0275\u0275pipe(42, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 23, "authPage.reset.sentTitle"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("message", i0.\u0275\u0275pipeBind1(4, 25, "authPage.reset.sentBody"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("formGroup", ctx_r1.confirmForm);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(9, 27, "authPage.reset.codeLabel"));
    const codeInvalid_r7 = ctx_r1.confirmForm.controls.code.touched && ctx_r1.confirmForm.controls.code.invalid;
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(11, 29, "authPage.reset.codePlaceholder"));
    i0.\u0275\u0275attribute("aria-invalid", codeInvalid_r7 ? "true" : null)("aria-describedby", codeInvalid_r7 ? "reset-code-note reset-code-error" : "reset-code-note");
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(codeInvalid_r7 ? 12 : -1);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(15, 31, "authPage.reset.codeNote"));
    i0.\u0275\u0275advance(4);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(19, 33, "authPage.reset.newPasswordLabel"));
    const newPasswordInvalid_r8 = ctx_r1.confirmForm.controls.password.touched && ctx_r1.confirmForm.controls.password.invalid;
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275attribute("aria-invalid", newPasswordInvalid_r8 ? "true" : null)("aria-describedby", newPasswordInvalid_r8 ? "reset-password-error" : null);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(newPasswordInvalid_r8 ? 21 : -1);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(25, 35, "authPage.reset.repeatLabel"));
    i0.\u0275\u0275advance(2);
    const repeatInvalid_r9 = i0.\u0275\u0275storeLet(ctx_r1.confirmForm.controls.passwordAgain.touched && ctx_r1.confirmForm.controls.passwordAgain.invalid);
    i0.\u0275\u0275advance();
    const repeatMismatch_r10 = i0.\u0275\u0275storeLet(ctx_r1.confirmMismatch());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275attribute("aria-invalid", repeatInvalid_r9 || repeatMismatch_r10 ? "true" : null)("aria-describedby", repeatInvalid_r9 || repeatMismatch_r10 ? "reset-password-again-error" : null);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(repeatInvalid_r9 || repeatMismatch_r10 ? 29 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("message", ctx_r1.error());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("disabled", ctx_r1.pending());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.pending() ? i0.\u0275\u0275pipeBind1(33, 39, "authPage.reset.updating") : i0.\u0275\u0275pipeBind1(34, 41, "authPage.reset.update"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("disabled", ctx_r1.pending() || ctx_r1.countdown.active);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.countdown.active ? i0.\u0275\u0275pipeBind2(37, 43, "authPage.reset.resendIn", i0.\u0275\u0275pureFunction1(50, _c0, ctx_r1.countdown.label())) : i0.\u0275\u0275pipeBind1(38, 46, "authPage.reset.resend"), " ");
    i0.\u0275\u0275advance(5);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(42, 48, "authPage.reset.backToLogin"));
  }
}
var ResetPage = class _ResetPage {
  gateway = inject(AuthGateway);
  router = inject(Router);
  /** The i18n seam: the banner's client-authored error.* copy resolves in
   *  the active locale (N7 i18n-completeness). */
  i18n = inject(I18nService);
  mode = signal(
    "request",
    ...ngDevMode ? [{ debugName: "mode" }] : (
      /* istanbul ignore next */
      []
    )
  );
  pending = signal(
    false,
    ...ngDevMode ? [{ debugName: "pending" }] : (
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
  /** The one send/resend cooldown for this page (server-enforced). */
  countdown = new ResendCountdown();
  /**
   * The password-length field-error copy key. The i18n lane adds it to the
   * `Messages` catalog this wave (M7 report: EN/ET/RU values); the cast
   * keeps the template compiling until then — at runtime the lookup goes
   * through the I18nService seam (the spec installs the value via
   * site-texts), and it resolves from the catalog directly once the key
   * lands.
   */
  newPasswordTooShortKey = "authPage.reset.newPasswordTooShort";
  ngOnDestroy() {
    this.countdown.stop();
  }
  requestForm = new FormGroup({
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });
  confirmForm = new FormGroup({
    code: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)]
    }),
    // minLength mirrors the server's @Size(min = 8) on
    // PasswordResetConfirmRequest.newPassword — a short password is a
    // client-side field error, never a 400 the banner could read as a bad
    // code. passwordAgain needs no own length rule: a repeat value under
    // 8 either mismatches the (valid) password, or equals a short password
    // that the password control's rule already flags.
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
    }),
    passwordAgain: new FormControl("", { nonNullable: true, validators: [Validators.required] })
  });
  /** The e-mail from the request step — included in the confirm body. */
  email = null;
  confirmMismatch() {
    const form = this.confirmForm;
    return form.controls.passwordAgain.touched && form.controls.password.value !== form.controls.passwordAgain.value;
  }
  async requestReset() {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const email = this.requestForm.getRawValue().email.trim();
      const ack = await this.gateway.requestPasswordReset(email);
      this.countdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.email = email;
      this.mode.set("sent");
    } catch (error) {
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, "reset", (key) => this.i18n.t(key)));
    } finally {
      this.pending.set(false);
    }
  }
  /** Resend with the same e-mail — stays in the sent state (the backend
   *  always answers 200, so the UI must not reveal anything either way). */
  async resendCode() {
    if (!this.email || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const ack = await this.gateway.requestPasswordReset(this.email);
      this.countdown.start(ack.resendAvailableAfterSeconds ?? 60);
    } catch (error) {
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, "reset", (key) => this.i18n.t(key)));
    } finally {
      this.pending.set(false);
    }
  }
  /**
   * A 429 means the cooldown is live — run it (Retry-After when the server
   * sent one, else the default 60 s); the banner carries the message.
   */
  startCountdownFromThrottle(error) {
    const api = error instanceof ApiError ? error : toApiError(error);
    if (api.status === 429) {
      this.countdown.start(api.retryAfterSeconds ?? 60);
    }
  }
  async confirmReset() {
    if (!this.email || this.confirmForm.invalid || this.confirmMismatch()) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const { code, password } = this.confirmForm.getRawValue();
      await this.gateway.resetPassword(this.email, code, password);
      await this.router.navigate(["/login"], { queryParams: { reset: "ok" } });
    } catch (error) {
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, "reset", (key) => this.i18n.t(key)));
    } finally {
      this.pending.set(false);
    }
  }
  static \u0275fac = function ResetPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ResetPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _ResetPage, selectors: [["app-reset-page"]], decls: 3, vars: 1, consts: [[1, "auth-card"], [1, "page-title"], [1, "page-subtitle"], ["novalidate", "", 3, "ngSubmit", "formGroup"], [1, "field"], ["for", "reset-email"], ["id", "reset-email", "type", "email", "formControlName", "email", "autocomplete", "email", 3, "placeholder"], ["id", "reset-email-error", "role", "alert", 1, "field-error"], ["severity", "error", 3, "message"], ["type", "submit", 1, "btn", "btn--primary", "btn--block", 3, "disabled"], ["severity", "info", 3, "message"], ["for", "reset-code"], ["id", "reset-code", "type", "text", "formControlName", "code", "autocomplete", "one-time-code", "inputmode", "numeric", 3, "placeholder"], ["id", "reset-code-error", "role", "alert", 1, "field-error"], ["id", "reset-code-note", 1, "field-note"], ["for", "reset-password"], ["id", "reset-password", "type", "password", "formControlName", "password", "autocomplete", "new-password"], ["id", "reset-password-error", "role", "alert", 1, "field-error"], ["for", "reset-password-again"], ["id", "reset-password-again", "type", "password", "formControlName", "passwordAgain", "autocomplete", "new-password"], ["id", "reset-password-again-error", "role", "alert"], ["type", "button", 1, "btn", "btn--ghost", "btn--block", 3, "click", "disabled"], [1, "auth-links"], ["routerLink", "/login"], [1, "field-error"]], template: function ResetPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "section", 0);
      i0.\u0275\u0275conditionalCreate(1, ResetPage_Case_1_Template, 20, 28)(2, ResetPage_Case_2_Template, 43, 52);
      i0.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_0_0;
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional((tmp_0_0 = ctx.mode()) === "request" ? 1 : tmp_0_0 === "sent" ? 2 : -1);
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, BannerComponent, TranslatePipe], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.auth-card[_ngcontent-%COMP%] {\n  max-width: 26rem;\n  margin: var(--%NS%space-32) auto 0;\n}\n.auth-links[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-18);\n  font-size: var(--%NS%text-md);\n  text-align: center;\n}\n.field-note[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: var(--%NS%space-6) 0 0;\n}\n/*# sourceMappingURL=reset-page.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(ResetPage, [{
    type: Component,
    args: [{ selector: "app-reset-page", imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<section class="auth-card">
  @switch (mode()) {
    @case ('request') {
      <h1 class="page-title">{{ 'authPage.reset.title' | t }}</h1>
      <p class="page-subtitle">{{ 'authPage.reset.subtitle' | t }}</p>

      <form [formGroup]="requestForm" (ngSubmit)="requestReset()" novalidate>
        <div class="field">
          <label for="reset-email">{{ 'authPage.reset.emailLabel' | t }}</label>
          <!-- a11y (WCAG 2.1 4.1.3, the /submit convention): the error line
               is a live region (role=alert) AND wired to the control \u2014
               aria-invalid while it is shown, aria-describedby pointing at
               the error element. @let holds the single condition the @if
               renders on, so the input bindings and the @if can never
               disagree. -->
          @let emailInvalid =
            requestForm.controls.email.touched && requestForm.controls.email.invalid;
          <input
            id="reset-email"
            type="email"
            formControlName="email"
            autocomplete="email"
            [placeholder]="'authPage.reset.emailPlaceholder' | t"
            [attr.aria-invalid]="emailInvalid ? 'true' : null"
            [attr.aria-describedby]="emailInvalid ? 'reset-email-error' : null"
          />
          @if (emailInvalid) {
            <p class="field-error" id="reset-email-error" role="alert">
              {{ 'authPage.reset.emailRequired' | t }}
            </p>
          }
        </div>

        <app-banner severity="error" [message]="error()" />

        <button
          type="submit"
          class="btn btn--primary btn--block"
          [disabled]="pending() || countdown.active"
        >
          {{
            pending()
              ? ('authPage.reset.sending' | t)
              : countdown.active
                ? ('authPage.reset.sendIn' | t: { time: countdown.label() })
                : ('authPage.reset.send' | t)
          }}
        </button>
      </form>
    }
    @case ('sent') {
      <h1 class="page-title">{{ 'authPage.reset.sentTitle' | t }}</h1>
      <app-banner severity="info" [message]="'authPage.reset.sentBody' | t" />

      <form [formGroup]="confirmForm" (ngSubmit)="confirmReset()" novalidate>
        <div class="field">
          <label for="reset-code">{{ 'authPage.reset.codeLabel' | t }}</label>
          <!-- a11y: describedby always carries the field NOTE and gains the
               error id while an error is shown. -->
          @let codeInvalid = confirmForm.controls.code.touched && confirmForm.controls.code.invalid;
          <input
            id="reset-code"
            type="text"
            formControlName="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            [placeholder]="'authPage.reset.codePlaceholder' | t"
            [attr.aria-invalid]="codeInvalid ? 'true' : null"
            [attr.aria-describedby]="
              codeInvalid ? 'reset-code-note reset-code-error' : 'reset-code-note'
            "
          />
          @if (codeInvalid) {
            <p class="field-error" id="reset-code-error" role="alert">
              {{ 'authPage.reset.codeRequired' | t }}
            </p>
          }
          <p class="field-note" id="reset-code-note">{{ 'authPage.reset.codeNote' | t }}</p>
        </div>

        <div class="field">
          <label for="reset-password">{{ 'authPage.reset.newPasswordLabel' | t }}</label>
          <!-- a11y: one error slot, the message follows the failing rule. -->
          @let newPasswordInvalid =
            confirmForm.controls.password.touched && confirmForm.controls.password.invalid;
          <input
            id="reset-password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            [attr.aria-invalid]="newPasswordInvalid ? 'true' : null"
            [attr.aria-describedby]="newPasswordInvalid ? 'reset-password-error' : null"
          />
          @if (newPasswordInvalid) {
            <!-- Copy for the length rule; 'authPage.reset.newPasswordTooShort'
                 lands in the catalog via the i18n lane this wave (M7
                 report) \u2014 see newPasswordTooShortKey. -->
            <p class="field-error" id="reset-password-error" role="alert">
              {{
                confirmForm.controls.password.hasError('required')
                  ? ('authPage.reset.newPasswordRequired' | t)
                  : (newPasswordTooShortKey | t)
              }}
            </p>
          }
        </div>

        <div class="field">
          <label for="reset-password-again">{{ 'authPage.reset.repeatLabel' | t }}</label>
          <!-- a11y: the required and the mismatch errors can be visible AT
               THE SAME TIME (an emptied field next to a filled password \u2014
               both after markAllAsTouched), so ONE alert region carries
               whichever of the two are visible. -->
          @let repeatInvalid =
            confirmForm.controls.passwordAgain.touched &&
            confirmForm.controls.passwordAgain.invalid;
          @let repeatMismatch = confirmMismatch();
          <input
            id="reset-password-again"
            type="password"
            formControlName="passwordAgain"
            autocomplete="new-password"
            [attr.aria-invalid]="repeatInvalid || repeatMismatch ? 'true' : null"
            [attr.aria-describedby]="
              repeatInvalid || repeatMismatch ? 'reset-password-again-error' : null
            "
          />
          @if (repeatInvalid || repeatMismatch) {
            <div id="reset-password-again-error" role="alert">
              @if (repeatInvalid) {
                <p class="field-error">{{ 'authPage.reset.repeatRequired' | t }}</p>
              }
              @if (repeatMismatch) {
                <p class="field-error">{{ 'authPage.reset.mismatch' | t }}</p>
              }
            </div>
          }
        </div>

        <app-banner severity="error" [message]="error()" />

        <button type="submit" class="btn btn--primary btn--block" [disabled]="pending()">
          {{ pending() ? ('authPage.reset.updating' | t) : ('authPage.reset.update' | t) }}
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--block"
          (click)="resendCode()"
          [disabled]="pending() || countdown.active"
        >
          {{
            countdown.active
              ? ('authPage.reset.resendIn' | t: { time: countdown.label() })
              : ('authPage.reset.resend' | t)
          }}
        </button>
      </form>

      <p class="auth-links">
        <a routerLink="/login">{{ 'authPage.reset.backToLogin' | t }}</a>
      </p>
    }
  }
</section>
`, styles: ["/* src/app/features/auth/reset-page.scss */\n:host {\n  display: block;\n}\n.auth-card {\n  max-width: 26rem;\n  margin: var(--space-32) auto 0;\n}\n.auth-links {\n  margin-top: var(--space-18);\n  font-size: var(--text-md);\n  text-align: center;\n}\n.field-note {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: var(--space-6) 0 0;\n}\n/*# sourceMappingURL=reset-page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(ResetPage, { className: "ResetPage", filePath: "src/app/features/auth/reset-page.ts", lineNumber: 48 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fauth%2Freset-page.ts%40ResetPage";
  function ResetPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(ResetPage, m.default, [i0, i1], [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ResetPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ResetPage_HmrLoad(d.timestamp)));
})();
export {
  ResetPage
};
//# debugId=7ed7f2c0-ccfd-5c30-afa5-e3602f82822c


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvYXV0aC9yZXNldC1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9hdXRoL3Jlc2V0LXBhZ2UuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbmplY3QsIE9uRGVzdHJveSwgc2lnbmFsIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGb3JtQ29udHJvbCwgRm9ybUdyb3VwLCBSZWFjdGl2ZUZvcm1zTW9kdWxlLCBWYWxpZGF0b3JzIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgUm91dGVyLCBSb3V0ZXJMaW5rIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IEFwaUVycm9yLCB0b0FwaUVycm9yIH0gZnJvbSAnLi4vLi4vY29yZS9hcGktZXJyb3InO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB0eXBlIHsgTWVzc2FnZUtleSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBUcmFuc2xhdGVQaXBlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlJztcbmltcG9ydCB7IEF1dGhHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvYXV0aC1nYXRld2F5JztcbmltcG9ydCB7IEJhbm5lckNvbXBvbmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9iYW5uZXIuY29tcG9uZW50JztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5pbXBvcnQgeyBDT0RFX1NJWF9ESUdJVFMgfSBmcm9tICcuLi8uLi9zaGFyZWQvZm9ybS1oZWxwZXJzJztcbmltcG9ydCB7IFJlc2VuZENvdW50ZG93biB9IGZyb20gJy4uLy4uL3NoYXJlZC9yZXNlbmQtY291bnRkb3duJztcblxuZXhwb3J0IHR5cGUgUmVzZXRNb2RlID0gJ3JlcXVlc3QnIHwgJ3NlbnQnO1xuXG4vKipcbiAqIC9yZXNldCAoR3Vlc3RHdWFyZCkuIFR3byBzdGF0ZXMsIG9uZSBwYWdlIOKAlCB0aGUgZS1tYWlsIGNhcnJpZXMgYVxuICogNi1kaWdpdCBDT0RFLCBub3QgYSBsaW5rLCBzbyB0aGUgd2hvbGUgZmxvdyBoYXBwZW5zIGhlcmUgKG5vID90b2tlbj0pOlxuICogIC0gcmVxdWVzdDogZW1haWwgLT4gUE9TVCAvYXV0aC9wYXNzd29yZC1yZXNldC9yZXF1ZXN0LiBUaGUgYmFja2VuZFxuICogICAgYWx3YXlzIGFuc3dlcnMgMjAwIChhbnRpLWVudW1lcmF0aW9uKSwgc28gdGhlIFVJIGFsd2F5cyBzaG93cyB0aGUgc2FtZVxuICogICAgXCJpZiBhbiBhY2NvdW50IGV4aXN0c+KAplwiIG1lc3NhZ2UgYW5kIE5FVkVSIHJldmVhbHMgd2hldGhlciB0aGUgZW1haWxcbiAqICAgIHdhcyBrbm93bi5cbiAqICAtIHNlbnQ6IHRoZSBzYW1lIGFudGktZW51bWVyYXRpb24gY29weSArIGNvZGUgKyBuZXcgcGFzc3dvcmQgKyByZXBlYXQgaW5cbiAqICAgIE9ORSB2aWV3IC0+IFBPU1QgL2F1dGgvcGFzc3dvcmQtcmVzZXQvY29uZmlybSB7ZW1haWwsIGNvZGUsIG5ld1Bhc3N3b3JkfVxuICogICAgLT4gc3VjY2VzcyAtPiAvbG9naW4/cmVzZXQ9b2suIEEgNDAwIGZvciB0aGUgQ09ERSBpdHNlbGZcbiAqICAgICh3cm9uZy9leHBpcmVkL3VzZWQvb3Zlci1saW1pdCDigJQgaW5kaXN0aW5ndWlzaGFibGUgYnkgZGVzaWduKSBpcyBPTkVcbiAqICAgIGdlbmVyaWMgaW5saW5lIGJhbm5lcjsgYSA0MDAgdGhhdCBpcyBhIGZpZWxkLWxldmVsIFZBTElEQVRJT04gZmFpbHVyZVxuICogICAgKGUuZy4gYSBzaG9ydCBwYXNzd29yZCkgaXMgZWNob2VkIGhvbmVzdGx5LCBzaW5jZSBpdCBuYW1lcyBhIGZpZWxkIGFuZFxuICogICAgcmV2ZWFscyBub3RoaW5nIGFib3V0IHRoZSBjb2RlLiBUaGUgcGFzc3dvcmQgY29udHJvbCBtaXJyb3JzIHRoZVxuICogICAgc2VydmVyJ3MgQFNpemUobWluID0gOCkgc28gYSBzaG9ydCBwYXNzd29yZCBpcyBhIGNsaWVudC1zaWRlIGZpZWxkXG4gKiAgICBlcnJvciwgbm90IGEgNDAwIGF0IGFsbC4gQSA0MjkgKHRoZSBwZXItKElQLCBlbWFpbCkgYW50aS1ndWVzcyBidWNrZXQpXG4gKiAgICBydW5zIHRoZSBsaXZlIHJlc2VuZCBjb3VudGRvd24gZnJvbSBSZXRyeS1BZnRlciwgbGlrZSB0aGUgc2VuZC9yZXNlbmRcbiAqICAgIHBhdGhzLiBUaGUgZm9ybSBzdGF5cyB1c2FibGUgaW4gZXZlcnkgY2FzZS5cbiAqICAtIHJlc2VuZCBjb29sZG93bjogYSBzdWNjZXNzZnVsIHNlbmQncyBhY2sgYm9keSBjYXJyaWVzIHRoZSBzZXJ2ZXInc1xuICogICAgY29vbGRvd24gaW4gc2Vjb25kczsgdGhlIHNlbmQvcmVzZW5kIGJ1dHRvbnMgcnVuIGEgbGl2ZSBjb3VudGRvd24gZnJvbVxuICogICAgaXQgYW5kIHN0YXkgZGlzYWJsZWQgdW50aWwgaXQgZXhwaXJlcy4gVGhlIHJlcXVlc3QgQUxXQVlTIGFuc3dlcnMgMjAwXG4gKiAgICAodGhlIHNlcnZlciBzaWxlbnRseSBza2lwcyBzZW5kcyBpbnNpZGUgdGhlIGNvb2xkb3duIOKAlCBhbnRpLVxuICogICAgZW51bWVyYXRpb24pLCBzbyB0aGUgZGlzYWJsZWQgYnV0dG9uIGlzIHdoYXQgc3RvcHMgdGhlIHNwYW0tY2xpY2tzO1xuICogICAgYSA0MjkgKHRoZSBnbG9iYWwgdG9rZW4gYnVja2V0KSBzdGFydHMgdGhlIGNvdW50ZG93biBmcm9tIFJldHJ5LUFmdGVyLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtcmVzZXQtcGFnZScsXG4gIGltcG9ydHM6IFtSZWFjdGl2ZUZvcm1zTW9kdWxlLCBSb3V0ZXJMaW5rLCBCYW5uZXJDb21wb25lbnQsIFRyYW5zbGF0ZVBpcGVdLFxuICB0ZW1wbGF0ZVVybDogJy4vcmVzZXQtcGFnZS5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL3Jlc2V0LXBhZ2Uuc2NzcycsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxufSlcbmV4cG9ydCBjbGFzcyBSZXNldFBhZ2UgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGV3YXkgPSBpbmplY3QoQXV0aEdhdGV3YXkpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xuICAvKiogVGhlIGkxOG4gc2VhbTogdGhlIGJhbm5lcidzIGNsaWVudC1hdXRob3JlZCBlcnJvci4qIGNvcHkgcmVzb2x2ZXMgaW5cbiAgICogIHRoZSBhY3RpdmUgbG9jYWxlIChONyBpMThuLWNvbXBsZXRlbmVzcykuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgaTE4biA9IGluamVjdChJMThuU2VydmljZSk7XG5cbiAgcmVhZG9ubHkgbW9kZSA9IHNpZ25hbDxSZXNldE1vZGU+KCdyZXF1ZXN0Jyk7XG4gIHByb3RlY3RlZCByZWFkb25seSBwZW5kaW5nID0gc2lnbmFsKGZhbHNlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuXG4gIC8qKiBUaGUgb25lIHNlbmQvcmVzZW5kIGNvb2xkb3duIGZvciB0aGlzIHBhZ2UgKHNlcnZlci1lbmZvcmNlZCkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBjb3VudGRvd24gPSBuZXcgUmVzZW5kQ291bnRkb3duKCk7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXNzd29yZC1sZW5ndGggZmllbGQtZXJyb3IgY29weSBrZXkuIFRoZSBpMThuIGxhbmUgYWRkcyBpdCB0byB0aGVcbiAgICogYE1lc3NhZ2VzYCBjYXRhbG9nIHRoaXMgd2F2ZSAoTTcgcmVwb3J0OiBFTi9FVC9SVSB2YWx1ZXMpOyB0aGUgY2FzdFxuICAgKiBrZWVwcyB0aGUgdGVtcGxhdGUgY29tcGlsaW5nIHVudGlsIHRoZW4g4oCUIGF0IHJ1bnRpbWUgdGhlIGxvb2t1cCBnb2VzXG4gICAqIHRocm91Z2ggdGhlIEkxOG5TZXJ2aWNlIHNlYW0gKHRoZSBzcGVjIGluc3RhbGxzIHRoZSB2YWx1ZSB2aWFcbiAgICogc2l0ZS10ZXh0cyksIGFuZCBpdCByZXNvbHZlcyBmcm9tIHRoZSBjYXRhbG9nIGRpcmVjdGx5IG9uY2UgdGhlIGtleVxuICAgKiBsYW5kcy5cbiAgICovXG4gIHJlYWRvbmx5IG5ld1Bhc3N3b3JkVG9vU2hvcnRLZXkgPSAnYXV0aFBhZ2UucmVzZXQubmV3UGFzc3dvcmRUb29TaG9ydCcgYXMgTWVzc2FnZUtleTtcblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvdW50ZG93bi5zdG9wKCk7XG4gIH1cblxuICByZWFkb25seSByZXF1ZXN0Rm9ybSA9IG5ldyBGb3JtR3JvdXAoe1xuICAgIGVtYWlsOiBuZXcgRm9ybUNvbnRyb2woJycsIHtcbiAgICAgIG5vbk51bGxhYmxlOiB0cnVlLFxuICAgICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWQsIFZhbGlkYXRvcnMuZW1haWxdLFxuICAgIH0pLFxuICB9KTtcblxuICByZWFkb25seSBjb25maXJtRm9ybSA9IG5ldyBGb3JtR3JvdXAoe1xuICAgIGNvZGU6IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgICB2YWxpZGF0b3JzOiBbVmFsaWRhdG9ycy5yZXF1aXJlZCwgVmFsaWRhdG9ycy5wYXR0ZXJuKENPREVfU0lYX0RJR0lUUyldLFxuICAgIH0pLFxuICAgIC8vIG1pbkxlbmd0aCBtaXJyb3JzIHRoZSBzZXJ2ZXIncyBAU2l6ZShtaW4gPSA4KSBvblxuICAgIC8vIFBhc3N3b3JkUmVzZXRDb25maXJtUmVxdWVzdC5uZXdQYXNzd29yZCDigJQgYSBzaG9ydCBwYXNzd29yZCBpcyBhXG4gICAgLy8gY2xpZW50LXNpZGUgZmllbGQgZXJyb3IsIG5ldmVyIGEgNDAwIHRoZSBiYW5uZXIgY291bGQgcmVhZCBhcyBhIGJhZFxuICAgIC8vIGNvZGUuIHBhc3N3b3JkQWdhaW4gbmVlZHMgbm8gb3duIGxlbmd0aCBydWxlOiBhIHJlcGVhdCB2YWx1ZSB1bmRlclxuICAgIC8vIDggZWl0aGVyIG1pc21hdGNoZXMgdGhlICh2YWxpZCkgcGFzc3dvcmQsIG9yIGVxdWFscyBhIHNob3J0IHBhc3N3b3JkXG4gICAgLy8gdGhhdCB0aGUgcGFzc3dvcmQgY29udHJvbCdzIHJ1bGUgYWxyZWFkeSBmbGFncy5cbiAgICBwYXNzd29yZDogbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkLCBWYWxpZGF0b3JzLm1pbkxlbmd0aCg4KV0sXG4gICAgfSksXG4gICAgcGFzc3dvcmRBZ2FpbjogbmV3IEZvcm1Db250cm9sKCcnLCB7IG5vbk51bGxhYmxlOiB0cnVlLCB2YWxpZGF0b3JzOiBbVmFsaWRhdG9ycy5yZXF1aXJlZF0gfSksXG4gIH0pO1xuXG4gIC8qKiBUaGUgZS1tYWlsIGZyb20gdGhlIHJlcXVlc3Qgc3RlcCDigJQgaW5jbHVkZWQgaW4gdGhlIGNvbmZpcm0gYm9keS4gKi9cbiAgcHJpdmF0ZSBlbWFpbDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uZmlybU1pc21hdGNoKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZvcm0gPSB0aGlzLmNvbmZpcm1Gb3JtO1xuICAgIHJldHVybiAoXG4gICAgICBmb3JtLmNvbnRyb2xzLnBhc3N3b3JkQWdhaW4udG91Y2hlZCAmJlxuICAgICAgZm9ybS5jb250cm9scy5wYXNzd29yZC52YWx1ZSAhPT0gZm9ybS5jb250cm9scy5wYXNzd29yZEFnYWluLnZhbHVlXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RSZXNldCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5yZXF1ZXN0Rm9ybS5pbnZhbGlkKSB7XG4gICAgICB0aGlzLnJlcXVlc3RGb3JtLm1hcmtBbGxBc1RvdWNoZWQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5wZW5kaW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW1haWwgPSB0aGlzLnJlcXVlc3RGb3JtLmdldFJhd1ZhbHVlKCkuZW1haWwudHJpbSgpO1xuICAgICAgY29uc3QgYWNrID0gYXdhaXQgdGhpcy5nYXRld2F5LnJlcXVlc3RQYXNzd29yZFJlc2V0KGVtYWlsKTtcbiAgICAgIHRoaXMuY291bnRkb3duLnN0YXJ0KGFjay5yZXNlbmRBdmFpbGFibGVBZnRlclNlY29uZHMgPz8gNjApO1xuICAgICAgdGhpcy5lbWFpbCA9IGVtYWlsO1xuICAgICAgdGhpcy5tb2RlLnNldCgnc2VudCcpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnN0YXJ0Q291bnRkb3duRnJvbVRocm90dGxlKGVycm9yKTtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZXJyb3IsICdyZXNldCcsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5wZW5kaW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFJlc2VuZCB3aXRoIHRoZSBzYW1lIGUtbWFpbCDigJQgc3RheXMgaW4gdGhlIHNlbnQgc3RhdGUgKHRoZSBiYWNrZW5kXG4gICAqICBhbHdheXMgYW5zd2VycyAyMDAsIHNvIHRoZSBVSSBtdXN0IG5vdCByZXZlYWwgYW55dGhpbmcgZWl0aGVyIHdheSkuICovXG4gIGFzeW5jIHJlc2VuZENvZGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmVtYWlsIHx8IHRoaXMucGVuZGluZygpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucGVuZGluZy5zZXQodHJ1ZSk7XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFjayA9IGF3YWl0IHRoaXMuZ2F0ZXdheS5yZXF1ZXN0UGFzc3dvcmRSZXNldCh0aGlzLmVtYWlsKTtcbiAgICAgIHRoaXMuY291bnRkb3duLnN0YXJ0KGFjay5yZXNlbmRBdmFpbGFibGVBZnRlclNlY29uZHMgPz8gNjApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnN0YXJ0Q291bnRkb3duRnJvbVRocm90dGxlKGVycm9yKTtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZXJyb3IsICdyZXNldCcsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5wZW5kaW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEEgNDI5IG1lYW5zIHRoZSBjb29sZG93biBpcyBsaXZlIOKAlCBydW4gaXQgKFJldHJ5LUFmdGVyIHdoZW4gdGhlIHNlcnZlclxuICAgKiBzZW50IG9uZSwgZWxzZSB0aGUgZGVmYXVsdCA2MCBzKTsgdGhlIGJhbm5lciBjYXJyaWVzIHRoZSBtZXNzYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGFydENvdW50ZG93bkZyb21UaHJvdHRsZShlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IGFwaSA9IGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IgPyBlcnJvciA6IHRvQXBpRXJyb3IoZXJyb3IpO1xuICAgIGlmIChhcGkuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgIHRoaXMuY291bnRkb3duLnN0YXJ0KGFwaS5yZXRyeUFmdGVyU2Vjb25kcyA/PyA2MCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY29uZmlybVJlc2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5lbWFpbCB8fCB0aGlzLmNvbmZpcm1Gb3JtLmludmFsaWQgfHwgdGhpcy5jb25maXJtTWlzbWF0Y2goKSkge1xuICAgICAgdGhpcy5jb25maXJtRm9ybS5tYXJrQWxsQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucGVuZGluZy5zZXQodHJ1ZSk7XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgY29kZSwgcGFzc3dvcmQgfSA9IHRoaXMuY29uZmlybUZvcm0uZ2V0UmF3VmFsdWUoKTtcbiAgICAgIGF3YWl0IHRoaXMuZ2F0ZXdheS5yZXNldFBhc3N3b3JkKHRoaXMuZW1haWwsIGNvZGUsIHBhc3N3b3JkKTtcbiAgICAgIGF3YWl0IHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL2xvZ2luJ10sIHsgcXVlcnlQYXJhbXM6IHsgcmVzZXQ6ICdvaycgfSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gQSA0MjkgKHRoZSBwZXItKElQLCBlbWFpbCkgYW50aS1ndWVzcyBidWNrZXQpIGlzIGEgcmF0ZSBsaW1pdCwgbm90XG4gICAgICAvLyBhIGJhZCBjb2RlOiBydW4gdGhlIGxpdmUgcmVzZW5kIGNvdW50ZG93biwgZXhhY3RseSBsaWtlIHRoZVxuICAgICAgLy8gc2VuZC9yZXNlbmQgcGF0aHMgZG8uXG4gICAgICB0aGlzLnN0YXJ0Q291bnRkb3duRnJvbVRocm90dGxlKGVycm9yKTtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZXJyb3IsICdyZXNldCcsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5wZW5kaW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG59XG4iLCI8c2VjdGlvbiBjbGFzcz1cImF1dGgtY2FyZFwiPlxuICBAc3dpdGNoIChtb2RlKCkpIHtcbiAgICBAY2FzZSAoJ3JlcXVlc3QnKSB7XG4gICAgICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2F1dGhQYWdlLnJlc2V0LnRpdGxlJyB8IHQgfX08L2gxPlxuICAgICAgPHAgY2xhc3M9XCJwYWdlLXN1YnRpdGxlXCI+e3sgJ2F1dGhQYWdlLnJlc2V0LnN1YnRpdGxlJyB8IHQgfX08L3A+XG5cbiAgICAgIDxmb3JtIFtmb3JtR3JvdXBdPVwicmVxdWVzdEZvcm1cIiAobmdTdWJtaXQpPVwicmVxdWVzdFJlc2V0KClcIiBub3ZhbGlkYXRlPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICA8bGFiZWwgZm9yPVwicmVzZXQtZW1haWxcIj57eyAnYXV0aFBhZ2UucmVzZXQuZW1haWxMYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgICAgICA8IS0tIGExMXkgKFdDQUcgMi4xIDQuMS4zLCB0aGUgL3N1Ym1pdCBjb252ZW50aW9uKTogdGhlIGVycm9yIGxpbmVcbiAgICAgICAgICAgICAgIGlzIGEgbGl2ZSByZWdpb24gKHJvbGU9YWxlcnQpIEFORCB3aXJlZCB0byB0aGUgY29udHJvbCDigJRcbiAgICAgICAgICAgICAgIGFyaWEtaW52YWxpZCB3aGlsZSBpdCBpcyBzaG93biwgYXJpYS1kZXNjcmliZWRieSBwb2ludGluZyBhdFxuICAgICAgICAgICAgICAgdGhlIGVycm9yIGVsZW1lbnQuIEBsZXQgaG9sZHMgdGhlIHNpbmdsZSBjb25kaXRpb24gdGhlIEBpZlxuICAgICAgICAgICAgICAgcmVuZGVycyBvbiwgc28gdGhlIGlucHV0IGJpbmRpbmdzIGFuZCB0aGUgQGlmIGNhbiBuZXZlclxuICAgICAgICAgICAgICAgZGlzYWdyZWUuIC0tPlxuICAgICAgICAgIEBsZXQgZW1haWxJbnZhbGlkID1cbiAgICAgICAgICAgIHJlcXVlc3RGb3JtLmNvbnRyb2xzLmVtYWlsLnRvdWNoZWQgJiYgcmVxdWVzdEZvcm0uY29udHJvbHMuZW1haWwuaW52YWxpZDtcbiAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgIGlkPVwicmVzZXQtZW1haWxcIlxuICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICAgIGZvcm1Db250cm9sTmFtZT1cImVtYWlsXCJcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cImVtYWlsXCJcbiAgICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInYXV0aFBhZ2UucmVzZXQuZW1haWxQbGFjZWhvbGRlcicgfCB0XCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJlbWFpbEludmFsaWQgPyAndHJ1ZScgOiBudWxsXCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtZGVzY3JpYmVkYnldPVwiZW1haWxJbnZhbGlkID8gJ3Jlc2V0LWVtYWlsLWVycm9yJyA6IG51bGxcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgQGlmIChlbWFpbEludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cInJlc2V0LWVtYWlsLWVycm9yXCIgcm9sZT1cImFsZXJ0XCI+XG4gICAgICAgICAgICAgIHt7ICdhdXRoUGFnZS5yZXNldC5lbWFpbFJlcXVpcmVkJyB8IHQgfX1cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICB9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxhcHAtYmFubmVyIHNldmVyaXR5PVwiZXJyb3JcIiBbbWVzc2FnZV09XCJlcnJvcigpXCIgLz5cblxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cInN1Ym1pdFwiXG4gICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5IGJ0bi0tYmxvY2tcIlxuICAgICAgICAgIFtkaXNhYmxlZF09XCJwZW5kaW5nKCkgfHwgY291bnRkb3duLmFjdGl2ZVwiXG4gICAgICAgID5cbiAgICAgICAgICB7e1xuICAgICAgICAgICAgcGVuZGluZygpXG4gICAgICAgICAgICAgID8gKCdhdXRoUGFnZS5yZXNldC5zZW5kaW5nJyB8IHQpXG4gICAgICAgICAgICAgIDogY291bnRkb3duLmFjdGl2ZVxuICAgICAgICAgICAgICAgID8gKCdhdXRoUGFnZS5yZXNldC5zZW5kSW4nIHwgdDogeyB0aW1lOiBjb3VudGRvd24ubGFiZWwoKSB9KVxuICAgICAgICAgICAgICAgIDogKCdhdXRoUGFnZS5yZXNldC5zZW5kJyB8IHQpXG4gICAgICAgICAgfX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICA8L2Zvcm0+XG4gICAgfVxuICAgIEBjYXNlICgnc2VudCcpIHtcbiAgICAgIDxoMSBjbGFzcz1cInBhZ2UtdGl0bGVcIj57eyAnYXV0aFBhZ2UucmVzZXQuc2VudFRpdGxlJyB8IHQgfX08L2gxPlxuICAgICAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJpbmZvXCIgW21lc3NhZ2VdPVwiJ2F1dGhQYWdlLnJlc2V0LnNlbnRCb2R5JyB8IHRcIiAvPlxuXG4gICAgICA8Zm9ybSBbZm9ybUdyb3VwXT1cImNvbmZpcm1Gb3JtXCIgKG5nU3VibWl0KT1cImNvbmZpcm1SZXNldCgpXCIgbm92YWxpZGF0ZT5cbiAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgPGxhYmVsIGZvcj1cInJlc2V0LWNvZGVcIj57eyAnYXV0aFBhZ2UucmVzZXQuY29kZUxhYmVsJyB8IHQgfX08L2xhYmVsPlxuICAgICAgICAgIDwhLS0gYTExeTogZGVzY3JpYmVkYnkgYWx3YXlzIGNhcnJpZXMgdGhlIGZpZWxkIE5PVEUgYW5kIGdhaW5zIHRoZVxuICAgICAgICAgICAgICAgZXJyb3IgaWQgd2hpbGUgYW4gZXJyb3IgaXMgc2hvd24uIC0tPlxuICAgICAgICAgIEBsZXQgY29kZUludmFsaWQgPSBjb25maXJtRm9ybS5jb250cm9scy5jb2RlLnRvdWNoZWQgJiYgY29uZmlybUZvcm0uY29udHJvbHMuY29kZS5pbnZhbGlkO1xuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgaWQ9XCJyZXNldC1jb2RlXCJcbiAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgIGZvcm1Db250cm9sTmFtZT1cImNvZGVcIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwib25lLXRpbWUtY29kZVwiXG4gICAgICAgICAgICBpbnB1dG1vZGU9XCJudW1lcmljXCJcbiAgICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInYXV0aFBhZ2UucmVzZXQuY29kZVBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1pbnZhbGlkXT1cImNvZGVJbnZhbGlkID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cIlxuICAgICAgICAgICAgICBjb2RlSW52YWxpZCA/ICdyZXNldC1jb2RlLW5vdGUgcmVzZXQtY29kZS1lcnJvcicgOiAncmVzZXQtY29kZS1ub3RlJ1xuICAgICAgICAgICAgXCJcbiAgICAgICAgICAvPlxuICAgICAgICAgIEBpZiAoY29kZUludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cInJlc2V0LWNvZGUtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAge3sgJ2F1dGhQYWdlLnJlc2V0LmNvZGVSZXF1aXJlZCcgfCB0IH19XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgfVxuICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtbm90ZVwiIGlkPVwicmVzZXQtY29kZS1ub3RlXCI+e3sgJ2F1dGhQYWdlLnJlc2V0LmNvZGVOb3RlJyB8IHQgfX08L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJyZXNldC1wYXNzd29yZFwiPnt7ICdhdXRoUGFnZS5yZXNldC5uZXdQYXNzd29yZExhYmVsJyB8IHQgfX08L2xhYmVsPlxuICAgICAgICAgIDwhLS0gYTExeTogb25lIGVycm9yIHNsb3QsIHRoZSBtZXNzYWdlIGZvbGxvd3MgdGhlIGZhaWxpbmcgcnVsZS4gLS0+XG4gICAgICAgICAgQGxldCBuZXdQYXNzd29yZEludmFsaWQgPVxuICAgICAgICAgICAgY29uZmlybUZvcm0uY29udHJvbHMucGFzc3dvcmQudG91Y2hlZCAmJiBjb25maXJtRm9ybS5jb250cm9scy5wYXNzd29yZC5pbnZhbGlkO1xuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgaWQ9XCJyZXNldC1wYXNzd29yZFwiXG4gICAgICAgICAgICB0eXBlPVwicGFzc3dvcmRcIlxuICAgICAgICAgICAgZm9ybUNvbnRyb2xOYW1lPVwicGFzc3dvcmRcIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwibmV3LXBhc3N3b3JkXCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJuZXdQYXNzd29yZEludmFsaWQgPyAndHJ1ZScgOiBudWxsXCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtZGVzY3JpYmVkYnldPVwibmV3UGFzc3dvcmRJbnZhbGlkID8gJ3Jlc2V0LXBhc3N3b3JkLWVycm9yJyA6IG51bGxcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgQGlmIChuZXdQYXNzd29yZEludmFsaWQpIHtcbiAgICAgICAgICAgIDwhLS0gQ29weSBmb3IgdGhlIGxlbmd0aCBydWxlOyAnYXV0aFBhZ2UucmVzZXQubmV3UGFzc3dvcmRUb29TaG9ydCdcbiAgICAgICAgICAgICAgICAgbGFuZHMgaW4gdGhlIGNhdGFsb2cgdmlhIHRoZSBpMThuIGxhbmUgdGhpcyB3YXZlIChNN1xuICAgICAgICAgICAgICAgICByZXBvcnQpIOKAlCBzZWUgbmV3UGFzc3dvcmRUb29TaG9ydEtleS4gLS0+XG4gICAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCIgaWQ9XCJyZXNldC1wYXNzd29yZC1lcnJvclwiIHJvbGU9XCJhbGVydFwiPlxuICAgICAgICAgICAgICB7e1xuICAgICAgICAgICAgICAgIGNvbmZpcm1Gb3JtLmNvbnRyb2xzLnBhc3N3b3JkLmhhc0Vycm9yKCdyZXF1aXJlZCcpXG4gICAgICAgICAgICAgICAgICA/ICgnYXV0aFBhZ2UucmVzZXQubmV3UGFzc3dvcmRSZXF1aXJlZCcgfCB0KVxuICAgICAgICAgICAgICAgICAgOiAobmV3UGFzc3dvcmRUb29TaG9ydEtleSB8IHQpXG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICA8bGFiZWwgZm9yPVwicmVzZXQtcGFzc3dvcmQtYWdhaW5cIj57eyAnYXV0aFBhZ2UucmVzZXQucmVwZWF0TGFiZWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgPCEtLSBhMTF5OiB0aGUgcmVxdWlyZWQgYW5kIHRoZSBtaXNtYXRjaCBlcnJvcnMgY2FuIGJlIHZpc2libGUgQVRcbiAgICAgICAgICAgICAgIFRIRSBTQU1FIFRJTUUgKGFuIGVtcHRpZWQgZmllbGQgbmV4dCB0byBhIGZpbGxlZCBwYXNzd29yZCDigJRcbiAgICAgICAgICAgICAgIGJvdGggYWZ0ZXIgbWFya0FsbEFzVG91Y2hlZCksIHNvIE9ORSBhbGVydCByZWdpb24gY2Fycmllc1xuICAgICAgICAgICAgICAgd2hpY2hldmVyIG9mIHRoZSB0d28gYXJlIHZpc2libGUuIC0tPlxuICAgICAgICAgIEBsZXQgcmVwZWF0SW52YWxpZCA9XG4gICAgICAgICAgICBjb25maXJtRm9ybS5jb250cm9scy5wYXNzd29yZEFnYWluLnRvdWNoZWQgJiZcbiAgICAgICAgICAgIGNvbmZpcm1Gb3JtLmNvbnRyb2xzLnBhc3N3b3JkQWdhaW4uaW52YWxpZDtcbiAgICAgICAgICBAbGV0IHJlcGVhdE1pc21hdGNoID0gY29uZmlybU1pc21hdGNoKCk7XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cInJlc2V0LXBhc3N3b3JkLWFnYWluXCJcbiAgICAgICAgICAgIHR5cGU9XCJwYXNzd29yZFwiXG4gICAgICAgICAgICBmb3JtQ29udHJvbE5hbWU9XCJwYXNzd29yZEFnYWluXCJcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cIm5ldy1wYXNzd29yZFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwicmVwZWF0SW52YWxpZCB8fCByZXBlYXRNaXNtYXRjaCA/ICd0cnVlJyA6IG51bGxcIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1kZXNjcmliZWRieV09XCJcbiAgICAgICAgICAgICAgcmVwZWF0SW52YWxpZCB8fCByZXBlYXRNaXNtYXRjaCA/ICdyZXNldC1wYXNzd29yZC1hZ2Fpbi1lcnJvcicgOiBudWxsXG4gICAgICAgICAgICBcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgQGlmIChyZXBlYXRJbnZhbGlkIHx8IHJlcGVhdE1pc21hdGNoKSB7XG4gICAgICAgICAgICA8ZGl2IGlkPVwicmVzZXQtcGFzc3dvcmQtYWdhaW4tZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAgQGlmIChyZXBlYXRJbnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1lcnJvclwiPnt7ICdhdXRoUGFnZS5yZXNldC5yZXBlYXRSZXF1aXJlZCcgfCB0IH19PC9wPlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIEBpZiAocmVwZWF0TWlzbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCI+e3sgJ2F1dGhQYWdlLnJlc2V0Lm1pc21hdGNoJyB8IHQgfX08L3A+XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJlcnJvclwiIFttZXNzYWdlXT1cImVycm9yKClcIiAvPlxuXG4gICAgICAgIDxidXR0b24gdHlwZT1cInN1Ym1pdFwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeSBidG4tLWJsb2NrXCIgW2Rpc2FibGVkXT1cInBlbmRpbmcoKVwiPlxuICAgICAgICAgIHt7IHBlbmRpbmcoKSA/ICgnYXV0aFBhZ2UucmVzZXQudXBkYXRpbmcnIHwgdCkgOiAoJ2F1dGhQYWdlLnJlc2V0LnVwZGF0ZScgfCB0KSB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3QgYnRuLS1ibG9ja1wiXG4gICAgICAgICAgKGNsaWNrKT1cInJlc2VuZENvZGUoKVwiXG4gICAgICAgICAgW2Rpc2FibGVkXT1cInBlbmRpbmcoKSB8fCBjb3VudGRvd24uYWN0aXZlXCJcbiAgICAgICAgPlxuICAgICAgICAgIHt7XG4gICAgICAgICAgICBjb3VudGRvd24uYWN0aXZlXG4gICAgICAgICAgICAgID8gKCdhdXRoUGFnZS5yZXNldC5yZXNlbmRJbicgfCB0OiB7IHRpbWU6IGNvdW50ZG93bi5sYWJlbCgpIH0pXG4gICAgICAgICAgICAgIDogKCdhdXRoUGFnZS5yZXNldC5yZXNlbmQnIHwgdClcbiAgICAgICAgICB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZm9ybT5cblxuICAgICAgPHAgY2xhc3M9XCJhdXRoLWxpbmtzXCI+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvbG9naW5cIj57eyAnYXV0aFBhZ2UucmVzZXQuYmFja1RvTG9naW4nIHwgdCB9fTwvYT5cbiAgICAgIDwvcD5cbiAgICB9XG4gIH1cbjwvc2VjdGlvbj5cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLFNBQVMseUJBQXlCLFdBQVcsUUFBbUIsY0FBYztBQUM5RSxTQUFTLGFBQWEsV0FBVyxxQkFBcUIsa0JBQWtCO0FBQ3hFLFNBQVMsUUFBUSxrQkFBa0I7Ozs7OztBQ3lCdkIsSUFBQSw0QkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNFLElBQUEsb0JBQUEsQ0FBQTs7QUFDRixJQUFBLDBCQUFBOzs7QUFERSxJQUFBLHVCQUFBO0FBQUEsSUFBQSxnQ0FBQSxLQUFBLHlCQUFBLEdBQUEsR0FBQSw4QkFBQSxHQUFBLEdBQUE7Ozs7OztBQXpCUixJQUFBLDRCQUFBLEdBQUEsTUFBQSxDQUFBO0FBQXVCLElBQUEsb0JBQUEsQ0FBQTs7QUFBZ0MsSUFBQSwwQkFBQTtBQUN2RCxJQUFBLDRCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQXlCLElBQUEsb0JBQUEsQ0FBQTs7QUFBbUMsSUFBQSwwQkFBQTtBQUU1RCxJQUFBLDRCQUFBLEdBQUEsUUFBQSxDQUFBO0FBQWdDLElBQUEsd0JBQUEsWUFBQSxTQUFBLHFEQUFBO0FBQUEsTUFBQSwyQkFBQSxHQUFBO0FBQUEsWUFBQSxTQUFBLDJCQUFBO0FBQUEsYUFBQSx5QkFBWSxPQUFBLGFBQUEsQ0FBYztJQUFBLENBQUE7QUFDeEQsSUFBQSw0QkFBQSxHQUFBLE9BQUEsQ0FBQSxFQUFtQixHQUFBLFNBQUEsQ0FBQTtBQUNRLElBQUEsb0JBQUEsQ0FBQTs7QUFBcUMsSUFBQSwwQkFBQTtBQVM5RCxJQUFBLHVCQUFBLElBQUEsU0FBQSxDQUFBOztBQUdFLElBQUEsNkJBQUE7QUFNRixJQUFBLGlDQUFBLElBQUEsMENBQUEsR0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUtGLElBQUEsMEJBQUE7QUFFQSxJQUFBLHVCQUFBLElBQUEsY0FBQSxDQUFBO0FBRUEsSUFBQSw0QkFBQSxJQUFBLFVBQUEsQ0FBQTtBQUtFLElBQUEsb0JBQUEsRUFBQTs7OztBQU9GLElBQUEsMEJBQUEsRUFBUzs7OztBQTVDWSxJQUFBLHVCQUFBO0FBQUEsSUFBQSwrQkFBQSx5QkFBQSxHQUFBLElBQUEsc0JBQUEsQ0FBQTtBQUNFLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxJQUFBLHlCQUFBLENBQUE7QUFFbkIsSUFBQSx1QkFBQSxDQUFBO0FBQUEsSUFBQSx3QkFBQSxhQUFBLE9BQUEsV0FBQTtBQUV1QixJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLCtCQUFBLHlCQUFBLElBQUEsSUFBQSwyQkFBQSxDQUFBOztBQWN2QixJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLHdCQUFBLGVBQUEseUJBQUEsSUFBQSxJQUFBLGlDQUFBLENBQUE7O0FBRkEsSUFBQSx1QkFBQTtBQU1GLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsMkJBQUEsa0JBQUEsS0FBQSxFQUFBO0FBTzJCLElBQUEsdUJBQUE7QUFBQSxJQUFBLHdCQUFBLFdBQUEsT0FBQSxNQUFBLENBQUE7QUFLM0IsSUFBQSx1QkFBQTtBQUFBLElBQUEsd0JBQUEsWUFBQSxPQUFBLFFBQUEsS0FBQSxPQUFBLFVBQUEsTUFBQTtBQUVBLElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEsT0FBQSxRQUFBLElBQUEseUJBQUEsSUFBQSxJQUFBLHdCQUFBLElBQUEsT0FBQSxVQUFBLFNBQUEseUJBQUEsSUFBQSxJQUFBLHlCQUFBLDZCQUFBLElBQUEsS0FBQSxPQUFBLFVBQUEsTUFBQSxDQUFBLENBQUEsSUFBQSx5QkFBQSxJQUFBLElBQUEscUJBQUEsR0FBQSxHQUFBOzs7OztBQWlDRSxJQUFBLDRCQUFBLEdBQUEsS0FBQSxFQUFBO0FBQ0UsSUFBQSxvQkFBQSxDQUFBOztBQUNGLElBQUEsMEJBQUE7OztBQURFLElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEseUJBQUEsR0FBQSxHQUFBLDZCQUFBLEdBQUEsR0FBQTs7Ozs7QUF1QkYsSUFBQSw0QkFBQSxHQUFBLEtBQUEsRUFBQTtBQUNFLElBQUEsb0JBQUEsQ0FBQTs7O0FBS0YsSUFBQSwwQkFBQTs7OztBQUxFLElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEsT0FBQSxZQUFBLFNBQUEsU0FBQSxTQUFBLFVBQUEsSUFBQSx5QkFBQSxHQUFBLEdBQUEsb0NBQUEsSUFBQSx5QkFBQSxHQUFBLEdBQUEsT0FBQSxzQkFBQSxHQUFBLEdBQUE7Ozs7O0FBZ0NFLElBQUEsNEJBQUEsR0FBQSxLQUFBLEVBQUE7QUFBdUIsSUFBQSxvQkFBQSxDQUFBOztBQUF5QyxJQUFBLDBCQUFBOzs7QUFBekMsSUFBQSx1QkFBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxHQUFBLCtCQUFBLENBQUE7Ozs7O0FBR3ZCLElBQUEsNEJBQUEsR0FBQSxLQUFBLEVBQUE7QUFBdUIsSUFBQSxvQkFBQSxDQUFBOztBQUFtQyxJQUFBLDBCQUFBOzs7QUFBbkMsSUFBQSx1QkFBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxHQUFBLHlCQUFBLENBQUE7Ozs7O0FBTDNCLElBQUEsNEJBQUEsR0FBQSxPQUFBLEVBQUE7QUFDRSxJQUFBLGlDQUFBLEdBQUEsd0RBQUEsR0FBQSxHQUFBLEtBQUEsRUFBQTtBQUdBLElBQUEsaUNBQUEsR0FBQSx3REFBQSxHQUFBLEdBQUEsS0FBQSxFQUFBO0FBR0YsSUFBQSwwQkFBQTs7Ozs7O0FBTkUsSUFBQSx1QkFBQTtBQUFBLElBQUEsMkJBQUEsbUJBQUEsSUFBQSxFQUFBO0FBR0EsSUFBQSx1QkFBQTtBQUFBLElBQUEsMkJBQUEsb0JBQUEsSUFBQSxFQUFBOzs7Ozs7QUFqRlIsSUFBQSw0QkFBQSxHQUFBLE1BQUEsQ0FBQTtBQUF1QixJQUFBLG9CQUFBLENBQUE7O0FBQW9DLElBQUEsMEJBQUE7QUFDM0QsSUFBQSx1QkFBQSxHQUFBLGNBQUEsRUFBQTs7QUFFQSxJQUFBLDRCQUFBLEdBQUEsUUFBQSxDQUFBO0FBQWdDLElBQUEsd0JBQUEsWUFBQSxTQUFBLHFEQUFBO0FBQUEsTUFBQSwyQkFBQSxHQUFBO0FBQUEsWUFBQSxTQUFBLDJCQUFBO0FBQUEsYUFBQSx5QkFBWSxPQUFBLGFBQUEsQ0FBYztJQUFBLENBQUE7QUFDeEQsSUFBQSw0QkFBQSxHQUFBLE9BQUEsQ0FBQSxFQUFtQixHQUFBLFNBQUEsRUFBQTtBQUNPLElBQUEsb0JBQUEsQ0FBQTs7QUFBb0MsSUFBQSwwQkFBQTtBQUk1RCxJQUFBLHVCQUFBLElBQUEsU0FBQSxFQUFBOztBQUdFLElBQUEsNkJBQUE7QUFTRixJQUFBLGlDQUFBLElBQUEsMENBQUEsR0FBQSxHQUFBLEtBQUEsRUFBQTtBQUtBLElBQUEsNEJBQUEsSUFBQSxLQUFBLEVBQUE7QUFBMkMsSUFBQSxvQkFBQSxFQUFBOztBQUFtQyxJQUFBLDBCQUFBLEVBQUk7QUFHcEYsSUFBQSw0QkFBQSxJQUFBLE9BQUEsQ0FBQSxFQUFtQixJQUFBLFNBQUEsRUFBQTtBQUNXLElBQUEsb0JBQUEsRUFBQTs7QUFBMkMsSUFBQSwwQkFBQTtBQUl2RSxJQUFBLHVCQUFBLElBQUEsU0FBQSxFQUFBO0FBR0UsSUFBQSw2QkFBQTtBQUtGLElBQUEsaUNBQUEsSUFBQSwwQ0FBQSxHQUFBLEdBQUEsS0FBQSxFQUFBO0FBWUYsSUFBQSwwQkFBQTtBQUVBLElBQUEsNEJBQUEsSUFBQSxPQUFBLENBQUEsRUFBbUIsSUFBQSxTQUFBLEVBQUE7QUFDaUIsSUFBQSxvQkFBQSxFQUFBOztBQUFzQyxJQUFBLDBCQUFBO0FBS3hFLElBQUEsMEJBQUEsRUFBQSxFQUU2QyxFQUFBO0FBRTdDLElBQUEsdUJBQUEsSUFBQSxTQUFBLEVBQUE7QUFHRSxJQUFBLDZCQUFBO0FBT0YsSUFBQSxpQ0FBQSxJQUFBLDBDQUFBLEdBQUEsR0FBQSxPQUFBLEVBQUE7QUFVRixJQUFBLDBCQUFBO0FBRUEsSUFBQSx1QkFBQSxJQUFBLGNBQUEsQ0FBQTtBQUVBLElBQUEsNEJBQUEsSUFBQSxVQUFBLENBQUE7QUFDRSxJQUFBLG9CQUFBLEVBQUE7OztBQUNGLElBQUEsMEJBQUE7QUFDQSxJQUFBLDRCQUFBLElBQUEsVUFBQSxFQUFBO0FBR0UsSUFBQSx3QkFBQSxTQUFBLFNBQUEscURBQUE7QUFBQSxNQUFBLDJCQUFBLEdBQUE7QUFBQSxZQUFBLFNBQUEsMkJBQUE7QUFBQSxhQUFBLHlCQUFTLE9BQUEsV0FBQSxDQUFZO0lBQUEsQ0FBQTtBQUdyQixJQUFBLG9CQUFBLEVBQUE7OztBQUtGLElBQUEsMEJBQUEsRUFBUztBQUdYLElBQUEsNEJBQUEsSUFBQSxLQUFBLEVBQUEsRUFBc0IsSUFBQSxLQUFBLEVBQUE7QUFDRyxJQUFBLG9CQUFBLEVBQUE7O0FBQXNDLElBQUEsMEJBQUEsRUFBSTs7OztBQTVHNUMsSUFBQSx1QkFBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxJQUFBLDBCQUFBLENBQUE7QUFDSyxJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLHdCQUFBLFdBQUEseUJBQUEsR0FBQSxJQUFBLHlCQUFBLENBQUE7QUFFdEIsSUFBQSx1QkFBQSxDQUFBO0FBQUEsSUFBQSx3QkFBQSxhQUFBLE9BQUEsV0FBQTtBQUVzQixJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLCtCQUFBLHlCQUFBLEdBQUEsSUFBQSwwQkFBQSxDQUFBOztBQVV0QixJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLHdCQUFBLGVBQUEseUJBQUEsSUFBQSxJQUFBLGdDQUFBLENBQUE7O0FBSEEsSUFBQSx1QkFBQTtBQVNGLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsMkJBQUEsaUJBQUEsS0FBQSxFQUFBO0FBSzJDLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsSUFBQSxJQUFBLHlCQUFBLENBQUE7QUFJZixJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLCtCQUFBLHlCQUFBLElBQUEsSUFBQSxpQ0FBQSxDQUFBOztBQVMxQixJQUFBLHVCQUFBLENBQUE7O0FBRkEsSUFBQSx1QkFBQTtBQUtGLElBQUEsdUJBQUE7QUFBQSxJQUFBLDJCQUFBLHdCQUFBLEtBQUEsRUFBQTtBQWVrQyxJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLCtCQUFBLHlCQUFBLElBQUEsSUFBQSw0QkFBQSxDQUFBO0FBS2xDLElBQUEsdUJBQUEsQ0FBQTs2QkFBQSx3QkFBQSxPQUFBLFlBQUEsU0FBQSxjQUFBLFdBQUEsT0FBQSxZQUFBLFNBQUEsY0FBQSxPQUFBO0FBR0EsSUFBQSx1QkFBQTsrQkFBQSx3QkFBc0IsT0FBQSxnQkFBQSxDQUFpQjtBQU1yQyxJQUFBLHVCQUFBOztBQUZBLElBQUEsdUJBQUE7QUFPRixJQUFBLHVCQUFBO0FBQUEsSUFBQSwyQkFBQSxvQkFBQSxxQkFBQSxLQUFBLEVBQUE7QUFZMkIsSUFBQSx1QkFBQTtBQUFBLElBQUEsd0JBQUEsV0FBQSxPQUFBLE1BQUEsQ0FBQTtBQUU2QixJQUFBLHVCQUFBO0FBQUEsSUFBQSx3QkFBQSxZQUFBLE9BQUEsUUFBQSxDQUFBO0FBQ3hELElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEsT0FBQSxRQUFBLElBQUEseUJBQUEsSUFBQSxJQUFBLHlCQUFBLElBQUEseUJBQUEsSUFBQSxJQUFBLHVCQUFBLEdBQUEsR0FBQTtBQU1BLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsd0JBQUEsWUFBQSxPQUFBLFFBQUEsS0FBQSxPQUFBLFVBQUEsTUFBQTtBQUVBLElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEsT0FBQSxVQUFBLFNBQUEseUJBQUEsSUFBQSxJQUFBLDJCQUFBLDZCQUFBLElBQUEsS0FBQSxPQUFBLFVBQUEsTUFBQSxDQUFBLENBQUEsSUFBQSx5QkFBQSxJQUFBLElBQUEsdUJBQUEsR0FBQSxHQUFBO0FBU3FCLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsSUFBQSxJQUFBLDRCQUFBLENBQUE7OztBRGhIekIsSUFBTyxZQUFQLE1BQU8sV0FBOEI7RUFDeEIsVUFBVSxPQUFPLFdBQVc7RUFDNUIsU0FBUyxPQUFPLE1BQU07OztFQUd0QixPQUFPLE9BQU8sV0FBVztFQUVqQyxPQUFPO0lBQWtCOzs7Ozs7RUFDZixVQUFVO0lBQU87Ozs7OztFQUNqQixRQUFRO0lBQXNCOzs7Ozs7O0VBRzlCLFlBQVksSUFBSSxnQkFBZTs7Ozs7Ozs7O0VBVXpDLHlCQUF5QjtFQUVsQyxjQUFtQjtBQUNqQixTQUFLLFVBQVUsS0FBSTtFQUNyQjtFQUVTLGNBQWMsSUFBSSxVQUFVO0lBQ25DLE9BQU8sSUFBSSxZQUFZLElBQUk7TUFDekIsYUFBYTtNQUNiLFlBQVksQ0FBQyxXQUFXLFVBQVUsV0FBVyxLQUFLO0tBQ25EO0dBQ0Y7RUFFUSxjQUFjLElBQUksVUFBVTtJQUNuQyxNQUFNLElBQUksWUFBWSxJQUFJO01BQ3hCLGFBQWE7TUFDYixZQUFZLENBQUMsV0FBVyxVQUFVLFdBQVcsUUFBUSxlQUFlLENBQUM7S0FDdEU7Ozs7Ozs7SUFPRCxVQUFVLElBQUksWUFBWSxJQUFJO01BQzVCLGFBQWE7TUFDYixZQUFZLENBQUMsV0FBVyxVQUFVLFdBQVcsVUFBVSxDQUFDLENBQUM7S0FDMUQ7SUFDRCxlQUFlLElBQUksWUFBWSxJQUFJLEVBQUUsYUFBYSxNQUFNLFlBQVksQ0FBQyxXQUFXLFFBQVEsRUFBQyxDQUFFO0dBQzVGOztFQUdPLFFBQXVCO0VBRS9CLGtCQUEwQjtBQUN4QixVQUFNLE9BQU8sS0FBSztBQUNsQixXQUNFLEtBQUssU0FBUyxjQUFjLFdBQzVCLEtBQUssU0FBUyxTQUFTLFVBQVUsS0FBSyxTQUFTLGNBQWM7RUFFakU7RUFFQSxNQUFNLGVBQTZCO0FBQ2pDLFFBQUksS0FBSyxZQUFZLFNBQVM7QUFDNUIsV0FBSyxZQUFZLGlCQUFnQjtBQUNqQztJQUNGO0FBQ0EsU0FBSyxRQUFRLElBQUksSUFBSTtBQUNyQixTQUFLLE1BQU0sSUFBSSxJQUFJO0FBQ25CLFFBQUk7QUFDRixZQUFNLFFBQVEsS0FBSyxZQUFZLFlBQVcsRUFBRyxNQUFNLEtBQUk7QUFDdkQsWUFBTSxNQUFNLE1BQU0sS0FBSyxRQUFRLHFCQUFxQixLQUFLO0FBQ3pELFdBQUssVUFBVSxNQUFNLElBQUksK0JBQStCLEVBQUU7QUFDMUQsV0FBSyxRQUFRO0FBQ2IsV0FBSyxLQUFLLElBQUksTUFBTTtJQUN0QixTQUFTLE9BQU87QUFDZCxXQUFLLDJCQUEyQixLQUFLO0FBQ3JDLFdBQUssTUFBTSxJQUFJLGNBQWMsT0FBTyxTQUFTLENBQUMsUUFBUSxLQUFLLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN6RTtBQUNFLFdBQUssUUFBUSxJQUFJLEtBQUs7SUFDeEI7RUFDRjs7O0VBSUEsTUFBTSxhQUEyQjtBQUMvQixRQUFJLENBQUMsS0FBSyxTQUFTLEtBQUssUUFBTyxHQUFJO0FBQ2pDO0lBQ0Y7QUFDQSxTQUFLLFFBQVEsSUFBSSxJQUFJO0FBQ3JCLFNBQUssTUFBTSxJQUFJLElBQUk7QUFDbkIsUUFBSTtBQUNGLFlBQU0sTUFBTSxNQUFNLEtBQUssUUFBUSxxQkFBcUIsS0FBSyxLQUFLO0FBQzlELFdBQUssVUFBVSxNQUFNLElBQUksK0JBQStCLEVBQUU7SUFDNUQsU0FBUyxPQUFPO0FBQ2QsV0FBSywyQkFBMkIsS0FBSztBQUNyQyxXQUFLLE1BQU0sSUFBSSxjQUFjLE9BQU8sU0FBUyxDQUFDLFFBQVEsS0FBSyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDekU7QUFDRSxXQUFLLFFBQVEsSUFBSSxLQUFLO0lBQ3hCO0VBQ0Y7Ozs7O0VBTVEsMkJBQTJCLE9BQXFCO0FBQ3RELFVBQU0sTUFBTSxpQkFBaUIsV0FBVyxRQUFRLFdBQVcsS0FBSztBQUNoRSxRQUFJLElBQUksV0FBVyxLQUFLO0FBQ3RCLFdBQUssVUFBVSxNQUFNLElBQUkscUJBQXFCLEVBQUU7SUFDbEQ7RUFDRjtFQUVBLE1BQU0sZUFBNkI7QUFDakMsUUFBSSxDQUFDLEtBQUssU0FBUyxLQUFLLFlBQVksV0FBVyxLQUFLLGdCQUFlLEdBQUk7QUFDckUsV0FBSyxZQUFZLGlCQUFnQjtBQUNqQztJQUNGO0FBQ0EsU0FBSyxRQUFRLElBQUksSUFBSTtBQUNyQixTQUFLLE1BQU0sSUFBSSxJQUFJO0FBQ25CLFFBQUk7QUFDRixZQUFNLEVBQUUsTUFBTSxTQUFRLElBQUssS0FBSyxZQUFZLFlBQVc7QUFDdkQsWUFBTSxLQUFLLFFBQVEsY0FBYyxLQUFLLE9BQU8sTUFBTSxRQUFRO0FBQzNELFlBQU0sS0FBSyxPQUFPLFNBQVMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxLQUFJLEVBQUUsQ0FBRTtJQUN6RSxTQUFTLE9BQU87QUFJZCxXQUFLLDJCQUEyQixLQUFLO0FBQ3JDLFdBQUssTUFBTSxJQUFJLGNBQWMsT0FBTyxTQUFTLENBQUMsUUFBUSxLQUFLLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN6RTtBQUNFLFdBQUssUUFBUSxJQUFJLEtBQUs7SUFDeEI7RUFDRjs7cUNBdklXLFlBQVM7RUFBQTs0RUFBVCxZQUFTLFdBQUEsQ0FBQSxDQUFBLGdCQUFBLENBQUEsR0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsV0FBQSxHQUFBLENBQUEsR0FBQSxZQUFBLEdBQUEsQ0FBQSxHQUFBLGVBQUEsR0FBQSxDQUFBLGNBQUEsSUFBQSxHQUFBLFlBQUEsV0FBQSxHQUFBLENBQUEsR0FBQSxPQUFBLEdBQUEsQ0FBQSxPQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsZUFBQSxRQUFBLFNBQUEsbUJBQUEsU0FBQSxnQkFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsTUFBQSxxQkFBQSxRQUFBLFNBQUEsR0FBQSxhQUFBLEdBQUEsQ0FBQSxZQUFBLFNBQUEsR0FBQSxTQUFBLEdBQUEsQ0FBQSxRQUFBLFVBQUEsR0FBQSxPQUFBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLEdBQUEsQ0FBQSxZQUFBLFFBQUEsR0FBQSxTQUFBLEdBQUEsQ0FBQSxPQUFBLFlBQUEsR0FBQSxDQUFBLE1BQUEsY0FBQSxRQUFBLFFBQUEsbUJBQUEsUUFBQSxnQkFBQSxpQkFBQSxhQUFBLFdBQUEsR0FBQSxhQUFBLEdBQUEsQ0FBQSxNQUFBLG9CQUFBLFFBQUEsU0FBQSxHQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsbUJBQUEsR0FBQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLGdCQUFBLEdBQUEsQ0FBQSxNQUFBLGtCQUFBLFFBQUEsWUFBQSxtQkFBQSxZQUFBLGdCQUFBLGNBQUEsR0FBQSxDQUFBLE1BQUEsd0JBQUEsUUFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsT0FBQSxzQkFBQSxHQUFBLENBQUEsTUFBQSx3QkFBQSxRQUFBLFlBQUEsbUJBQUEsaUJBQUEsZ0JBQUEsY0FBQSxHQUFBLENBQUEsTUFBQSw4QkFBQSxRQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsVUFBQSxHQUFBLE9BQUEsY0FBQSxjQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUEsQ0FBQSxHQUFBLFlBQUEsR0FBQSxDQUFBLGNBQUEsUUFBQSxHQUFBLENBQUEsR0FBQSxhQUFBLENBQUEsR0FBQSxVQUFBLFNBQUEsbUJBQUEsSUFBQSxLQUFBO0FBQUEsUUFBQSxLQUFBLEdBQUE7QUMvQ3RCLE1BQUEsNEJBQUEsR0FBQSxXQUFBLENBQUE7QUFFSSxNQUFBLGlDQUFBLEdBQUEsMkJBQUEsSUFBQSxFQUFBLEVBQW1CLEdBQUEsMkJBQUEsSUFBQSxFQUFBO0FBaUt2QixNQUFBLDBCQUFBOzs7O0FBbEtFLE1BQUEsdUJBQUE7QUFBQSxNQUFBLDRCQUFBLFVBQUEsSUFBQSxLQUFBLE9BQUEsWUFBUyxJQUFBLFlBQVQsU0FBTSxJQUFBLEVBQUE7O29CRHlDSSxxQkFBbUIsdUJBQUEsbUJBQUEsaUNBQUEseUJBQUEsd0JBQUEsdUJBQUEsaUNBQUEsK0JBQUEsdUNBQUEsOEJBQUEsb0JBQUEseUJBQUEsc0JBQUEsdUJBQUEsdUJBQUEscUJBQUEsOEJBQUEsbUJBQUEsaUJBQUEsaUJBQUEseUJBQUEsdUJBQUEsdUJBQUEsb0JBQUEsa0JBQUEsa0JBQUUsWUFBWSxpQkFBaUIsYUFBYSxHQUFBLFFBQUEsQ0FBQSxzY0FBQSxFQUFBLENBQUE7OzsrRUFLOUQsV0FBUyxDQUFBO1VBUHJCO3VCQUNXLGtCQUFnQixTQUNqQixDQUFDLHFCQUFxQixZQUFZLGlCQUFpQixhQUFhLEdBQUMsaUJBR3pELHdCQUF3QixRQUFNLFVBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBQUEsUUFBQSxDQUFBLHVaQUFBLEVBQUEsQ0FBQTs7OztnRkFFcEMsV0FBUyxFQUFBLFdBQUEsYUFBQSxVQUFBLHVDQUFBLFlBQUEsR0FBQSxDQUFBO0FBQUEsR0FBQTs7Ozs7Ozs4REFBVCxXQUFTLEVBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxHQUFBLENBQUEscUJBQUEsWUFBQSxpQkFBQSxlQUFBLFdBQUEsdUJBQUEsR0FBQSxhQUFBLEVBQUEsQ0FBQTtFQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxjQUFBLGtCQUFBLEtBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxlQUFBLFlBQUEsT0FBQSxZQUFBLElBQUEsR0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE1BQUEsa0JBQUEsRUFBQSxTQUFBLENBQUE7QUFBQSxHQUFBOyIsIm5hbWVzIjpbXSwiZGVidWdJZCI6IjdlZDdmMmMwLWNjZmQtNWMzMC1hZmE1LWUzNjAyZjgyODIyYyJ9