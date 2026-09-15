# OpenShelter — Security Checklist (implemented controls, with evidence)

Read-only QA pass, 2026-07-08. Every claim cites `file:line` in the current tree.
Secrets are referenced by **env-var name only** — no values. Verdicts: **implemented** / **partial** / **missing**.

Legend for paths: backend = `src/main/java/ee/sheltermap/`, frontend = `frontend/src/app/`, config = `src/main/resources/`.

---

## 1. Password hashing — Argon2

**Status: IMPLEMENTED**

- Argon2id via Spring Security: `config/SecurityConfig.java:61-64` — `PasswordEncoder passwordEncoder()` returns `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`.
- Hasher seam: `auth/Argon2PasswordHasher.java:12-32` (null-safe verify, salt embedded in hash string — no salt column).
- Stored in `user_credentials.password_hash VARCHAR(255)` (`resources/db/migration/V1__schema.sql` — "Argon2id (salt embedded in hash)").
- Timing-equalization dummy verify so unknown vs known contacts cost one hash each: `auth/AuthService.java:33` (javadoc), proven by `test/auth/AuthServiceTest.loginRunsExactlyOneHashVerificationForUnknownAndKnownContacts`.
- Admin seeded with the same hasher: `test/auth/AdminSeederTest.aPasswordChangeByTheAdminSurvivesARestart`.
- Tests: `test/auth/Argon2PasswordHasherTest` (7 cases incl. `hashesAreSaltedSoTwoHashesDiffer`).

## 2. PII at rest — AES-GCM + blind index

**Status: IMPLEMENTED** (rotation tooling not exercised — see note)

- AES-256-GCM envelope `v1:` + Base64URL(12-byte nonce ‖ ciphertext+tag): `security/PiiCrypto.java:43-73` (encrypt), decrypt `PiiCrypto.java:80-103` fails closed on non-envelope/foreign-version values.
- HMAC-SHA256 blind index, domain-separated (`users.email` / `users.phone`) + canonicalization (email lower/trim, phone E.164): `security/PiiCrypto.java:121-140` (`blindIndex`, `canonicalEmail`), constants `PiiCrypto.java:37-41`.
- Keys are 32-byte base64, env-only, validated at boot — app fails to start without them: `security/PiiKeys.java:32-60` (`PII_AES_KEY`, `PII_HMAC_KEY`; see `config/application.yml` `app.pii.aes-key` / `app.pii.hmac-key`).
- Schema conversion: `migration/V13PiiEncryptionMigration.java:81-104` — columns widened to VARCHAR(1024), `email_hash`/`phone_hash` VARCHAR(64) added, in-place re-encryption, plaintext unique indexes replaced with hash-based unique indexes; collision check fails loudly (`:95-96`).
- Login/lookup runs on the blind index (case-insensitive email, normalized phone): `test/security/PiiAtRestIT.loginResolvesByBlindIndexCaseInsensitiveEmailAndPhone`.
- Tests: `test/security/PiiCryptoTest` (11, incl. `decryptFailsClosedOnPlaintextOrForeignVersion`, `aTamperedEnvelopeFailsTheGcmTag`, `theBlindIndexIsDomainSeparated`, `missingKeyFailsClosedAtConstruction`), `test/security/PiiAtRestIT` (6, incl. V13 migration in-place + collision fail-loud).
- **Note (partial aspect)**: the `v1:` slot tag is the rotation hook (design D6), but no rotation migration has been run/shipped — key *change* procedure is documented in README, not automated. Marked implemented-for-storage, partial-for-rotation.

## 3. JWT access tokens + refresh rotation

**Status: IMPLEMENTED**

