# Build Plan — Steps 0–6

**Rule (from `01-TASK.md`):** execute **one step per run**. After each step: tests green, report
files created + how to verify manually, then **STOP and wait for the human to review**.

Each step lists its **inputs** (puml + context files to read), **deliverables**, **key decisions**,
**acceptance criteria** (must all pass), and a **manual review checklist** for the human.

---

## Step 0 — Project skeleton

**Inputs:** `01-TASK.md` (sections 2 & 4 only).

**Deliverables**
- Maven project (`pom.xml`): Java 21, Spring Boot 3.3.x, starters (web, validation, data-jpa,
  security, actuator), Flyway, PostgreSQL driver, jjwt 0.12.x, spring-security-crypto,
  Testcontainers, JUnit 5.
- Package directories: `ee.sheltermap.{domain,app,verification,auth,ingestion,api,persistence,config}`.
- `docker-compose.yml` (PostgreSQL 16), `application.yml` (datasource, JPA ddl-auto=validate,
  Flyway enabled), `.gitignore`, `README.md`.
- Empty `SecurityFilterChain` config placeholder + `main` application class (no endpoints yet).

**Acceptance**
- `mvn -q compile` passes.
- `docker compose up -d` starts Postgres; `mvn spring-boot:run` boots and actuator
  `/actuator/health` returns UP.

**Manual review:** pom dependencies, compose file, config — approve before Step 1.

**STOP — wait for review.**

---

## Step 1 — Domain core

**Inputs:** `01-user-verification.puml` (package `domain`), `02-CONTEXT-DOMAIN.md`.

**Deliverables** — pure Java, no Spring annotations (persistence mapping is decided in Step 3):
`User` (abstract), `GuestUser`, `RegisteredUser`, `UserData` (record),
`VerificationLevel` (enum), `VerificationClaim`, `VerificationPolicy`, `VerificationRules`
(record, `ofDefaults()`), `Capability` (enum), `Shelter`, `ShelterStatus` (enum),
`ShelterSource` (enum), `GeoPoint` (record), `ShelterReview`, `ShelterReviewRepository`
(interface). Plus unit tests.

**Key decisions:** verification = `Set<VerificationClaim>` data, never subclasses; policy rules as
data; `levels()` derived from non-revoked claims.

**Acceptance**
- Policy matrix test: `VIEW_MAP` allowed for `{}`; `SUBMIT_SHELTER` allowed for each single claim,
  denied for `{}`.
- Bird-rule test: guest can watch / can't write; admin can write; `RegisteredUser.levels()`
  reflects add/revoke.

**Manual review:** the whole domain package — it is the contract everything else builds on.

**STOP — wait for review.**

---

## Step 2 — Verification services

**Inputs:** `01-user-verification.puml` (packages `verification` + `app`),
`02-verification-flow.puml`, `03-CONTEXT-VERIFICATION.md`.

**Deliverables** — `ee.sheltermap.verification`: `VerificationProvider` (interface),
`EmailVerificationProvider`, `PhoneVerificationProvider`, `SmartIdVerificationProvider` (stub),
`SmsSender` (interface), `TwilioSmsSender` (SDK call stubbed), `DevSmsSender`, `SmtpSender`
(interface), `DevSmtpSender`, `VerificationService`, `PendingVerification`,
`PendingVerificationRepository` (interface).
`ee.sheltermap.app`: `UserService`, `UserRepository` (interface), `ShelterService`,
`ShelterRepository` (interface).
Uses **in-memory/fake repository implementations for tests only** (real persistence is Step 3).
Unit tests with fake senders/repos.

**Key decisions:** providers are pure channel adapters — no DB access; `VerificationService`
persists pending + claims; codes hashed, attempts-limited, expiring; `ShelterService.addPlace`
checks `canWrite()` first, saves ACTIVE/USER.

**Acceptance**
- OTP flow: request → code sent (fake sender captured), hashed, expiring; wrong code → false;
  attempts exhausted → false; expired → false; correct code → claim persisted, `levels()` updated.
