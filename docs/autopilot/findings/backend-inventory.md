# Backend inventory — OpenShelter (walked 2026-09-15, read-only)

**Scope.** Every package under `src/main/java/ee/sheltermap` — `alerts`, `api`, `app`, `auth`,
`config`, `domain`, `ingestion`, `migration`, `persistence`, `security`, `verification` plus
`ShelterMapApplication` — and all 118 files under `src/test/java`.

**Method.** Static only: `read` + `grep` (this agent has no shell). Every item below carries
`path:line`, the observed text, why it is a problem, and a concrete fix. Test-gap claims mean
"no reference found in `src/test`", not "proven absent". **No P1 was found** — nothing here is
remotely exploitable or broken as shipped; items 1–2 are the only ones worth scheduling.

---

## 1. P2 — Unbounded auth payloads reach Argon2 and hashing/short-circuit paths

The `api` package bounds every text field to its column size; the `auth` package does not.

| Site | Observed |
|---|---|
| `auth/LoginRequest.java:6-8` | `@NotBlank String emailOrPhone`, `@NotBlank String password` — **no `@Size` on either** |
| `auth/RegisterRequest.java:22` | `@NotBlank @Size(min = 8, message = "Password must be at least 8 characters long") String password` — min only, **no max** |
| `auth/ProfileUpdateRequest.java:17-19` | `@NotBlank String currentPassword` — unbounded |
| `auth/PasswordResetConfirmRequest.java:12-15` | `@NotBlank @Email String email`, `@NotBlank String code`, `@NotBlank @Size(min = 8, …) String newPassword` — code and new password unbounded |
| `auth/ConfirmChangeRequest.java:6`, `auth/VerifyConfirmRequest.java:11-13` | `@NotBlank String code` — unbounded |
| `auth/RefreshRequest.java:6` | `@NotBlank String refreshToken` — unbounded |

**Evidence for the asymmetry:** `api/CreateShelterRequest.java:24` (`@Size(max = 200)`),
`api/UpdateShelterRequest.java:23-28` (`max = 200` / `max = 2000` / `@Min(1) @Max(100_000)`),
`api/ShelterReportRequest.java:15` (`max = 500`), `api/InfoRequestReplyRequest.java:12` and
`api/AdminInfoRequestRequest.java:12` (`max = 2000`), `api/LocationResolveRequest.java:16`
(`max = 2048`). `RegisterRequest`'s own javadoc (`:6-8`) even states the rule — "`@Size` caps
mirror the V1 column sizes … so an oversized value is rejected at the boundary (400)".

**Why it matters.** Password/code/token fields feed Argon2 (`auth/Argon2PasswordHasher`,
`auth/AuthService`) and `Hashes.sha256Hex` (`auth/ContactChangeService.java:238`,
`auth/PasswordResetService.java:155`, `auth/JwtTokenService.java:70`). Cost scales with input
length, so a single request carrying a multi-megabyte password burns CPU/memory *before* the
per-IP rate limiter has any effect (the limiter counts requests, not bytes).

**Fix.** Add `@Size(max = …)` to every text field in the six records above — suggested bounds:
email/`emailOrPhone` 255 (the column), password 200, codes 16, refresh token 512. Add a
constraint-parity test in the style of `src/test/java/ee/sheltermap/api/ShelterRequestConstraintParityTest.java`
so the auth DTOs cannot regress.

## 2. P2 — Business-logic wall-clock reads where this codebase's own convention is an injected `Clock`

| Site | Observed |
|---|---|
| `app/ShelterService.java:131` | `Instant windowStart = Instant.now().minus(DAILY_SUBMISSION_WINDOW);` — the daily submission cap window |
| `app/ShelterService.java:223` | `Duration.between(Instant.now(), …)` — the `Retry-After` computation |
| `domain/AdminUser.java:48` | `Instant now = Instant.now();` used to stamp three verification claims in `provisioned(...)` |
| `domain/ShelterReport.java:50` | convenience constructor stamps `Instant.now()` |
| `auth/UserCredentials.java:24,58` | `this.createdAt = Instant.now();` / `this.changedAt = Instant.now();` |
| `persistence/JpaUserCredentialsRepository.java:50` | `entity.setChangedAt(Instant.now());` |
| `persistence/JpaPasswordResetTokenRepository.java:79` | `…getCreatedAt() != null ? … : Instant.now()` |

