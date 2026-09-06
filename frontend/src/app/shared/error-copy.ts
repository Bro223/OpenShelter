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
  unauthorized: 'Not authorized. Please log in again.',
  // Verification (/verify, M3). The backend answers 429 for BOTH the 60 s
  // resend cooldown and the 5/day cap with one generic message, so the copy
  // cannot promise a precise wait — see the M3 report for the gap.
  verifyRateLimited:
    'Too many codes have been requested. Please wait a while before requesting another (codes are limited per day).',
  verifyBadCode: 'That code is invalid or has expired. Check it and try again.',
  // Contact change (/account, M3). Request 400 ≈ "same as current value"
  // (client validators already block blank/invalid input); the page special-
  // cases that copy before falling through here.
  accountRateLimited: 'Too many requests. Please wait a moment and then try again.',
  accountBadCode: 'That code is invalid or has expired. Please request a new one.',
  accountSameValue: 'That is already the value on your account — the new one must be different.',
} as const;

export type ErrorKind = 'login' | 'register' | 'reset' | 'verify' | 'account';

export function bannerMessage(error: unknown, kind: ErrorKind): string {
  const api = error instanceof ApiError ? error : toApiError(error);
  if (api.isNetworkError) {
    return api.message;
  }
  switch (api.status) {
    case 429:
      if (kind === 'verify') {
        return COPY.verifyRateLimited;
      }
      if (kind === 'account') {
        return COPY.accountRateLimited;
      }
      return COPY.rateLimited;
    case 401:
      return kind === 'login' ? COPY.invalidCredentials : api.message || COPY.unauthorized;
    case 400:
      // Password-reset confirm failures are always "bad link/token" — no
      // reason to echo backend internals.
      if (kind === 'reset') {
        return 'This reset link is invalid or has expired. Please request a new one.';
      }
      // Verification confirm: wrong/expired code (or SMART_ID stub request).
      if (kind === 'verify') {
        return COPY.verifyBadCode;
      }
      // Contact-change confirm: wrong/expired/no-pending code. Request-phase
      // 400s ("same as current") are handled by the page with dedicated copy.
      if (kind === 'account') {
        return COPY.accountBadCode;
      }
      return api.message || 'Please check your input and try again.';
    case 409:
      return api.message || 'That value is already in use.';
    default:
      return api.message || 'Something went wrong. Please try again.';
  }
}
