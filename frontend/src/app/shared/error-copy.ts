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
  // Verification (/verify). The backend answers 429 for BOTH the 60 s
  // resend cooldown and the 5/day cap with one generic message, so the copy
  // cannot promise a precise wait.
  verifyRateLimited:
    'Too many codes have been requested. Please wait a while before requesting another (codes are limited per day).',
  verifyBadCode: 'That code is invalid or has expired. Check it and try again.',
  // Password-reset confirm (code flow): wrong/expired/used/over-limit are
  // ONE generic 400 — never reveal which check failed (anti-enumeration).
  resetBadCode: 'That code is invalid or has expired. Check the latest e-mail and try again.',
  // Contact change (/account). Request 400 ≈ "same as current value"
  // (client validators already block blank/invalid input); the page special-
  // cases that copy before falling through here.
  accountRateLimited: 'Too many requests. Please wait a moment and then try again.',
  accountBadCode: 'That code is invalid or has expired. Please request a new one.',
  accountSameValue: 'That is already the value on your account — the new one must be different.',
  // Generic 400 fallback for the profile + shelter branches when the backend
  // sent no validation message (named once — every branch reuses it).
  checkInput: 'Please check your input and try again.',
  // The 409 fallback when the backend sent no message.
  valueInUse: 'That value is already in use.',
  // 5xx + other unhandled server statuses: fixed generic copy. A non-JSON
  // body (e.g. a reverse-proxy HTML error page) must never be echoed into
  // the banner verbatim.
  serverError: 'Something went wrong. Please try again.',
  // Network/transport failure (ApiError.isNetworkError, status 0): the
  // backend NEVER answered — there is no backend message to echo. This is
  // CLIENT copy, so it is a catalog key like the other client-authored
  // lines (error.network). ONE string on purpose: ApiError does not
  // distinguish offline / unreachable / timeout (all arrive as status 0
  // with this one message — see ApiError.fromNetwork), so one honest line.
  network: 'Cannot reach the backend. It may be offline — please try again later.',
} as const;

export type ErrorKind =
  'login' | 'register' | 'reset' | 'verify' | 'account' | 'profile' | 'shelter';

/**
 * The field-qualified 400 of a bean-validation failure — the only 400 in
 * the code-confirm flows that is NOT a code failure.
 *
 * The backend's global handler maps a @Valid payload failure to
 * `400 + "<field> <defaultMessage>"` (ApiErrorHandler.validation joins
 * `FieldError.getField() + " " + FieldError.getDefaultMessage()`, e.g.
 * "newPassword Password must be at least 8 characters long"). The field
 * set of a request payload is a CLOSED set — exactly the fields of the
 * endpoint's request record — so a 400 message starting with one of the
 * listed prefixes IS a field-level validation failure by construction.
 *
 * Why this cannot misfire (the anti-enumeration contract it must not
 * weaken):
 *  - the only other 400 these endpoints send for a failed code check is a
 *    FIXED generic string — "Invalid or expired reset code" /
 *    "Invalid or expired verification code" (wrong / expired / used /
 *    over-limit are deliberately indistinguishable) — and neither starts
 *    with a listed field name, so a genuine bad code ALWAYS keeps the
 *    generic copy;
 *  - the malformed-body 400s say "Malformed request" (no field prefix);
 *  - if a future DTO field is ever added without updating this table, the
 *    message falls back to the GENERIC copy — the failure direction is
 *    safe: a validation failure can read as "bad code", never the reverse
 *    (a code failure can never be misread as validation, its message is
 *    the fixed string).
 */
const FIELD_VALIDATION_PREFIXES: Partial<Record<ErrorKind, readonly string[]>> = {
  // Password-reset payloads: PasswordResetRequest.email, and
  // PasswordResetConfirmRequest.email / .code / .newPassword.
  reset: ['email ', 'code ', 'newPassword '],
  // Verify-confirm payload: VerifyConfirmRequest.level / .code.
  verify: ['level ', 'code '],
};

function isFieldValidation400(kind: ErrorKind, message: string): boolean {
  return (FIELD_VALIDATION_PREFIXES[kind] ?? []).some((prefix) => message.startsWith(prefix));
}

/**
 * The CLIENT-authored banner copy keys (the `error.*` Messages namespace):
 * the i18n-aware seam for bannerMessage(). When a translate callback is
 * passed, the client copy is served through it (the active locale); server-
 * provided messages (ApiError.message) are still echoed as-is — they are
 * backend copy and not catalog keys. The NETWORK branch is the one
 * exception to the echo rule: a status-0 error has no backend message at
 * all (the hardcoded fromNetwork() line is a placeholder, not copy), so it
 * is served through the seam too, as error.network. Callers that pass no
 * callback get the legacy English constants (behavior unchanged — the auth
 * pages, map, etc. keep their current banner copy).
 */
