# Review 03 — backend tests

Agent 3 of 12 (sequential sweep). READ-ONLY review of the backend test suite of
`/home/aleks/MyScripts/LocalRepos/OpenShelter`. The only file I created is this report; every other
artefact in the repo is untouched. All runs were executed **in throwaway copies under `/tmp`**, so the
working tree, its `target/` and the two running services (`:8080`, `:5173`) were never disturbed.

## Stack / versions actually in use

| Thing | Version | Source |
|---|---|---|
| Java (declared) | 21 (`<java.version>21</java.version>`) | `pom.xml:22` |
| Java (what `mvn test` actually runs on) | **27.0.0** — Maven picks `JAVA_HOME` = `/home/aleks/.local/share/mise/installs/java/27.0.0` (Oracle runtime). `java` on `PATH` is 21.0.7 (sdkman Temurin), i.e. the *other* JVM | `mvn -v`, `java -version`, `echo $JAVA_HOME` |
| Spring Boot | 3.5.16 | `pom.xml:8-11` |
| Build | Maven 3.9.16, surefire **3.5.6** (Boot-managed) | `mvn -v`, `mvn-full.log:29` |
| Test frameworks | JUnit 5 (Jupiter) + AssertJ via `spring-boot-starter-test`; Testcontainers **2.0.5** (`testcontainers-junit-jupiter`, `testcontainers-postgresql`, `postgres:16`) | `pom.xml:190-206`, `mvn-full.log:45` |
| Mocking | **none** — no Mockito, no `@MockBean`/`@SpyBean`/`@ExtendWith(MockitoExtension)` anywhere in `src/test` | `grep -rE "mockito\|@MockBean\|@SpyBean" src/test` → 0 hits |
| Coverage tooling | **none** — no JaCoCo plugin, no `jacoco*.exec`, no `target/site` | `grep jacoco pom.xml` → 0; `find . -name '*jacoco*'` → 0 |
| Parallelism / ordering | none configured: default `forkCount=1`, `reuseForks=true`, `runOrder=filesystem` | `grep -E "parallel\|forkCount\|runOrder" pom.xml` → 0 hits |
| Surefire includes | `*Test`, `*Tests`, `*TestCase`, **`*IT`** — the whole IT tier runs in `mvn test`; there is no failsafe split | `pom.xml:183-192` |

Shapes: 164 java files under `src/test/java` (32.456 lines), **133 test classes** (132 executing + the
abstract `AbstractPersistenceIT`), of which **64 are integration classes** extending the single
`@SpringBootTest` base and 68 are plain-JUnit/AssertJ classes; ~35 hand-written fakes/fixtures
(`InMemory*`, `Capturing*`, `Recording*`, `Stub*`, `Fake*`, `MutableClock`, `TestTokens`). 1111
`@Test`/`@ParameterizedTest` annotations → **1139 test executions** (`HeroAddressPolicyTest` alone
contributes 31 executions from 3 parameterized methods).

## What I actually ran (evidence, not inference)

| # | Run | Result | Log |
|---|---|---|---|
| 1 | **Current working tree**, pristine rsync copy (no `target/`, no `node_modules`, `.gitignore`d `.env` copied) → genuinely fresh `target/`, JDK **27**: `mvn -o test` | **`Tests run: 1139, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS in 1:57** | `/tmp/mvn-full.log` |
| 2 | Same tree, `mvn -o test -Dsurefire.runOrder=reversealphabetical` | **`Tests run: 1139, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS** | `/tmp/mvn-reverse.log` |
| 3 | `JdkHeroImageFetchClientTest` alone under **JDK 21** (`JAVA_HOME=~/.sdkman/candidates/java/21.0.7-tem`) | `Tests run: 6, Failures: 0` — BUILD SUCCESS | stdout |
| 4 | **Committed HEAD only** (`git archive HEAD` → `/tmp/os-head`, no untracked/uncommitted files) | **`Tests run: 1125, Failures: 1, Errors: 0, Skipped: 0` — BUILD FAILURE** | `/tmp/mvn-head.log` |
| 5 | Static analysis of all 1111 test methods (assertion counting, scope annotations, `Thread.sleep`/random/assumption greps) | script `/tmp/count_asserts.py`, `/tmp/weak.py` | — |

