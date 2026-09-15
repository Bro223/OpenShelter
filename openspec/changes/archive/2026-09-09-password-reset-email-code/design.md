## Context

- Current flow (M1 baseline, backend 223 tests / frontend 300 tests green): `POST
  /auth/password-reset/request {email}` (rate-limited per IP+email, anti-enumeration always 200)
  → `PasswordResetService.requestReset` builds a 32-char URL token from `app.frontend.base-url`,
  emails `<frontend>/reset?token=<token>`, stores `SHA-256(token)` in `password_reset_tokens`
  (15-min TTL via `PasswordResetTokenEntity`, `used_at` nullable). `POST
  /auth/password-reset/confirm {token, newPassword}` → `reset()` validates hash/expiry/used then
  sets the password and revokes every refresh token, single transaction. Wrong token →
  `InvalidResetTokenException` → 400 generic via `ApiErrorHandler`.
- The codebase already has the exact code discipline we need to copy: contact-change codes
  (`ContactChangeService.sixDigitCode()` = `String.format("%06d", RANDOM.nextInt(1_000_000))`,
  hashed SHA-256, TTL, cooldown) and verification codes (`PendingVerification`: hash at rest,
  attempts-limited with MAX_ATTEMPTS, expiring, one-active-per-user replace semantics).
- Frontend `ResetPage` (`/reset`, GuestGuard): mode request → sent → confirm where confirm is
  entered ONLY via `?token=` (parsed in `ngOnInit`);
  `AuthGateway.resetPassword(token, newPassword)`;
  `PasswordResetConfirmRequest { token, newPassword }` in models.ts.
  `reset-page.spec.ts` has a
  "shows the confirm form when a token is present" test that will need replacing.
- `PasswordResetTokenRepository` (JPA) + an in-memory fake in tests; `PasswordResetTokenRepositoryIT`.
- Email goes out via `SmtpSender` (interface; `SmtpPulseSmtpSender` real relay, `DevSmtpSender`
  console in dev) — the request path needs no frontend base URL anymore.

## Goals / Non-Goals

**Goals:**

- Match the in-app 6-digit-OTP mental model (verify/contact-change) for password reset, with no
  emailed URL link.
- Preserve every security property of the old flow AND add the missing brute-force guard the
  shorter code requires: expiry, single-use, attempts limit, hashed at rest, one active per user,
  anti-enumeration request, full refresh-token revocation on success.
- Keep the reset page fully in-app (no `?token=` parsing), anti-enumeration copy invariant intact.
- Keep 223 backend + 300 frontend tests green; add real coverage for the changed semantics.
- Docs/puml in sync (repo rule): every mention of the URL-link reset is reversed.

**Non-Goals:**

- No "change password while signed in" setting on the account page (separate concern; not in this
  milestone).
- No emailed link fallback (deliberate: single code flow per user decision).
- No account enumeration by timing (rate limiter + always-200 already cover the visible surface).
- No SMART-ID/other reset channels.

## Decisions

1. **6-digit numeric code, same generator as contact-change.** Reuse the `sixDigitCode()` pattern
   (SecureRandom-backed 000000–999999). Send via `SmtpSender.send(email, "Shelter Map password
   reset code: <code> (valid 15 min)")`. No URL, no `app.frontend.base-url` — remove the
   `resetUrlPrefix` construction and its now-unused `frontendBaseUrl` constructor arg (update any
   config that still passes it; the property may remain in application config harmlessly or be
   dropped — prefer dropping if nothing else consumes it, else keep with a comment).
   Rationale: one code style across the app; matches user expectation from verify/change flows.
   Alternative considered: reuse the 8-char alphanumeric email-verification token — rejected: the
   verify UI says "6-digit code" and SMS/contact-change already use 6-digit; consistency wins.

2. **Reuse `password_reset_tokens` with a new `attempts` column (V6 migration).** Add
   `attempts int not null default 0`; extend `PasswordResetTokenEntity` + the domain object used by
   the service with an `attempts` field + `recordAttempt()`; enforce a `MAX_ATTEMPTS = 5` constant
   in `PasswordResetService` (mirror `PendingVerification.MAX_ATTEMPTS`). Rationale: no new table or
   repository plumbing; the entity already models user/code/expiry/used. Alternative: a fresh
   `PendingPasswordReset` mirroring `PendingVerification` — more code for no behavioural gain.

