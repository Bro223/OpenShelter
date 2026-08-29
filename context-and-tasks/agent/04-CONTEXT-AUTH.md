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
| `PasswordResetToken` | class | `id, userId, tokenHash, expiresAt (15 min), usedAt`. Hashed + single-use. |
| `PasswordHasher` | interface | `hash(plain: String): String`, `verify(plain: String, hash: String): boolean`. |
| `Argon2PasswordHasher` | class | Impl using `Argon2PasswordEncoder` (spring-security-crypto). |
| `TokenService` | interface | `issue(user: RegisteredUser): TokenResponse`, `refresh(refreshToken: String): TokenResponse`, `revoke(refreshToken: String): void`. |
| `JwtTokenService` | class | Impl — jjwt. Access = JWT 15 min stateless signed (`sub` = userId, `exp`); refresh = 30 days, stored **hashed** → revocable. |
| `RefreshTokenRepository` | interface | `save(tokenHash, userId, expiresAt): void`, `findByTokenHash(tokenHash): RefreshTokenRecord`, `revoke(tokenHash): void`, `revokeAllForUser(userId): void`. |
| `RefreshTokenRecord` | record | `userId, tokenHash, expiresAt, revokedAt`. |
| `UserCredentialsRepository` | interface | `save(credentials): void`, `findByUserId(userId): UserCredentials`, `updateHash(userId, newHash): void`. |
| `PasswordResetTokenRepository` | interface | `save(token): void`, `findByTokenHash(tokenHash): PasswordResetToken`, `markUsed(id): void`. |
| `AuthService` | class | `register(RegisterRequest): void`, `login(LoginRequest): TokenResponse`, `refresh(RefreshRequest): TokenResponse`, `logout(refreshToken): void`, `requestPasswordReset(email): void`, `resetPassword(token, newPassword): void`. |
| `PasswordResetService` | class | `requestReset(email): void`, `reset(token, newPassword): boolean`. |
| `RateLimiter` | interface | `tryAcquire(key: String): boolean`. |
| `TokenBucketRateLimiter` | class | Token-bucket impl (SDI Ch 4). |
| `AuthController` | class | Thin shell — `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password-reset/request`, `/auth/password-reset/confirm`. |
| DTO records | records | `RegisterRequest {name, email, phone, nationalIdCode, password}`, `LoginRequest {emailOrPhone, password}`, `RefreshRequest {refreshToken}`, `TokenResponse {accessToken, refreshToken, expiresIn}`, `PasswordResetRequest {email}`, `PasswordResetConfirmRequest {token, newPassword}`. |

`UserService` gains (contract only, implemented in the app package): `findByEmailOrPhone(contact):
RegisteredUser`, `findByEmail(email): RegisteredUser`.

## Design decisions (from the puml notes — do not silently change)

1. **Login by email or phone** (`emailOrPhone`) — the user logs in with whichever contact they
   registered. Password is verified against `UserCredentials.passwordHash`.
2. **Generic login errors.** "invalid credentials" for both unknown user and wrong password —
   never reveal which. Prevents user enumeration.
3. **Reset flow:**
   1. `requestReset(email)` → 32-char random token (in URL, not OTP) →
   2. store `{tokenHash, expiresAt=15min, usedAt}` (hashed, single-use) →
   3. send `https://app/reset?token=…` via `SmtpSender` →
   4. **always respond success** ("if the account exists, we sent an email") →
   5. `reset(token, newPwd)` → verify hash + expiry + unused → hash new password → update
      `UserCredentials` → mark token used →
   6. `AuthService` then **revokes all refresh tokens** for that user (old sessions die on reset).
4. **Two-token session model (SDI Ch 7 style):** access = JWT 15 min stateless; refresh = 30 days
   stored hashed → revocable (logout, reset, compromise). `JwtTokenService` owns signing/validation.
5. **Rate limiting (SDI Ch 4, token bucket):** `AuthController` guards `/auth/login` and
   `/auth/password-reset/request` (per IP + per email/phone key).
6. **Controllers are thin shells.** No logic in `AuthController`.

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
- `PasswordResetService`: request for unknown email still "succeeds" (no enumeration); token
  single-use (second reset with same token fails); expired token fails; token is stored hashed.
- `TokenBucketRateLimiter`: allows up to N, then denies until refill (injectable clock for tests).