- Access = signed JWT (HS256, `sub=userId`, exp), refresh = opaque random token stored SHA-256-hashed: `auth/JwtTokenService.java:53-62` (issue), `JwtTokenService.java:67-96` (refresh), `persistence/RefreshTokenEntity` / `V1__schema.sql` `refresh_tokens.token_hash` ("SHA-256 hex, never plaintext").
- Rotation is single-use with row-lock: `JwtTokenService.java:76-89` — `revoke(tokenHash) == 0` ⇒ already claimed ⇒ reject; race proven in `test/auth/RefreshRotationRaceIT.concurrentDoubleRefreshRedeemsTheTokenExactlyOnce`.
- TTLs: access 15 m / refresh 30 d (`config/application.yml` `app.jwt.access-ttl` / `refresh-ttl`).
- Secret: `JWT_SECRET` env (dev default is published in-repo and **refused at boot outside dev/test profiles**, min 32 bytes): `config/ProdJwtGuard.java:38-66` (`DEV_DEFAULT_SECRET` check + `MIN_SECRET_BYTES`), tests `test/config/ProdJwtGuardTest` (6).
- Stateless filter: `config/JwtAuthenticationFilter.java` (registered in `SecurityConfig.java:191,215`), session policy `STATELESS` (`SecurityConfig.java:195`).
- Logout revokes the refresh row: `auth/JwtTokenService.java:98-103`; `test/auth/AuthApiIT.logoutRevokesRefreshToken`.
- Suspended users: refresh rotation refused, in-flight tokens die on next request: `test/api/UserSuspensionIT.inFlightTokensDieOnTheNextRequestAndTheRefreshRotationIsRefused`.
- FE: access token in-memory only, refresh in localStorage; 401 → single refresh + retry, then `/login?session=expired`: `frontend/src/app/core/api-interceptor.spec.ts`, `frontend/src/app/core/token-store.spec.ts`, `frontend/src/app/session/auth-store.spec.ts` (cross-tab rotation retry F4).

## 4. Rate limiting (OTP / submission / report / login / reset / geo)

**Status: IMPLEMENTED** (single-instance, in-memory — see partial note)

- Token-bucket primitive: `auth/TokenBucketRateLimiter.java`, tested in `test/auth/TokenBucketRateLimiterTest` (4).
- Per-endpoint buckets + config (`config/application.yml` `app.ratelimit.*`, `config/RateLimitProperties.java`):
  - login: per-(IP,contact) 5/burst + aggregate per-IP 20/burst (credential stuffing): beans `config/SecurityConfig.java:66-80`; `auth/AuthController.java:139-140`.
  - password-reset request 3 + confirm per-(IP,email) 5 (6-digit code anti-guess): `SecurityConfig.java:82-95`.
  - register 10/IP: `SecurityConfig.java:97-100`; verify (OTP) 10/IP: `SecurityConfig.java:107-110`, call site `auth/VerificationController.java:79-83`.
  - contact-change request 5/IP: `SecurityConfig.java:144-147`.
  - geo short-link resolve 5/IP/min (server-side fetch abuse valve): `SecurityConfig.java:154-157`, call site `api/LocationController.java:69`.
- Per-user/per-level OTP discipline: 60 s cooldown + 5 sends/UTC day (durable file log `VERIFICATION_SEND_LOG_PATH`): `auth/VerificationService.java:112,197-199` + `verification/FileVerificationSendLog.java`; tests `test/auth/VerificationThrottleIT`, `VerificationDailyCapIT`, `verification/FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly`.
- Per-contact cross-user OTP cap (5/24 h, Twilio/SMTP cost valve): `verification/RollingContactOtpLimiter.java`, wired `SecurityConfig.java:119-125`; tests `test/auth/OtpContactCapIT`, `verification/RollingContactOtpLimiterTest` (8).
- Shelter submissions: 10 active (409) + 5/24 h (429 + Retry-After) + 100 m near-duplicate (409): `app/ShelterService.java:124-152`; tests `test/api/ShelterDailyLimitIT`, `ShelterDuplicateIT`, `ShelterReportIT.eleventhActiveShelterIs409AndDeletingFreesTheCap`.
- Report throttle: 10 report-type actions/user/rolling hour (reports + occupancy re-PUTs; open-status taps excluded), durable `report_actions` log: `app/ShelterReportService.java:32-34,124,175,200`, config `REPORTS_MAX_ACTIONS_PER_HOUR:10`; tests `test/api/ReportThrottleIT` (5), `app/ShelterReportServiceTest`.
- Contact change: 60 s cooldown + 5 attempts with atomic increment: `auth/ContactChangeService.java:97-98,216-244`.
- 429 shape incl. `Retry-After` where meaningful: `api/ApiErrorHandler.java:280-346`.
- Client IP resolution honors `X-Forwarded-For` only for configured trusted proxies (`RATELIMIT_TRUSTED_PROXIES`, loopback switch): `auth/ClientIps.java`, `test/auth/ClientIpsTest` (13), `test/auth/AuthRateLimitIT.spoofedXffFromTrustedLoopbackYieldsSeparateBuckets`.
- **Partial note**: all buckets + the OTP limiter are in-memory (single-instance constraint documented in `SecurityConfig.java:131-132` W16) — limits do not share state across instances.

