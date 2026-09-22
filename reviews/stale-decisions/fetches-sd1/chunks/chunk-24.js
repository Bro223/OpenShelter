import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-WYACYUPC.js");// src/app/core/api-error.ts
import { HttpErrorResponse } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_http.js?v=b78d4f20";
var NETWORK_STATUS = 0;
function reasonPhrase(status) {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
    default:
      return `HTTP ${status}`;
  }
}
function parseRetryAfterSeconds(raw) {
  if (raw === null) {
    return null;
  }
  const value = raw.trim();
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) ? seconds : null;
}
function isErrorResponseBody(payload) {
  if (payload === null || typeof payload !== "object") {
    return false;
  }
  const record = payload;
  return typeof record["timestamp"] === "string" && typeof record["status"] === "number" && typeof record["error"] === "string" && typeof record["message"] === "string" && typeof record["path"] === "string";
}
var ApiError = class _ApiError extends Error {
  timestamp;
  status;
  error;
  /** The request path that failed ('' for network errors). */
  path;
  /**
   * Seconds until the server accepts the same request again — the
   * `Retry-After` header of a cooldown 429. Null everywhere else: token-
   * bucket 429s send no header, and neither do other statuses / network
   * errors.
   */
  retryAfterSeconds;
  constructor(fields, retryAfterSeconds = null) {
    super(fields.message);
    this.name = "ApiError";
    this.timestamp = fields.timestamp;
    this.status = fields.status;
    this.error = fields.error;
    this.message = fields.message;
    this.path = fields.path;
    this.retryAfterSeconds = retryAfterSeconds;
  }
  /** Build from a real HTTP error response. Prefers the uniform ErrorResponse body. */
  static fromHttp(status, payload, url, headers) {
    const retryAfterSeconds = parseRetryAfterSeconds(headers?.get("Retry-After") ?? null);
    if (isErrorResponseBody(payload)) {
      return new _ApiError(payload, retryAfterSeconds);
    }
    const message = typeof payload === "string" && payload.length > 0 ? payload : `Request failed with status ${status}`;
    return new _ApiError(
      {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status,
        error: reasonPhrase(status),
        message,
        path: url ?? ""
      },
      retryAfterSeconds
    );
  }
  /** Build for a network failure — the backend is unreachable (dev backend
   *  may be off). This message is a WIRE-LEVEL placeholder, not user copy:
   *  the user-facing banner for this state is the `error.network` catalog
   *  key, served by bannerMessage() (shared/error-copy.ts) through the
   *  i18n seam. NOTE: one state on purpose — status 0 covers offline,
   *  unreachable AND timeout alike (toApiError discards the raw
   *  HttpErrorResponse reason), so do not branch on it for copy. */
  static fromNetwork() {
    return new _ApiError({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: NETWORK_STATUS,
      error: "Network Error",
      message: "Cannot reach the backend. It may be offline \u2014 please try again later.",
      path: ""
    });
  }
  /** True when the backend never answered (offline / dev server not running). */
  get isNetworkError() {
    return this.status === NETWORK_STATUS;
  }
};
function toApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return ApiError.fromNetwork();
    }
    return ApiError.fromHttp(error.status, error.error, error.url, error.headers);
  }
  return ApiError.fromNetwork();
}

