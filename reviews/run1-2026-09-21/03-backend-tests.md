# Review 03 — backend tests

Agent 3 of 12. Read-only review of the backend test suite of
`/home/aleks/MyScripts/LocalRepos/OpenShelter`. Nothing outside this file was modified.

## Stack / versions actually in use

| Thing | Version | Source |
|---|---|---|
| Java (declared) | 21 (`<java.version>21</java.version>`) | `pom.xml:22` |
| Java (runtime on this machine) | `JAVA_HOME` = **27.0.0** (mise), `java` on `PATH` = 21.0.7 (sdkman) | `mvn -v`, `java -version` |
| Spring Boot | 3.3.13 | `pom.xml:9` |
| Build | Maven 3.9.16, surefire 3.2.5 (Boot-managed) | `pom.xml`, `mvn -v` |
| Test frameworks | JUnit 5 + AssertJ (via `spring-boot-starter-test`), Testcontainers `postgres:16` (`testcontainers-junit-jupiter`, `testcontainers-postgresql`) | `pom.xml:180-206` |
| Mocking | **none** — no Mockito, no `@MockBean`/`@SpyBean` anywhere | `grep -riE "mockito\|@MockBean\|@SpyBean" src/test` → only prose comments |
| Coverage tooling | **none** — no JaCoCo plugin in `pom.xml`, no `jacoco*.exec`, no `target/site` | see "JaCoCo" below |

Surefire is configured to pick up `*Test`, `*Tests`, `*TestCase` **and `*IT`** (`pom.xml:213-221`), so
the integration tier runs in the same `mvn test` phase — there is no separate `verify`/failsafe split.

Scale: 155 Java files under `src/test/java` (48 IT/boot-context classes, 106 test classes,
~35 hand-written fakes/fixtures), **1088 executed tests** in the last full run.

## What I actually ran (evidence, not inference)

* `mvn -o test` under **JDK 21** (`JAVA_HOME=~/.sdkman/candidates/java/21.0.7-tem`):
  **`Tests run: 1088, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS in 91 s**
  (log: `/tmp/fulltest-jdk21.log`). Reports were redirected to `/tmp` so the repo's own
  `target/surefire-reports` was left for the other agents.
* `mvn -o test -Dtest=JdkHeroImageFetchClientTest` under **JDK 27** (the environment's `JAVA_HOME`,
  i.e. what plain `mvn test` does here): **1 failure / 6**, reproduced 5 runs out of 5, and
  isolated to a single test method (`-Dtest=...#aStalledBodyIsAbortedAtTheReadTimeout` → 5/5 failures).
