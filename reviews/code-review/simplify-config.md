# SIMPLIFY-CONFIG — backend config + error-handler simplification

**Lane:** SIMPLIFY-CONFIG · **Branch:** `code-review` (baseline `e21caf1`) · **Status:** done, gate evidence below.
**Scope:** `src/main/java/ee/sheltermap/config/**` + `src/main/java/ee/sheltermap/api/ApiErrorHandler.java` + the tests that pin them. Nothing else touched; cross-lane items went to `docs/autopilot/CODE-REVIEW-NOTES.md`.

---

## 1. What changed

### 1.1 `config/SecurityConfig.java` — the limiter declarations become one table (329 → 327 lines)

The ten near-identical limiter declarations (`SecurityConfig.java:74-176` before) were: nine `TokenBucketRateLimiter` beans, each `new`-ing the limiter from its own `RateLimitProperties` pair, with six scattered per-bean Javadocs repeating what the table below says. Now:

- `SecurityConfig.java:73-96` — **one constraint table** (a `<pre>` row per bucket: bean name, endpoint, keying, what the cap defends), in application.yml order, stating the two invariants a reader must keep: the bean name is the `@Qualifier` DI contract, and each (capacity, refill) pair is its row's `app.ratelimit.*` yml value, read back by the wiring test (§2).
- `SecurityConfig.java:97-141` — the nine beans, each now **one line** reading its row: `return tokenBucket(properties.loginCapacity(), properties.loginRefillPerSecond());`. Bean order now matches yml order 1:1 top-to-bottom.
- `SecurityConfig.java:299-301` — **one construction site**: `private static RateLimiter tokenBucket(int, double)`. The nine rows vary only the (capacity, refill) pair.
- `rollingContactOtpLimiter` and `throttleAlertRecorder` (the two `@Value`-bound, differently-shaped beans) are unchanged — same Javadocs, same parameters — just moved below the token-bucket table so the table is contiguous.
- One stale planning-id reference removed per the run's comment rule: the `(crisis-guidance D3)` tag in the `/api/guidance/**` matcher comment (`SecurityConfig.java:243` before) — the constraint text stays, the id goes. This also clears the one line of this file flagged by the guard lane's extended `SourceVocabularyTest` patterns.

**What I deliberately did NOT do:** programmatic bean registration (a `BeanFactoryPostProcessor` turning one table into nine named beans). It is the only shape that would delete the nine `@Bean` declarations, but it (a) is exactly the "clever construct" the owner's priority list rejects, (b) breaks the declarative `@Bean` visibility the run's "understandable by reading" goal exists for, and (c) would have to re-implement relaxed `@ConfigurationProperties` binding against raw `Environment` to stay behaviour-identical. The nine one-line declarations are the irreducible declarative surface while the four controllers keep injecting by `@Qualifier` name. If the owner wants the full collapse, the unblock is a controller-side change (one `RateLimiters` record injected instead of nine qualified names) — that is a request on the notes board (`auth/AuthController.java:65-70` et al.), not a decision this lane makes.

### 1.2 `api/ApiErrorHandler.java` — the 37-method lookup loses its 18 duplicated one-liners (515 → 457 lines)

Note on the brief: this file has **no deep nesting** — the maximum nesting is 2 (the for+if in `containsStaleStateException`, `ApiErrorHandler.java:407-415` before), and the recon itself called it "big but declarative (table-shaped)". The real duplication was 18 of the 37 handler methods being the identical body `return error(status, ex.getMessage(), request);` with per-method Javadocs that re-document what each exception class already documents in its own Javadoc. That is the "genuinely regular" part of the mapping, and it is now merged, using the file's own existing grouping idiom (it already grouped 400-malformed, 401, 403, 404, optimistic-lock):