The suite is green **on JDK 27** (the machine default, i.e. what a developer here gets from a bare
`mvn test`), green under reversed class order, and 1139 is reproducible from a fresh `target/`.

## Count reconciliation — the four figures

| Figure | What it actually is | How I know |
|---|---|---|
| **1139** | **The real number for the current working tree** (fresh `target/`, JDK 27, includes the uncommitted admin-list lane: `AdminGuidanceSearchPagingIT` = 9 + 5 new `@Test` in `AdminModerationIT`/`GuidanceServiceTest`) | run 1 |
| **1125** | **The committed `HEAD` tree** (`git archive HEAD`), which is **red**: `DocumentationFactsTest.everyRepositoryPathCitedInTheReadmeExists` fails. 1139 − 1125 = 14 = exactly the uncommitted lane's 9 + 5 new tests | run 4 + `git diff -- src/test \| grep -c "^+.*@Test"` (5), `grep -c @Test AdminGuidanceSearchPagingIT.java` (10 incl. `@TestConfiguration`, 9 executed) |
| **1150** | **The stale `target/` on this machine**: 135 `surefire-reports/TEST-*.xml` = 132 live classes **+ 3 orphan XMLs** for classes deleted in `670f43d` (`RouteDebugIT` 1 test, `ScratchDebugTest` 1, `PaasteametRegistryClientTest` 9 → 11 phantom tests). 1150 − 11 = **1139 exactly**. The `.class` files are gone from `target/test-classes`, so only the *XML* inflates a count read off disk — `mvn clean test` (or any fresh target) removes the trap | `grep -hoE 'tests="[0-9]+"' target/surefire-reports/TEST-*.xml \| awk '{s+=$1}'` = 1150; the 3 XMLs sum to 11; `git log --diff-filter=D -- '**/RouteDebugIT.java' …` → `670f43d` |
| **1111** | **Not reproducible from any state of this repository I can build.** Neither `HEAD` (1125), the working tree (1139) nor a stale target (1150) yields it; the nearest reproducible neighbours differ by 14/28. Most likely a partial/aborted run, or an earlier commit | runs 1 & 4 vs 1111 |

So: quote **1139** for the current tree — but only after `mvn clean test`; and note that a *clean
clone* of the same code is **red at 1125** for the reason in finding 1.

## Confirm / contradict the previous sweep's claims about my area

| Prior claim | Verdict | Evidence |
|---|---|---|
| `JdkHeroImageFetchClientTest` fails deterministically on JDK 27 (HIGH) | **CONTRADICTED — fixed.** The `/stall.png` fixture now writes one body byte and flushes before hanging (`JdkHeroImageFetchClientTest.java:104-118`, comment names the JDK-27 cause; commit `670f43d`). 6/6 green on **JDK 27** (run 1) *and* on **JDK 21** (run 3) | runs 1 & 3; `git log -S"ONE body byte"` → `670f43d` |
| `HttpUrlRedirectClient` has zero test references | **CONFIRMED** — see finding 2 | `grep -rn HttpUrlRedirectClient src/test` → 0; `grep -rl RedirectClient src/test` → only lambda/stub seams |
| `ShelterReportService` lost-race path unreachable by any test | **CONFIRMED** — see finding 3 | `grep -rn DataIntegrityViolation src/test` → `GuidanceTranslationIT:181,191` (raw-JDBC uniques, different mapping); `InMemoryShelterReportRepository.save` is a plain `Map.put` |
| three unasserted `ApiErrorHandler` mappings | **CONFIRMED and understated — there are FOUR** (`locationResolve` → 400 was missed) — see finding 4 | no `502`/`isBadGateway`/`BAD_GATEWAY` assertion anywhere: `grep -rnE "isBadGateway\|BAD_GATEWAY\|502" src/test` → 3 hits, all comments |
| no assertion-free tests | **CONFIRMED** — 26 methods have no inline assertion token, all 26 delegate to assertion helpers (`expectErrorShape` `ShelterApiIT.java:103-110`, `expectError`, `expectUniform400` `GuidanceLocaleFilterIT.java:111-118`, `performAdminRoute(403)` `GuidanceAuthorizationIT.java:139,169`, `assertConstraints`, `submit`→`status().isCreated()` `ShelterDailyLimitIT.java:80-88`); every one verified by reading the body | script + manual read of all 26 |
| no flakiness (clocks injected, 2 `Thread.sleep` only) | **CONFIRMED and strengthened.** `Math.random`/`new Random`/`SecureRandom`: 0. `@Disabled`/`assumeTrue`/`Assumptions.*`/`@EnabledIf`: 0. `Skipped: 0` in all three runs. `Thread.sleep` exactly twice (`HeroImageImportIT.java:390`; `JdkHeroImageFetchClientTest.java:111` inside the fake server handler). Concurrency tests use latches/barriers with bounded awaits. `Instant.now()` appears only in fixture construction (never in an assertion). **New evidence:** a full run with `-Dsurefire.runOrder=reversealphabetical` is green (run 2), so the shared Postgres container + ~35 cached contexts + the deliberately non-`@Transactional` race ITs do not couple classes | runs 1-2; greps above |
| correct test scopes | **CONFIRMED with one Low exception** — `@SpringBootTest` appears exactly once, on `AbstractPersistenceIT.java:42`; no `@WebMvcTest`/`@DataJpaTest` anywhere; the advice-level test uses MockMvc **standalone** (`ApiErrorHandlerClientErrorsMvcTest.java:57-61`). The only heavier-than-needed spot is finding 6 | `grep -rn "@SpringBootTest\|@WebMvcTest\|@DataJpaTest" src/test` |

