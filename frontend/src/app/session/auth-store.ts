import { inject, Injectable, signal } from '@angular/core';
import { ApiError } from '../core/api-error';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import type { MeResponse, RegisterRequest, VerificationLevel } from '../core/models';
import { TokenStore } from '../core/token-store';

/**
 * The session store. Owns the session lifecycle:
 * silent refresh at boot, login/logout, and the single-flight refresh used by
 * the interceptor on 401. Pages/guards read `authenticated`.
 *
 * Why it lives in `session/` and not `core/`: it is the only "core" service
 * that depends on `gateways` (AuthGateway/AccountGateway), and a core →
 * gateways edge would invert the documented `features → gateways → core`
 * dependency rule. `session/` sits between them: it may import core and
 * gateways; core may import `session/auth-store` ONLY for the guard type
 * (core/guards.ts — a deliberate, documented core→session edge).
 *
 * Profile: the backend answers `GET /account/me` with the REAL profile —
 * name, email, phone, nationalIdCode and the REAL verified claim set. The
 * store fetches it once at boot (after a successful silent refresh) and
 * after login, and keeps it in signals. `refreshProfile()` re-fetches it
 * after every claims-changing event (verify-confirm, contact change,
 * profile edit) so the account/verify pages read one truth. A failed fetch
 * is non-fatal: the session stays authenticated with a null profile (the
 * account page shows a retry), and the next refresh or explicit
 * `refreshProfile()` recovers it.
 *
 * Session epoch (identity generation): every `clearSession()` (logout,
 * failed-refresh clear) and every `login()` bumps a private epoch counter.
 * In-flight async work captures the epoch it started under and must not
 * write session state once the epoch moved:
 *  - a stale in-flight `GET /account/me` (user A's) is NOT adopted onto the
 *    fresh session of user B (F1);
 *  - an in-flight 401 refresh that LANDS after logout does NOT resurrect the
 *    cleared session (N1) — the just-rotated pair is discarded.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  /** True while an access token is usable (session active). */
  readonly authenticated = signal<boolean>(false);

  /**
   * True once init() has DECISIVELY decided the boot state — the shell can
   * render a neutral header until then instead of flashing "logged out".
   * A non-401 boot failure (backend down) leaves this false ON PURPOSE (N2):
   * the stored refresh token may still be valid, so a later guard call
   * retries performInit instead of latching the session dead forever.
   */
  readonly initialized = signal<boolean>(false);

  // ---- real profile (GET /account/me) --------------------------------------
  /**
   * The fetched profile, or null while unknown (never logged in yet, or a
   * failed fetch). Read via `name()`/`email()`/… in templates.
   */
  readonly name = signal<string | null>(null);
  readonly email = signal<string | null>(null);
  readonly phone = signal<string | null>(null);
  readonly nationalIdCode = signal<string | null>(null);

  /**
   * The REAL verified levels (EMAIL/PHONE) from the fetched profile. Read via
   * `levels()` in templates and guards; written ONLY by {@link refreshProfile}
   * / {@link clearSession}. SMART_ID can appear in a future response — the
   * backend currently rejects it as a stub.
   */
  readonly levels = signal<VerificationLevel[]>([]);

  private readonly tokens = inject(TokenStore);
  private readonly authGateway = inject(AuthGateway);
  private readonly accountGateway = inject(AccountGateway);

  /** In-flight single-flight refresh — concurrent callers share one promise. */
  private pendingRefresh: Promise<boolean> | null = null;

  /** In-flight boot init — guards and the shell may race on the same init. */
  private bootInit: Promise<void> | null = null;

  /** In-flight profile fetch — concurrent callers share one run. */
  private pendingProfile: Promise<void> | null = null;

  /**
   * Session identity generation (see class doc). Bumped by clearSession()
   * and login() — both start a new generation, and any async work that
   * started under the previous generation must not write this session.
   */
  private epoch = 0;

  /**
   * Boot-time silent refresh. No persisted refresh token -> anonymous.
   * Valid token -> rotates the pair via the SAME single-flight refresh()
   * path a mid-session 401 uses (W13) and fetches the real profile; 401 ->
   * expired, cleared, definitively initialized. A non-401 failure (backend
   * down) keeps the refresh token AND leaves initialized false, so a later
   * guard call retries the boot (N2).
   *
   * Idempotent and single-flight: concurrent callers (App boot + a guard on
   * the first navigation) share one run so the refresh token is never
   * raced. A failed run is releasable — the pending boot promise is always
   * cleared, so the next init() re-attempts.
   */
  init(): Promise<void> {
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

  private async performInit(): Promise<void> {
    const refreshToken = this.tokens.refresh();
    if (refreshToken === null) {
      // (a) no stored token — anonymous, definitive.
      this.authenticated.set(false);
      this.initialized.set(true);
      return;
    }
    // (b/c/d) Route the boot rotation through the same single-flight
    // refresh() as a mid-session 401 (W13): a 401-driven refresh racing the
    // boot rotation now shares one in-flight POST /auth/refresh, and the
    // loser can no longer clear a session that is still valid.
    const refreshed = await this.refresh();
    if (refreshed) {
      // (b) Session restored — doRefresh already rotated the pair and set
      // authenticated. Real profile for the restored session (non-fatal —
      // the session is alive even when the profile fetch fails; the
      // account page retries).
      await this.refreshProfile();
      this.initialized.set(true);
      return;
    }
    // refresh() returned false.
    this.authenticated.set(false);
    if (this.tokens.refresh() !== null) {
      // (d) network/5xx — doRefresh keeps the stored token (it clears only
      // on 401): leave initialized FALSE so a later guard call retries
      // performInit while the session is still recoverable (N2).
      return;
    }
    // (c) Definitive 401 — doRefresh already cleared the dead session.
    this.initialized.set(true);
  }

  /**
   * Register a new account. The backend answers 201 with an empty body — no
   * session is created (register != login). Errors (400/409) propagate as
   * ApiError to the caller.
   */
  register(request: RegisterRequest): Promise<void> {
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
   * onto this session — F1) and discards the single-flight profile slot so
   * the stale fetch is not awaited under the new identity.
   */
  async login(emailOrPhone: string, password: string): Promise<void> {
    const pair = await this.authGateway.login(emailOrPhone, password);
    // A fresh login is a fresh identity — start a new epoch and drop any
    // previous identity's data before adopting the new one.
    this.epoch += 1;
    this.pendingProfile = null; // discard any in-flight stale profile fetch
    this.clearProfile();
    this.tokens.setTokens(pair.accessToken, pair.refreshToken, pair.expiresIn);
    this.authenticated.set(true);
    await this.refreshProfile();
  }

  /**
   * Log out: best-effort POST /auth/logout (revokes the refresh token
   * server-side), then local state is cleared regardless of network outcome.
   */
  async logout(): Promise<void> {
    const refreshToken = this.tokens.refresh();
    if (refreshToken !== null) {
      try {
        await this.authGateway.logout(refreshToken);
      } catch {
        // Best-effort revocation — local clear happens either way.
      }
    }
    this.clearSession();
  }

  /**
   * Single-flight session refresh (03-CONTEXT decision 2). Concurrent callers
   * (e.g. N parallel 401s, or the boot rotation — W13) share ONE in-flight
   * POST /auth/refresh — the old rotated refresh token is never used twice.
   * Returns true when a fresh pair was stored, false when the session is
   * dead (storage cleared) or the refresh could not run (no token).
   */
  refresh(): Promise<boolean> {
    if (this.pendingRefresh !== null) {
      return this.pendingRefresh;
    }
    const attempt = this.doRefresh();
    this.pendingRefresh = attempt;
    return attempt;
  }

  private async doRefresh(): Promise<boolean> {
    const startEpoch = this.epoch;
    const presented = this.tokens.refresh();
    if (presented === null) {
      return false;
    }
    try {
      await this.rotateWithCrossTabRecovery(presented);
      if (startEpoch !== this.epoch) {
        // The session moved on while this refresh was in flight (logout, or
        // a login as another identity) — the pair we just stored belongs to
        // a dead generation. Discard it so a late 401-refresh cannot
        // resurrect the session (N1).
        this.tokens.clear();
        this.authenticated.set(false);
        return false;
      }
      this.authenticated.set(true);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Refresh token revoked/expired — definitive: clear the session.
        this.clearSession();
      }
      // Network/5xx: keep the stored token (F3) — the session may still be
      // valid; the request that triggered this refresh fails and the user
      // can retry (and a later guard call retries the boot — N2).
      this.authenticated.set(false);
      return false;
    } finally {
      // Safe plain reset: refresh() only starts doRefresh when
      // pendingRefresh === null, so this is always the in-flight run.
      this.pendingRefresh = null;
    }
  }

  /**
   * Rotate the given refresh token. Cross-tab race (F4): all tabs share the
   * ONE persisted refresh token while single-flight is per-instance — if
   * another tab rotated it in flight, our presented token 401s. On that 401
   * re-read storage: if the token changed, retry ONCE with the fresh token
   * before giving up. Anything else (unchanged token, network/5xx) rethrows
   * for the caller to classify — nothing is cleared here.
   */
  private async rotateWithCrossTabRecovery(presented: string): Promise<void> {
    try {
      await this.rotate(presented);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        throw error; // not a rotation conflict — let the caller classify
      }
      const reread = this.tokens.refresh();
      if (reread === null || reread === presented) {
        throw error; // nobody rotated in between — this 401 is final
      }
      // Another tab rotated while we were in flight: retry once with the
      // token they persisted. A second 401 propagates (final — no second
      // re-read, so this cannot loop).
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
  refreshProfile(): Promise<void> {
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

  private async fetchProfile(): Promise<void> {
    const startEpoch = this.epoch;
    try {
      const profile = await this.accountGateway.me();
      if (startEpoch !== this.epoch) {
        // The session changed while this fetch was in flight (logout +
        // re-login, or a cleared session) — adopting this profile would
        // paint user A's data onto user B's fresh session (F1). Drop it.
        return;
      }
      this.adoptProfile(profile);
    } catch {
      // Non-fatal on purpose: a profile hiccup must not kill the session
      // (the account page renders an error + retry for the null case).
    }
  }

  /** Adopt a fetched profile into the signals (single writer for the fields). */
  private adoptProfile(profile: MeResponse): void {
    this.name.set(profile.name);
    this.email.set(profile.email);
    this.phone.set(profile.phone);
    this.nationalIdCode.set(profile.nationalIdCode);
    this.levels.set(profile.levels);
  }

  /** Rotate via /auth/refresh and store the new pair. */
  private async rotate(refreshToken: string): Promise<void> {
    const pair = await this.authGateway.refresh(refreshToken);
    this.tokens.setTokens(pair.accessToken, pair.refreshToken, pair.expiresIn);
  }

  /**
   * Drop all session state (used by logout and a definitive failed
   * mid-session refresh). Bumps the epoch: any in-flight work from this
   * generation (profile fetch, in-flight refresh) must not write back.
   */
  private clearSession(): void {
    this.epoch += 1;
    this.tokens.clear();
    this.authenticated.set(false);
    this.clearProfile();
  }

  /** Reset the profile fields to "unknown" (login of another identity, logout). */
  private clearProfile(): void {
    this.name.set(null);
    this.email.set(null);
    this.phone.set(null);
    this.nationalIdCode.set(null);
    this.levels.set([]);
  }

  /**
   * True once at least one channel (EMAIL or PHONE) is verified. Mirrors the
   * backend VerificationRules: any single level grants SUBMIT_SHELTER.
   *
   * The levels are REAL (fetched from the profile) — on a fresh reload
   * init() re-fetches them, so the state survives across sessions.
   */
  isVerified(): boolean {
    return this.levels().includes('EMAIL') || this.levels().includes('PHONE');
  }
}