**Evidence that this is a real convention, not a preference:** 25+ production classes inject
`Clock` (`config/SecurityConfig.java:57-58` publishes the bean; `persistence/JpaRefreshTokenRepository.java:16,25`;
`api/ShelterQueryService.java:90,100`; `api/AdminModerationService.java:97,107`;
`app/ShelterReportService.java:92,102`; `ingestion/ShelterImportService.java:54,62`;
`verification/VerificationService.java:42,61`; `verification/EmailVerificationProvider.java:34,36`;
`verification/PhoneVerificationProvider.java:30,32`; `verification/FileVerificationSendLog.java:47,50`;
`persistence/JpaModerationAuditLog.java:26,28`; `persistence/JpaShelterHistoryLog.java:22,24`;
`persistence/JpaShelterInfoRequestLog.java:31,33`; `persistence/JpaReportActionLog.java:38,43`;
`alerts/ThrottleAlertRecorder.java:32,40`; `verification/RollingContactOtpLimiter.java:68,76`).
The rule is written down in the code itself: `auth/PasswordResetToken.java:99-101` — "the caller
— the Clock-injected `PasswordResetService` — owns the time source, so the domain never reaches
for the wall clock" — and restated at `domain/VerificationClaim.java:76` and
`domain/RegisteredUser.java:90`. `JpaRefreshTokenRepository.java:16` calls it "the codebase-wide
convention".

**Why it matters.** `ShelterService`'s two sites are *business rules* (daily cap, `Retry-After`):
with `Instant.now()` inline they cannot be pinned, so the daily-window boundary and the
`Retry-After` value are only testable by real-time sleeps — unlike the neighbouring services
(`app/ShelterReportService`, `verification/VerificationService`) whose tests pin time.

**Fix.** Constructor-inject `Clock` into `ShelterService` and use `clock.instant()`. Convert
`AdminUser.provisioned(…)`, the `ShelterReport` convenience constructor and `UserCredentials`
mutators to take an `Instant` from their caller (the pattern `PasswordResetToken.markUsed(Instant)`
already uses), and inject `Clock` into `JpaUserCredentialsRepository` / `JpaPasswordResetTokenRepository`
exactly as `JpaRefreshTokenRepository` does.

## 3. P3 — Error-response timestamps bypass the clock seam

- `api/ApiErrorHandler.java:335,355,370` — `Instant.now(),` inside the throttled-response helpers.
- `config/SecurityConfig.java:224` — the same inside `writeError(...)`.

**Evidence.** Both sit next to Clock-aware code: `SecurityConfig.java:57-58` *publishes* the
`Clock` bean the rest of the app consumes, and `ApiErrorHandler` produces the `ErrorResponse`
whose `timestamp` (`api/ErrorResponse.java:15`) is the value at issue. Every other timestamp
producer takes the injected clock, so an error body's timestamp is the only one that cannot be
pinned in a test.

**Fix.** Inject `Clock` into `ApiErrorHandler` (it already has a constructor) and pass the
existing `Clock` bean into `securityFilterChain(...)`.

## 4. P3 — Javadoc still explains a removed feature (`minRating` / rating)

- `api/ShelterQueryService.java:56-58` — "M11 rating demotion: the `minRating` rating filter is
  gone — the rating is context, not a lever."
- `api/ShelterQueryService.java:116-117` — same sentence on the filter parameter.
- `api/ShelterController.java:103-105` — "the `minRating` rating filter is gone — the rating is
  context, not a lever; a stray `minRating` param is ignored, not an error".

**Evidence.** The whole review/rating model is gone: `src/main/resources/db/migration/V21__drop_reviews.sql`
drops `review_reports` and `shelter_reviews` (no rating column survives — `persistence/ShelterEntity.java`
has no rating field), so "the rating is context" describes a concept that no longer exists in the
codebase. The *behaviour* is deliberate and pinned by a test
(`src/test/java/ee/sheltermap/api/ShelterReportIT.java:894` sends `minRating=4` and expects the
unfiltered list), so only the wording is wrong.

