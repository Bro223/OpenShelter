# Agent 2 — Backend clean code & dead code

Read-only review. No source file was modified; the only file written is this report.
Scope: `src/main/java` (491 files, 27 705 lines) plus `pom.xml`; test-scope dead code reported
only where it is unambiguous. Generated/vendor folders (`target/`, `node_modules/`,
`.angular/`) excluded.

## Versions detected (judged against these)

| Component | Version | Evidence |
|---|---|---|
| Java | 21 (toolchain: Temurin 21.0.7) | `pom.xml:16`, `java -version` |
| Spring Boot | 3.3.13 (`spring-boot-starter-parent`) | `pom.xml:7` |
| Build | Maven 3.9.16, **no** `mvnw` wrapper in the repo | `mvn -v`; no `mvnw*` files |
| JPA / Hibernate | 6.5.3.Final, `ddl-auto: validate`, `open-in-view: false` | resolved tree; `application.yml:10-13` |
| Flyway | 10.10.0 (`flyway-core` + `flyway-database-postgresql`) | resolved tree |
| Security | Spring Security 6.3.10, jjwt 0.12.7, BouncyCastle 1.78.1 (Argon2) | `pom.xml:9`, resolved tree |
| API docs | springdoc 2.6.0 | `pom.xml:20` |
| Tests | JUnit 5 + AssertJ via `spring-boot-starter-test`, Testcontainers **2.0.5** | resolved tree, `pom.xml:86-98` |
| Lombok / JaCoCo / Checkstyle-SpotBugs-PMD | **not present** | no entry in `pom.xml` (grep) |
| Frontend (context only) | Angular 22, TypeScript 6.0, RxJS 7.8, Vitest 4 | `frontend/package.json` |

Verified with `mvn -o dependency:tree` (offline, exit 0): the `<testcontainers.version>2.0.5</testcontainers.version>`
property **is** honoured (`…version managed from 2.0.5`), so it is not a dead property — no finding there.
`mvn -o compile` and `mvn -o test-compile` both exit 0 on the tree as reviewed.

## Correct — areas that are clean, with evidence

- **No debug leftovers.** `grep -rn "System\.out\|System\.err\|printStackTrace" src/main/java` → 0 hits.
- **No TODO/FIXME/XXX/HACK.** The only matches are `372XXXXXXX` phone-format placeholders in a javadoc
  (`PhoneNumbers.java:27-28`).
- **No commented-out code.** A heuristic scan for `// <code>` across `src/main/java` returns only
  explanatory prose comments (12 hits, all sentences).
- **No `Optional` abuse.** Zero bare `Optional.get()` calls in `src/main/java`; all 30+ `Optional` returns
  are consumed with `orElseThrow`/`map`/`ifPresent` (e.g. `GuidanceService.java:1031`, `MediaService.java:230`).
- **No stream misuse.** 55 × `Stream.toList()`, 0 × `Collectors.toList()`, no parallel streams, no
  `stream().forEach(...)`, no collectors-in-loops.
- **Injection discipline.** Zero field injection; the only four `@Autowired` annotations are on
  constructors that coexist with a package-private test-seam constructor
  (`LocationResolveService.java:78`, `TwilioSmsSender.java:46`, `ShelterImportService.java:73`,
  `HeroImageImportService.java:110`) — they are required there, not a smell.
- **No unused beans.** All 13 `@Bean` methods plus the 8 `RateLimiter` beans are injected somewhere and
  verified by name/`@Qualifier` (`loginRateLimiter` → `AuthController.java:63`, … `geoResolveRateLimiter`
  → `LocationController.java:64`). `PiiMigrationConfig.v13PiiEncryptionMigration()`
  (`migration/PiiMigrationConfig.java:16`) looks unused but is **not** dead: Spring Boot's Flyway
  auto-configuration collects `JavaMigration` beans, which is how `V13PiiEncryptionMigration` gets its
  `PiiCrypto` (documented at `PiiMigrationConfig.java:8-12`, class implements `JavaMigration`).
- **No unused configuration properties.** All `app.*` leaves of `src/main/resources/application.yml`
  are bound by `@Value` or a `@ConfigurationProperties` record — including the 5 that a naive
  camelCase scan misses because the code uses kebab-case keys
  (`app.limits.otp-per-contact-window-hours`/`alerts-retained` → `SecurityConfig.java:123,137`;
  `app.media.import-connect-timeout`/`import-read-timeout` → `JdkHeroImageFetchClient.java:71-72`;
  `app.media.import-budget` → `HeroImageImportService.java:117`).