## 5. Security headers

**Status: IMPLEMENTED**

- Every response (success, 4xx/5xx, and the security 401/403 bodies): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `CSP: default-src 'self'`, HSTS only when `request.isSecure()`: `config/SecurityHeadersFilter.java:41-52`; registered **before** the JWT filter so headers survive auth failures: `config/SecurityConfig.java:186-215`.
- No cookies anywhere (JWT bearer only): asserted by `test/config/SecurityHeadersIT.aPublicResponseCarriesTheHardeningHeadersAndNoCookie`.
- IT coverage: `test/config/SecurityHeadersIT` (4: public, 401, 404/400, HSTS-on-secure-only).
- **Partial note**: the CSP is explicitly defense-in-depth on the API, not the UI's real policy (comment `SecurityHeadersFilter.java:23-25`) — the SPA document is served by the frontend host; HSTS preload is not claimed.

## 6. Fail-closed guards

**Status: IMPLEMENTED**

- PII keys: missing/blank/malformed/undersized `PII_AES_KEY`/`PII_HMAC_KEY` ⇒ boot failure: `security/PiiKeys.java:46-60`; test `test/security/PiiCryptoTest.missingKeyFailsClosedAtConstruction`, `malformedOrWrongSizedKeyFailsClosed`.
- JWT secret: prod-like profiles refuse the published dev default and <32-byte secrets: `config/ProdJwtGuard.java:52-66`; `test/config/ProdJwtGuardTest` (6).
- Dev diagnostic endpoints (`/dev/email-test`, `/dev/sms-test`) refused outside dev/test profiles, and disabled by default even in dev (`DEV_EMAIL_TEST_ENABLED:false`, `DEV_SMS_TEST_ENABLED:false`) with recipient allowlists (`DEV_EMAIL_TEST_ALLOWED_RECIPIENTS`, `DEV_SMS_TEST_ALLOWED_RECIPIENTS`, `allow-any:false`): `config/DevEndpointsGuard.java:41-58`, `config/application.yml`; tests `test/config/DevEndpointsGuardTest` (7), `test/api/EmailTestControllerAllowlistIT`, `SmsTestControllerAllowlistIT`.
- Dev senders (console log) refused in prod profiles — no accidental real sends or fake sends in the wrong env: `config/DevSenderGuard.java:41-66`; `test/config/DevSenderGuardTest` (5).
- PII decrypt fails closed (never a silent plaintext passthrough): `security/PiiCrypto.java:80-103`; test `decryptFailsClosedOnPlaintextOrForeignVersion`.
- V13 migration fails loudly on blind-index collisions: `migration/V13PiiEncryptionMigration.java:95-96`; `test/security/PiiAtRestIT.theV13MigrationFailsLoudlyOnCanonicalCollisions`.
- Health details hidden from anonymous probes: `config/application.yml` `show-details: when-authorized` (manual verification item in test-plan §20).

## 7. Authorization per role

**Status: IMPLEMENTED**

