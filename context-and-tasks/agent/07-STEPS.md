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

---

## Post-step-7 additions (M8 — user contributions, OpenSpec `user-contributions`)

Built as OpenSpec change `user-contributions` (M3 of 3 in its own plan — the third and final
milestone of that change): submitting users can manage their own contributions — list/edit/
delete their own USER-source shelters and list/edit/delete their own reviews, surfaced as a
"My contributions" panel on the account page (`ContributionsPanel`, `features/contributions/`;
not a new route). Backend: `V7__shelter_created_by.sql` (`shelters.created_by BIGINT NULL
REFERENCES users(id) ON DELETE SET NULL` + `idx_shelters_created_by`; `addPlace` records the
author), author-scoped `GET /api/shelters/mine`, `PUT`/`DELETE /api/shelters/{id}` (404 absent,
403 not-the-author — registry and legacy `created_by`-NULL rows unmanageable by anyone; PUT
shares POST's Estonia bbox gate via a small helper; only the five fields
name/description/capacity/lat/lng are writable) and `GET /account/reviews/mine` (`MyReviewDto[]`,
shelter names batched — no N+1); deleting a shelter cascades to its reviews (DB `ON DELETE
CASCADE` — `JpaShelterRepository.deleteById` flushes so the cascade is visible to in-transaction
reads). Frontend: `ShelterGateway.mine()/update()/remove()` + `AccountGateway.myReviews()` +
models `UpdateShelterRequest`/`MyReviewDto`; inline-expanding edit forms (no modals),
two-step delete confirms (no `window.confirm`), per-list loading/empty/error states. Docs/puml
synced (`05-shelter-api.puml` + render, `06-CONTEXT-API.md`, `02-CONTEXT-DOMAIN.md`,
frontend `06-CONTEXT-SHELTER.md` + `05-shelter-review-flow.puml`, both READMEs).
**Acceptance:** `mvn test` + `ng test` green, live journey verified (submit → review → both
appear in the panel → edit persists on the detail page → delete removes shelter + review;
non-author and registry attempts → 403).

---

## Post-step-7 additions (shelter-trust-and-reports — the trust layer)

Built as OpenSpec change `shelter-trust-and-reports` (V9 migration + report/occupancy
endpoints + trust filters + the frontend trust UI). No moderator anywhere — the community
reports and the derived state are the moderation.

**Schema (V9__shelter_trust_and_reports.sql)** — four new tables + two columns. Every report
FK is `ON DELETE CASCADE` (a deleted shelter/user/review drops its reports with it):

- `shelter_reports` — `id BIGSERIAL PK, shelter_id BIGINT NOT NULL → shelters(id) CASCADE,
  user_id BIGINT NOT NULL → users(id) CASCADE, type VARCHAR(16) NOT NULL CHECK IN
  (NON_EXISTENT, CLOSED, OPEN_CONFIRMED, WRONG_LOCATION, OTHER), detail VARCHAR(500) (free text
  for OTHER, NULL otherwise), created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; **UNIQUE
  (shelter_id, user_id, type)** — the per-target abuse bound; indexes (shelter_id), (user_id).
- `shelter_occupancy_reports` — `id BIGSERIAL PK, shelter_id → shelters(id) CASCADE,
  user_id → users(id) CASCADE, band VARCHAR(16) NOT NULL CHECK IN (SPACE, GETTING_FULL, FULL),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`; **UNIQUE (shelter_id, user_id)** — one live
  report per user per shelter (a re-report updates the row, `updated_at` refreshed); indexes
  (shelter_id), (user_id). Freshness (2 h on `updated_at`) is checked at read time — no
  cleanup job.
- `review_reports` — `id BIGSERIAL PK, review_id BIGINT NOT NULL → shelter_reviews(id)
  CASCADE, user_id BIGINT NOT NULL → users(id) CASCADE, reason VARCHAR(16) NOT NULL CHECK IN
  (FALSY_DATA, NOT_RELEVANT, SPAM, OTHER), detail VARCHAR(500) (free text for OTHER, NULL
  otherwise), created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; **UNIQUE (review_id, user_id)**;
  indexes (review_id), (user_id).