// src/app/shared/banner.component.ts
import { ChangeDetectionStrategy, Component, input } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
function BannerComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "div");
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275classMap(i0.\u0275\u0275interpolate1("banner banner--", ctx_r0.severity()));
    i0.\u0275\u0275attribute("role", ctx_r0.severity() === "error" ? "alert" : "status");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx, " ");
  }
}
var BannerComponent = class _BannerComponent {
  severity = input(
    "error",
    ...ngDevMode ? [{ debugName: "severity" }] : (
      /* istanbul ignore next */
      []
    )
  );
  message = input(
    null,
    ...ngDevMode ? [{ debugName: "message" }] : (
      /* istanbul ignore next */
      []
    )
  );
  static \u0275fac = function BannerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BannerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _BannerComponent, selectors: [["app-banner"]], inputs: { severity: [1, "severity"], message: [1, "message"] }, decls: 1, vars: 1, consts: [[3, "class"]], template: function BannerComponent_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275conditionalCreate(0, BannerComponent_Conditional_0_Template, 2, 5, "div", 0);
    }
    if (rf & 2) {
      let tmp_0_0;
      i0.\u0275\u0275conditional((tmp_0_0 = ctx.message()) ? 0 : -1, tmp_0_0);
    }
  }, styles: ["\n.banner[_ngcontent-%COMP%] {\n  border: 1px solid transparent;\n  border-radius: var(--%NS%radius-md);\n  padding: var(--%NS%space-10) var(--%NS%space-14);\n  font-size: var(--%NS%text-base);\n  line-height: 1.35;\n  margin: 0 0 var(--%NS%space-16);\n}\n.banner--error[_ngcontent-%COMP%] {\n  background: var(--%NS%color-danger-bg);\n  border-color: var(--%NS%color-danger-border);\n  color: var(--%NS%color-danger);\n}\n.banner--warning[_ngcontent-%COMP%] {\n  background: var(--%NS%color-warning-bg);\n  border-color: var(--%NS%color-warning-border);\n  color: var(--%NS%color-warning);\n}\n.banner--info[_ngcontent-%COMP%] {\n  background: var(--%NS%color-info-bg);\n  border-color: var(--%NS%color-info-border);\n  color: var(--%NS%color-info);\n}\n.banner--success[_ngcontent-%COMP%] {\n  background: var(--%NS%color-success-bg);\n  border-color: var(--%NS%color-success-border);\n  color: var(--%NS%color-success);\n}\n/*# sourceMappingURL=banner.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(BannerComponent, [{
    type: Component,
    args: [{ selector: "app-banner", imports: [], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (message(); as text) {
  <div
    class="banner banner--{{ severity() }}"
    [attr.role]="severity() === 'error' ? 'alert' : 'status'"
  >
    {{ text }}
  </div>
}
`, styles: ["/* src/app/shared/banner.component.scss */\n.banner {\n  border: 1px solid transparent;\n  border-radius: var(--radius-md);\n  padding: var(--space-10) var(--space-14);\n  font-size: var(--text-base);\n  line-height: 1.35;\n  margin: 0 0 var(--space-16);\n}\n.banner--error {\n  background: var(--color-danger-bg);\n  border-color: var(--color-danger-border);\n  color: var(--color-danger);\n}\n.banner--warning {\n  background: var(--color-warning-bg);\n  border-color: var(--color-warning-border);\n  color: var(--color-warning);\n}\n.banner--info {\n  background: var(--color-info-bg);\n  border-color: var(--color-info-border);\n  color: var(--color-info);\n}\n.banner--success {\n  background: var(--color-success-bg);\n  border-color: var(--color-success-border);\n  color: var(--color-success);\n}\n/*# sourceMappingURL=banner.component.css.map */\n"] }]
  }], null, { severity: [{ type: i0.Input, args: [{ isSignal: true, alias: "severity", required: false }] }], message: [{ type: i0.Input, args: [{ isSignal: true, alias: "message", required: false }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(BannerComponent, { className: "BannerComponent", filePath: "src/app/shared/banner.component.ts", lineNumber: 17 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Fbanner.component.ts%40BannerComponent";
  function BannerComponent_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(BannerComponent, m.default, [i0], [Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && BannerComponent_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && BannerComponent_HmrLoad(d.timestamp)));
})();

// src/app/shared/error-copy.ts
var COPY = {
  invalidCredentials: "Invalid email/phone or password.",
  rateLimited: "Too many attempts \u2014 please wait a moment and then try again.",
  unauthorized: "Not authorized. Please log in again.",
  // Verification (/verify). The backend answers 429 for BOTH the 60 s
  // resend cooldown and the 5/day cap with one generic message, so the copy
  // cannot promise a precise wait.
  verifyRateLimited: "Too many codes have been requested. Please wait a while before requesting another (codes are limited per day).",
  verifyBadCode: "That code is invalid or has expired. Check it and try again.",
  // Password-reset confirm (code flow): wrong/expired/used/over-limit are
  // ONE generic 400 — never reveal which check failed (anti-enumeration).
  resetBadCode: "That code is invalid or has expired. Check the latest e-mail and try again.",
  // Contact change (/account). Request 400 ≈ "same as current value"
  // (client validators already block blank/invalid input); the page special-
  // cases that copy before falling through here.
  accountRateLimited: "Too many requests. Please wait a moment and then try again.",
  accountBadCode: "That code is invalid or has expired. Please request a new one.",
  accountSameValue: "That is already the value on your account \u2014 the new one must be different.",
  // Generic 400 fallback for the profile + shelter branches when the backend
  // sent no validation message (named once — every branch reuses it).
  checkInput: "Please check your input and try again.",
  // The 409 fallback when the backend sent no message.
  valueInUse: "That value is already in use.",
  // 5xx + other unhandled server statuses: fixed generic copy. A non-JSON
  // body (e.g. a reverse-proxy HTML error page) must never be echoed into
  // the banner verbatim.
  serverError: "Something went wrong. Please try again.",
  // Network/transport failure (ApiError.isNetworkError, status 0): the
  // backend NEVER answered — there is no backend message to echo. This is
  // CLIENT copy, so it is a catalog key like the other client-authored
  // lines (error.network). ONE string on purpose: ApiError does not
  // distinguish offline / unreachable / timeout (all arrive as status 0
  // with this one message — see ApiError.fromNetwork), so one honest line.
  network: "Cannot reach the backend. It may be offline \u2014 please try again later."
};
var FIELD_VALIDATION_PREFIXES = {
  // Password-reset payloads: PasswordResetRequest.email, and
  // PasswordResetConfirmRequest.email / .code / .newPassword.
  reset: ["email ", "code ", "newPassword "],
  // Verify-confirm payload: VerifyConfirmRequest.level / .code.
  verify: ["level ", "code "]
};
function isFieldValidation400(kind, message) {
  return (FIELD_VALIDATION_PREFIXES[kind] ?? []).some((prefix) => message.startsWith(prefix));
}
var CLIENT_COPY = {
  "error.rateLimited": COPY.rateLimited,
  "error.unauthorized": COPY.unauthorized,
  "error.invalidCredentials": COPY.invalidCredentials,
  "error.resetBadCode": COPY.resetBadCode,
  "error.checkInput": COPY.checkInput,
  "error.serverError": COPY.serverError,
  "error.valueInUse": COPY.valueInUse,
  "error.verifyRateLimited": COPY.verifyRateLimited,
  "error.verifyBadCode": COPY.verifyBadCode,
  "error.accountRateLimited": COPY.accountRateLimited,
  "error.accountBadCode": COPY.accountBadCode,
  "error.network": COPY.network
};
function bannerMessage(error, kind, translate) {
  const tr = (key) => translate === void 0 ? CLIENT_COPY[key] : translate(key);
  const api = error instanceof ApiError ? error : toApiError(error);
  if (api.isNetworkError) {
    return tr("error.network");
  }
  switch (api.status) {
    case 429:
      if (kind === "verify") {
        return tr("error.verifyRateLimited");
      }
      if (kind === "account") {
        return tr("error.accountRateLimited");
      }
      return tr("error.rateLimited");
    case 401:
      if (kind === "profile") {
        return api.message || tr("error.unauthorized");
      }
      return kind === "login" ? tr("error.invalidCredentials") : api.message || tr("error.unauthorized");
    case 400:
      if (kind === "reset") {
        return isFieldValidation400(kind, api.message) ? api.message : tr("error.resetBadCode");
      }
      if (kind === "profile") {
        return api.message || tr("error.checkInput");
      }
      if (kind === "verify") {
        return isFieldValidation400(kind, api.message) ? api.message : tr("error.verifyBadCode");
      }
      if (kind === "account") {
        return tr("error.accountBadCode");
      }
      return api.message || tr("error.checkInput");
    case 409:
      return api.message || tr("error.valueInUse");
    default:
      if (api.status >= 500) {
        return tr("error.serverError");
      }
      return api.message || tr("error.serverError");
  }
}

// src/app/core/api-client.ts
import { HttpClient } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_http.js?v=b78d4f20";
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { catchError, map, throwError } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";

// src/environments/environment.ts
var environment = { production: false, apiUrl: "" };

// src/app/core/api-client.ts
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var ApiClient = class _ApiClient {
  http = inject(HttpClient);
  baseUrl = environment.apiUrl.replace(/\/+$/, "");
  get(path) {
    return this.request("GET", path);
  }
  /**
   * A GET with the response HEADERS surfaced alongside the body — the
   * paging-metadata seam (the guidance index's X-Total-Count rides a
   * header, not the body, so the paged and un-paged answers share one
   * response shape). The body parses exactly like {@link get}; the
   * caller reads the selected header by name. The auth interceptor and
   * the central ApiError mapping are unchanged.
   */
  getWithHeaders(path) {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    return this.http.request("GET", url, { observe: "response" }).pipe(map((response) => ({ body: response.body, headers: response.headers })), catchError((error) => throwError(() => toApiError(error))));
  }
  post(path, body) {
    return this.request("POST", path, body);
  }
  put(path, body) {
    return this.request("PUT", path, body);
  }
  delete(path) {
    return this.request("DELETE", path);
  }
  request(method, path, body) {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const options = body === void 0 ? {} : { body };
    return this.http.request(method, url, options).pipe(catchError((error) => throwError(() => toApiError(error))));
  }
  static \u0275fac = function ApiClient_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ApiClient)();
  };
  static \u0275prov = /* @__PURE__ */ i02.\u0275\u0275defineInjectable({ token: _ApiClient, factory: _ApiClient.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(ApiClient, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ApiError,
  toApiError,
  ApiClient,
  BannerComponent,
  bannerMessage
};
//# debugId=811417e4-ab81-5932-a096-dfca1b04cf83


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvY29yZS9hcGktZXJyb3IudHMiLCJzcmMvYXBwL3NoYXJlZC9iYW5uZXIuY29tcG9uZW50LnRzIiwic3JjL2FwcC9zaGFyZWQvYmFubmVyLmNvbXBvbmVudC5odG1sIiwic3JjL2FwcC9zaGFyZWQvZXJyb3ItY29weS50cyIsInNyYy9hcHAvY29yZS9hcGktY2xpZW50LnRzIiwic3JjL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIdHRwSGVhZGVycywgSHR0cEVycm9yUmVzcG9uc2UgfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5cbi8qKlxuICogVGhlIG9uZSB1bmlmb3JtIGVycm9yIGJvZHkgb2YgdGhlIHdob2xlIGJhY2tlbmQgKEVycm9yUmVzcG9uc2UgaW5cbiAqIGRvY3MvYWdlbnQvMDItQ09OVEVYVC1BUEkubWQpIOKAlCBldmVyeSBub24tMnh4IGNhcnJpZXMgZXhhY3RseSB0aGVzZSBmaWVsZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JSZXNwb25zZUJvZHkge1xuICB0aW1lc3RhbXA6IHN0cmluZztcbiAgc3RhdHVzOiBudW1iZXI7XG4gIGVycm9yOiBzdHJpbmc7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xufVxuXG4vKiogTmV0d29yayBmYWlsdXJlcyBjYXJyeSBIVFRQIHN0YXR1cyAwIChubyBIVFRQIHJlc3BvbnNlIGF0IGFsbCkuICovXG5jb25zdCBORVRXT1JLX1NUQVRVUyA9IDA7XG5cbmZ1bmN0aW9uIHJlYXNvblBocmFzZShzdGF0dXM6IG51bWJlcik6IHN0cmluZyB7XG4gIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgY2FzZSA0MDA6XG4gICAgICByZXR1cm4gJ0JhZCBSZXF1ZXN0JztcbiAgICBjYXNlIDQwMTpcbiAgICAgIHJldHVybiAnVW5hdXRob3JpemVkJztcbiAgICBjYXNlIDQwMzpcbiAgICAgIHJldHVybiAnRm9yYmlkZGVuJztcbiAgICBjYXNlIDQwNDpcbiAgICAgIHJldHVybiAnTm90IEZvdW5kJztcbiAgICBjYXNlIDQwOTpcbiAgICAgIHJldHVybiAnQ29uZmxpY3QnO1xuICAgIGNhc2UgNDI5OlxuICAgICAgcmV0dXJuICdUb28gTWFueSBSZXF1ZXN0cyc7XG4gICAgY2FzZSA1MDA6XG4gICAgICByZXR1cm4gJ0ludGVybmFsIFNlcnZlciBFcnJvcic7XG4gICAgY2FzZSA1MDI6XG4gICAgICByZXR1cm4gJ0JhZCBHYXRld2F5JztcbiAgICBjYXNlIDUwMzpcbiAgICAgIHJldHVybiAnU2VydmljZSBVbmF2YWlsYWJsZSc7XG4gICAgY2FzZSA1MDQ6XG4gICAgICByZXR1cm4gJ0dhdGV3YXkgVGltZW91dCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBgSFRUUCAke3N0YXR1c31gO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgYSBSZXRyeS1BZnRlciBoZWFkZXIgdmFsdWUgaW50byB3aG9sZSBzZWNvbmRzLiBPbmx5IGEgcGxhaW5cbiAqIG5vbi1uZWdhdGl2ZSBpbnRlZ2VyIGNvdW50cyAodGhlIGJhY2tlbmQgc2VuZHMgdGhlIGNvb2xkb3duIGluIHNlY29uZHMpO1xuICogSFRUUC1kYXRlIGZvcm0sIGZyYWN0aW9ucywganVuaywgb3IgYW4gYWJzZW50IGhlYWRlciBhbGwgZ2l2ZSBudWxsLlxuICovXG5mdW5jdGlvbiBwYXJzZVJldHJ5QWZ0ZXJTZWNvbmRzKHJhdzogc3RyaW5nIHwgbnVsbCk6IG51bWJlciB8IG51bGwge1xuICBpZiAocmF3ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgdmFsdWUgPSByYXcudHJpbSgpO1xuICBpZiAoIS9eXFxkKyQvLnRlc3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qgc2Vjb25kcyA9IE51bWJlcih2YWx1ZSk7XG4gIHJldHVybiBOdW1iZXIuaXNTYWZlSW50ZWdlcihzZWNvbmRzKSA/IHNlY29uZHMgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0Vycm9yUmVzcG9uc2VCb2R5KHBheWxvYWQ6IHVua25vd24pOiBwYXlsb2FkIGlzIEVycm9yUmVzcG9uc2VCb2R5IHtcbiAgaWYgKHBheWxvYWQgPT09IG51bGwgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHJlY29yZCA9IHBheWxvYWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHJlY29yZFsndGltZXN0YW1wJ10gPT09ICdzdHJpbmcnICYmXG4gICAgdHlwZW9mIHJlY29yZFsnc3RhdHVzJ10gPT09ICdudW1iZXInICYmXG4gICAgdHlwZW9mIHJlY29yZFsnZXJyb3InXSA9PT0gJ3N0cmluZycgJiZcbiAgICB0eXBlb2YgcmVjb3JkWydtZXNzYWdlJ10gPT09ICdzdHJpbmcnICYmXG4gICAgdHlwZW9mIHJlY29yZFsncGF0aCddID09PSAnc3RyaW5nJ1xuICApO1xufVxuXG4vKipcbiAqIFRoZSBmcm9udGVuZCdzIG9uZSBlcnJvciB0eXBlICgwMS1UQVNLLm1kIMKnNDogb25lIHVuaWZvcm0gZXJyb3IgcGF0aCkuXG4gKiBNaXJyb3JzIHRoZSBiYWNrZW5kIEVycm9yUmVzcG9uc2UgZXhhY3RseTsgcGFnZXMgc3VyZmFjZSBgbWVzc2FnZWAgdGhyb3VnaFxuICogdGhlIGJhbm5lci4gNDAxIG1pZC1zZXNzaW9uIGlzIGhhbmRsZWQgb25jZSBpbiB0aGUgaW50ZXJjZXB0b3IsIG5ldmVyIGhlcmUuXG4gKi9cbmV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgdGltZXN0YW1wOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHN0YXR1czogbnVtYmVyO1xuICByZWFkb25seSBlcnJvcjogc3RyaW5nO1xuICAvKiogVGhlIHJlcXVlc3QgcGF0aCB0aGF0IGZhaWxlZCAoJycgZm9yIG5ldHdvcmsgZXJyb3JzKS4gKi9cbiAgcmVhZG9ubHkgcGF0aDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTZWNvbmRzIHVudGlsIHRoZSBzZXJ2ZXIgYWNjZXB0cyB0aGUgc2FtZSByZXF1ZXN0IGFnYWluIOKAlCB0aGVcbiAgICogYFJldHJ5LUFmdGVyYCBoZWFkZXIgb2YgYSBjb29sZG93biA0MjkuIE51bGwgZXZlcnl3aGVyZSBlbHNlOiB0b2tlbi1cbiAgICogYnVja2V0IDQyOXMgc2VuZCBubyBoZWFkZXIsIGFuZCBuZWl0aGVyIGRvIG90aGVyIHN0YXR1c2VzIC8gbmV0d29ya1xuICAgKiBlcnJvcnMuXG4gICAqL1xuICByZWFkb25seSByZXRyeUFmdGVyU2Vjb25kczogbnVtYmVyIHwgbnVsbDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKGZpZWxkczogRXJyb3JSZXNwb25zZUJvZHksIHJldHJ5QWZ0ZXJTZWNvbmRzOiBudW1iZXIgfCBudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGZpZWxkcy5tZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICAgIHRoaXMudGltZXN0YW1wID0gZmllbGRzLnRpbWVzdGFtcDtcbiAgICB0aGlzLnN0YXR1cyA9IGZpZWxkcy5zdGF0dXM7XG4gICAgdGhpcy5lcnJvciA9IGZpZWxkcy5lcnJvcjtcbiAgICB0aGlzLm1lc3NhZ2UgPSBmaWVsZHMubWVzc2FnZTtcbiAgICB0aGlzLnBhdGggPSBmaWVsZHMucGF0aDtcbiAgICB0aGlzLnJldHJ5QWZ0ZXJTZWNvbmRzID0gcmV0cnlBZnRlclNlY29uZHM7XG4gIH1cblxuICAvKiogQnVpbGQgZnJvbSBhIHJlYWwgSFRUUCBlcnJvciByZXNwb25zZS4gUHJlZmVycyB0aGUgdW5pZm9ybSBFcnJvclJlc3BvbnNlIGJvZHkuICovXG4gIHN0YXRpYyBmcm9tSHR0cChcbiAgICBzdGF0dXM6IG51bWJlcixcbiAgICBwYXlsb2FkOiB1bmtub3duLFxuICAgIHVybD86IHN0cmluZyB8IG51bGwsXG4gICAgaGVhZGVycz86IEh0dHBIZWFkZXJzIHwgbnVsbCxcbiAgKTogQXBpRXJyb3Ige1xuICAgIGNvbnN0IHJldHJ5QWZ0ZXJTZWNvbmRzID0gcGFyc2VSZXRyeUFmdGVyU2Vjb25kcyhoZWFkZXJzPy5nZXQoJ1JldHJ5LUFmdGVyJykgPz8gbnVsbCk7XG4gICAgaWYgKGlzRXJyb3JSZXNwb25zZUJvZHkocGF5bG9hZCkpIHtcbiAgICAgIHJldHVybiBuZXcgQXBpRXJyb3IocGF5bG9hZCwgcmV0cnlBZnRlclNlY29uZHMpO1xuICAgIH1cbiAgICBjb25zdCBtZXNzYWdlID1cbiAgICAgIHR5cGVvZiBwYXlsb2FkID09PSAnc3RyaW5nJyAmJiBwYXlsb2FkLmxlbmd0aCA+IDBcbiAgICAgICAgPyBwYXlsb2FkXG4gICAgICAgIDogYFJlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzICR7c3RhdHVzfWA7XG4gICAgcmV0dXJuIG5ldyBBcGlFcnJvcihcbiAgICAgIHtcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHN0YXR1cyxcbiAgICAgICAgZXJyb3I6IHJlYXNvblBocmFzZShzdGF0dXMpLFxuICAgICAgICBtZXNzYWdlLFxuICAgICAgICBwYXRoOiB1cmwgPz8gJycsXG4gICAgICB9LFxuICAgICAgcmV0cnlBZnRlclNlY29uZHMsXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBCdWlsZCBmb3IgYSBuZXR3b3JrIGZhaWx1cmUg4oCUIHRoZSBiYWNrZW5kIGlzIHVucmVhY2hhYmxlIChkZXYgYmFja2VuZFxuICAgKiAgbWF5IGJlIG9mZikuIFRoaXMgbWVzc2FnZSBpcyBhIFdJUkUtTEVWRUwgcGxhY2Vob2xkZXIsIG5vdCB1c2VyIGNvcHk6XG4gICAqICB0aGUgdXNlci1mYWNpbmcgYmFubmVyIGZvciB0aGlzIHN0YXRlIGlzIHRoZSBgZXJyb3IubmV0d29ya2AgY2F0YWxvZ1xuICAgKiAga2V5LCBzZXJ2ZWQgYnkgYmFubmVyTWVzc2FnZSgpIChzaGFyZWQvZXJyb3ItY29weS50cykgdGhyb3VnaCB0aGVcbiAgICogIGkxOG4gc2VhbS4gTk9URTogb25lIHN0YXRlIG9uIHB1cnBvc2Ug4oCUIHN0YXR1cyAwIGNvdmVycyBvZmZsaW5lLFxuICAgKiAgdW5yZWFjaGFibGUgQU5EIHRpbWVvdXQgYWxpa2UgKHRvQXBpRXJyb3IgZGlzY2FyZHMgdGhlIHJhd1xuICAgKiAgSHR0cEVycm9yUmVzcG9uc2UgcmVhc29uKSwgc28gZG8gbm90IGJyYW5jaCBvbiBpdCBmb3IgY29weS4gKi9cbiAgc3RhdGljIGZyb21OZXR3b3JrKCk6IEFwaUVycm9yIHtcbiAgICByZXR1cm4gbmV3IEFwaUVycm9yKHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgc3RhdHVzOiBORVRXT1JLX1NUQVRVUyxcbiAgICAgIGVycm9yOiAnTmV0d29yayBFcnJvcicsXG4gICAgICBtZXNzYWdlOiAnQ2Fubm90IHJlYWNoIHRoZSBiYWNrZW5kLiBJdCBtYXkgYmUgb2ZmbGluZSDigJQgcGxlYXNlIHRyeSBhZ2FpbiBsYXRlci4nLFxuICAgICAgcGF0aDogJycsXG4gICAgfSk7XG4gIH1cblxuICAvKiogVHJ1ZSB3aGVuIHRoZSBiYWNrZW5kIG5ldmVyIGFuc3dlcmVkIChvZmZsaW5lIC8gZGV2IHNlcnZlciBub3QgcnVubmluZykuICovXG4gIGdldCBpc05ldHdvcmtFcnJvcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMgPT09IE5FVFdPUktfU1RBVFVTO1xuICB9XG59XG5cbi8qKlxuICogTWFwIGFueSB0aHJvd24gdmFsdWUgKEh0dHBFcnJvclJlc3BvbnNlIGZyb20gQW5ndWxhciBvciBhbiBhbHJlYWR5LWJ1aWx0XG4gKiBBcGlFcnJvcikgaW50byB0aGUgb25lIGVycm9yIHR5cGUuIFVzZWQgYnkgQXBpQ2xpZW50J3MgY2F0Y2hFcnJvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQXBpRXJyb3IoZXJyb3I6IHVua25vd24pOiBBcGlFcnJvciB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yO1xuICB9XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEh0dHBFcnJvclJlc3BvbnNlKSB7XG4gICAgaWYgKGVycm9yLnN0YXR1cyA9PT0gMCkge1xuICAgICAgcmV0dXJuIEFwaUVycm9yLmZyb21OZXR3b3JrKCk7XG4gICAgfVxuICAgIHJldHVybiBBcGlFcnJvci5mcm9tSHR0cChlcnJvci5zdGF0dXMsIGVycm9yLmVycm9yLCBlcnJvci51cmwsIGVycm9yLmhlYWRlcnMpO1xuICB9XG4gIHJldHVybiBBcGlFcnJvci5mcm9tTmV0d29yaygpO1xufVxuIiwiaW1wb3J0IHsgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksIENvbXBvbmVudCwgaW5wdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuZXhwb3J0IHR5cGUgQmFubmVyU2V2ZXJpdHkgPSAnaW5mbycgfCAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZXJyb3InO1xuXG4vKipcbiAqIE9uZSBiYW5uZXIgdG8gc3VyZmFjZSBBcGlFcnJvciBtZXNzYWdlcyAvIG5vdGljZXMgKDAxIHB1bWwsIHNoYXJlZCkuXG4gKiBSZW5kZXJzIG5vdGhpbmcgd2hpbGUgYG1lc3NhZ2VgIGlzIG51bGwvZW1wdHkuIGVycm9yIC0+IHJvbGU9XCJhbGVydFwiLFxuICogZXZlcnl0aGluZyBlbHNlIC0+IHJvbGU9XCJzdGF0dXNcIiAoYXJpYS1saXZlLCBubyBpbnRlcnJ1cHQpLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtYmFubmVyJyxcbiAgaW1wb3J0czogW10sXG4gIHRlbXBsYXRlVXJsOiAnLi9iYW5uZXIuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybDogJy4vYmFubmVyLmNvbXBvbmVudC5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEJhbm5lckNvbXBvbmVudCB7XG4gIHJlYWRvbmx5IHNldmVyaXR5ID0gaW5wdXQ8QmFubmVyU2V2ZXJpdHk+KCdlcnJvcicpO1xuICByZWFkb25seSBtZXNzYWdlID0gaW5wdXQ8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG59XG4iLCJAaWYgKG1lc3NhZ2UoKTsgYXMgdGV4dCkge1xuICA8ZGl2XG4gICAgY2xhc3M9XCJiYW5uZXIgYmFubmVyLS17eyBzZXZlcml0eSgpIH19XCJcbiAgICBbYXR0ci5yb2xlXT1cInNldmVyaXR5KCkgPT09ICdlcnJvcicgPyAnYWxlcnQnIDogJ3N0YXR1cydcIlxuICA+XG4gICAge3sgdGV4dCB9fVxuICA8L2Rpdj5cbn1cbiIsImltcG9ydCB7IEFwaUVycm9yLCB0b0FwaUVycm9yIH0gZnJvbSAnLi4vY29yZS9hcGktZXJyb3InO1xuXG4vKipcbiAqIE1hcHMgYSB0aHJvd24gQXBpRXJyb3IgdG8gdXNlci1mYWNpbmcgYmFubmVyIGNvcHkgcGVyIHRoZSBzdGF0dXMgdGFibGUgaW5cbiAqIDAyLUNPTlRFWFQtQVBJLm1kLiBBbnRpLWVudW1lcmF0aW9uIHJ1bGU6IGEgbG9naW4gNDAxIEFMV0FZUyBzYXlzIHRoZSBzYW1lXG4gKiBnZW5lcmljIHRoaW5nIOKAlCB0aGUgYmFja2VuZCBtZXNzYWdlIChcImludmFsaWQgY3JlZGVudGlhbHNcIikgaXMgbmV2ZXIgc2hvd25cbiAqIGFuZCB0aGUgVUkgbmV2ZXIgZGlzdGluZ3Vpc2hlcyBcInVua25vd24gdXNlclwiIGZyb20gXCJ3cm9uZyBwYXNzd29yZFwiLlxuICovXG5leHBvcnQgY29uc3QgQ09QWSA9IHtcbiAgaW52YWxpZENyZWRlbnRpYWxzOiAnSW52YWxpZCBlbWFpbC9waG9uZSBvciBwYXNzd29yZC4nLFxuICByYXRlTGltaXRlZDogJ1RvbyBtYW55IGF0dGVtcHRzIOKAlCBwbGVhc2Ugd2FpdCBhIG1vbWVudCBhbmQgdGhlbiB0cnkgYWdhaW4uJyxcbiAgdW5hdXRob3JpemVkOiAnTm90IGF1dGhvcml6ZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyxcbiAgLy8gVmVyaWZpY2F0aW9uICgvdmVyaWZ5KS4gVGhlIGJhY2tlbmQgYW5zd2VycyA0MjkgZm9yIEJPVEggdGhlIDYwIHNcbiAgLy8gcmVzZW5kIGNvb2xkb3duIGFuZCB0aGUgNS9kYXkgY2FwIHdpdGggb25lIGdlbmVyaWMgbWVzc2FnZSwgc28gdGhlIGNvcHlcbiAgLy8gY2Fubm90IHByb21pc2UgYSBwcmVjaXNlIHdhaXQuXG4gIHZlcmlmeVJhdGVMaW1pdGVkOlxuICAgICdUb28gbWFueSBjb2RlcyBoYXZlIGJlZW4gcmVxdWVzdGVkLiBQbGVhc2Ugd2FpdCBhIHdoaWxlIGJlZm9yZSByZXF1ZXN0aW5nIGFub3RoZXIgKGNvZGVzIGFyZSBsaW1pdGVkIHBlciBkYXkpLicsXG4gIHZlcmlmeUJhZENvZGU6ICdUaGF0IGNvZGUgaXMgaW52YWxpZCBvciBoYXMgZXhwaXJlZC4gQ2hlY2sgaXQgYW5kIHRyeSBhZ2Fpbi4nLFxuICAvLyBQYXNzd29yZC1yZXNldCBjb25maXJtIChjb2RlIGZsb3cpOiB3cm9uZy9leHBpcmVkL3VzZWQvb3Zlci1saW1pdCBhcmVcbiAgLy8gT05FIGdlbmVyaWMgNDAwIOKAlCBuZXZlciByZXZlYWwgd2hpY2ggY2hlY2sgZmFpbGVkIChhbnRpLWVudW1lcmF0aW9uKS5cbiAgcmVzZXRCYWRDb2RlOiAnVGhhdCBjb2RlIGlzIGludmFsaWQgb3IgaGFzIGV4cGlyZWQuIENoZWNrIHRoZSBsYXRlc3QgZS1tYWlsIGFuZCB0cnkgYWdhaW4uJyxcbiAgLy8gQ29udGFjdCBjaGFuZ2UgKC9hY2NvdW50KS4gUmVxdWVzdCA0MDAg4omIIFwic2FtZSBhcyBjdXJyZW50IHZhbHVlXCJcbiAgLy8gKGNsaWVudCB2YWxpZGF0b3JzIGFscmVhZHkgYmxvY2sgYmxhbmsvaW52YWxpZCBpbnB1dCk7IHRoZSBwYWdlIHNwZWNpYWwtXG4gIC8vIGNhc2VzIHRoYXQgY29weSBiZWZvcmUgZmFsbGluZyB0aHJvdWdoIGhlcmUuXG4gIGFjY291bnRSYXRlTGltaXRlZDogJ1RvbyBtYW55IHJlcXVlc3RzLiBQbGVhc2Ugd2FpdCBhIG1vbWVudCBhbmQgdGhlbiB0cnkgYWdhaW4uJyxcbiAgYWNjb3VudEJhZENvZGU6ICdUaGF0IGNvZGUgaXMgaW52YWxpZCBvciBoYXMgZXhwaXJlZC4gUGxlYXNlIHJlcXVlc3QgYSBuZXcgb25lLicsXG4gIGFjY291bnRTYW1lVmFsdWU6ICdUaGF0IGlzIGFscmVhZHkgdGhlIHZhbHVlIG9uIHlvdXIgYWNjb3VudCDigJQgdGhlIG5ldyBvbmUgbXVzdCBiZSBkaWZmZXJlbnQuJyxcbiAgLy8gR2VuZXJpYyA0MDAgZmFsbGJhY2sgZm9yIHRoZSBwcm9maWxlICsgc2hlbHRlciBicmFuY2hlcyB3aGVuIHRoZSBiYWNrZW5kXG4gIC8vIHNlbnQgbm8gdmFsaWRhdGlvbiBtZXNzYWdlIChuYW1lZCBvbmNlIOKAlCBldmVyeSBicmFuY2ggcmV1c2VzIGl0KS5cbiAgY2hlY2tJbnB1dDogJ1BsZWFzZSBjaGVjayB5b3VyIGlucHV0IGFuZCB0cnkgYWdhaW4uJyxcbiAgLy8gVGhlIDQwOSBmYWxsYmFjayB3aGVuIHRoZSBiYWNrZW5kIHNlbnQgbm8gbWVzc2FnZS5cbiAgdmFsdWVJblVzZTogJ1RoYXQgdmFsdWUgaXMgYWxyZWFkeSBpbiB1c2UuJyxcbiAgLy8gNXh4ICsgb3RoZXIgdW5oYW5kbGVkIHNlcnZlciBzdGF0dXNlczogZml4ZWQgZ2VuZXJpYyBjb3B5LiBBIG5vbi1KU09OXG4gIC8vIGJvZHkgKGUuZy4gYSByZXZlcnNlLXByb3h5IEhUTUwgZXJyb3IgcGFnZSkgbXVzdCBuZXZlciBiZSBlY2hvZWQgaW50b1xuICAvLyB0aGUgYmFubmVyIHZlcmJhdGltLlxuICBzZXJ2ZXJFcnJvcjogJ1NvbWV0aGluZyB3ZW50IHdyb25nLiBQbGVhc2UgdHJ5IGFnYWluLicsXG4gIC8vIE5ldHdvcmsvdHJhbnNwb3J0IGZhaWx1cmUgKEFwaUVycm9yLmlzTmV0d29ya0Vycm9yLCBzdGF0dXMgMCk6IHRoZVxuICAvLyBiYWNrZW5kIE5FVkVSIGFuc3dlcmVkIOKAlCB0aGVyZSBpcyBubyBiYWNrZW5kIG1lc3NhZ2UgdG8gZWNoby4gVGhpcyBpc1xuICAvLyBDTElFTlQgY29weSwgc28gaXQgaXMgYSBjYXRhbG9nIGtleSBsaWtlIHRoZSBvdGhlciBjbGllbnQtYXV0aG9yZWRcbiAgLy8gbGluZXMgKGVycm9yLm5ldHdvcmspLiBPTkUgc3RyaW5nIG9uIHB1cnBvc2U6IEFwaUVycm9yIGRvZXMgbm90XG4gIC8vIGRpc3Rpbmd1aXNoIG9mZmxpbmUgLyB1bnJlYWNoYWJsZSAvIHRpbWVvdXQgKGFsbCBhcnJpdmUgYXMgc3RhdHVzIDBcbiAgLy8gd2l0aCB0aGlzIG9uZSBtZXNzYWdlIOKAlCBzZWUgQXBpRXJyb3IuZnJvbU5ldHdvcmspLCBzbyBvbmUgaG9uZXN0IGxpbmUuXG4gIG5ldHdvcms6ICdDYW5ub3QgcmVhY2ggdGhlIGJhY2tlbmQuIEl0IG1heSBiZSBvZmZsaW5lIOKAlCBwbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBFcnJvcktpbmQgPVxuICAnbG9naW4nIHwgJ3JlZ2lzdGVyJyB8ICdyZXNldCcgfCAndmVyaWZ5JyB8ICdhY2NvdW50JyB8ICdwcm9maWxlJyB8ICdzaGVsdGVyJztcblxuLyoqXG4gKiBUaGUgZmllbGQtcXVhbGlmaWVkIDQwMCBvZiBhIGJlYW4tdmFsaWRhdGlvbiBmYWlsdXJlIOKAlCB0aGUgb25seSA0MDAgaW5cbiAqIHRoZSBjb2RlLWNvbmZpcm0gZmxvd3MgdGhhdCBpcyBOT1QgYSBjb2RlIGZhaWx1cmUuXG4gKlxuICogVGhlIGJhY2tlbmQncyBnbG9iYWwgaGFuZGxlciBtYXBzIGEgQFZhbGlkIHBheWxvYWQgZmFpbHVyZSB0b1xuICogYDQwMCArIFwiPGZpZWxkPiA8ZGVmYXVsdE1lc3NhZ2U+XCJgIChBcGlFcnJvckhhbmRsZXIudmFsaWRhdGlvbiBqb2luc1xuICogYEZpZWxkRXJyb3IuZ2V0RmllbGQoKSArIFwiIFwiICsgRmllbGRFcnJvci5nZXREZWZhdWx0TWVzc2FnZSgpYCwgZS5nLlxuICogXCJuZXdQYXNzd29yZCBQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcmFjdGVycyBsb25nXCIpLiBUaGUgZmllbGRcbiAqIHNldCBvZiBhIHJlcXVlc3QgcGF5bG9hZCBpcyBhIENMT1NFRCBzZXQg4oCUIGV4YWN0bHkgdGhlIGZpZWxkcyBvZiB0aGVcbiAqIGVuZHBvaW50J3MgcmVxdWVzdCByZWNvcmQg4oCUIHNvIGEgNDAwIG1lc3NhZ2Ugc3RhcnRpbmcgd2l0aCBvbmUgb2YgdGhlXG4gKiBsaXN0ZWQgcHJlZml4ZXMgSVMgYSBmaWVsZC1sZXZlbCB2YWxpZGF0aW9uIGZhaWx1cmUgYnkgY29uc3RydWN0aW9uLlxuICpcbiAqIFdoeSB0aGlzIGNhbm5vdCBtaXNmaXJlICh0aGUgYW50aS1lbnVtZXJhdGlvbiBjb250cmFjdCBpdCBtdXN0IG5vdFxuICogd2Vha2VuKTpcbiAqICAtIHRoZSBvbmx5IG90aGVyIDQwMCB0aGVzZSBlbmRwb2ludHMgc2VuZCBmb3IgYSBmYWlsZWQgY29kZSBjaGVjayBpcyBhXG4gKiAgICBGSVhFRCBnZW5lcmljIHN0cmluZyDigJQgXCJJbnZhbGlkIG9yIGV4cGlyZWQgcmVzZXQgY29kZVwiIC9cbiAqICAgIFwiSW52YWxpZCBvciBleHBpcmVkIHZlcmlmaWNhdGlvbiBjb2RlXCIgKHdyb25nIC8gZXhwaXJlZCAvIHVzZWQgL1xuICogICAgb3Zlci1saW1pdCBhcmUgZGVsaWJlcmF0ZWx5IGluZGlzdGluZ3Vpc2hhYmxlKSDigJQgYW5kIG5laXRoZXIgc3RhcnRzXG4gKiAgICB3aXRoIGEgbGlzdGVkIGZpZWxkIG5hbWUsIHNvIGEgZ2VudWluZSBiYWQgY29kZSBBTFdBWVMga2VlcHMgdGhlXG4gKiAgICBnZW5lcmljIGNvcHk7XG4gKiAgLSB0aGUgbWFsZm9ybWVkLWJvZHkgNDAwcyBzYXkgXCJNYWxmb3JtZWQgcmVxdWVzdFwiIChubyBmaWVsZCBwcmVmaXgpO1xuICogIC0gaWYgYSBmdXR1cmUgRFRPIGZpZWxkIGlzIGV2ZXIgYWRkZWQgd2l0aG91dCB1cGRhdGluZyB0aGlzIHRhYmxlLCB0aGVcbiAqICAgIG1lc3NhZ2UgZmFsbHMgYmFjayB0byB0aGUgR0VORVJJQyBjb3B5IOKAlCB0aGUgZmFpbHVyZSBkaXJlY3Rpb24gaXNcbiAqICAgIHNhZmU6IGEgdmFsaWRhdGlvbiBmYWlsdXJlIGNhbiByZWFkIGFzIFwiYmFkIGNvZGVcIiwgbmV2ZXIgdGhlIHJldmVyc2VcbiAqICAgIChhIGNvZGUgZmFpbHVyZSBjYW4gbmV2ZXIgYmUgbWlzcmVhZCBhcyB2YWxpZGF0aW9uLCBpdHMgbWVzc2FnZSBpc1xuICogICAgdGhlIGZpeGVkIHN0cmluZykuXG4gKi9cbmNvbnN0IEZJRUxEX1ZBTElEQVRJT05fUFJFRklYRVM6IFBhcnRpYWw8UmVjb3JkPEVycm9yS2luZCwgcmVhZG9ubHkgc3RyaW5nW10+PiA9IHtcbiAgLy8gUGFzc3dvcmQtcmVzZXQgcGF5bG9hZHM6IFBhc3N3b3JkUmVzZXRSZXF1ZXN0LmVtYWlsLCBhbmRcbiAgLy8gUGFzc3dvcmRSZXNldENvbmZpcm1SZXF1ZXN0LmVtYWlsIC8gLmNvZGUgLyAubmV3UGFzc3dvcmQuXG4gIHJlc2V0OiBbJ2VtYWlsICcsICdjb2RlICcsICduZXdQYXNzd29yZCAnXSxcbiAgLy8gVmVyaWZ5LWNvbmZpcm0gcGF5bG9hZDogVmVyaWZ5Q29uZmlybVJlcXVlc3QubGV2ZWwgLyAuY29kZS5cbiAgdmVyaWZ5OiBbJ2xldmVsICcsICdjb2RlICddLFxufTtcblxuZnVuY3Rpb24gaXNGaWVsZFZhbGlkYXRpb240MDAoa2luZDogRXJyb3JLaW5kLCBtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChGSUVMRF9WQUxJREFUSU9OX1BSRUZJWEVTW2tpbmRdID8/IFtdKS5zb21lKChwcmVmaXgpID0+IG1lc3NhZ2Uuc3RhcnRzV2l0aChwcmVmaXgpKTtcbn1cblxuLyoqXG4gKiBUaGUgQ0xJRU5ULWF1dGhvcmVkIGJhbm5lciBjb3B5IGtleXMgKHRoZSBgZXJyb3IuKmAgTWVzc2FnZXMgbmFtZXNwYWNlKTpcbiAqIHRoZSBpMThuLWF3YXJlIHNlYW0gZm9yIGJhbm5lck1lc3NhZ2UoKS4gV2hlbiBhIHRyYW5zbGF0ZSBjYWxsYmFjayBpc1xuICogcGFzc2VkLCB0aGUgY2xpZW50IGNvcHkgaXMgc2VydmVkIHRocm91Z2ggaXQgKHRoZSBhY3RpdmUgbG9jYWxlKTsgc2VydmVyLVxuICogcHJvdmlkZWQgbWVzc2FnZXMgKEFwaUVycm9yLm1lc3NhZ2UpIGFyZSBzdGlsbCBlY2hvZWQgYXMtaXMg4oCUIHRoZXkgYXJlXG4gKiBiYWNrZW5kIGNvcHkgYW5kIG5vdCBjYXRhbG9nIGtleXMuIFRoZSBORVRXT1JLIGJyYW5jaCBpcyB0aGUgb25lXG4gKiBleGNlcHRpb24gdG8gdGhlIGVjaG8gcnVsZTogYSBzdGF0dXMtMCBlcnJvciBoYXMgbm8gYmFja2VuZCBtZXNzYWdlIGF0XG4gKiBhbGwgKHRoZSBoYXJkY29kZWQgZnJvbU5ldHdvcmsoKSBsaW5lIGlzIGEgcGxhY2Vob2xkZXIsIG5vdCBjb3B5KSwgc28gaXRcbiAqIGlzIHNlcnZlZCB0aHJvdWdoIHRoZSBzZWFtIHRvbywgYXMgZXJyb3IubmV0d29yay4gQ2FsbGVycyB0aGF0IHBhc3Mgbm9cbiAqIGNhbGxiYWNrIGdldCB0aGUgbGVnYWN5IEVuZ2xpc2ggY29uc3RhbnRzIChiZWhhdmlvciB1bmNoYW5nZWQg4oCUIHRoZSBhdXRoXG4gKiBwYWdlcywgbWFwLCBldGMuIGtlZXAgdGhlaXIgY3VycmVudCBiYW5uZXIgY29weSkuXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9yQ29weUtleSA9XG4gIHwgJ2Vycm9yLnJhdGVMaW1pdGVkJ1xuICB8ICdlcnJvci51bmF1dGhvcml6ZWQnXG4gIHwgJ2Vycm9yLmludmFsaWRDcmVkZW50aWFscydcbiAgfCAnZXJyb3IucmVzZXRCYWRDb2RlJ1xuICB8ICdlcnJvci5jaGVja0lucHV0J1xuICB8ICdlcnJvci5zZXJ2ZXJFcnJvcidcbiAgfCAnZXJyb3IudmFsdWVJblVzZSdcbiAgfCAnZXJyb3IudmVyaWZ5UmF0ZUxpbWl0ZWQnXG4gIHwgJ2Vycm9yLnZlcmlmeUJhZENvZGUnXG4gIHwgJ2Vycm9yLmFjY291bnRSYXRlTGltaXRlZCdcbiAgfCAnZXJyb3IuYWNjb3VudEJhZENvZGUnXG4gIHwgJ2Vycm9yLm5ldHdvcmsnO1xuXG4vKiogVGhlIGxlZ2FjeSBFbmdsaXNoIGNvcHkgYmVoaW5kIGVhY2gga2V5ICh0aGUgZGVmYXVsdCB3aGVuIG5vIGNhbGxiYWNrKS4gKi9cbmNvbnN0IENMSUVOVF9DT1BZOiBSZWNvcmQ8RXJyb3JDb3B5S2V5LCBzdHJpbmc+ID0ge1xuICAnZXJyb3IucmF0ZUxpbWl0ZWQnOiBDT1BZLnJhdGVMaW1pdGVkLFxuICAnZXJyb3IudW5hdXRob3JpemVkJzogQ09QWS51bmF1dGhvcml6ZWQsXG4gICdlcnJvci5pbnZhbGlkQ3JlZGVudGlhbHMnOiBDT1BZLmludmFsaWRDcmVkZW50aWFscyxcbiAgJ2Vycm9yLnJlc2V0QmFkQ29kZSc6IENPUFkucmVzZXRCYWRDb2RlLFxuICAnZXJyb3IuY2hlY2tJbnB1dCc6IENPUFkuY2hlY2tJbnB1dCxcbiAgJ2Vycm9yLnNlcnZlckVycm9yJzogQ09QWS5zZXJ2ZXJFcnJvcixcbiAgJ2Vycm9yLnZhbHVlSW5Vc2UnOiBDT1BZLnZhbHVlSW5Vc2UsXG4gICdlcnJvci52ZXJpZnlSYXRlTGltaXRlZCc6IENPUFkudmVyaWZ5UmF0ZUxpbWl0ZWQsXG4gICdlcnJvci52ZXJpZnlCYWRDb2RlJzogQ09QWS52ZXJpZnlCYWRDb2RlLFxuICAnZXJyb3IuYWNjb3VudFJhdGVMaW1pdGVkJzogQ09QWS5hY2NvdW50UmF0ZUxpbWl0ZWQsXG4gICdlcnJvci5hY2NvdW50QmFkQ29kZSc6IENPUFkuYWNjb3VudEJhZENvZGUsXG4gICdlcnJvci5uZXR3b3JrJzogQ09QWS5uZXR3b3JrLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJhbm5lck1lc3NhZ2UoXG4gIGVycm9yOiB1bmtub3duLFxuICBraW5kOiBFcnJvcktpbmQsXG4gIHRyYW5zbGF0ZT86IChrZXk6IEVycm9yQ29weUtleSkgPT4gc3RyaW5nLFxuKTogc3RyaW5nIHtcbiAgY29uc3QgdHIgPSAoa2V5OiBFcnJvckNvcHlLZXkpOiBzdHJpbmcgPT5cbiAgICB0cmFuc2xhdGUgPT09IHVuZGVmaW5lZCA/IENMSUVOVF9DT1BZW2tleV0gOiB0cmFuc2xhdGUoa2V5KTtcbiAgY29uc3QgYXBpID0gZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvciA/IGVycm9yIDogdG9BcGlFcnJvcihlcnJvcik7XG4gIGlmIChhcGkuaXNOZXR3b3JrRXJyb3IpIHtcbiAgICAvLyBDbGllbnQgY29weSwgbm90IGEgYmFja2VuZCBtZXNzYWdlOiB0aGUgYmFja2VuZCBuZXZlciBhbnN3ZXJlZCAobm9cbiAgICAvLyBIVFRQIHJlc3BvbnNlIGF0IGFsbCDigJQgb2ZmbGluZSAvIHVucmVhY2hhYmxlIC8gdGltZW91dCwgb25lIHN0YXRlIGluXG4gICAgLy8gQXBpRXJyb3IpLCBzbyB0aGVyZSBpcyBub3RoaW5nIHRvIGVjaG8uIFNlcnZlZCB0aHJvdWdoIHRoZSBzZWFtOyBhXG4gICAgLy8gY2FsbGVyIHdpdGggbm8gY2FsbGJhY2sgZ2V0cyB0aGUgbGVnYWN5IEVuZ2xpc2ggY29uc3RhbnQgKENPUFkubmV0d29ya1xuICAgIC8vIGlzIGJ5dGUtaWRlbnRpY2FsIHRvIEFwaUVycm9yLmZyb21OZXR3b3JrJ3MgbWVzc2FnZSwgc28gYmVoYXZpb3IgaXNcbiAgICAvLyB1bmNoYW5nZWQgZm9yIHRoZW0pLlxuICAgIHJldHVybiB0cignZXJyb3IubmV0d29yaycpO1xuICB9XG4gIHN3aXRjaCAoYXBpLnN0YXR1cykge1xuICAgIGNhc2UgNDI5OlxuICAgICAgaWYgKGtpbmQgPT09ICd2ZXJpZnknKSB7XG4gICAgICAgIHJldHVybiB0cignZXJyb3IudmVyaWZ5UmF0ZUxpbWl0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmIChraW5kID09PSAnYWNjb3VudCcpIHtcbiAgICAgICAgcmV0dXJuIHRyKCdlcnJvci5hY2NvdW50UmF0ZUxpbWl0ZWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cignZXJyb3IucmF0ZUxpbWl0ZWQnKTtcbiAgICBjYXNlIDQwMTpcbiAgICAgIC8vIFByb2ZpbGUgZWRpdDogdGhlIGJhY2tlbmQncyBcImN1cnJlbnQgcGFzc3dvcmQgaXMgaW5jb3JyZWN0XCIgSVMgdGhlXG4gICAgICAvLyB1c2VyLWZhY2luZyB0ZXh0IChpdCBpcyBuZXZlciB0aGUgXCJ3cm9uZyBwYXNzd29yZFwiIHdvcmRpbmcpLlxuICAgICAgaWYgKGtpbmQgPT09ICdwcm9maWxlJykge1xuICAgICAgICByZXR1cm4gYXBpLm1lc3NhZ2UgfHwgdHIoJ2Vycm9yLnVuYXV0aG9yaXplZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtpbmQgPT09ICdsb2dpbidcbiAgICAgICAgPyB0cignZXJyb3IuaW52YWxpZENyZWRlbnRpYWxzJylcbiAgICAgICAgOiBhcGkubWVzc2FnZSB8fCB0cignZXJyb3IudW5hdXRob3JpemVkJyk7XG4gICAgY2FzZSA0MDA6XG4gICAgICAvLyBQYXNzd29yZC1yZXNldCBjb25maXJtOiBhIEZJRUxELUxFVkVMIFZBTElEQVRJT04gZmFpbHVyZSAoc2hvcnRcbiAgICAgIC8vIHBhc3N3b3JkLCBibGFuayBmaWVsZCDigJQgdGhlIGZvcm0gbm93IGJsb2NrcyB0aGVzZSBjbGllbnQtc2lkZSwgdGhlXG4gICAgICAvLyBzZXJ2ZXIgaXMgdGhlIGJhY2tzdG9wKSBpcyBlY2hvZWQgaG9uZXN0bHk6IHRoZSBtZXNzYWdlIG5hbWVzIGFcbiAgICAgIC8vIGZpZWxkLCBuZXZlciB0aGUgY29kZS4gRVZFUllUSElORyBlbHNlICh3cm9uZy9leHBpcmVkL3VzZWQvXG4gICAgICAvLyBvdmVyLWxpbWl0IOKAlCBPTkUgZ2VuZXJpYyA0MDAgYnkgZGVzaWduLCBwbHVzIHRoZSBtYWxmb3JtZWQtYm9keVxuICAgICAgLy8gNDAwcykga2VlcHMgdGhlIGdlbmVyaWMgYmFkLWNvZGUgY29weTogdGhlIFVJIG11c3QgbmV2ZXIgcmV2ZWFsXG4gICAgICAvLyB3aGljaCBjaGVjayBmYWlsZWQgKGFudGktZW51bWVyYXRpb24pLlxuICAgICAgaWYgKGtpbmQgPT09ICdyZXNldCcpIHtcbiAgICAgICAgcmV0dXJuIGlzRmllbGRWYWxpZGF0aW9uNDAwKGtpbmQsIGFwaS5tZXNzYWdlKSA/IGFwaS5tZXNzYWdlIDogdHIoJ2Vycm9yLnJlc2V0QmFkQ29kZScpO1xuICAgICAgfVxuICAgICAgLy8gUHJvZmlsZSBlZGl0OiBlY2hvIHRoZSB2YWxpZGF0aW9uIG1lc3NhZ2UgKGJsYW5rIGZpZWxkLCBldGMuKS5cbiAgICAgIGlmIChraW5kID09PSAncHJvZmlsZScpIHtcbiAgICAgICAgcmV0dXJuIGFwaS5tZXNzYWdlIHx8IHRyKCdlcnJvci5jaGVja0lucHV0Jyk7XG4gICAgICB9XG4gICAgICAvLyBWZXJpZmljYXRpb24gY29uZmlybTogc2FtZSBjb250cmFjdCBhcyByZXNldCDigJQgZmllbGQtcXVhbGlmaWVkXG4gICAgICAvLyB2YWxpZGF0aW9uIGVjaG9lcyAoaXQgcmV2ZWFscyBub3RoaW5nIGFib3V0IHRoZSBjb2RlKTsgdGhlIGZpeGVkXG4gICAgICAvLyB3cm9uZy9leHBpcmVkL2xvY2tvdXQgc3RyaW5nIHN0YXlzIGdlbmVyaWMgKGZpdmUgd3JvbmcgY29kZXMgbG9ja1xuICAgICAgLy8gdGhlIGNvZGUgb3V0OyB0aGUgbG9ja291dCBtdXN0IGJlIGluZGlzdGluZ3Vpc2hhYmxlIGZyb20gYSBiYWRcbiAgICAgIC8vIGNvZGUsIHNvIGl0IGtlZXBzIHRoZSBzYW1lIGNvcHkpLiBBIHJhdGUgbGltaXQgbmV2ZXIgcmVhY2hlcyB0aGlzXG4gICAgICAvLyBlbmRwb2ludCAoSldULWd1YXJkZWQsIG5vIElQIGJ1Y2tldCDigJQgNDI5cyBhcmUgcmVxdWVzdC1waGFzZSBvbmx5KS5cbiAgICAgIGlmIChraW5kID09PSAndmVyaWZ5Jykge1xuICAgICAgICByZXR1cm4gaXNGaWVsZFZhbGlkYXRpb240MDAoa2luZCwgYXBpLm1lc3NhZ2UpID8gYXBpLm1lc3NhZ2UgOiB0cignZXJyb3IudmVyaWZ5QmFkQ29kZScpO1xuICAgICAgfVxuICAgICAgLy8gQ29udGFjdC1jaGFuZ2UgY29uZmlybTogd3JvbmcvZXhwaXJlZC9uby1wZW5kaW5nIGNvZGUuIFJlcXVlc3QtcGhhc2VcbiAgICAgIC8vIDQwMHMgKFwic2FtZSBhcyBjdXJyZW50XCIpIGFyZSBoYW5kbGVkIGJ5IHRoZSBwYWdlIHdpdGggZGVkaWNhdGVkIGNvcHkuXG4gICAgICBpZiAoa2luZCA9PT0gJ2FjY291bnQnKSB7XG4gICAgICAgIHJldHVybiB0cignZXJyb3IuYWNjb3VudEJhZENvZGUnKTtcbiAgICAgIH1cbiAgICAgIC8vIFNoZWx0ZXIgZGV0YWlsL3Jldmlld3Mvc3VibWl0OiBlY2hvIHRoZSBiYWNrZW5kIG1lc3NhZ2UgKGl0IGlzIHRoZVxuICAgICAgLy8gaG9uZXN0IHVzZXItZmFjaW5nIHRleHQgZm9yIDQwMC80MDMvNDA5IHRoZXJlKS5cbiAgICAgIHJldHVybiBhcGkubWVzc2FnZSB8fCB0cignZXJyb3IuY2hlY2tJbnB1dCcpO1xuICAgIGNhc2UgNDA5OlxuICAgICAgcmV0dXJuIGFwaS5tZXNzYWdlIHx8IHRyKCdlcnJvci52YWx1ZUluVXNlJyk7XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIDV4eCAoYW5kIGFueSBvdGhlciBzdGF0dXMgPj0gNTAwKTogYWx3YXlzIHRoZSBmaXhlZCBnZW5lcmljIGNvcHkg4oCUXG4gICAgICAvLyBuZXZlciBlY2hvIHRoZSBib2R5LiBBIG5vbi1KU09OIGJvZHkgKHJldmVyc2UtcHJveHkgSFRNTCBzdWNoIGFzXG4gICAgICAvLyBcIjxodG1sPi4uLjUwMiBCYWQgR2F0ZXdheS4uLjwvaHRtbD5cIikgbXVzdCBub3Qgc3VyZmFjZSB2ZXJiYXRpbVxuICAgICAgLy8gTG93ZXIgdW5oYW5kbGVkIHN0YXR1c2VzIGtlZXAgdGhlIGVjaG8gZmFsbGJhY2suXG4gICAgICBpZiAoYXBpLnN0YXR1cyA+PSA1MDApIHtcbiAgICAgICAgcmV0dXJuIHRyKCdlcnJvci5zZXJ2ZXJFcnJvcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFwaS5tZXNzYWdlIHx8IHRyKCdlcnJvci5zZXJ2ZXJFcnJvcicpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBIdHRwQ2xpZW50LCBIdHRwSGVhZGVycywgSHR0cFJlc3BvbnNlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xuaW1wb3J0IHsgaW5qZWN0LCBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgdHlwZSB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1hcCwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZW52aXJvbm1lbnQgfSBmcm9tICcuLi8uLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgdG9BcGlFcnJvciB9IGZyb20gJy4vYXBpLWVycm9yJztcblxuZXhwb3J0IHR5cGUgSHR0cE1ldGhvZCA9ICdHRVQnIHwgJ1BPU1QnIHwgJ1BVVCcgfCAnREVMRVRFJztcblxuLyoqXG4gKiBUaGUgb25seSBjbGFzcyBhbGxvd2VkIHRvIHRvdWNoIEh0dHBDbGllbnQgKDAxLVRBU0subWQgwqc0IGRlcGVuZGVuY3kgcnVsZSkuXG4gKlxuICogRXZlcnkgZmFpbHVyZSDigJQgSFRUUCBlcnJvciBvciBuZXR3b3JrIGVycm9yIOKAlCBpcyBjb252ZXJ0ZWQgaW50byBhbiBBcGlFcnJvclxuICogKG1pcnJvcmluZyB0aGUgYmFja2VuZCBFcnJvclJlc3BvbnNlKSB2aWEgYSBzaW5nbGUgY2F0Y2hFcnJvci4gQ29uc3VtZXJzXG4gKiAoZ2F0ZXdheXMsIHBhZ2VzKSBuZXZlciBzZWUgcmF3IEh0dHBFcnJvclJlc3BvbnNlcy5cbiAqXG4gKiBCYXNlIFVSTCBjb21lcyBmcm9tIGVudmlyb25tZW50LmFwaVVybCAocHVibGljIGNvbmZpZyBvbmx5IOKAlCBuZXZlciB0b2tlbnMpLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIEFwaUNsaWVudCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgaHR0cCA9IGluamVjdChIdHRwQ2xpZW50KTtcbiAgcHJpdmF0ZSByZWFkb25seSBiYXNlVXJsID0gZW52aXJvbm1lbnQuYXBpVXJsLnJlcGxhY2UoL1xcLyskLywgJycpO1xuXG4gIGdldDxUPihwYXRoOiBzdHJpbmcpOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFQ+KCdHRVQnLCBwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIEdFVCB3aXRoIHRoZSByZXNwb25zZSBIRUFERVJTIHN1cmZhY2VkIGFsb25nc2lkZSB0aGUgYm9keSDigJQgdGhlXG4gICAqIHBhZ2luZy1tZXRhZGF0YSBzZWFtICh0aGUgZ3VpZGFuY2UgaW5kZXgncyBYLVRvdGFsLUNvdW50IHJpZGVzIGFcbiAgICogaGVhZGVyLCBub3QgdGhlIGJvZHksIHNvIHRoZSBwYWdlZCBhbmQgdW4tcGFnZWQgYW5zd2VycyBzaGFyZSBvbmVcbiAgICogcmVzcG9uc2Ugc2hhcGUpLiBUaGUgYm9keSBwYXJzZXMgZXhhY3RseSBsaWtlIHtAbGluayBnZXR9OyB0aGVcbiAgICogY2FsbGVyIHJlYWRzIHRoZSBzZWxlY3RlZCBoZWFkZXIgYnkgbmFtZS4gVGhlIGF1dGggaW50ZXJjZXB0b3IgYW5kXG4gICAqIHRoZSBjZW50cmFsIEFwaUVycm9yIG1hcHBpbmcgYXJlIHVuY2hhbmdlZC5cbiAgICovXG4gIGdldFdpdGhIZWFkZXJzPFQ+KHBhdGg6IHN0cmluZyk6IE9ic2VydmFibGU8eyBib2R5OiBUOyBoZWFkZXJzOiBIdHRwSGVhZGVycyB9PiB7XG4gICAgY29uc3QgdXJsID0gcGF0aC5zdGFydHNXaXRoKCdodHRwJykgPyBwYXRoIDogYCR7dGhpcy5iYXNlVXJsfSR7cGF0aH1gO1xuICAgIHJldHVybiB0aGlzLmh0dHBcbiAgICAgIC5yZXF1ZXN0PFQ+KCdHRVQnLCB1cmwsIHsgb2JzZXJ2ZTogJ3Jlc3BvbnNlJyB9KVxuICAgICAgLnBpcGUoXG4gICAgICAgIG1hcCgocmVzcG9uc2U6IEh0dHBSZXNwb25zZTxUPikgPT4gKHsgYm9keTogcmVzcG9uc2UuYm9keSBhcyBULCBoZWFkZXJzOiByZXNwb25zZS5oZWFkZXJzIH0pKSxcbiAgICAgICAgY2F0Y2hFcnJvcigoZXJyb3I6IHVua25vd24pID0+IHRocm93RXJyb3IoKCkgPT4gdG9BcGlFcnJvcihlcnJvcikpKSxcbiAgICAgICk7XG4gIH1cblxuICBwb3N0PFQ+KHBhdGg6IHN0cmluZywgYm9keT86IHVua25vd24pOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFQ+KCdQT1NUJywgcGF0aCwgYm9keSk7XG4gIH1cblxuICBwdXQ8VD4ocGF0aDogc3RyaW5nLCBib2R5PzogdW5rbm93bik6IE9ic2VydmFibGU8VD4ge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Q8VD4oJ1BVVCcsIHBhdGgsIGJvZHkpO1xuICB9XG5cbiAgZGVsZXRlPFQgPSB2b2lkPihwYXRoOiBzdHJpbmcpOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFQ+KCdERUxFVEUnLCBwYXRoKTtcbiAgfVxuXG4gIHJlcXVlc3Q8VD4obWV0aG9kOiBIdHRwTWV0aG9kLCBwYXRoOiBzdHJpbmcsIGJvZHk/OiB1bmtub3duKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgY29uc3QgdXJsID0gcGF0aC5zdGFydHNXaXRoKCdodHRwJykgPyBwYXRoIDogYCR7dGhpcy5iYXNlVXJsfSR7cGF0aH1gO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBib2R5ID09PSB1bmRlZmluZWQgPyB7fSA6IHsgYm9keSB9O1xuICAgIHJldHVybiB0aGlzLmh0dHBcbiAgICAgIC5yZXF1ZXN0PFQ+KG1ldGhvZCwgdXJsLCBvcHRpb25zKVxuICAgICAgLnBpcGUoY2F0Y2hFcnJvcigoZXJyb3I6IHVua25vd24pID0+IHRocm93RXJyb3IoKCkgPT4gdG9BcGlFcnJvcihlcnJvcikpKSk7XG4gIH1cbn1cbiIsImV4cG9ydCBjb25zdCBlbnZpcm9ubWVudCA9IHsgcHJvZHVjdGlvbjogZmFsc2UsIGFwaVVybDogJycgfTtcbiJdLCJtYXBwaW5ncyI6IjtBQUFBLFNBQXNCLHlCQUF5QjtBQWUvQyxJQUFNLGlCQUFpQjtBQUV2QixTQUFTLGFBQWEsUUFBd0I7QUFDNUMsVUFBUSxRQUFRO0FBQUEsSUFDZCxLQUFLO0FBQ0gsYUFBTztBQUFBLElBQ1QsS0FBSztBQUNILGFBQU87QUFBQSxJQUNULEtBQUs7QUFDSCxhQUFPO0FBQUEsSUFDVCxLQUFLO0FBQ0gsYUFBTztBQUFBLElBQ1QsS0FBSztBQUNILGFBQU87QUFBQSxJQUNULEtBQUs7QUFDSCxhQUFPO0FBQUEsSUFDVCxLQUFLO0FBQ0gsYUFBTztBQUFBLElBQ1QsS0FBSztBQUNILGFBQU87QUFBQSxJQUNULEtBQUs7QUFDSCxhQUFPO0FBQUEsSUFDVCxLQUFLO0FBQ0gsYUFBTztBQUFBLElBQ1Q7QUFDRSxhQUFPLFFBQVEsTUFBTTtBQUFBLEVBQ3pCO0FBQ0Y7QUFPQSxTQUFTLHVCQUF1QixLQUFtQztBQUNqRSxNQUFJLFFBQVEsTUFBTTtBQUNoQixXQUFPO0FBQUEsRUFDVDtBQUNBLFFBQU0sUUFBUSxJQUFJLEtBQUs7QUFDdkIsTUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLEdBQUc7QUFDeEIsV0FBTztBQUFBLEVBQ1Q7QUFDQSxRQUFNLFVBQVUsT0FBTyxLQUFLO0FBQzVCLFNBQU8sT0FBTyxjQUFjLE9BQU8sSUFBSSxVQUFVO0FBQ25EO0FBRUEsU0FBUyxvQkFBb0IsU0FBZ0Q7QUFDM0UsTUFBSSxZQUFZLFFBQVEsT0FBTyxZQUFZLFVBQVU7QUFDbkQsV0FBTztBQUFBLEVBQ1Q7QUFDQSxRQUFNLFNBQVM7QUFDZixTQUNFLE9BQU8sT0FBTyxXQUFXLE1BQU0sWUFD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