## Findings

**1. HIGH — the committed tree is red on a clean checkout: `DocumentationFactsTest` fails because
README.md cites a deliberately git-ignored file.**
`src/test/java/ee/sheltermap/config/DocumentationFactsTest.java:138` (guard `:60-66`, `:123-141`) vs
`README.md:645` vs `docs/code-review/.gitignore:5`.

*What is wrong.* `README.md:645` — `A 4-lead / 14-child review (reports: \`docs/code-review/2026-09-08-review-output.md\`) was fixed`
— backticks a path that `docs/code-review/.gitignore:5` deliberately excludes from the repository
(the ignore file documents why: unfixed-vulnerability detail, "Git-push safety analysis"). The test
asserts every backticked `docs/…` path in README **exists**, allowing only `data/`, `dist/`,
`target/` as runtime prefixes (`:60-61`).

*Evidence.* `git archive HEAD` → `/tmp/os-head` + run → `Tests run: 1125, Failures: 1`, the only
failure being `[README.md cites repository paths that do not exist] Expecting empty but was:
["docs/code-review/2026-09-08-review-output.md"]` (`/tmp/mvn-head.log:3563-3565`). The same test is
green in the working tree **only because the ignored file happens to exist on this machine**
(`ls -la docs/code-review/2026-09-08-review-output.md` → 74 KB, `git ls-files docs/code-review` does
not list it). Causal proof: repointing that one citation at a tracked sibling
(`docs/code-review/review-process.md`) in the HEAD copy makes the test green — 4/4, BUILD SUCCESS.

*Why it matters.* `mvn test` is the documented gate; every fresh clone (CI, a new developer, another
machine) fails it, while this machine reports a false "green" — the exact environment-dependent
signal this sweep was asked to pin down. It also explains two of the four counts above.

*Minimal fix (pick one, smallest first).* (a) Cite a tracked path at `README.md:645`
(`docs/code-review/review-process.md` / `docs/code-review/fix-process.md`) or inline the sentence
without a backticked path; or (b) teach the guard to skip git-ignored paths
(`git check-ignore`-style allow-list next to `RUNTIME_PREFIXES`, `:61`); or (c) commit the review
output (drop it from `docs/code-review/.gitignore`) — a policy decision, not a code one.

**2. MEDIUM — the production `RedirectClient` still has no test anywhere.**
`src/main/java/ee/sheltermap/app/HttpUrlRedirectClient.java:32-64` (guards at `:43-49`
non-`http(s)` → `IOException`, `:51` `setInstanceFollowRedirects(false)`, `:52-53` 3 s/5 s timeouts,
`:55` fixed User-Agent).

*What is wrong.* `grep -rn "HttpUrlRedirectClient" src/test` → **0 hits**; the whole
`LocationResolveServiceTest` (26 tests) and `LocationResolveIT` drive the seam with a lambda/stub
(`LocationResolveServiceTest.java:269,295,318-320`; `LocationResolveIT.java:68-71`). None of the four
security-relevant promises in its javadoc is asserted.