* `mvn -o -q test-compile` → exit 0, so the tree (including the other agents' in-flight edits)
  compiles.
* Standalone JVM probes (`/tmp/headprobe*`) to prove the root cause of finding 1.

## Review

### Correct (done well, verified)

* **No assertion-free or weak tests.** I parsed all 1060 test methods in `src/test/java` and counted
  assertions/expectations per body. Zero methods contain no assertion. A naive first pass flagged 25
  methods, but every one of them delegates to a private assertion helper —
  `ShelterApiIT.expectErrorShape` (`ShelterApiIT.java:96-108`, 6 `jsonPath` expectations),
  `AuthRequestConstraintParityTest.assertConstraints` (`AuthRequestConstraintParityTest.java:77-82`),
  `SecurityHeadersIT.hardeningHeaders()` (`SecurityHeadersIT.java:88-99`) — so the flags were false
  positives, not gaps.
* **No flakiness by construction.** `Math.random`/`new Random`: 0 occurrences. `@Disabled`,
  `assumeTrue`, `Assumptions.*`, `@EnabledIf`: 0 occurrences (and the JDK-21 run reports
  `Skipped: 0`, i.e. nothing is silently skipped). `Thread.sleep` appears exactly twice
  (`JdkHeroImageFetchClientTest.java:109` — inside a fake *server* handler; `HeroImageImportIT.java:390`).
  Every time-sensitive unit is driven by an injected `Clock` (`MutableClock`, `Clock.fixed(...)` —
  `Instant.now()` appears only in fixture construction, never in an assertion). Every concurrency
  test is latch/barrier-synchronised with a bounded await instead of a sleep:
  `FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` (50 threads, one latch,
  `done.await(10, SECONDS)`, "exactly 2 OKs" invariant), `RefreshRotationRaceIT` (`CyclicBarrier`,
  `get(30, SECONDS)`, "exactly one success" invariant), `ShelterImportServiceTest`
  overlap tests (`CountDownLatch` hand-off).
* **No over-mocking.** Zero mocking framework in the suite; doubles are hand-written fakes
  (`InMemory*` repositories/logs, `Capturing*`/`Recording*` senders, `Stub*`, `FakeRegistryClient`)
  or single-method lambdas at the seam interfaces. This is deliberate and documented
  (`RegistrySchedulerTest.java:22-25`, `ContactChangeServiceTest.java:24`,
  `SmtpPulseSmtpSenderTest.java:12`, `FakeJavaMailSender.java:9`).
* **Test scope is consistent and correct.** No `@WebMvcTest`/`@DataJpaTest` misuse, no Spring context
  in plain unit tests. `@SpringBootTest` appears in exactly one place — the IT base class
  (`AbstractPersistenceIT.java:31`) — and every IT that extends it actually needs the real security
  chain / JWT filter / Postgres. The behaviour tests are plain JUnit + AssertJ with in-memory
  repositories; the HTTP tests use MockMvc with the real filter chain.
* **The security surface is genuinely covered.** Direct evidence:
  `PiiCryptoTest` (12 tests, incl. blank / whitespace / invalid-base64 / short-key `PiiKeys`
  rejections at `PiiCryptoTest.java:116-131`), all four fail-closed boot guards including the
  mixed-profile `production,dev` and case-sensitivity cases (`ApiDocsGuardTest`,
  `DevEndpointsGuardTest`, `DevSenderGuardTest`, `ProdJwtGuardTest`) — which means
  `Profiles.isDevTestOnly` is fully exercised through its callers and needs no direct test,
  `ClientIpsTest` (12 tests, XFF trust matrix), `BodySanitizerTest`, `HeroAddressPolicyTest`
  (parameterised SSRF classifier over real `InetAddress` literals incl. IPv4-mapped smuggling),
  `MediaImageInspectorTest` (magic bytes), `Argon2PasswordHasherTest`, `RefreshRotationRaceIT`,
  and `OpenApiContractIT` which pins the public-vs-authenticated split and `x-admin-only` on every
  admin operation in both directions.
* **Endpoint coverage is complete.** I scripted every `@RequestMapping`/`@*Mapping` in the six
  controllers (30+ mappings) and searched the test tree for the corresponding built path, including
  the ones whose Java method names never appear literally (e.g.
  `PUT/DELETE /admin/guidance/{id}/translations/{locale}` → `GuidanceTranslationIT.java:280,300,304`;
  `GET /admin/guidance/{id}/translations` → `GuidanceTranslationIT.java:271,295`;
  `POST /api/shelters/{id}/info-request/reply` → `ShelterInfoRequestIT.java:164,249,323,333,339`).
  No mapping is without a test.
* **Repository coverage is real.** 9 dedicated persistence ITs (`ShelterRepositoryIT`,
  `UserRepositoryIT`, `UserCredentialsRepositoryIT`, `RefreshTokenRepositoryIT`,
  `PasswordResetTokenRepositoryIT`, `PendingVerificationRepositoryIT`,
  `ShelterOptimisticLockingIT`, plus `UserMapperBlankValueTest`,
  `AbstractPersistenceIT`) for the non-trivial queries, and the remaining repositories are exercised
  through the HTTP ITs (`ShelterReportIT` for the three report repositories,
  `AdminModerationIT` for moderation/report-action, `SiteTextsApiIT`, `GuidanceOrderIT`,
  `HeroImageImportIT` for media). No repository interface is entirely untested.
* **The IT base class is high quality**: one shared `postgres:16` Testcontainers instance, per-JVM
  temp verification send log to stop the durable daily-cap file from leaking across runs
  (`AbstractPersistenceIT.java:77-103`), small Hikari pool with the reason documented
  (`:64-70`), and a `TRUNCATE` helper for the deliberately non-`@Transactional` race tests.

### JaCoCo

No JaCoCo report exists in this tree — no `jacoco` entry in `pom.xml`, no `jacoco*.exec`,
no `target/site/jacoco`. `target/` only holds `classes`, `test-classes`, `generated-*-sources`,
`maven-status` and `surefire-reports`. Coverage percentages therefore play no part in this review;
every "untested" claim below was verified by searching the whole repo (`src/main`, `src/test`,
templates, reflection) rather than inferred from a report.

### Findings

---

**1. HIGH — `JdkHeroImageFetchClientTest` fails deterministically on JDK 27, so `mvn test` is red
with this environment's `JAVA_HOME`.**
`src/test/java/ee/sheltermap/guidance/JdkHeroImageFetchClientTest.java:187-201` (assertion at `:195`),
fixture handler at `:104-114`.

*What is wrong.* The test drives `/stall.png` (handler sends a 200 head with `Content-Length: 100`,
then `Thread.sleep(15_000)`, `:104-114`) and demands the **stall-watchdog** message:

```java
// JdkHeroImageFetchClientTest.java:192-195
assertThatThrownBy(() -> client(Duration.ofMillis(500))
                .fetch("http://127.0.0.1:" + port + "/stall.png", 5_242_880))
        .isInstanceOf(HeroImportUnreachableException.class)
        .hasMessageContaining("stalled");
```

On JDK 27 the production code legitimately takes its *other* branch — the response-head deadline
(`JdkHeroImageFetchClient.java:114-120`, message "The hero image host timed out answering") instead
of the body stall watchdog (`JdkHeroImageFetchClient.java:203-211`, "stalled the download").

*Evidence.* Reproduced 5/5, standalone, on an idle machine:
`mvn -o test -Dtest='JdkHeroImageFetchClientTest#aStalledBodyIsAbortedAtTheReadTimeout'` →
`Tests run: 1, Failures: 1`. Failure text:
`Expecting throwable message: "The hero image host timed out answering (no response within PT0.5S): 127.0.0.1" to contain: "stalled"`,
thrown at `JdkHeroImageFetchClient.java:119` (the head-deadline throw), i.e. the response future had
not completed within the 500 ms read timeout. Root cause proven with a minimal standalone probe
(`/tmp/headprobe/HeadProbe.java`, same fixture, no Spring): **JDK 21 → `sendAsync` future completes
92 ms after the request; JDK 27 → still not complete after 3 s.** So on JDK 27 a host that sends
headers and then hangs is indistinguishable, to `sendAsync`, from a host that never answers.
The repo's own `target/surefire-reports/TEST-…JdkHeroImageFetchClientTest.xml` (written by a run
*before* I touched anything) shows the identical failure.