3. **Lookup by code hash with generic failure.** `requestReset` stores `SHA-256(code)` (the same
   hashing util the verification/contact-change paths use). `reset(code, newPassword)` hashes the
   submitted code, finds the row, then checks, in order: exists → not used → not expired →
   attempts < MAX → hash match. Any failure (or a code with no row) → `InvalidResetTokenException`
   with the SAME generic message ("invalid or expired reset code") so attackers cannot distinguish
   wrong-code from expired from over-limit. A wrong-but-otherwise-valid hash increments attempts
   (persisted). Over-limit or expired codes are rejected without further increment churn.
   Rationale: the current handler already maps `InvalidResetTokenException` → 400 generic; keep it.
   NOTE: the old 32-char flow never needed attempts because it was unguessable — this is the new
   guard the shorter code requires (spec'd in ADDED requirements).

4. **One active code per user.** On `requestReset`, before saving the new code, invalidate
   (delete) any prior unexpired row for that user (mirror `PendingVerification` replace semantics).
   Used/expired rows may stay (harmless; expiry is also enforced at confirm). The repository gets a
   method like `deleteActiveByUserId(userId)`.
   Rationale: prevents a pile-up of live codes weakening the attempts guard and matches "second
   request invalidates the first" in the spec.

5. **Confirm contract: `{ token, newPassword }` → `{ email, code, newPassword }`.**
   `PasswordResetConfirmRequest { @Email email, code, newPassword }`; controller +
   `AuthService.resetPassword(email, code, newPassword)` at unchanged paths. Frontend
   `AuthGateway.resetPassword(email, code, newPassword)` + models type. This is a deliberate
   v1-contract change (no external consumers) — the codebase's own docs (backend
   `04-CONTEXT-AUTH.md`, puml) are updated in this change.
   Rationale: an in-app code is semantically `code`; the email scopes the confirm to the account
   the code was sent to (lookup via `findActiveByUserId` instead of a global code-hash scan), and
   unknown-email and wrong-code are indistinguishable to the caller (one generic 400). Keeps
   `request`/`confirm` naming parallel with the verification endpoints.

6. **Reset page flow: request → sent → confirm in-page.** New mode sequence: `request` (email
   form) → on success `sent` (anti-enumeration copy: "If an account exists for that email, a
   6-digit code has been sent to it.") with the code + new-password + repeat fields visible and a
   "Resend" affordance → submit code+passwords → success navigates `/login?reset=ok`. Remove the
   `ngOnInit` `?token=` parsing entirely (no link exists). 400 from confirm → generic inline banner
   ("That code is invalid or has expired — check the latest email and try again.") without echoing
   the backend message verbatim if it leaks internals (map through `bannerMessage`-style copy —
   check `error-copy.ts` for a `reset` key and reuse/adapt).
   Rationale: single-page flow with no external link matches the spec scenario set and kills the
   `?token=` deep-link surface.

7. **Docs/puml are part of the diff (repo rule).** Reverse every "reset link / ?token= /
   app.frontend.base-url" statement: backend `context-and-tasks/agent/04-CONTEXT-AUTH.md`, frontend
   agent `03-CONTEXT-CORE-AUTH.md` + `07-STEPS.md`, `frontend/README.md` and root `README.md`
   deferral lines that mention reset-link, puml `02-auth-flow.puml` (and any reset lane in 03)
   → code-flow, re-render via `./render.sh`. Report exactly what changed.

## Risks / Open Questions

- **Existing `password_reset_tokens` rows** from the old flow (32-char URL tokens) become
  unconfirmable after this change (their hashes won't match a 6-digit lookup) — acceptable: tokens
  are 15-min TTL and this is a dev/v1 system; the migration only adds a column (no data rewrite).
- **`app.frontend.base-url`**: verify no other consumer before removing the constructor arg (grep);
  if used elsewhere (e.g. future email links), keep the property and only drop the reset usage.
- **Test fakes**: `InMemoryPasswordResetTokenRepository` and any `PasswordResetServiceTest` setup
  must gain the attempts field/delete-active method; expect mechanical updates.
- **Backend email for live E2E**: reset codes go via `SmtpSender`; with `MAIL_PROVIDER=smtp-pulse`
  they reach a real relay (not the log). For the manual check either temporarily use the dev
  sender (restore after — M1 precedent) or exercise the API with a fake; report exactly what was
  verified.