*Why it matters.* It is the only outbound HTTP client on the anonymous-reachable geo-resolve path; its
"never auto-follow + scheme allow-list" is why the ≤3-hop cap and the address policy cannot be
bypassed. The sibling client `JdkHeroImageFetchClient` has exactly this test (real
`com.sun.net.httpserver.HttpServer`), so this is an asymmetry, not a house style.

*Minimal fix.* New `src/test/java/ee/sheltermap/app/HttpUrlRedirectClientTest.java` (~60 lines, no new
dependency, the `HttpServer`-on-`127.0.0.1:0` pattern already in the repo): 302 + `Location` returned
and **not** followed; `file:`/`ftp:` → `IOException` with the "unfetchable redirect target" message;
the `OpenShelter/1.0 (location resolver)` User-Agent on the wire; malformed URI → `IOException`.

**3. MEDIUM — the report-dedup lost-race → 409 branch is still unreachable by any test.**
`src/main/java/ee/sheltermap/app/ShelterReportService.java:155-160`.

*What is wrong.* Nothing can make the fake throw, and no test substitutes a throwing repository:

```java
// ShelterReportService.java:155-160
try {
    reports.save(report);
} catch (DataIntegrityViolationException e) {
    // Lost a race with an identical concurrent report — the unique
    // constraint is the authority; same semantics as the pre-check.
    throw new DuplicateReportException();
}
```

`InMemoryShelterReportRepository.save` is a plain `Map.put`; the pre-check 409 is tested twice
(`ShelterReportServiceTest.java:142`, `ShelterReportIT.java` duplicate case) but the
concurrent-loser 409 — the case the javadoc calls "the authority" — never runs.

*Why it matters.* Two verified users reporting the same shelter at the same instant is exactly the
abuse the unique bound exists for (a duplicate `NON_EXISTENT` otherwise double-counts the auto-hide
tally). A change that turned this into a 500 would not be caught.

*Minimal fix.* One unit test: a 10-line inline subclass of the existing in-memory fake whose `save`
throws `DataIntegrityViolationException`, then
`assertThatThrownBy(() -> service.reportShelter(verified, id, NON_EXISTENT, null))
.isInstanceOf(DuplicateReportException.class)`; optionally assert `autoHideIfEligible` did not fire.

**4. MEDIUM — four documented HTTP error mappings are asserted nowhere, directly or end-to-end.**
`ApiErrorHandler.java:361` (`dataIntegrity` → 400 "Request failed due to invalid input"),
`:198` (`heroImportUnreachable` → **502**), `:461` (`locationUpstream` → **502**),
`:208` (`locationResolve` → 400, thrown only at `LocationController.java:104`).

*Evidence.* `grep -rnE "isBadGateway|BAD_GATEWAY|502" src/test` → 3 hits, **all comments**
(`LocationResolveServiceTest.java:99,246,284`). `grep -rn "Request failed due to invalid input"
src/test` → 0. `grep -rn "LocationUpstreamException" src/test` → **0**. `grep -rn "Could not find
coordinates" src/test` → 0. The geo IT always gets a valid link back
(`LocationResolveIT.java:68-71` always answers 302 → the `NotFound`/`UpstreamFailure` arms of
`LocationController.resolve` `:97-107` are never taken); the hero IT's failure case drives a *404*
(a 400 refusal, `HeroImageImportIT.java:468-482`), never an unreachable host.

*Why it matters.* 502 is a frontend-consumed contract ("retry later" vs "your link is broken"), and
these are the only places where a swallowed upstream detail could leak into a response — nothing pins
them. The API doc promises both 400 and 502 on `/api/geo/resolve` (`LocationController.java:85-93`),
so the documented contract is unverified in both directions.

*Minimal fix.* Four direct handler tests in `ApiErrorHandlerTest`'s existing style (status + body
message) plus one `LocationResolveIT` test with a `RedirectClient` stub that throws
`LocationUpstreamException` (502) / returns a no-pair outcome (400).

**5. LOW — the filter branch "a demoted admin's existing token loses the ADMIN authority" is untested.**
`src/main/java/ee/sheltermap/config/JwtAuthenticationFilter.java:73-80` (fresh
`users.isAdmin(userId)` per request); contract in its javadoc `:24-30`.

