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
`User` (abstract), `GuestUser`, `RegisteredUser`, `AdminUser`, `UserData` (record),
`VerificationLevel` (enum), `VerificationClaim`, `VerificationPolicy`, `VerificationRules`
(record, `ofDefaults()`), `Capability` (enum), `Shelter`, `ShelterStatus` (enum),
`ShelterSource` (enum), `GeoPoint` (record), `ShelterReview`, `ShelterReviewRepository`
(interface). Plus unit tests.

**Key decisions:** verification = `Set<VerificationClaim>` data, never subclasses; policy rules as
data; `AdminUser` has **no** moderation methods; `levels()` derived from non-revoked claims.

**Acceptance**
- Policy matrix test: `VIEW_MAP` allowed for `{}`; `SUBMIT_SHELTER` allowed for each single claim,
  denied for `{}`; `PUBLISH_INSTANTLY` only for `{SMART_ID}`.
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
