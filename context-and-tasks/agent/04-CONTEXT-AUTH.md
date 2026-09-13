# Context — Auth (password login + JWT + password reset)

**Source diagram:** `../03-auth.puml`
**Used by steps:** 4 (create), with Spring Security wiring.
**Depends on contracts from:** `app.UserService`, `domain.RegisteredUser`, `verification.SmtpSender`
(shown in the puml as "referenced from 01 — contracts only").

## Purpose

Three concerns, three services — **never one blob**:

1. **Verification** (01) = prove you own a contact → claims.
2. **Authentication** (this context) = prove you are the same person at login → password + tokens.
3. **Password reset** (this context) = recover auth via the **verified** email.

Plus one **startup job** (admin-moderation D1): the `AdminSeeder` provisions the single
admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD` — see the seeder section below. The admin
logs in through the normal `POST /auth/login`; nothing here is admin-specific.

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
| `AuthService` | class | `register(RegisterRequest): void`, `login(LoginRequest): TokenResponse`, `refresh(RefreshRequest): TokenResponse`, `logout(refreshToken): void`, `requestPasswordReset(email): void`, `resetPassword(email, code, newPassword): void`. Register pre-checks email + phone and rejects duplicates with `DuplicateAccountException` → 409 (race-safe backstop: the V13 UNIQUE indexes on the blind hashes `email_hash` / `phone_hash` — the `email`/`phone` columns hold ciphertext, PII-at-rest M2). |
| `PasswordResetService` | class | `requestReset(email): void`, `reset(email, code, newPassword): boolean`. **2026-09-08 hardening:** re-issues are throttled per user — 60 s rotation cooldown and a per-UTC-day cap of 5 (`REISSUE_COOLDOWN` / `MAX_REISSUES_PER_UTC_DAY`); a skipped re-issue is a silent no-op (still 200 — anti-enumeration preserved). |
| `RateLimiter` | interface | `tryAcquire(key: String): boolean`. |
| `TokenBucketRateLimiter` | class | Token-bucket impl (SDI Ch 4). **Single-instance per bucket set** (in-memory `Map` of buckets) — the app is a single instance; do not run the limiter across instances without a shared store. |
| `ClientIps` | class | Static helper resolving the real client IP for rate-limit keys. Trust is explicit and hop-by-hop: if the direct peer is not a configured trusted proxy (and not a trusted loopback), `X-Forwarded-For` is **ignored entirely** (an untrusted client can set it freely) and the peer address is the key; if the peer is trusted, XFF is walked **right-to-left**, peeling trusted hops until the first non-trusted entry — the real client (fully-trusted chain → leftmost non-empty entry). `trustLoopback` (default `true`, `app.ratelimit.trust-loopback`) covers a local nginx. |
| `Codes` | class | Package-private shared generator for the auth code flows: `sixDigitCode()` (leading zeros preserved) + `randomToken(length, alphabet)`, one `SecureRandom`. Used by the password-reset and contact-change services and by `Tokens`. The verification package keeps its own channel-specific generators on purpose (dependency rule: verification must not import auth). |
| `Hashes` | class | Package-private SHA-256 helpers for tokens-at-rest: `sha256Hex` + `constantTimeEquals` (W9 — `MessageDigest.isEqual`, no early exit) used for **every** stored-vs-presented code/token hash compare (reset code, refresh token, contact-change code). |
| `AuthController` | class | Thin shell — `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password-reset/request`, `/auth/password-reset/confirm`. |
| `AccountService` | class | Account surface: `profile(user): MeResponse` (real profile + real claim set + `isAdmin` — true iff the freshly loaded user's kind is `ADMIN`, never a token claim) and `updateProfile(user, ProfileUpdateRequest): MeResponse` (current-password verified against the Argon2 hash BEFORE any write — wrong → 401, nothing updated). |
| `AdminSeeder` | class | The env-provisioned admin (admin-moderation D1): an `ApplicationRunner` — runs ONCE at startup, transactional. **Create-if-absent, the whole contract:** (1) either `app.admin.email`/`app.admin.password` blank → no-op, no admin exists; (2) a user with that email ALREADY exists (any kind, case-insensitive lookup) → no-op — the seeder NEVER re-hashes, flips kind or touches claims; (3) otherwise create: `AdminUser.provisioned("Admin", email, "")` (kind `ADMIN`, no phone, every verification claim pre-set so `canWrite()` is true without the email/SMS flow) + `UserCredentials` with the Argon2 hash of `ADMIN_PASSWORD` (the same `PasswordHasher` registration uses). Env: `app.admin.email: ${ADMIN_EMAIL:}` / `app.admin.password: ${ADMIN_PASSWORD:}` (bare names, empty defaults — no values committed). |
| DTO records | records | `RegisterRequest {name, email, phone, password} (no national ID code is collected — remove-national-id M1)`, `LoginRequest {emailOrPhone, password}`, `RefreshRequest {refreshToken}`, `TokenResponse {accessToken, refreshToken, expiresIn}`, `PasswordResetRequest {email}`, `PasswordResetConfirmRequest {email, code, newPassword}`, `MeResponse {name, email, phone, levels, isAdmin}` (admin-moderation D2: `isAdmin` always present — `true` only for the ADMIN-kind account), `ProfileUpdateRequest {name, currentPassword}` (validations mirror registration exactly — `@NotBlank` only, no checksum). No national ID code is collected or stored anywhere (remove-national-id M1). |

`UserService` gains (contract only, implemented in the app package): `findByEmailOrPhone(contact):
RegisteredUser`, `findByEmail(email): RegisteredUser`, `findByPhone(phone): RegisteredUser`
(duplicate-registration pre-check — hardening).

**PII at rest (M2 — `pii-at-rest`):** the auth storage boundary is now encrypted.
`users.email` / `users.phone` (plus the pending-*`contact`/`target` copy columns and the
claim `external_ref`) store a `v1:` AES-256-GCM envelope; `users.email_hash` /
`users.phone_hash` hold the domain-separated HMAC-SHA256 blind index of the canonical
value (e-mail lower-cased + trimmed, phone E.164) and are what every lookup and the
UNIQUE duplicate backstop run on. The crypto lives ONLY in the persistence layer
(`ee.sheltermap.security.PiiCrypto`, applied by `UserMapper` + the pending-* JPA
repositories) — `AuthService`/`AccountService`/`AdminSeeder` and the DTOs above keep
their plaintext contracts. Keys: `PII_AES_KEY` / `PII_HMAC_KEY` (32-byte base64,
env-only, fail-closed at boot, never committed, never logged). Full design:
`openspec/changes/pii-at-rest/design.md`.

## Design decisions (from the puml notes — do not silently change)

1. **Login by email or phone** (`emailOrPhone`) — the user logs in with whichever contact they
   registered. Password is verified against `UserCredentials.passwordHash`.
2. **Generic login errors.** "invalid credentials" for both unknown user and wrong password —
   never reveal which. Prevents user enumeration.
3. **Reset flow (emailed 6-digit code — `password-reset-email-code`):**
   1. `requestReset(email)` → 6-digit numeric code (the shared `Codes.sixDigitCode()` helper —
      literally the same generator contact-change uses; verification keeps its own channel-specific
      codes per the dependency rule) → **per-user re-issue throttle** (60 s cooldown since the
      latest issue, max 5 per UTC day — either hit → silent no-op, still 200) →
   2. delete any prior active code for the user (one active code per user — a second
      request invalidates the first) →
   3. store `{tokenHash = SHA-256(code), expiresAt=15min, usedAt, attempts=0}` (hashed,
      single-use, 5-attempt brute-force limit — V6 `attempts` column) →
   4. **always respond success** ("if the account exists, we sent an email") →
   5. send `"OpenShelter password reset code: NNNNNN (valid 15 min)"` via `SmtpSender`
      (`AppInfo.APP_DISPLAY_NAME + " password reset code: ..."` — no URL link — no
      `app.frontend.base-url` / `FRONTEND_BASE_URL` anymore) →
   6. `reset(email, code, newPwd)` → find the account's active code (lookup via the
      request e-mail) → verify attempts < 5 + hash (`Hashes.constantTimeEquals`) + expiry + unused →
      hash new password → update `UserCredentials` → mark code used → revoke all
      refresh tokens — **all in ONE transaction** (hardening: previously three separate
      transactions; a mid-way failure could leave the code replayable). ANY failure
      (unknown email / no active code / over-limit / wrong / expired / used) → 400 with
      ONE generic message ("invalid or expired reset code") — never which check failed.
4. **Two-token session model (SDI Ch 7 style):** access = JWT 15 min stateless; refresh = 30 days
   stored hashed → revocable (logout, reset, compromise). `JwtTokenService` owns signing/validation.
5. **Rate limiting (SDI Ch 4, token bucket, 2026-09-08 hardened):** five buckets, all keyed on
   the real client IP resolved by `ClientIps` (XFF honored only from trusted proxies, peeled
   right-to-left — a spoofed XFF from an untrusted peer is ignored):
   - `/auth/login` — **two** buckets, both must pass: per-(IP, contact) with a **normalized
     contact key** (e-mail trimmed+lowercased; phone-like value E.164-normalized via
     `PhoneNumbers` then lowercased, so `50000001` and `+37250000001` share a bucket — same
     canonical identity as the lookup) **plus** a per-IP aggregate bucket (anti
     credential-stuffing: one IP hammering many accounts). 5/0.084 per contact, 20/0.334 per IP.
   - `/auth/password-reset/request` — per-(IP, normalized e-mail) bucket (3/0.05) **plus** the
     per-user 60 s cooldown / 5-per-UTC-day cap inside `PasswordResetService`.
   - `/auth/password-reset/confirm` — its own per-(IP, e-mail) anti-guess bucket (5/0.084) —
     a 6-digit code must not be brute-forceable through confirm.
   - `/auth/register` — per client IP (account-spam vector), 10/0.01.
   All capacities/refills configurable under `app.ratelimit.*`.
6. **Controllers are thin shells.** No logic in `AuthController`.
7. **The admin comes from env, not from the registration flow (admin-moderation D1).** Two env
   vars following the repo convention (`DB_URL`, `SMTP_HOST`, `CORS_ALLOWED_ORIGINS` — bare names,
   empty defaults): `ADMIN_EMAIL` and `ADMIN_PASSWORD`. **Either unset → no admin exists** — no
   user is created, `/admin/*` answers 403 for everyone (including a normal account that happens
   to hold the email string — kind is the truth), and the app behaves exactly as if the capability
   were absent (dev boxes without the vars keep working; prod is opt-in). **Both set + no user
   with that email → create** the ADMIN-kind account (all claims pre-set, Argon2 via the standard
   encoder). **A user with that email already exists → do nothing** (create-if-absent; the check
   is case-insensitive) — an in-app password change by the admin survives restarts and
   deployments, and a normal account holding the email string stays a normal account.
   **Login is the normal `POST /auth/login`** (emailOrPhone + password) — no dedicated endpoint,
   no backdoor path; the JWT has the same shape as every other user's (principal = userId,
   **NO role claim** — D2: `/admin/*` authorizes by a fresh `UserKind.ADMIN` lookup per request,
   so a demotion takes effect on the very next request even with a still-valid token).

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
| `GET /account/me` | 200 + `MeResponse {name, email, phone, levels, isAdmin}` — the REAL profile (no national ID code — M1), the REAL verified claim set (levels in enum order) and `isAdmin` (admin-moderation D2: always present; the freshly loaded user's KIND — true only for the ADMIN-kind row, never a token claim; the frontend's gate for the admin nav item and the `/admin` route). The frontend's single source of truth (replaces its session-only optimistic mirror). 401 unauthenticated. |
| `PUT /account/profile` | Body `{name, currentPassword}` — verifies the current password against the stored Argon2 hash BEFORE any update (wrong → 401 `InvalidProfilePasswordException`, message "current password is incorrect", nothing written); validates the name exactly like registration (`@NotBlank` — blank → 400, value stored as given); persists via `RegisteredUser.changeName` + `JpaUserRepository.save`; returns the fresh `MeResponse`. No national ID code is collected or editable (remove-national-id M1). 401 unauthenticated. |

**Decisions:** the name edit has no cross-channel second factor, so current-password
possession is the v1 gate (email/phone stay on the cross-channel flows). Both endpoints are
cheap (no code issuance) and need no rate bucket. No national ID code is collected or
editable (remove-national-id M1) — when SMART-ID lands, its claim will carry the external
reference from the PKI flow; nothing stored here is invalidated by any profile edit.
`GET /account/me` carries **`isAdmin`** (admin-moderation D2): the frontend gates the admin
route and the admin-only nav item on it — it is the freshly loaded user's KIND (true iff
ADMIN), never derived from any token claim.

## Spring Security wiring (Step 4)

- `SecurityFilterChain` — the exact `permitAll` set (nothing else is open): `POST
  /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, plus
  `GET /api/shelters/**` **except** `GET /api/shelters/mine` (author-scoped, authenticated)
  and `GET /actuator/health` + `/actuator/info`. Everything else (all `/account/**`,
  `/verify/**`, `/admin/**`, shelter/review writes, review `/mine` routes) requires the JWT.
  `/admin/**` (admin-moderation) sits in the authenticated set — the security entry point
  answers 401 for anonymous callers; the controller's own fresh `isAdmin` lookup then answers
  403 for an authenticated non-admin (D2).
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
  claim set (seeded claims come back; none → empty list) + `isAdmin` (false for registered users,
  true for the ADMIN-kind row); unauthenticated → 401. `PUT
  /account/profile`: happy path persists + returns the fresh profile; wrong current password → 401
  "current password is incorrect" with nothing updated; blank name → 400;
  unauthenticated → 401; a name change leaves verification claims intact.

- `AdminSeederTest` + `AdminSeederIT` (admin-moderation D1): both vars set + no user with the
  email → the admin row is created (kind `ADMIN`, all three claims present, `canWrite()` true)
  and logs in through the normal `/auth/login` with NO verification step (wrong password still
  401); a second run changes NOTHING (hash, kind and claims untouched — a password changed in-app
  survives a restart); a pre-existing user with the same email (any kind, case variant included)
  is never touched; either var empty → no-op, no admin exists.
