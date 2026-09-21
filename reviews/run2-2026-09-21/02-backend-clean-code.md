# Agent 2 — Backend clean code & dead code

Read-only review. No source file was modified; the only file written is this report.
Scope: `src/main/java` (**345** files, 28 442 lines) plus `pom.xml`; test scope reported only where it is
unambiguous. Generated/vendor folders (`target/`, `node_modules/`, `.angular/`, `dist/`) excluded.
There are no templates in this project (`src/main/resources` holds only `application.yml` + `db/migration`
SQL), so the "check templates" rule reduces to checking annotations/reflection — done, see *Traps*.

Tree state reviewed: `d247007` + the uncommitted admin-list lane (`AdminController.java`,
`AdminModerationService.java`, `ShelterQueryService.java`, `AdminModerationIT.java`,
`GuidanceServiceTest.java`, new `AdminGuidanceSearchPagingIT.java`; the other entries are `docs/`, the frontend, another agent's report and this file). `mvn -o test-compile` exits 0 on this tree.

## Versions detected (the tree is judged against these — **they changed since run 1**)

| Component | Version | Evidence |
| --- | --- | --- |
| Java | 21 (class files major 65) | `pom.xml:16`; `javap -v target/classes/.../AdminController.class` |
| Maven | 3.9.16, **no wrapper** in the repo; Maven itself runs on JDK 27, the project still compiles to 21 | `mvn -v`; `ls mvnw*` → nothing |
| Spring Boot | **3.5.16** (run 1 reported 3.3.13) | `pom.xml:8` |
| Spring Framework / Security | 6.2.19 / **6.5.11** | `spring-boot-dependencies-3.5.16.pom:200` + local repo |
| Hibernate / Flyway | 6.6.53.Final / **11.7.2** | `spring-boot-dependencies-3.5.16.pom` |
| API docs | springdoc 2.8.17 | `pom.xml:24` |
| Others | jjwt 0.12.7, jsoup 1.23.2, proj4j 1.3.0, twilio 10.9.2, bcprov 1.78.1, spring-dotenv 4.0.0 | `pom.xml` |
| Tests | JUnit 5 + AssertJ (starter-test), Testcontainers **2.0.5** (a deliberate override of Boot's managed 1.21.4, needed because 2.x renamed the artifacts to `testcontainers-junit-jupiter`/`-postgresql`) | `pom.xml:15,163-170`; `testcontainers-bom/2.0.5` in `~/.m2` |
| Lombok / JaCoCo / SpotBugs / PMD / Checkstyle / enforcer | **not present** | no entry in `pom.xml` |
| Frontend (context only) | Angular ^22.1.0, TypeScript ~6.0.2, RxJS ~7.8.0, Vitest ^4.0.8 | `frontend/package.json` |

## Verdict on the previous sweep (confirm / correct / contradict)

Everything run 1 reported as **fixed by `101dbe4` ("refactor: one admin check, one trust rule, one set of
helpers") is genuinely fixed** — I re-verified each by call-site search, not by trusting the commit:

| run 1 finding | Status today | Evidence |
| --- | --- | --- |
| **H1** `requireAdmin()` ×4 | **Confirmed fixed, and complete on the ADMIN path.** `api/AdminAccess.java:45-54` is the only implementation; the four controllers inject it and every handler calls `adminAccess.requireAdmin()` (15 call sites in `AdminController`, 3 in `AdminMediaController`, 13 in `AdminGuidanceController`, 1 in `AdminSiteTextController` = 32). `userRepository.isAdmin(` has exactly one API-site left (`AdminAccess.java:51`; the other three are `ShelterService`, which is a different rule). | grep `requireAdmin\|AdminAccess`, `isAdmin(` |
| **M1** trust weight ×2 | **Confirmed fixed.** `app/ReporterTrustEvaluator.java:24-46` is the single derivation; `ShelterReportService.java:91` and `api/ShelterQueryService.java:101` both inject it. No `trustWeight` method survives anywhere. | grep `trustWeight` → 0 |
| **M2** `GuidanceService.MEDIA_URL_PREFIX` dead duplicate | **Confirmed fixed** — deleted. | Only `guidance/MediaService.java:50` remains, and all 3 call sites use it. |
| **M2** `ASSET_NOT_FOUND_MESSAGE` live in two classes | **Confirmed fixed** — one constant. | `MediaService.java:47`, used by `MediaService.java:228` and `GuidanceService.java:1011`. |
| **M2** `MAX_ATTEMPTS = 5` ×3 | **Confirmed fixed** — one constant. | `verification/CodePolicy.java:13`, consumed by both providers and by `PasswordResetService.java:275`. |
| **M4** `constantTimeEquals` ×3 / `sha256Hex` ×2 | **Confirmed fixed** — one implementation. | `verification/CodeHashes.java:25,39`; `auth/Hashes.java:16,21` is a documented two-line delegate, not a third body. |
| **M4** `truncate` ×3 / `requireText` ×2 | **Confirmed fixed** — one helper each. | `app/TextTruncation.java:15` (4 call sites), `domain/TextValidation.java:13`. |
| **M5** duplicated slug policy | **Confirmed fixed** — parameterised, not copied. | `resolveSuppliedSlug`/`nextGeneratedSlug` now take `Predicate<String> slugTaken` (`GuidanceService.java:1076,1112`); the translation variants delegate (`:1071,:1108`). |
| **L1** 14 unused imports | **Confirmed fixed**, with one new exception. | Full-tree scan finds exactly one unused import left, and it is *new* (L1 below), from the uncommitted lane. |
| **L2** six dead declarations | **Confirmed removed** — 0 hits repo-wide. | `SiteTextKeys.DEFAULT_RESCUE_BOARD_URL`/`DEFAULT_MINISTRY_URL`, `ShelterHistoryChanges.FIELDS`, `ShelterService.findMine`, `ShelterDuplicateException.getExistingShelterId`, `ReporterTrust.isBaseline`, `CsvRegistryClientTest.LAST_MODIFIED_EPOCH`. |
| **M3** `GuidanceService` god class | **Confirmed, and it got worse**: 1 236 → **1 291** lines. | The lane added `searchableBody`, `matchesSearch` and the generic `slice` to it; numbers corrected below (F5). |
| **L3..L11** | Not fixed. | See F6 and L4-L8; I re-verified each rather than repeating run 1. |

Two **corrections** to run 1:
1. **The version table was stale** (see above). Run 1 judged `GuidanceService`'s stream/`Optional` usage and
   the `springdoc` note against Boot 3.3.13 / Spring Security 6.3.10; the tree is on 3.5.16 / 6.5.11.
   Nothing I found changes as a result, but the sweep's premise was wrong.
2. **run 1's H1 fix is only half done.** It consolidated the *ADMIN* check and counted the remaining
   `"Authentication required"` literals as a cosmetic Low. The *authenticated-user* primitive underneath it
   is still copy-pasted five times (F3) — including twice inside `AccountController`. That is the same root
   cause run 1 rated High, so the area is not closed.

## Correct — areas I found clean (with evidence)

- **No debug leftovers in `src/main/java`**: `grep -rn "System\.out\|System\.err\|printStackTrace"` → 0 hits.
  (All 20 `System.out` hits in `src/test` are in `src/test/.../MarkdownMigrationDriver.java`, a one-shot CLI
  driver whose whole purpose is stdout.)
- **No TODO/FIXME/XXX/HACK** in main or test; the only matches are the phone-format placeholder
  `372XXXXXXX` in `verification/PhoneNumbers.java:27-28`.
- **No commented-out code**: a regex scan for `// <statement>` over `src/main/java` returns 2 hits, both
  prose sentences (`auth/AuthService.java:144`, `api/ShelterController.java:269`).
- **No `Optional` abuse**: no bare `Optional.get()`; every `.get()` hit is a `Supplier`/`AtomicReference`.
- **Streams**: 0 × `Collectors.toList()`, 0 × `parallelStream`, no collectors inside loops; the
  `Collectors.toUnmodifiableSet()` uses in the new `app/CommaSeparated.java` are the right idiom.
- **Injection discipline**: 0 field injections. The 6 `@Autowired` constructors
  (`LocationResolveService:78`, `TwilioSmsSender:47`, `PasswordResetService:101`, `ContactChangeService:86`,
  `ShelterImportService:73`, `HeroImageImportService:110`) each sit beside a documented test-seam
  constructor that passes `null` for the optional `PlatformTransactionManager` — required, not a smell.
- **No orphan classes / dead beans**: every top-level type is either component-scanned
  (`@Service`/`@Repository`/`@Configuration`/`@SpringBootApplication`) and injected by interface type, or an
  entity/DTO reached from a mapper. The 19 types with zero textual references are all of that kind
  (verified individually: `config/RegistryRunConfig`, `config/MediaConfig`, `config/OpenApiConfig`,
  `app/HttpUrlRedirectClient` (injected as `RedirectClient`), `verification/VerificationConfig`, and the
  `Jpa*Repository`/`Jpa*Log` implementations — no in-memory fake is missing a real implementation).
- **No dead private members**: a body-hash/occurrence scan over `src/main/java` finds **no private method,
  private field or `static final` constant referenced once (its own declaration) or less.**
- **No nesting problem**: max brace depth in `src/main/java` is 7, in one file
  (`guidance/MarkdownToHtml.java:259`); nothing else exceeds 6.
- **`pom.xml` has no unused dependency and no dead version property.** testcontainers/jsoup/proj4j/twilio/
  spring-dotenv/bcprov all have real call sites; `<testcontainers.version>2.0.5</testcontainers.version>` is
  *required* (Boot 3.5.16 pins 1.21.4, whose artifact names `org.testcontainers:junit-jupiter` no longer
  match what the code imports), so it is **not** a dead property. One redundant declaration only → L9.
- **Good counter-examples worth keeping** (so a future sweep does not "fix" them):
  `app/CommaSeparated.java` collapsed 7 copies of the config-list parse into one class;
  `api/GuidanceController` and `api/AdminGuidanceController` both classify a blank search term as
  "no filter, never a 400" through the same `GuidanceService.matchesSearch` (`:144`);
  `ShelterSourceFilter` (`api/ShelterSourceFilter.java`) is now the one frontend-facing source vocabulary
  for both the public and the admin list, and the frontend agrees
  (`frontend/src/app/core/models.ts:50`, `gateways/admin-gateway.ts:576`).

## Findings

### Medium

**F1 — The page-bound policy is now duplicated four ways, and the lane's new admin copy is the fourth.**
- `api/AdminController.java:153-171` (new, uncommitted), `api/AdminGuidanceController.java:231-249`,
  `api/GuidanceController.java:144-162`, `api/ShelterController.java:530-548`.
- Evidence: three of the four bodies are **byte-identical** after whitespace normalisation (verified by
  normalised-body hashing across the tree: `AdminController.requireLimit` == `GuidanceController.requireLimit`
  == `AdminGuidanceController.requireLimit`, 9 lines each; same for `requireOffset`). The fourth
  (`ShelterController`) is the same logic with the bound read from the constant —
  `limit > ShelterQueryService.MAX_PAGE_SIZE` (`:534`) and `InvalidShelterException`. The message string
  `"limit must be between 1 and 200"` is hardcoded at `AdminController.java:158`,
  `AdminGuidanceController.java:236`, `GuidanceController.java:149`, `AdminController.java:349`,
  `AdminModerationService.java:290` and `:404`; it is interpolated from the constant at
  `ShelterController.java:535` only.
- Why it matters: the cap is 200 in five of six sites purely because somebody typed `200`; the one class that
  owns the number (`ShelterQueryService.MAX_PAGE_SIZE = 200`, `:89`) is used at exactly one site. Change the
  cap, or the wording, and one endpoint moves while five silently keep the old contract — and the two
  exception types (`GuidanceValidationException` vs `InvalidShelterException`) make the drift invisible to
  any test that checks a single endpoint. This is the same defect class commit `101dbe4` removed for
  `requireAdmin()`; the lane re-created it ~1 commit later.
- Suggested fix: one shared validator, e.g.
  `api/PageBounds.requireLimit(Integer limit, int max, Function<String, RuntimeException> raise)` +
  `requireOffset(...)`, called by all four controllers with `ShelterQueryService.MAX_PAGE_SIZE` as `max`.
  ~40 lines removed, no behaviour change.

**F2 — `GuidanceService.slice` is a second copy of `ShelterQueryService.slice`, and the new admin shelter list reaches into the guidance package to use it.**
- `guidance/GuidanceService.java:243-248` vs `api/ShelterQueryService.java:188-196`: identical bodies
  (`from = offset == null ? 0 : offset; … List.copyOf(rows.subList(from, to))`), differing only in the element
  type (`<T>` vs `ShelterDto`). Both are live: `ShelterQueryService.java:176`,
  `GuidanceController.java:130`, `AdminGuidanceController.java:175`, and the new `AdminController.java:144`.
  `GuidanceService.slice`'s own javadoc admits the copy ("the shelter list's slice semantics verbatim",
  `:234`).
- Why it matters: the paging edge cases (null = no paging; offset past the end = empty page, never an error;
  `limit` absent = whole list) are exactly the semantics that must not diverge between endpoints, and today
  four endpoints depend on two implementations. It also makes `api` import a guidance *service* class for a
  pure list operation (`AdminController.java:9`), so gaining a third consumer means choosing which domain to
  import.
- Suggested fix: move the generic `slice` to a neutral helper (`ee.sheltermap.app` already hosts
  `CommaSeparated`/`TextTruncation` from the same refactor) and delete `ShelterQueryService.slice`. No
  behaviour change.

**F3 — The authenticated-user primitive is still copy-pasted five times; only the ADMIN variant was consolidated.**
- `api/AdminAccess.java:47-50` (the extracted one, correct), `api/ShelterController.java:591-595`
  (`callerIdOrNull`), `api/ShelterController.java:598-602` (`currentUser`),
  `auth/AccountController.java:245-251` (inline in `deleteAccount`) and `auth/AccountController.java:268-276`
  (`currentUser`), `auth/VerificationController.java:161-165` (`currentUser`).
- Evidence: all five contain the same two statements
  (`SecurityContextHolder.getContext().getAuthentication()` and
  `getPrincipal() instanceof Long userId`) followed by a throw of `"Authentication required"`.
  `AccountController` even duplicates itself: `deleteAccount()` at `:245` re-implements the block that its own
  `currentUser()` at `:268` provides.
- Drift is already observable in the sibling branch — the "principal exists but is not a registered user"
  case answers `InvalidAccessTokenException("Unknown user")` (`ShelterController.java:605`),
  `InvalidContactChangeException("Account not found")` (`AccountController.java:278`) and
  `VerificationFailedException("Account not found")` (`VerificationController.java:167`).
- Why it matters: this is the same root cause the previous sweep rated **High** for the ADMIN copies
  (a security-adjacent snippet with no single point of truth). A future hardening of the principal contract
  (e.g. an `isActive` check, or moving the id off the principal) has to be applied in five places, and
  `AdminAccess` is the only one a reader will find.
- Suggested fix: give `AdminAccess` (or a renamed `CurrentUser`) a `long requireUserId()` holding lines
  591-595's logic; `requireAdmin()` calls it and then adds the `isAdmin` check. The three controllers then
  call `requireUserId()` and keep only their own domain mapping for "not a registered user".

**F4 — `VerificationSendLog.tryRecord` still has no production caller, and its javadoc now describes behaviour production does not have.**
- Declaration `verification/VerificationSendLog.java:52`; implementation
  `verification/FileVerificationSendLog.java:90`; test double
  `src/test/java/ee/sheltermap/verification/InMemoryVerificationSendLog.java:43`. Callers:
  `VerificationServiceTest.java:328-345` and `FileVerificationSendLogTest.java:147` — **no production caller**
  (`grep -rn tryRecord src/main/java` returns the two declarations and a comment).
  Production instead reads via `lastSentAt` (`VerificationService.java:121`) + `countToday` (`:128`) and
  records later via `record` (`:178`).
- The interface javadoc (`:38-51`) still justifies the method with "a read-read-record across separately
  synchronized methods would let a burst pass both reads before either recorded" — which is precisely the
  pattern the production path at `VerificationService.java:121-133/178` now uses.
- Why it matters: public interface surface (and a `SendDecision` enum) kept alive by tests only, whose
  documentation asserts an atomicity guarantee the shipped path does not rely on. run 1 flagged this as an
  in-flight consequence of the `boolean send()` change and deferred it "to whoever owns that change";
  commit `101dbe4` shipped the change and did not delete it, so it is a settled-tree defect now.
- Suggested fix: delete `tryRecord` from the interface, `FileVerificationSendLog` and the test double, and
  point the two tests at the read-then-record path — or, if the seam is wanted, mark it explicitly as
  test-only and rewrite the javadoc so it stops claiming production atomicity.

**F5 — `GuidanceService` is still the god class, and the lane made it bigger.**
- `guidance/GuidanceService.java`: **1 291 lines, 666 code lines, 25 public methods** (measured; run 1 wrote
  1 236 / 645 / "40 public methods" — the line counts grew by ~55 because `searchableBody` (`:129`),
  `matchesSearch` (`:144`) and the generic `slice` (`:243`) were added there by this lane), 7 injected
  collaborators (`:162-168`), longest method 72 lines (`reorderInLocale:850`) and `reorder:761` at 60+.
  The two reorder methods duplicate the same null/duplicate-id validation loop
  (`:764-771` vs `:854-861`), the same stale-list check (`:777-795` vs `:883-894`) and the same
  no-op short-circuit.
- Why it matters: every guidance change — public reads, admin CRUD, translations, ordering, locale/slug/
  sanitisation policy, and now *paging and search* — forces a full re-read of one 1 300-line file, and it is
  the reason F1/F2 exist (both `slice` and the bounds vocabulary were physically copied out of it).
- Suggested fix (unchanged from run 1, incremental, no behaviour change): split by seam — a
  `GuidanceSearch` (searchableBody + matchesSearch + `MAX_SEARCH_LENGTH`), the neutral list helper for
  `slice` (F2), a `GuidanceOrderingService` (`reorder`/`reorderInLocale`, sharing one parameterised
  validation walk), and a package-private `GuidanceValidation` (locale/slug), leaving post CRUD + publish
  lifecycle in `GuidanceService`. The existing `GuidanceServiceTest` mostly keeps working.

### Low

**L1 — One unused import, newly introduced by the lane.**
`api/AdminController.java:4 import ee.sheltermap.domain.ShelterSource;` — the parameter became
`ShelterSourceFilter` (`:128`) and `ShelterSource` no longer occurs in the file (`grep -n ShelterSource`
returns only line 4). This is the **only** unused import left in `src/main/java` (the 14 from the previous
sweep were all removed). Fix: delete the line. Introduce L8 to stop this recurring.

**L2 — The `X-Total-Count` header literal and the count/slice/header block are repeated three times.**
`api/GuidanceController.java:136-139`, `api/AdminGuidanceController.java:179-182`,
`api/AdminController.java:145-148` — same `int total = …size()` / `…slice(…, requireOffset(offset),
requireLimit(limit))` / `ResponseEntity.ok().header("X-Total-Count", String.valueOf(total)).body(…)`
shape. The header name is additionally hand-written 3× in `@Header(name = "X-Total-Count")` and 4× in
javadoc. Fix: one constant + a small `PagedResponse.of(rows, offset, limit, total)` helper.

**L3 — A shelter endpoint throws a `guidance`-typed exception, and `AdminController` imports the guidance service for a pure function.**
`api/AdminController.java:10` (`import …guidance.GuidanceValidationException`) used at `:158` and `:169`.
The 400 body is identical either way (`ApiErrorHandler.java:156-157`), so this is naming/domain coupling,
not a status bug — but `GET /admin/shelters?limit=0` now answers with the guidance module's exception type
and the file imports `guidance.GuidanceService` (`:9`) to call a static list helper. Fix: fall out of F1/F2
(shared validator + neutral slice helper), or reuse `InvalidShelterException` like `ShelterController` does.

**L4 — No-op null guard on a primitive (run 1's L3, still present).**
`domain/ReporterTrust.java:53`:
`Objects.requireNonNull(Boolean.valueOf(crossVerifiedSubmission), "crossVerifiedSubmission")` —
`Boolean.valueOf(boolean)` can never return `null`, so the guard can never fire while reading as if a null
check exists. The neighbouring `ownAutoConfirms < 0` check (`:54-56`) is real. Fix: delete the line.

**L5 — `MAX_REDIRECT_HOPS`/`DEFAULT_BUDGET` are still duplicated *and* already disagree.**
`app/LocationResolveService.java:66,72` vs `guidance/HeroImageImportService.java:79,82` — same values,
same "the geo resolver's" javadoc. The loops differ:
`LocationResolveService.java:115` `for (hop = 0; hop < MAX_REDIRECT_HOPS; …)` (3 fetches) versus
`HeroImageImportService.java:174` `for (hop = 0; hop <= MAX_REDIRECT_HOPS; …)` (4 fetches), while the
failure message at `:199-200` says "took more than 3 redirects". One constant, two meanings. Fix: hoist both
constants into one place and make the hop predicate explicit (`MAX_REDIRECTS` = number of redirects allowed).

**L6 — A user-facing 409 message hardcodes the bound it is talking about.**
`app/ShelterLimitExceededException.java:12`:
`MESSAGE = "The limit of 10 active shelters has been reached"`, while the enforced bound is
`app/ShelterService.java:67 MAX_ACTIVE_SHELTERS_PER_USER = 10` (checked at `:154`). Changing the constant
silently makes the message lie. Fix: build the message from the constant.

**L7 — Small duplicated helpers/policies that survived the refactor (all verified live).**

- `private Shelter requireShelter(long)` — byte-identical 4-line bodies:
  `app/ShelterReportService.java:320` and `api/AdminModerationService.java:616`.
- `private static String normalize(String contact)` — identical
  (`Objects.requireNonNull` + `trim().toLowerCase(Locale.ROOT)`): `verification/RollingContactOtpLimiter.java:116`
  and `alerts/ThrottleAlertRecorder.java:143`. The same normalisation is inlined 7 more times in main
  (`auth/AuthService.java:78`, `auth/ContactChangeService.java:140`, `auth/AuthController.java:248`,
  `security/PiiCrypto.java:143` — this one feeds the email *hash* used for lookups — `guidance/MediaService.java:238`, …).
- `private <T> T inTransaction(Supplier<T>)` — identical bodies, both documented as "the ShelterImportService
  idiom": `auth/PasswordResetService.java:127` and `auth/ContactChangeService.java:109`
  (`ingestion/ShelterImportService.java` has the third, differently-shaped instance).
- The value `"Unknown"` for a dangling actor is inlined 6× (`api/ShelterQueryService.java:576`,
  `api/AdminModerationService.java:313,317,440,478,516`) and promised as API vocabulary in 6 javadocs, while
  the same class family already has a constant for the neighbouring case
  (`AdminModerationService.java:88 DELETED_ACCOUNT_NAME`).
- `"Authentication required"` is inlined 4× (`config/SecurityConfig.java:202`,
  `auth/AccountController.java:249,274`, `auth/VerificationController.java:164`) + `AdminAccess.java:49`
  (F3 collapses this to one).
Fix: one helper per rule (`Contacts.normalize`, one `requireShelter` on a shared repository facade, one
`TransactionBoundary`), and one constant each for the two strings; per-item Low, but they are the reason a
"is this the same rule?" question is still expensive.

**L8 — The build has no static analysis or coverage gate, so none of the above is caught mechanically.**
`pom.xml:176-192` declares only `spring-boot-maven-plugin` and `maven-surefire-plugin`;
`grep -in "jacoco|spotbugs|pmd|checkstyle|enforcer"` → no hits. SpotBugs would have found L1 and the 4
unused items in test scope in one run. Fix (one-off): wire SpotBugs/PMD to `mvn verify`.

**L9 — `pom.xml` declares `spring-security-crypto` although the starter already brings it in.**
`pom.xml:83-86`. Verified transitive chain in the local repo:
`spring-boot-starter-security/3.5.16` → `spring-security-config/6.5.11` (compile) →
`spring-security-core/6.5.11` (compile) → `spring-security-crypto` (compile, same version). Harmless
documentation-by-declaration; delete it or move the existing Argon2 comment (`pom.xml:100`) onto it.

**L10 — Test hygiene in the lane's own files.**

- Unused import: `src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java:24
  import java.util.function.Function;` (0 occurrences in the file body; pre-existing, not from this lane).
- The lane's new test block in `api/AdminModerationIT.java:354-390` writes fully-qualified names inline
  (`org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()` at `:354,:369`,
  `new java.util.ArrayList<>()` at `:360`, `com.jayway.jsonpath.DocumentContext` at `:362`) even though the
  file already imports `JsonPath` (`:3`, which it uses at `:363`) and `java.util.List` (`:30`). The sibling
  IT added by the same lane (`api/AdminGuidanceSearchPagingIT.java:24-26`) uses static imports instead, so
  the same lane produced two styles. Fix: import `java.util.ArrayList`,
  `MockMvcResultMatchers.header`, `DocumentContext`; delete the unused `Function`.

## Traps verified and deliberately **not** reported as dead

Both traps the previous sweep flagged are real, and both are correctly **not** dead — I re-verified each by
the mechanism that keeps it alive, not by reading the comment:

- `migration/PiiMigrationConfig.java:14-18 v13PiiEncryptionMigration()` has no textual caller, but Spring
  Boot's Flyway auto-configuration collects `JavaMigration` beans, which is how
  `V13PiiEncryptionMigration` receives its `PiiCrypto`. Live at boot by annotation/reflection.
- `guidance/HeroImageImportService.java:91 DEFAULT_MAX_SIDE = 10_000` is referenced only from
  `HeroImageImportServiceTest.java:104,213,341,454`, i.e. it looks like a test-only constant — but it is the
  documented value of the `@Value("${app.media.import-max-side:10000}")` default at `:110`. Not dead.
- Also checked and cleared: `SmartIdVerificationProvider` throwing from both methods (documented v1 stub),
  `AdminSeeder.run(ApplicationArguments)` ignoring its argument (normal for `ApplicationRunner`), and the
  two `Thread.sleep` calls (`ingestion/CsvRegistryClient.java:239`,
  `guidance/JdkHeroImageFetchClient.java:233`) which are retry backoff, not debug code.

## Top 5 findings

1. **F1 — the page-bound policy is duplicated four ways** (`AdminController.java:153-171` (new),
   `AdminGuidanceController.java:231-249`, `GuidanceController.java:144-162`,
   `ShelterController.java:530-548`; message hardcoded at 6 sites). Three bodies are byte-identical, the cap
   lives in `ShelterQueryService.MAX_PAGE_SIZE` and is used at one site. Extract one validator — the lane
   re-created the exact pattern commit `101dbe4` had just removed for `requireAdmin()`.
2. **F2 — `GuidanceService.slice` duplicates `ShelterQueryService.slice`** (`:243-248` vs `:188-196`,
   identical bodies) and the new admin shelter list reaches into the guidance package to use it
   (`AdminController.java:144`). Four endpoints, two paging implementations. Move one to a neutral helper.
3. **F3 — the authenticated-user primitive is still copy-pasted five times**
   (`ShelterController.java:591,598`, `AccountController.java:245,268`, `VerificationController.java:161`,
   plus the extracted `AdminAccess.java:47`), with three different exception types for the "no such account"
   branch. The previous sweep's H1 fix is only half done.
4. **F4 — `VerificationSendLog.tryRecord` (`:52`) has no production caller** (only the two declarations and
   three tests), yet its javadoc still advertises the atomic burst guard that `VerificationService.java:121-133/178`
   replaced. Delete it or relabel it as a test seam.
5. **F5 — `GuidanceService` is a 1 291-line / 666-code-line / 25-public-method / 7-collaborator god class**
   that grew by ~55 lines in this lane, and it is the origin of F1 and F2. Split it by seam
   (search, ordering, validation, the list helper) rather than by line count.
