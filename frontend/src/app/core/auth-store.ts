import { inject, Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import type { MeResponse, RegisterRequest, VerificationLevel } from './models';
import { TokenStore } from './token-store';

/**
 * The session store (03-CONTEXT-CORE-AUTH.md). Owns the session lifecycle:
 * silent refresh at boot, login/logout, and the single-flight refresh used by
 * the interceptor on 401. Pages/guards read `authenticated`.
 *
 * Profile (this milestone): the backend answers `GET /account/me` with the
 * REAL profile — name, email, phone, nationalIdCode and the REAL verified
 * claim set. The store fetches it once at boot (after a successful silent
 * refresh) and after login, and keeps it in signals. `refreshProfile()`
 * re-fetches it after every claims-changing event (verify-confirm, contact
 * change, profile edit) so the account/verify pages read one truth. The old
 * optimistic `levels` mirror (and its `addLevel` writer) is gone — the
 * fetched `levels()` is server state, and a failed fetch is non-fatal: the
 * session stays authenticated with a null profile (the account page shows a
 * retry), and the next refresh or explicit `refreshProfile()` recovers it.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  /** True while an access token is usable (session active). */
  readonly authenticated = signal<boolean>(false);

  /**
   * True once init() has decided the boot state — the shell can render a
   * neutral header until then instead of flashing "logged out".
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
   * Boot-time silent refresh. No persisted refresh token -> anonymous.
   * Valid token -> rotates the pair (auth/refresh) and fetches the real
   * profile; 401 -> expired, cleared. Any other failure (backend down) keeps
   * the refresh token so the session can still be recovered on the next boot
   * or by a mid-session 401 refresh.
   *
   * Idempotent and single-flight: concurrent callers (App boot + a guard on
   * the first navigation) share one run so the refresh token is never raced.
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
      this.authenticated.set(false);
      this.initialized.set(true);
      return;
    }
    try {
      await this.rotate(refreshToken);
      this.authenticated.set(true);
      // Real profile for the restored session (non-fatal — the session is
      // alive even when the profile fetch fails; the account page retries).
      await this.refreshProfile();
    } catch (error) {
      this.authenticated.set(false);
      if (error instanceof ApiError && error.status === 401) {
        // Refresh token revoked or expired — drop the dead session.
        this.tokens.clear();
      }
      // Network/other failures keep the token (retry next boot).
    } finally {
      this.initialized.set(true);
    }
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
   * session is live, the profile stays null (the account page offers a retry).
   */
  async login(emailOrPhone: string, password: string): Promise<void> {
    const pair = await this.authGateway.login(emailOrPhone, password);
    // A fresh login is a fresh identity — drop any previous identity's data
    // before adopting the new one.
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
   * (e.g. N parallel 401s) share ONE in-flight POST /auth/refresh — the old
   * rotated refresh token is never used twice. Returns true when a fresh pair
   * was stored, false when the session is dead (storage already cleared).
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
    try {
      const refreshToken = this.tokens.refresh();
      if (refreshToken === null) {
        return false;
      }
      await this.rotate(refreshToken);
      this.authenticated.set(true);
      return true;
    } catch {
      this.clearSession();
      return false;
    } finally {
      this.pendingRefresh = null;
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
      this.pendingProfile = null;
    });
    this.pendingProfile = attempt;
    return attempt;
  }

  private async fetchProfile(): Promise<void> {
    try {
      const profile = await this.accountGateway.me();
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

  /** Drop all session state (used by logout and a failed mid-session refresh). */
  private clearSession(): void {
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
