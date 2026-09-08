# Context — Auth (password login + JWT + password reset)

**Source diagram:** `docs/uml/03-auth.puml`
**Used by steps:** 4 (create), with Spring Security wiring.
**Depends on contracts from:** `app.UserService`, `domain.RegisteredUser`, `verification.SmtpSender`
(shown in the puml as "referenced from 01 — contracts only").

## Purpose

Three concerns, three services — **never one blob**:

1. **Verification** (01) = prove you own a contact → claims.
2. **Authentication** (this context) = prove you are the same person at login → password + tokens.
3. **Password reset** (this context) = recover auth via the **verified** email.

## Classes to create (all in `ee.sheltermap.auth`)

| Type | Kind | Key members / notes |
|---|---|---|
| `UserCredentials` | class | `userId: Long, passwordHash: String, createdAt, changedAt`; ctor `(userId, passwordHash)`. **Separate aggregate from `RegisteredUser`** — profile PII and secrets live apart. Argon2id embeds the salt in the hash string (no salt column). |
| `PasswordResetToken` | class | `id, userId, tokenHash, expiresAt (15 min), usedAt, attempts (int, default 0, max 5)`. Stored 6-digit code is hashed (SHA-256) + single-use + attempt-limited (brute-force guard, V6). |
| `PasswordHasher` | interface | `hash(plain: String): String`, `verify(plain: String, hash: String): boolean`. |
| `Argon2PasswordHasher` | class | Impl using `Argon2PasswordEncoder` (spring-security-crypto). |
| `TokenService` | interface | `issue(user: RegisteredUser): TokenResponse`, `refresh(refreshToken: String): TokenResponse`, `revoke(refreshToken: String): void`. |
| `JwtTokenService` | class | Impl — jjwt. Access = JWT 15 min stateless signed (`sub` = userId, `exp`); refresh = 30 days, stored **hashed** → revocable. |
| `RefreshTokenRepository` | interface | `save(tokenHash, userId, expiresAt): void`, `findByTokenHash(tokenHash): RefreshTokenRecord`, `revoke(tokenHash): void`, `revokeAllForUser(userId): void`. |
| `RefreshTokenRecord` | record | `userId, tokenHash, expiresAt, revokedAt`. |
| `UserCredentialsRepository` | interface | `save(credentials): void`, `findByUserId(userId): UserCredentials`, `updateHash(userId, newHash): void`. |
| `PasswordResetTokenRepository` | interface | `save(token): void`, `findByTokenHash(tokenHash): PasswordResetToken`, `findActiveByUserId(userId, now): PasswordResetToken` (the user's single active code), `deleteActiveByUserId(userId, now): void` (one active code per user), `markUsed(id): void`. |
| `AuthService` | class | `register(RegisterRequest): void`, `login(LoginRequest): TokenResponse`, `refresh(RefreshRequest): TokenResponse`, `logout(refreshToken): void`, `requestPasswordReset(email): void`, `resetPassword(email, code, newPassword): void`. Register pre-checks email + phone and rejects duplicates with `DuplicateAccountException` → 409 (V3 unique indexes as race-safe backstop). |
| `PasswordResetService` | class | `requestReset(email): void`, `reset(email, code, newPassword): boolean`. |
| `RateLimiter` | interface | `tryAcquire(key: String): boolean`. |
| `TokenBucketRateLimiter` | class | Token-bucket impl (SDI Ch 4). |
| `AuthController` | class | Thin shell — `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password-reset/request`, `/auth/password-reset/confirm`. |
| `AccountService` | class | Account surface: `profile(user): MeResponse` (real profile + real claim set) and `updateProfile(user, ProfileUpdateRequest): MeResponse` (current-password verified against the Argon2 hash BEFORE any write — wrong → 401, nothing updated). |
| DTO records | records | `RegisterRequest {name, email, phone, nationalIdCode, password}`, `LoginRequest {emailOrPhone, password}`, `RefreshRequest {refreshToken}`, `TokenResponse {accessToken, refreshToken, expiresIn}`, `PasswordResetRequest {email}`, `PasswordResetConfirmRequest {email, code, newPassword}`, `MeResponse {name, email, phone, nationalIdCode, levels}`, `ProfileUpdateRequest {name, nationalIdCode, currentPassword}` (validations mirror registration exactly — `@NotBlank` only, no checksum). |

`UserService` gains (contract only, implemented in the app package): `findByEmailOrPhone(contact):
RegisteredUser`, `findByEmail(email): RegisteredUser`, `findByPhone(phone): RegisteredUser`
(duplicate-registration pre-check — hardening).

## Design decisions (from the puml notes — do not silently change)

1. **Login by email or phone** (`emailOrPhone`) — the user logs in with whichever contact they
   registered. Password is verified against `UserCredentials.passwordHash`.
2. **Generic login errors.** "invalid credentials" for both unknown user and wrong password —
   never reveal which. Prevents user enumeration.
3. **Reset flow (emailed 6-digit code — `password-reset-email-code`):**
   1. `requestReset(email)` → 6-digit numeric code (same `sixDigitCode()` generator as
      contact-change) →
   2. delete any prior active code for the user (one active code per user — a second
      request invalidates the first) →
   3. store `{tokenHash = SHA-256(code), expiresAt=15min, usedAt, attempts=0}` (hashed,
      single-use, 5-attempt brute-force limit — V6 `attempts` column) →
   4. **always respond success** ("if the account exists, we sent an email") →
   5. send `"Shelter Map password reset code: NNNNNN (valid 15 min)"` via `SmtpSender`
      (no URL link — no `app.frontend.base-url` / `FRONTEND_BASE_URL` anymore) →
   6. `reset(email, code, newPwd)` → find the account's active code (lookup via the
      request e-mail) → verify attempts < 5 + hash (constant-time) + expiry + unused →
      hash new password → update `UserCredentials` → mark code used → revoke all
      refresh tokens — **all in ONE transaction** (hardening: previously three separate
      transactions; a mid-way failure could leave the code replayable). ANY failure
      (unknown email / no active code / over-limit / wrong / expired / used) → 400 with
      ONE generic message ("invalid or expired reset code") — never which check failed.
