# TEST-QUALITY-RETENTION — retention prune-arithmetic pins + mutation pass

**Lane:** TEST-QUALITY-RETENTION · **Branch:** `code-review` (HEAD `bf13d67`)
**Filed by:** SIMPLIFY-VERIFICATION (its report §6.1: "RETENTION = 2 days /
PRUNE_AFTER_LINES = 10 000 have no dedicated test") + the parent's
retention-tree scope.
**Scope:** the two retention trees — `ee.sheltermap.retention` (the
account/audit prune job) and the verification send-log prune
(`FileVerificationSendLog`).
**Files for the parent's commit:** 3 test files (**7 new tests, 0 modified,
0 deleted**) + this report + the notes file. **No production code changed.**

## 1. The retention rule, as it actually is

There are TWO retention mechanisms; the filed task's "2-day window / 10k-line
budget" is the second one.

### 1.1 The verification send-log prune (`FileVerificationSendLog`)

The durable store behind the per-user cooldown/daily-cap math: one
tab-separated line per send (`userId\tlevel\tepochMillis`; the contact is
deliberately NOT persisted — PII in an unencrypted file; legacy 4-field lines
with a contact column still parse, contact ignored). Two hard constants
(not bound from yml) govern its size:

- **Retention window — `RETENTION = Duration.ofDays(2)`.** On **load** (every
  boot) and on **prune**, an entry with `epochMillis < now − 2d` is dropped;
  an entry **exactly at** the cutoff is **kept** (the comparison is
  `>= cutoff`). If a load dropped or skipped any line, the file is
  **rewritten**, so pruned/corrupted lines leave the disk, not just memory.
- **Line budget — `PRUNE_AFTER_LINES = 10_000`.** After each `record()`, when
  the in-memory list reaches **exactly 10,000** entries (`size >= cap`),
  `prune()` runs: drop everything older than 2 days and rewrite the file in
  canonical 3-field form. Below the cap the file is never rewritten — not even
  when an expired entry is appended (it simply stays until the next load or
  cap hit). Load does NOT enforce the cap: a file that boots with more than
  10,000 fresh lines stays put until the next `record()`.

### 1.2 The account/audit prune job (`RetentionService`)

`app.retention.*` (defaults `enabled=false`, `inactive-account-months=24`,
`audit-months=24`, cron 03:30 Europe/Tallinn — owner product decision 24/24):

- **Account window:** accounts with `last_activity_at` strictly BEFORE
  `monthsBefore(now, 24)` (calendar months, UTC-anchored) are erased through
  the same `AccountService.deleteAccount` path as `DELETE /account` — never a
  raw delete. The candidate query is REGISTERED-kind only, and the service
  re-checks `instanceof AdminUser` — **the admin carve-out is two gates**
  (individually pinned by TEST-QUALITY-MISC, commit `adbb641`; verified still
  pinned, §4).
- **Audit window:** `moderation_actions` rows with `created_at <
  monthsBefore(now, 24)` are bulk-deleted in one JPQL statement (strict `<`).