- **No orphan classes.** Every one of the 491 top-level types is referenced (component-scanned
  `@Component`/`@Configuration`, `@ConfigurationProperties`, JPA entities, or an injected type); the
  repository/verifier interfaces all have both a real implementation **and** in-memory test doubles
  (`src/test/java/ee/sheltermap/app/InMemory*.java`), so they are deliberate seams, not speculative
  abstraction.
- **pom.xml dependencies all used** (checked against `dependency:tree`): Testcontainers is used by 11
  test classes, jsoup/proj4j/twilio/spring-dotenv/bcprov all have real call sites. No unused dependency
  and no unused version property (see the `testcontainers.version` paragraph above — I checked it,
  it is honoured).
- **No nesting problem.** Maximum brace depth in `src/main/java` is 7
  (`MarkdownToHtml.java:259`); only 9 methods nationwide exceed depth 5.
- **Naming is clean.** All class files are `PascalCase`; a scan for `tmp`/`obj`/`data`/`info`/`res`
  declarations finds none; no `handle`/`process`/`doIt` catch-all methods.
- **No `@SuppressWarnings`, no `System.exit`, no `Thread.sleep` in a controller/service write path**
  (the two `Thread.sleep` calls are retry backoff in `CsvRegistryClient.java:239` and
  `JdkHeroImageFetchClient.java:233`).
- **Good counter-examples worth keeping**: the four startup guards share one rule
  (`Profiles.isDevTestOnly`, `config/Profiles.java:35`) instead of four copies; the guidance 404
  vocabulary is one shared constant (`GuidanceService.POST_NOT_FOUND_MESSAGE`, used by
  `AdminGuidanceController.java:176`); `ReporterTrust.of(...)` (`domain/ReporterTrust.java:52`) is the
  single source of truth for the trust formula.

## In-flight tree changes (attribution note — not reported as defects)

`git status` shows live edits by two other agents. I re-checked the tree several times while working;
two things are worth passing to the lead:

1. **The `SmtpSender`/`SmsSender` contract change is mid-flight.** `SmtpSender.send`/`SmsSender.send`
   changed `void` → `boolean` (`verification/SmtpSender.java:21`), and `VerificationService` moved the
   daily-slot record to *after* a successful send (`verification/VerificationService.java:169`). When I
   first ran `mvn -o test-compile` it failed (`RecordingSmtpSender`/`RecordingSmsSender` still declared
   `public void send(...)`); a few minutes later the other agent had updated both and
   `mvn -o test-compile` exits 0 again. So: transient, resolved, **not** a finding.
   Remaining consequence of that change for the *final* state: `VerificationSendLog.tryRecord(...)`
   (`verification/VerificationSendLog.java:52`, impl `FileVerificationSendLog.java:90`) now has **no
   production caller** — only `VerificationServiceTest` / `FileVerificationSendLogTest` call it
   (`grep -rn tryRecord src/main/java` → declaration + comment only). Whoever owns that change should
   either delete `tryRecord` or keep it with an explicit "test seam" note; I did not count it as a
   settled-tree defect.
2. **`ingestion/PaasteametRegistryClient.java` is being deleted** (with its test) and
   `RegistryProperties` is gaining a fail-closed client-vocabulary check. At HEAD the class was a
   `@ConditionalOnProperty(havingValue="paasteamet")` legacy opt-in, i.e. reachable by config, not dead
   (documented in `docs/autopilot/findings/backend-inventory.md:170`). I did not review the in-flight
   deletion.
3. `api/ShelterQueryService.java`, `api/ShelterController.java`, `app/UserRepository.java`,
   `persistence/JpaUserRepository.java` are mid-edit (`User caller` → `Long callerId` refactor). Findings
   below that cite those files are present in **both** HEAD and the working tree, so they survive the
   refactor.

## Findings

### High

**H1 — The admin authorization gate is copy-pasted into four controllers (single point of truth
violated on an auth check).**
- Locations: `api/AdminController.java:381`, `api/AdminMediaController.java:184`,
  `api/AdminGuidanceController.java:631`, `api/AdminSiteTextController.java:77`.
