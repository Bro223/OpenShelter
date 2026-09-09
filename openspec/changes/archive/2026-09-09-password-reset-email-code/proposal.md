## Why

Today password reset uses an emailed **URL link** containing a 32-char token
(`/reset?token=…`, built from `app.frontend.base-url`). The user asked for reset to be
confirmed by a **one-time code to email** — the same 6-digit-OTP mental model the rest of the
app already uses for verification and contact-change codes. A code flow is also more phishing-
resistant in one respect (no clickable link to a fake clone) and matches the in-app pattern users
already know from `/verify` and the contact-change panels.

This milestone (2 of 3) replaces the reset link with an emailed 6-digit code: request → email
carries the code → the reset page asks for code + new password. All security properties of the
current flow are preserved: anti-enumeration on request (always 200), short TTL, single-use,
attempt-limiting (brute-force guard), hashed-at-rest code, and full refresh-token revocation on a
successful reset.

## What Changes

Backend (Spring Boot):

- `PasswordResetService.requestReset`: generate a 6-digit numeric code (the existing
  `sixDigitCode()` pattern), e-mail it via `SmtpSender` (no URL link, no `app.frontend.base-url`
  usage), store the SHA-256 hash with the same 15-minute TTL, invalidating any previous unexpired
  code for the same user (one active code per user, mirroring `PendingVerification` replace
  semantics). Anti-enumeration stays: unknown email → silent no-op, still 200.
- `PasswordResetService.reset`: lookup by the submitted code's hash; enforce expiry + used + an
  **attempts limit** (new — the URL-token flow had none because 32 chars are unguessable; a
  6-digit code is not). Wrong/expired/over-limit code → `InvalidResetTokenException` (400, generic
  message — never reveal which part failed). Success: set the new password, mark used, revoke ALL
  refresh tokens (unchanged).
- Schema: new migration `V6__password_reset_attempts.sql` adding `attempts int not null default 0`
  to `password_reset_tokens`; `PasswordResetTokenEntity` + domain gains the attempts field and an
  increment on a failed attempt.
- Controller contract stays at the same paths but the confirm body becomes
  `{ email, code, newPassword }` — it was `{ token, newPassword }`; this is a deliberate v1-contract
  change (no external consumers). The email scopes the confirm to the account the code was sent to
  (the reset page still has it from the request); the 6-digit code is the secret.

Frontend (Angular):

- `ResetPage` reworked: mode `request` (email) → `sent` (anti-enumeration copy + "enter the 6-digit
  code from the email") → `confirm` reached IN-PAGE (not via `?token=` — no link exists anymore):
  code + new password + repeat, then `POST /auth/password-reset/confirm {code, newPassword}` →
  success → `/login?reset=ok`. A 400 ("invalid or expired code") is an inline banner with copy that
  never echoes backend internals. Remove the `?token=` query-param parsing.
- `AuthGateway`: `resetPassword(code, newPassword)`; models: `PasswordResetConfirmRequest { code,
  newPassword }`.
- Copy: request page says a code will be emailed; sent page says "If an account exists for that
  email, a 6-digit code has been sent"; anti-enumeration invariant preserved in the UI.

Docs/puml: the auth docs describe the URL-link reset (`app.frontend.base-url`, `/reset?token=`):
reverse them (backend `context-and-tasks/agent/04-CONTEXT-AUTH.md`, frontend agent
`03-CONTEXT-CORE-AUTH.md`/`07-STEPS.md`, puml `02-auth-flow.puml` or `03` reset lanes, README
deferrals). Diagrams re-rendered.

## Capabilities

### New Capabilities

- `password-reset-code`: password reset confirmed by a one-time 6-digit code emailed to the
  account address — request (anti-enumeration), emailed code, in-page code + new-password
  confirmation with expiry/attempts/single-use enforcement, and full session revocation on success.

### Modified Capabilities

## Impact

- Backend: `PasswordResetService` (+ attempts/TTL/one-active-code), `PasswordResetTokenEntity` +
  domain (+attempts), `V6` migration, `PasswordResetConfirmRequest` field change, controller +
  `AuthService` param names, existing `PasswordResetServiceTest`/`AuthApiIT`/repository IT updates,
  new attempt-limit + one-active-code + wrong/expired tests. 223 tests stay green + new coverage.
- Frontend: `reset-page.{ts,html,spec}` (in-page code flow, no token parsing), `auth-gateway.ts` +
  `models.ts` (code field), copy updates. 300 tests stay green + updated/new cases.
- Docs: backend `04-CONTEXT-AUTH.md`, frontend agent `03-CONTEXT-CORE-AUTH.md`/`07-STEPS.md`,
  `frontend/README.md` + root `README.md` deferral lines (password-reset link → code), puml
  `02-auth-flow.puml` (reset lanes) re-rendered.
- NOT in this change: "change password while signed in" (account-page setting) — out of scope for
  this milestone unless trivial; contributions milestone (3) unchanged.

Implementation note (backend landed): the confirm is email-scoped
(`PasswordResetService.reset(email, code, newPassword)`, lookup via `findActiveByUserId`) rather
than a global code-hash lookup — the code row identifies the account, and the email keeps the
confirm anchored to the address the user typed on the request step. Unknown email and wrong code
are indistinguishable (same generic 400).