*Evidence.* `JwtAuthenticationFilterTest` covers 7 branches (valid token, admin authority, suspended,
expired, malformed, foreign secret, absent/non-Bearer) but always with the repository state fixed for
the whole test; `AdminAuthorizationIT` covers anonymous → 401 (`:127`), non-admin → 403 (`:137`) and the
provisioned admin → 200 (`:154`). No test anywhere changes a user's kind after issuing a token:
`grep -rniE "demote|UPDATE users SET kind" src/test` → 0; `grep -rn "isAdmin" src/test` → only
`InMemoryUserRepository`, `ShelterServiceTest` stubs, and seeder assertions.

*Why it matters.* It is the headline guarantee of the "DB is the truth, never a token claim" design
(the sibling branches — in-flight tokens of a suspended account, `UserSuspensionIT.java:233`; the
deleted-account erasure contract, `AccountDeletionIT.java:271-297` — both have tests). A regression
that cached the kind, or checked a claim, would be invisible.

*Minimal fix.* In `AdminAuthorizationIT`: log in the provisioned admin, then
`UPDATE users SET kind='REGISTERED' WHERE id=?` via the existing `JdbcTemplate`, then assert the
*same* token gets 403 on `/admin/shelters` (and 200 again after a second login attempt is not needed).

**6. LOW — CORS is security-relevant configuration with zero assertions.**
`src/main/java/ee/sheltermap/config/SecurityConfig.java:167-176` (`setAllowedOrigins(
CommaSeparated.parseList(allowedOrigins))`, `setAllowedHeaders(List.of("*"))`,
**`setAllowCredentials(true)`**, allowed methods GET/POST/PUT/DELETE/OPTIONS, registered for `/**`, fed
by `app.cors.allowed-origins` / `CORS_ALLOWED_ORIGINS` — `application.yml:106-110`).

*Evidence.* `grep -rniE "cors|Access-Control" src/test` → **0 hits**. No test sends an `Origin` header.

*Why it matters.* The browser frontend on `:5173` depends on this in dev, and the combination
credentials + wildcard **headers** + env-provided origins is exactly where a "fix" (e.g. allowing `*`
origins, or dropping the dev origin) silently breaks the app or opens it up. Nothing detects either.

*Minimal fix.* One MockMvc test: preflight from `http://localhost:5173` → 200 with
`Access-Control-Allow-Origin` and `…-Allow-Credentials: true`; the same request from
`http://evil.example` → no `Access-Control-Allow-Origin` header.

**7. LOW — two ITs boot the whole application and a Postgres container to assert bean presence.**
`RetentionSchedulerIT.java:19,26`, `RetentionDisabledByDefaultIT.java:17,24-25` (each one
`getBeanNamesForType` call). At 1:57 for 1139 tests the cost is acceptable and the base class is
deliberate (`AbstractPersistenceIT.java:36-45`), so this is context for reviewers, not a defect:
`ApplicationContextRunner` would test the same contract without Flyway + Hikari + a container.

**8. LOW — small units with no direct test (still standing from the previous sweep, narrowed).**
`grep -rl` over the whole test tree:
| Unit | Test refs | Note |
|---|---|---|
| `auth/Tokens.java:12-15` (random token generation) | 0 | length/alphabet contract unasserted |
| `auth/Codes.java:26-37` (`sixDigitCode`, `randomToken`) | 0 | the 6-digit shape is pinned *indirectly* (`PhoneVerificationProviderTest.java:49`, `AuthApiIT.java:282` assert `\\d{6}` off captured messages); leading-zero preservation is not |
| `domain/VerificationRules.java:20-36` | 0 | **refined vs the previous sweep:** `ofDefaults()` *is* exercised indirectly via `VerificationPolicy.defaults()` (`VerificationPolicy.java:23`) by the 4 `VerificationPolicyTest` cases; the untested half is the compact constructor's null/defensive-copy branches |
| `app/CommaSeparated.java:25-40` | 0 | happy path runs in every context (Spring binds the default origins/proxy lists), but trim / drop-empty / lowercase (`parseSetLowerCase`) rules are asserted nowhere |
| `guidance/DnsHeroAddressResolver.java:18-22` | 0 | the seam the SSRF policy trusts to enumerate *every* address; the classifier it feeds is thoroughly tested |
| `app/TextTruncation.java:19-24` | 0 | null + boundary truncation for the 1000-char audit columns |
| `domain/TextValidation.java:18-24` | 0 | blank/null rejection shared by the guidance value objects |