- Evidence: the four method bodies are byte-identical apart from the `void`/`long` return
  (`private void requireAdmin()` in `AdminSiteTextController`, `private long` in the other three); each
  contains the same `SecurityContextHolder` principal cast, the same
  `throw new InvalidAccessTokenException("Authentication required")`, the same
  `userRepository.isAdmin(userId)` check and the same
  `throw new AdminAccessException("Admin access required")`. Verified by hashing the normalised method
  bodies across the tree — 3 identical + 1 with a different return type. The javadoc of the fourth copy
  even names the duplication ("the same fresh per-request ADMIN kind lookup … the AdminController idiom",
  `AdminSiteTextController.java:75-76`).
- Why it matters: this is the only authorization barrier in front of the whole admin surface (the
  security chain deliberately leaves the in-handler re-check as defence in depth — see
  `config/SecurityConfig.java:243-244`, `config/JwtAuthenticationFilter.java:75`). A future hardening
  (e.g. requiring the ADMIN-kind *and* a non-suspended check, or a token-issued-at freshness rule) will
  be applied to the copy in front of the reviewer and silently missed in the other three. Same class of
  bug that produces authenticated-but-unauthorized endpoints, which is precisely why the check exists.
- Minimal fix: extract one collaborator, e.g. `api/AdminGate` (a `@Component` with
  `long requireAdmin(UserRepository, SecurityContext)`), and have all four controllers delegate to it;
  or hoist it into `JpaUserRepository`-adjacent code as `AdminAccess.currentAdminId(userRepository)`.
  No behaviour change, ~30 lines removed.

### Medium

**M1 — The trust-weight business rule is implemented twice, in two packages, and drives auto-hide.**
- Locations: `app/ShelterReportService.java:254-260` and `api/ShelterQueryService.java:740-748`.
- Evidence: both are `private int trustWeight(long userId)` with identical bodies — the same
  `countByCreatedByAndSourceAndReviewStatus(userId, USER, CONFIRMED) > 0` probe and the same
  `countByModeratorAndAction(userId, AUTO_CONFIRM)` probe feeding `ReporterTrust.of(...).weight()`; the
  only difference is the injected field names (`shelters`/`audit` vs `shelterRepository`/
  `moderationAudit`). The javadoc of the copy in `ShelterQueryService` cross-references the original by
  name ("the same {@code ShelterReportService#trustWeight}", line 736).
- Why it matters: the weight is the multiplier of the `NON_EXISTENT` tally that auto-hides a shelter
  (`ShelterReportService.java:143-145` with `ShelterReport.AUTO_HIDE_THRESHOLD = 5`). When the derivation
  gains a third input (or a probe is scoped/changed), one copy will be updated and the other will keep
  computing the old score — a silent moderation-logic divergence that no existing test can catch because
  the two are only compared by hand.
- Minimal fix: move the derivation onto the domain value, e.g.
  `ReporterTrust.of(userId, ShelterRepository, ModerationAuditLog)` or a small
  `ReporterTrustEvaluator` bean injected by both services; call sites stay one line each.

**M2 — Duplicated policy constants, including one that is dead and one that is a duplicated API
message.** Five distinct constant pairs/triples with the same value in different classes:
- `GuidanceService.java:124` `MEDIA_URL_PREFIX = "/api/media/"` is a **dead duplicate** of
  `guidance/MediaService.java:52`. Repo-wide grep: every call site uses `MediaService.MEDIA_URL_PREFIX`
  (`api/AdminMediaController.java:164`, `api/GuidanceController.java:161`,
  `api/AdminGuidanceController.java:602`); `GuidanceService`'s copy has zero references. Fix: delete
  line 124 (and consider one `MediaService.mediaUrl(MediaAsset)` helper for the 3×
  `PREFIX + getStoredFilename()` concatenation).
- `GuidanceService.java:112` `ASSET_NOT_FOUND_MESSAGE = "Media asset not found"` duplicates
  `MediaService.java:49`, and **both are live** (`MediaService.java:230`, `GuidanceService.java:939`).
  Two spellings of one 404 message means a reword fixes one path and not the other: keep the one in
  `MediaService` and reference it.
- `MAX_ATTEMPTS = 5` declared three times, all live: `verification/PhoneVerificationProvider.java:24`,
  `verification/EmailVerificationProvider.java:24`, `auth/PasswordResetService.java:53`. Same policy
  (wrong-code lockout), three independent copies (tests assert against each copy, so the tests will also
  keep passing after a drift). One constant in `verification` (importable from `auth`, which already
  imports it) would do.
