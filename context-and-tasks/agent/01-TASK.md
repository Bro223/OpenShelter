# Shelter Map — Build Task for the AI Agent

## 1. Project

**Shelter Map** — an Estonia bomb-shelter map backend with:

- verified user registration (email / phone OTP / Smart-ID stub),
- password authentication with JWT sessions and email-based password reset,
- shelter data ingested from public registries (Päästeamet / municipalities),
- user-submitted shelters with **community ratings** (no moderator — the rating system IS the moderation),
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
| `ee.sheltermap.domain` | `User` hierarchy, `VerificationClaim`, `VerificationPolicy`/`Rules`/`Capability`, `Shelter`, `ShelterReview`, enums, value records | `01` |
| `ee.sheltermap.app` | `UserService`, `ShelterService`, `LocationResolveService`, `MapsUrlCoordinates`, `RedirectClient` + `HttpUrlRedirectClient` (short-link resolver seam), `AppInfo`, repository **interfaces** (`UserRepository`, `ShelterRepository`, `ShelterReviewRepository`), `NotVerifiedException` (moved here from `api/` in the 2026-09-08 arch pass — thrown by the write paths for unverified users) | `01` |
| `ee.sheltermap.verification` | `VerificationProvider` + 3 impls, `SmsSender`/`SmtpSender` + impls, `VerificationService`, `PendingVerification`, `VerificationProperties` | `01` |
| `ee.sheltermap.auth` | `UserCredentials`, `PasswordHasher`, `TokenService`, `AuthService`, `PasswordResetService`, `ContactChangeService`, `AccountService`, `AuthController`, `AccountController`, `ClientIps`, `Codes`, `Hashes`, `JwtProperties`, `ContactChangeProperties`, DTOs, repo interfaces, `RateLimiter` | `03` |
| `ee.sheltermap.ingestion` | `ShelterRegistryClient` + impls, `ShelterParser`, `ShelterImportService`, `ImportResult`, `RegistryProperties` | `04` |
| `ee.sheltermap.api` | `ShelterController`, `ReviewController`, `LocationController`, `ShelterQueryService`, `ShelterReviewService`, DTOs, `ErrorResponse` | `05` |
| `ee.sheltermap.persistence` | Spring Data JPA implementations of the repository interfaces (added in Step 3) | — |
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
3. **Inheritance only for genuine is-a (TIJ Ch 1/7).** `GuestUser`, `RegisteredUser` extend
   `User` (kind is fixed at creation; `AdminUser` was removed in the review-fix pass — v1 has no
   staff role). **Never** model verification as subclasses
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
   (not verified / not author), 404 not found, 429 rate limited.
9. **Tests are mandatory in every step** — JUnit 5. Unit tests for logic; integration tests
   (Testcontainers) from Step 3 on. All tests must pass before you report done.
10. **Secrets discipline.** Never store or log plaintext passwords or tokens. Passwords → Argon2id
    hash. Refresh/reset tokens → SHA-256 hash at rest. Generic login errors ("invalid
    credentials" — never "wrong password"). Password-reset requests always respond success
    ("if the account exists, we sent an email"). A password reset revokes **all** refresh tokens
    for that user.
11. **No moderator.** User-submitted shelters are created `ACTIVE` immediately. Quality is
    governed by community ratings. One review per user per shelter (unique `shelterId + userId`);
    re-rating = update, not insert. Reviews require an authenticated, **verified** account
    (any `VerificationClaim`); update/delete are author-only.
12. **User-added data is sacred.** Import deletes/updates only `source = REGISTRY` rows; rows with
    `source = USER` are never touched by the importer.

## 6. How to work

1. Read the requested step in `07-STEPS.md`. Read the puml + context files it lists.
2. Implement the classes in the packages from section 4, following the signatures in the puml.
3. Run `mvn test`. Fix failures until green. If a step says so, also verify `mvn spring-boot:run`.
4. Report: files created, tests run/passed, and the exact commands the human can run to verify
   manually. Then **stop** — do not continue to the next step.
