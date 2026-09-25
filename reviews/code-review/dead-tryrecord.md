# DEAD-TRYRECORD — deletion of `VerificationSendLog.tryRecord` (owner decision executed)

Branch `code-review` (HEAD `1420a4b` at start), lane DEAD-TRYRECORD. Finding source: `reviews/code-review/simplify-verification.md` §2.3/§6.2 (filed to the parent on the notes board, `docs/autopilot/CODE-REVIEW-NOTES.md:77`); the same shape was independently flagged in `reviews/12-summary.md` P2-14, `reviews/04-backend-security.md`, `reviews/02-backend-clean-code.md` F4 and `reviews/13-delivery-audit.md` P2-5. Decision: owner, recorded in this run's tasking — delete (priority: a minimal codebase a human can read). This report documents the unreachability proof, the method's history, exactly what went, the gate, and a package-wide audit for the same shape.

## 1. Unreachability evidence

Every search was run over the whole repo root or the named tree. No live reference exists anywhere:

| # | Place looked | Command / method | Result |
|---|---|---|---|
| 1 | `src/main` Java (word boundary) | `rg -w tryRecord src/` | Only the interface declaration (`VerificationSendLog.java:52`), the file-log impl (`FileVerificationSendLog.java:96`) and **one javadoc comment** in `VerificationService.java:156`. **Zero call sites.** |
| 2 | Case/spelling variants | `rg -i tryRecord src/` | Same closed set — no alias, no alternate casing, no kebab/snake form. |
| 3 | **Earlier-audit false positive disproved** | `rg -w` vs `rg` | `reviews/13-delivery-audit.md:105` listed `ShelterImportServiceTest` as a caller. That is a substring false positive: the test method `updateRefreshesTheFullRegistryRecord()` contains the letters "…Regis**tryRecord**". The word-boundary search matches zero times in that file. |
| 4 | Reflection / string-based lookup | `rg 'forName\|getMethod\|Class\.' src/main/java` | **No `Class.forName`, no reflective `Method` lookup anywhere in main** — the only `getMethod` hits are `HttpServletRequest.getMethod()` (HTTP). No mechanism by which a string could resolve to this method. |
| 5 | ServiceLoader / auto-configuration | `find src -path '*META-INF*' -o -name 'spring.factories' -o -name '*.imports'` | **Zero** — no service file, no factory entry anywhere under `src`. |
| 6 | Configuration / resources | repo-root `rg -i tryRecord` (covers `src/main/resources`: `application.yml`, `db/migration/` V2–V33, `registry/`) | **Zero matches** — no property key, no migration SQL, no config entry. |
| 7 | Frontend | repo-root grep (covers `frontend/src`) | **Zero** — the SPA consumes the API over HTTP; no class-name coupling. |
| 8 | Scripts / qa / CI / build | `rg -i -c tryRecord src/main/resources scripts qa .github pom.xml` | Two hits, both **documentation citing the test name**, not code: `qa/security-checklist.md:57` and `qa/test-plan.md:70` (see §6 — filed, not edited: outside this lane's write scope). `scripts/`, `.github/`, `pom.xml`: zero. |
| 9 | Docs anchors | `rg 'verification/[A-Z].*\.java' docs/agent/00-CURRENT-STATE.md` | The only `…/X.java` verification citation is `api/SubmitterVerification.java` (not this package). **No `DocumentationFactsTest` anchor touches any file I changed** (grep-verified); the guard stayed green in-gate. |
| 10 | Interface implementors | `rg 'implements VerificationSendLog' src/` | Exactly two: `FileVerificationSendLog` (main) and `InMemoryVerificationSendLog` (test double) — both had the impl removed with the interface method. No third implementation hides anywhere. |
| 11 | Independent corroboration | four earlier reviews | `simplify-verification.md` §2.3, `12-summary.md` P2-14, `04-backend-security.md`, `02-backend-clean-code.md` F4 all reached the same conclusion by grep + call-graph read. |

**Conclusion: unreachable from the running product by every mechanism checked — code, configuration, templates (none exist), service loading, reflection, migrations, scripts, CI. Deletion proceeded per the owner decision.**

## 2. What it was for, and whether its concurrency property lives on

**History.** `tryRecord` was born as review-campaign fix **M16** in `e7cf804` (2026-09-10, "hierarchical review campaign — all four lead verdicts closed"): *"verification throttle check+record is one atomic synchronized tryRecord (OK/COOLDOWN/DAILY_CAP)"*. Its job: decide whether `(userId, level)` may send **and** record the send in the **same lock-held step** — the interface javadoc was explicit that "a read-read-record across separately synchronized methods would let a burst pass both reads before either recorded". The service called it as the one atomic throttle gate.

**How it died.** `670f43d` (2026-09-21, "the nine high findings from the twelve-agent review sweep") reworked `requestVerification` into the **throwaway-then-record** pattern: the per-(user, level) decision became a *read-only* check (`lastSentAt` → `countToday`), the channel send happened first, and the durable slot is consumed by `record()` **only when the channel accepts** — "a channel outage must not burn a slot the user never gets a code for". The commit's own javadoc states the safety argument for the non-atomic check: the burst is bounded by the **ATOMIC per-contact rolling cap** (`RollingContactOtpLimiter.tryAcquire`), and every accepted send is recorded, so a failing channel can never bypass the cap. `tryRecord` was left in the interface and both impls — dead in production from that day, pinned only by tests.

**The concurrency property the tests checked.** The 50-thread burst (`FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly`) checked the property that made `tryRecord` valuable: **under a concurrent burst on the same `(userId, level)`, the per-user daily cap holds at EXACTLY `maxPerDay`** — 50 threads released by one latch, `maxPerDay=2`, cooldown 0 → exactly 2 OKs, 48 DAILY_CAPs, and exactly 2 recorded sends. A check-then-act race would have let more than 2 through; the atomic check-and-record made the cap race-exact. The companion unit test pinned the decision rules (cooldown before cap, silent skip at 0, rejected decisions record nothing), and the third test pinned the file log's COOLDOWN branch.

**Is that property still guaranteed elsewhere? Honestly: partially, and on a different axis.**
- **NOT on the (user, level) axis.** The shipped per-(user, level) check is two read-only reads; a concurrent burst can overcount the daily cap by at most the in-flight window. This residual is *documented, deliberate and accepted* — the service's own javadoc says so ("can overcount the daily cap by at most the in-flight window"), and the reviews tracked it (P2-12/P2-14, P2-5). The deleted tests were, per `13-delivery-audit.md:105`, "giving false confidence about production" — they certified a path that is not shipped.
- **YES on the contact axis, which is where the real volume valve is.** The shipped atomic check-and-acquire is `RollingContactOtpLimiter.tryAcquire` (per-contact rolling window, the Twilio/SMTP cost valve). A burst on the same `(user, level)` hits the same contact (a user's e-mail/phone is unique per level), so the race-exact bound that actually limits real, costing sends is pinned by `RollingContactOtpLimiterTest` (8 tests, including the rejected-acquire-records-nothing pin) and `OtpContactCapIT` — both still in the suite, green in the post-change gate.
- **The daily cap's core guarantees are still pinned** by tests that survived: `VerificationDailyCapIT.dailyCapThrottleCarriesRetryAfterUntilUtcMidnight` (end-to-end 429 + Retry-After until midnight), `VerificationServiceTest.dailyCapBlocksFurtherSends`, `FileVerificationSendLogTest.countsOnlySendsFromToday` (UTC day boundary), and `VerificationServiceTest.aFailingChannelCannotBeUsedToBypassTheDailyCap` (refused sends never consume a slot — the property that *replaced* the atomic one).

## 3. What was deleted

| File | What went | Lines |
|---|---|---:|
| `src/main/java/ee/sheltermap/verification/VerificationSendLog.java` | the `tryRecord` declaration + its javadoc; the `SendDecision` javadoc reworded off the now-dangling `{@link #tryRecord}` (kept: the enum is **production-live** — `VerificationService.userThrottleDecision` returns it and `retryAfterSeconds` switches on it) | −15 |
| `src/main/java/ee/sheltermap/verification/FileVerificationSendLog.java` | the `tryRecord` implementation (the `synchronized` check-and-record) | −17 |
| `src/test/java/ee/sheltermap/verification/InMemoryVerificationSendLog.java` | the `tryRecord` implementation (test double). The double itself is **kept** — seven test files construct it | −13 |
| `src/main/java/ee/sheltermap/verification/VerificationService.java` | the `requireUserThrottleAllows` javadoc's reference to "the send log's atomic {@code tryRecord}" — the silent-skip constraint it stated is kept, stated directly. Code untouched | ±0 (reword) |
| `src/test/java/ee/sheltermap/verification/FileVerificationSendLogTest.java` | `tryRecordWithinTheCooldownWindowIsSkippedWithoutRecording` (1 test), `concurrentTryRecordHonorsTheDailyCapExactly` (1 test, the 50-thread burst), and the four imports they alone used (`ArrayList`, `Collections`, `CountDownLatch`, `TimeUnit`) | −57 |
| `src/test/java/ee/sheltermap/verification/VerificationServiceTest.java` | `tryRecordIsOneAtomicDecisionWithTheSameSilentSkipRules` (1 test) | −28 |

**All three deleted test methods existed solely for `tryRecord`** — each builds its own state, calls `tryRecord` directly, and asserts on `SendDecision` values; none of them is shared infrastructure, and no other test in either file covers the same ground (the service-level throttle behaviour is separately pinned through `requestVerification` itself — see §2). No other file, fixture, script or config served only them. Deletions are left **uncommitted** for the parent, per the run convention.

## 4. Test count and why it drops

- Baseline (pristine HEAD `1420a4b`, last full green gate — CHANGE-NAME-SWEEP-TESTS, `flock` clean verify, `/tmp/sweep-tests-gate.exit` = 0): **1 350 tests, 0 failures/errors/skipped** (153 test classes).
- Deleted: exactly **3** test methods (§3) — `FileVerificationSendLogTest` 11 → 9, `VerificationServiceTest` 17 → 16.
- **Expected new total from my diff: 1 347.** The gate measured **1 361** — the +14 is fully accounted for by the concurrent PII-framing lane's three new test classes landing in the tree during my run: `security/PiiCryptoFramingTest` (+6), `security/BlindIndexFramingIT` (+3), `verification/CodeHashesFramingFallbackTest` (+5). A per-class diff of the sweep gate vs my gate (153 → 156 classes) shows **exactly** those three additions and my two subtractions and nothing else: 1350 − 3 + 14 = **1361**. §6 has the gate detail.

## 5. Further dead candidates in the verification package (reported, not deleted)

Method-level audit of all 23 main-source types (52 method names, name-based scan over `src/main` + manual resolution of every common-name collision and every Spring-wired seam):

- **`RollingContactOtpLimiter.clear()`** (`RollingContactOtpLimiter.java:113`) — the one same-shape find: a public method with **no production caller**, self-documented as "(test seam)", called only by `OtpContactCapIT.clearFakes()` (`OtpContactCapIT.java:89`). Same owner-call shape as `tryRecord`: delete it and the IT's fakes reset goes with it. **Reported, not deleted** — outside my authorised target, and its only caller sits in `src/test/java/ee/sheltermap/auth/` (another lane's tree).
- Everything else has a production caller, direct or through the containers that run it:
  - `SendDecision` — production-used by `VerificationService` (§3).
  - `VerificationSendLog.record`/`countToday`/`lastSentAt` — `VerificationService` (the live read-only gate + record-after-accepts).
  - `VerificationService.requestVerification`/`confirmVerification` — `VerificationController`.
  - `VerificationProvider.{level,request,confirm,providerCode}` — the provider map in `VerificationService`; the three providers are collected by `VerificationConfig.verificationService`.
  - `SmsSender.send`/`SmtpSender.send` — `PhoneVerificationProvider`/`EmailVerificationProvider` **plus** `auth/PasswordResetService` and `auth/ContactChangeService`; `TwilioSmsSender`/`SmtpPulseSmtpSender` are the prod providers, `DevSmsSender`/`DevSmtpSender` are `@Service @ConditionalOnProperty(matchIfMissing=true)` — alive by component scan (the dead-code lane's same classification for Dev beans).
  - `FileVerificationSendLog` / `VerificationSendLog` bean — `VerificationConfig.verificationSendLog` is an `@Bean` (container-invoked; the service consumes it by type).
  - `PendingVerification` — JPA-backed domain object; getters/`recordAttempt`/`isExpired` called by `JpaPendingVerificationRepository`, the providers, and (cross-package) `auth/ContactChangeService`, `auth/PasswordResetService`, `auth/Hashes`→`CodeHashes`.
  - `PendingVerificationRepository.{save,delete,findActiveByUserAndLevel}` — `VerificationService` + `JpaPendingVerificationRepository`.
  - `CodeHashes.{sha256Hex,constantTimeEquals,matches}` / `CodePolicy` — production callers in `auth/` (ContactChangeService, PasswordResetService, Hashes, JwtTokenService via `Hashes`).
  - `PhoneNumbers.normalizeE164` — 12 files outside the package.
  - The private helpers the scan flagged (`appendToFile`, `evictExpired`, `maskEmail`, `maskPhone`, `newApiOrFail`, `providerFor`, `contactFor`, `requireUserThrottleAllows`, `userThrottleDecision`, `requireContactCapAllows`, `secondsUntilNextUtcMidnight`) are all called from their own class — internal callers are production callers.

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, exit file read):

| Attempt | Result | Cause |
|---|---|---|
| 1 (`/tmp/dead-tryrecord/gate.log`) | **exit 1 — compilation error** | **Foreign, in-flight:** the PII-framing lane's test-first RED phase — its untracked `security/BlindIndexFramingIT.java` + `verification/CodeHashesFramingFallbackTest.java` referenced `PiiCrypto.legacyCodeHash`/`legacyBlindIndex` and `migration.V34BlindIndexFramingMigration`, which did not exist yet (main code not written). All 9 errors were `cannot find symbol` in those two foreign files; my six files compiled clean. The lane deleted the two files minutes later and re-landed them complete. |
| 2 (`/tmp/dead-tryrecord/gate2.log`) | **exit 1 — 5 errors, 0 assertion failures, 1 312 of ~1 361 run** | **Foreign, rule-7 interference:** `NoClassDefFoundError` on test classes (`testutil/FakeJavaMailSender`, `SmtpPulseSmtpSenderTest$1`, `app/InMemoryShelterOccupancyRepository`, `ShelterServiceTest$1`/`$3`) with **zero assertion failures** — the exact "concurrent build wiped `target/test-classes` mid-run" signature. The PII lane's focused `mvn test` runs (`/tmp/blind-index-framing/red1.log` 02:44, `green1.log` 02:45, no clean) overlapped my test phase (first missing class at 02:41:49). Rule 7: that is the hazard, not my code — re-ran under the lock. |
| 3 (`/tmp/dead-tryrecord/gate3.log`) | **exit 0 — BUILD SUCCESS** | Tree settled (0 changed files after 02:52, no concurrent mvn). |

**Gate 3 (the authoritative one): exit 0 — `Tests run: 1 361, Failures: 0, Errors: 0, Skipped: 0` (156 test classes, baseline 1 350 / 153), PMD clean, "All coverage checks have been met" (the 0.93 floor held — the deleted method was self-contained, so no coverage of other code was lost).** Guards green in-gate: `DocumentationFactsTest` 21/21, `SourceVocabularyTest` 2/2, `OpenApiSnapshotIT` 1/1 (the snapshot lane's regenerated `openapi.json` is consistent). My suites in the gate: `FileVerificationSendLogTest` 9/9, `VerificationServiceTest` 16/16.

**Foreign in-flight files in my gate windows, all named:** (a) PII-framing lane — `security/PiiCrypto.java` (framing API + `legacyCodeHash`/`legacyBlindIndex`), `security/PiiCryptoFramingTest` (+6), `security/BlindIndexFramingIT` (+3), `verification/CodeHashesFramingFallbackTest` (+5), `migration/V34BlindIndexFramingMigration` (new) — compiled, run and **green in gate 3**; their focused builds without the lock are what hit my gate 2 (filed on the notes board); (b) snapshot-clean lane — `docs/api/openapi.json` + 5 `api/` controllers + `auth/RegisterRequest.java` (annotation text only, report `reviews/code-review/snapshot-clean.md`), compiled + `OpenApiSnapshotIT` green in gate 3; (c) frontend lanes — `frontend/src/test-setup.ts`, `guidance-detail-page.{ts,spec.ts}`, untracked `__mut-probe.spec.ts` / `__race-probe.spec.ts` (the latter carrying a red pi-lens lint flag) — do not enter the Maven gate, left to their owner. **No foreign failures in gate 3.**

## 7. Unverified / caveats

- **Not verified:** the app running end-to-end — the gate (compile + full suite + PMD + 0.93 coverage floor) is the verification, per the run rules. The deleted method was self-contained (no production caller, §1), so no coverage of other code was carried by its tests; the 0.93 floor held in gate 3.
- **The PII-framing lane's first full-gate run of `BlindIndexFramingIT` was my gate 3** (their focused runs covered only the unit tests). It passed 3/3 in gate 3, so nothing foreign is red — but their lane's own report should carry its own gate if the run convention requires one per lane.
- **`qa/security-checklist.md:57` and `qa/test-plan.md:70` now cite a deleted test** (`FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly`). Both citations sit on lines whose *claim* remains true and still has live pins (`VerificationDailyCapIT`, `VerificationThrottleIT`, `OtpContactCapIT`); rewording them to cite the surviving pins is a one-line doc fix **outside this lane's write scope** (qa/ is owned by the guards/docs lanes) — filed for the parent. No guard parses those files (grep-verified: no test reads them), so nothing breaks.
- The per-(user, level) overcount residual is now *unpinned in the direction of the deleted property* — i.e. there is no test asserting the daily cap is race-exact, because the shipped code does not provide that guarantee. That is the honest end-state of P2-12: the shipped pattern is documented in the service javadoc and pinned for what it *does* guarantee (accepted-sends-always-recorded; refused-sends-never-recorded; bounded by the atomic contact cap).
- Deletions are uncommitted working-tree changes, per the run's convention (the parent commits).
