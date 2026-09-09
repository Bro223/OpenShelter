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
  // Password-reset confirm (M2, code flow): wrong/expired/used/over-limit are
  // ONE generic 400 — never reveal which check failed (anti-enumeration).
  resetBadCode: 'That code is invalid or has expired. Check the latest e-mail and try again.',
  // Contact change (/account, M3). Request 400 ≈ "same as current value"
  // (client validators already block blank/invalid input); the page special-
  // cases that copy before falling through here.
  accountRateLimited: 'Too many requests. Please wait a moment and then try again.',
  accountBadCode: 'That code is invalid or has expired. Please request a new one.',
  accountSameValue: 'That is already the value on your account — the new one must be different.',
  // Generic 400 fallback for the profile + shelter branches when the backend
  // sent no validation message (named once — it used to be duplicated inline).
  checkInput: 'Please check your input and try again.',
  // 5xx + other unhandled server statuses: fixed generic copy. A non-JSON
  // body (e.g. a reverse-proxy HTML error page) must never be echoed into
  // the banner verbatim (N6).
  serverError: 'Something went wrong. Please try again.',
} as const;

export type ErrorKind =
  'login' | 'register' | 'reset' | 'verify' | 'account' | 'profile' | 'shelter';

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
      // Profile edit: the backend's "current password is incorrect" IS the
      // user-facing text (it is never the "wrong password" wording).
      if (kind === 'profile') {
        return api.message || COPY.unauthorized;
      }
      return kind === 'login' ? COPY.invalidCredentials : api.message || COPY.unauthorized;
    case 400:
      // Password-reset confirm failures are always "bad code" — no reason to
      // echo backend internals (wrong/expired/used/over-limit are all one
      // generic 400, and the e-mail carries a code, not a link).
      if (kind === 'reset') {
        return COPY.resetBadCode;
      }
      // Profile edit: echo the validation message (blank field, etc.).
      if (kind === 'profile') {
        return api.message || COPY.checkInput;
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
      // Shelter detail/reviews/submit: echo the backend message (it is the
      // honest user-facing text for 400/403/409 there).
      return api.message || COPY.checkInput;
    case 409:
      return api.message || 'That value is already in use.';
    default:
      // 5xx (and any other status >= 500): always the fixed generic copy —
      // never echo the body. A non-JSON body (reverse-proxy HTML such as
      // "<html>...502 Bad Gateway...</html>") must not surface verbatim
      // (N6). Lower unhandled statuses keep the echo fallback.
      if (api.status >= 500) {
        return COPY.serverError;
      }
      return api.message || COPY.serverError;
  }
}
