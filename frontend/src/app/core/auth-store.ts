import { inject, Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';
import { AuthGateway } from '../gateways/auth-gateway';
import type { RegisterRequest } from './models';
import { TokenStore } from './token-store';

/**
 * The session store (03-CONTEXT-CORE-AUTH.md). Owns the session lifecycle:
 * silent refresh at boot, login/logout, and the single-flight refresh used by
 * the interceptor on 401. Pages/guards read `authenticated`; the backend has
 * no GET /me in v1, so no user profile is held here (levels() arrives in M3).
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

  private readonly tokens = inject(TokenStore);
  private readonly authGateway = inject(AuthGateway);

  /** In-flight single-flight refresh — concurrent callers share one promise. */
  private pendingRefresh: Promise<boolean> | null = null;

  /**
   * Boot-time silent refresh. No persisted refresh token -> anonymous.
   * Valid token -> rotates the pair (auth/refresh); 401 -> expired, cleared.
   * Any other failure (backend down) keeps the refresh token so the session
   * can still be recovered on the next boot or by a mid-session 401 refresh.
   */
  async init(): Promise<void> {
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
   */
  async login(emailOrPhone: string, password: string): Promise<void> {
    const pair = await this.authGateway.login(emailOrPhone, password);
    this.tokens.setTokens(pair.accessToken, pair.refreshToken, pair.expiresIn);
    this.authenticated.set(true);
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
  }
}