- `ApiErrorHandler.java:130-170` — **`badRequest`**: the 7 plain-400 members (`InvalidResetToken`, `VerificationFailed`, `InvalidContactChange`, `InvalidShelter`, `PagingBounds`, `GuidanceValidation`, `UnsupportedImage`) in one `@ExceptionHandler({...})` list, one 3-line body, one family Javadoc with a per-exception line each.
- `ApiErrorHandler.java:184-234` — **`conflict`**: the 11 409 members (`DuplicateAccount`, `DuplicateReport`, `ShelterLimit`, `ShelterDuplicate`, `AlreadyVerified`, `SlugAlreadyUsed`, `MediaAssetInUse`, `ImportOwnedShelter`, `NonSuspendableUser`, `DuplicateInfoRequest`, `InfoRequestAlreadyAnswered`) in one list, one body, one family Javadoc.
- All constraint content that was handler-specific (e.g. "the hero-import path never reaches this handler", "the message carries the existing row id", "an auto-generated collision takes the -2/-3 suffix", "Pagination is the single source of both messages") was carried into the family Javadocs; the planning-id tags (`D4`, `D7`, `D1/D2`, …) were dropped per the run's comment rule, and the per-exception semantics remain in the exception classes' own Javadocs (I checked all 18 — they self-document).
- **Untouched by design:** `locationResolve` (`ApiErrorHandler.java:172-176`) keeps its own method — `ApiErrorHandlerTest` calls it by name and pinned tests must pass untouched. The 19 remaining handlers (`validation`, `malformed`, `mediaTypeNotSupported`, `methodNotSupported`, `locationResolve`, `mediaTooLarge`, `uploadSizeExceeded`, `unauthorized`, `dataIntegrity`, `optimisticLock`, `transactionSystem`, `forbidden`, `notFound`, the four `throttle` shapes, `locationUpstream`, `internal`) are byte-identical, as are the `throttle`/`error` helpers and every log line.
- Two stale planning-id references removed from the surviving Javadocs (`(crisis-guidance D7)` on `mediaTooLarge`, `(shelter-trust-and-reports D3)` on `reportThrottled`) — constraint text kept, ids dropped; this also clears this file from the extended `SourceVocabularyTest` list.

### 1.3 New tests (the pins for the refactor)

- `src/test/java/ee/sheltermap/config/SecurityConfigRateLimiterWiringTest.java` (110 lines, 2 tests) — §2.
- `src/test/java/ee/sheltermap/api/ApiErrorHandlerMappingTest.java` (113 lines, 2 tests) — drives all 18 merged-group exception classes through the **real advice dispatch** (standalone MockMvc, the `ApiErrorHandlerClientErrorsMvcTest` idiom, no Spring context) and pins each to its status + the thrower's own message. A grouping that drops a class from its annotation list demotes it to the catch-all 500, and this fails on that.

## 2. How the rate-limiter parameters are proven unchanged

The limits are security behaviour, so the proof is a test, not a comment:

1. **`SecurityConfigRateLimiterWiringTest` reads every constructed bean back.** It binds `application.yml` (the main one, via `YamlPropertiesFactoryBean`) with **Spring's own `Binder`** — the same relaxed binding the container uses for `@ConfigurationProperties` — to get the `app.ratelimit.*` / `app.limits.*` values, invokes each `@Bean` method on a real `SecurityConfig` instance, and asserts the constructed limiter's actual `capacity` / `refillPerSecond` fields (reflection read-back; the production 2-arg constructor bakes in `Clock.systemUTC()`, so the field read is the only exact parameter read) equal the yml values — for all nine token buckets. For the two `@Value`-bound beans it reads back `maxPerWindow` / `windowMillis` (`Duration.ofHours(window-hours).toMillis()`) and `retained` the same way. A row wired to the wrong property, or a construction that mangles a value, fails the build.
2. **The yml is the "before" reference and is untouched** — `git status` shows no change to `application.yml` or `application-test.yml`, so the values the test reads are byte-identical to what the beans carried before this change. (Values verified present: login 5/0.084, login-ip 20/0.334, reset 3/0.05, reset-confirm 10/0.2, register 10/0.01, verify 10/0.01, change 5/0.084, geo-resolve 5/0.084, session 30/0.5; otp 5/24h; alerts-retained 200.)
3. **Independent end-to-end corroboration in the same gate run:** `AuthRateLimitIT` (4 tests, capacity/refill overrides + burst-to-429) and `OtpContactCapIT` (3 tests) pass against the refactored beans — the enforcement behaviour, not just the parameters, is observed live.

