# SIMPLIFY-REPORTS — ShelterReportService readability pass

**Lane:** SIMPLIFY-REPORTS · **Branch:** `code-review` · **Scope:** `src/main/java/ee/sheltermap/app/ShelterReportService.java` + its pinning test `src/test/java/ee/sheltermap/app/ShelterReportServiceTest.java`. Nothing else touched.

**Target (per recon):** the reporting and dampening logic — how a report is counted, weighted, dampened, auto-confirmed and auto-hidden. Recon flagged `isDampenedFor` as a naming suspect (inventory.md §4 naming list; be-recon §5.3 names the report/verification rules as a must-keep mechanism — expression only, behaviour frozen).

## 1. What changed

**File: 407 → 421 lines. 11 methods, same public API, same constructor, same `REPORTING_MESSAGE` (referenced by `api/ShelterController.java:513`).**

### 1.1 `reportShelter` flattened (body 38 → 30 lines)

The flag-block
```java
boolean damped = false;
boolean reachesAutoHide = false;
if (type == NON_EXISTENT) {
    // 3-line comment
    damped = isDampenedFor(...);
    long tallyBefore = hideTally(...);
    long myPoints = damped ? 0 : trust.weight(...);
    reachesAutoHide = tallyBefore < THRESHOLD && tallyBefore + myPoints >= THRESHOLD;
}
```
became two named decisions, each a single boolean:
```java
boolean damped = type == NON_EXISTENT && hasOwnDuplicateListing(user.getId(), shelter);
boolean crossesHideTally = type == NON_EXISTENT && crossesHideTally(shelterId, user.getId(), damped);
```
- `damped` / `reachesAutoHide` (the boolean plumbing the run doc names) is gone; the crossing decision is a named predicate.
- **Ordering preserved exactly:** dampening decision → hide-tally store read → build report → save (race → same 409) → auto-hide if crossing → auto-confirm if `OPEN_CONFIRMED` → return `damped`. The tally is still read BEFORE the insert, so this report's own weight is added in the predicate, not read from the store (stated in its javadoc).

### 1.2 New named step `crossesHideTally(long, long, boolean)` (13 lines incl. javadoc, file tail)

Holds the 4→5 crossing arithmetic verbatim (`before < THRESHOLD && before + points >= THRESHOLD`, `points = damped ? 0 : trust.weight(reporterId)`). No new thresholds, no reordering.

### 1.3 `isDampenedFor` → `hasOwnDuplicateListing` (the recon's naming suspect)

- Renamed for what the predicate IS: the reporter holds their own other USER listing of the same place — "duplicate" is the codebase's established spelling (it reuses `ShelterService.normalizedNamesEqual` + `haversineMeters`, the duplicate rule's statics). Call site reads `boolean damped = type == NON_EXISTENT && hasOwnDuplicateListing(user.getId(), shelter);`.
- Four chained `.filter()` lambdas (each re-declaring `existing`) → one flat loop with one 5-condition guard and `return true` on the first match: same conditions, same order, same short-circuit semantics (`findAny().isPresent()` ≡ first-match loop for a pure predicate).
- Javadoc cut to the constraint (same content, the "dampening predicate" framing).

### 1.4 `reportOccupancy` javadoc carries its own throttle rule (11 → 18 lines)

The "occupancy counts against the rolling-hour budget; the tap does not" rule previously lived only in the class javadoc — the reader had to cross-reference it to understand the `@throws ReportThrottledException` already declared on the method. Now stated at the method. This is also what keeps the anchored line numbers stable (§3).

### 1.5 Comments cut to constraints (planning ids/history out)

| Was | Now |
|---|---|
| `(shelter-trust-and-reports).` (class javadoc, feature tag) | title states what the service is |
| `Auto-hide (trust-weighted since community-self-moderation)` | `Auto-hide (trust-weighted)` |
| `the queue evidences it; review 18 F2.` (autoConfirmIfEligible javadoc) | `the queue evidences it.` |
| `a row without a stored author — pre-V7 legacy — has no submitter to exclude` | `a row without a stored author has no submitter to exclude` |
| the 3-line "negative half / positive half / locked auto-trust" inline comment | deleted — both halves are stated in the class javadoc and the two named predicates |

SourceVocabularyTest pattern set: **0 hits** on both changed files (scan: `Wave N`, `wave N`, `W\d+-[A-Z]`, `\bD\d+\b`, `\bM\d+[a-z]?\b`, `P\d+-\d+`, `reviewer [NF]\d+`, `N\d+ finding`, `SW-C\d+`, `[A-Z]\d+ (review|finding|pass)`, `YYYY-MM-DD review`).

