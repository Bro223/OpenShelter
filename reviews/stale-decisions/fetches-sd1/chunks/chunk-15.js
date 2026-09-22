import {
  AuthGateway
} from "/chunk-T7PPW65J.js";
import {
  ApiClient,
  ApiError
} from "/chunk-WYACYUPC.js";

// src/app/gateways/account-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var AccountGateway = class _AccountGateway {
  api = inject(ApiClient);
  /** GET /account/me -> the authenticated user's real profile + verified claims. */
  me() {
    return lastValueFrom(this.api.get("/account/me"));
  }
  /** PUT /account/profile {name, currentPassword} -> the fresh MeResponse. */
  updateProfile(request) {
    return lastValueFrom(this.api.put("/account/profile", request));
  }
  /** POST /account/email-change/request {newEmail} -> 202 + ResendAck (code via SMS to the current phone). */
  requestEmailChange(newEmail) {
    const body = { newEmail };
    return lastValueFrom(this.api.post("/account/email-change/request", body));
  }
  /** POST /account/email-change/confirm {code} -> 200. */
  confirmEmailChange(code) {
    const body = { code };
    return lastValueFrom(this.api.post("/account/email-change/confirm", body));
  }
  /** POST /account/phone-change/request {newPhone} -> 202 + ResendAck (code via email to the current address). */
  requestPhoneChange(newPhone) {
    const body = { newPhone };
    return lastValueFrom(this.api.post("/account/phone-change/request", body));
  }
  /** POST /account/phone-change/confirm {code} -> 200. */
  confirmPhoneChange(code) {
    const body = { code };
    return lastValueFrom(this.api.post("/account/phone-change/confirm", body));
  }
  /**
   * GET /account/export -> the caller's own data in one document
   * (legal-recovery): profile + shelters. The page turns the body
   * into a downloadable JSON file.
   */
  exportData() {
    return lastValueFrom(this.api.get("/account/export"));
  }
  /**
   * DELETE /account -> 204 (legal-recovery): the account
   * erasure — the backend purges the declared private-home shelters,
   * orphans the public community rows and cascades the rest. A repeat
   * call is a no-op, so a double click never hard-fails.
   */
  deleteAccount() {
    return lastValueFrom(this.api.delete("/account"));
  }
  static \u0275fac = function AccountGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AccountGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _AccountGateway, factory: _AccountGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(AccountGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/session/auth-store.ts
import { inject as inject2, Injectable as Injectable3, signal as signal2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";

// src/app/core/token-store.ts
import { Injectable as Injectable2, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var REFRESH_TOKEN_KEY = "os.refresh";
var TokenStore = class _TokenStore {
  accessToken = signal(
    null,
    ...ngDevMode ? [{ debugName: "accessToken" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Current in-memory access token, if any. */
  access() {
    return this.accessToken();
  }
  /** Persisted refresh token, if any. */
  refresh() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  /**
   * Store a token pair. The backend's `expiresIn` is intentionally not
   * stored: expiry is enforced server-side via 401s.
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken.set(accessToken);
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
    }
  }
  /** Drop the whole session: access signal + persisted refresh token. */
  clear() {
    this.accessToken.set(null);
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
    }
  }
  static \u0275fac = function TokenStore_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TokenStore)();
  };
  static \u0275prov = /* @__PURE__ */ i02.\u0275\u0275defineInjectable({ token: _TokenStore, factory: _TokenStore.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(TokenStore, [{
    type: Injectable2,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/session/auth-store.ts
import * as i03 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var AuthStore = class _AuthStore {
  /** True while an access token is usable (session active). */
  authenticated = signal2(
    false,
    ...ngDevMode ? [{ debugName: "authenticated" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * True once init() has DECISIVELY decided the boot state — the shell can
   * render a neutral header until then instead of flashing "logged out".
   * A non-401 boot failure (backend down) leaves this false ON PURPOSE:
   * the stored refresh token may still be valid, so a later guard call
   * retries performInit instead of latching the session dead forever.
   */
  initialized = signal2(
    false,
    ...ngDevMode ? [{ debugName: "initialized" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- real profile (GET /account/me) --------------------------------------
  /**
   * The fetched profile, or null while unknown (never logged in yet, or a
   * failed fetch). Read via `name()`/`email()`/… in templates.
   */
  name = signal2(
    null,
    ...ngDevMode ? [{ debugName: "name" }] : (
      /* istanbul ignore next */
      []
    )
  );
  email = signal2(
    null,
    ...ngDevMode ? [{ debugName: "email" }] : (
      /* istanbul ignore next */
      []
    )
  );
  phone = signal2(
    null,
    ...ngDevMode ? [{ debugName: "phone" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The REAL verified levels (EMAIL/PHONE) from the fetched profile. Read via
   * `levels()` in templates and guards; written ONLY by {@link refreshProfile}
   * / {@link clearSession}. SMART_ID can appear in a future response — the
   * backend currently rejects it as a stub.
   */
  levels = signal2(
    [],
    ...ngDevMode ? [{ debugName: "levels" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * True for the ADMIN-kind account (admin-moderation D1/D2): adopted from
   * the fetched profile (`isAdmin` is always present — false for every
   * regular user) and reset to false with the profile. The kind is the
   * truth server-side (fresh lookup per /admin/* request, never a JWT
   * claim); this is only the UI's copy of it for the nav item and the
   * /admin guard. A failed profile fetch leaves it false — fail-closed.
   */
  isAdmin = signal2(
    false,
    ...ngDevMode ? [{ debugName: "isAdmin" }] : (
      /* istanbul ignore next */
      []
    )
  );
  tokens = inject2(TokenStore);
  authGateway = inject2(AuthGateway);
  accountGateway = inject2(AccountGateway);
  /** In-flight single-flight refresh — concurrent callers share one promise. */
  pendingRefresh = null;
  /** In-flight boot init — guards and the shell may race on the same init. */
  bootInit = null;
  /** In-flight profile fetch — concurrent callers share one run. */
  pendingProfile = null;
  /**
   * Session identity generation (see class doc). Bumped by clearSession()
   * and login() — both start a new generation, and any async work that
   * started under the previous generation must not write this session.
   */
  epoch = 0;
  /**
   * Boot-time silent refresh. No persisted refresh token -> anonymous.
   * Valid token -> rotates the pair via the SAME single-flight refresh()
   * path a mid-session 401 uses and fetches the real profile; 401 ->
   * expired, cleared, definitively initialized. A non-401 failure (backend
   * down) keeps the refresh token AND leaves initialized false, so a later
   * guard call retries the boot.
   *
   * Idempotent and single-flight: concurrent callers (App boot + a guard on
   * the first navigation) share one run so the refresh token is never
   * raced. A failed run is releasable — the pending boot promise is always
   * cleared, so the next init() re-attempts.
   */
  init() {
    if (this.initialized()) {
      return Promise.resolve();
    }
    if (this.bootInit !== null) {
      return this.bootInit;
    }
    const run = this.performInit().finally(() => {
      this.bootInit = null;
    });
    this.bootInit = run;
    return run;
  }
  async performInit() {
    const refreshToken = this.tokens.refresh();
    if (refreshToken === null) {
      this.authenticated.set(false);
      this.initialized.set(true);
      return;
    }
    const refreshed = await this.refresh();
    if (refreshed) {
      await this.refreshProfile();
      this.initialized.set(true);
      return;
    }
    this.authenticated.set(false);
    if (this.tokens.refresh() !== null) {
      return;
    }
    this.initialized.set(true);
  }
  /**
   * Register a new account. The backend answers 201 with an empty body — no
   * session is created (register != login). Errors (400/409) propagate as
   * ApiError to the caller.
   */
  register(request) {
    return this.authGateway.register(request);
  }
  /**
   * Log in with email-or-phone + password. Stores the returned pair, marks
   * the session authenticated, and fetches the real profile. Throws ApiError
   * on a failed login (401/429) — a failed profile fetch is NON-fatal: the
   * session is live, the profile stays null (the account page offers a
   * retry).
   *
   * A login is a NEW identity generation: it bumps the epoch (so any stale
   * in-flight profile fetch from a previous identity can never be adopted
   * onto this session) and discards the single-flight profile slot so
   * the stale fetch is not awaited under the new identity.
   */
  async login(emailOrPhone, password) {
    const pair = await this.authGateway.login(emailOrPhone, password);
    this.epoch += 1;
    this.pendingProfile = null;
    this.clearProfile();
    this.tokens.setTokens(pair.accessToken, pair.refreshToken);
    this.authenticated.set(true);
    await this.refreshProfile();
  }
  /**
   * Log out: best-effort POST /auth/logout (revokes the refresh token
   * server-side), then local state is cleared regardless of network outcome.
   */
  async logout() {
    const refreshToken = this.tokens.refresh();
    if (refreshToken !== null) {
      try {
        await this.authGateway.logout(refreshToken);
      } catch {
      }
    }
    this.clearSession();
  }
  /**
   * Single-flight session refresh (03-CONTEXT decision 2). Concurrent callers
   * (e.g. N parallel 401s, or the boot rotation) share ONE in-flight
   * POST /auth/refresh — the old rotated refresh token is never used twice.
   * Returns true when a fresh pair was stored, false when the session is
   * dead (storage cleared) or the refresh could not run (no token).
   */
  refresh() {
    if (this.pendingRefresh !== null) {
      return this.pendingRefresh;
    }
    const attempt = this.doRefresh();
    this.pendingRefresh = attempt;
    return attempt;
  }
  async doRefresh() {
    const startEpoch = this.epoch;
    const presented = this.tokens.refresh();
    if (presented === null) {
      return false;
    }
    try {
      await this.rotateWithCrossTabRecovery(presented);
      if (startEpoch !== this.epoch) {
        this.tokens.clear();
        this.authenticated.set(false);
        return false;
      }
      this.authenticated.set(true);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.clearSession();
      }
      this.authenticated.set(false);
      return false;
    } finally {
      this.pendingRefresh = null;
    }
  }
  /**
   * Rotate the given refresh token. Cross-tab race: all tabs share the
   * ONE persisted refresh token while single-flight is per-instance — if
   * another tab rotated it in flight, our presented token 401s. On that 401
   * re-read storage: if the token changed, retry ONCE with the fresh token
   * before giving up. Anything else (unchanged token, network/5xx) rethrows
   * for the caller to classify — nothing is cleared here.
   */
  async rotateWithCrossTabRecovery(presented) {
    try {
      await this.rotate(presented);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        throw error;
      }
      const reread = this.tokens.refresh();
      if (reread === null || reread === presented) {
        throw error;
      }
      await this.rotate(reread);
    }
  }
  /**
   * Re-fetch the real profile (GET /account/me) and adopt it. Single-flight:
   * concurrent callers share one in-flight request. NON-fatal — any failure
   * (including network) is swallowed: the session stays authenticated, the
   * profile keeps its previous (or null) value, and the next mid-session
   * refresh or an explicit call recovers it.
   */
  refreshProfile() {
    if (this.pendingProfile !== null) {
      return this.pendingProfile;
    }
    const attempt = this.fetchProfile().finally(() => {
      if (this.pendingProfile === attempt) {
        this.pendingProfile = null;
      }
    });
    this.pendingProfile = attempt;
    return attempt;
  }
  async fetchProfile() {
    const startEpoch = this.epoch;
    try {
      const profile = await this.accountGateway.me();
      if (startEpoch !== this.epoch) {
        return;
      }
      this.adoptProfile(profile);
    } catch {
    }
  }
  /** Adopt a fetched profile into the signals (single writer for the fields). */
  adoptProfile(profile) {
    this.name.set(profile.name);
    this.email.set(profile.email);
    this.phone.set(profile.phone);
    this.levels.set(profile.levels);
    this.isAdmin.set(profile.isAdmin);
  }
  /** Rotate via /auth/refresh and store the new pair. */
  async rotate(refreshToken) {
    const pair = await this.authGateway.refresh(refreshToken);
    this.tokens.setTokens(pair.accessToken, pair.refreshToken);
  }
  /**
   * Drop all session state (used by logout and a definitive failed
   * mid-session refresh). Bumps the epoch: any in-flight work from this
   * generation (profile fetch, in-flight refresh) must not write back.
   */
  clearSession() {
    this.epoch += 1;
    this.tokens.clear();
    this.authenticated.set(false);
    this.clearProfile();
  }
  /** Reset the profile fields to "unknown" (login of another identity, logout). */
  clearProfile() {
    this.name.set(null);
    this.email.set(null);
    this.phone.set(null);
    this.levels.set([]);
    this.isAdmin.set(false);
  }
  /**
   * True once at least one channel (EMAIL or PHONE) is verified. Mirrors the
   * backend VerificationRules: any single level grants SUBMIT_SHELTER.
   *
   * The levels are REAL (fetched from the profile) — on a fresh reload
   * init() re-fetches them, so the state survives across sessions.
   */
  isVerified() {
    return this.levels().includes("EMAIL") || this.levels().includes("PHONE");
  }
  static \u0275fac = function AuthStore_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthStore)();
  };
  static \u0275prov = /* @__PURE__ */ i03.\u0275\u0275defineInjectable({ token: _AuthStore, factory: _AuthStore.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i03.\u0275setClassMetadata(AuthStore, [{
    type: Injectable3,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AccountGateway,
  TokenStore,
  AuthStore
};
//# debugId=d3fccfdc-4814-5984-94c6-00435153a7b7


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZ2F0ZXdheXMvYWNjb3VudC1nYXRld2F5LnRzIiwic3JjL2FwcC9zZXNzaW9uL2F1dGgtc3RvcmUudHMiLCJzcmMvYXBwL2NvcmUvdG9rZW4tc3RvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5qZWN0LCBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBsYXN0VmFsdWVGcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBBcGlDbGllbnQgfSBmcm9tICcuLi9jb3JlL2FwaS1jbGllbnQnO1xuaW1wb3J0IHR5cGUgeyBSZXNlbmRBY2sgfSBmcm9tICcuLi9zaGFyZWQvcmVzZW5kLWNvdW50ZG93bic7XG5pbXBvcnQgdHlwZSB7XG4gIENoYW5nZUVtYWlsUmVxdWVzdCxcbiAgQ2hhbmdlUGhvbmVSZXF1ZXN0LFxuICBDb25maXJtQ2hhbmdlUmVxdWVzdCxcbiAgRGF0YUV4cG9ydFJlc3BvbnNlLFxuICBNZVJlc3BvbnNlLFxuICBQcm9maWxlVXBkYXRlUmVxdWVzdCxcbn0gZnJvbSAnLi4vY29yZS9tb2RlbHMnO1xuXG4vKipcbiAqIFRoZSBkb29yIHRvIHRoZSAvYWNjb3VudCBjb250cm9sbGVyIGdyb3VwICgwMSBwdW1sICsgMDQtQ09OVEVYVC1BQ0NPVU5ULVZFUklGWS5tZCkuXG4gKiBBbGwgY2FsbHMgcmVxdWlyZSBhIHZhbGlkIEpXVC4gQ3Jvc3MtY2hhbm5lbCBydWxlIChiYWNrZW5kLWVuZm9yY2VkLCBtaXJyb3JlZFxuICogaW4gdGhlIHBhZ2UgY29weSDigJQgbmV2ZXIgcmUtaW1wbGVtZW50ZWQpOlxuICogIC0gY2hhbmdpbmcgRU1BSUwgaXMgcHJvdmVuIGJ5IGFuIFNNUyBjb2RlIHNlbnQgdG8gdGhlIENVUlJFTlQgcGhvbmVcbiAqICAtIGNoYW5naW5nIFBIT05FIGlzIHByb3ZlbiBieSBhbiBlbWFpbCBjb2RlIHNlbnQgdG8gdGhlIENVUlJFTlQgZW1haWxcbiAqXG4gKiBUaGUgY2hhbmdlIHJlcXVlc3QgcmVzcG9uc2VzIGNhcnJ5IHRoZSByZXNlbmQtY29vbGRvd24gYWNrIChSZXNlbmRBY2spO1xuICogdGhlIGNvbmZpcm1zIGFyZSBlbXB0eSAoMjAyIHJlcXVlc3QgLyAyMDAgY29uZmlybSkuXG4gKiBQcm9maWxlIHJlYWRzL2VkaXRzIERPIGVjaG8gc3RhdGU6IGBtZSgpYCByZXR1cm5zIHRoZSByZWFsIHByb2ZpbGUgKHRoZVxuICogYmFja2VuZCdzIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIG5hbWUvZW1haWwvcGhvbmUgKyBjbGFpbXMpXG4gKiBhbmQgYHVwZGF0ZVByb2ZpbGUoKWAgcmV0dXJucyB0aGUgZnJlc2ggcHJvZmlsZSB0byBhZG9wdCBpbiBvbmUgcm91bmQgdHJpcC5cbiAqL1xuQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbmV4cG9ydCBjbGFzcyBBY2NvdW50R2F0ZXdheSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXBpID0gaW5qZWN0KEFwaUNsaWVudCk7XG5cbiAgLyoqIEdFVCAvYWNjb3VudC9tZSAtPiB0aGUgYXV0aGVudGljYXRlZCB1c2VyJ3MgcmVhbCBwcm9maWxlICsgdmVyaWZpZWQgY2xhaW1zLiAqL1xuICBtZSgpOiBQcm9taXNlPE1lUmVzcG9uc2U+IHtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5nZXQ8TWVSZXNwb25zZT4oJy9hY2NvdW50L21lJykpO1xuICB9XG5cbiAgLyoqIFBVVCAvYWNjb3VudC9wcm9maWxlIHtuYW1lLCBjdXJyZW50UGFzc3dvcmR9IC0+IHRoZSBmcmVzaCBNZVJlc3BvbnNlLiAqL1xuICB1cGRhdGVQcm9maWxlKHJlcXVlc3Q6IFByb2ZpbGVVcGRhdGVSZXF1ZXN0KTogUHJvbWlzZTxNZVJlc3BvbnNlPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkucHV0PE1lUmVzcG9uc2U+KCcvYWNjb3VudC9wcm9maWxlJywgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqIFBPU1QgL2FjY291bnQvZW1haWwtY2hhbmdlL3JlcXVlc3Qge25ld0VtYWlsfSAtPiAyMDIgKyBSZXNlbmRBY2sgKGNvZGUgdmlhIFNNUyB0byB0aGUgY3VycmVudCBwaG9uZSkuICovXG4gIHJlcXVlc3RFbWFpbENoYW5nZShuZXdFbWFpbDogc3RyaW5nKTogUHJvbWlzZTxSZXNlbmRBY2s+IHtcbiAgICBjb25zdCBib2R5OiBDaGFuZ2VFbWFpbFJlcXVlc3QgPSB7IG5ld0VtYWlsIH07XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkucG9zdDxSZXNlbmRBY2s+KCcvYWNjb3VudC9lbWFpbC1jaGFuZ2UvcmVxdWVzdCcsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKiBQT1NUIC9hY2NvdW50L2VtYWlsLWNoYW5nZS9jb25maXJtIHtjb2RlfSAtPiAyMDAuICovXG4gIGNvbmZpcm1FbWFpbENoYW5nZShjb2RlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBib2R5OiBDb25maXJtQ2hhbmdlUmVxdWVzdCA9IHsgY29kZSB9O1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8dm9pZD4oJy9hY2NvdW50L2VtYWlsLWNoYW5nZS9jb25maXJtJywgYm9keSkpO1xuICB9XG5cbiAgLyoqIFBPU1QgL2FjY291bnQvcGhvbmUtY2hhbmdlL3JlcXVlc3Qge25ld1Bob25lfSAtPiAyMDIgKyBSZXNlbmRBY2sgKGNvZGUgdmlhIGVtYWlsIHRvIHRoZSBjdXJyZW50IGFkZHJlc3MpLiAqL1xuICByZXF1ZXN0UGhvbmVDaGFuZ2UobmV3UGhvbmU6IHN0cmluZyk6IFByb21pc2U8UmVzZW5kQWNrPiB7XG4gICAgY29uc3QgYm9keTogQ2hhbmdlUGhvbmVSZXF1ZXN0ID0geyBuZXdQaG9uZSB9O1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8UmVzZW5kQWNrPignL2FjY291bnQvcGhvbmUtY2hhbmdlL3JlcXVlc3QnLCBib2R5KSk7XG4gIH1cblxuICAvKiogUE9TVCAvYWNjb3VudC9waG9uZS1jaGFuZ2UvY29uZmlybSB7Y29kZX0gLT4gMjAwLiAqL1xuICBjb25maXJtUGhvbmVDaGFuZ2UoY29kZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYm9keTogQ29uZmlybUNoYW5nZVJlcXVlc3QgPSB7IGNvZGUgfTtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wb3N0PHZvaWQ+KCcvYWNjb3VudC9waG9uZS1jaGFuZ2UvY29uZmlybScsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHRVQgL2FjY291bnQvZXhwb3J0IC0+IHRoZSBjYWxsZXIncyBvd24gZGF0YSBpbiBvbmUgZG9jdW1lbnRcbiAgICogKGxlZ2FsLXJlY292ZXJ5KTogcHJvZmlsZSArIHNoZWx0ZXJzLiBUaGUgcGFnZSB0dXJucyB0aGUgYm9keVxuICAgKiBpbnRvIGEgZG93bmxvYWRhYmxlIEpTT04gZmlsZS5cbiAgICovXG4gIGV4cG9ydERhdGEoKTogUHJvbWlzZTxEYXRhRXhwb3J0UmVzcG9uc2U+IHtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5nZXQ8RGF0YUV4cG9ydFJlc3BvbnNlPignL2FjY291bnQvZXhwb3J0JykpO1xuICB9XG5cbiAgLyoqXG4gICAqIERFTEVURSAvYWNjb3VudCAtPiAyMDQgKGxlZ2FsLXJlY292ZXJ5KTogdGhlIGFjY291bnRcbiAgICogZXJhc3VyZSDigJQgdGhlIGJhY2tlbmQgcHVyZ2VzIHRoZSBkZWNsYXJlZCBwcml2YXRlLWhvbWUgc2hlbHRlcnMsXG4gICAqIG9ycGhhbnMgdGhlIHB1YmxpYyBjb21tdW5pdHkgcm93cyBhbmQgY2FzY2FkZXMgdGhlIHJlc3QuIEEgcmVwZWF0XG4gICAqIGNhbGwgaXMgYSBuby1vcCwgc28gYSBkb3VibGUgY2xpY2sgbmV2ZXIgaGFyZC1mYWlscy5cbiAgICovXG4gIGRlbGV0ZUFjY291bnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkuZGVsZXRlPHZvaWQ+KCcvYWNjb3VudCcpKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgaW5qZWN0LCBJbmplY3RhYmxlLCBzaWduYWwgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEFwaUVycm9yIH0gZnJvbSAnLi4vY29yZS9hcGktZXJyb3InO1xuaW1wb3J0IHsgQWNjb3VudEdhdGV3YXkgfSBmcm9tICcuLi9nYXRld2F5cy9hY2NvdW50LWdhdGV3YXknO1xuaW1wb3J0IHsgQXV0aEdhdGV3YXkgfSBmcm9tICcuLi9nYXRld2F5cy9hdXRoLWdhdGV3YXknO1xuaW1wb3J0IHR5cGUgeyBNZVJlc3BvbnNlLCBSZWdpc3RlclJlcXVlc3QsIFZlcmlmaWNhdGlvbkxldmVsIH0gZnJvbSAnLi4vY29yZS9tb2RlbHMnO1xuaW1wb3J0IHsgVG9rZW5TdG9yZSB9IGZyb20gJy4uL2NvcmUvdG9rZW4tc3RvcmUnO1xuXG4vKipcbiAqIFRoZSBzZXNzaW9uIHN0b3JlLiBPd25zIHRoZSBzZXNzaW9uIGxpZmVjeWNsZTpcbiAqIHNpbGVudCByZWZyZXNoIGF0IGJvb3QsIGxvZ2luL2xvZ291dCwgYW5kIHRoZSBzaW5nbGUtZmxpZ2h0IHJlZnJlc2ggdXNlZCBieVxuICogdGhlIGludGVyY2VwdG9yIG9uIDQwMS4gUGFnZXMvZ3VhcmRzIHJlYWQgYGF1dGhlbnRpY2F0ZWRgLlxuICpcbiAqIFBsYWNlZCBpbiBgc2Vzc2lvbi9gLCBub3QgYGNvcmUvYDogaXQgaXMgdGhlIG9ubHkgXCJjb3JlXCIgc2VydmljZVxuICogdGhhdCBkZXBlbmRzIG9uIGBnYXRld2F5c2AgKEF1dGhHYXRld2F5L0FjY291bnRHYXRld2F5KSwgYW5kIGEgY29yZSDihpJcbiAqIGdhdGV3YXlzIGVkZ2Ugd291bGQgaW52ZXJ0IHRoZSBkb2N1bWVudGVkIGBmZWF0dXJlcyDihpIgZ2F0ZXdheXMg4oaSIGNvcmVgXG4gKiBkZXBlbmRlbmN5IHJ1bGUuIGBzZXNzaW9uL2Agc2l0cyBiZXR3ZWVuIHRoZW06IGl0IG1heSBpbXBvcnQgY29yZSBhbmRcbiAqIGdhdGV3YXlzOyBjb3JlIG1heSBpbXBvcnQgYHNlc3Npb24vYXV0aC1zdG9yZWAgT05MWSBmcm9tIHR3byBuYW1lZCBmaWxlc1xuICogKGEgZGVsaWJlcmF0ZSwgZG9jdW1lbnRlZCBjb3Jl4oaSc2Vzc2lvbiBlZGdlIOKAlCAwMS1UQVNLLm1kIG5hbWVzIGJvdGgpOlxuICogY29yZS9ndWFyZHMudHMgKHRoZSBndWFyZCB0eXBlKSBhbmQgY29yZS9hcGktaW50ZXJjZXB0b3IudHMgKHRoZVxuICogbWlkLXNlc3Npb24gNDAxIHNpbmdsZS1mbGlnaHQgcmVmcmVzaCkuXG4gKlxuICogUHJvZmlsZTogdGhlIGJhY2tlbmQgYW5zd2VycyBgR0VUIC9hY2NvdW50L21lYCB3aXRoIHRoZSBSRUFMIHByb2ZpbGUg4oCUXG4gKiBuYW1lLCBlbWFpbCwgcGhvbmUgYW5kIHRoZSBSRUFMIHZlcmlmaWVkIGNsYWltIHNldC4gVGhlXG4gKiBzdG9yZSBmZXRjaGVzIGl0IG9uY2UgYXQgYm9vdCAoYWZ0ZXIgYSBzdWNjZXNzZnVsIHNpbGVudCByZWZyZXNoKSBhbmRcbiAqIGFmdGVyIGxvZ2luLCBhbmQga2VlcHMgaXQgaW4gc2lnbmFscy4gYHJlZnJlc2hQcm9maWxlKClgIHJlLWZldGNoZXMgaXRcbiAqIGFmdGVyIGV2ZXJ5IGNsYWltcy1jaGFuZ2luZyBldmVudCAodmVyaWZ5LWNvbmZpcm0sIGNvbnRhY3QgY2hhbmdlLFxuICogcHJvZmlsZSBlZGl0KSBzbyB0aGUgYWNjb3VudC92ZXJpZnkgcGFnZXMgcmVhZCBvbmUgdHJ1dGguIEEgZmFpbGVkIGZldGNoXG4gKiBpcyBub24tZmF0YWw6IHRoZSBzZXNzaW9uIHN0YXlzIGF1dGhlbnRpY2F0ZWQgd2l0aCBhIG51bGwgcHJvZmlsZSAodGhlXG4gKiBhY2NvdW50IHBhZ2Ugc2hvd3MgYSByZXRyeSksIGFuZCB0aGUgbmV4dCByZWZyZXNoIG9yIGV4cGxpY2l0XG4gKiBgcmVmcmVzaFByb2ZpbGUoKWAgcmVjb3ZlcnMgaXQuXG4gKlxuICogU2Vzc2lvbiBlcG9jaCAoaWRlbnRpdHkgZ2VuZXJhdGlvbik6IGV2ZXJ5IGBjbGVhclNlc3Npb24oKWAgKGxvZ291dCxcbiAqIGZhaWxlZC1yZWZyZXNoIGNsZWFyKSBhbmQgZXZlcnkgYGxvZ2luKClgIGJ1bXBzIGEgcHJpdmF0ZSBlcG9jaCBjb3VudGVyLlxuICogSW4tZmxpZ2h0IGFzeW5jIHdvcmsgY2FwdHVyZXMgdGhlIGVwb2NoIGl0IHN0YXJ0ZWQgdW5kZXIgYW5kIG11c3Qgbm90XG4gKiB3cml0ZSBzZXNzaW9uIHN0YXRlIG9uY2UgdGhlIGVwb2NoIG1vdmVkOlxuICogIC0gYSBzdGFsZSBpbi1mbGlnaHQgYEdFVCAvYWNjb3VudC9tZWAgKHVzZXIgQSdzKSBpcyBOT1QgYWRvcHRlZCBvbnRvIHRoZVxuICogICAgZnJlc2ggc2Vzc2lvbiBvZiB1c2VyIEI7XG4gKiAgLSBhbiBpbi1mbGlnaHQgNDAxIHJlZnJlc2ggdGhhdCBMQU5EUyBhZnRlciBsb2dvdXQgZG9lcyBOT1QgcmVzdXJyZWN0IHRoZVxuICogICAgY2xlYXJlZCBzZXNzaW9uIOKAlCB0aGUganVzdC1yb3RhdGVkIHBhaXIgaXMgZGlzY2FyZGVkLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIEF1dGhTdG9yZSB7XG4gIC8qKiBUcnVlIHdoaWxlIGFuIGFjY2VzcyB0b2tlbiBpcyB1c2FibGUgKHNlc3Npb24gYWN0aXZlKS4gKi9cbiAgcmVhZG9ubHkgYXV0aGVudGljYXRlZCA9IHNpZ25hbDxib29sZWFuPihmYWxzZSk7XG5cbiAgLyoqXG4gICAqIFRydWUgb25jZSBpbml0KCkgaGFzIERFQ0lTSVZFTFkgZGVjaWRlZCB0aGUgYm9vdCBzdGF0ZSDigJQgdGhlIHNoZWxsIGNhblxuICAgKiByZW5kZXIgYSBuZXV0cmFsIGhlYWRlciB1bnRpbCB0aGVuIGluc3RlYWQgb2YgZmxhc2hpbmcgXCJsb2dnZWQgb3V0XCIuXG4gICAqIEEgbm9uLTQwMSBib290IGZhaWx1cmUgKGJhY2tlbmQgZG93bikgbGVhdmVzIHRoaXMgZmFsc2UgT04gUFVSUE9TRTpcbiAgICogdGhlIHN0b3JlZCByZWZyZXNoIHRva2VuIG1heSBzdGlsbCBiZSB2YWxpZCwgc28gYSBsYXRlciBndWFyZCBjYWxsXG4gICAqIHJldHJpZXMgcGVyZm9ybUluaXQgaW5zdGVhZCBvZiBsYXRjaGluZyB0aGUgc2Vzc2lvbiBkZWFkIGZvcmV2ZXIuXG4gICAqL1xuICByZWFkb25seSBpbml0aWFsaXplZCA9IHNpZ25hbDxib29sZWFuPihmYWxzZSk7XG5cbiAgLy8gLS0tLSByZWFsIHByb2ZpbGUgKEdFVCAvYWNjb3VudC9tZSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqXG4gICAqIFRoZSBmZXRjaGVkIHByb2ZpbGUsIG9yIG51bGwgd2hpbGUgdW5rbm93biAobmV2ZXIgbG9nZ2VkIGluIHlldCwgb3IgYVxuICAgKiBmYWlsZWQgZmV0Y2gpLiBSZWFkIHZpYSBgbmFtZSgpYC9gZW1haWwoKWAv4oCmIGluIHRlbXBsYXRlcy5cbiAgICovXG4gIHJlYWRvbmx5IG5hbWUgPSBzaWduYWw8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIHJlYWRvbmx5IGVtYWlsID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICByZWFkb25seSBwaG9uZSA9IHNpZ25hbDxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICAvKipcbiAgICogVGhlIFJFQUwgdmVyaWZpZWQgbGV2ZWxzIChFTUFJTC9QSE9ORSkgZnJvbSB0aGUgZmV0Y2hlZCBwcm9maWxlLiBSZWFkIHZpYVxuICAgKiBgbGV2ZWxzKClgIGluIHRlbXBsYXRlcyBhbmQgZ3VhcmRzOyB3cml0dGVuIE9OTFkgYnkge0BsaW5rIHJlZnJlc2hQcm9maWxlfVxuICAgKiAvIHtAbGluayBjbGVhclNlc3Npb259LiBTTUFSVF9JRCBjYW4gYXBwZWFyIGluIGEgZnV0dXJlIHJlc3BvbnNlIOKAlCB0aGVcbiAgICogYmFja2VuZCBjdXJyZW50bHkgcmVqZWN0cyBpdCBhcyBhIHN0dWIuXG4gICAqL1xuICByZWFkb25seSBsZXZlbHMgPSBzaWduYWw8VmVyaWZpY2F0aW9uTGV2ZWxbXT4oW10pO1xuXG4gIC8qKlxuICAgKiBUcnVlIGZvciB0aGUgQURNSU4ta2luZCBhY2NvdW50IChhZG1pbi1tb2RlcmF0aW9uIEQxL0QyKTogYWRvcHRlZCBmcm9tXG4gICAqIHRoZSBmZXRjaGVkIHByb2ZpbGUgKGBpc0FkbWluYCBpcyBhbHdheXMgcHJlc2VudCDigJQgZmFsc2UgZm9yIGV2ZXJ5XG4gICAqIHJlZ3VsYXIgdXNlcikgYW5kIHJlc2V0IHRvIGZhbHNlIHdpdGggdGhlIHByb2ZpbGUuIFRoZSBraW5kIGlzIHRoZVxuICAgKiB0cnV0aCBzZXJ2ZXItc2lkZSAoZnJlc2ggbG9va3VwIHBlciAvYWRtaW4vKiByZXF1ZXN0LCBuZXZlciBhIEpXVFxuICAgKiBjbGFpbSk7IHRoaXMgaXMgb25seSB0aGUgVUkncyBjb3B5IG9mIGl0IGZvciB0aGUgbmF2IGl0ZW0gYW5kIHRoZVxuICAgKiAvYWRtaW4gZ3VhcmQuIEEgZmFpbGVkIHByb2ZpbGUgZmV0Y2ggbGVhdmVzIGl0IGZhbHNlIOKAlCBmYWlsLWNsb3NlZC5cbiAgICovXG4gIHJlYWRvbmx5IGlzQWRtaW4gPSBzaWduYWw8Ym9vbGVhbj4oZmFsc2UpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgdG9rZW5zID0gaW5qZWN0KFRva2VuU3RvcmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IGF1dGhHYXRld2F5ID0gaW5qZWN0KEF1dGhHYXRld2F5KTtcbiAgcHJpdmF0ZSByZWFkb25seSBhY2NvdW50R2F0ZXdheSA9IGluamVjdChBY2NvdW50R2F0ZXdheSk7XG5cbiAgLyoqIEluLWZsaWdodCBzaW5nbGUtZmxpZ2h0IHJlZnJlc2gg4oCUIGNvbmN1cnJlbnQgY2FsbGVycyBzaGFyZSBvbmUgcHJvbWlzZS4gKi9cbiAgcHJpdmF0ZSBwZW5kaW5nUmVmcmVzaDogUHJvbWlzZTxib29sZWFuPiB8IG51bGwgPSBudWxsO1xuXG4gIC8qKiBJbi1mbGlnaHQgYm9vdCBpbml0IOKAlCBndWFyZHMgYW5kIHRoZSBzaGVsbCBtYXkgcmFjZSBvbiB0aGUgc2FtZSBpbml0LiAqL1xuICBwcml2YXRlIGJvb3RJbml0OiBQcm9taXNlPHZvaWQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqIEluLWZsaWdodCBwcm9maWxlIGZldGNoIOKAlCBjb25jdXJyZW50IGNhbGxlcnMgc2hhcmUgb25lIHJ1bi4gKi9cbiAgcHJpdmF0ZSBwZW5kaW5nUHJvZmlsZTogUHJvbWlzZTx2b2lkPiB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBTZXNzaW9uIGlkZW50aXR5IGdlbmVyYXRpb24gKHNlZSBjbGFzcyBkb2MpLiBCdW1wZWQgYnkgY2xlYXJTZXNzaW9uKClcbiAgICogYW5kIGxvZ2luKCkg4oCUIGJvdGggc3RhcnQgYSBuZXcgZ2VuZXJhdGlvbiwgYW5kIGFueSBhc3luYyB3b3JrIHRoYXRcbiAgICogc3RhcnRlZCB1bmRlciB0aGUgcHJldmlvdXMgZ2VuZXJhdGlvbiBtdXN0IG5vdCB3cml0ZSB0aGlzIHNlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGVwb2NoID0gMDtcblxuICAvKipcbiAgICogQm9vdC10aW1lIHNpbGVudCByZWZyZXNoLiBObyBwZXJzaXN0ZWQgcmVmcmVzaCB0b2tlbiAtPiBhbm9ueW1vdXMuXG4gICAqIFZhbGlkIHRva2VuIC0+IHJvdGF0ZXMgdGhlIHBhaXIgdmlhIHRoZSBTQU1FIHNpbmdsZS1mbGlnaHQgcmVmcmVzaCgpXG4gICAqIHBhdGggYSBtaWQtc2Vzc2lvbiA0MDEgdXNlcyBhbmQgZmV0Y2hlcyB0aGUgcmVhbCBwcm9maWxlOyA0MDEgLT5cbiAgICogZXhwaXJlZCwgY2xlYXJlZCwgZGVmaW5pdGl2ZWx5IGluaXRpYWxpemVkLiBBIG5vbi00MDEgZmFpbHVyZSAoYmFja2VuZFxuICAgKiBkb3duKSBrZWVwcyB0aGUgcmVmcmVzaCB0b2tlbiBBTkQgbGVhdmVzIGluaXRpYWxpemVkIGZhbHNlLCBzbyBhIGxhdGVyXG4gICAqIGd1YXJkIGNhbGwgcmV0cmllcyB0aGUgYm9vdC5cbiAgICpcbiAgICogSWRlbXBvdGVudCBhbmQgc2luZ2xlLWZsaWdodDogY29uY3VycmVudCBjYWxsZXJzIChBcHAgYm9vdCArIGEgZ3VhcmQgb25cbiAgICogdGhlIGZpcnN0IG5hdmlnYXRpb24pIHNoYXJlIG9uZSBydW4gc28gdGhlIHJlZnJlc2ggdG9rZW4gaXMgbmV2ZXJcbiAgICogcmFjZWQuIEEgZmFpbGVkIHJ1biBpcyByZWxlYXNhYmxlIOKAlCB0aGUgcGVuZGluZyBib290IHByb21pc2UgaXMgYWx3YXlzXG4gICAqIGNsZWFyZWQsIHNvIHRoZSBuZXh0IGluaXQoKSByZS1hdHRlbXB0cy5cbiAgICovXG4gIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5ib290SW5pdCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuYm9vdEluaXQ7XG4gICAgfVxuICAgIGNvbnN0IHJ1biA9IHRoaXMucGVyZm9ybUluaXQoKS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHRoaXMuYm9vdEluaXQgPSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuYm9vdEluaXQgPSBydW47XG4gICAgcmV0dXJuIHJ1bjtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybUluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVmcmVzaFRva2VuID0gdGhpcy50b2tlbnMucmVmcmVzaCgpO1xuICAgIGlmIChyZWZyZXNoVG9rZW4gPT09IG51bGwpIHtcbiAgICAgIC8vIChhKSBubyBzdG9yZWQgdG9rZW4g4oCUIGFub255bW91cywgZGVmaW5pdGl2ZS5cbiAgICAgIHRoaXMuYXV0aGVudGljYXRlZC5zZXQoZmFsc2UpO1xuICAgICAgdGhpcy5pbml0aWFsaXplZC5zZXQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIChiL2MvZCkgUm91dGUgdGhlIGJvb3Qgcm90YXRpb24gdGhyb3VnaCB0aGUgc2FtZSBzaW5nbGUtZmxpZ2h0XG4gICAgLy8gcmVmcmVzaCgpIGFzIGEgbWlkLXNlc3Npb24gNDAxOiBhIDQwMS1kcml2ZW4gcmVmcmVzaCByYWNpbmcgdGhlXG4gICAgLy8gYm9vdCByb3RhdGlvbiBub3cgc2hhcmVzIG9uZSBpbi1mbGlnaHQgUE9TVCAvYXV0aC9yZWZyZXNoLCBhbmQgdGhlXG4gICAgLy8gbG9zZXIgY2FuIG5vIGxvbmdlciBjbGVhciBhIHNlc3Npb24gdGhhdCBpcyBzdGlsbCB2YWxpZC5cbiAgICBjb25zdCByZWZyZXNoZWQgPSBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICBpZiAocmVmcmVzaGVkKSB7XG4gICAgICAvLyAoYikgU2Vzc2lvbiByZXN0b3JlZCDigJQgZG9SZWZyZXNoIGFscmVhZHkgcm90YXRlZCB0aGUgcGFpciBhbmQgc2V0XG4gICAgICAvLyBhdXRoZW50aWNhdGVkLiBSZWFsIHByb2ZpbGUgZm9yIHRoZSByZXN0b3JlZCBzZXNzaW9uIChub24tZmF0YWwg4oCUXG4gICAgICAvLyB0aGUgc2Vzc2lvbiBpcyBhbGl2ZSBldmVuIHdoZW4gdGhlIHByb2ZpbGUgZmV0Y2ggZmFpbHM7IHRoZVxuICAgICAgLy8gYWNjb3VudCBwYWdlIHJldHJpZXMpLlxuICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoUHJvZmlsZSgpO1xuICAgICAgdGhpcy5pbml0aWFsaXplZC5zZXQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHJlZnJlc2goKSByZXR1cm5lZCBmYWxzZS5cbiAgICB0aGlzLmF1dGhlbnRpY2F0ZWQuc2V0KGZhbHNlKTtcbiAgICBpZiAodGhpcy50b2tlbnMucmVmcmVzaCgpICE9PSBudWxsKSB7XG4gICAgICAvLyAoZCkgbmV0d29yay81eHgg4oCUIGRvUmVmcmVzaCBrZWVwcyB0aGUgc3RvcmVkIHRva2VuIChpdCBjbGVhcnMgb25seVxuICAgICAgLy8gb24gNDAxKTogbGVhdmUgaW5pdGlhbGl6ZWQgRkFMU0Ugc28gYSBsYXRlciBndWFyZCBjYWxsIHJldHJpZXNcbiAgICAgIC8vIHBlcmZvcm1Jbml0IHdoaWxlIHRoZSBzZXNzaW9uIGlzIHN0aWxsIHJlY292ZXJhYmxlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyAoYykgRGVmaW5pdGl2ZSA0MDEg4oCUIGRvUmVmcmVzaCBhbHJlYWR5IGNsZWFyZWQgdGhlIGRlYWQgc2Vzc2lvbi5cbiAgICB0aGlzLmluaXRpYWxpemVkLnNldCh0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIG5ldyBhY2NvdW50LiBUaGUgYmFja2VuZCBhbnN3ZXJzIDIwMSB3aXRoIGFuIGVtcHR5IGJvZHkg4oCUIG5vXG4gICAqIHNlc3Npb24gaXMgY3JlYXRlZCAocmVnaXN0ZXIgIT0gbG9naW4pLiBFcnJvcnMgKDQwMC80MDkpIHByb3BhZ2F0ZSBhc1xuICAgKiBBcGlFcnJvciB0byB0aGUgY2FsbGVyLlxuICAgKi9cbiAgcmVnaXN0ZXIocmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuYXV0aEdhdGV3YXkucmVnaXN0ZXIocmVxdWVzdCk7XG4gIH1cblxuICAvKipcbiAgICogTG9nIGluIHdpdGggZW1haWwtb3ItcGhvbmUgKyBwYXNzd29yZC4gU3RvcmVzIHRoZSByZXR1cm5lZCBwYWlyLCBtYXJrc1xuICAgKiB0aGUgc2Vzc2lvbiBhdXRoZW50aWNhdGVkLCBhbmQgZmV0Y2hlcyB0aGUgcmVhbCBwcm9maWxlLiBUaHJvd3MgQXBpRXJyb3JcbiAgICogb24gYSBmYWlsZWQgbG9naW4gKDQwMS80MjkpIOKAlCBhIGZhaWxlZCBwcm9maWxlIGZldGNoIGlzIE5PTi1mYXRhbDogdGhlXG4gICAqIHNlc3Npb24gaXMgbGl2ZSwgdGhlIHByb2ZpbGUgc3RheXMgbnVsbCAodGhlIGFjY291bnQgcGFnZSBvZmZlcnMgYVxuICAgKiByZXRyeSkuXG4gICAqXG4gICAqIEEgbG9naW4gaXMgYSBORVcgaWRlbnRpdHkgZ2VuZXJhdGlvbjogaXQgYnVtcHMgdGhlIGVwb2NoIChzbyBhbnkgc3RhbGVcbiAgICogaW4tZmxpZ2h0IHByb2ZpbGUgZmV0Y2ggZnJvbSBhIHByZXZpb3VzIGlkZW50aXR5IGNhbiBuZXZlciBiZSBhZG9wdGVkXG4gICAqIG9udG8gdGhpcyBzZXNzaW9uKSBhbmQgZGlzY2FyZHMgdGhlIHNpbmdsZS1mbGlnaHQgcHJvZmlsZSBzbG90IHNvXG4gICAqIHRoZSBzdGFsZSBmZXRjaCBpcyBub3QgYXdhaXRlZCB1bmRlciB0aGUgbmV3IGlkZW50aXR5LlxuICAgKi9cbiAgYXN5bmMgbG9naW4oZW1haWxPclBob25lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwYWlyID0gYXdhaXQgdGhpcy5hdXRoR2F0ZXdheS5sb2dpbihlbWFpbE9yUGhvbmUsIHBhc3N3b3JkKTtcbiAgICAvLyBBIGZyZXNoIGxvZ2luIGlzIGEgZnJlc2ggaWRlbnRpdHkg4oCUIHN0YXJ0IGEgbmV3IGVwb2NoIGFuZCBkcm9wIGFueVxuICAgIC8vIHByZXZpb3VzIGlkZW50aXR5J3MgZGF0YSBiZWZvcmUgYWRvcHRpbmcgdGhlIG5ldyBvbmUuXG4gICAgdGhpcy5lcG9jaCArPSAxO1xuICAgIHRoaXMucGVuZGluZ1Byb2ZpbGUgPSBudWxsOyAvLyBkaXNjYXJkIGFueSBpbi1mbGlnaHQgc3RhbGUgcHJvZmlsZSBmZXRjaFxuICAgIHRoaXMuY2xlYXJQcm9maWxlKCk7XG4gICAgdGhpcy50b2tlbnMuc2V0VG9rZW5zKHBhaXIuYWNjZXNzVG9rZW4sIHBhaXIucmVmcmVzaFRva2VuKTtcbiAgICB0aGlzLmF1dGhlbnRpY2F0ZWQuc2V0KHRydWUpO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFByb2ZpbGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2cgb3V0OiBiZXN0LWVmZm9ydCBQT1NUIC9hdXRoL2xvZ291dCAocmV2b2tlcyB0aGUgcmVmcmVzaCB0b2tlblxuICAgKiBzZXJ2ZXItc2lkZSksIHRoZW4gbG9jYWwgc3RhdGUgaXMgY2xlYXJlZCByZWdhcmRsZXNzIG9mIG5ldHdvcmsgb3V0Y29tZS5cbiAgICovXG4gIGFzeW5jIGxvZ291dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZWZyZXNoVG9rZW4gPSB0aGlzLnRva2Vucy5yZWZyZXNoKCk7XG4gICAgaWYgKHJlZnJlc2hUb2tlbiAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hdXRoR2F0ZXdheS5sb2dvdXQocmVmcmVzaFRva2VuKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBCZXN0LWVmZm9ydCByZXZvY2F0aW9uIOKAlCBsb2NhbCBjbGVhciBoYXBwZW5zIGVpdGhlciB3YXkuXG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY2xlYXJTZXNzaW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogU2luZ2xlLWZsaWdodCBzZXNzaW9uIHJlZnJlc2ggKDAzLUNPTlRFWFQgZGVjaXNpb24gMikuIENvbmN1cnJlbnQgY2FsbGVyc1xuICAgKiAoZS5nLiBOIHBhcmFsbGVsIDQwMXMsIG9yIHRoZSBib290IHJvdGF0aW9uKSBzaGFyZSBPTkUgaW4tZmxpZ2h0XG4gICAqIFBPU1QgL2F1dGgvcmVmcmVzaCDigJQgdGhlIG9sZCByb3RhdGVkIHJlZnJlc2ggdG9rZW4gaXMgbmV2ZXIgdXNlZCB0d2ljZS5cbiAgICogUmV0dXJucyB0cnVlIHdoZW4gYSBmcmVzaCBwYWlyIHdhcyBzdG9yZWQsIGZhbHNlIHdoZW4gdGhlIHNlc3Npb24gaXNcbiAgICogZGVhZCAoc3RvcmFnZSBjbGVhcmVkKSBvciB0aGUgcmVmcmVzaCBjb3VsZCBub3QgcnVuIChubyB0b2tlbikuXG4gICAqL1xuICByZWZyZXNoKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLnBlbmRpbmdSZWZyZXNoICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5wZW5kaW5nUmVmcmVzaDtcbiAgICB9XG4gICAgY29uc3QgYXR0ZW1wdCA9IHRoaXMuZG9SZWZyZXNoKCk7XG4gICAgdGhpcy5wZW5kaW5nUmVmcmVzaCA9IGF0dGVtcHQ7XG4gICAgcmV0dXJuIGF0dGVtcHQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRvUmVmcmVzaCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBzdGFydEVwb2NoID0gdGhpcy5lcG9jaDtcbiAgICBjb25zdCBwcmVzZW50ZWQgPSB0aGlzLnRva2Vucy5yZWZyZXNoKCk7XG4gICAgaWYgKHByZXNlbnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5yb3RhdGVXaXRoQ3Jvc3NUYWJSZWNvdmVyeShwcmVzZW50ZWQpO1xuICAgICAgaWYgKHN0YXJ0RXBvY2ggIT09IHRoaXMuZXBvY2gpIHtcbiAgICAgICAgLy8gVGhlIHNlc3Npb24gbW92ZWQgb24gd2hpbGUgdGhpcyByZWZyZXNoIHdhcyBpbiBmbGlnaHQgKGxvZ291dCwgb3JcbiAgICAgICAgLy8gYSBsb2dpbiBhcyBhbm90aGVyIGlkZW50aXR5KSDigJQgdGhlIHBhaXIgd2UganVzdCBzdG9yZWQgYmVsb25ncyB0b1xuICAgICAgICAvLyBhIGRlYWQgZ2VuZXJhdGlvbi4gRGlzY2FyZCBpdCBzbyBhIGxhdGUgNDAxLXJlZnJlc2ggY2Fubm90XG4gICAgICAgIC8vIHJlc3VycmVjdCB0aGUgc2Vzc2lvbi5cbiAgICAgICAgdGhpcy50b2tlbnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5hdXRoZW50aWNhdGVkLnNldChmYWxzZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYXV0aGVudGljYXRlZC5zZXQodHJ1ZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IgJiYgZXJyb3Iuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgLy8gUmVmcmVzaCB0b2tlbiByZXZva2VkL2V4cGlyZWQg4oCUIGRlZmluaXRpdmU6IGNsZWFyIHRoZSBzZXNzaW9uLlxuICAgICAgICB0aGlzLmNsZWFyU2Vzc2lvbigpO1xuICAgICAgfVxuICAgICAgLy8gTmV0d29yay81eHg6IGtlZXAgdGhlIHN0b3JlZCB0b2tlbiDigJQgdGhlIHNlc3Npb24gbWF5IHN0aWxsIGJlXG4gICAgICAvLyB2YWxpZDsgdGhlIHJlcXVlc3QgdGhhdCB0cmlnZ2VyZWQgdGhpcyByZWZyZXNoIGZhaWxzIGFuZCB0aGUgdXNlclxuICAgICAgLy8gY2FuIHJldHJ5IChhbmQgYSBsYXRlciBndWFyZCBjYWxsIHJldHJpZXMgdGhlIGJvb3QpLlxuICAgICAgdGhpcy5hdXRoZW50aWNhdGVkLnNldChmYWxzZSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIFNhZmUgcGxhaW4gcmVzZXQ6IHJlZnJlc2goKSBvbmx5IHN0YXJ0cyBkb1JlZnJlc2ggd2hlblxuICAgICAgLy8gcGVuZGluZ1JlZnJlc2ggPT09IG51bGwsIHNvIHRoaXMgaXMgYWx3YXlzIHRoZSBpbi1mbGlnaHQgcnVuLlxuICAgICAgdGhpcy5wZW5kaW5nUmVmcmVzaCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJvdGF0ZSB0aGUgZ2l2ZW4gcmVmcmVzaCB0b2tlbi4gQ3Jvc3MtdGFiIHJhY2U6IGFsbCB0YWJzIHNoYXJlIHRoZVxuICAgKiBPTkUgcGVyc2lzdGVkIHJlZnJlc2ggdG9rZW4gd2hpbGUgc2luZ2xlLWZsaWdodCBpcyBwZXItaW5zdGFuY2Ug4oCUIGlmXG4gICAqIGFub3RoZXIgdGFiIHJvdGF0ZWQgaXQgaW4gZmxpZ2h0LCBvdXIgcHJlc2VudGVkIHRva2VuIDQwMXMuIE9uIHRoYXQgNDAxXG4gICAqIHJlLXJlYWQgc3RvcmFnZTogaWYgdGhlIHRva2VuIGNoYW5nZWQsIHJldHJ5IE9OQ0Ugd2l0aCB0aGUgZnJlc2ggdG9rZW5cbiAgICogYmVmb3JlIGdpdmluZyB1cC4gQW55dGhpbmcgZWxzZSAodW5jaGFuZ2VkIHRva2VuLCBuZXR3b3JrLzV4eCkgcmV0aHJvd3NcbiAgICogZm9yIHRoZSBjYWxsZXIgdG8gY2xhc3NpZnkg4oCUIG5vdGhpbmcgaXMgY2xlYXJlZCBoZXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByb3RhdGVXaXRoQ3Jvc3NUYWJSZWNvdmVyeShwcmVzZW50ZWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJvdGF0ZShwcmVzZW50ZWQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yICYmIGVycm9yLnN0YXR1cyA9PT0gNDAxKSkge1xuICAgICAgICB0aHJvdyBlcnJvcjsgLy8gbm90IGEgcm90YXRpb24gY29uZmxpY3Qg4oCUIGxldCB0aGUgY2FsbGVyIGNsYXNzaWZ5XG4gICAgICB9XG4gICAgICBjb25zdCByZXJlYWQgPSB0aGlzLnRva2Vucy5yZWZyZXNoKCk7XG4gICAgICBpZiAocmVyZWFkID09PSBudWxsIHx8IHJlcmVhZCA9PT0gcHJlc2VudGVkKSB7XG4gICAgICAgIHRocm93IGVycm9yOyAvLyBub2JvZHkgcm90YXRlZCBpbiBiZXR3ZWVuIOKAlCB0aGlzIDQwMSBpcyBmaW5hbFxuICAgICAgfVxuICAgICAgLy8gQW5vdGhlciB0YWIgcm90YXRlZCB3aGlsZSB3ZSB3ZXJlIGluIGZsaWdodDogcmV0cnkgb25jZSB3aXRoIHRoZVxuICAgICAgLy8gdG9rZW4gdGhleSBwZXJzaXN0ZWQuIEEgc2Vjb25kIDQwMSBwcm9wYWdhdGVzIChmaW5hbCDigJQgbm8gc2Vjb25kXG4gICAgICAvLyByZS1yZWFkLCBzbyB0aGlzIGNhbm5vdCBsb29wKS5cbiAgICAgIGF3YWl0IHRoaXMucm90YXRlKHJlcmVhZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlLWZldGNoIHRoZSByZWFsIHByb2ZpbGUgKEdFVCAvYWNjb3VudC9tZSkgYW5kIGFkb3B0IGl0LiBTaW5nbGUtZmxpZ2h0OlxuICAgKiBjb25jdXJyZW50IGNhbGxlcnMgc2hhcmUgb25lIGluLWZsaWdodCByZXF1ZXN0LiBOT04tZmF0YWwg4oCUIGFueSBmYWlsdXJlXG4gICAqIChpbmNsdWRpbmcgbmV0d29yaykgaXMgc3dhbGxvd2VkOiB0aGUgc2Vzc2lvbiBzdGF5cyBhdXRoZW50aWNhdGVkLCB0aGVcbiAgICogcHJvZmlsZSBrZWVwcyBpdHMgcHJldmlvdXMgKG9yIG51bGwpIHZhbHVlLCBhbmQgdGhlIG5leHQgbWlkLXNlc3Npb25cbiAgICogcmVmcmVzaCBvciBhbiBleHBsaWNpdCBjYWxsIHJlY292ZXJzIGl0LlxuICAgKi9cbiAgcmVmcmVzaFByb2ZpbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMucGVuZGluZ1Byb2ZpbGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnBlbmRpbmdQcm9maWxlO1xuICAgIH1cbiAgICBjb25zdCBhdHRlbXB0ID0gdGhpcy5mZXRjaFByb2ZpbGUoKS5maW5hbGx5KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdQcm9maWxlID09PSBhdHRlbXB0KSB7XG4gICAgICAgIHRoaXMucGVuZGluZ1Byb2ZpbGUgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucGVuZGluZ1Byb2ZpbGUgPSBhdHRlbXB0O1xuICAgIHJldHVybiBhdHRlbXB0O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaFByb2ZpbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgc3RhcnRFcG9jaCA9IHRoaXMuZXBvY2g7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb2ZpbGUgPSBhd2FpdCB0aGlzLmFjY291bnRHYXRld2F5Lm1lKCk7XG4gICAgICBpZiAoc3RhcnRFcG9jaCAhPT0gdGhpcy5lcG9jaCkge1xuICAgICAgICAvLyBUaGUgc2Vzc2lvbiBjaGFuZ2VkIHdoaWxlIHRoaXMgZmV0Y2ggd2FzIGluIGZsaWdodCAobG9nb3V0ICtcbiAgICAgICAgLy8gcmUtbG9naW4sIG9yIGEgY2xlYXJlZCBzZXNzaW9uKSDigJQgYWRvcHRpbmcgdGhpcyBwcm9maWxlIHdvdWxkXG4gICAgICAgIC8vIHBhaW50IHVzZXIgQSdzIGRhdGEgb250byB1c2VyIEIncyBmcmVzaCBzZXNzaW9uLiBEcm9wIGl0LlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmFkb3B0UHJvZmlsZShwcm9maWxlKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIE5vbi1mYXRhbCBvbiBwdXJwb3NlOiBhIHByb2ZpbGUgaGljY3VwIG11c3Qgbm90IGtpbGwgdGhlIHNlc3Npb25cbiAgICAgIC8vICh0aGUgYWNjb3VudCBwYWdlIHJlbmRlcnMgYW4gZXJyb3IgKyByZXRyeSBmb3IgdGhlIG51bGwgY2FzZSkuXG4gICAgfVxuICB9XG5cbiAgLyoqIEFkb3B0IGEgZmV0Y2hlZCBwcm9maWxlIGludG8gdGhlIHNpZ25hbHMgKHNpbmdsZSB3cml0ZXIgZm9yIHRoZSBmaWVsZHMpLiAqL1xuICBwcml2YXRlIGFkb3B0UHJvZmlsZShwcm9maWxlOiBNZVJlc3BvbnNlKTogdm9pZCB7XG4gICAgdGhpcy5uYW1lLnNldChwcm9maWxlLm5hbWUpO1xuICAgIHRoaXMuZW1haWwuc2V0KHByb2ZpbGUuZW1haWwpO1xuICAgIHRoaXMucGhvbmUuc2V0KHByb2ZpbGUucGhvbmUpO1xuICAgIHRoaXMubGV2ZWxzLnNldChwcm9maWxlLmxldmVscyk7XG4gICAgdGhpcy5pc0FkbWluLnNldChwcm9maWxlLmlzQWRtaW4pO1xuICB9XG5cbiAgLyoqIFJvdGF0ZSB2aWEgL2F1dGgvcmVmcmVzaCBhbmQgc3RvcmUgdGhlIG5ldyBwYWlyLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdGF0ZShyZWZyZXNoVG9rZW46IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHBhaXIgPSBhd2FpdCB0aGlzLmF1dGhHYXRld2F5LnJlZnJlc2gocmVmcmVzaFRva2VuKTtcbiAgICB0aGlzLnRva2Vucy5zZXRUb2tlbnMocGFpci5hY2Nlc3NUb2tlbiwgcGFpci5yZWZyZXNoVG9rZW4pO1xuICB9XG5cbiAgLyoqXG4gICAqIERyb3AgYWxsIHNlc3Npb24gc3RhdGUgKHVzZWQgYnkgbG9nb3V0IGFuZCBhIGRlZmluaXRpdmUgZmFpbGVkXG4gICAqIG1pZC1zZXNzaW9uIHJlZnJlc2gpLiBCdW1wcyB0aGUgZXBvY2g6IGFueSBpbi1mbGlnaHQgd29yayBmcm9tIHRoaXNcbiAgICogZ2VuZXJhdGlvbiAocHJvZmlsZSBmZXRjaCwgaW4tZmxpZ2h0IHJlZnJlc2gpIG11c3Qgbm90IHdyaXRlIGJhY2suXG4gICAqL1xuICBwcml2YXRlIGNsZWFyU2Vzc2lvbigpOiB2b2lkIHtcbiAgICB0aGlzLmVwb2NoICs9IDE7XG4gICAgdGhpcy50b2tlbnMuY2xlYXIoKTtcbiAgICB0aGlzLmF1dGhlbnRpY2F0ZWQuc2V0KGZhbHNlKTtcbiAgICB0aGlzLmNsZWFyUHJvZmlsZSgpO1xuICB9XG5cbiAgLyoqIFJlc2V0IHRoZSBwcm9maWxlIGZpZWxkcyB0byBcInVua25vd25cIiAobG9naW4gb2YgYW5vdGhlciBpZGVudGl0eSwgbG9nb3V0KS4gKi9cbiAgcHJpdmF0ZSBjbGVhclByb2ZpbGUoKTogdm9pZCB7XG4gICAgdGhpcy5uYW1lLnNldChudWxsKTtcbiAgICB0aGlzLmVtYWlsLnNldChudWxsKTtcbiAgICB0aGlzLnBob25lLnNldChudWxsKTtcbiAgICB0aGlzLmxldmVscy5zZXQoW10pO1xuICAgIHRoaXMuaXNBZG1pbi5zZXQoZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRydWUgb25jZSBhdCBsZWFzdCBvbmUgY2hhbm5lbCAoRU1BSUwgb3IgUEhPTkUpIGlzIHZlcmlmaWVkLiBNaXJyb3JzIHRoZVxuICAgKiBiYWNrZW5kIFZlcmlmaWNhdGlvblJ1bGVzOiBhbnkgc2luZ2xlIGxldmVsIGdyYW50cyBTVUJNSVRfU0hFTFRFUi5cbiAgICpcbiAgICogVGhlIGxldmVscyBhcmUgUkVBTCAoZmV0Y2hlZCBmcm9tIHRoZSBwcm9maWxlKSDigJQgb24gYSBmcmVzaCByZWxvYWRcbiAgICogaW5pdCgpIHJlLWZldGNoZXMgdGhlbSwgc28gdGhlIHN0YXRlIHN1cnZpdmVzIGFjcm9zcyBzZXNzaW9ucy5cbiAgICovXG4gIGlzVmVyaWZpZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGV2ZWxzKCkuaW5jbHVkZXMoJ0VNQUlMJykgfHwgdGhpcy5sZXZlbHMoKS5pbmNsdWRlcygnUEhPTkUnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSwgc2lnbmFsIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogV2hlcmUgdGhlIHJlZnJlc2ggdG9rZW4gbGl2ZXMgaW4gbG9jYWxTdG9yYWdlICh2MSB0cmFkZW9mZiDigJQgZG9jdW1lbnRlZCBpblxuICogdGhlIGZyb250ZW5kIFJFQURNRTogaHR0cE9ubHktY29va2llIG1pZ3JhdGlvbiBpcyBhIGRlZmVycmVkIGJhY2tlbmQgY2hhbmdlKS5cbiAqL1xuY29uc3QgUkVGUkVTSF9UT0tFTl9LRVkgPSAnb3MucmVmcmVzaCc7XG5cbi8qKlxuICogVG9rZW4gc3RvcmFnZSAoMDMtQ09OVEVYVC1DT1JFLUFVVEgubWQgZGVjaXNpb24gMSk6XG4gKiAgLSBhY2Nlc3MgdG9rZW4gIC0+IGluLW1lbW9yeSBzaWduYWwgb25seSAoc21hbGxlciBYU1Mgc3VyZmFjZTsgbG9zdCBvbiByZWxvYWQpXG4gKiAgLSByZWZyZXNoIHRva2VuIC0+IGxvY2FsU3RvcmFnZSAoc3Vydml2ZXMgcmVsb2FkIHNvIGJvb3QgY2FuIHNpbGVudC1yZWZyZXNoKVxuICpcbiAqIE5vIHRva2VucyBldmVyIGdvIGludG8gZW52aXJvbm1lbnQuKi50cy5cbiAqL1xuQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbmV4cG9ydCBjbGFzcyBUb2tlblN0b3JlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBhY2Nlc3NUb2tlbiA9IHNpZ25hbDxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICAvKiogQ3VycmVudCBpbi1tZW1vcnkgYWNjZXNzIHRva2VuLCBpZiBhbnkuICovXG4gIGFjY2VzcygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbigpO1xuICB9XG5cbiAgLyoqIFBlcnNpc3RlZCByZWZyZXNoIHRva2VuLCBpZiBhbnkuICovXG4gIHJlZnJlc2goKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShSRUZSRVNIX1RPS0VOX0tFWSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcmUgYSB0b2tlbiBwYWlyLiBUaGUgYmFja2VuZCdzIGBleHBpcmVzSW5gIGlzIGludGVudGlvbmFsbHkgbm90XG4gICAqIHN0b3JlZDogZXhwaXJ5IGlzIGVuZm9yY2VkIHNlcnZlci1zaWRlIHZpYSA0MDFzLlxuICAgKi9cbiAgc2V0VG9rZW5zKGFjY2Vzc1Rva2VuOiBzdHJpbmcsIHJlZnJlc2hUb2tlbjogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5hY2Nlc3NUb2tlbi5zZXQoYWNjZXNzVG9rZW4pO1xuICAgIHRyeSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShSRUZSRVNIX1RPS0VOX0tFWSwgcmVmcmVzaFRva2VuKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFN0b3JhZ2UgdW5hdmFpbGFibGUgKHByaXZhdGUgbW9kZSk6IHRoZSBzZXNzaW9uIHN0aWxsIHdvcmtzIGluIG1lbW9yeSxcbiAgICAgIC8vIGl0IGp1c3Qgd2lsbCBub3Qgc3Vydml2ZSBhIHJlbG9hZC5cbiAgICB9XG4gIH1cblxuICAvKiogRHJvcCB0aGUgd2hvbGUgc2Vzc2lvbjogYWNjZXNzIHNpZ25hbCArIHBlcnNpc3RlZCByZWZyZXNoIHRva2VuLiAqL1xuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLmFjY2Vzc1Rva2VuLnNldChudWxsKTtcbiAgICB0cnkge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oUkVGUkVTSF9UT0tFTl9LRVkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gaWdub3JlIOKAlCBub3RoaW5nIHRvIGNsZWFyXG4gICAgfVxuICB9XG59XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLFNBQVMsUUFBUSxrQkFBa0I7QUFDbkMsU0FBUyxxQkFBcUI7O0FBMEJ4QixJQUFPLGlCQUFQLE1BQU8sZ0JBQWM7RUFDUixNQUFNLE9BQU8sU0FBUzs7RUFHdkMsS0FBeUI7QUFDdkIsV0FBTyxjQUFjLEtBQUssSUFBSSxJQUFnQixhQUFhLENBQUM7RUFDOUQ7O0VBR0EsY0FBYyxTQUFtRDtBQUMvRCxXQUFPLGNBQWMsS0FBSyxJQUFJLElBQWdCLG9CQUFvQixPQUFPLENBQUM7RUFDNUU7O0VBR0EsbUJBQW1CLFVBQXFDO0FBQ3RELFVBQU0sT0FBMkIsRUFBRSxTQUFRO0FBQzNDLFdBQU8sY0FBYyxLQUFLLElBQUksS0FBZ0IsaUNBQWlDLElBQUksQ0FBQztFQUN0Rjs7RUFHQSxtQkFBbUIsTUFBNEI7QUFDN0MsVUFBTSxPQUE2QixFQUFFLEtBQUk7QUFDekMsV0FBTyxjQUFjLEtBQUssSUFBSSxLQUFXLGlDQUFpQyxJQUFJLENBQUM7RUFDakY7O0VBR0EsbUJBQW1CLFVBQXFDO0FBQ3RELFVBQU0sT0FBMkIsRUFBRSxTQUFRO0FBQzNDLFdBQU8sY0FBYyxLQUFLLElBQUksS0FBZ0IsaUNBQWlDLElBQUksQ0FBQztFQUN0Rjs7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TztFQUNsQzs7RUFHQSxNQUFjLE9BQU8sY0FBb0M7QUFDdkQsVUFBTSxPQUFPLE1BQU0sS0FBSyxZQUFZLFFBQVEsWUFBWTtBQUN4RCxTQUFLLE9BQU8sVUFBVSxLQUFLLGFBQWEsS0FBSyxZQUFZO0VBQzNEOzs7Ozs7RUFPUSxlQUFvQjtBQUMxQixTQUFLLFNBQVM7QUFDZCxTQUFLLE9BQU8sTUFBSztBQUNqQixTQUFLLGNBQWMsSUFBSSxLQUFLO0FBQzVCLFNBQUssYUFBWTtFQUNuQjs7RUFHUSxlQUFvQjtBQUMxQixTQUFLLEtBQUssSUFBSSxJQUFJO0FBQ2xCLFNBQUssTUFBTSxJQUFJLElBQUk7QUFDbkIsU0FBSyxNQUFNLElBQUksSUFBSTtBQUNuQixTQUFLLE9BQU8sSUFBSSxDQUFBLENBQUU7QUFDbEIsU0FBSyxRQUFRLElBQUksS0FBSztFQUN4Qjs7Ozs7Ozs7RUFTQSxhQUFxQjtBQUNuQixXQUFPLEtBQUssT0FBTSxFQUFHLFNBQVMsT0FBTyxLQUFLLEtBQUssT0FBTSxFQUFHLFNBQVMsT0FBTztFQUMxRTs7cUNBMVVXLFlBQVM7RUFBQTtnRkFBVCxZQUFTLFNBQVQsV0FBUyxXQUFBLFlBREksT0FBTSxDQUFBOzs7Z0ZBQ25CLFdBQVMsQ0FBQTtVQURyQkM7V0FBVyxFQUFFLFlBQVksT0FBTSxDQUFFOzs7IiwibmFtZXMiOlsiaW5qZWN0IiwiSW5qZWN0YWJsZSIsInNpZ25hbCIsIkluamVjdGFibGUiLCJzaWduYWwiLCJpbmplY3QiLCJJbmplY3RhYmxlIl0sImRlYnVnSWQiOiJkM2ZjY2ZkYy00ODE0LTU5ODQtOTRjNi0wMDQzNTE1M2E3YjcifQ==