## 3. How every error mapping is proven byte-identical

1. **Mechanical mapping diff.** I extracted the full `exception → (status, message source, logging)` table from the pre-edit file (via `git show HEAD:`) and the post-edit file with a small parser (37 handler methods before, 21 after; the diff shows *only* the two merges). Then I normalized the table **per exception class**: 54 classes before, 54 after, **zero classes with a changed mapping** — every class still resolves to the same status, the same message source (`ex.getMessage()` / the same literal / the same computed message), with the same log line (none of the 18 merged members logged; the `warn`/`error` lines stayed on `unauthorized`, `dataIntegrity`, the four `throttle` shapes and `internal`).
2. **The pinned tests pass untouched** (not modified at all): `ApiErrorHandlerTest` 12/12 (optimistic-lock triple, 405, 415, 400-malformed, 413-cap-named, 500-fallback, 400-data-integrity, 502, 400-location-resolve) and `ApiErrorHandlerClientErrorsMvcTest` 4/4 (real advice resolution for 415/400/413/500). Plus the full gate's end-to-end ITs (report 409s, slug 409, duplicate-account 409, 429s, …) re-verify the messages over HTTP.
3. **New dispatch pin** (`ApiErrorHandlerMappingTest`, §1.3) freezes the merged groups' resolution so a future annotation edit cannot silently demote a class to 500.
4. Dispatch-safety argument for the merge itself: Spring resolves `@ExceptionHandler` by exception-type specificity over the annotated class lists; all 18 merged classes are direct `RuntimeException` subclasses with no shared intermediate, the two groups are disjoint, and every merged member mapped to the identical (status, message, logging) — so for any thrown exception the candidate set and the winner are exactly what they were before. `locationResolve` and every other handler's annotation is unchanged.

## 4. Line counts

| File | Before | After | Δ |
|---|---|---|---|
| `src/main/java/ee/sheltermap/config/SecurityConfig.java` | 329 | 327 | −2 |
| `src/main/java/ee/sheltermap/api/ApiErrorHandler.java` | 515 | 457 | −58 |
| `src/test/java/ee/sheltermap/config/SecurityConfigRateLimiterWiringTest.java` | — | 110 | +110 (new) |
| `src/test/java/ee/sheltermap/api/ApiErrorHandlerMappingTest.java` | — | 113 | +113 (new) |

Inside `SecurityConfig`: the limiter region (11 beans + 6 scattered Javadocs) went 104 → 96 lines; the net file delta is small because the DI declaration surface (9 `@Bean` names + signatures) is irreducible while the controllers inject by `@Qualifier` name — see §1.1 for the rejected alternatives and the notes-board unblock request. The `ApiErrorHandler` delta is the real one: 18 duplicated handlers (≈150 lines of method + Javadoc) became two family methods (≈105 lines), and the surviving methods are the 19 with genuinely distinct shapes (computed messages, logging, conditional 409/500, the 413/415/405/502 vocabulary).

## 5. Gates