- **Disabled = total no-op:** flag off → nothing is read, written or logged
  (the scheduler bean itself doesn't exist — `matchIfMissing=false`).
- **Run accounting:** every enabled run leaves a durable `retention_runs` row
  (OK with the pruned counts, or FAILED with the PARTIAL account count + a
  truncated error); a failed account erasure does not roll back the earlier
  ones.

**The previously missing arithmetic:** no test fed the file log an entry
older than the 2-day window or a file past the line cap (the filed gap), and
the strict-`<` boundary of the month horizons (an account idle for *exactly*
24 months is a non-candidate) was unpinned in both trees — a `<`→`<=` flip or
a horizon narrowing (early deletion, the dangerous retention direction)
survived every existing retention test. Both are pinned now, §3.

## 2. The missing pins, written and red-proven

All 7 new tests are in the parent's commit set. Red-proofs below: each
mutation was applied to the throwaway copy
(`/tmp/test-quality-retention/mutant`, current tree incl. the new pins), the
named class re-run under the Maven lock, the red captured, the file restored
(copy verified byte-identical to the real tree afterwards). Logs:
`/tmp/test-quality-retention/`.

### 2.1 `FileVerificationSendLogTest.dropsEntriesOlderThanTheRetentionWindowOnLoadAndKeepsTheBoundaryEntry` (new)

Feeds the log file one entry **exactly 2 days old**, one **1 ms past** the
2-day window, and one 1 day old (control). Pins: exactly-at-cutoff kept,
one-past dropped from memory AND rewritten out of the file.

| Mutation | Red proof (the named rule in the failure) |
| --- | --- |
| W1: `RETENTION` 2d → 3d | `...must be dropped on load` — `expected null but was 2026-08-30T09:59:59.999Z` (`W1-window-2d-to-3d.log`). Collateral: the cap pin's "expired" fixture (3 days) now sits exactly at the 3-day cutoff, so it fails too — same mutation, one cause |
| W2: `RETENTION` 2d → 1d | `an entry exactly 2 days old is at the retention boundary and must be kept` — `expected 2026-08-30T10:00:00Z but was null` (`W2-window-2d-to-1d.log`) — single red |
| W3: load's `>= cutoff` → `> cutoff` | same boundary-kept assertion — `expected 2026-08-30T10:00:00Z but was null` (`W3-load-gte-to-gt.log`) — single red |

### 2.2 `FileVerificationSendLogTest.thePruneRewriteFiresAtExactlyTenThousandRecordsAndDropsExpiredEntries` (new)

Boots the log from 9,997 fresh legacy 4-field lines, then records: a fresh
entry (9,999 — asserts the file was NOT rewritten), an expired entry
(9,999 — asserts an expired append still triggers no rewrite), and one more
fresh entry (10,000 — asserts the rewrite fired: expired entry dropped, file
rewritten to canonical 3-field form, counts and newest-timestamp intact).

| Mutation | Red proof |
| --- | --- |
| C1: cap 10,000 → 10,001 | `the 10,000th record hits the line budget: expired entries dropped, file rewritten` — file still 10,000 lines with the legacy contact column (`C1-cap-10000-to-10001.log`) — single red |
| C2: cap 10,000 → 9,999 | `still below the budget - an expired append must not trigger a rewrite` — the rewrite fired one record early (`C2-cap-10000-to-9999.log`) — single red |
| C3: `size >= cap` → `size > cap` | same budget-hit assertion as C1 (the 10,000th record no longer triggers) (`C3-cap-gte-to-gt.log`) — single red |

### 2.3 Boundary pins for the month horizons (early-deletion direction + strict `<`)

| New pin | Rule pinned | Red proof |
| --- | --- | --- |
| `RetentionServiceTest.anAccountOneDayInsideTheHorizonIsKept` | account window not narrowed: 23 months + 1 day idle survives a 24-month window (early-deletion direction) | R8: service's `inactiveAccountMonths()` → `−1` — `expected RetentionReport[0, 0] but was [1, 0]` (`R8-account-horizon-24-to-23.log`) — single red |
| `RetentionServiceTest.anAuditRowOneDayInsideTheHorizonIsKept` | audit window not narrowed: row stamped 23 months + 1 day ago survives | R9: service's `auditMonths()` → `−1` — `expected 0 but was 1` pruned rows (`R9-audit-horizon-24-to-23.log`) — single red |
| `RetentionPruningIT.anAccountIdleForExactlyTheHorizonIsKept` | the REAL JPA candidate query is strict-before: `last_activity_at == cutoff` is not a candidate | R10: derived query `…Before` → `…LessThanEqual` — `expected 1L but was 0L` (`R10c-query-lt-to-lte.log`) — single red of 9. Mutation spelling note: `BeforeOrEqual`/`BeforeOrEqualTo` do NOT resolve in this Spring Data version (context fails to start — invalid mutation, re-run with the `LessThanEqual` keyword) |
| `RetentionPruningIT.anAuditRowExactlyAtTheHorizonIsKept` | the REAL JPQL audit delete is strict-before | R11: `a.createdAt < :cutoff` → `<= :cutoff` — `expected 1L but was 0L` (`R11-audit-jpql-lt-to-lte.log`) — single red of 9 |

### 2.4 `FileVerificationSendLogTest.tryRecordWithinTheCooldownWindowIsSkippedWithoutRecording` (new)

The file log's `tryRecord` cooldown branch had NO pin anywhere in the suite
(R4 below: the branch removal survives every existing test). Pins: within the
cooldown window the decision is `COOLDOWN` and nothing is recorded.

| Mutation | Red proof |
| --- | --- |
| F5: cooldown branch removed from `FileVerificationSendLog.tryRecord` | `expected COOLDOWN but was OK` (`F5-tryRecord-cooldown-branch-gone.log`) — single red |

## 3. Mutation table — the rest of the retention tree

Method: throwaway copy (as above). Each instance removes/loosens exactly one
behaviour; solo run of the named class(es); verdict = the named test(s) went
red. All 23 instances **killed** — 0 survivors.

| # | Behaviour removed (file) | Named test(s) — verdict |
|---|---|---|
| M1 | retention window widened 2d→3d (`FileVerificationSendLog`) | §2.1 window pin — **killed** (W1) |
| M2 | retention window narrowed 2d→1d | §2.1 window pin — **killed** (W2) |
| M3 | load boundary `>=` → `>` | §2.1 window pin — **killed** (W3) |
| M4 | line cap 10,000→10,001 | §2.2 cap pin — **killed** (C1) |
| M5 | line cap 10,000→9,999 | §2.2 cap pin — **killed** (C2) |
| M6 | cap trigger `>=` → `>` | §2.2 cap pin — **killed** (C3) |
| M7 | contact persisted in the log file (PII rule removed) | `theContactIsNotPersistedInTheLogFile` — **killed** (F1b; first patch draft uncompilable — `appendToFile` doesn't receive the contact, which IS the PII rule — re-run threading it through: `doesNotContain` red, single failure) |
| M8 | `countToday` day filter removed | `countsOnlySendsFromToday` — `expected 1L but was 2L` — **killed** (F2) |
| M9 | `countToday` (user, level) match removed | `recordsAndCountsPerUserAndLevel` — `expected 2L but was 4L`-shape — **killed** (F3; collateral `ignoresCorruptedLines` also red — same cause) |
| M10 | legacy 4-field parse support removed | `ignoresCorruptedLines` — `expected 1L but was 0L` — **killed** (F4; collateral cap pin — its seed is legacy-form) |
| M11 | `tryRecord` cooldown branch removed | §2.4 cooldown pin — **killed** (F5) |
| M12 | `lastSentAt` newest-comparison inverted | `lastSentAtReturnsNewestTimestamp` — **killed** (F8; 4 collateral reds — the other tests read `lastSentAt`, incl. the new pins) |
| M13 | disabled-job no-op guard removed (`RetentionService`) | `disabledJobPrunesNothingAndWritesNoRunRow` (unit + IT) — `expected RetentionReport[0, 0] but was [1, 0]` — **killed** (R1) |
| M14 | `instanceof AdminUser` second gate removed | `anAdminLeakingIntoTheCandidateQueryIsNeverErased` — `expected null but was RegisteredUser@…` — **killed** (R2). Exactly one red: with the query's kind filter (gate 1) intact, the plain admin test cannot see gate 2 failing — same shape as TEST-QUALITY-MISC's M1 |
| M15 | candidate query kind filter removed (real JPA) | `theCandidateQueryLeavesAdminRowsOut` (TEST-QUALITY-MISC's gate-1 pin) — **killed** (R3, re-run on my tree) |
| M16 | audit prune call removed | `prunesAuditRowsOlderThanTheHorizonAndKeepsTheNewerOnes` (unit + IT) — `expected 1 but was 0` — **killed** (R4; collateral IT run-row count) |
| M17 | OK run-row record removed | `recordsADurableRunRowWithThePrunedCounts` (unit + IT) — **killed** (R5) |
| M18 | FAILED run-row record removed | `aFailingAccountErasureRecordsAFailedRunRowWithThePartialCount` — **killed** (R6) |
| M19 | account horizon 24→25 months (late-deletion direction) | `prunesTheIdleAccountWithTheErasureSemanticsAndKeepsTheActiveOne` (IT) + `prunesTheAccountIdleBeyondTheHorizonAndKeepsTheOneInsideIt` (unit) — **killed** (R7; 8 reds — every test whose fixture sits exactly at the 25-month cutoff, one cause) |
| M20 | account horizon 24→23 months (early-deletion direction) | §2.3 `anAccountOneDayInsideTheHorizonIsKept` — **killed** (R8) — pre-fix this direction was UNPINNED |
| M21 | audit horizon 24→23 months | §2.3 `anAuditRowOneDayInsideTheHorizonIsKept` — **killed** (R9) — pre-fix UNPINNED |
| M22 | user query strict-`<` → `<=` (real JPA) | §2.3 `anAccountIdleForExactlyTheHorizonIsKept` — **killed** (R10c) — pre-fix UNPINNED |
| M23 | audit JPQL `<` → `<=` | §2.3 `anAuditRowExactlyAtTheHorizonIsKept` — **killed** (R11) — pre-fix UNPINNED |

## 4. The other lane's admin carve-out pins — verified, not duplicated

`RetentionServiceTest.anAdminLeakingIntoTheCandidateQueryIsNeverErased` and
`RetentionPruningIT.theCandidateQueryLeavesAdminRowsOut` (commit `adbb641`)
are present in the tree, pass unmodified in my focused green run (9/9 + 9/9),
and their individual-gate red proofs are on record in
`test-quality-misc.md` §3. M14/M15 above re-confirm both kills on my tree.

## 5. Hollow pins found / fixed

Scan of every retention-tree test (RetentionServiceTest, RetentionPruningIT,
RetentionSchedulerIT, RetentionBackfillIT, RetentionDisabledByDefaultIT,
FileVerificationSendLogTest, the InMemory fakes): **no vacuous assertions** —
every assertion is a value/shape comparison that can fail. The one structural
gap found was not a hollow pin but an **unpinned behaviour**: the file log's
`tryRecord` cooldown branch (no test named it — M11's first pass would have
survived) — closed by §2.4 instead of left or deleted. Carried over from
TEST-QUALITY-MISC (re-verified, unchanged): `InMemoryVerificationSendLog.countToday`
counts all-time — documented in the fake's javadoc, inert (tests are
short-lived).

## 6. Production bugs proven

_None._ The prune arithmetic does exactly what the javadocs and the yml
comment state; every boundary behaves as the code comments claim.

## 7. Gate

| Gate | Command | Result |
| --- | --- | --- |
| Focused green (real tree, new pins) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest=FileVerificationSendLogTest,RetentionServiceTest,RetentionPruningIT` | **exit 0** — 29/29 (11 + 9 + 9) — `/tmp/test-quality-retention/green-focused.log` |
| Full (sanctioned, Gate 1) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 1** — 1349 run / **1 failure = the foreign `DocumentationFactsTest` theme-tokens.ts doc anchor** (the shared-gate red other lanes recorded on the board; the core-fe theme rewrite `63444e6` moved the tokens and the doc re-derivation has not landed — my diff is 3 test files + report + board only, proven foreign) — `/tmp/test-quality-retention/full-gate.log` |
| Closing (Gate 2), full scope minus only that foreign method | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true -Dtest='!DocumentationFactsTest#theCurrentStateDocAnchorsStillPointAtTheCode'` | **exit 0 — 1348/1348, 0 failures**, PMD clean, "All coverage checks have been met" (18:52:39→18:55:25; `/tmp/test-quality-retention/full-gate-closing.log`) |

Test count: 1342 baseline → **1349** (+7: 3 file-log, 2 retention unit,
2 retention IT). No wall of missing-class errors — the rule-7 unlocked-build
hazard did not materialize for this lane.

## 8. Anything unverified / filed

- The 2-day / 10,000-line constants are hard-coded (not bound from
  `application.yml`), so the pins pin the code's behaviour; a value change is
  a production edit that will trip these pins directly.
- `RETENTION_INACTIVE_ACCOUNT_MONTHS`/`RETENTION_AUDIT_MONTHS` **yml defaults
  (24/24) are not themselves test-pinned** — every test passes 24/24
  explicitly, so a yml default drift to, say, 12 would stay green. Same
  coupling call as TEST-QUALITY-MISC's `sitetexts` key-name finding: filed,
  not fixed.
- The `prune()`-path retention comparison shares its boundary expression with
  the load path; the cap test's expired entry proves `prune()` drops exactly
  the `epochMillis < cutoff` set, and any change to the shared `RETENTION`
  constant is killed by §2.1 either way.
- Load-with->10,000-fresh-lines is by design NOT pruned until the next
  `record()` (observed, documented in §1.1; no pin — the behaviour is the
  code as-is, and no test could distinguish "no cap on load" from "cap on
  load that happens to pass" without a >10,000-fresh-lines fixture, which
  would slow the suite for a design choice the code comments already state).