- `MAX_REDIRECT_HOPS = 3` + `DEFAULT_BUDGET = Duration.ofSeconds(10)` duplicated in
  `app/LocationResolveService.java:66,72` and `guidance/HeroImageImportService.java:79,82`;
  `SWEEP_INTERVAL_MILLIS`/`SWEEP_THRESHOLD` duplicated in `auth/TokenBucketRateLimiter.java:21,23` and
  `verification/RollingContactOtpLimiter.java:63-64`. Lower risk (different features), listed for
  completeness — I would not spend a PR on these alone.
- Why it matters: the constants are the code's statement of a bound; two copies of a bound is a bug
  waiting for the first change, and the third copy (`MAX_ATTEMPTS`) is security-relevant.
- Minimal fix: delete the dead one, and point the duplicated API message at a single constant.

**M3 — `GuidanceService` is a god class: 1 236 lines, 645 code lines, 40 public methods, five
responsibilities.**
- Location: `guidance/GuidanceService.java`.
- Evidence (method groups by line): public reads (`:171, :203, :224, :249, :265, :288, :337`), post
  writes and lifecycle (`:365 :423 :500 :587 :620 :644`), manual ordering (`:689`, `:778`), translations
  (`:1051 :1081 :1107 :1122 :1142`), plus policy helpers for locale (`:862 :884 :918 :1183`), slug
  (`:992 :1016 :1201 :1224`), sanitisation (`:910`), hero pairing (`:928`) and import-URL shape
  (`:955`). It holds the largest method-length budget in the backend
  (two 72- and 62-line methods at `:778` and `:503`) and 7 injected collaborators.
- Why it matters: every guidance change — public read, admin CRUD, translation linking, ordering,
  validation — lands in one file that must be re-read in full; the two nearly-identical slug helpers and
  the three nearly-identical locale helpers (see M4) are the first symptom of the missing split.
- Minimal fix (incremental, no behaviour change): split by seam, not by line count —
  `GuidanceTranslationService` (translations + `attachExistingPostAsTranslation` + the two
  translation-slug helpers), `GuidanceOrderingService` (`reorder`, `reorderInLocale`, the order policy),
  and a package-private `GuidanceValidation` for locale/slug/title/hero policy, leaving post CRUD +
  publish lifecycle in `GuidanceService`. Each split is independently testable and the existing
  `GuidanceServiceTest` mostly keeps working.

