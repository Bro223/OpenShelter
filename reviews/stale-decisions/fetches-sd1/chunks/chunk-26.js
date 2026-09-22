import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-Y6ZKWZZW.js");import {
  safeReturnUrl
} from "/chunk-RVLWDZXM.js";
import {
  AuthStore
} from "/chunk-QATQGZY5.js";
import "/chunk-T7PPW65J.js";
import {
  BannerComponent,
  bannerMessage
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/auth/login-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { ActivatedRoute, Router, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
function LoginPage_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 8);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "authPage.login.contactRequired"), " ");
  }
}
function LoginPage_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "authPage.login.passwordRequired"), " ");
  }
}
var LoginPage = class _LoginPage {
  store = inject(AuthStore);
  router = inject(Router);
  route = inject(ActivatedRoute);
  /** The i18n seam: the banner's client-authored error.* copy resolves in
   *  the active locale (N7 i18n-completeness). */
  i18n = inject(I18nService);
  form = new FormGroup({
    emailOrPhone: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl("", { nonNullable: true, validators: [Validators.required] })
  });
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
  /** True when the interceptor bounced us here with ?session=expired. */
  sessionExpired = signal(
    false,
    ...ngDevMode ? [{ debugName: "sessionExpired" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True when the password-reset flow landed us here with ?reset=ok. */
  resetOk = signal(
    false,
    ...ngDevMode ? [{ debugName: "resetOk" }] : (
      /* istanbul ignore next */
      []
    )
  );
  destination = "/map";
  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    this.sessionExpired.set(query.get("session") === "expired");
    this.resetOk.set(query.get("reset") === "ok");
    this.destination = safeReturnUrl(query.get("returnUrl"));
  }
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    const { emailOrPhone, password } = this.form.getRawValue();
    try {
      await this.store.login(emailOrPhone, password);
      await this.router.navigateByUrl(this.destination);
    } catch (error) {
      this.error.set(bannerMessage(error, "login", (key) => this.i18n.t(key)));
    } finally {
      this.pending.set(false);
    }
  }
  static \u0275fac = function LoginPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LoginPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _LoginPage, selectors: [["app-login-page"]], decls: 47, vars: 50, consts: [[1, "auth-card"], [1, "page-title"], [1, "page-subtitle"], ["severity", "info", 3, "message"], ["novalidate", "", 3, "ngSubmit", "formGroup"], [1, "field"], ["for", "login-contact"], ["id", "login-contact", "type", "text", "formControlName", "emailOrPhone", "autocomplete", "username", 3, "placeholder"], ["id", "login-contact-error", "role", "alert", 1, "field-error"], ["for", "login-password"], ["id", "login-password", "type", "password", "formControlName", "password", "autocomplete", "current-password"], ["id", "login-password-error", "role", "alert", 1, "field-error"], ["severity", "error", 3, "message"], ["type", "submit", 1, "btn", "btn--primary", "btn--block", 3, "disabled"], [1, "auth-links"], ["routerLink", "/reset"], ["routerLink", "/register"], ["routerLink", "/privacy"], ["routerLink", "/terms"]], template: function LoginPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 1);
      i0.\u0275\u0275text(2);
      i0.\u0275\u0275pipe(3, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(4, "p", 2);
      i0.\u0275\u0275text(5);
      i0.\u0275\u0275pipe(6, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275element(7, "app-banner", 3);
      i0.\u0275\u0275pipe(8, "t");
      i0.\u0275\u0275element(9, "app-banner", 3);
      i0.\u0275\u0275pipe(10, "t");
      i0.\u0275\u0275elementStart(11, "form", 4);
      i0.\u0275\u0275listener("ngSubmit", function LoginPage_Template_form_ngSubmit_11_listener() {
        return ctx.submit();
      });
      i0.\u0275\u0275elementStart(12, "div", 5)(13, "label", 6);
      i0.\u0275\u0275text(14);
      i0.\u0275\u0275pipe(15, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275element(16, "input", 7);
      i0.\u0275\u0275pipe(17, "t");
      i0.\u0275\u0275controlCreate();
      i0.\u0275\u0275conditionalCreate(18, LoginPage_Conditional_18_Template, 3, 3, "p", 8);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(19, "div", 5)(20, "label", 9);
      i0.\u0275\u0275text(21);
      i0.\u0275\u0275pipe(22, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275element(23, "input", 10);
      i0.\u0275\u0275controlCreate();
      i0.\u0275\u0275conditionalCreate(24, LoginPage_Conditional_24_Template, 3, 3, "p", 11);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275element(25, "app-banner", 12);
      i0.\u0275\u0275elementStart(26, "button", 13);
      i0.\u0275\u0275text(27);
      i0.\u0275\u0275pipe(28, "t");
      i0.\u0275\u0275pipe(29, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(30, "p", 14)(31, "a", 15);
      i0.\u0275\u0275text(32);
      i0.\u0275\u0275pipe(33, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(34);
      i0.\u0275\u0275pipe(35, "t");
      i0.\u0275\u0275elementStart(36, "a", 16);
      i0.\u0275\u0275text(37);
      i0.\u0275\u0275pipe(38, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(39, "p", 14)(40, "a", 17);
      i0.\u0275\u0275text(41);
      i0.\u0275\u0275pipe(42, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(43, " \xB7 ");
      i0.\u0275\u0275elementStart(44, "a", 18);
      i0.\u0275\u0275text(45);
      i0.\u0275\u0275pipe(46, "t");
      i0.\u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 22, "authPage.login.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 24, "authPage.login.subtitle"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("message", ctx.sessionExpired() ? i0.\u0275\u0275pipeBind1(8, 26, "authPage.login.sessionExpired") : null);
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("message", ctx.resetOk() ? i0.\u0275\u0275pipeBind1(10, 28, "authPage.login.resetOk") : null);
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("formGroup", ctx.form);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(15, 30, "authPage.login.contactLabel"));
      const contactInvalid_r1 = ctx.form.controls.emailOrPhone.touched && ctx.form.controls.emailOrPhone.invalid;
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(17, 32, "authPage.login.contactPlaceholder"));
      i0.\u0275\u0275attribute("aria-invalid", contactInvalid_r1 ? "true" : null)("aria-describedby", contactInvalid_r1 ? "login-contact-error" : null);
      i0.\u0275\u0275control();
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275conditional(contactInvalid_r1 ? 18 : -1);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(22, 34, "authPage.login.passwordLabel"));
      const passwordInvalid_r2 = ctx.form.controls.password.touched && ctx.form.controls.password.invalid;
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275attribute("aria-invalid", passwordInvalid_r2 ? "true" : null)("aria-describedby", passwordInvalid_r2 ? "login-password-error" : null);
      i0.\u0275\u0275control();
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(passwordInvalid_r2 ? 24 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("message", ctx.error());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("disabled", ctx.pending());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate1(" ", ctx.pending() ? i0.\u0275\u0275pipeBind1(28, 36, "authPage.login.submitting") : i0.\u0275\u0275pipeBind1(29, 38, "authPage.login.submit"), " ");
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(33, 40, "authPage.login.forgot"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1(" \xB7 ", i0.\u0275\u0275pipeBind1(35, 42, "authPage.login.noAccount"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(38, 44, "authPage.login.createOne"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(42, 46, "authPage.privacyPolicy"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(46, 48, "authPage.termsOfUse"));
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, BannerComponent, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n[_nghost-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n}\n.auth-card[_ngcontent-%COMP%] {\n  max-width: 26rem;\n  margin: 0 auto;\n}\n.auth-links[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-18);\n  font-size: var(--%NS%text-md);\n  text-align: center;\n}\n/*# sourceMappingURL=login-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(LoginPage, [{
    type: Component,
    args: [{ selector: "app-login-page", imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<section class="auth-card">
  <h1 class="page-title">{{ 'authPage.login.title' | t }}</h1>
  <p class="page-subtitle">{{ 'authPage.login.subtitle' | t }}</p>

  <app-banner
    severity="info"
    [message]="sessionExpired() ? ('authPage.login.sessionExpired' | t) : null"
  />
  <app-banner severity="info" [message]="resetOk() ? ('authPage.login.resetOk' | t) : null" />

  <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
    <div class="field">
      <label for="login-contact">{{ 'authPage.login.contactLabel' | t }}</label>
      <!-- a11y (WCAG 2.1 4.1.3, the /submit convention): the error line is
           a live region (role=alert) AND wired to the control \u2014 aria-invalid
           while it is shown, aria-describedby pointing at the error element.
           @let holds the single condition the @if renders on, so the input
           bindings and the @if can never disagree. -->
      @let contactInvalid =
        form.controls.emailOrPhone.touched && form.controls.emailOrPhone.invalid;
      <input
        id="login-contact"
        type="text"
        formControlName="emailOrPhone"
        autocomplete="username"
        [placeholder]="'authPage.login.contactPlaceholder' | t"
        [attr.aria-invalid]="contactInvalid ? 'true' : null"
        [attr.aria-describedby]="contactInvalid ? 'login-contact-error' : null"
      />
      @if (contactInvalid) {
        <p class="field-error" id="login-contact-error" role="alert">
          {{ 'authPage.login.contactRequired' | t }}
        </p>
      }
    </div>

    <div class="field">
      <label for="login-password">{{ 'authPage.login.passwordLabel' | t }}</label>
      <!-- a11y: same pattern as the contact field above. -->
      @let passwordInvalid = form.controls.password.touched && form.controls.password.invalid;
      <input
        id="login-password"
        type="password"
        formControlName="password"
        autocomplete="current-password"
        [attr.aria-invalid]="passwordInvalid ? 'true' : null"
        [attr.aria-describedby]="passwordInvalid ? 'login-password-error' : null"
      />
      @if (passwordInvalid) {
        <p class="field-error" id="login-password-error" role="alert">
          {{ 'authPage.login.passwordRequired' | t }}
        </p>
      }
    </div>

    <app-banner severity="error" [message]="error()" />

    <button type="submit" class="btn btn--primary btn--block" [disabled]="pending()">
      {{ pending() ? ('authPage.login.submitting' | t) : ('authPage.login.submit' | t) }}
    </button>
  </form>

  <p class="auth-links">
    <a routerLink="/reset">{{ 'authPage.login.forgot' | t }}</a>
    &middot; {{ 'authPage.login.noAccount' | t }}
    <a routerLink="/register">{{ 'authPage.login.createOne' | t }}</a>
  </p>

  <p class="auth-links">
    <a routerLink="/privacy">{{ 'authPage.privacyPolicy' | t }}</a>
    &middot; <a routerLink="/terms">{{ 'authPage.termsOfUse' | t }}</a>
  </p>
</section>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/auth/login-page.scss */\n:host {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n}\n.auth-card {\n  max-width: 26rem;\n  margin: 0 auto;\n}\n.auth-links {\n  margin-top: var(--space-18);\n  font-size: var(--text-md);\n  text-align: center;\n}\n/*# sourceMappingURL=login-page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(LoginPage, { className: "LoginPage", filePath: "src/app/features/auth/login-page.ts", lineNumber: 26 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fauth%2Flogin-page.ts%40LoginPage";
  function LoginPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(LoginPage, m.default, [i0, i1], [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && LoginPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && LoginPage_HmrLoad(d.timestamp)));
})();
export {
  LoginPage
};
//# debugId=0bb9c51c-75bf-5c91-a300-c32da3c5cff0


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvYXV0aC9sb2dpbi1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9hdXRoL2xvZ2luLXBhZ2UuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbmplY3QsIHR5cGUgT25Jbml0LCBzaWduYWwgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEZvcm1Db250cm9sLCBGb3JtR3JvdXAsIFJlYWN0aXZlRm9ybXNNb2R1bGUsIFZhbGlkYXRvcnMgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyLCBSb3V0ZXJMaW5rIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IEF1dGhTdG9yZSB9IGZyb20gJy4uLy4uL3Nlc3Npb24vYXV0aC1zdG9yZSc7XG5pbXBvcnQgeyBzYWZlUmV0dXJuVXJsIH0gZnJvbSAnLi4vLi4vY29yZS9ndWFyZHMnO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHsgQmFubmVyQ29tcG9uZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Jhbm5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgYmFubmVyTWVzc2FnZSB9IGZyb20gJy4uLy4uL3NoYXJlZC9lcnJvci1jb3B5JztcblxuLyoqXG4gKiAvbG9naW4gKEd1ZXN0R3VhcmQpLiBMb2dpbiBieSBlbWFpbCBvciBwaG9uZSArIHBhc3N3b3JkLlxuICpcbiAqIDAzLUNPTlRFWFQtQ09SRS1BVVRILm1kOiBzdWNjZXNzIC0+IHJldHVyblVybCBvciBob21lOyBmYWlsdXJlcyBzaG93IE9ORVxuICogZ2VuZXJpYyBiYW5uZXIgKDQwMSBpcyBuZXZlciByZXZlYWxlZCBhcyBcIndyb25nIHBhc3N3b3JkXCIsIDQyOSBnZXRzIHRoZVxuICogc2xvdy1kb3duIGNvcHkpLiA/c2Vzc2lvbj1leHBpcmVkIChmcm9tIHRoZSBpbnRlcmNlcHRvcikgLT4gaW5mbyBub3RlO1xuICogP3Jlc2V0PW9rIChmcm9tIHRoZSByZXNldCBmbG93KSAtPiBzdWNjZXNzIGluZm8gbm90ZS5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLWxvZ2luLXBhZ2UnLFxuICBpbXBvcnRzOiBbUmVhY3RpdmVGb3Jtc01vZHVsZSwgUm91dGVyTGluaywgQmFubmVyQ29tcG9uZW50LCBUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2xvZ2luLXBhZ2UuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi9sb2dpbi1wYWdlLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgTG9naW5QYWdlIGltcGxlbWVudHMgT25Jbml0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBzdG9yZSA9IGluamVjdChBdXRoU3RvcmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvdXRlID0gaW5qZWN0KEFjdGl2YXRlZFJvdXRlKTtcbiAgLyoqIFRoZSBpMThuIHNlYW06IHRoZSBiYW5uZXIncyBjbGllbnQtYXV0aG9yZWQgZXJyb3IuKiBjb3B5IHJlc29sdmVzIGluXG4gICAqICB0aGUgYWN0aXZlIGxvY2FsZSAoTjcgaTE4bi1jb21wbGV0ZW5lc3MpLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuXG4gIHJlYWRvbmx5IGZvcm0gPSBuZXcgRm9ybUdyb3VwKHtcbiAgICBlbWFpbE9yUGhvbmU6IG5ldyBGb3JtQ29udHJvbCgnJywgeyBub25OdWxsYWJsZTogdHJ1ZSwgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWRdIH0pLFxuICAgIHBhc3N3b3JkOiBuZXcgRm9ybUNvbnRyb2woJycsIHsgbm9uTnVsbGFibGU6IHRydWUsIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkXSB9KSxcbiAgfSk7XG5cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHBlbmRpbmcgPSBzaWduYWwoZmFsc2UpO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZXJyb3IgPSBzaWduYWw8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUcnVlIHdoZW4gdGhlIGludGVyY2VwdG9yIGJvdW5jZWQgdXMgaGVyZSB3aXRoID9zZXNzaW9uPWV4cGlyZWQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzZXNzaW9uRXhwaXJlZCA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKiBUcnVlIHdoZW4gdGhlIHBhc3N3b3JkLXJlc2V0IGZsb3cgbGFuZGVkIHVzIGhlcmUgd2l0aCA/cmVzZXQ9b2suICovXG4gIHByb3RlY3RlZCByZWFkb25seSByZXNldE9rID0gc2lnbmFsKGZhbHNlKTtcblxuICBwcml2YXRlIGRlc3RpbmF0aW9uID0gJy9tYXAnO1xuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5yb3V0ZS5zbmFwc2hvdC5xdWVyeVBhcmFtTWFwO1xuICAgIHRoaXMuc2Vzc2lvbkV4cGlyZWQuc2V0KHF1ZXJ5LmdldCgnc2Vzc2lvbicpID09PSAnZXhwaXJlZCcpO1xuICAgIHRoaXMucmVzZXRPay5zZXQocXVlcnkuZ2V0KCdyZXNldCcpID09PSAnb2snKTtcbiAgICB0aGlzLmRlc3RpbmF0aW9uID0gc2FmZVJldHVyblVybChxdWVyeS5nZXQoJ3JldHVyblVybCcpKTtcbiAgfVxuXG4gIGFzeW5jIHN1Ym1pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5mb3JtLmludmFsaWQpIHtcbiAgICAgIHRoaXMuZm9ybS5tYXJrQWxsQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucGVuZGluZy5zZXQodHJ1ZSk7XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgY29uc3QgeyBlbWFpbE9yUGhvbmUsIHBhc3N3b3JkIH0gPSB0aGlzLmZvcm0uZ2V0UmF3VmFsdWUoKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zdG9yZS5sb2dpbihlbWFpbE9yUGhvbmUsIHBhc3N3b3JkKTtcbiAgICAgIGF3YWl0IHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy5kZXN0aW5hdGlvbik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZXJyb3IsICdsb2dpbicsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5wZW5kaW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG59XG4iLCI8c2VjdGlvbiBjbGFzcz1cImF1dGgtY2FyZFwiPlxuICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2F1dGhQYWdlLmxvZ2luLnRpdGxlJyB8IHQgfX08L2gxPlxuICA8cCBjbGFzcz1cInBhZ2Utc3VidGl0bGVcIj57eyAnYXV0aFBhZ2UubG9naW4uc3VidGl0bGUnIHwgdCB9fTwvcD5cblxuICA8YXBwLWJhbm5lclxuICAgIHNldmVyaXR5PVwiaW5mb1wiXG4gICAgW21lc3NhZ2VdPVwic2Vzc2lvbkV4cGlyZWQoKSA/ICgnYXV0aFBhZ2UubG9naW4uc2Vzc2lvbkV4cGlyZWQnIHwgdCkgOiBudWxsXCJcbiAgLz5cbiAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJpbmZvXCIgW21lc3NhZ2VdPVwicmVzZXRPaygpID8gKCdhdXRoUGFnZS5sb2dpbi5yZXNldE9rJyB8IHQpIDogbnVsbFwiIC8+XG5cbiAgPGZvcm0gW2Zvcm1Hcm91cF09XCJmb3JtXCIgKG5nU3VibWl0KT1cInN1Ym1pdCgpXCIgbm92YWxpZGF0ZT5cbiAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgIDxsYWJlbCBmb3I9XCJsb2dpbi1jb250YWN0XCI+e3sgJ2F1dGhQYWdlLmxvZ2luLmNvbnRhY3RMYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgIDwhLS0gYTExeSAoV0NBRyAyLjEgNC4xLjMsIHRoZSAvc3VibWl0IGNvbnZlbnRpb24pOiB0aGUgZXJyb3IgbGluZSBpc1xuICAgICAgICAgICBhIGxpdmUgcmVnaW9uIChyb2xlPWFsZXJ0KSBBTkQgd2lyZWQgdG8gdGhlIGNvbnRyb2wg4oCUIGFyaWEtaW52YWxpZFxuICAgICAgICAgICB3aGlsZSBpdCBpcyBzaG93biwgYXJpYS1kZXNjcmliZWRieSBwb2ludGluZyBhdCB0aGUgZXJyb3IgZWxlbWVudC5cbiAgICAgICAgICAgQGxldCBob2xkcyB0aGUgc2luZ2xlIGNvbmRpdGlvbiB0aGUgQGlmIHJlbmRlcnMgb24sIHNvIHRoZSBpbnB1dFxuICAgICAgICAgICBiaW5kaW5ncyBhbmQgdGhlIEBpZiBjYW4gbmV2ZXIgZGlzYWdyZWUuIC0tPlxuICAgICAgQGxldCBjb250YWN0SW52YWxpZCA9XG4gICAgICAgIGZvcm0uY29udHJvbHMuZW1haWxPclBob25lLnRvdWNoZWQgJiYgZm9ybS5jb250cm9scy5lbWFpbE9yUGhvbmUuaW52YWxpZDtcbiAgICAgIDxpbnB1dFxuICAgICAgICBpZD1cImxvZ2luLWNvbnRhY3RcIlxuICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgIGZvcm1Db250cm9sTmFtZT1cImVtYWlsT3JQaG9uZVwiXG4gICAgICAgIGF1dG9jb21wbGV0ZT1cInVzZXJuYW1lXCJcbiAgICAgICAgW3BsYWNlaG9sZGVyXT1cIidhdXRoUGFnZS5sb2dpbi5jb250YWN0UGxhY2Vob2xkZXInIHwgdFwiXG4gICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJjb250YWN0SW52YWxpZCA/ICd0cnVlJyA6IG51bGxcIlxuICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cImNvbnRhY3RJbnZhbGlkID8gJ2xvZ2luLWNvbnRhY3QtZXJyb3InIDogbnVsbFwiXG4gICAgICAvPlxuICAgICAgQGlmIChjb250YWN0SW52YWxpZCkge1xuICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCIgaWQ9XCJsb2dpbi1jb250YWN0LWVycm9yXCIgcm9sZT1cImFsZXJ0XCI+XG4gICAgICAgICAge3sgJ2F1dGhQYWdlLmxvZ2luLmNvbnRhY3RSZXF1aXJlZCcgfCB0IH19XG4gICAgICAgIDwvcD5cbiAgICAgIH1cbiAgICA8L2Rpdj5cblxuICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgPGxhYmVsIGZvcj1cImxvZ2luLXBhc3N3b3JkXCI+e3sgJ2F1dGhQYWdlLmxvZ2luLnBhc3N3b3JkTGFiZWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICA8IS0tIGExMXk6IHNhbWUgcGF0dGVybiBhcyB0aGUgY29udGFjdCBmaWVsZCBhYm92ZS4gLS0+XG4gICAgICBAbGV0IHBhc3N3b3JkSW52YWxpZCA9IGZvcm0uY29udHJvbHMucGFzc3dvcmQudG91Y2hlZCAmJiBmb3JtLmNvbnRyb2xzLnBhc3N3b3JkLmludmFsaWQ7XG4gICAgICA8aW5wdXRcbiAgICAgICAgaWQ9XCJsb2dpbi1wYXNzd29yZFwiXG4gICAgICAgIHR5cGU9XCJwYXNzd29yZFwiXG4gICAgICAgIGZvcm1Db250cm9sTmFtZT1cInBhc3N3b3JkXCJcbiAgICAgICAgYXV0b2NvbXBsZXRlPVwiY3VycmVudC1wYXNzd29yZFwiXG4gICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJwYXNzd29yZEludmFsaWQgPyAndHJ1ZScgOiBudWxsXCJcbiAgICAgICAgW2F0dHIuYXJpYS1kZXNjcmliZWRieV09XCJwYXNzd29yZEludmFsaWQgPyAnbG9naW4tcGFzc3dvcmQtZXJyb3InIDogbnVsbFwiXG4gICAgICAvPlxuICAgICAgQGlmIChwYXNzd29yZEludmFsaWQpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1lcnJvclwiIGlkPVwibG9naW4tcGFzc3dvcmQtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICB7eyAnYXV0aFBhZ2UubG9naW4ucGFzc3dvcmRSZXF1aXJlZCcgfCB0IH19XG4gICAgICAgIDwvcD5cbiAgICAgIH1cbiAgICA8L2Rpdj5cblxuICAgIDxhcHAtYmFubmVyIHNldmVyaXR5PVwiZXJyb3JcIiBbbWVzc2FnZV09XCJlcnJvcigpXCIgLz5cblxuICAgIDxidXR0b24gdHlwZT1cInN1Ym1pdFwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeSBidG4tLWJsb2NrXCIgW2Rpc2FibGVkXT1cInBlbmRpbmcoKVwiPlxuICAgICAge3sgcGVuZGluZygpID8gKCdhdXRoUGFnZS5sb2dpbi5zdWJtaXR0aW5nJyB8IHQpIDogKCdhdXRoUGFnZS5sb2dpbi5zdWJtaXQnIHwgdCkgfX1cbiAgICA8L2J1dHRvbj5cbiAgPC9mb3JtPlxuXG4gIDxwIGNsYXNzPVwiYXV0aC1saW5rc1wiPlxuICAgIDxhIHJvdXRlckxpbms9XCIvcmVzZXRcIj57eyAnYXV0aFBhZ2UubG9naW4uZm9yZ290JyB8IHQgfX08L2E+XG4gICAgJm1pZGRvdDsge3sgJ2F1dGhQYWdlLmxvZ2luLm5vQWNjb3VudCcgfCB0IH19XG4gICAgPGEgcm91dGVyTGluaz1cIi9yZWdpc3RlclwiPnt7ICdhdXRoUGFnZS5sb2dpbi5jcmVhdGVPbmUnIHwgdCB9fTwvYT5cbiAgPC9wPlxuXG4gIDxwIGNsYXNzPVwiYXV0aC1saW5rc1wiPlxuICAgIDxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiPnt7ICdhdXRoUGFnZS5wcml2YWN5UG9saWN5JyB8IHQgfX08L2E+XG4gICAgJm1pZGRvdDsgPGEgcm91dGVyTGluaz1cIi90ZXJtc1wiPnt7ICdhdXRoUGFnZS50ZXJtc09mVXNlJyB8IHQgfX08L2E+XG4gIDwvcD5cbjwvc2VjdGlvbj5cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FB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