- `report_actions` — the durable log behind the report throttle (same table family and window
  style as the password-reset rotation guard): `id BIGSERIAL PK, user_id BIGINT NOT NULL →
  users(id) CASCADE, action VARCHAR(32) NOT NULL (SHELTER_REPORT | REVIEW_REPORT | OCCUPANCY),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; index (user_id, created_at). A separate log
  (not a count over the three report tables) because an occupancy re-PUT updates one row and
  would be uncountable.
- `shelters.auto_hide_disarmed BOOLEAN NOT NULL DEFAULT FALSE` — the auto-hide disarm flag
  (FALSE while the shelter may still be auto-hidden by the 5th NON_EXISTENT report; a manual
  admin restore sets it TRUE — the admin-moderation change lands the write path, the condition
  is honoured from day one).
- `shelter_reviews.hidden_at TIMESTAMPTZ` (nullable) — set once when the 5th review report
  lands; never cleared automatically (admin moderation only).

**Endpoints** — `POST /api/shelters/{id}/reports` (204; 401/403/404/400/409/429, see
`06-CONTEXT-API.md` for the full matrix), `PUT /api/shelters/{id}/occupancy` (204 upsert;
401/403/404/400/429 — no 409, a re-send is the update),
`POST /api/shelters/{id}/reviews/{reviewId}/reports` (204; 401/403 own-or-unverified/404/400/
409/429). All three require a Bearer JWT + a verified registered user (the same `canWrite()`
gate and error vocabulary as submissions). `GET /api/shelters` gains the optional trust filters
`reviewed` / `minRating` (1..5, else 400) / `hasCapacity` (composable with `source`) and is now
**ACTIVE-only** (auto-hidden shelters disappear from the public list and map); `GET
/api/shelters/mine` and `GET /api/shelters/{id}` keep all statuses. `POST /api/shelters`
rejects the 11th ACTIVE USER shelter with 409 (ADMIN kind exempt — the `isAdmin` seam).

**Rules** — auto-hide fires exactly on the 4→5 NON_EXISTENT insert (an ACTIVE shelter whose
`autoHideDisarmed` is `false`; after a manual status change the count is past 4, so later
reports never re-hide); CLOSED vs OPEN_CONFIRMED net to a display-only flag (`closed >
confirmed` → REPORTED_CLOSED; both ≥ 1 → CONFIRMED_OPEN, **a tie counts as confirmed open**);
occupancy display is 2 h-fresh at read time, latest band wins, hedged at one agreeing report,
firm at two+, silent when stale; the per-user report throttle is 10 report-type actions per
rolling hour (any target/type, `REPORTS_MAX_ACTIONS_PER_HOUR`, 0 disables) with the
check-and-record atomic per user via a transaction-scoped advisory lock (a throttled decision
records nothing; a 409 duplicate consumes no budget); hidden reviews drop out of the list,
the average rating, the review count and the `reviewed` filter (the author still sees their
own, marked hidden).

**Acceptance:** `mvn test` green — **433 tests** (counted 2026-09-11). Frontend wave (trust
filter chips + rating select, orange reported marker + legend, badge set, detail-page report
pickers, "Report how full" band picker, contributions-panel hidden state, `--color-reported`
token): `npx ng test` green — **657 tests across 35 spec files** (counted 2026-09-11).

**STOP — final review.**

---

## Post-step-7 additions (admin-moderation — env-provisioned admin + moderation API)

Built as OpenSpec change `admin-moderation` (the human lever for the trust layer the previous
change introduced: auto-hidden shelters had no one to restore them, and the report queues
would accumulate with no one able to see or act on them). The admin is **env-provisioned**,
never the registration flow — the admin mailbox does not exist and can never pass email
verification.

**Provisioning (D1) — `auth.AdminSeeder` (an `ApplicationRunner`, once at startup, transactional):**
new env vars `ADMIN_EMAIL` / `ADMIN_PASSWORD` (bare names, empty defaults in
`application.yml`; dev values live in the gitignored `.env`). Create-if-absent, the whole
contract:

- **Either var unset → no-op.** No admin exists, `/admin/*` answers 403 for everyone (a normal
  account that holds the email string is still just a normal account — kind is the truth), and
  the app behaves exactly as without the capability.
- **Both set + no user with that email → create:** kind `ADMIN`, name "Admin", the configured
  email, **no phone** (null — outside the partial unique index, never a login route), national
  ID `""`, **every verification claim pre-set** (EMAIL/PHONE/SMART_ID — `canWrite()` true from
  the first request), password = Argon2 via the standard encoder.
- **A user with that email already exists (any kind, case-insensitive) → do nothing.** Never
  re-hashes, never flips kind, never touches claims — an in-app password change survives
  restarts/deployments.

**Login is the normal `POST /auth/login`** — no dedicated endpoint, no backdoor; the JWT has
the same shape as every other user's (principal = userId, **no role claim**).

**Authorization (D2) — fresh lookup, no JWT claim:** every `/admin/*` request loads the JWT's
userId and requires `UserKind.ADMIN` (`UserRepository.isAdmin`, one indexed PK lookup). 401
anonymous (the security entry point — `/admin/**` sits in the authenticated set), 403
authenticated non-admin (`AdminAccessException`). A demotion/deletion takes effect on the
next request, even with a still-valid token. `GET /account/me` gains `isAdmin` (always
present; the frontend's gate for the nav item and the `/admin` route).

**Schema (V10__admin_moderation.sql):** `shelter_reports.dismissed_at TIMESTAMPTZ NULL` — the
admin's dismissal stamp, set once by `POST /admin/reports/{id}/dismiss` (idempotent; NULL
while unresolved). Dismissing never deletes the row.

**API (D3/D4) — `api.AdminController` + `api.AdminModerationService`, 8 endpoints** (full
status matrices in `06-CONTEXT-API.md`):

- `GET /admin/shelters?status=&source=&q=` — every shelter incl. hidden, id-ordered, with the
  batched trust fields + the submitter's name (`ShelterQueryService.findAllForAdmin` — the same
  projection as the public list, no N+1).
- `POST /admin/shelters/{id}/status` `{"status": "ACTIVE"|"INACTIVE"}` — manual hide/restore,
  USER rows only (registry → **409** import-owned); a **restore sets `autoHideDisarmed`
  (permanently disarms auto-hide)**; 204; 404 unknown.
- `DELETE /admin/shelters/{id}` — hard delete (cascade: reviews, shelter reports, review
  reports, occupancy), USER rows only (registry → 409); 204; 404 unknown.
- `GET /admin/reports?shelterId=` — shelter-report queue, newest first, with the shelter's
  live status + the reporter's profile name/email (admin-only data, never exposed outside
  `/admin/*`); unknown `shelterId` → 404.
- `POST /admin/reports/{id}/dismiss` — mark resolved (idempotent; the row is kept); 204;
  404 unknown.
- `GET /admin/review-reports` — review-report queue, newest first, hidden reviews included
  with their marker + the review excerpt.
- `POST /admin/reviews/{id}/hide` / `POST /admin/reviews/{id}/restore` — immediate hide /
  clear `hidden_at` (both idempotent; `{id}` = the REVIEW's id; a restore re-joins the review
  to the rating, count and `reviewed` filter); 204; 404 unknown.

**Ops note (de-provisioning):** remove the env vars AND delete the row (manual SQL — no API
deletes admin accounts). While BOTH vars stay set, the seeder **recreates** the admin on the
next boot if the row was deleted (create-if-absent sees no user with that email). With the
vars removed, the seeder is a no-op forever — but a still-existing row remains a working admin
(login with its own stored password), so row deletion is the real off switch.

**Frontend half:** the `/admin` route (lazy, `AdminGuard` — anonymous AND non-admin both
redirect home; the backend re-checks kind per request, so the guard is UX, not enforcement),
the admin-only "Admin" nav item, `AuthStore.isAdmin` from `/account/me` (fail-closed false on
a failed profile fetch), the account-page "Admin" provenance-style badge, `AdminGateway` (all
eight endpoints), and `features/admin/` — three tabs: Shelters (search + inline
Hide/Activate, two-tap Delete; registry rows read-only), Shelter reports (queue + dismiss,
dismissed rows dimmed, "Restore shelter" shortcut on hidden-shelter rows), Review reports
(queue + Hide/Restore + hidden badge). Details in the frontend agent pack.

**Persistence notes:** `UserMapper` round-trips the `ADMIN` kind (before the `RegisteredUser`
check — `AdminUser` IS-A `RegisteredUser`, and the kind must survive every save of a loaded
admin); `JpaUserRepository.findByEmail`/`findByPhone` now return REGISTERED **and** ADMIN rows
(kind restored by the mapper) — the admin logs in through the normal flow and the
registration pre-check sees the admin's email as in use (409).

**Acceptance:** `mvn test` green — **464 tests** (counted 2026-09-12: seeder create-once /
never-overwrite / no-op-when-unset + login-without-verification, 401/403/immediate-demotion
authorization, hide/restore + disarm, delete cascade, registry 409s, queue shapes, idempotent
dismiss/hide/restore). Frontend: `npx ng test` green — **723 tests across 38 spec files**
(counted 2026-09-12).

**STOP — final review.**

---

## Post-step-7 additions (community-review-queue — the community trust lifecycle)

Built as OpenSpec change `community-review-queue` (v2 — auto-trust lifecycle). The owner does
NOT actively moderate, so nothing may wait on a human: community locations publish immediately
as `NEW` (visibly "just added"), the existing community report mechanism is what moves a
location from new toward checked, and the admin panel is a rare fallback with a full audit
trail. Decisions D1–D7 in `openspec/changes/community-review-queue/design.md`.

**Backend (V11, D1–D4):** `shelters.review_status` (CHECK `NEW`/`CONFIRMED`/`REJECTED`, NOT
NULL DEFAULT `NEW`; backfill — USER rows `NEW`, registry rows `CONFIRMED`, D3),
`shelters.review_note` (the REJECT reason, shown to the submitter in `/mine`),
`shelters.location_kind` (CHECK `PUBLIC`/`PRIVATE`, D7) and the append-only
`moderation_actions` table (D4 — `shelter_id` deliberately has NO FK: a delete records its
audit row in the same transaction, the id dangles, the read-time join renders "Deleted
shelter"). Domain: `ReviewStatus` + `LocationKind`. The `OPEN_CONFIRMED` report from a user
OTHER than the submitter promotes `NEW → CONFIRMED` in the same transaction with an
`AUTO_CONFIRM` audit row (D2 — the primary promotion path; the submitter's own positive
report never promotes; registry / already-confirmed rows untouched). Admin:
`POST /admin/shelters/{id}/review` (`CONFIRM` / `REJECT` — reason required, REJECT also flips
`status = INACTIVE` via the existing hide mechanism; USER rows only, registry → 409) and
`GET /admin/audit` (newest first, limit 1..200 default 100, read-time name resolution).
Restoring a `REJECTED` row via the status endpoint reverts it to `NEW` (it starts over).
`ModerationAuditLog` app interface + JPA impl + in-memory double — every action (status
change, hard delete, report dismiss, review hide/restore, CONFIRM, AUTO_CONFIRM, REJECT)
writes its row in the SAME transaction (D4). DTOs carry `reviewStatus` (+ `reviewNote` on
`/mine` and admin rows) + `locationKind`; `CreateShelterRequest` accepts `locationKind`
(default `PUBLIC`).

**Frontend (D5–D7):** marker palette — community `NEW` rows render amber
(`--color-new` token, documented in `styles.scss`; `shelter-marker--new` class), `CONFIRMED`
rows green, registry + reported states unchanged — the map legend is now **Registry / New
community / Confirmed community / Reported** (D5). List rows + detail show "Newly added" /
"Community-checked" badges for USER rows (replacing the old "User-submitted" provenance text)
- the "Private location" badge (D7) + the unverified warning on NEW detail pages. The map CTA
reads **"Show shelters around you"** (button/result/empty) — never "nearest" — with the
honest straight-line distance "≈ N km straight line" (metres under 1 km) and an unverified
warning line when the nearest row is community (D6). Submission form: the private-home
declaration checkbox → `locationKind` in the payload (D7 — declaration, not detection;
private rows are NEVER hidden or demoted). Admin page: the "Unconfirmed" tab (USER `NEW`
rows — name/address/submitter, Mark confirmed / Reject with required reason) + the "Audit
log" tab (newest 100); gateway `reviewShelter` / `listAudit` + TS models. Contributions
(`/mine`): `NEW`/`CONFIRMED`/`REJECTED` badges + the admin's `reviewNote`, and the
submit-success copy ("listed, marked as newly added — community reports confirm it").

**Acceptance:** `mvn test` green — **491 tests** (counted 2026-09-13; incl.
`CommunityReviewIT`: public-as-NEW, cross-user promotion + AUTO_CONFIRM, own-report
non-promotion, admin CONFIRM/REJECT, restore → NEW, audit rows, registry 409s,
`locationKind` round-trip) and `npx tsc --noEmit` + prettier green. Frontend: `npx ng test`
green — **764 tests across 38 spec files** (counted 2026-09-13). Live-verify (dev backend
restart: submit → NEW/amber → confirm report → green; reject → hidden) is still owed — the
watchdog pass that closed this change cannot restart the protected dev server.

**STOP — final review.**
