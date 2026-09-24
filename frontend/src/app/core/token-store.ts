import { Injectable, signal } from '@angular/core';

/**
 * Where the refresh token lives in localStorage (v1 tradeoff — documented in
 * the frontend README: httpOnly-cookie migration is a deferred backend change).
 */
const REFRESH_TOKEN_KEY = 'os.refresh';

/**
 * Token storage:
 *  - access token  -> in-memory signal only (smaller XSS surface; lost on reload)
 *  - refresh token -> localStorage (survives reload so boot can silent-refresh)
 *
 * No tokens ever go into environment.*.ts.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly accessToken = signal<string | null>(null);

  /** Current in-memory access token, if any. */
  access(): string | null {
    return this.accessToken();
  }

  /** Persisted refresh token, if any. */
  refresh(): string | null {
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
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken.set(accessToken);
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Storage unavailable (private mode): the session still works in memory,
      // it just will not survive a reload.
    }
  }

  /** Drop the whole session: access signal + persisted refresh token. */
  clear(): void {
    this.accessToken.set(null);
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore — nothing to clear
    }
  }
}