**Fix.** Re-word to the surviving truth, e.g. "an unknown `minRating` query param is ignored for
API compatibility (the field was removed in V21); it is not an error" — drop "the rating is
context, not a lever".

## 5. P3 — Unbounded input on the dev-only test-send endpoints

- `api/EmailTestRequest.java:10-12` — `@NotBlank(message = "to is required") String to` (no size),
  `String subject` (no constraint at all).
- `api/SmsTestRequest.java:10-12` — same shape: `to` unbounded, `String message` unbounded.

**Evidence.** Reachable only under the dev/test profile — `config/DevEndpointsGuard` refuses to
boot with the diagnostic endpoints enabled outside `dev`/`test`, and both controllers are pinned
by allowlist ITs (`api/EmailTestControllerAllowlistIT`, `api/SmsTestControllerAllowlistIT`) — so
this is not production-exploitable. It is still the one place in the codebase where an unbounded
string is handed to an outbound sender (SMTP subject/body, SMS body).

**Fix.** `@Size(max = 255)` on `to`/`subject`, `@Size(max = 1000)` on `message`, matching the
bound-everything style of the rest of the `api` package.

## 6. P3 — Admin authorization rests on per-method discipline (currently complete)

- `api/AdminController.java` — all **15** mapped handlers call `requireAdmin()`
  (`:78, :87, :94, :107, :123, :136, :144, :158, :171, :185, :200, :208, :217, :230, :237`) and
  `requireAdmin()` (`:248`) does a fresh `UserKind.ADMIN` lookup per request.

**Evidence.** I verified each mapping individually and found **no missing guard** — this is a
hardening suggestion, not a defect. But the class has no class-level guard, and `SecurityConfig`
only enforces `anyRequest().authenticated()` (`config/SecurityConfig.java:212`), so the
`/admin/**` surface is protected purely by each new method remembering the call.

**Fix (defense in depth).** Add `.requestMatchers("/admin/**").hasAuthority("ADMIN")` next to the
existing permitAll list, or a `@AdminOnly` annotation checked by an interceptor, keeping
`requireAdmin()` as the cheap fresh-DB re-check.

## 7. P3 — `csrf.disable()` has no rationale in code

- `config/SecurityConfig.java:193` — `.csrf(csrf -> csrf.disable())`.

**Evidence.** The same file documents every other deviation (filter order at `:188-190`, each
permitAll entry at `:203-211`, CORS at `:176-186`). `SecurityConfig.java:194` sets
`SessionCreationPolicy.STATELESS` and `:178` sets `allowCredentials(true)`, so disabling CSRF is
defensible for a Bearer-header API — it just reads as an unexplained exception to the file's own
documentation standard.

**Fix.** One comment naming the reason (stateless `Authorization: Bearer` auth, no cookie
session) plus a pointer to the relevant `docs/security/threat-model.md` section (verify that
document records the decision; if it does not, add it there too).

## 8. P3 — Tracked TODOs (not defects; list so they are not lost)

- `api/ShelterController.java:57` — "nearest/bbox queries need GeoService + PostGIS GIST index;
  paging (limit/offset) — Estonia-scale data is small. TODO: add when it grows."
- `src/main/resources/application.yml:215` — "Licence wording stays unasserted until the
  publisher's explainer PDF is readable (marked TODO in design.md)."

**Fix.** None now; ensure both are carried into the autopilot ledger as `HUMAN`/deferred items so
they are not silently dropped.

## 9. P3 — `PaasteametRegistryClient` is a dead-by-default path

- `ingestion/PaasteametRegistryClient.java:39` — `@ConditionalOnProperty(name = "app.registry.client", havingValue = "paasteamet")`
  (the misleading `matchIfMissing = true` was removed in the current batch).
- `src/main/resources/application.yml:196-209` documents the WFS upstream as dead and the default
  as `csv`.

**Evidence.** The class activates only when explicitly selected and has its own test
(`ingestion/PaasteametRegistryClientTest`), so it is a documented seam rather than accidental dead
code — but nothing in the class itself says so.

**Fix.** Either add one javadoc line pointing at the csv-default/upstream-dead decision, or delete
the client if the WFS is permanently retired.

---

## Verified correct (explicitly checked, no action)