**M4 — Duplicated helper implementations (identical bodies, different classes), including security
helpers.**
- `constantTimeEquals` ×3: `auth/Hashes.java:28` plus **two copies in the same package** —
  `verification/EmailVerificationProvider.java:94` and `verification/PhoneVerificationProvider.java:94`
  (bodies byte-identical, verified by body hashing). The javadoc justifies the local copy by the package
  dependency rule ("`auth.Hashes` is not importable from this package — auth already imports
  verification", `EmailVerificationProvider.java:90-93`) — that justifies *not importing `auth`*, but the
  two copies inside `ee.sheltermap.verification` are not justified by it: a package-private
  `verification/CodeHashes` would collapse them to one.
- `sha256Hex` ×2: `auth/Hashes.java:14` and `verification/PendingVerification.java:83` (`sha256`) —
  identical SHA-256→hex bodies for the same purpose (codes at rest). Same rule, same remedy.
- `truncate(String,int)` ×3: `persistence/JpaDataImportLog.java:58`,
  `persistence/JpaRetentionRunLog.java:32`, `retention/RetentionService.java:128` — identical bodies.
- `requireText(String,String)` ×2: `domain/GuidancePost.java:209`,
  `domain/GuidanceTranslation.java:160` — identical bodies.
- Why it matters: a constant-time comparison is a security primitive; three copies means a hardening
  change (e.g. switching to a byte-length-safe compare) can be applied to one copy. The lower-risk
  `truncate`/`requireText` copies are pure drift surface.
- Minimal fix: one package-private helper per package (or a neutral `ee.sheltermap.crypto`/`shared`
  package) and delete the others. ~25 lines removed.

**M5 — Duplicated slug-policy logic inside `GuidanceService` (four helpers, two rules).**
- Locations: `resolveSuppliedSlug` (`guidance/GuidanceService.java:992-1014`) vs `resolveTranslationSlug`
  (`:1201-1222`), and `nextGeneratedSlug` (`:1016-1027`) vs `nextGeneratedTranslationSlug`
  (`:1224-1236`).
- Evidence: the shape-validation block (`SlugFactory.isValidCustomSlug` + the identical
  `"slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most …"` message), the blank→keep-current
  short-circuit and the same-slug-is-not-a-collision rule are duplicated verbatim in the two
  `resolve*` helpers; the `if (!exists) return base; for (suffix = 2;; suffix++)` loop is duplicated
  verbatim in the two `next*` helpers. The only difference is the collision predicate
  (`posts.existsBySlug(slug)` vs `translations.existsByLocaleAndSlug(locale, slug)`).
- Why it matters: the slug contract is a public URL contract (D5) plus a DB uniqueness constraint
  (`V23__crisis_guidance.sql:71`, `V26` for the locale pair). A change to the allowed shape or to the
  collision message must be made in two places or the admin API answers inconsistently between the post
  and the translation endpoint.
- Minimal fix: parameterise both helpers over a `Predicate<String> slugTaken` (or a tiny
  `SlugPolicy` interface with `isTaken(String slug)`), giving one validation method and one
  generate-unique method.

### Low

**L1 — 14 unused imports in 13 files** (verified per file with a repo-wide word check; every one of them
has zero occurrences outside its `import` line):

| File:line | Import |
|---|---|
| `api/AdminModerationService.java:3` | `ee.sheltermap.app.AdminAccessException` |
| `api/AdminSiteTextController.java:6` | `ee.sheltermap.sitetexts.SiteTextEntry` |
| `api/AdminSiteTextController.java:24` | `java.util.List` |
| `api/EmailTestController.java:10` | `org.springframework.mail.MailException` |
| `api/ShelterController.java:14,18` | `ee.sheltermap.domain.OccupancyBand`, `…ShelterReportType` (both unused at HEAD as well: HEAD lines 15/19) |
| `auth/AccountController.java:30` | `java.util.List` |
| `config/OpenApiConfig.java:6` | `io.swagger.v3.oas.models.PathItem` |
| `guidance/MediaService.java:11,12` | `java.time.Instant`, `java.util.HashMap` |
| `guidance/SlugFactory.java:3` | `java.util.Locale` |
| `persistence/JpaDataImportLog.java:6` | `java.time.Instant` |
| `persistence/JpaShelterInfoRequestLog.java:14` | `java.util.List` |
| `persistence/SpringDataSiteTextRepository.java:5` | `java.util.List` |

Why it matters: only hygiene, but unused imports are the visible symptom of a dead-code review that
never ran; `javac` does not warn and the pom has no static-analysis plugin (see L8), so nothing else
catches them. Fix: delete the lines (IDE "optimise imports"); no behaviour change.

**L2 — Dead production declarations.**
- `guidance/GuidanceService.java:124` `MEDIA_URL_PREFIX` — dead duplicate (see M2).
- `sitetexts/SiteTextKeys.java:72-73` `DEFAULT_RESCUE_BOARD_URL` / `DEFAULT_MINISTRY_URL` — zero
  references repo-wide (`grep -rn` over the whole tree, including tests, frontend and docs). The values
  themselves are live but owned by the frontend
  (`frontend/src/app/core/i18n/site-texts.ts:106-107`), so the Java pair is a second copy of a
  frontend default that nothing reads.
- `app/ShelterHistoryChanges.java:34` `FIELDS` (public) — zero references repo-wide. Its only purpose is
  documentary ("the caller fills the map in this order"), and the ordering rule it encodes is enforced
  nowhere.
- `app/ShelterService.java:175` `findMine(long)` (public) — no production caller: the only usages are
  `ShelterServiceTest.java:113,120,123,326`. The author-scoped list is served by
  `ShelterQueryService.findByCreatedBy` (`api/ShelterQueryService.java:229`), which calls the repository
  directly, so `findMine` is an unreachable second path to the same data.
- `app/ShelterDuplicateException.java:28` `getExistingShelterId()` (public) — zero callers; the id is
  already interpolated into the exception message at construction (`:22-23`).
- `domain/ReporterTrust.java:68` `isBaseline()` (public) — only caller is `ReporterTrustTest.java:19`.
- Test scope: `ingestion/CsvRegistryClientTest.java:37` `LAST_MODIFIED_EPOCH` — declared, never used
  (`LAST_MODIFIED` next to it is used 9×).
- Why it matters: Low individually, but six dead declarations in the main tree are what makes a
  "is this used?" question expensive for the next reader; `findMine` in particular invites a future
  caller to bypass the projection that applies the bbox/trust filters.
- Fix: delete; keep `FIELDS` only if a code path iterates it (it does not today).

**L3 — No-op null guard on a primitive.** `domain/ReporterTrust.java:53`:
`Objects.requireNonNull(Boolean.valueOf(crossVerifiedSubmission), "crossVerifiedSubmission")`.
`Boolean.valueOf(boolean)` can never return `null`, so the guard can never fire; it reads as if a null
check exists where none can. (Contrast the neighbouring `ownAutoConfirms < 0` check at `:54-56`, which is
real.) Fix: delete the `requireNonNull` line, keep the range check. This is the only occurrence of the
pattern in `src/main/java`.

**L4 — Locale bound is enforced in three of the four locale helpers, contradicting the documented
"service is the authority" contract.** `guidance/GuidanceService.java:918` `localeOrDefault` returns
`locale.trim()` without the `MAX_LOCALE_LENGTH` check that `resolveLocale` (`:862`) and `requireLocale`
(`:1183`) apply; it is reachable from both write entry points (`:372`, `:430`) via
`api/AdminGuidanceController.java:217,270`. Today the controller's `@Size(max = 5)`
(`api/CreateGuidancePostRequest.java:31`, `api/UpdateGuidancePostRequest.java:30`) masks it, but the DTO
javadoc claims the mirror is belt-and-braces ("the service re-checks everything — it is the authority,
the annotations are the early 400", `CreateGuidancePostRequest.java:12-13`) — which is not true for this
field, and the column is `VARCHAR(5)` (`V23__crisis_guidance.sql:54`), so a bypass is a
`DataIntegrityViolation` → 500 rather than a 400. Fix: have `localeOrDefault` delegate to
`resolveLocale` (the only difference is the null/blank → default behaviour, which `resolveLocale` already
implements at `:863-865`).

**L5 — Boolean-flag overloads make the shelter projection unreadable.**
`api/ShelterQueryService.java:229-243` (HEAD `:229-238`) declares `toDtos(shelters, caller)`,
`toDtos(shelters, caller, withPulse)` and `toDtos(shelters, caller, withInfoRequests, withPulse)`, where
the two short overloads exist only to default the flags; the resulting call site is
`toDtos(shelterRepository.findByCreatedBy(userId), null, true, false)`
(`ShelterQueryService.java:230`) — three positional values whose meaning is only discoverable by
jumping to the private 4-arg method. Fix: a small projection-options record
(`record Projection(boolean infoRequests, boolean pulse)`) with named constants (`MINE`, `DETAIL`,
`PUBLIC`), or two named methods. No behaviour change. (This code exists in both HEAD and the current
working tree; the in-flight `User`→`Long` refactor does not touch the flags.)

**L6 — Global lat/lng bounds are re-typed in six places, and the same 400 vocabulary in two.**
`-90/90/-180/180` appear as literals in `domain/GeoPoint.java:16`, `domain/BoundingBox.java:20,23`,
`app/MapsUrlCoordinates.java:197`, `ingestion/RegistryShelterParser.java:70`,
`api/ShelterController.java:513,516`. `GeoPoint` already publishes the *Estonia* box constants
(`:7-10`) but not the global ones. The controller/service duplication is documented and deliberate
(`BoundingBox.java:9-11` explains the friendly 400s come first), so this is a Low: hoist
`LAT_MIN/LAT_MAX/LNG_MIN/LNG_MAX` (and one `requireCoordinateRange` helper) next to `GeoPoint` so the
message text exists once.

**L7 — Magic strings that live as literals in several files, next to constants that do exist.**
- `"Unknown"` for a dangling actor/user is inlined 6× (`api/AdminModerationService.java:302,306,429,467,505`,
  `api/ShelterQueryService.java:547`) and is promised as API vocabulary in five javadocs/records
  (`AdminShelterDto.java:40,97`, `AdminAuditDto.java:20`, `AdminShelterHistoryDto.java:16`, …), while the
  same class family already has a constant for a neighbouring case
  (`AdminModerationService.java:88` `DELETED_ACCOUNT_NAME = "Deleted account"`, asserted by tests at
  `AdminModerationServiceTest.java:329,462`). One `DANGLING_ACTOR_NAME` constant (or reusing the existing
  one where the spec means the same thing) removes the drift.
- `"Authentication required"` is inlined 9× (`config/SecurityConfig.java:205`,
  `api/AdminController.java:384`, `api/AdminMediaController.java:187`, `api/AdminGuidanceController.java:634`,
  `api/AdminSiteTextController.java:80`, `api/ShelterController.java:600`,
  `auth/AccountController.java:254,279`, `auth/VerificationController.java:168`) — belongs with the
  `InvalidAccessTokenException` type (M/H1 fixes three of these by construction).
- `ShelterLimitExceededException.java:12` hardcodes `"The limit of 10 active shelters has been reached"`
  while the actual bound is `ShelterService.MAX_ACTIVE_SHELTERS_PER_USER = 10`
  (`app/ShelterService.java:54`, enforced at `:128`): changing the constant silently makes the user-facing
  409 message lie. Interpolate the constant.
- `GuidanceService.java:871,904,962,1000,1190,1209` repeat `" characters"` in six hand-built validation
  messages — a `maxLength(String field, int max)` helper would centralise the wording.

**L8 — `ApiErrorHandler` is 36 near-identical handler methods, and the error body is built by hand in
three further places.** `api/ApiErrorHandler.java` has 36 `@ExceptionHandler` methods; the bodies
collapse to 5 distinct shapes (10 × `CONFLICT, ex.getMessage()`, 8 × `BAD_REQUEST, ex.getMessage()`,
2 × `TOO_MANY_REQUESTS`, 2 × `BAD_GATEWAY`, 1 × `PAYLOAD_TOO_LARGE` — counted), and the class already
proves the grouping idiom works (`@ExceptionHandler({ConstraintViolationException.class,
HttpMessageNotReadableException.class, …})` at `:101-105`). Additionally the `ErrorResponse` body is
constructed by hand at `:441` and `:461` (the two throttled handlers need a `Retry-After` header, so they
cannot call the private `error(...)` helper at `:475` as-is) and once more outside the advice at
`api/AdminSiteTextController.java:88-96` — three copies of
`new ErrorResponse(clock.instant(), status.value(), status.getReasonPhrase(), message, request.getRequestURI())`.
Why it matters: the uniform error contract (uniform status/reason/URI per `ApiErrorHandler.java:70-77`) is
the thing clients depend on; four construction sites is four places to forget a new field. Fix (Low,
mechanical): group handlers by status into `@ExceptionHandler({A.class, B.class, …})` methods, give the
private helper an optional header parameter, and map `SiteTextValidationException` in the advice instead
of the controller. ~60 lines removed, identical responses.

**L9 — 7 copies of "parse comma-separated config property into a set".** Identical 4-line stream
pipelines at `auth/AuthController.java:81-84`, `auth/AccountController.java:100-103`,
`auth/VerificationController.java:83-86`, `api/LocationController.java:70-73`,
`api/EmailTestController.java:68-72`, `api/SmsTestController.java:54-58` and
`config/SecurityConfig.java:170` (CORS origins). Two variants exist (with/without
`.map(s -> s.toLowerCase(Locale.ROOT))`), so the helper needs a lowercase flag or two methods. Fix: one
`CommaSeparatedSet.parse(String)` utility; the `ClientIps` helper (`auth/ClientIps.java`) already shows
the right shape for shared request-handling logic.

**L10 — `MarkdownToHtml` (411 lines) has no production caller; its only consumer is a test-scoped
driver, and that driver re-declares its patterns.** `guidance/MarkdownToHtml.java` is called only from
`src/test/java/ee/sheltermap/guidance/MarkdownMigrationDriver.java:266,303` and
`MarkdownToHtmlTest.java:30`; the class javadoc explains it is kept deliberately as "the one-shot
migration tool's engine and the reference implementation of the content rules", so I am **not** calling it
dead — but two copies of its rules exist:
`MarkdownMigrationDriver.java:540-546` (`MarkdownToHtmlTestPatterns`) re-declares the HEADING/BULLET/
NUMBERED/QUOTE regexes, and `SAFE_HREF` (`MarkdownMigrationDriver.java:68`) duplicates
`MarkdownToHtml.SAFE_PROTOCOL` (`:85`) in `(?i)` form; the fence/HR patterns are re-typed a third time
inside `mdText` (`:477-489`). Fix: expose the patterns from `MarkdownToHtml` (package-private) and have
the driver use them, or move both into one test-scope class. Low, test-scope.
Separately, `MarkdownToHtml.convert` is the longest method in the backend (128 lines,
`MarkdownToHtml.java:99-226`) — the block loop's per-block bodies (heading / bullet / numbered / quote /
code fence) are separable into 5 stateless helpers; the code is correct and readable, so this is a
readability-only note, not a defect.

**L11 — No static analysis or coverage gate in the build, so none of the above is mechanically
caught.** `pom.xml:172-191` declares only `spring-boot-maven-plugin` and `maven-surefire-plugin`; there is no
SpotBugs/PMD/Checkstyle, no `maven-enforcer`, and no JaCoCo (grep for `jacoco`/`lombok` → no hits).
Fix (Low, one-off): add SpotBugs (`UnusedImports`/`UUF_UNUSED_FIELD`/`UPM_UNCALLED_PRIVATE_METHOD` would
have found L1 and most of L2 in one run) or PMD's `UnusedPrivateField`/`UnusedLocalVariable` rules, wired
to `mvn verify`. This is the only finding that prevents recurrence rather than fixing instances.

### Observations (checked, not findings)

- `mvn test` deliberately runs the 61 `*IT` classes through surefire together with the unit tests
  (`pom.xml:180-189` includes `**/*IT.java`), and the README documents exactly that command
  (`README.md:36,477-479`). Intentional, not a misconfiguration.
- `SmartIdVerificationProvider` (`verification/SmartIdVerificationProvider.java:33,40`) throws from both
  methods and its unused `RegisteredUser user` parameters are unused in every implementation of
  `VerificationProvider.confirm` (`:37`) — deliberate documented v1 stub
  (`:7-17`), and the parameter is the seam for the future PKI flow. Not reported as dead code.
- `AdminSeeder.run(ApplicationArguments args)` (`auth/AdminSeeder.java:81`) ignores `args` — normal for an
  `ApplicationRunner`.
- `Thread.sleep` in `ingestion/CsvRegistryClient.java:239` and `guidance/JdkHeroImageFetchClient.java:233`
  (the latter inside the publish transaction) is left to the performance agent (agent 5); it is retry
  backoff, not debug code.

## Top 5 findings

1. **H1 — the admin authorization gate exists in four byte-identical copies**
   (`AdminController.java:381`, `AdminMediaController.java:184`, `AdminGuidanceController.java:631`,
   `AdminSiteTextController.java:77`). Highest-priority item: an auth check with no single point of truth
   drifts into an authorization gap. Extract one `AdminGate` collaborator.
2. **M1 — the trust-weight rule is implemented twice** (`ShelterReportService.java:254` and
   `ShelterQueryService.java:740`) although it multiplies the tally that auto-hides a shelter
   (`AUTO_HIDE_THRESHOLD = 5`). Behavioural duplication in moderation logic; move it onto
   `ReporterTrust`/one evaluator.
3. **M3 — `GuidanceService` is a 1 236-line god class** (645 code lines, 40 public methods, five
   responsibilities, two 60-70-line methods); it is also the reason M5's four near-duplicate slug helpers
   exist. Split translations / ordering / validation out of it.
4. **M2 — duplicated and dead constants**: `GuidanceService.MEDIA_URL_PREFIX:124` is a dead duplicate of
   `MediaService.MEDIA_URL_PREFIX:52`; `ASSET_NOT_FOUND_MESSAGE` is duplicated and both copies are live
   (`MediaService.java:49` + `GuidanceService.java:112`); `MAX_ATTEMPTS = 5` is declared three times
   (`PhoneVerificationProvider.java:24`, `EmailVerificationProvider.java:24`,
   `PasswordResetService.java:53`). Delete the dead one, single-source the rest.
5. **L1 + L2 — dead-code hygiene**: 14 unused imports across 13 files, plus six dead declarations
   (`GuidanceService.java:124`, `SiteTextKeys.java:72-73`, `ShelterHistoryChanges.java:34`,
   `ShelterService.findMine:175`, `ShelterDuplicateException.getExistingShelterId:28`,
   `ReporterTrust.isBaseline:68`), and the L8 no-op `requireNonNull` on a primitive
   (`ReporterTrust.java:53`). All verified by repo-wide search; all removed with zero behaviour change,
   and L11 (a static-analysis plugin) is what would keep them from coming back.