### 1.6 Pinned test file — comments only

`ShelterReportServiceTest.java`: feature-tag/history comments reworded (class javadoc `(shelter-trust-and-reports, community-self-moderation)`, the `auto-confirm (community-review-queue v2)` section header, the 3-line "old single-report promotion test is superseded" history block, `(admin-moderation)` / `(community-self-moderation)` section tags, one "the admin-moderation change owns the endpoint" comment). **Zero test code, assertion or name changed** — the file stays the pin; verified by `git diff -U0` classification (comment lines only) and the unmodified suite passing green (§4).

## 2. What was deliberately left (and why)

- **The class javadoc's rule spec** (auto-hide / auto-confirm / race / dampening / tap paragraphs): it is the in-code spec of a must-keep mechanism (be-recon §5.3) — every sentence is a constraint, so it stays; only the history phrasing was cut. It duplicates 00-CURRENT-STATE.md §2-3 by design (doc is the entry point, code is the authority).
- **`autoConfirmIfEligible`, `distinctConfirmers`, `autoHideIfEligible`, `hideTally` bodies:** already flat, short and pinned at the anchored lines — untouched (byte-identical bodies). The long `autoConfirmIfEligible` javadoc is the concurrency contract (version column, loser 409, retryable) — kept, de-wrapped only where "review 18 F2" was removed.
- **The upsert if/else in `reportOccupancy` / `putOpenStatus`:** a generic upsert helper would need two lambdas across two entity types — a clever construct the run doc rejects; the four-line if/else is plain.
- **Inline `try/catch` in `reportShelter`:** the unique-constraint-as-authority translation is one named constraint at the call site; extracting a 5-line method for it would not add a name the reader lacks.
- **`detailFor`, `requireVerified`, constructor, `REPORTING_MESSAGE`:** already plain; public names are a DI/HTTP contract.

## 3. Anchor check (rule 6) — `docs/agent/00-CURRENT-STATE.md` citations into this file

The layout was designed so every guarded citation stays **green at its old range** (no shared-gate impact). `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` passes on the old ranges; the re-derivations below are precision drift only (recorded for the single anchor pass):

| Doc line | Citation | Old target | New position | Guard on old range |
|---|---|---|---|---|
| 120 | `:348-358` (`autoConfirmIfEligible`) | 348-358 | **348-358 (exact)** | PASS |
| 121 | `:351` (threshold check) | 351 | **351 (exact)** | PASS |
| 128 | `:360-385` (`distinctConfirmers`) | 360-385 | **360-385 (exact)** | PASS |
| 129 | `:264-266` (OPEN-tap confirm call) | 265 (in 264-266) | **264 (in 264-266)** | PASS |
| 133 | `:380-383` (submitter removal) | 380-383 | **380-383 (exact)** | PASS (structural) |
| 135 | `:161,213,250-252` (`requireVerified` gate) | 161 / 213 / 250-252 | 161 **exact** / **212** / **249-251** | PASS (token at 161) |
| 146 | `ShelterReportService.java:309-314` (table cell — not a guarded citation form) | 309-314 | **309-314 (exact)** | n/a |
| 149 | `:269-280` (`hideTally`) | 269-280 | **268-279** (javadoc 268-274, body 275-279) | PASS (token 275-276) |

Drift to re-derive in the anchor pass: `:213` → `:212`; `:250-252` → `:249-251`; `:269-280` → `:268-279`. (The −1 line comes from the flatter `reportShelter` body, partly compensated by the `reportOccupancy` javadoc now carrying its own throttle rule; it self-cancels by line 309, so every anchor below `autoHideIfEligible` is exact.)

## 4. Pinned behaviour — evidence

**No test deleted, no test weakened, no assertion touched.** The pins that hold the rule, all passing **unmodified**:

