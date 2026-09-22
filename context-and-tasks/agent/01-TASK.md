# Shelter Map — Build Task for the AI Agent

## 1. Project

**Shelter Map** — an Estonia bomb-shelter map backend with:

- verified user registration (email / phone OTP / Smart-ID stub),
- password authentication with JWT sessions and email-based password reset,
- shelter data ingested from public registries (Päästeamet / municipalities),
- user-submitted shelters with **community reports + confirmation** (no moderator — the report
  and confirmation system IS the moderation; each row carries a `ReviewStatus` that moves
  NEW → CONFIRMED when three distinct non-submitter confirmations (open `OPEN_CONFIRMED`
  reports and/or current OPEN taps, each counted once) cross the threshold, or via the rare
  admin CONFIRM),
- a community trust layer (shelter/occupancy reports — the trust-weighted "does not exist"
  tally reaching 5 points auto-hides the shelter),
- a single **env-provisioned admin** (admin-moderation) with a moderation API for the trust layer
  (user-shelter hide/restore/delete, shelter-report triage, the rare CONFIRM/REJECT override) —
  provisioned from
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`, never the registration flow,
- a public read API for the frontend (Vue/Angular, out of scope here).

This task pack covers the **backend only**.

## 2. Tech stack (fixed — do not change without asking)

- Java **21**, **Maven** (`pom.xml`)
- **Spring Boot 3.3.x**
- Starters: `spring-boot-starter-web`, `spring-boot-starter-validation`,
  `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-actuator`
- **PostgreSQL 16** (Docker Compose for local dev), **Flyway** for migrations
- **jjwt 0.12.x** for JWT access/refresh tokens
- **spring-security-crypto** — `Argon2PasswordEncoder` (Argon2id password hashing)
- **Testcontainers** (`postgres`) for integration tests; JUnit 5 + AssertJ for unit tests
- **No Lombok.** Use records — they replace the boilerplate.

## 3. Source of truth

1. **The UML files are the contract.** Before writing any code, read the puml files listed in the
   step (`../01-user-verification.puml` … `../05-shelter-api.puml`). They define the classes,
   method signatures, package layout, and relationships.
2. The **context files** (`02-…CONTEXT-*.md`) add decisions and rationale from the design sessions.
3. If a context file and a puml file disagree, **the puml wins** — and report the discrepancy in
   your summary instead of silently picking one.

## 4. Package layout (root package `ee.sheltermap`)

| Package | Contents | Source diagram |
|---|---|---|
| `ee.sheltermap.domain` | `User` hierarchy (incl. `AdminUser` — the third fixed kind, admin-moderation D1; born with every verification claim pre-set), `VerificationClaim`, `VerificationPolicy`/`Rules`/`Capability`, `Shelter` (carries `autoHideDisarmed` — V9, set by the admin restore), trust entities `ShelterReport` (carries `dismissedAt` — V10, the admin dismissal stamp)/`ShelterOccupancyReport` + enums `ShelterReportType`/`OccupancyBand`/`OpenStatusState` (shelter-trust-and-reports V9 + V22 open-status — the V9 `ShelterStatusFlag` display-flag enum is retired), value records | `01` |
| `ee.sheltermap.app` | `UserService`, `ShelterService` (10-active-shelter cap, V9/D3), `ShelterReportService` (typed reports + occupancy upsert — V9), `LocationResolveService`, `MapsUrlCoordinates`, `RedirectClient` + `HttpUrlRedirectClient` (short-link resolver seam), `AppInfo`, repository **interfaces** (`UserRepository` (incl. `isAdmin` — the admin-authorization seam (fresh kind lookup) and the 10-cap exemption), `ShelterRepository`, `ShelterReportRepository` (incl. `findById`/`findByShelterId`/`findAll` — the admin queue, newest first), `ShelterOccupancyRepository`), `ReportActionLog` (the report-throttle seam) + `ReportProperties` (V9), `NotVerifiedException` (moved here from `api/` in the 2026-09-08 arch pass — thrown by the write paths for unverified users) + the trust exceptions (`ShelterLimitExceededException` 409, `DuplicateReportException` 409, `ReportThrottledException` 429 — V9) + the admin exceptions (`AdminAccessException` 403, `ImportOwnedShelterException` 409 — registry rows, `ReportNotFoundException` 404 — admin-moderation) | `01` |
| `ee.sheltermap.verification` | `VerificationProvider` + 3 impls, `SmsSender`/`SmtpSender` + impls, `VerificationService`, `PendingVerification`, `VerificationProperties` | `01` |
| `ee.sheltermap.auth` | `UserCredentials`, `PasswordHasher`, `TokenService`, `AuthService`, `PasswordResetService`, `ContactChangeService`, `AccountService`, `AuthController`, `AccountController`, `ClientIps`, `Codes`, `Hashes`, `JwtProperties`, `ContactChangeProperties`, DTOs, repo interfaces, `RateLimiter`, `AdminSeeder` (the `ApplicationRunner` that env-provisions the admin — admin-moderation D1) | `03` |
| `ee.sheltermap.ingestion` | `ShelterRegistryClient` + impls, `ShelterParser`, `ShelterImportService`, `ImportResult`, `RegistryProperties` | `04` |
| `ee.sheltermap.api` | `ShelterController` (incl. the V9 report + occupancy endpoints, the ACTIVE-only public list and the trust filters), `LocationController`, `AdminController` + `AdminModerationService` (admin-moderation D3/D4 — the `/admin/*` moderation surface, fresh `isAdmin` lookup per request, USER-rows-only writes, registry rows → 409), `ShelterQueryService` (trust derivations in the batched projection — D1/D4; `findAllForAdmin` — all statuses incl. hidden, with the submitter's name), DTOs (`ShelterDto` carries `submitterVerified` — true when the shelter's creator exists and has a completed verification, false for registry rows; accessibility-and-provenance D3 — plus the V9 trust fields `nonexistentReports`, `openStatus`, `occupancy`, `yourOccupancyBand`; the admin DTOs `AdminShelterDto`/`AdminShelterReportDto`/`AdminAuditDto` — admin-moderation), request records `ShelterReportRequest`/`OccupancyReportRequest` (V9), `AdminShelterStatusRequest` (admin-moderation), `AdminShelterReviewRequest` (V11 — the CONFIRM/REJECT body), `ErrorResponse` | `05` |
| `ee.sheltermap.persistence` | Spring Data JPA implementations of the repository interfaces (added in Step 3); incl. `JpaReportActionLog` — the report throttle's check-and-record, serialized per user with a transaction-scoped Postgres advisory lock (V9) | — |
| `ee.sheltermap.config` | Composition root only: `SecurityConfig`, `JwtAuthenticationFilter`, `ProdJwtGuard`, `DevEndpointsGuard`, `RateLimitProperties`, `RegistryScheduler`, `RegistryRunConfig`. It no longer holds the context `*Properties` records — those moved with their contexts (`JwtProperties`/`ContactChangeProperties` → `auth`, `RegistryProperties` → `ingestion`, `VerificationProperties` → `verification`) in the 2026-09-08 arch pass | — |

**Dependency rule (never break it):** `api`/`auth`/`ingestion` → `app`/`verification` → `domain`.
`domain` depends on nothing. No package may create a cycle. Cross-package access goes through
**interfaces** only.

## 5. Non-negotiable rules

1. **Step-by-step discipline.** Implement only the step you were asked for (`07-STEPS.md`). No
   "while I'm here" extras, no jumping ahead, no refactors of unrelated code. After tests pass:
   report the files created, how to verify manually, and **stop**.
2. **Program to interfaces (TIJ Ch 9).** Every seam in the diagrams is an interface
   (`VerificationProvider`, `SmsSender`, `SmtpSender`, `TokenService`, `PasswordHasher`,
   `RateLimiter`, `ShelterRegistryClient`, `ShelterParser`, all repositories). Services depend on
   interfaces, never on concrete collaborators. Implementations are separate, swappable classes
   (`TwilioSmsSender` vs `DevSmsSender`, `PaasteametRegistryClient` vs `DevRegistryClient`).
3. **Inheritance only for genuine is-a (TIJ Ch 1/7).** `GuestUser`, `RegisteredUser`,
   `AdminUser` extend `User` (kind is fixed at creation — `AdminUser` came back in
   admin-moderation as the third kind, the env-provisioned admin; it is never produced by the
   registration flow, only by the `AdminSeeder`). **Never** model verification as subclasses
   (`VerifiedUser` etc.) — verification is data: `Set<VerificationClaim>` on `RegisteredUser`.
   An object never changes class; claims are added/revoked at runtime.
4. **Composition first.** Runtime-changing state is data held by an object, not new subclasses.
5. **Hidden implementation.** Fields `private`, methods `public`. Callers get immutable snapshots
   (`UserData`, DTOs) — never live entity internals.
6. **Records for value types** (`UserData`, `GeoPoint`, all request/response DTOs). **Enums for
   closed sets** (`VerificationLevel`, `ShelterStatus`, `ShelterSource`, `Capability`).
7. **Controllers are thin shells** — parse, validate, delegate, map. Zero business logic.
8. **One uniform error shape** — `ErrorResponse` (`timestamp, status, error, message, path`) via a
   `@RestControllerAdvice`. HTTP semantics: 400 validation, 401 unauthenticated, 403 forbidden
   (not verified / not author / not an admin — admin-moderation), 404 not found,
   409 conflict (duplicate report, 10-active-shelter cap, optimistic lock, import-owned registry
   row — admin-moderation), 429 rate limited, 502 geo-resolve upstream failure.
9. **Tests are mandatory in every step** — JUnit 5. Unit tests for logic; integration tests
   (Testcontainers) from Step 3 on. All tests must pass before you report done.
10. **Secrets discipline.** Never store or log plaintext passwords or tokens. Passwords → Argon2id
    hash. Refresh/reset tokens → SHA-256 hash at rest. Generic login errors ("invalid
    credentials" — never "wrong password"). Password-reset requests always respond success
    ("if the account exists, we sent an email"). A password reset revokes **all** refresh tokens
    for that user.
11. **No moderator.** User-submitted shelters are created `ACTIVE` immediately, and quality is
    governed by community reports + confirmation: each USER row carries a `ReviewStatus` that
    moves NEW → CONFIRMED automatically when its tally of distinct community confirmers —
    verified users other than the submitter with an open `OPEN_CONFIRMED` report or a current
    OPEN tap, each counted once — reaches three (audited `AUTO_CONFIRM`, the crossing user as
    actor), or via the rare admin CONFIRM; admin REJECT
    (reason required) sets REJECTED and hides the row via `status = INACTIVE`. There is no star
    rating and no per-user review row — `ShelterReport` (typed, unique per shelter+user+type)
    and `ShelterOccupancyReport` are the only community writes.
12. **User-added data is sacred.** Import deletes/updates only `source = PAASETEAMET` /
    `source = MUNICIPALITY` rows (`REGISTRY` exists only as the API filter meaning those two);
    rows with `source = USER` are never touched by the importer.

## 6. How to work

1. Read the requested step in `07-STEPS.md`. Read the puml + context files it lists.
2. Implement the classes in the packages from section 4, following the signatures in the puml.
3. Run `mvn test`. Fix failures until green. If a step says so, also verify `mvn spring-boot:run`.
4. Report: files created, tests run/passed, and the exact commands the human can run to verify
   manually. Then **stop** — do not continue to the next step.