*Minimal fix.* One small test class each (< 80 lines total for the lot); `CommaSeparated` and
`TextTruncation` are pure functions.

## Areas I found clean (explicitly)

* **Assertions** — no assertion-free, no status-only tests. I parsed all 1111 test methods; 26 had no
  inline assertion token and all 26 delegate to private assertion helpers (verified by reading each
  one). The single "status-only" flag (`SecurityHeadersIT.hstsIsSentOnlyOnSecureRequests`) is a false
  positive of my heuristic — the method asserts header presence/absence and the exact HSTS value
  (`SecurityHeadersIT.java:66-84`).
* **Flakiness / determinism** — no randomness, no `@Disabled`, no assumptions, `Skipped: 0` in every
  run, clocks injected (`MutableClock`, `Clock.fixed`), two `Thread.sleep`s (one inside a fake server
  handler), concurrency expressed with `CountDownLatch`/`CyclicBarrier` + bounded awaits, and a full
  `-Dsurefire.runOrder=reversealphabetical` run is green.
* **No mocking framework** — 0 Mockito/`@MockBean`/`@SpyBean`; doubles are hand-written fakes at the
  seam interfaces and are documented as such (`RegistrySchedulerTest.java:22-25`,
  `FakeJavaMailSender.java:9`).
* **Test scope** — `@SpringBootTest` exactly once (the IT base); no `@WebMvcTest`/`@DataJpaTest`
  misuse; the pure resolver test uses MockMvc **standalone** with an explicit JSON converter and a
  documented reason (`ApiErrorHandlerClientErrorsMvcTest.java:54-61`).
* **IT isolation design** — one shared `postgres:16` container per JVM (`AbstractPersistenceIT.java:58-70`),
  a per-JVM temp verification send log to stop the durable daily-cap file leaking across runs
  (`:77-103`), a small Hikari pool with the connection-ceiling reason written down (`:64-70`), and
  every non-`@Transactional` IT explicitly deleting the tables the base `wipeAllTables()` does not
  cover (`AdminGuidanceSearchPagingIT.java:79-86`, `GuidanceOrderIT.java:103-110`). That convention is
  what makes the reverse-order run pass.
* **No silently-skipped test classes** — every file under `src/test/java` that contains `@Test`
  matches the surefire includes `*Test|*Tests|*TestCase|*IT`; the 32 non-matching files are all
  fixtures/doubles (`InMemory*`, `Stub*`, `Recording*`, `MutableClock`, `TestTokens`, and the
  one-shot `MarkdownMigrationDriver` ops tool).
* **Coverage of services/endpoints/repositories** — every `@Service` class has at least one test
  class, and a name-sweep of their public methods found no method without a call site in the test
  tree (e.g. `UserService.findByEmailOrPhone`, the only one that looked suspicious, is driven both
  ways: email through `AuthServiceTest` logins, phone through `loginByPhoneWorks`
  `AuthServiceTest.java:148`). Controllers are exercised through MockMvc ITs (including the new
  admin-list paging: `AdminModerationIT.java:335-400` asserts `X-Total-Count` un-paged, page tiling,
  past-the-end empty page and the 400 bounds; `ShelterBboxPagingIT`, `GuidancePaginationIT`,
  `AdminGuidanceSearchPagingIT` do the same for the public lists). Ten persistence ITs cover the
  non-trivial queries; the rest go through HTTP ITs.
* **The uncommitted admin-list lane** (untracked `AdminGuidanceSearchPagingIT`, +5 tests in
  `AdminModerationIT`/`GuidanceServiceTest`, modified `docs/api/openapi.json`) is consistent and
  green: 9 + 20 + 75 tests pass, and `OpenApiSnapshotIT` confirms the re-generated snapshot matches
  the live `/v3/api-docs`.

## Prioritized list — tests to add first