*Why it matters.* `mvn test` is the documented suite entry point and this environment's
`JAVA_HOME` is JDK 27, so the gate is red out of the box; on JDK 21 the whole suite is green
(1088/1088), so the redness is purely JVM-version coupling — the worst kind, because it is
invisible in CI-on-21 and on the author's machine. The test also pins one of two *equivalent*
observable outcomes for the same external condition ("no progress within the read timeout"), which
is exactly the kind of implementation-detail assertion that rots.

*Minimal fix.* Two options, both small (pick either; the first is what I verified):
(a) make the fixture actually deliver the head — flush at least one body byte before hanging
(`out.write(new byte[]{0}); out.flush();` before the `Thread.sleep`). Probe `/tmp/headprobe2` shows
the head then completes in 80 ms (JDK 21) / 101 ms (JDK 27), so `readCapped` runs and the "stalled"
message is produced on both JDKs; or
(b) assert the shared contract instead of the branch: `isInstanceOf(HeroImportUnreachableException.class)`
plus the existing `.isLessThan(5_000)` elapsed bound (both branches fire at the read timeout, so the
timing invariant still proves "aborted at the read timeout, not after the server's 15 s").

---

**2. MEDIUM — the production `RedirectClient` has no test at all, so its scheme/redirect guards are
unverified.**
`src/main/java/ee/sheltermap/app/HttpUrlRedirectClient.java:32-64`.

*What is wrong.* `HttpUrlRedirectClient` is the real bean behind `LocationResolveService` and its
javadoc makes four concrete security-relevant promises — reject non-`http(s)` schemes
(`:46-49`), **never** auto-follow redirects (`:51`, so the ≤3-hop cap and per-hop re-validation in
`LocationResolveService` are actually in control), 3 s/5 s timeouts (`:34-35`), fixed User-Agent
(`:36,55`) — and none of them is asserted anywhere. `grep -rn "HttpUrlRedirectClient" src` matches
only its own file: no test class, no reference from any test. The entire
`LocationResolveServiceTest` (26 tests) and `LocationResolveIT` drive the seam with a lambda
(`LocationResolveServiceTest.java:32,269-275,285`; `LocationResolveIT.java:68-71`), which is the
right unit-level choice but leaves the real client untested.