- Route policy: public allowlist is explicit; `/api/shelters/mine` requires auth while the rest of GET `/api/shelters/**` is public; all else authenticated (401/403 via entry point/denied handler): `config/SecurityConfig.java:196-213`.
- Verified-only write path: `user.canWrite()` check on submit (`api/ShelterController.java:139-141`), `requireVerifiedRegisteredUser()` on edit/delete/report/reply (`ShelterController.java:300+`), `requireRegistered` on open-status (`ShelterController.java:220` area); 403 vocabulary `NotVerifiedException` → `api/ApiErrorHandler.java:264-267`.
- Author-only mutations: `requireOwnedShelter` (USER source + created_by) → `NotAuthorException` 403: `api/ShelterController.java:296-304`; IT matrix `test/api/ShelterApiIT.putByNonAuthorIs403...`, `deleteOnRegistryAndLegacyRowsIs403ForEveryone...`.
- Admin: fresh per-request kind lookup (`AdminController.requireAdmin()`, D2 — frontend guard is UX only, comment `frontend/src/app/app.routes.ts` admin route); `AdminAccessException` → 403 (`ApiErrorHandler.java:264-267`); demotion effective on next request: `test/api/AdminModerationIT.aDemotionTakesEffectImmediatelyOnTheNextRequest`.
- Role matrix ITs: `test/security/AdminAuthorizationIT` (6: 401+headers for anonymous, 403 non-admin, env-admin reads, foreign writes 403), `test/api/UserSuspensionIT.aNonAdminCannotSeeOrActOnTheUserList`, `test/domain/UserHierarchyTest`, `test/domain/VerificationPolicyTest`.
- Admin-only data: reporter identity served from admin API only (`AdminController` javadoc, `api/CommunityReviewIT.theAuditLogIsAdminOnly`, info-request `ShelterInfoRequestIT.theExchangeNeverLeaksOnThePublicReads`).

## 8. Input validation

**Status: IMPLEMENTED**

- Bean Validation on request DTOs: e.g. `api/CreateShelterRequest.java:24-28` (`@NotBlank @Size(max=200)` name, `@DecimalMin(-90)/@DecimalMax(90)` lat, `@DecimalMin(-180)/@DecimalMax(180)` lng, `@Size(max=2000)` description, `@Min(1) @Max(100_000)` capacity); `auth/RegisterRequest.java:19-22` (`@NotBlank @Email @Size(max=255)` email, `@Size(max=64)` phone); create/update parity test `test/api/ShelterRequestConstraintParityTest`.
- `@Valid` on controller bodies; `MethodArgumentNotValidException` → 400 with field message: `api/ApiErrorHandler.java:67-73`.
- Domain sanity: Estonia bounding-box gate shared by create/update (`api/ShelterController.java:293-298` `requireInsideEstonia`); geo resolver re-validates every redirect hop before fetching (`app/LocationResolveService.java:18-57`); oversized DB violations → 400 (`ApiErrorHandler.java:212-215`); optimistic-lock conflicts → 409 (`ApiErrorHandler.java:224-247`, `test/api/ApiErrorHandlerTest` 5).
- Phone normalization never throws on garbage: `verification/PhoneNumbers.java`, `test/verification/PhoneNumbersTest` (7).
- FE inline validators mirror backend limits (maxlength pinned 255/64, 6-digit code, out-of-Estonia, out-of-range capacity): `test` in `frontend/src/app/features/account/account-page.spec.ts` (M6 boundary cases), `frontend/src/app/shared/location-input.spec.ts` (30 cases).
- **Partial note**: no password complexity policy — `@NotBlank` only (`RegisterRequest.java:22`, `PasswordResetConfirmRequest.java:14`); length ≥ 8 or character-class rules absent.

## 9. Anti-enumeration

**Status: IMPLEMENTED**

- Login: unknown contact and wrong password are indistinguishable (message + exactly one Argon2 verify): `auth/AuthService.java:33`, `test/auth/AuthApiIT.loginWithDummyPasswordIsIndistinguishableFromAWrongPassword`.
- Password reset request: unknown email returns the same 200 ack and sends nothing: `test/security/PasswordRecoveryFlowIT.unknownEmailRequestIsUniformAndSendsNothing`, `test/auth/AuthServiceTest.requestForUnknownEmailIsSilentSuccess`, `test/auth/AuthApiIT.requestResetForUnknownEmailReturnsTheSame200AsAKnownEmail`.
- Reset confirm: unknown email indistinguishable from wrong code: `test/auth/AuthApiIT.passwordResetConfirmForUnknownEmailIsIndistinguishableFromAWrongCode`.
- Uniform 404 shape for missing shelters incl. DTO shape parity across paths: `test/api/ShelterApiIT.getMissingShelterReturnsUniform404`, `errorShapeIsUniformAcrossAllPaths`.
- Geo resolver: one generic 400 (invalid input / no pair / outside Estonia) and one generic 502 for any upstream failure — "no enumeration, never a 500": `app/LocationResolveService.java:51-56`.
- Error envelope is uniform `ErrorResponse` (timestamp/status/reason/message/path): `api/ErrorResponse.java`, `api/ApiErrorHandler.java`; FE never echoes 5xx non-JSON bodies: `frontend/src/app/shared/error-copy.spec.ts` (N6).
- Codes/tokens stored hashed (6-digit OTP codes, reset codes, refresh tokens): `verification/EmailVerificationProviderTest.requestGeneratesTokenSendsItAndReturnsHashedExpiringPending`, `auth/PasswordResetServiceTest.requestStoresHashedCodeAndEmailsTheCodeNotALink`, `V1__schema.sql` (`token_hash` comments).

