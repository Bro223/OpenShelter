# P3-STRUCTURE-HYGIENE — report

Lane P3-STRUCTURE-HYGIENE, branch `code-review`, baseline `2a7ef62` (1364 backend tests).
Scope: `reviews/12-summary.md` section P3 — P3-A (structure/configuration drift),
P3-D (dead code/hygiene), and the backend-or-doc items of P3-E/F/G. Behaviour-preserving
only; no public signature, test, frontend, guard, migration, or other lane's file touched.
Nothing committed (parent commits).

## Changes made (5 files)

### 1. `@EnableScheduling` moved off the feature flags (P3-A #8) — fixed

- **`src/main/java/ee/sheltermap/config/SchedulingConfig.java`** (new, 21 lines) — a
  `@Configuration` class carrying `@EnableScheduling` unconditionally, with a javadoc
  explaining the split and the trap it closes (a future `@Scheduled` method outside a
  flag-gated carrier would silently never run).
- **`src/main/java/ee/sheltermap/config/RegistryScheduler.java`** — `@EnableScheduling`
  (and the import) removed from the carrier (former lines 25–26); the `@Scheduled` method
  (now `:33`) and the `@ConditionalOnProperty("app.registry.schedule-enabled",
  matchIfMissing = true)` gate (now `:24`) are untouched; javadoc updated to point at
  `SchedulingConfig` (`:15-17`).
- **`src/main/java/ee/sheltermap/retention/RetentionScheduler.java`** — `@EnableScheduling`
  (and the import) removed (former lines 25–26); the `@Scheduled` method (now `:35`) and
  the `@ConditionalOnProperty("app.retention.enabled", matchIfMissing = false)` gate
  (now `:24`) are untouched.

Why behaviour-preserving: which scheduler *beans* exist is still decided by exactly the
same two feature flags — the annotation only registers Spring's
`ScheduledAnnotationBeanPostProcessor` machinery. The tree contains exactly two
`@Scheduled` methods (grep-verified), both on the two gated carriers, so in every
currently expressible configuration (both flags on/off in any combination) the set of
firing jobs is identical to before. The only effect is that the machinery now exists even
when both flags are off, which cannot change observable behaviour because there are no
un-gated `@Scheduled` methods to fire. No test or doc anchor references the annotation's
location (`grep -rn "EnableScheduling|TaskScheduler|ScheduledAnnotationBeanPostProcessor"
src/test docs` → zero hits), and the two bean-presence ITs
(`RegistrySchedulerIT`, `RetentionSchedulerIT`) still assert the same things.

### 2. `AdminModerationIT` inline FQCN cleanup (P3-D; P3-G "agent 2 L10" item) — fixed