- **No secrets or credentials in logs.** Only three log statements sit near sensitive words and
  none logs a value: `auth/AdminSeeder.java:74` (policy message), `config/DevSenderGuard.java:64`
  and `config/ProdJwtGuard.java:63` (refusal messages).
- **Entity boundary holds.** Zero `import ee.sheltermap.persistence.*` outside the `persistence`
  package — no entity escapes into `api`/`app`/`auth`; `persistence/UserMapper` and the `*Entity`
  classes stay internal, and callers pass `domain`/DTO types (`domain/UserData.java:6-8`).
- **The SMART_ID stub cannot 500.** `verification/SmartIdVerificationProvider` throws
  `UnsupportedOperationException`, but `auth/VerificationController.java:86-90` rejects SMART_ID
  up front with a 400 — pinned by `auth/VerificationControllerIT.java:148-155` (asserts
  "eID verification is not available yet."), and the stub's own throw is pinned by
  `verification/VerificationServiceTest.java:156`.
- **SSRF posture of the location resolver is implemented exactly as documented.**
  `app/LocationResolveService.java:62` pins the entry host, `:190-222` re-validates every hop
  (http/https only, same scheme, default port, Google host set), `:31-33` ≤3 manual hops,
  `:42-45` ~10 s monotonic walk budget, `:158-160` drops pasted `user:pass@` userInfo, `:52-56`
  maps every failure to one generic 400/502 with no enumeration — pinned by
  `app/LocationResolveServiceTest` and `api/LocationResolveIT`.
- **The security chain is default-deny with an explicit, commented allow-list.**
  `config/SecurityConfig.java:212` (`anyRequest().authenticated()`), `:203-211` (public auth +
  shelter GETs + `/api/data-source` + actuator health), `:205-206` (`/api/shelters/mine` is
  `authenticated()` — explicitly *not* part of the public GET glob), `:188-190` (hardening
  headers registered before the JWT filter so 401/403 bodies carry them).
- **Error handling is uniform and complete.** `api/ApiErrorHandler` carries ~30 typed
  `@ExceptionHandler`s (validation, malformed, 405, each domain exception, throttling families,
  `DataIntegrityViolationException`, `TransactionSystemException`, auth 401/403 group) plus an
  `Exception.class` catch-all producing one `ErrorResponse` shape
  (`api/ErrorResponse.java:15`) — with a documented note (`:93-97`) on why 405 needs its own
  handler instead of falling into the 500 catch-all.
- **Validation parity inside `api`.** Every request record bounds its text/numbers to the DB
  column (`api/CreateShelterRequest.java:24-29`, `api/UpdateShelterRequest.java:23-28`,
  `api/ShelterReportRequest.java:14-15`, `api/AdminMarkInaccurateRequest.java:12`,
  `api/AdminShelterReviewRequest.java:16-17`, `api/OpenStatusReportRequest.java:12`,
  `api/OccupancyReportRequest.java:11`).
- **Migration ↔ code consistency after the review-model removal.** `V21__drop_reviews.sql` drops
  `review_reports` then `shelter_reviews` in FK order and deletes the legacy
  `REVIEW_HIDE`/`REVIEW_RESTORE` (`moderation_actions`) and `REVIEW_REPORT` (`report_actions`)
  rows; the enums no longer declare those values (`app/ModerationAuditLog.java:28-33`,
  `app/ReportActionLog.java:20-23`, `app/ShelterHistoryLog.java:33-36`). No orphan enum value or
  orphan column remains.
- **No production-dead repository seam left among the methods checked.**
  `ShelterRepository.findAll` (`api/ShelterQueryService.java:390`), `findAllActiveBySourceIn`
  (`:123`, `app/ShelterService.java:185`), `findByIds` (`api/AdminModerationService.java:397`),
  `countByCreatedByAndSourceAndReviewStatus` (`app/ShelterReportService.java:254`),
  `ShelterReportRepository.findAll` (`api/AdminModerationService.java:275`), and the
  occupancy/open-status `findByShelterIdAndUserId` (`api/ShelterQueryService.java:314,327`;
  `app/ShelterReportService.java:185,221`) all have production callers. The four seams removed in
  the current batch are confirmed gone (`findActiveBySourceAndReviewStatus`,
  `countActiveByUserId`, `markUsed`, `findByTokenHash` — 0 references).
