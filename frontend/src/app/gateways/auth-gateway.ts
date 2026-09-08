import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RefreshRequest,
  RegisterRequest,
  TokenResponse,
} from '../core/models';

/**
 * The door to the /auth controller group (01-TASK.md §4: gateways are the
 * only way pages reach the API). No token logic lives here — that is
 * AuthStore's job. Every method returns a typed promise and throws ApiError
 * on failure (mapped centrally by ApiClient).
 */
@Injectable({ providedIn: 'root' })
export class AuthGateway {
  private readonly api = inject(ApiClient);

  /** POST /auth/register -> 201 empty body (no session is created). */
  register(request: RegisterRequest): Promise<void> {
    return lastValueFrom(this.api.post<void>('/auth/register', request));
  }

  /** POST /auth/login -> TokenResponse. Phone may be local or +372 form. */
  login(emailOrPhone: string, password: string): Promise<TokenResponse> {
    const body: LoginRequest = { emailOrPhone, password };
    return lastValueFrom(this.api.post<TokenResponse>('/auth/login', body));
  }

  /** POST /auth/refresh -> a new rotated pair. */
  refresh(refreshToken: string): Promise<TokenResponse> {
    const body: RefreshRequest = { refreshToken };
    return lastValueFrom(this.api.post<TokenResponse>('/auth/refresh', body));
  }

  /** POST /auth/logout -> 204. Revokes the given refresh token server-side. */
  logout(refreshToken: string): Promise<void> {
    const body: RefreshRequest = { refreshToken };
    return lastValueFrom(this.api.post<void>('/auth/logout', body));
  }

  /**
   * POST /auth/password-reset/request -> always 200 (anti-enumeration:
   * the UI must never distinguish "unknown email").
   */
  requestPasswordReset(email: string): Promise<void> {
    const body: PasswordResetRequest = { email };
    return lastValueFrom(this.api.post<void>('/auth/password-reset/request', body));
  }

  /**
   * POST /auth/password-reset/confirm -> 200. The e-mail scopes the 6-digit
   * code to the account it was sent to; ANY failure (unknown email / wrong /
   * expired / used / over-limit) answers 400 with one generic message, so
   * the page must not treat the 400 as account-existence information.
   */
  resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const body: PasswordResetConfirmRequest = { email, code, newPassword };
    return lastValueFrom(this.api.post<void>('/auth/password-reset/confirm', body));
  }
}