| # | Test to add | Where | Why first | Effort |
|---|---|---|---|---|
| 1 | **Fix the clean-checkout failure**: repoint `README.md:645` at a tracked doc (or make the guard ignore git-ignored paths) | `README.md:645` (or `DocumentationFactsTest.java:60-66`) | The only red test in a fresh clone; the local "green" is a lie | S |
| 2 | `HttpUrlRedirectClientTest` — 302 + `Location` not followed, `file:`/`ftp:` → `IOException`, User-Agent, malformed URI | new `src/test/java/ee/sheltermap/app/HttpUrlRedirectClientTest.java` | Only outbound client on the anonymous resolve path, zero coverage, sibling client already has this test | S |
| 3 | Lost-race → 409 (repository whose `save` throws `DataIntegrityViolationException`) | `ShelterReportServiceTest` | Documented as "the authority"; unreachable by every existing test | S |
| 4 | `dataIntegrity` → 400, `heroImportUnreachable` → 502, `locationUpstream` → 502, `locationResolve` → 400 | `ApiErrorHandlerTest` | Two frontend-consumed contracts (502) with no assertion anywhere, direct or end-to-end | S |
| 5 | Geo-resolve upstream/not-found arm end-to-end (throwing / empty `RedirectClient` stub → 502 / 400) | `LocationResolveIT` | Closes the same contract at the API layer, where the controller switch lives | S |
| 6 | Demotion: same admin token after `kind='REGISTERED'` → 403; also `isSuspended` flipping true → 401 | `AdminAuthorizationIT` | The javadoc's headline "DB is the truth" guarantee; its two sibling branches already have tests | S |
| 7 | CORS: allowed origin preflight → ACAO + allow-credentials; foreign origin → no ACAO | new `SecurityConfigCorsTest`/`CorsIT` | Security config with `allowCredentials(true)` and env-provided origins, 0 assertions | S |
| 8 | `Codes` (6 digits, leading zeros, alphabet) and `Tokens` (length/alphabet/uniqueness) | new `CodesTest`, `TokensTest` (same package) | Code-generation primitives; only the indirect `\d{6}` shape is pinned today | S |
| 9 | `VerificationRules` compact-constructor null/defensive-copy branches | new `VerificationRulesTest` | The policy *data* type; only `ofDefaults()` is covered (indirectly) | S |
| 10 | `CommaSeparated` (trim, empty entries, lowercase, unmodifiable), `TextTruncation` (null, exact boundary, over-length), `DnsHeroAddressResolver` (IP literal → itself) | new tiny test classes | Config parsing behind trusted proxies/CORS, audit-column truncation, SSRF address enumeration | S |
| 11 | Convert the two bean-presence ITs to `ApplicationContextRunner` | `RetentionSchedulerIT`, `RetentionDisabledByDefaultIT` | Removes two full app + Postgres boots for one assertion each (no new coverage) | S |

## Top 5 findings

1. **HIGH** — the committed tree is **red on a clean checkout**: `DocumentationFactsTest` (`:138`)
   fails because `README.md:645` backticks `docs/code-review/2026-09-08-review-output.md`, a path
   deliberately git-ignored (`docs/code-review/.gitignore:5`). `git archive HEAD` → `Tests run: 1125,
   Failures: 1`; repointing the citation at a tracked doc makes it green (4/4). This machine's green
   1139 is environment-dependent.
2. **MEDIUM** — `HttpUrlRedirectClient` (`HttpUrlRedirectClient.java:32-64`) still has **no test
   anywhere**: its non-`http(s)` rejection, "never auto-follow redirects", 3 s/5 s timeouts and fixed
   User-Agent are unasserted while the sibling `JdkHeroImageFetchClient` has exactly that test.
3. **MEDIUM** — `ShelterReportService.java:155-160`: the lost-race → `DuplicateReportException`
   branch (the case its javadoc calls "the authority") is unreachable by any test; the in-memory fake
   never throws and no test substitutes a throwing repository.
4. **MEDIUM** — **four** `ApiErrorHandler` mappings are asserted nowhere, not even end-to-end:
   `dataIntegrity` → 400 (`:361`), `heroImportUnreachable` → 502 (`:198`), `locationUpstream` → 502
   (`:461`), and `locationResolve` → 400 (`:208`, thrown at `LocationController.java:104`) — one more
   than the previous sweep listed.
5. **LOW** — two security-relevant branches outside the exception table are also unasserted: the
   demotion path of the JWT filter (`JwtAuthenticationFilter.java:73-80`, no test flips `users.kind`
   after issuing a token) and CORS (`SecurityConfig.java:167-176`, zero test references). The rest of
   the prior sweep's "clean" list — no assertion-free tests, no flakiness, zero mocking, correct
   scopes — I re-verified and **confirm**, with the JDK-27 failure now genuinely fixed (green on both
   JDK 21 and JDK 27).