- **`src/test/java/ee/sheltermap/api/AdminModerationIT.java`** — the file the summary
  named (P3-D: "the only one left in src/main; AdminModerationIT:354–390 is the big one;
  GuidanceServiceTest:24"). 26 inline fully-qualified call sites replaced by imports,
  matching the file's existing import style (it already used static imports):
  `JsonNode`, `ObjectMapper` (`:9-10`), `DocumentContext` (`:11`),
  `ResultActions` (`:38`), `StringUtils` (`:39`), `Timestamp` (`:40`),
  `ChronoUnit` (`:41`), `ArrayList` (`:42`), `HashSet`/`Set` (`:43-44`), static
  `put` (`:44`). The two `header().string("X-Total-Count", "5")` lines and the two
  `put("/api/shelters/" + shelterId, ...)` lines were consolidated to single-line form.
  Every assertion, expected value, and call argument is byte-identical; only spelling
  changed. LSP-diagnostics clean (remaining `Autor` hits are the intentional
  Estonian test data).

### 3. Placement rule written down (P3-A, "the rule is written down nowhere") — doc half done

- **`README.md`** ("Package layout" section):
  - `config` row: added `SchedulingConfig` (the `@EnableScheduling` home).
  - Added the three missing package rows: `retention` (`:251`), `alerts` (`:252`),
    `sitetexts` (`:253`).
  - New paragraph `:261` "**Where new code goes.**" — the two-axis rule (horizontal
    layers `domain` → `app` → `api`, vertical feature slices), where a feature's
    service/ports/exceptions/properties live, the `auth`-keeps-its-controllers exception,
    what `app` is for (the cross-feature bucket), and the two services recorded as an
    explicit *known deviation* with a pointer to this review.
  - Verified against `DocumentationFactsTest`'s checks by simulation: all 87 backticked
    PascalCase class names in layout rows exist under their stated packages (floor 74
    met), and no cited path is dangling.

## Verdicts per P3 item

### P3-A

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Two `@Service` classes in `api` (`ShelterQueryService`, `AdminModerationService`) | **Still real — not changed (blocked by design decision + anchor pins)** | See non-change N1. |
| 2 | `app` is a leftover bucket (`HttpUrlRedirectClient`, `ShelterSearchQuery`, `ShelterReportRecord`, `RegistrySyncRecord`) | **Still real — documented, not reorganized** | The new README placement rule (`README.md:261`) states what `app` is for (cross-feature services, shared ports, shared exceptions). The four named classes are exactly that shape, so the doc no longer contradicts the tree; deciding the `HttpUrlRedirectClient` destination is the same open design question as item 1. |
| 6 | Four fail-closed guards duplicate the `enabledFlagNames`/`refuseToBoot` helpers | **Already fixed (earlier lane)** | `config/FailClosedGuard.java` now holds both helpers (`enabledFlagNames:35`, `refuseToBoot:49`); `ApiDocsGuard:59,63`, `DevEndpointsGuard:53,58`, `DevSenderGuard:61,66`, `ProdJwtGuard:64` all call it. Remaining template shape is intentional: the guards *are* the fail-closed mechanism and are individually verified by their boot-failure tests. |
| 7 | Trusted-proxy pair bound + parsed in four controllers | **Still real — not changed (needs a signature change)** | `AuthController:61-64,236`, `AccountController:56-60,221`, `VerificationController:68-76,110`, `LocationController:54-64,91` each bind the two `@Value` properties and parse with `CommaSeparated.parseSet`. `RateLimitProperties:11-15` deliberately excludes the pair from the record. A shared resolver component changes all four public constructors → every test that constructs those controllers must change → violates this lane's no-signature/no-test constraint. Already flagged as an owner decision (notes board, SIMPLIFY-ACCOUNT-BE entry). |
| 8 | `@EnableScheduling` carried by two feature-flagged components | **Fixed** | See change 1 above. |
| 9 | `ShelterController` assembles owner edit rows positionally; enforcement in one place | **Already fixed (earlier lanes)** | The only production throw site of `NotAuthorException` in the shelter path is `ShelterService.java:319`; the controller delegates to `shelterService.updateOwned(userId, OwnerEdit)` (`ShelterController:425`) and the positional assembly moved to `ShelterService.ownerEditRow:496`. The admin path enforces its own rule once through `AdminAccess.requireAdmin` (all 19 admin endpoints, verified by SIMPLIFY-ADMIN-CTRL). The controller's remaining direct `UserRepository` reads are the per-request caller lookup, which is the established design. |
| 11 | Legacy `.component.ts` suffix (3 files) | **Still real — out of scope (frontend)** | `banner.component.ts`, `consent-banner.component.ts`, `accessibility-dialog.component.ts` under `frontend/src/app/`. Frontend lane territory. |

### P3-D

| Item | Verdict | Evidence |
|------|---------|----------|
| `AdminController.java:4` unused import | **Already fixed** | The line-4 import (`ShelterStatus`) is used at `AdminController:132`. A strict per-import scan of all 191 test + 300+ main files (incl. static imports) finds **zero** unused imports tree-wide; PMD (which covers unused imports in the codestyle category) is part of the gate. |
| `ShelterLimitExceededException` hardcodes the limit in the message | **Already fixed** | `ShelterLimitExceededException.java:17-18` builds the message from `ShelterService.MAX_ACTIVE_SHELTERS_PER_USER` with a javadoc stating the byte-identical guarantee. |
| `MAX_REDIRECT_HOPS=3` + `DEFAULT_BUDGET=10_000` duplicated, off-by-one semantics | **Still real — not changed (behaviour diverges)** | See non-change N2. |
| `ReporterTrust:53` no-op null guard on a primitive | **Already fixed** | `ReporterTrust.of(boolean, int)` now carries the real guard: `ownAutoConfirms < 0` → `IllegalArgumentException`. No null check on a primitive remains. |
| `spring-security-crypto` in `pom.xml` unnecessary (transitive) | **Not a problem — keep it** | The main code uses the package directly: `SecurityConfig:34-35` (`Argon2PasswordEncoder`, `PasswordEncoder`), `Argon2PasswordHasher:3` (`Argon2`). An explicit declaration of a directly-used dependency is correct Maven hygiene; relying on the spring-boot-starter-security transitive chain would be the regression. No change. |
| `AdminModerationIT:354-390` FQCNs where imports exist | **Fixed** | See change 2 above (whole-file sweep, 26 sites). |
| `GuidanceServiceTest:24` unused `java.util.function.Function` import | **Already fixed** | No `java.util` imports remain in the file (it was rewritten by a later lane); strict per-import scan: zero unused. |

### P3-E / P3-F (scope check)

All listed items are frontend (`admin-gateway.ts`, `shelter-copy.ts`, `form-helpers.ts`,
`models.ts` dead export, `styles/` unused rules, `index.html` CSP, `admin-page.ts`
inlining, `provenance.ts` duplication) or a frontend *consumption* gap (P3-F L3:
`POST /admin/guidance/{id}/translations/attach` has no frontend consumer). Nothing in
P3-E/F is a backend or repo-doc edit this lane may make; the backend side of P3-F L3
(the endpoint + its docs) is deliberately shipped and left reachable-in-future. Reported
here for the parent's triage; no changes made.

### P3-G (backend/doc items)

| Item | Verdict | Evidence |
|------|---------|----------|
| Retention ITs boot full app + Postgres to assert bean presence | **Still real — not changed (owner call)** | Both `RegistrySchedulerIT`-style retention ITs extend `AbstractPersistenceIT` (Testcontainers Postgres + full context) and assert only `getBeanNamesForType` presence/absence. Converting to `ApplicationContextRunner` would require hand-rolling `RetentionService`'s five-dependency graph (`RetentionProperties`, `UserRepository`, `AccountService`, `ModerationAuditLog`, `RetentionRunLog`) as fakes in a minimal context; no `ApplicationContextRunner` pattern exists anywhere in the test tree (grep: zero hits), and the full-boot ITs pin the exact claim being made ("the bean exists in the *app* context") with real integration evidence. Trading that for a unit harness on a report-only P3 item is a design call, not a hygiene fix. |
| i18n template guard comment stale (31 vs 35) | **Still real — out of scope (frontend file)** | `frontend/src/app/core/i18n/i18n-template-guard.spec.ts:61-62` says "The full template set (31 files)"; `EXPECTED_TEMPLATES` holds 35 entries and `find frontend/src/app -name '*.html' | wc -l` = 35. The guard itself passes (the list matches the walk); only the comment count is stale. Frontend lane to fix. |
| "Three lane files write FQCN test/BC names" (agent 2 L10) | **Partially fixed; census below** | Agent 2's L10 names exactly two files: the `AdminModerationIT` block (fixed, change 2) and `GuidanceServiceTest:24` (already fixed). The summary's "three files" is not substantiated by the raw report. Residual inline-FQCN census across the *pre-existing* test tree (style, not lane-added — left for a dedicated sweep): `api/LastVerifiedApiIT.java`, `api/ShelterReportIT.java`, `api/CommunityPulseIT.java`, `api/ShelterTallyCrossingRaceIT.java` (`com.jayway.jsonpath.JsonPath`); `api/AdminMediaClientErrorsIT.java` (4 types); `api/MediaDerivativeServingIT.java`, `api/AdminGuidanceSearchPagingIT.java` (`MockMvcRequestBuilders`); `api/HeroImageImportIT.java` (6); `verification/TwilioSmsSenderTest.java` (4×`Duration`); `auth/InMemoryPasswordResetTokenRepository.java` (2×`Objects`); `auth/CurrentCallerTest.java`, `auth/RefreshRotationRaceIT.java`, `ingestion/RegistryPropertiesTest.java`, `api/ProvenanceApiIT.java`, `security/ContactsTest.java`, `guidance/MediaServiceTest.java`, `guidance/HeroImageImportServiceTest.java`, `app/HttpUrlRedirectClientTest.java`, `app/InMemoryShelterRepository.java`, `ingestion/RegistryCsvParserTest.java`, `ingestion/CsvRegistryClientTest.java`, `guidance/JdkHeroImageFetchClientTest.java`, `sitetexts/SiteTextsServiceTest.java` (1–3 each). |
| Quill asset pin omits the assets entry | **Out of scope (frontend)** | `frontend` asset-pinning; frontend lane. |

## Deliberate non-changes

- **N1 — `ShelterQueryService` / `AdminModerationService` not moved.** Three independent
  blockers: (a) `docs/agent/00-CURRENT-STATE.md` cites their current paths
  (`api/ShelterQueryService.java:412-414`; `api/AdminModerationService.java:414-438`,
  `:311-326`, `:414,448`) and `DocumentationFactsTest` verifies every doc citation
  resolves — moving the files red-flags the anchor guard, and that doc is owned by a
  single lane I am barred from editing; the move cannot ship in this lane with a green
  gate. (b) The finding itself states the destination rule is "written down nowhere" —
  the move's target is an open design question (and `app` is the leftover bucket the same
  finding criticizes). (c) Import fan-out: 12 files (5 main + 7 test) reference the two
  classes. The doc side of the item is done (change 3) and the deviation is now explicit
  in the README with a pointer.
