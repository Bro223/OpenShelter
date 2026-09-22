import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-6HMINPQ7.js");import {
  AuthStore
} from "/chunk-QATQGZY5.js";
import "/chunk-T7PPW65J.js";
import {
  BannerComponent,
  bannerMessage,
  toApiError
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/auth/register-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
function RegisterPage_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 1);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "p", 2);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275pipe(6, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(7, "a", 3);
    i0.\u0275\u0275text(8);
    i0.\u0275\u0275pipe(9, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 3, "authPage.register.createdTitle"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 5, "authPage.register.createdBody"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(9, 7, "authPage.register.submit"));
  }
}
function RegisterPage_Conditional_1_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 8);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "authPage.register.nameRequired"), " ");
  }
}
function RegisterPage_Conditional_1_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 12);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275nextContext();
    const emailDupError_r3 = i0.\u0275\u0275readContextLet(18);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", emailDupError_r3 ?? i0.\u0275\u0275pipeBind1(2, 1, "authPage.register.emailRequired"), " ");
  }
}
function RegisterPage_Conditional_1_Conditional_35_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 16);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275nextContext();
    const phoneDupError_r4 = i0.\u0275\u0275readContextLet(29);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", phoneDupError_r4 ?? i0.\u0275\u0275pipeBind1(2, 1, "authPage.register.phoneRequired"), " ");
  }
}
function RegisterPage_Conditional_1_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 19);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.form.controls.password.hasError("required") ? i0.\u0275\u0275pipeBind1(2, 1, "authPage.register.passwordRequired") : i0.\u0275\u0275pipeBind1(3, 3, "authPage.register.passwordTooShort"), " ");
  }
}
function RegisterPage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 1);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "p", 2);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275pipe(6, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(7, "form", 4);
    i0.\u0275\u0275listener("ngSubmit", function RegisterPage_Conditional_1_Template_form_ngSubmit_7_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.submit());
    });
    i0.\u0275\u0275elementStart(8, "div", 5)(9, "label", 6);
    i0.\u0275\u0275text(10);
    i0.\u0275\u0275pipe(11, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(12, "input", 7);
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(13, RegisterPage_Conditional_1_Conditional_13_Template, 3, 3, "p", 8);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(14, "div", 5)(15, "label", 9);
    i0.\u0275\u0275text(16);
    i0.\u0275\u0275pipe(17, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275declareLet(18);
    i0.\u0275\u0275element(19, "input", 10);
    i0.\u0275\u0275pipe(20, "t");
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275elementStart(21, "p", 11);
    i0.\u0275\u0275text(22);
    i0.\u0275\u0275pipe(23, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(24, RegisterPage_Conditional_1_Conditional_24_Template, 3, 3, "p", 12);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(25, "div", 5)(26, "label", 13);
    i0.\u0275\u0275text(27);
    i0.\u0275\u0275pipe(28, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275declareLet(29);
    i0.\u0275\u0275element(30, "input", 14);
    i0.\u0275\u0275pipe(31, "t");
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275elementStart(32, "p", 15);
    i0.\u0275\u0275text(33);
    i0.\u0275\u0275pipe(34, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(35, RegisterPage_Conditional_1_Conditional_35_Template, 3, 3, "p", 16);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(36, "div", 5)(37, "label", 17);
    i0.\u0275\u0275text(38);
    i0.\u0275\u0275pipe(39, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(40, "input", 18);
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(41, RegisterPage_Conditional_1_Conditional_41_Template, 4, 5, "p", 19);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(42, "app-banner", 20);
    i0.\u0275\u0275elementStart(43, "button", 21);
    i0.\u0275\u0275text(44);
    i0.\u0275\u0275pipe(45, "t");
    i0.\u0275\u0275pipe(46, "t");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(47, "p", 22);
    i0.\u0275\u0275text(48);
    i0.\u0275\u0275pipe(49, "t");
    i0.\u0275\u0275elementStart(50, "a", 23);
    i0.\u0275\u0275text(51);
    i0.\u0275\u0275pipe(52, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275text(53);
    i0.\u0275\u0275pipe(54, "t");
    i0.\u0275\u0275elementStart(55, "a", 24);
    i0.\u0275\u0275text(56);
    i0.\u0275\u0275pipe(57, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275text(58);
    i0.\u0275\u0275pipe(59, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(60, "p", 22);
    i0.\u0275\u0275text(61);
    i0.\u0275\u0275pipe(62, "t");
    i0.\u0275\u0275elementStart(63, "a", 25);
    i0.\u0275\u0275text(64);
    i0.\u0275\u0275pipe(65, "t");
    i0.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 33, "authPage.register.title"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 35, "authPage.register.subtitle"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("formGroup", ctx_r1.form);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(11, 37, "authPage.register.nameLabel"));
    const nameInvalid_r5 = ctx_r1.form.controls.name.touched && ctx_r1.form.controls.name.invalid;
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275attribute("aria-invalid", nameInvalid_r5 ? "true" : null)("aria-describedby", nameInvalid_r5 ? "register-name-error" : null);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(nameInvalid_r5 ? 13 : -1);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(17, 39, "authPage.register.emailLabel"));
    const emailInvalid_r6 = ctx_r1.form.controls.email.touched && ctx_r1.form.controls.email.invalid;
    i0.\u0275\u0275advance(2);
    const emailDupError_r7 = i0.\u0275\u0275storeLet(ctx_r1.duplicate()?.field === "email" ? ctx_r1.duplicate()?.message : null);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(20, 42, "authPage.register.emailPlaceholder"));
    i0.\u0275\u0275attribute("aria-invalid", emailInvalid_r6 || emailDupError_r7 !== null ? "true" : null)("aria-describedby", emailInvalid_r6 || emailDupError_r7 !== null ? "register-email-note register-email-error" : "register-email-note");
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(23, 44, "authPage.register.emailNote"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(emailDupError_r7 !== null || emailInvalid_r6 ? 24 : -1);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(28, 46, "authPage.register.phoneLabel"));
    const phoneInvalid_r8 = ctx_r1.form.controls.phone.touched && ctx_r1.form.controls.phone.invalid;
    i0.\u0275\u0275advance(2);
    const phoneDupError_r9 = i0.\u0275\u0275storeLet(ctx_r1.duplicate()?.field === "phone" ? ctx_r1.duplicate()?.message : null);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(31, 49, "authPage.register.phonePlaceholder"));
    i0.\u0275\u0275attribute("aria-invalid", phoneInvalid_r8 || phoneDupError_r9 !== null ? "true" : null)("aria-describedby", phoneInvalid_r8 || phoneDupError_r9 !== null ? "register-phone-note register-phone-error" : "register-phone-note");
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(34, 51, "authPage.register.phoneNote"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(phoneDupError_r9 !== null || phoneInvalid_r8 ? 35 : -1);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(39, 53, "authPage.register.passwordLabel"));
    const passwordInvalid_r10 = ctx_r1.form.controls.password.touched && ctx_r1.form.controls.password.invalid;
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275attribute("aria-invalid", passwordInvalid_r10 ? "true" : null)("aria-describedby", passwordInvalid_r10 ? "register-password-error" : null);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(passwordInvalid_r10 ? 41 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("message", ctx_r1.error());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("disabled", ctx_r1.pending());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.pending() ? i0.\u0275\u0275pipeBind1(45, 55, "authPage.register.submitting") : i0.\u0275\u0275pipeBind1(46, 57, "authPage.register.submit"), " ");
    i0.\u0275\u0275advance(4);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(49, 59, "authPage.register.agreeLead"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(52, 61, "authPage.register.agreeTerms"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(54, 63, "authPage.register.agreeAnd"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(57, 65, "authPage.register.agreePrivacy"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(59, 67, "authPage.register.agreeTail"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(62, 69, "authPage.register.haveAccount"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(65, 71, "authPage.register.submit"));
  }
}
var RegisterPage = class _RegisterPage {
  store = inject(AuthStore);
  /** The i18n seam: the banner's client-authored error.* copy resolves in
   *  the active locale (N7 i18n-completeness). */
  i18n = inject(I18nService);
  form = new FormGroup({
    name: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    phone: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    // minLength mirrors the server's @Size(min = 8) on
    // RegisterRequest.password — a short password is a client-side field
    // error, not a 400 the banner would have to carry.
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
    })
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
  /** 201 — account created, no session yet. */
  registered = signal(
    false,
    ...ngDevMode ? [{ debugName: "registered" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The 409 body names the duplicated field ("an account with this
   * email/phone already exists") — surface it inline on that field.
   * A 409 without a recognizable field keeps the banner fallback.
   */
  duplicate = signal(
    null,
    ...ngDevMode ? [{ debugName: "duplicate" }] : (
      /* istanbul ignore next */
      []
    )
  );
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.duplicate.set(null);
    const values = this.form.getRawValue();
    const request = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      password: values.password
    };
    try {
      await this.store.register(request);
      this.registered.set(true);
    } catch (error) {
      const api = toApiError(error);
      const field = api.status === 409 && /email/i.test(api.message) ? "email" : api.status === 409 && /phone/i.test(api.message) ? "phone" : null;
      if (field) {
        this.duplicate.set({ field, message: api.message });
      } else {
        this.error.set(bannerMessage(error, "register", (key) => this.i18n.t(key)));
      }
    } finally {
      this.pending.set(false);
    }
  }
  static \u0275fac = function RegisterPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RegisterPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _RegisterPage, selectors: [["app-register-page"]], decls: 2, vars: 1, consts: [[1, "auth-card"], [1, "page-title"], [1, "page-subtitle"], ["routerLink", "/login", 1, "btn", "btn--primary"], ["novalidate", "", 3, "ngSubmit", "formGroup"], [1, "field"], ["for", "register-name"], ["id", "register-name", "type", "text", "formControlName", "name", "autocomplete", "name"], ["id", "register-name-error", "role", "alert", 1, "field-error"], ["for", "register-email"], ["id", "register-email", "type", "email", "formControlName", "email", "autocomplete", "email", 3, "placeholder"], ["id", "register-email-note", 1, "field-note"], ["id", "register-email-error", "role", "alert", 1, "field-error"], ["for", "register-phone"], ["id", "register-phone", "type", "tel", "formControlName", "phone", "autocomplete", "tel", 3, "placeholder"], ["id", "register-phone-note", 1, "field-note"], ["id", "register-phone-error", "role", "alert", 1, "field-error"], ["for", "register-password"], ["id", "register-password", "type", "password", "formControlName", "password", "autocomplete", "new-password"], ["id", "register-password-error", "role", "alert", 1, "field-error"], ["severity", "error", 3, "message"], ["type", "submit", 1, "btn", "btn--primary", "btn--block", 3, "disabled"], [1, "auth-links"], ["routerLink", "/terms"], ["routerLink", "/privacy"], ["routerLink", "/login"]], template: function RegisterPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275conditionalCreate(0, RegisterPage_Conditional_0_Template, 10, 9, "section", 0)(1, RegisterPage_Conditional_1_Template, 66, 73, "section", 0);
    }
    if (rf & 2) {
      i0.\u0275\u0275conditional(ctx.registered() ? 0 : 1);
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, BannerComponent, TranslatePipe], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.auth-card[_ngcontent-%COMP%] {\n  max-width: 26rem;\n  margin: var(--%NS%space-32) auto 0;\n}\n.auth-links[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-18);\n  font-size: var(--%NS%text-md);\n  text-align: center;\n}\n.field-note[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: var(--%NS%space-6) 0 0;\n}\n/*# sourceMappingURL=register-page.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(RegisterPage, [{
    type: Component,
    args: [{ selector: "app-register-page", imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (registered()) {
  <section class="auth-card">
    <h1 class="page-title">{{ 'authPage.register.createdTitle' | t }}</h1>
    <p class="page-subtitle">{{ 'authPage.register.createdBody' | t }}</p>
    <a routerLink="/login" class="btn btn--primary">{{ 'authPage.register.submit' | t }}</a>
  </section>
} @else {
  <section class="auth-card">
    <h1 class="page-title">{{ 'authPage.register.title' | t }}</h1>
    <p class="page-subtitle">{{ 'authPage.register.subtitle' | t }}</p>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="register-name">{{ 'authPage.register.nameLabel' | t }}</label>
        <!-- a11y (WCAG 2.1 4.1.3, the /submit convention): the error line is
             a live region (role=alert) AND wired to the control \u2014
             aria-invalid while it is shown, aria-describedby pointing at the
             error element. @let holds the single condition the @if renders
             on, so the input bindings and the @if can never disagree. -->
        @let nameInvalid = form.controls.name.touched && form.controls.name.invalid;
        <input
          id="register-name"
          type="text"
          formControlName="name"
          autocomplete="name"
          [attr.aria-invalid]="nameInvalid ? 'true' : null"
          [attr.aria-describedby]="nameInvalid ? 'register-name-error' : null"
        />
        @if (nameInvalid) {
          <p class="field-error" id="register-name-error" role="alert">
            {{ 'authPage.register.nameRequired' | t }}
          </p>
        }
      </div>

      <div class="field">
        <label for="register-email">{{ 'authPage.register.emailLabel' | t }}</label>
        <!-- a11y: the describedby list always carries the field NOTE (the
             persistent description) and gains the error id while an error is
             shown (the 409 duplicate message or the validation message \u2014
             both branches render the SAME id, never both at once). -->
        @let emailInvalid = form.controls.email.touched && form.controls.email.invalid;
        @let emailDupError = duplicate()?.field === 'email' ? duplicate()?.message : null;
        <input
          id="register-email"
          type="email"
          formControlName="email"
          autocomplete="email"
          [placeholder]="'authPage.register.emailPlaceholder' | t"
          [attr.aria-invalid]="emailInvalid || emailDupError !== null ? 'true' : null"
          [attr.aria-describedby]="
            emailInvalid || emailDupError !== null
              ? 'register-email-note register-email-error'
              : 'register-email-note'
          "
        />
        <!-- legal-recovery: why-we-collect copy \u2014 verification
             + account recovery, the only two uses (see /privacy). -->
        <p class="field-note" id="register-email-note">{{ 'authPage.register.emailNote' | t }}</p>
        <!-- ONE error slot: the 409 duplicate message wins (it is more
             specific), else the validation message. -->
        @if (emailDupError !== null || emailInvalid) {
          <p class="field-error" id="register-email-error" role="alert">
            {{ emailDupError ?? ('authPage.register.emailRequired' | t) }}
          </p>
        }
      </div>

      <div class="field">
        <label for="register-phone">{{ 'authPage.register.phoneLabel' | t }}</label>
        <!-- a11y: same pattern as the email field. -->
        @let phoneInvalid = form.controls.phone.touched && form.controls.phone.invalid;
        @let phoneDupError = duplicate()?.field === 'phone' ? duplicate()?.message : null;
        <input
          id="register-phone"
          type="tel"
          formControlName="phone"
          autocomplete="tel"
          [placeholder]="'authPage.register.phonePlaceholder' | t"
          [attr.aria-invalid]="phoneInvalid || phoneDupError !== null ? 'true' : null"
          [attr.aria-describedby]="
            phoneInvalid || phoneDupError !== null
              ? 'register-phone-note register-phone-error'
              : 'register-phone-note'
          "
        />
        <p class="field-note" id="register-phone-note">{{ 'authPage.register.phoneNote' | t }}</p>
        <!-- ONE error slot: the 409 duplicate message wins, else the
             validation message (same rule as the email field). -->
        @if (phoneDupError !== null || phoneInvalid) {
          <p class="field-error" id="register-phone-error" role="alert">
            {{ phoneDupError ?? ('authPage.register.phoneRequired' | t) }}
          </p>
        }
      </div>

      <div class="field">
        <label for="register-password">{{ 'authPage.register.passwordLabel' | t }}</label>
        <!-- a11y: same pattern as the name field. -->
        @let passwordInvalid = form.controls.password.touched && form.controls.password.invalid;
        <input
          id="register-password"
          type="password"
          formControlName="password"
          autocomplete="new-password"
          [attr.aria-invalid]="passwordInvalid ? 'true' : null"
          [attr.aria-describedby]="passwordInvalid ? 'register-password-error' : null"
        />
        @if (passwordInvalid) {
          <!-- One error slot: the message follows the failing rule
               (required, or the 8-character floor the backend enforces). -->
          <p class="field-error" id="register-password-error" role="alert">
            {{
              form.controls.password.hasError('required')
                ? ('authPage.register.passwordRequired' | t)
                : ('authPage.register.passwordTooShort' | t)
            }}
          </p>
        }
      </div>

      <app-banner severity="error" [message]="error()" />

      <button type="submit" class="btn btn--primary btn--block" [disabled]="pending()">
        {{ pending() ? ('authPage.register.submitting' | t) : ('authPage.register.submit' | t) }}
      </button>
    </form>

    <p class="auth-links">
      {{ 'authPage.register.agreeLead' | t }}
      <a routerLink="/terms">{{ 'authPage.register.agreeTerms' | t }}</a>
      {{ 'authPage.register.agreeAnd' | t }}
      <a routerLink="/privacy">{{ 'authPage.register.agreePrivacy' | t }}</a
      >{{ 'authPage.register.agreeTail' | t }}
    </p>

    <p class="auth-links">
      {{ 'authPage.register.haveAccount' | t }}
      <a routerLink="/login">{{ 'authPage.register.submit' | t }}</a>
    </p>
  </section>
}
`, styles: ["/* src/app/features/auth/register-page.scss */\n:host {\n  display: block;\n}\n.auth-card {\n  max-width: 26rem;\n  margin: var(--space-32) auto 0;\n}\n.auth-links {\n  margin-top: var(--space-18);\n  font-size: var(--text-md);\n  text-align: center;\n}\n.field-note {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: var(--space-6) 0 0;\n}\n/*# sourceMappingURL=register-page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(RegisterPage, { className: "RegisterPage", filePath: "src/app/features/auth/register-page.ts", lineNumber: 31 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fauth%2Fregister-page.ts%40RegisterPage";
  function RegisterPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(RegisterPage, m.default, [i0, i1], [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && RegisterPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && RegisterPage_HmrLoad(d.timestamp)));
})();
export {
  RegisterPage
};
//# debugId=cc8f58ea-f16a-592f-939d-7f84e44cad7e


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvYXV0aC9yZWdpc3Rlci1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9hdXRoL3JlZ2lzdGVyLXBhZ2UuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbmplY3QsIHNpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgRm9ybUNvbnRyb2wsIEZvcm1Hcm91cCwgUmVhY3RpdmVGb3Jtc01vZHVsZSwgVmFsaWRhdG9ycyB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7IFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgdG9BcGlFcnJvciB9IGZyb20gJy4uLy4uL2NvcmUvYXBpLWVycm9yJztcbmltcG9ydCB0eXBlIHsgUmVnaXN0ZXJSZXF1ZXN0IH0gZnJvbSAnLi4vLi4vY29yZS9tb2RlbHMnO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHsgQXV0aFN0b3JlIH0gZnJvbSAnLi4vLi4vc2Vzc2lvbi9hdXRoLXN0b3JlJztcbmltcG9ydCB7IEJhbm5lckNvbXBvbmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9iYW5uZXIuY29tcG9uZW50JztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5cbi8qKlxuICogL3JlZ2lzdGVyIChHdWVzdEd1YXJkKS4gVmFsaWRhdG9ycyBtaXJyb3IgdGhlIGJhY2tlbmQgUmVnaXN0ZXJSZXF1ZXN0XG4gKiAoQE5vdEJsYW5rIG9uIGV2ZXJ5IGZpZWxkLCBARW1haWwgb24gZW1haWwsIEBTaXplKG1pbiA9IDgsIG1heCA9IDIwMClcbiAqIG9uIHBhc3N3b3JkKSDigJQgbm90aGluZyBzdHJpY3Rlciwgc28gYSB2YWxpZCBiYWNrZW5kIHBheWxvYWQgaXMgbmV2ZXJcbiAqIGJsb2NrZWQgY2xpZW50LXNpZGUsIGFuZCB0aGUgOC1jaGFyYWN0ZXIgcGFzc3dvcmQgZmxvb3IgaXMgYSBjbGllbnQtXG4gKiBzaWRlIEZJRUxEIEVSUk9SICh0aGUgYXV0aFBhZ2UucmVnaXN0ZXIucGFzc3dvcmRUb29TaG9ydCBsaW5lKSBpbnN0ZWFkXG4gKiBvZiBhIDQwMCBiYW5uZXIg4oCUIHRoZSBzYW1lIFVYIC9yZXNldCBhbHJlYWR5IGhhcy5cbiAqXG4gKiAyMDEgLT4gc3VjY2VzcyB2aWV3IChyZWdpc3RlciAhPSBsb2dpbiDigJQgbm8gc2Vzc2lvbikuIDQwOSAoZHVwbGljYXRlXG4gKiBlbWFpbC9waG9uZSkgLT4gaW5saW5lIGVycm9yIHdpdGggdGhlIGJhY2tlbmQncyBzcGVjaWZpYyBtZXNzYWdlOyA0MjkgLT5cbiAqIHNsb3ctZG93biBjb3B5OyBhbnkgNDAwIC0+IGJhY2tlbmQgdmFsaWRhdGlvbiBkZXRhaWwuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1yZWdpc3Rlci1wYWdlJyxcbiAgaW1wb3J0czogW1JlYWN0aXZlRm9ybXNNb2R1bGUsIFJvdXRlckxpbmssIEJhbm5lckNvbXBvbmVudCwgVHJhbnNsYXRlUGlwZV0sXG4gIHRlbXBsYXRlVXJsOiAnLi9yZWdpc3Rlci1wYWdlLmh0bWwnLFxuICBzdHlsZVVybDogJy4vcmVnaXN0ZXItcGFnZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIFJlZ2lzdGVyUGFnZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RvcmUgPSBpbmplY3QoQXV0aFN0b3JlKTtcbiAgLyoqIFRoZSBpMThuIHNlYW06IHRoZSBiYW5uZXIncyBjbGllbnQtYXV0aG9yZWQgZXJyb3IuKiBjb3B5IHJlc29sdmVzIGluXG4gICAqICB0aGUgYWN0aXZlIGxvY2FsZSAoTjcgaTE4bi1jb21wbGV0ZW5lc3MpLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuXG4gIHJlYWRvbmx5IGZvcm0gPSBuZXcgRm9ybUdyb3VwKHtcbiAgICBuYW1lOiBuZXcgRm9ybUNvbnRyb2woJycsIHsgbm9uTnVsbGFibGU6IHRydWUsIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkXSB9KSxcbiAgICBlbWFpbDogbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkLCBWYWxpZGF0b3JzLmVtYWlsXSxcbiAgICB9KSxcbiAgICBwaG9uZTogbmV3IEZvcm1Db250cm9sKCcnLCB7IG5vbk51bGxhYmxlOiB0cnVlLCB2YWxpZGF0b3JzOiBbVmFsaWRhdG9ycy5yZXF1aXJlZF0gfSksXG4gICAgLy8gbWluTGVuZ3RoIG1pcnJvcnMgdGhlIHNlcnZlcidzIEBTaXplKG1pbiA9IDgpIG9uXG4gICAgLy8gUmVnaXN0ZXJSZXF1ZXN0LnBhc3N3b3JkIOKAlCBhIHNob3J0IHBhc3N3b3JkIGlzIGEgY2xpZW50LXNpZGUgZmllbGRcbiAgICAvLyBlcnJvciwgbm90IGEgNDAwIHRoZSBiYW5uZXIgd291bGQgaGF2ZSB0byBjYXJyeS5cbiAgICBwYXNzd29yZDogbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkLCBWYWxpZGF0b3JzLm1pbkxlbmd0aCg4KV0sXG4gICAgfSksXG4gIH0pO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBwZW5kaW5nID0gc2lnbmFsKGZhbHNlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICAvKiogMjAxIOKAlCBhY2NvdW50IGNyZWF0ZWQsIG5vIHNlc3Npb24geWV0LiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcmVnaXN0ZXJlZCA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKlxuICAgKiBUaGUgNDA5IGJvZHkgbmFtZXMgdGhlIGR1cGxpY2F0ZWQgZmllbGQgKFwiYW4gYWNjb3VudCB3aXRoIHRoaXNcbiAgICogZW1haWwvcGhvbmUgYWxyZWFkeSBleGlzdHNcIikg4oCUIHN1cmZhY2UgaXQgaW5saW5lIG9uIHRoYXQgZmllbGQuXG4gICAqIEEgNDA5IHdpdGhvdXQgYSByZWNvZ25pemFibGUgZmllbGQga2VlcHMgdGhlIGJhbm5lciBmYWxsYmFjay5cbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSBkdXBsaWNhdGUgPSBzaWduYWw8eyBmaWVsZDogJ2VtYWlsJyB8ICdwaG9uZSc7IG1lc3NhZ2U6IHN0cmluZyB9IHwgbnVsbD4obnVsbCk7XG5cbiAgYXN5bmMgc3VibWl0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmZvcm0uaW52YWxpZCkge1xuICAgICAgdGhpcy5mb3JtLm1hcmtBbGxBc1RvdWNoZWQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5wZW5kaW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLmR1cGxpY2F0ZS5zZXQobnVsbCk7XG4gICAgY29uc3QgdmFsdWVzID0gdGhpcy5mb3JtLmdldFJhd1ZhbHVlKCk7XG4gICAgY29uc3QgcmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0ID0ge1xuICAgICAgbmFtZTogdmFsdWVzLm5hbWUudHJpbSgpLFxuICAgICAgZW1haWw6IHZhbHVlcy5lbWFpbC50cmltKCkudG9Mb3dlckNhc2UoKSxcbiAgICAgIHBob25lOiB2YWx1ZXMucGhvbmUudHJpbSgpLFxuICAgICAgcGFzc3dvcmQ6IHZhbHVlcy5wYXNzd29yZCxcbiAgICB9O1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnN0b3JlLnJlZ2lzdGVyKHJlcXVlc3QpO1xuICAgICAgdGhpcy5yZWdpc3RlcmVkLnNldCh0cnVlKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgYXBpID0gdG9BcGlFcnJvcihlcnJvcik7XG4gICAgICBjb25zdCBmaWVsZCA9XG4gICAgICAgIGFwaS5zdGF0dXMgPT09IDQwOSAmJiAvZW1haWwvaS50ZXN0KGFwaS5tZXNzYWdlKVxuICAgICAgICAgID8gKCdlbWFpbCcgYXMgY29uc3QpXG4gICAgICAgICAgOiBhcGkuc3RhdHVzID09PSA0MDkgJiYgL3Bob25lL2kudGVzdChhcGkubWVzc2FnZSlcbiAgICAgICAgICAgID8gKCdwaG9uZScgYXMgY29uc3QpXG4gICAgICAgICAgICA6IG51bGw7XG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgdGhpcy5kdXBsaWNhdGUuc2V0KHsgZmllbGQsIG1lc3NhZ2U6IGFwaS5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lcnJvci5zZXQoYmFubmVyTWVzc2FnZShlcnJvciwgJ3JlZ2lzdGVyJywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSkpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnBlbmRpbmcuc2V0KGZhbHNlKTtcbiAgICB9XG4gIH1cbn1cbiIsIkBpZiAocmVnaXN0ZXJlZCgpKSB7XG4gIDxzZWN0aW9uIGNsYXNzPVwiYXV0aC1jYXJkXCI+XG4gICAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICdhdXRoUGFnZS5yZWdpc3Rlci5jcmVhdGVkVGl0bGUnIHwgdCB9fTwvaDE+XG4gICAgPHAgY2xhc3M9XCJwYWdlLXN1YnRpdGxlXCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLmNyZWF0ZWRCb2R5JyB8IHQgfX08L3A+XG4gICAgPGEgcm91dGVyTGluaz1cIi9sb2dpblwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiPnt7ICdhdXRoUGFnZS5yZWdpc3Rlci5zdWJtaXQnIHwgdCB9fTwvYT5cbiAgPC9zZWN0aW9uPlxufSBAZWxzZSB7XG4gIDxzZWN0aW9uIGNsYXNzPVwiYXV0aC1jYXJkXCI+XG4gICAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICdhdXRoUGFnZS5yZWdpc3Rlci50aXRsZScgfCB0IH19PC9oMT5cbiAgICA8cCBjbGFzcz1cInBhZ2Utc3VidGl0bGVcIj57eyAnYXV0aFBhZ2UucmVnaXN0ZXIuc3VidGl0bGUnIHwgdCB9fTwvcD5cblxuICAgIDxmb3JtIFtmb3JtR3JvdXBdPVwiZm9ybVwiIChuZ1N1Ym1pdCk9XCJzdWJtaXQoKVwiIG5vdmFsaWRhdGU+XG4gICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgPGxhYmVsIGZvcj1cInJlZ2lzdGVyLW5hbWVcIj57eyAnYXV0aFBhZ2UucmVnaXN0ZXIubmFtZUxhYmVsJyB8IHQgfX08L2xhYmVsPlxuICAgICAgICA8IS0tIGExMXkgKFdDQUcgMi4xIDQuMS4zLCB0aGUgL3N1Ym1pdCBjb252ZW50aW9uKTogdGhlIGVycm9yIGxpbmUgaXNcbiAgICAgICAgICAgICBhIGxpdmUgcmVnaW9uIChyb2xlPWFsZXJ0KSBBTkQgd2lyZWQgdG8gdGhlIGNvbnRyb2wg4oCUXG4gICAgICAgICAgICAgYXJpYS1pbnZhbGlkIHdoaWxlIGl0IGlzIHNob3duLCBhcmlhLWRlc2NyaWJlZGJ5IHBvaW50aW5nIGF0IHRoZVxuICAgICAgICAgICAgIGVycm9yIGVsZW1lbnQuIEBsZXQgaG9sZHMgdGhlIHNpbmdsZSBjb25kaXRpb24gdGhlIEBpZiByZW5kZXJzXG4gICAgICAgICAgICAgb24sIHNvIHRoZSBpbnB1dCBiaW5kaW5ncyBhbmQgdGhlIEBpZiBjYW4gbmV2ZXIgZGlzYWdyZWUuIC0tPlxuICAgICAgICBAbGV0IG5hbWVJbnZhbGlkID0gZm9ybS5jb250cm9scy5uYW1lLnRvdWNoZWQgJiYgZm9ybS5jb250cm9scy5uYW1lLmludmFsaWQ7XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIGlkPVwicmVnaXN0ZXItbmFtZVwiXG4gICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgIGZvcm1Db250cm9sTmFtZT1cIm5hbWVcIlxuICAgICAgICAgIGF1dG9jb21wbGV0ZT1cIm5hbWVcIlxuICAgICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJuYW1lSW52YWxpZCA/ICd0cnVlJyA6IG51bGxcIlxuICAgICAgICAgIFthdHRyLmFyaWEtZGVzY3JpYmVkYnldPVwibmFtZUludmFsaWQgPyAncmVnaXN0ZXItbmFtZS1lcnJvcicgOiBudWxsXCJcbiAgICAgICAgLz5cbiAgICAgICAgQGlmIChuYW1lSW52YWxpZCkge1xuICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cInJlZ2lzdGVyLW5hbWUtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgIHt7ICdhdXRoUGFnZS5yZWdpc3Rlci5uYW1lUmVxdWlyZWQnIHwgdCB9fVxuICAgICAgICAgIDwvcD5cbiAgICAgICAgfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICA8bGFiZWwgZm9yPVwicmVnaXN0ZXItZW1haWxcIj57eyAnYXV0aFBhZ2UucmVnaXN0ZXIuZW1haWxMYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgICAgPCEtLSBhMTF5OiB0aGUgZGVzY3JpYmVkYnkgbGlzdCBhbHdheXMgY2FycmllcyB0aGUgZmllbGQgTk9URSAodGhlXG4gICAgICAgICAgICAgcGVyc2lzdGVudCBkZXNjcmlwdGlvbikgYW5kIGdhaW5zIHRoZSBlcnJvciBpZCB3aGlsZSBhbiBlcnJvciBpc1xuICAgICAgICAgICAgIHNob3duICh0aGUgNDA5IGR1cGxpY2F0ZSBtZXNzYWdlIG9yIHRoZSB2YWxpZGF0aW9uIG1lc3NhZ2Ug4oCUXG4gICAgICAgICAgICAgYm90aCBicmFuY2hlcyByZW5kZXIgdGhlIFNBTUUgaWQsIG5ldmVyIGJvdGggYXQgb25jZSkuIC0tPlxuICAgICAgICBAbGV0IGVtYWlsSW52YWxpZCA9IGZvcm0uY29udHJvbHMuZW1haWwudG91Y2hlZCAmJiBmb3JtLmNvbnRyb2xzLmVtYWlsLmludmFsaWQ7XG4gICAgICAgIEBsZXQgZW1haWxEdXBFcnJvciA9IGR1cGxpY2F0ZSgpPy5maWVsZCA9PT0gJ2VtYWlsJyA/IGR1cGxpY2F0ZSgpPy5tZXNzYWdlIDogbnVsbDtcbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgaWQ9XCJyZWdpc3Rlci1lbWFpbFwiXG4gICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICBmb3JtQ29udHJvbE5hbWU9XCJlbWFpbFwiXG4gICAgICAgICAgYXV0b2NvbXBsZXRlPVwiZW1haWxcIlxuICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInYXV0aFBhZ2UucmVnaXN0ZXIuZW1haWxQbGFjZWhvbGRlcicgfCB0XCJcbiAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwiZW1haWxJbnZhbGlkIHx8IGVtYWlsRHVwRXJyb3IgIT09IG51bGwgPyAndHJ1ZScgOiBudWxsXCJcbiAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cIlxuICAgICAgICAgICAgZW1haWxJbnZhbGlkIHx8IGVtYWlsRHVwRXJyb3IgIT09IG51bGxcbiAgICAgICAgICAgICAgPyAncmVnaXN0ZXItZW1haWwtbm90ZSByZWdpc3Rlci1lbWFpbC1lcnJvcidcbiAgICAgICAgICAgICAgOiAncmVnaXN0ZXItZW1haWwtbm90ZSdcbiAgICAgICAgICBcIlxuICAgICAgICAvPlxuICAgICAgICA8IS0tIGxlZ2FsLXJlY292ZXJ5OiB3aHktd2UtY29sbGVjdCBjb3B5IOKAlCB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICArIGFjY291bnQgcmVjb3ZlcnksIHRoZSBvbmx5IHR3byB1c2VzIChzZWUgL3ByaXZhY3kpLiAtLT5cbiAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1ub3RlXCIgaWQ9XCJyZWdpc3Rlci1lbWFpbC1ub3RlXCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLmVtYWlsTm90ZScgfCB0IH19PC9wPlxuICAgICAgICA8IS0tIE9ORSBlcnJvciBzbG90OiB0aGUgNDA5IGR1cGxpY2F0ZSBtZXNzYWdlIHdpbnMgKGl0IGlzIG1vcmVcbiAgICAgICAgICAgICBzcGVjaWZpYyksIGVsc2UgdGhlIHZhbGlkYXRpb24gbWVzc2FnZS4gLS0+XG4gICAgICAgIEBpZiAoZW1haWxEdXBFcnJvciAhPT0gbnVsbCB8fCBlbWFpbEludmFsaWQpIHtcbiAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCIgaWQ9XCJyZWdpc3Rlci1lbWFpbC1lcnJvclwiIHJvbGU9XCJhbGVydFwiPlxuICAgICAgICAgICAge3sgZW1haWxEdXBFcnJvciA/PyAoJ2F1dGhQYWdlLnJlZ2lzdGVyLmVtYWlsUmVxdWlyZWQnIHwgdCkgfX1cbiAgICAgICAgICA8L3A+XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgPGxhYmVsIGZvcj1cInJlZ2lzdGVyLXBob25lXCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBob25lTGFiZWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgIDwhLS0gYTExeTogc2FtZSBwYXR0ZXJuIGFzIHRoZSBlbWFpbCBmaWVsZC4gLS0+XG4gICAgICAgIEBsZXQgcGhvbmVJbnZhbGlkID0gZm9ybS5jb250cm9scy5waG9uZS50b3VjaGVkICYmIGZvcm0uY29udHJvbHMucGhvbmUuaW52YWxpZDtcbiAgICAgICAgQGxldCBwaG9uZUR1cEVycm9yID0gZHVwbGljYXRlKCk/LmZpZWxkID09PSAncGhvbmUnID8gZHVwbGljYXRlKCk/Lm1lc3NhZ2UgOiBudWxsO1xuICAgICAgICA8aW5wdXRcbiAgICAgICAgICBpZD1cInJlZ2lzdGVyLXBob25lXCJcbiAgICAgICAgICB0eXBlPVwidGVsXCJcbiAgICAgICAgICBmb3JtQ29udHJvbE5hbWU9XCJwaG9uZVwiXG4gICAgICAgICAgYXV0b2NvbXBsZXRlPVwidGVsXCJcbiAgICAgICAgICBbcGxhY2Vob2xkZXJdPVwiJ2F1dGhQYWdlLnJlZ2lzdGVyLnBob25lUGxhY2Vob2xkZXInIHwgdFwiXG4gICAgICAgICAgW2F0dHIuYXJpYS1pbnZhbGlkXT1cInBob25lSW52YWxpZCB8fCBwaG9uZUR1cEVycm9yICE9PSBudWxsID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgW2F0dHIuYXJpYS1kZXNjcmliZWRieV09XCJcbiAgICAgICAgICAgIHBob25lSW52YWxpZCB8fCBwaG9uZUR1cEVycm9yICE9PSBudWxsXG4gICAgICAgICAgICAgID8gJ3JlZ2lzdGVyLXBob25lLW5vdGUgcmVnaXN0ZXItcGhvbmUtZXJyb3InXG4gICAgICAgICAgICAgIDogJ3JlZ2lzdGVyLXBob25lLW5vdGUnXG4gICAgICAgICAgXCJcbiAgICAgICAgLz5cbiAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1ub3RlXCIgaWQ9XCJyZWdpc3Rlci1waG9uZS1ub3RlXCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBob25lTm90ZScgfCB0IH19PC9wPlxuICAgICAgICA8IS0tIE9ORSBlcnJvciBzbG90OiB0aGUgNDA5IGR1cGxpY2F0ZSBtZXNzYWdlIHdpbnMsIGVsc2UgdGhlXG4gICAgICAgICAgICAgdmFsaWRhdGlvbiBtZXNzYWdlIChzYW1lIHJ1bGUgYXMgdGhlIGVtYWlsIGZpZWxkKS4gLS0+XG4gICAgICAgIEBpZiAocGhvbmVEdXBFcnJvciAhPT0gbnVsbCB8fCBwaG9uZUludmFsaWQpIHtcbiAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCIgaWQ9XCJyZWdpc3Rlci1waG9uZS1lcnJvclwiIHJvbGU9XCJhbGVydFwiPlxuICAgICAgICAgICAge3sgcGhvbmVEdXBFcnJvciA/PyAoJ2F1dGhQYWdlLnJlZ2lzdGVyLnBob25lUmVxdWlyZWQnIHwgdCkgfX1cbiAgICAgICAgICA8L3A+XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgPGxhYmVsIGZvcj1cInJlZ2lzdGVyLXBhc3N3b3JkXCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBhc3N3b3JkTGFiZWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgIDwhLS0gYTExeTogc2FtZSBwYXR0ZXJuIGFzIHRoZSBuYW1lIGZpZWxkLiAtLT5cbiAgICAgICAgQGxldCBwYXNzd29yZEludmFsaWQgPSBmb3JtLmNvbnRyb2xzLnBhc3N3b3JkLnRvdWNoZWQgJiYgZm9ybS5jb250cm9scy5wYXNzd29yZC5pbnZhbGlkO1xuICAgICAgICA8aW5wdXRcbiAgICAgICAgICBpZD1cInJlZ2lzdGVyLXBhc3N3b3JkXCJcbiAgICAgICAgICB0eXBlPVwicGFzc3dvcmRcIlxuICAgICAgICAgIGZvcm1Db250cm9sTmFtZT1cInBhc3N3b3JkXCJcbiAgICAgICAgICBhdXRvY29tcGxldGU9XCJuZXctcGFzc3dvcmRcIlxuICAgICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJwYXNzd29yZEludmFsaWQgPyAndHJ1ZScgOiBudWxsXCJcbiAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cInBhc3N3b3JkSW52YWxpZCA/ICdyZWdpc3Rlci1wYXNzd29yZC1lcnJvcicgOiBudWxsXCJcbiAgICAgICAgLz5cbiAgICAgICAgQGlmIChwYXNzd29yZEludmFsaWQpIHtcbiAgICAgICAgICA8IS0tIE9uZSBlcnJvciBzbG90OiB0aGUgbWVzc2FnZSBmb2xsb3dzIHRoZSBmYWlsaW5nIHJ1bGVcbiAgICAgICAgICAgICAgIChyZXF1aXJlZCwgb3IgdGhlIDgtY2hhcmFjdGVyIGZsb29yIHRoZSBiYWNrZW5kIGVuZm9yY2VzKS4gLS0+XG4gICAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1lcnJvclwiIGlkPVwicmVnaXN0ZXItcGFzc3dvcmQtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgIHt7XG4gICAgICAgICAgICAgIGZvcm0uY29udHJvbHMucGFzc3dvcmQuaGFzRXJyb3IoJ3JlcXVpcmVkJylcbiAgICAgICAgICAgICAgICA/ICgnYXV0aFBhZ2UucmVnaXN0ZXIucGFzc3dvcmRSZXF1aXJlZCcgfCB0KVxuICAgICAgICAgICAgICAgIDogKCdhdXRoUGFnZS5yZWdpc3Rlci5wYXNzd29yZFRvb1Nob3J0JyB8IHQpXG4gICAgICAgICAgICB9fVxuICAgICAgICAgIDwvcD5cbiAgICAgICAgfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxhcHAtYmFubmVyIHNldmVyaXR5PVwiZXJyb3JcIiBbbWVzc2FnZV09XCJlcnJvcigpXCIgLz5cblxuICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5IGJ0bi0tYmxvY2tcIiBbZGlzYWJsZWRdPVwicGVuZGluZygpXCI+XG4gICAgICAgIHt7IHBlbmRpbmcoKSA/ICgnYXV0aFBhZ2UucmVnaXN0ZXIuc3VibWl0dGluZycgfCB0KSA6ICgnYXV0aFBhZ2UucmVnaXN0ZXIuc3VibWl0JyB8IHQpIH19XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L2Zvcm0+XG5cbiAgICA8cCBjbGFzcz1cImF1dGgtbGlua3NcIj5cbiAgICAgIHt7ICdhdXRoUGFnZS5yZWdpc3Rlci5hZ3JlZUxlYWQnIHwgdCB9fVxuICAgICAgPGEgcm91dGVyTGluaz1cIi90ZXJtc1wiPnt7ICdhdXRoUGFnZS5yZWdpc3Rlci5hZ3JlZVRlcm1zJyB8IHQgfX08L2E+XG4gICAgICB7eyAnYXV0aFBhZ2UucmVnaXN0ZXIuYWdyZWVBbmQnIHwgdCB9fVxuICAgICAgPGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCI+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLmFncmVlUHJpdmFjeScgfCB0IH19PC9hXG4gICAgICA+e3sgJ2F1dGhQYWdlLnJlZ2lzdGVyLmFncmVlVGFpbCcgfCB0IH19XG4gICAgPC9wPlxuXG4gICAgPHAgY2xhc3M9XCJhdXRoLWxpbmtzXCI+XG4gICAgICB7eyAnYXV0aFBhZ2UucmVnaXN0ZXIuaGF2ZUFjY291bnQnIHwgdCB9fVxuICAgICAgPGEgcm91dGVyTGluaz1cIi9sb2dpblwiPnt7ICdhdXRoUGFnZS5yZWdpc3Rlci5zdWJtaXQnIHwgdCB9fTwvYT5cbiAgICA8L3A+XG4gIDwvc2VjdGlvbj5cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLFNBQVMseUJBQXlCLFdBQVcsUUFBUSxjQUFjO0FBQ25FLFNBQVMsYUFBYSxXQUFXLHFCQUFxQixrQkFBa0I7QUFDeEUsU0FBUyxrQkFBa0I7Ozs7O0FDRHpCLElBQUEsNEJBQUEsR0FBQSxXQUFBLENBQUEsRUFBMkIsR0FBQSxNQUFBLENBQUE7QUFDRixJQUFBLG9CQUFBLENBQUE7O0FBQTBDLElBQUEsMEJBQUE7QUFDakUsSUFBQSw0QkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUF5QixJQUFBLG9CQUFBLENBQUE7O0FBQXlDLElBQUEsMEJBQUE7QUFDbEUsSUFBQSw0QkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUFnRCxJQUFBLG9CQUFBLENBQUE7O0FBQW9DLElBQUEsMEJBQUEsRUFBSTs7O0FBRmpFLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxHQUFBLGdDQUFBLENBQUE7QUFDRSxJQUFBLHVCQUFBLENBQUE7QUFBQSxJQUFBLCtCQUFBLHlCQUFBLEdBQUEsR0FBQSwrQkFBQSxDQUFBO0FBQ3VCLElBQUEsdUJBQUEsQ0FBQTtBQUFBLElBQUEsK0JBQUEseUJBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUE7Ozs7O0FBeUIxQyxJQUFBLDRCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0UsSUFBQSxvQkFBQSxDQUFBOztBQUNGLElBQUEsMEJBQUE7OztBQURFLElBQUEsdUJBQUE7QUFBQSxJQUFBLGdDQUFBLEtBQUEseUJBQUEsR0FBQSxHQUFBLGdDQUFBLEdBQUEsR0FBQTs7Ozs7QUFnQ0YsSUFBQSw0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QUEsY0FBQSxHQUFBLFVBQUEsR0FBQSxDQUFBLEdBQUEsWUFBQSxHQUFBLENBQUEsY0FBQSxRQUFBLEdBQUEsQ0FBQSxjQUFBLFVBQUEsR0FBQSxDQUFBLGNBQUEsUUFBQSxDQUFBLEdBQUEsVUFBQSxTQUFBLHNCQUFBLElBQUEsS0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFBO0FDOUJ6QixNQUFBLGlDQUFBLEdBQUEscUNBQUEsSUFBQSxHQUFBLFdBQUEsQ0FBQSxFQUFvQixHQUFBLHFDQUFBLElBQUEsSUFBQSxXQUFBLENBQUE7OztBQUFwQixNQUFBLDJCQUFBLElBQUEsV0FBQSxJQUFBLElBQUEsQ0FBQTs7b0JEeUJZLHFCQUFtQix1QkFBQSxtQkFBQSxpQ0FBQSx5QkFBQSx3QkFBQSx1QkFBQSxpQ0FBQSwrQkFBQSx1Q0FBQSw4QkFBQSxvQkFBQSx5QkFBQSxzQkFBQSx1QkFBQSx1QkFBQSxxQkFBQSw4QkFBQSxtQkFBQSxpQkFBQSxpQkFBQSx5QkFBQSx1QkFBQSx1QkFBQSxvQkFBQSxrQkFBQSxrQkFBRSxZQUFZLGlCQUFpQixhQUFhLEdBQUEsUUFBQSxDQUFBLHljQUFBLEVBQUEsQ0FBQTs7OytFQUs5RCxjQUFZLENBQUE7VUFQeEI7dUJBQ1cscUJBQW1CLFNBQ3BCLENBQUMscUJBQXFCLFlBQVksaUJBQWlCLGFBQWEsR0FBQyxpQkFHekQsd0JBQXdCLFFBQU0sVUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQUFBLFFBQUEsQ0FBQSw2WkFBQSxFQUFBLENBQUE7Ozs7Z0ZBRXBDLGNBQVksRUFBQSxXQUFBLGdCQUFBLFVBQUEsMENBQUEsWUFBQSxHQUFBLENBQUE7QUFBQSxHQUFBOzs7Ozs7OzhEQUFaLGNBQVksRUFBQSxTQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsQ0FBQSxxQkFBQSxZQUFBLGlCQUFBLGVBQUEsV0FBQSx1QkFBQSxHQUFBLGFBQUEsRUFBQSxDQUFBO0VBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGNBQUEscUJBQUEsS0FBQSxJQUFBLENBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGVBQUEsWUFBQSxPQUFBLFlBQUEsSUFBQSxHQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsTUFBQSxxQkFBQSxFQUFBLFNBQUEsQ0FBQTtBQUFBLEdBQUE7IiwibmFtZXMiOltdLCJkZWJ1Z0lkIjoiY2M4ZjU4ZWEtZjE2YS01OTJmLTkzOWQtN2Y4NGU0NGNhZDdlIn0=