4. **Two-token session model (SDI Ch 7 style):** access = JWT 15 min stateless; refresh = 30 days
   stored hashed → revocable (logout, reset, compromise). `JwtTokenService` owns signing/validation.
5. **Rate limiting (SDI Ch 4, token bucket):** `AuthController` guards `/auth/login`,
   `/auth/password-reset/request` **and `/auth/register`** (account-spam vector). Keys are
   per real client IP + contact: `X-Forwarded-For` is honored ONLY from configured trusted
   proxies (`app.ratelimit.trusted-proxies`) — otherwise every user behind a reverse proxy
   would share one bucket (hardening).
6. **Controllers are thin shells.** No logic in `AuthController`.

## Cross-channel contact change (email <-> phone)

`AccountController` + `ContactChangeService` add four JWT-gated endpoints:

| Endpoint | Verifies via | Sends to |
|---|---|---|
| `POST /account/email-change/request` → `/confirm` | SMS code | **current phone** |
| `POST /account/phone-change/request` → `/confirm` | email code | **current email** |

**Rationale (product decision):** stealing only one channel is not enough to hijack an
account — an attacker who holds the email cannot change it (needs the phone), and one who
holds the phone cannot change it (needs the email).

**Discipline (mirrors verification):**
- `PendingContactChange` — one per (user, type), code hashed (SHA-256) at rest, 15-min TTL,
  5-attempt limit. A new request replaces the old (unique `(user_id, type)`).
- Resend cooldown anchored on the pending row (`app.contact-change.cooldown-seconds`, 60 s).
- Duplicate target → 409 (`DuplicateAccountException`); same-as-current / no pending /
  wrong code → 400 (`InvalidContactChangeException`); cooldown → 429
  (`VerificationThrottledException`).
- Request endpoints are per-IP rate-limited (`changeRequestRateLimiter`,
  `app.ratelimit.change-capacity`/`change-refill-per-second`), like login/register.