| Pinned rule | Test(s), `ShelterReportServiceTest` (unit) |
|---|---|
| verified gate 403, no budget consumed | `guestAndUnverifiedCannotReport` |
| 404 unknown shelter | `unknownShelterIsNotFound` |
| one report per user per shelter (409 BEFORE throttle); lost race → same 409 | `duplicateShelterReportIsRejectedWithoutConsumingBudget`, `aLostRaceOnSaveAnswersTheSame409AsThePreCheck` |
| detail kept for factual types, dropped for binary | `factualTypesKeepTheirDetailBinaryTypesDropIt` |
| per-hour throttle 429 | `eleventhReportTypeActionIsThrottled`, `openStatusTapsAreNotThrottledAndConsumeNoBudget` |
| hide threshold 5, trust-weighted | `theFifthNonExistentReportAutoHidesAnActiveShelter`, `oneToFourNonExistentReportsOnlyFlagAndStayActive`, `theAutoHideThresholdStaysFiveAndTheVerifyThresholdIsThree`, `trustedReportersReachTheFivePointTallyWithFewerReports`, `aWeightThreeReporterHidesWithOneBaselinePartner` |
| disarmed / no re-hide after restore | `aDisarmedShelterIsNeverAutoHiddenEvenAtFive`, `noReHideAfterAManualRestore` |
| only NON_EXISTENT hides | `closedAndOpenConfirmedReportsNeverHide` |
| dampening (self-interested vote = 0 points, stored flagged) | `aRivalsNonExistentReportIsDampenedAndCountsZero`, `anInactiveOwnListingStillDampens`, `nonDuplicateReportersAreNotDampened`, `reportingOwnRowIsNotDampenedAndPositiveReportsAreNeverDampened`, `aDeletedOwnListingCannotDamp` |
| **3 distinct confirmers, submitter excluded** | `threeDistinctConfirmersVerifyANewRow`, `theSubmittersOwnPositiveReportDoesNotConfirm`, `theSubmittersOwnOpenTapDoesNotConfirmAndAClosedTapNeverConfirms`, `aSingleConfirmationDoesNotVerifyANewRow`, `aMixedReportAndTapFromThreeDistinctUsersVerifiesAndEachUserCountsOnce`, `theSubmittersOwnConfirmationNeverCountsIncludingAsTheThird` |
| dismissal drops from tallies | `aDismissedConfirmationDoesNotCountTowardTheTally`, `aDismissedReportCountsNothingAndTheFifthUndismissedStillHides`, `aDismissedReportExitsTheDisplayedCounts` |
| only NEW USER rows confirm; audit row shape (actor = crossing user) | `onlyNewUserRowsAreAutoConfirmed`, `onlyNewUserRowsAreAutoConfirmedByOpenTaps`, `aNonPositiveReportNeverConfirms` + the audit-row assertions inside the confirm tests |
| crossing race (exactly one transition, loser 409, retryable) | `api/ShelterTallyCrossingRaceIT` (integration, runs in the gate) |

Targeted run before the full gate: `ShelterReportServiceTest` + `DocumentationFactsTest` + `SourceVocabularyTest` green (counts in §6).

## 5. OpenAPI snapshot

No controller, DTO, exception message, header or 400-vocabulary touched — the change is inside one `@Service`. `docs/api/openapi.json` **unchanged** (diff empty; `OpenApiSnapshotIT` green in the gate). Nothing to revert.

## 6. Gate

Command (run rule 2/7): `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`, detached, exit file read.

| Run | Tree | Result |
|---|---|---|
| Baseline 1 (pristine) | HEAD, pre-edit | **exit 1 — FOREIGN**: 1028/1342 ran, 348 errors / **0 assertion failures**, 231× "class file … does not exist" / `NoClassDefFound` (`InMemoryGuidancePostRepository`, `InMemoryUserCredentialsRepository`, …). A concurrent `clean verify` (pid 946739, started 17:37, `multiModuleProjectDirectory` = this repo) ran **without the flock** and wiped `target/test-classes` mid-run — the documented rule-7 hazard, 5th occurrence (pid now recorded). Not attributable to this lane; no repo edit had been applied yet. Log: `/tmp/simplify-reports-baseline.log`. |
| Baseline 2 (pristine) | HEAD, pre-edit, foreign build finished | **exit 0** — 1342/1342, 0 failures, 0 errors. Green bar established under the lock. Log: `/tmp/simplify-reports-baseline2.log`. |
| Post-change | HEAD + this lane's 2 files | **exit 0** — 1342/1342, 0 failures, 0 errors. `ShelterReportServiceTest` 37/37 unmodified, `ShelterTallyCrossingRaceIT` 2/2, `OpenApiSnapshotIT` 1/1, `DocumentationFactsTest` 21/21 (anchors still point), PMD + JaCoCo floors met. Log: `/tmp/simplify-reports-postgate.log`. |

## 7. Unverified / residual risk

- The −1-line precision drift (§3) stays in `00-CURRENT-STATE.md` until the single anchor pass re-derives it (board entry filed). The guard is green in the meantime — this is the SIMPLIFY-MODERATION "precision drift only" pattern.
- `hasOwnDuplicateListing`'s `existing.getId() != null` guard is kept from the old stream filter though repository-loaded rows always have ids (defensive parity, behaviour-preserving).
- No mutation pass was run on this lane (not in the brief); the pinned suite + the crossing IT is the evidence, consistent with the lane's behaviour-preserving mandate.