*Why it matters.* This is the only outbound HTTP client on the anonymous-reachable geo-resolve path,
and its "no auto-follow + scheme allowlist" behaviour is the reason the hop-cap and address policy
cannot be bypassed by a redirect. The sibling client in the same design language —
`JdkHeroImageFetchClient` — *does* have exactly this test (`JdkHeroImageFetchClientTest`, real
`com.sun.net.httpserver.HttpServer`), so this is an asymmetry in the suite, not a house style.
A regression here (e.g. dropping `setInstanceFollowRedirects(false)`) would be invisible.

*Minimal fix.* Add `HttpUrlRedirectClientTest` using the pattern already twice in the repo (a local
`HttpServer` on `127.0.0.1:0` with a cached thread pool): assert 302 + `Location` returned without
being followed; `file:`/`ftp:`/`jar:` → `IOException` with the "unfetchable redirect target"
message; the `OpenShelter/1.0 (location resolver)` User-Agent on the wire; and a `URISyntaxException`
input → `IOException`. ~60 lines, no new dependency.

---

**3. MEDIUM — the documented lost-race path of the report dedup is unreachable by any test.**
`src/main/java/ee/sheltermap/app/ShelterReportService.java:152-156`.

*What is wrong.*

```java
// ShelterReportService.java:152-156
try {
    reports.save(report);
} catch (DataIntegrityViolationException e) {
    // Lost a race with an identical concurrent report — the unique
    // constraint is the authority; same semantics as the pre-check.
    throw new DuplicateReportException();
}
```

No test can reach this branch. The unit double never throws (`InMemoryShelterReportRepository.save`,
`src/test/java/ee/sheltermap/app/InMemoryShelterReportRepository.java:29-34`, is a plain
`Map.put`), and no test substitutes a throwing repository (`grep -rn "DataIntegrityViolation"
src/test` matches only `GuidanceTranslationIT` for a *different* table). The 409 that the pre-check
covers is tested twice (`ShelterReportServiceTest.java:147`, `ShelterReportIT.duplicateReportIs409AndCountStaysOne`),
but the concurrent-loser 409 — the case the javadoc calls "the authority" — never runs.

*Why it matters.* Two verified users reporting the same shelter at the same instant is the exact
abuse pattern the unique bound exists for (a duplicate report otherwise double-counts the
NON_EXISTENT tally). The service deliberately swallows the DB exception and re-maps it; a change
that turned this into a 500 would not be caught.

*Minimal fix.* One unit test: a `ShelterReportRepository` whose `save` throws
`DataIntegrityViolationException` (a 10-line inline subclass of the existing in-memory fake), assert
`assertThatThrownBy(... service.reportShelter(verified, id, NON_EXISTENT, null))`
`.isInstanceOf(DuplicateReportException.class)`. Optionally also assert no `autoHideIfEligible` fired.

---

**4. MEDIUM — three documented `ApiErrorHandler` mappings are asserted nowhere (not directly, not
end-to-end): `DataIntegrityViolationException → 400`, `HeroImportUnreachableException → 502`,
`LocationUpstreamException → 502`.**
`src/main/java/ee/sheltermap/api/ApiErrorHandler.java:325-329`, `:181-184`, `:422-425`.
Test file: `src/test/java/ee/sheltermap/api/ApiErrorHandlerTest.java` (6 tests).

*What is wrong.* The handler has **36** `ResponseEntity<ErrorResponse>` methods;
`ApiErrorHandlerTest` covers 4 of them (`optimisticLock`, `transactionSystem`,
`methodNotSupported`, plus the 500 fallback). That alone would be fine — the uniform-shape ITs cover
most status families end-to-end — but three mappings are covered by *neither*:

* `dataIntegrity` → 400 "Request failed due to invalid input": `grep` for that message or for the
  exception class in `src/test` returns nothing.
* `heroImportUnreachable` → **502**: `HeroImageImportServiceTest` asserts the *service-level*
  `HeroImportUnreachableException` (`:216,344,414`) but no test asserts the HTTP status;
  `HeroImageImportIT` asserts only 400/413 (`:336,358,384,411,435,455,474,519`).