- `RegisteredUser.changeEmail`/`changePhone` are the only mutation entry points; the change
  is persisted by `JpaUserRepository.save` (claim set is preserved — see the bulk-delete note
  below).

**Persistence note (latent bug fixed while adding this):** `SpringDataVerificationClaimRepository
.deleteByUserId` was a Spring Data *derived* delete, which queues `EntityManager.remove`; since
Hibernate flushes INSERTs before DELETEs, re-saving a user who already had an active claim
violated the V3 unique index `uq_verification_claims_user_level_active`. It is now a bulk
`@Modifying @Query` delete that runs immediately in SQL.

## Account profile (GET /account/me + PUT /account/profile)

`AccountController` also hosts the profile surface (JWT-gated, user resolved from the token):

| Endpoint | Behavior |
|---|---|
| `GET /account/me` | 200 + `MeResponse {name, email, phone, nationalIdCode, levels}` — the REAL profile and the REAL verified claim set (levels in enum order). The frontend's single source of truth (replaces its session-only optimistic mirror). 401 unauthenticated. |
| `PUT /account/profile` | Body `{name, nationalIdCode, currentPassword}` — verifies the current password against the stored Argon2 hash BEFORE any update (wrong → 401 `InvalidProfilePasswordException`, message "current password is incorrect", nothing written); validates name/nationalIdCode exactly like registration (`@NotBlank` — blank → 400, no checksum, values stored as given); persists via `RegisteredUser.changeName`/`changeNationalIdCode` + `JpaUserRepository.save`; returns the fresh `MeResponse`. 401 unauthenticated. |

**Decisions:** identity fields have no cross-channel second factor, so current-password
possession is the v1 gate for name/ID edits (email/phone stay on the cross-channel flows).
Updating the national ID does NOT clear or add verification claims — SMART-ID is a stub; when it
lands, a code change must invalidate any pending/active SMART-ID claim (documented follow-up in
`AccountService`). Both endpoints are cheap (no code issuance) and need no rate bucket.

## Spring Security wiring (Step 4)

- `SecurityFilterChain`: `permitAll` on `POST /auth/register`, `/auth/login`,
  `/auth/password-reset/**`, and the public shelter/review GET endpoints; everything else
  authenticated via a JWT filter that parses the access token and sets the `Authentication`.
- The JWT filter is the Spring-side implementation of `JwtTokenService` validation.
- `PasswordEncoder` bean = `Argon2PasswordEncoder` (used by `Argon2PasswordHasher`).

## Testing notes

- `Argon2PasswordHasher`: hash ≠ plaintext; `verify` true/false; two hashes of same plaintext
  differ (random salt).
- `AuthService.login`: wrong password → generic error; unknown user → generic error; success →
  `TokenResponse`; refresh rotates (old refresh revoked, new pair issued); logout revokes;
  `resetPassword` revokes all sessions.
- `PasswordResetService`: request for unknown email still "succeeds" (no enumeration);
  second request invalidates the first code (one active per user); a wrong code records
  an attempt and 5 wrong codes lock the code out even when the right one follows later;
  expired/used code fails; code is stored hashed; every failure mode is one generic 400.
- `TokenBucketRateLimiter`: allows up to N, then denies until refill (injectable clock for tests).

- `ContactChangeService`: email-change request sends an SMS to the current phone (cross-channel);
  phone-change request sends an email to the current email; correct code updates the contact and
  deletes the pending row; wrong code increments attempts (5 → "too many attempts"); duplicate
  target → `DuplicateAccountException`; same-as-current → `InvalidContactChangeException`; resend
  within cooldown → `VerificationThrottledException`.

- `AccountControllerIT` (profile surface): `GET /account/me` returns the stored profile + the REAL
  claim set (seeded claims come back; none → empty list); unauthenticated → 401. `PUT
  /account/profile`: happy path persists + returns the fresh profile; wrong current password → 401
  "current password is incorrect" with nothing updated; blank name / nationalIdCode → 400;
  unauthenticated → 401; an ID change leaves verification claims intact.
