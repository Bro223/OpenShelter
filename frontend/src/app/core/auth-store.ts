import { inject, Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';
import { AuthGateway } from '../gateways/auth-gateway';
import type { RegisterRequest, VerificationLevel } from './models';
import { TokenStore } from './token-store';

/**
 * The session store (03-CONTEXT-CORE-AUTH.md). Owns the session lifecycle:
 * silent refresh at boot, login/logout, and the single-flight refresh used by
 * the interceptor on 401. Pages/guards read `authenticated`.
 *
 * Verification levels (M3): the backend has no GET /me and the JWT carries
 * only the user id — no endpoint returns the verified-claim set (04-CONTEXT
 * decision 3). So `levels` is an OPTIMISTIC, session-lifetime mirror: it
 * starts empty and grows only when this browser saw a confirm succeed, or a
 * request came back 409 "already verified". It is deliberately NOT persisted
 * and resets whenever the identity may change (login/logout/cleared session):
 * a stale cache could wrongly hide the verify buttons, and there is no way to
 * re-derive claims without the endpoint. Consequences are self-healing — after
 * a reload the buttons reappear and a request to an already-verified level
 * answers 409 without sending a code (backed by the backend's
 * AlreadyVerifiedException) and re-marks the level here.
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

  /**
   * Verification levels THIS session has seen confirmed (EMAIL/PHONE). Read
   * via `levels()` in templates; mutate ONLY through {@link addLevel}. Resets
   * on login/logout/cleared session — see the class note for why it is not
   * persisted. (SMART_ID is never added: the backend rejects it with 400.)
   */
  readonly levels = signal<VerificationLevel[]>([]);

  private readonly tokens = inject(TokenStore);
  private readonly authGateway = inject(AuthGateway);

  /** In-flight single-flight refresh — concurrent callers share one promise. */
  private pendingRefresh: Promise<boolean> | null = null;

  /** In-flight boot init — guards and the shell may race on the same init. */
  private bootInit: Promise<void> | null = null;

  /**
   * Boot-time silent refresh. No persisted refresh token -> anonymous.
   * Valid token -> rotates the pair (auth/refresh); 401 -> expired, cleared.
   * Any other failure (backend down) keeps the refresh token so the session
   * can still be recovered on the next boot or by a mid-session 401 refresh.
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
   * Log in with email-or-phone + password. Stores the returned pair and marks
   * the session authenticated. Throws ApiError on failure (401/429).
   *
   * Starts with an empty level set: a fresh login is a fresh identity, and the
   * backend never tells us this account's verified claims (no GET /me).
   */
  async login(emailOrPhone: string, password: string): Promise<void> {
    const pair = await this.authGateway.login(emailOrPhone, password);
    this.tokens.setTokens(pair.accessToken, pair.refreshToken, pair.expiresIn);
    this.authenticated.set(true);
    this.levels.set([]);
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

  /** Rotate via /auth/refresh and store the new pair. */
  private async rotate(refreshToken: string): Promise<void> {
    const pair = await this.authGateway.refresh(refreshToken);
    this.tokens.setTokens(pair.accessToken, pair.refreshToken, pair.expiresIn);
  }

  /** Drop all session state (used by logout and a failed mid-session refresh). */
  private clearSession(): void {
    this.tokens.clear();
    this.authenticated.set(false);
    this.levels.set([]);
  }

  /**
   * True once at least one channel (EMAIL or PHONE) is verified. Mirrors the
   * backend VerificationRules: any single level grants SUBMIT_SHELTER.
   *
   * Caveat: purely session-local knowledge — on a fresh reload this is false
   * until a request 409 "already verified" re-marks the level (see class note).
   */
  isVerified(): boolean {
    return this.levels().includes('EMAIL') || this.levels().includes('PHONE');
  }

  /**
   * Optimistic claim add (04-CONTEXT decision 3). Called by the pages after a
   * successful confirm AND after a request that answered 409 "already
   * verified" — both mean the backend holds the claim. Dedupes; SMART_ID is
   * ignored (the backend rejects it as a stub, so it can never be verified).
   */
  addLevel(level: VerificationLevel): void {
    if (level === 'SMART_ID' || this.levels().includes(level)) {
      return;
    }
    this.levels.set([...this.levels(), level]);
  }
}
