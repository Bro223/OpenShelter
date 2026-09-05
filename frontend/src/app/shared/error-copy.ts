import { ApiError, toApiError } from '../core/api-error';

/**
 * Maps a thrown ApiError to user-facing banner copy per the status table in
 * 02-CONTEXT-API.md. Anti-enumeration rule: a login 401 ALWAYS says the same
 * generic thing — the backend message ("invalid credentials") is never shown
 * and the UI never distinguishes "unknown user" from "wrong password".
 */
export const COPY = {
  invalidCredentials: 'Invalid email/phone or password.',
  rateLimited: 'Too many attempts — please wait a moment and then try again.',
} as const;

export type ErrorKind = 'login' | 'register' | 'reset';

export function bannerMessage(error: unknown, kind: ErrorKind): string {
  const api = error instanceof ApiError ? error : toApiError(error);
  if (api.isNetworkError) {
    return api.message;
  }
  switch (api.status) {
    case 429:
      return COPY.rateLimited;
    case 401:
      return kind === 'login'
        ? COPY.invalidCredentials
        : api.message || 'Not authorized. Please log in again.';
    case 400:
      // Password-reset confirm failures are always "bad link/token" — no
      // reason to echo backend internals.
      return kind === 'reset'
        ? 'This reset link is invalid or has expired. Please request a new one.'
        : api.message || 'Please check your input and try again.';
    case 409:
      return api.message || 'That value is already in use.';
    default:
      return api.message || 'Something went wrong. Please try again.';
  }
}