## 10. Supporting controls (CORS, SSRF, dev-surface, secrets hygiene)

**Status: IMPLEMENTED** (with noted partials)

- CORS allowlist via `CORS_ALLOWED_ORIGINS` (default local dev only), explicit methods, credentials on: `config/SecurityConfig.java:165-179`.
- SSRF-hardened short-link resolver: entry pinned to `maps.app.goo.gl` (http→https upgrade, userInfo stripped), ≤3 hops, per-hop re-validation (Google host set, default port, no scheme change), 10 s wall-clock budget, loopback/cloud-metadata hops never fetched: `app/LocationResolveService.java:18-57,66,115-140`; 28-case test `test/app/LocationResolveServiceTest`.
- Dev diagnostic senders off by default + allowlisted recipients: `config/application.yml` (`dev-email-test`/`dev-sms-test` blocks); ITs `EmailTestControllerIT/AllowlistIT`, `SmsTestControllerIT/AllowlistIT`.
- Secrets only via env vars (referenced names): `DB_URL/DB_USERNAME/DB_PASSWORD`, `SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD/SMTP_FROM`, `JWT_SECRET`, `PII_AES_KEY/PII_HMAC_KEY`, `ADMIN_EMAIL/ADMIN_PASSWORD`, `REGISTRY_BASE_URL/REGISTRY_OFFICIAL_URL`, `RATELIMIT_TRUSTED_PROXIES/RATELIMIT_TRUST_LOOPBACK`, `VERIFICATION_SEND_LOG_PATH`, `CONTACT_CHANGE_*`, `VERIFICATION_*`, `REPORTS_MAX_ACTIONS_PER_HOUR`, Twilio/SMTP provider switches (`MAIL_PROVIDER`, `SMS_PROVIDER`). A repo-root `.env` holds local values and is gitignored.
- Statelessness: no CSRF by design (no cookie sessions; bearer tokens only) — `csrf().disable()` at `config/SecurityConfig.java:193` is a consequence of `STATELESS` + Bearer-only transport.
- **Partial notes**: (a) JWT is HS256 symmetric — acceptable at single-service scale, secret managed via env; (b) no durable audit trail for auth/security events (login failures, 429s) — the admin alert ring is in-memory and cleared on restart (`SecurityConfig.java:128-138` W16); `moderation_actions` covers moderation only; (c) Smart-ID verification is a deliberate v1 stub returning 400 (`verification/SmartIdVerificationProvider.java`, `auth/VerificationController.java:88-93`).

---

### Summary table

| # | Control | Verdict |
|---|---|---|
| 1 | Argon2 password hashing | implemented |
| 2 | AES-GCM PII encryption + blind index | implemented (rotation not yet automated — partial on rotation) |
| 3 | JWT access + refresh rotation (single-use, row-locked) | implemented |
| 4 | Rate limits (OTP/submission/report/login/reset/geo) | implemented (in-memory, single instance — partial for horizontal scale) |
| 5 | Security headers (+HSTS on secure, no cookies) | implemented (UI CSP lives at frontend host — by design) |
| 6 | Fail-closed guards (PII keys, JWT secret, dev senders, dev endpoints) | implemented |
| 7 | Authorization per role (guest/registered/verified/author/admin) | implemented |
| 8 | Input validation (BE + FE) | implemented (no password complexity policy — partial) |
| 9 | Anti-enumeration | implemented |
| 10 | CORS/SSRF/dev-surface/secrets hygiene | implemented (no durable auth-event audit; Smart-ID stub — partial) |