* `locationUpstream` → **502**: `LocationResolveIT`'s stub always returns a 302
  (`LocationResolveIT.java:68-71`), so the upstream-failure path is never driven over HTTP;
  `LocationResolveServiceTest` asserts the exception (`:246,284`), not the mapping.
  `grep -rn "isBadGateway\|502" src/test` → only comments.

*Why it matters.* 502 is a contract the frontend consumes ("retry later" vs "your URL is broken"),
and it is the status the design explicitly names for both upstream failures. The 400/502 mappings
are also the only place where a swallowed upstream detail could leak; nothing pins them.

*Minimal fix.* Add 4-6 tests to `ApiErrorHandlerTest` in the existing direct-call style
(`handler.dataIntegrity(new DataIntegrityViolationException("x"), request)` → status 400 + body
message; `handler.heroImportUnreachable(...)` → 502; `handler.locationUpstream(...)` → 502;
`handler.malformed(new HttpMessageNotReadableException(…))` → 400). ~40 lines, no infrastructure.

---

**5. LOW — write-only test scaffolding (dead test state).**
`JdkHeroImageFetchClientTest.java:47,49,96,101`; `HeroImageImportIT.java:117,119,150,153`;
`JdkHeroImageFetchClientTest.java:221-222`.

*What is wrong.* `bigBytesWritten` and `bigWriteAborted` are declared and written in the fake
servers' oversized-body handlers but **read by nothing** — all 8 occurrences across both files are
declarations or mutations (`grep -rn "bigBytesWritten\|bigWriteAborted" src/test`). The abort proof
they were meant to carry moved to the client-side seam (`JdkHeroImageFetchClientTest.java:182-184`
asserts `client.bytesRead`), which the code comments confirm. `JdkHeroImageFetchClientTest.java:221-222`
additionally declares `@TempDir Path unused` with the comment "kept for a future fixture" and no use.

*Why it matters.* Dead scaffolding in a test that is already fragile (finding 1) makes the fixture's
intent ambiguous — a reader cannot tell whether the abort is or is not being observed.