**Full gate on the live (shared) tree** — `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, exit file):

- **Exit 1.** Tests: **1356 run** (baseline 1352 + my 4), **2 failures, 0 errors**.
- **Both failures are caused by other lanes' uncommitted WIP in the shared tree, not by my diff:**
  1. `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` — two stale anchors, both in `frontend/src/app/features/admin/admin-page.ts` (`:515` "the view IS the URL"; `:603-618` the `{list}Page/{list}Size` constants), moved by the frontend lane's in-flight edit (`M frontend/src/app/features/admin/admin-page.ts` in the working tree). Zero citations into my files appear in the failure.
  2. `SourceVocabularyTest.sourceContainsNoUnresolvableIdReferences` — 1050 source lines carrying planning-id references; the guard lane's **uncommitted** pattern extension (`M src/test/java/ee/sheltermap/config/SourceVocabularyTest.java`, +99/−7 — the notes-board assignment) is what makes the formerly-vacuous guard see them. **Zero of the flagged lines are in files I wrote or edited** (verified by parsing the failure list against my four files).
- **PMD:** clean (`mvn pmd:check` → BUILD SUCCESS, no new high-priority findings).
- **Coverage floor:** met (`mvn jacoco:check@check` → "All coverage checks have been met", 0.93 line floor).

**Isolation proof** — a detached worktree at `e21caf1` with *only my diff* applied (2 modified files + 2 new tests): the two guards **plus** every pinned/new test of this lane pass **43/43, exit 0** (`DocumentationFactsTest` 21/21, `SourceVocabularyTest` 1/1, `TestConfigOverlayTest` 1/1, my 4, `ApiErrorHandlerTest` 12/12, `ApiErrorHandlerClientErrorsMvcTest` 4/4). So the shared-tree red is 100% attributable to the other lanes' WIP; on HEAD + this diff the gate is green. Worktree removed after the run.

All tests that pin my two files pass **untouched** in both runs: `ApiErrorHandlerTest` 12/12, `ApiErrorHandlerClientErrorsMvcTest` 4/4, `AuthRateLimitIT` 4/4, `OtpContactCapIT` 3/3, `SecurityHeadersIT` 6/6, plus the new 4.

## 6. Unverified / handed over

- **`00-CURRENT-STATE.md:201` anchor drift (caused by my change).** `SecurityConfig.java:192-196` (the X-Total-Count exposed-by-name comment + `setExposedHeaders`) now sits at **`:184-188`**. The doc is outside every lane's write scope this run (be-recon §8: "report the needed anchor change instead"), so it is on the notes board for the docs-owning lane/parent. `DocumentationFactsTest` stays green on my change (that clause carries no code token — structural check only; confirmed by the isolation run), but the citation would otherwise point 8 lines low.
- **Remaining `config/` planning-id references for the id-sweep lane:** the guard-lane's extension also flags 12 lines in config-package files I did *not* touch this run (`ApiDocsGuard:62`, `DevEndpointsGuard:57`, `DevSenderGuard:65`, `FailClosedGuard:6`, `JwtAuthenticationFilter:39`, `MediaConfig:11`, `OpenApiConfig:78/124/174/215/259`, `ProdJwtGuard:63` — all `W3-A`/`D2`/`D7`-style tags in Javadocs I deliberately left alone, since those files are not my targets and a mid-run comment sweep across the guards would collide with their owning lane).
- **The SecurityConfig "≈100-line collapse" expectation** is contract-capped, not a defect: see §1.1. Delivered the declarative maximum (one table, one construction site, nine one-line beans, yml-order alignment, read-back verification); the deeper collapse needs the controller-side request on the notes board.
- **Frontend LSP noise (not mine, flagged once):** the lane's auto-check repeatedly reported large LSP finding sets in `frontend/src/app/features/admin/admin-page.ts` / `guidance-view.ts` (e.g. `ReadableSignal` not exported, undeclared `guidanceQuery` properties). Backend edits cannot produce Angular diagnostics; the files are in active modification by the frontend lane. Logged on the notes board for frontend-lane + parent triage.
- `ApiErrorHandler` handler-method names are not part of any published contract, but one pinned test (`ApiErrorHandlerTest`) calls several by name — all such names were preserved (`optimisticLock`, `transactionSystem`, `methodNotSupported`, `mediaTypeNotSupported`, `malformed`, `uploadSizeExceeded`, `dataIntegrity`, `locationUpstream`, `locationResolve`), which is why the merge could only cover the 18 methods no test references.