- **N2 — `MAX_REDIRECT_HOPS` not unified.** The two services do *not* share semantics:
  `LocationResolveService:65,146` uses `hop < 3` (max 3 fetches; the third redirect
  target is returned unfetched — "the hop cap is reached — the pair is read from this
  URL"), while `HeroImageImportService:91,185,210` uses `hop <= 3` (max 4 fetches; the
  refusal message "took more than 3 redirects" matches its own loop). Unifying under one
  constant requires changing at least one service's redirect budget — a behaviour change.
  `DEFAULT_BUDGET` (10 s) is identical in both and safe to share once the hop semantics
  agree. Owner decision: which budget is the policy?
- **N3 — Trusted-proxy pair not extracted** (signature change; see P3-A #7 row).
- **N4 — Retention ITs not converted** (evidence trade-off; see P3-G row).
- **N5 — `spring-security-crypto` declaration kept** (directly used; see P3-D row).

## Gate

- **Authoritative gate (isolated worktree, my diff on pristine `2a7ef62`):**
  `git worktree add --detach /tmp/p3-sh-hygiene-gate 2a7ef62` + my 5-file diff only
  (verified: `git status` shows exactly the 4 modified + 1 new file).
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  — result in the "Gate result" section below (this section updated when it completes).
- **Supplementary gate (shared worktree, combined state):** ran first, exit **1**:
  `Tests run: 1365, Failures: 1, Errors: 0` — 1365 = 1364 baseline + the 1 test of a
  *parallel foreign lane* that started editing this shared worktree mid-session
  (`SessionLifecycleThrottleRetryAfterIT.java` untracked; in-flight diffs in `pom.xml`,
  `AdminController`, `AdminSiteTextController`, `ApiErrorHandler`,
  `ReporterTrustEvaluator`, `ShelterHistoryLog`, `AdminSeeder`, `PasswordResetService`,
  `PasswordResetToken`, `SecurityConfig`). The single failure is that lane's:
  `OpenApiSnapshotIT.theCommittedSnapshotMatchesTheGeneratedDocument` —
  "docs/api/openapi.json is stale relative to the generated document" — a direct
  consequence of their in-progress OpenAPI-annotated code changes before their
  snapshot regeneration. Zero missing-class errors, zero failures attributable to my
  files (my diff touches no OpenAPI-annotated code, no bean wiring other than the
  scheduling split, and one test file whose assertions are byte-identical).
- Known gate noise (pre-existing, not from this lane): JaCoCo 0.8.13 logs
  "Unsupported class file major version 71" while instrumenting JDK 27 runtime classes
  during test scanning — logged, non-fatal, present in prior green gates as well.

## Unverified / out of reach

- The isolated gate result (pending at write time — see Gate section).
- Frontend-side P3 items (P3-A #11, P3-E, P3-F, P3-G i18n comment, Quill pin): not
  verified against a frontend build because this lane is backend-only; verdicts above
  rest on file inspection of the named lines.
- P3-F L3 "flow unreachable without FE": the backend endpoint's presence and docs were
  verified; I did not (and may not) add or remove the endpoint.
- PMD/jacoco checkstyle phases of the *combined* gate did not run (surefire failure
  stops the build); the isolated gate covers them for my diff.

## Gate result (final)

**Exit 0.** Isolated worktree at pristine `2a7ef62` + exactly this lane's diff
(4 modified + 1 new file): `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true` → **`Tests run: 1364, Failures: 0, Errors: 0, Skipped: 0`
— `BUILD SUCCESS`** (log: `/tmp/p3-sh-hygiene-gate2.log`). Test count unchanged from
the 1364 baseline (no tests added or removed by this lane). PMD and the jacoco floor
ran as part of `verify` and passed. The temporary worktree was removed after the run.

The earlier combined-tree run (exit 1, 1365 tests, 1 failure = foreign lane's stale
OpenAPI snapshot) is reported in the Gate section above as supplementary evidence only.