- `addPlace`: guest → rejected; unverified → rejected; verified → saved ACTIVE/USER.
- Full happy path from `02-verification-flow.puml` runs as a service-level test.

**Manual review:** provider/service logic, the map injection of providers into `VerificationService`.

**STOP — wait for review.**

---

## Step 3 — Persistence (PostgreSQL + Flyway + Spring Data)

**Inputs:** `01`, `02`, `03`, `04` context files (repository seams), `01-TASK.md` §4.

**Deliverables**
- Flyway migration `V1__schema.sql`: tables `users`, `verification_claims`, `pending_verifications`,
  `shelters`, `shelter_reviews`, `user_credentials`, `refresh_tokens`, `password_reset_tokens`;
  unique constraint on `shelter_reviews(shelter_id, user_id)`; indexes for lookups.
- JPA entities + Spring Data repositories in `ee.sheltermap.persistence` implementing the domain
  repository interfaces (all of them: `UserRepository`, `ShelterRepository`,
  `ShelterReviewRepository`, `PendingVerificationRepository`, `UserCredentialsRepository`,
  `RefreshTokenRepository`, `PasswordResetTokenRepository`).
- **Mapping decision — pick with the human before coding:** (A) JPA annotations directly on domain
  classes (pragmatic, class count == diagram count) or (B) separate `@Entity` classes + mapping
  layer (cleaner domain, more files). Default: **A** unless the human objects.
- Integration tests with Testcontainers (Postgres).

**Acceptance**
- `mvn test` integration tests pass: save/find/delete for each repository; review uniqueness
  enforced; `deleteBySourceAndExternalIdNotIn` deletes only REGISTRY rows.
- Flyway migrates a fresh database cleanly (`ddl-auto=validate` passes).

**Manual review:** schema, entity mappings, repository implementations.

**STOP — wait for review.**

---

## Step 4 — Auth (Spring Security + JWT + password reset)

**Inputs:** `03-auth.puml`, `04-CONTEXT-AUTH.md`, persistence from Step 3.

**Deliverables** — `ee.sheltermap.auth`: `UserCredentials`, `PasswordResetToken`,
`PasswordHasher` (interface), `Argon2PasswordHasher`, `TokenService` (interface),
`JwtTokenService`, `RefreshTokenRepository`, `RefreshTokenRecord`, `UserCredentialsRepository`,
`PasswordResetTokenRepository`, `RateLimiter` (interface), `TokenBucketRateLimiter`, `AuthService`,
`PasswordResetService`, `AuthController`, DTO records. Plus:
- `SecurityFilterChain` + JWT authentication filter (`ee.sheltermap.config`).
- `UserService.findByEmailOrPhone` / `findByEmail` implementations (contract from `03-auth.puml`).
- Tests: unit (hasher, token service, reset, rate limiter) + MockMvc for the endpoints.

**Key decisions:** generic login errors (no enumeration); reset always "succeeds"; reset revokes
all sessions; access 15 min / refresh 30 days hashed; rate limit login + reset-request.

**Acceptance**
- Register → login (wrong pwd → 401 generic, right pwd → TokenResponse) → refresh rotates →
  logout revokes.
- Reset: unknown email still 200; token single-use; expired fails; after reset, old refresh token
  is rejected.
- Rate limiter: burst over N → 429.
- `POST /auth/**` reachable; protected endpoints 401 without token.

**Manual review:** security config, JWT filter, token rotation, reset flow.

**STOP — wait for review.**

---

## Step 5 — Registry ingestion

**Inputs:** `04-ingestion.puml` (class + sequence), `05-CONTEXT-INGESTION.md`.

**Deliverables** — `ee.sheltermap.ingestion`: `ShelterRegistryClient` (interface),
`PaasteametRegistryClient` (pagination, retry/backoff, politeness; HTTP mocked in tests),
`DevRegistryClient` (JSON fixture), `RegistryShelterDto` (record), `ShelterParser` (interface),
`RegistryShelterParser`, `ShelterImportService`, `ImportResult` (record),
`RegistryUnavailableException`. A `CommandLineRunner` or test trigger to run one import manually.