*Minimal fix.* Delete the four fields and the `@TempDir` field. (Fixing finding 1(a) makes one of
them meaningful again — `bigWriteAborted` would become a real assertion — so this interacts with
finding 1; either assert them or remove them, don't leave them write-only.)

---

**6. LOW — `LocationResolveIT` is order-dependent by design.**
`src/test/java/ee/sheltermap/api/LocationResolveIT.java:42` (`@TestMethodOrder(OrderAnnotation.class)`),
`:75` (`@Order(1)`), `:85` (`@Order(2)`), `:99` (`@Order(3)`).

*What is wrong.* `rapidCallsFromOneIpHitTheFivePerMinuteBucket` (`:100`) shares the in-JVM per-IP
token bucket with `resolvedShortLinkReturns200WithThePair` and the fixture text says so explicitly
("the 200 test above consumed one, so …", `:103-104`). Running the class in another order, or the
429 test alone, changes how many tokens are left.

*Why it matters.* It is a real coupling between tests, and it is the kind that silently becomes a
flake the next time someone tightens an assertion. Mitigating factor: the assertion is deliberately
stated as an invariant ("a 429 arrives within 10 rapid calls", `:108-123`) rather than a position,
so it does survive reordering in practice — which is why this is Low and not Medium.

*Minimal fix.* None required. If it is touched, give the bucket test its own key by asserting on an
explicit drain loop with the invariant first (`for` loop until 429, then assert), so the assertion
no longer references the sibling test's consumption.

---

**7. LOW — a fixed `Thread.sleep(100)` guards a negative assertion.**
`src/test/java/ee/sheltermap/api/HeroImageImportIT.java:390` (in `aRedirectTo127001IsRefusedAndNeverFetched`,
`:377-395`).

*What is wrong.* The test asserts `secretRequests.get()` is zero, and the only reason it is not a
pure race is `Thread.sleep(100)` before the read — a fixed wait cannot prove absence, only reduce
the chance of a false pass.

*Why it matters.* Low: the stronger instrument already exists in the same file (a counter on a route
that is never supposed to be hit, and the assertion that the post stays `DRAFT`), so the sleep is
belt-and-braces rather than the sole evidence. Worth knowing when the suite gets slower.

*Minimal fix.* Keep the counter assertion, drop the sleep, or replace it with a bounded poll that
first asserts the draft is still a draft (a positive signal) — the negative assertion is then a
corollary rather than a timing bet.

---

**8. LOW — several small security-relevant units have no test.**
`src/main/java/ee/sheltermap/auth/Codes.java:26-37` + `Tokens.java:12-15`;
`src/main/java/ee/sheltermap/domain/VerificationRules.java:20-36`;
`src/main/java/ee/sheltermap/auth/TokenBucketRateLimiter.java:36-41,57-68`;
`src/main/java/ee/sheltermap/guidance/DnsHeroAddressResolver.java:21-23`.

*What is wrong / verification.* `grep -rn "VerificationRules" src/test` → **0 hits**, so the record's
null-safe compact constructor and `ofDefaults()` (the policy data behind every `RegisteredUser.canWrite()`)
are only exercised indirectly. `Codes.sixDigitCode()` / `Codes.randomToken` / `Tokens.random` are
asserted nowhere — tests only regex the code out of a captured message, so the "6 digits, leading
zeros preserved, exact length/alphabet" contract has no test. `TokenBucketRateLimiter`'s
argument validation (`capacity <= 0`, `refillPerSecond < 0`, `:36-41`) and its idle-bucket sweep
(`:57-68`, the memory-leak guard) are untested (the 4 existing tests cover burst/refill/key-isolation
only). `DnsHeroAddressResolver` is untested, though the classifier it feeds is thoroughly tested.

*Why it matters.* Low individually — all four are thin, and the surrounding behaviour is covered —
but the first two are code-generation and authorization-policy primitives; the third's
validation paths are the ones that fail loudly at boot.

*Minimal fix.* Four tiny tests (< 80 lines total): code format/leading-zero/alphabet assertions;
a `VerificationRules` null+defensive-copy + `ofDefaults()` matrix; two constructor-rejection
assertions for the limiter; one `DnsHeroAddressResolver` test that an IP literal resolves to itself.

---

**9. LOW / informational — IT scope is uniformly full-application, which is heavier than needed in
two places.**
`AbstractPersistenceIT.java:31`; `RetentionSchedulerIT.java:19`; `RetentionDisabledByDefaultIT.java:17`.

*What is wrong.* Every IT extends a `@SpringBootTest` base, and the per-class property/config
variations produce ~35 distinct context signatures → ~35 full application boots (Flyway + Hikari
each) per run. Two of them exist only to assert a bean's presence:
`RetentionSchedulerIT.theSchedulerBeanIsPresentWhenRetentionIsEnabled` and
`RetentionDisabledByDefaultIT.theSchedulerBeanIsAbsentWhenRetentionIsDisabled` — each boots the whole
app and a Postgres container for one `getBeanNamesForType` call.

*Why it matters.* Low, and worth saying plainly: at 91 s total the cost is currently acceptable, and
the design is deliberate and documented (shared container, small pool, `ddl-auto=validate` riding on
the same context). Recording it as context for reviewers, not as a defect.

*Minimal fix (optional).* `ApplicationContextRunner` for the two bean-presence guards;
`@DataJpaTest` (with `@AutoConfigureTestDatabase(replace = NONE)`) for the pure repository ITs.

---

### In-flight (not reported as defects)

The working tree carries another agent's unfinished work. I verified it is consistent, not
half-applied:

* `mvn -o -q test-compile` → exit 0, so the in-flight `SmsSender.send`/`SmtpSender.send`
  boolean-return change is applied across every producer and consumer
  (`EmailVerificationProvider`, `PhoneVerificationProvider`, `VerificationService`,
  `DevSmsSender`, `DevSmtpSender`, `TwilioSmsSender`, `SmtpPulseSmtpSender`) and every test double
  (`Recording*`, `Capturing*` return `true`), with new assertions in
  `EmailVerificationProviderTest`, `PhoneVerificationProviderTest`, `TwilioSmsSenderTest`,
  `VerificationServiceTest` (`FlakySmsSender`) and `SmtpPulseSmtpSenderTest`.
* `PaasteametRegistryClient.java` and `PaasteametRegistryClientTest.java` are deleted together.
* The `findById(id, User)` → `findById(id, long userId)` signature change is applied consistently in
  `ShelterQueryServiceTest.java:303-321` and `CommunityPulseTest.java:214`.
* The three untracked test files (`ShelterControllerDetailReadTest`, `LoopbackXffTrustGuardTest`,
  `RegistryPropertiesTest`) are complete, assert real contracts, and follow the suite's conventions.
* I did **not** treat any of this as a finding. One note for the reader: `ShelterControllerDetailReadTest`
  is a good addition (it proves the public detail read pays no caller domain mapping via a counting
  `UserRepository` spy) and will need the same treatment if the controller signature changes again.

### Prioritized list — tests to add first

| # | Test to add | Where | Why it is first | Effort |
|---|---|---|---|---|
| 1 | Fix `aStalledBodyIsAbortedAtTheReadTimeout` (flush one body byte in the `/stall.png` fixture, or assert both branches) | `JdkHeroImageFetchClientTest.java:104-114,187-201` | It is the only red test in the suite and it is red on the environment's own `JAVA_HOME` | S |
| 2 | `HttpUrlRedirectClientTest` — 302 + `Location` not followed, `file:`/`ftp:` → IOException, User-Agent, malformed URI | new `src/test/java/ee/sheltermap/app/HttpUrlRedirectClientTest.java` | Only outbound client on the anonymous resolve path, zero coverage, sibling client already has this test | S |
| 3 | Lost-race → 409: repository whose `save` throws `DataIntegrityViolationException` → `DuplicateReportException` | `ShelterReportServiceTest` | Documented as "the authority" for the concurrent duplicate; unreachable by every existing test | S |
| 4 | Direct handler tests for the three uncovered mappings: dataIntegrity→400, heroImportUnreachable→502, locationUpstream→502 (+ malformed→400) | `ApiErrorHandlerTest` | Two of the 502s are frontend-consumed contracts asserted nowhere, directly or end-to-end | S |
| 5 | Code-generation contract: `Codes.sixDigitCode()` is 6 digits with leading zeros, `Codes.randomToken`/`Tokens.random` length+alphabet | new `CodesTest` (package-private type, same package) | OTP/reset-code primitive with no test; a length/format regression is silent | S |
| 6 | `VerificationRules` — null-safe compact constructor + `ofDefaults()` matrix | new `VerificationRulesTest` | Zero test references to the record that carries the whole capability policy | S |
| 7 | `TokenBucketRateLimiter` — constructor rejections (`capacity<=0`, `refill<0`) and the idle-sweep path | `TokenBucketRateLimiterTest` | Validation and the memory-leak guard are the untested half | S |
| 8 | `DnsHeroAddressResolver` — IP literal resolves to itself, name returns the full A/AAAA set | new `DnsHeroAddressResolverTest` | The seam the SSRF policy trusts to enumerate *every* address | S |
| 9 | Optional: HTTP 502 for the geo resolve path end-to-end (throwing `RedirectClient` stub) | `LocationResolveIT` | Closes the same contract as #4 at the API layer | S |
| 10 | Optional: convert the two bean-presence ITs to `ApplicationContextRunner` | `RetentionSchedulerIT`, `RetentionDisabledByDefaultIT` | Removes two full app+Postgres boots for one assertion each | S |

### Top 5 findings

1. **HIGH** — `JdkHeroImageFetchClientTest.aStalledBodyIsAbortedAtTheReadTimeout`
   (`JdkHeroImageFetchClientTest.java:195`) fails 5/5 on JDK 27, the environment's `JAVA_HOME`;
   the code takes the head-deadline branch (`JdkHeroImageFetchClient.java:119`) while the test pins
   the stall-watchdog message (`:210`). Root cause proven by standalone probe (JDK 21 completes the
   response future in 92 ms, JDK 27 not in 3 s); suite is otherwise green (1088/1088 on JDK 21).
2. **MEDIUM** — `HttpUrlRedirectClient` (`HttpUrlRedirectClient.java:32-64`) has no test anywhere;
   its non-http(s) scheme rejection and "never auto-follow" guarantees are unverified while the
   sibling fetch client is tested.
3. **MEDIUM** — `ShelterReportService.java:152-156` lost-race → `DuplicateReportException` is
   unreachable by any test (the in-memory fake never throws); the only fixture that can produce it
   does not exist.
4. **MEDIUM** — three documented `ApiErrorHandler` mappings are asserted nowhere: dataIntegrity→400
   (`:325-329`), heroImportUnreachable→502 (`:181-184`), locationUpstream→502 (`:422-425`).
5. **LOW** — write-only test scaffolding (`bigBytesWritten`/`bigWriteAborted` in
   `JdkHeroImageFetchClientTest.java:47,49` and `HeroImageImportIT.java:117,119`; unused
   `@TempDir Path unused` at `JdkHeroImageFetchClientTest.java:221-222`).