- **Public-type javadoc coverage.** Every `public record` in `api`/`auth`/`ingestion`/`alerts`
  carries a preceding doc comment with field semantics; the only *misleading* doc found is item 4.

## Test gaps (concrete, named)

1. **`auth/AccountService` — no direct unit test.** Only `auth/AccountControllerIT`,
   `auth/AccountDataExportIT` and `auth/AccountDeletionIT` exercise it over HTTP. Its
   erasure/export orchestration (purge declared private homes, redact moderation-audit reasons on
   the user's shelters — `auth/AccountService.java:113-128`, null-out authorship without touching
   trust state) is the most consequential untested unit in `auth`, and the peer services all have
   focused fake-based tests (`auth/ContactChangeServiceTest`, `auth/PasswordResetServiceTest`).
2. **`config/JwtAuthenticationFilter` — no test file references it.** Token-parse/accept/reject
   behaviour is covered only indirectly by authenticated ITs. Add a unit test: valid token →
   principal `Long`, expired/malformed/absent header → anonymous (so the 401 entry point fires).
3. **`config/RateLimitProperties` — no test.** Binding-only; low value, noted for completeness
   (behaviour is covered by `auth/AuthRateLimitIT`, `auth/VerificationThrottleIT`,
   `api/ReportThrottleIT`).
4. **`app/HttpUrlRedirectClient` — no test.** It is the real IO adapter behind the injected
   `RedirectClient` seam (fakes are used in `app/LocationResolveServiceTest` and
   `api/LocationResolveIT`), so this is acceptable *if* deliberate — worth one javadoc line saying
   the adapter is intentionally untested and why.
5. **Check-only (already covered, listed to show the sweep):** `security/PiiKeys` +
   `security/PiiCrypto` (`security/PiiCryptoTest`), `ingestion/DevRegistryClient`
   (`api/DataSourceApiIT`, `ingestion/RegistryImportIT`), `app/AppInfo`
   (`auth/PasswordResetServiceTest`, `verification/SmtpPulseSmtpSenderTest`),
   `app/ShelterHistoryChanges` (`api/AdminModerationServiceTest`), `app/MapsUrlCoordinates`
   (`app/MapsUrlCoordinatesTest`), `alerts/ThrottleAlertRecorder` (`alerts/ThrottleAlertRecorderTest`),
   `migration/V13PiiEncryptionMigration` (`security/PiiAtRestIT`).

## Cross-cutting residue found while walking the backend (hand off to the docs/PUML lane)

- `qa/feature-matrix.md:16` lists `review_reports` as a live V9 table — dropped by V21.
- `context-and-tasks/05-shelter-api.puml:443-445,854-856,941-945`,
  `context-and-tasks/agent/06-CONTEXT-API.md:23,96-97,122,316,346`,
  `context-and-tasks/agent/07-STEPS.md:103-104,358,373,382` still diagram/document the V9-era `shelter_reviews` / `review_reports` / `minRating` model —
  removed by `V21__drop_reviews.sql` (which drops `shelter_reviews` and `review_reports`); the
  live admin surface has 15 `AdminController` mappings and six tabs, no review-report queue.
- `docs/security/threat-model.md:91` — "star display stays" is now false; the star display was
  removed with the review model (V21).
- **Backend evidence contradicts a frontend comment touched in the current batch:** the
  admin-audit JSDoc moved onto `AdminAuditRow` in `frontend/src/app/core/models.ts` says the
  `REVIEW_HIDE`/`REVIEW_RESTORE` values "persist in historical rows" — `V21__drop_reviews.sql`
  deletes exactly those rows, and `app/ModerationAuditLog.java:28-33` no longer declares the
  values, so the audit tab can never render them.

## Limits of this inventory

Read/grep only — no compilation, no test execution, no runtime probing, so nothing here is
execution-verified (the orchestrator owns the `mvn` gate). Packages walked: `alerts`, `api`,
`app`, `auth`, `config`, `domain`, `ingestion`, `migration`, `persistence`, `security`,
`verification` (~250 production files) plus the 118 test files; migrations V1–V22 (V13 is the
Java `V13PiiEncryptionMigration`) were read for consistency claims. The 10 `.puml` files were
checked only where a backend fact (endpoint/table/flow) is asserted in them.