**Key decisions:** update existing, create new, delete delisted (REGISTRY only), never touch
USER rows; malformed rows skipped + counted; registry down → failed result, no crash.

**Acceptance**
- Parser: valid → mapped; out-of-range/outside-Estonia/blank-name → skipped + counted.
- Import with fake client+repo: created/updated/removed counts correct; USER rows untouched;
  `RegistryUnavailableException` → `ImportResult.failed > 0`.
- One real run via `DevRegistryClient` fixture inserts shelters into Postgres (integration test).

**Manual review:** importer semantics, parser validation, client retry logic.

**STOP — wait for review.**

---

## Step 6 — Shelter API (read/write + reviews)

**Inputs:** `05-shelter-api.puml` (class + sequence), `06-CONTEXT-API.md`.

**Deliverables** — `ee.sheltermap.api`: `ShelterController`, `ReviewController`,
`ShelterQueryService`, `ShelterReviewService`, `ShelterDto`, `CreateShelterRequest`,
`ReviewRequest`, `ShelterReviewDto`, `RatingSummaryDto`, `ErrorResponse`,
`ShelterSourceFilter` (enum), global `@RestControllerAdvice`. MockMvc tests.

**Key decisions:** GETs public; POST shelter needs JWT + `canWrite()`; reviews need verified user,
author-only update/delete, one review per user (upsert); uniform `ErrorResponse`; nearest/bbox +
paging documented as deferred, not built.

**Acceptance**
- `GET /api/shelters?source=USER` returns only USER rows as DTOs (with rating aggregates).
- `POST /api/shelters` anonymous → 401; verified → 201 + Location.
- Reviews: unverified → 403; duplicate review updates; non-author PUT/DELETE → 403; error body is
  always `ErrorResponse`.
- End-to-end integration: register → verify (dev sender) → add shelter → review it → fetch with
  `averageRating`.

**Manual review:** full API surface + error handling.

**STOP — final review.**

---

## Step 7 — Hardening pass (code review) ✅ DONE

**Inputs:** the completed Steps 0–6 + a whole-system code review.

A full read-through of the system after Step 6 fixed the issues that per-step acceptance
criteria never checked (the suite validated the happy paths per spec, not the edge cases).

**Deliverables / fixes (all with tests):**

*High*
- Duplicate registration → **409** — `users.email`/`users.phone` UNIQUE (V3 migration) +
  `DuplicateAccountException` pre-check; DB constraint as the race-safe backstop.
- Password-reset e-mails no longer carry a hardcoded `https://app/…` link — the base URL is
  `app.frontend.base-url` (`FRONTEND_BASE_URL`). *(Superseded by M2
  `password-reset-email-code`: the e-mail now carries a 6-digit CODE, not a link — the base URL
  and `FRONTEND_BASE_URL` are gone.)*

*Medium*
- **Atomic password reset** — hash update + token mark-used + session revocation in ONE
  transaction (no replayable token on mid-way failure).
- **Atomic registry import** — fetch outside the transaction, apply/upsert/delist in one
  transaction (no partial batch); the `AtomicBoolean` overlap guard moved into
  `ShelterImportService` so the scheduler and the startup runner share it.
- **Register rate limiting** — per client IP (account-spam vector), alongside login/reset.
- **`description`/`capacity` stored** (V3 columns) — previously validated then dropped.
- **No N+1** — rating aggregates in one batched query (`findRatingAggregates`).
- **X-Forwarded-For-aware rate limiting** — header honored only from configured trusted
  proxies; per-IP buckets survive reverse proxies without a global-lockout hazard.
- **Actuator hardening** — `show-details: when-authorized`; mail health check disabled
  (SMTP reachability must not flip the app DOWN).