type ErrorCopyKey =
  | 'error.rateLimited'
  | 'error.unauthorized'
  | 'error.invalidCredentials'
  | 'error.resetBadCode'
  | 'error.checkInput'
  | 'error.serverError'
  | 'error.valueInUse'
  | 'error.verifyRateLimited'
  | 'error.verifyBadCode'
  | 'error.accountRateLimited'
  | 'error.accountBadCode'
  | 'error.network';

/** The legacy English copy behind each key (the default when no callback). */
const CLIENT_COPY: Record<ErrorCopyKey, string> = {
  'error.rateLimited': COPY.rateLimited,
  'error.unauthorized': COPY.unauthorized,
  'error.invalidCredentials': COPY.invalidCredentials,
  'error.resetBadCode': COPY.resetBadCode,
  'error.checkInput': COPY.checkInput,
  'error.serverError': COPY.serverError,
  'error.valueInUse': COPY.valueInUse,
  'error.verifyRateLimited': COPY.verifyRateLimited,
  'error.verifyBadCode': COPY.verifyBadCode,
  'error.accountRateLimited': COPY.accountRateLimited,
  'error.accountBadCode': COPY.accountBadCode,
  'error.network': COPY.network,
};

export function bannerMessage(
  error: unknown,
  kind: ErrorKind,
  translate?: (key: ErrorCopyKey) => string,
): string {
  const tr = (key: ErrorCopyKey): string =>
    translate === undefined ? CLIENT_COPY[key] : translate(key);
  const api = error instanceof ApiError ? error : toApiError(error);
  if (api.isNetworkError) {
    // Client copy, not a backend message: the backend never answered (no
    // HTTP response at all — offline / unreachable / timeout, one state in
    // ApiError), so there is nothing to echo. Served through the seam; a
    // caller with no callback gets the legacy English constant (COPY.network
    // is byte-identical to ApiError.fromNetwork's message, so behavior is
    // unchanged for them).
    return tr('error.network');
  }
  switch (api.status) {
    case 429:
      if (kind === 'verify') {
        return tr('error.verifyRateLimited');
      }
      if (kind === 'account') {
        return tr('error.accountRateLimited');
      }
      return tr('error.rateLimited');
    case 401:
      // Profile edit: the backend's "current password is incorrect" IS the
      // user-facing text (it is never the "wrong password" wording).
      if (kind === 'profile') {
        return api.message || tr('error.unauthorized');
      }
      return kind === 'login'
        ? tr('error.invalidCredentials')
        : api.message || tr('error.unauthorized');
    case 400:
      // Password-reset confirm: a FIELD-LEVEL VALIDATION failure (short
      // password, blank field — the form now blocks these client-side, the
      // server is the backstop) is echoed honestly: the message names a
      // field, never the code. EVERYTHING else (wrong/expired/used/
      // over-limit — ONE generic 400 by design, plus the malformed-body
      // 400s) keeps the generic bad-code copy: the UI must never reveal
      // which check failed (anti-enumeration).
      if (kind === 'reset') {
        return isFieldValidation400(kind, api.message) ? api.message : tr('error.resetBadCode');
      }
      // Profile edit: echo the validation message (blank field, etc.).
      if (kind === 'profile') {
        return api.message || tr('error.checkInput');
      }
      // Verification confirm: same contract as reset — field-qualified
      // validation echoes (it reveals nothing about the code); the fixed
      // wrong/expired/lockout string stays generic (five wrong codes lock
      // the code out; the lockout must be indistinguishable from a bad
      // code, so it keeps the same copy). A rate limit never reaches this
      // endpoint (JWT-guarded, no IP bucket — 429s are request-phase only).
      if (kind === 'verify') {
        return isFieldValidation400(kind, api.message) ? api.message : tr('error.verifyBadCode');
      }
      // Contact-change confirm: wrong/expired/no-pending code. Request-phase
      // 400s ("same as current") are handled by the page with dedicated copy.
      if (kind === 'account') {
        return tr('error.accountBadCode');
      }
      // Shelter detail/reviews/submit: echo the backend message (it is the
      // honest user-facing text for 400/403/409 there).
      return api.message || tr('error.checkInput');
    case 409:
      return api.message || tr('error.valueInUse');
    default:
      // 5xx (and any other status >= 500): always the fixed generic copy —
      // never echo the body. A non-JSON body (reverse-proxy HTML such as
      // "<html>...502 Bad Gateway...</html>") must not surface verbatim
      // Lower unhandled statuses keep the echo fallback.
      if (api.status >= 500) {
        return tr('error.serverError');
      }
      return api.message || tr('error.serverError');
  }
}