*Low*
- Review upsert is concurrency-safe (unique-constraint race → update, not 500).
- One active claim per (user, level) (V3 unique index) — concurrent confirms can't dup.
- Startup import and scheduler share one overlap guard.
- Intra-fetch duplicate `externalId`s counted as skipped.
- Registry client sends a `User-Agent`.
- `RatingSummaryDto.average` `null` for no reviews (consistent with `ShelterDto`).
- CORS configured for the browser frontend.
- `/dev/email-test` recipient allowlist (never an open relay).
- Dead code removed (`VerificationService.revoke`).

**Acceptance:** `mvn test` green — **183 tests** (added: duplicate-register 409, register
rate-limit 429, email-test allowlist, plus updated persistence ITs for the unique
constraints). V3 migrates cleanly on a fresh DB with `ddl-auto=validate`.

**STOP — final review.**

---

## Post-step-7 additions (Twilio SMS + cross-channel contact change)

Built after the Step 0–6 hardening pass; not a build step (see README for full details):

- **Twilio SMS plan** — real `TwilioSmsSender` (Programmable Messaging, send-only),
  `PhoneNumbers.normalizeE164()`, verification anti-spam throttle (resend cooldown + file-backed
  daily cap in `FileVerificationSendLog` + per-IP bucket on `/verify/request`). `mvn test` →
  **204 tests**.
- **Cross-channel contact change** — `AccountController` + `ContactChangeService` +
  `PendingContactChange` (V4 migration). Email change verified by SMS to the current phone;
  phone change by email to the current email. Also fixed a latent claim-save bug (bulk delete).
  `mvn test` → **218 tests**.


---

## Post-step-7 additions (second review pass — P2 report-only findings)

Follow-up code review findings, all fixed (dead-code removal was part of this pass):

- **P1 re-verify → 500 fixed** — `requestVerification` now throws `AlreadyVerifiedException`
  (→ 409) for already-verified levels (no code sent, no throttle consumed); `confirmVerification`
  is an idempotent no-op for verified levels (no duplicate claim re-insert).
- **Contact-change confirm race → 409** — target re-checked at confirm time + the save is wrapped
  (`DataIntegrityViolationException` → `DuplicateAccountException`).
- **N+1 author lookup in reviews** — `UserRepository.findByIds(Collection)` batches the lookup.
- **`ShelterDto.createdAt` populated** — V5 migration adds `shelters.created_at`
  (`DEFAULT now()`, NOT NULL); `@CreationTimestamp` on the entity keeps the value in the
  persistence context after save.
- **Phone canonicalization** — `PhoneNumbers.normalizeE164` no longer double-prefixes ambiguous
  `372…` numbers (`37212345` stays as-is instead of becoming `+37237212345`); registration and
  login normalize to E.164 so `50000000` and `+37250000000` collide → 409.
- **Twilio fail-fast + diagnostic** — `TwilioSmsSender` refuses to start with missing
  credentials; new `POST /dev/sms-test` mirrors `/dev/email-test` (JWT + allowlist).
- **Clock-deterministic providers** — `EmailVerificationProvider`/`PhoneVerificationProvider`
  now take the injected `Clock` (no `Instant.now()` in confirm/expiry logic).
- **`CreateShelterRequest.capacity`** bounded `@Max(100_000)`; user-shelter coordinates sanity-
  checked inside Estonia (bbox) → 400 via `InvalidShelterException`.
- **Dead code removed** — `AdminUser`, `User.canWatch()`, `UserService.guest()`/`deleteAccount()`,
  `Capability.PUBLISH_INSTANTLY`, `ShelterReviewService.getRatingSummary()`,
  `ShelterStatus.PENDING/REJECTED`. Hierarchy is now `User` → `GuestUser`/`RegisteredUser` only.
- **Prod JWT guard** — refuses to boot with `spring.profiles.active=prod` and the dev-default
  `JWT_SECRET` (`ProdJwtGuard`).
- **Docs/hygiene** — stale `.gitkeep` files removed; README/puml/MD synced.

**Acceptance:** `mvn test` green — **216 tests** (net −6: the removed dead-code tests).
