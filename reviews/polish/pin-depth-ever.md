# Pin-depth-ever — the pin carries the depth its submitter IS OR WAS

Lane **PIN-DEPTH-EVER** · branch `feature/frontend` · owner policy: *the badge must express
"what the user is or was"*. A pin's verification depth is the **highest depth the submitter
ever reached**: it upgrades on every read, a later channel revocation never lowers it, it is
frozen onto the row at account erasure, and it is never backfilled. The symptom this kills:
a pin whose author revoked (or lost) a channel went dark under the map's
"added by a partially verified user" filter, because the depth was re-derived from the
**currently active** claims only.

Status: implementation complete, four proofs red→green, full gate result at §7.
No commit from this lane — parent commits.

## 1. The policy, as implemented

- **Depth = max of the ever-reached set.** The shape function is the existing pure
  `SubmitterVerification.of` — `src/main/java/ee/sheltermap/api/SubmitterVerification.java:46`:
  empty → `null` (UNVERIFIED), one level → that level (EMAIL / PHONE / SMART_ID),
  two or more → `FULL`. Its javadoc now records that for the pin rule the input is the
  submitter's EVER-reached set, not only the currently active claims.
- **The ever-reached set, exact derivation, file:line.**
  `RegisteredUser.everLevels()` — `src/main/java/ee/sheltermap/domain/RegisteredUser.java:126`:
  the distinct `VerificationLevel` of **every** claim in the account's claim list, revoked
  included. No filter is needed for "ever verified": a claim row only exists once its
  channel is verified (`verification_claims.verified_at` is NOT NULL), so the full claim
  set *is* the ever-verified set. `User.everLevels()` —
  `src/main/java/ee/sheltermap/domain/User.java:67` — is the base answer (empty set: a
  guest has no claims) so the depth sites can call through the plain `User` reference.
  The "current" rule it replaces stays side by side, documented:
  `RegisteredUser.levels()` — `RegisteredUser.java:99` — active (non-revoked) claims only.
- **Serving (live rows).** `ShelterQueryService.toDto` —
  `src/main/java/ee/sheltermap/api/ShelterQueryService.java:412-414`:
  `author == null ? SubmitterVerification.stored(snapshot) : SubmitterVerification.of(author.everLevels())`.
  Monotonic by construction: the set is re-read on every request, and revocation removes
  a level from `levels()` but never from `everLevels()`.
- **Freeze (erasure).** `AccountService.deleteAccount` —
  `src/main/java/ee/sheltermap/auth/AccountService.java:173`:
  `depthAtErasure = SubmitterVerification.of(user.everLevels())`, computed **before** the
  user row (and its claims) cascade away — the last moment it can be read — and re-frozen
  onto every orphaned row by `purgePrivateHomesAndOrphanPublicRows`.
- **Write-time snapshot (V35 column).** `ShelterService.addPlace` —
  `src/main/java/ee/sheltermap/app/ShelterService.java:231` now snapshots
  `of(user.everLevels())` too — the same standing at write time. **NOTE: this hunk was
  already in the tree when this lane started and is not part of this lane's recorded edit
  set** (parent adjudication: owner's in-flight work — left untouched, noted per
  instruction, excluded from "what this lane changed" in §2). Consequence, consistent with
  the policy: a row written while its author was EMAIL-and-revoked-SMART_ID snapshots FULL,
  and the erasure later re-freezes the same value.
- **What is deliberately NOT changed.**
  - The **boolean** `submitterVerified` stays active-claim-based
    (`ShelterQueryService.java:398-400`: live author → `!author.getData().levels().isEmpty()`;
    orphan → the V31 write-time `submitterVerifiedAtCreation` snapshot). The task scoped
    the policy change to the **depth** field; the boolean/depth divergence (boolean false,
    depth EMAIL) is now representable and asserted (§3, proof a).
  - **No new legend tone**, no "added by a deleted user" entry — orphan rows keep the
    plain `user` tone and the filter options are untouched.
  - **No backfill.** Orphan rows whose author erased before this policy (V35 snapshot
    NULL — today ids 301-304, 310-316, 622-623 in the dev DB, incl. the named pins
    310/313/314) read UNVERIFIED, exactly as before. That is the recorded owner decision.
  - `ShelterDto` contract text, `docs/api/openapi.json` — untouched (no `@Schema` change,
    `OpenApiSnapshotIT` byte-exact check passes in the gate).

## 2. What this lane changed (and what it found in the tree)

**This lane's recorded edits** (every file below is a full-lane file):

| File | Change |
|---|---|
| `domain/User.java` | + `everLevels()` base method (`:67`, guest → empty set) + `Set` import. **The only missing compile piece**: both User-typed call sites (`ShelterQueryService:414`, `ShelterService:231`) call `everLevels()` on a `User` reference. This is the only file touched outside the nine-file in-tree set. |
| `domain/UserData.java` | Snapshot record grew one component — `everVerifiedLevels` (the monotonic twin of `levels`, defensive `Set.copyOf` in the compact constructor) — so the depth seam is available on the immutable snapshot, same shape as `levels()`. |
| `domain/GuestUser.java` | Constructor args for the new component (`Set.of(), Set.of()`). |
| `domain/RegisteredUser.java` | `getData()` now fills the new component; the lane's original `everVerifiedLevels()` implementation was reduced to a **one-line delegate** to the in-tree `everLevels()` so the tree carries a single derivation body (§9 consolidation note). |
| `api/ShelterQueryServiceTest.java` | + `aRevokedChannelStillServesItsDepthForALivingAuthor` (proof a). |
| `auth/AccountErasureStandingIT.java` | Test 3 **deliberately updated** — see §4 (the only existing test asserting the old current-active semantics). |
| `domain/UserHierarchyTest.java` | + `everLevelsSurviveRevocation` (the domain derivation table); `userDataIsAnImmutableSnapshot` extended for the new snapshot component; `guestCannotWrite` extended (`guest.everLevels()` empty — also the line coverage for the `User` base method). |
| `docs/autopilot/CODE-REVIEW-NOTES.md` | Lane entries: claim (re-appended — see §9), in-tree state, anchor drifts, consolidation. |
| `reviews/polish/pin-depth-ever.md` | This report. |

**In the tree, not this lane's recorded edits** (parent ruling: owner's in-flight work of
the same policy; left byte-for-byte untouched): `SubmitterVerification.java` (javadoc now
documents `of`'s pin-rule input as the ever-reached set), `ShelterQueryService.java:402-414`
(serving comment + the `of(author.everLevels())` call-site line), `AccountService.java:166-173`
(freeze comment + call-site line) and `:188-197` (purge javadoc), `ShelterService.java:227-231`
(write-time comment + call-site line), and `RegisteredUser.everLevels()` (`:126`) itself.
The lane's edit record (tool logs) is the evidence base; the attribution question is flagged
in §9.

## 3. The four proofs, red→green

**RED** — one command (under the flock), against the pre-change main tree, exit **1**:

```
flock /tmp/openshelter-mvn.lock mvn -B -ntp test \
  -Dtest="ShelterQueryServiceTest#aRevokedChannelStillServesItsDepthForALivingAuthor,AccountErasureStandingIT" \
  -DfailIfNoTests=false
```

- **(a)** `org.opentest4j.AssertionFailedError: expected: EMAIL but was: null` —
  `ShelterQueryServiceTest.aRevokedChannelStillServesItsDepthForALivingAuthor`
  (`ShelterQueryServiceTest.java:525`). The test registers, confirms EMAIL, revokes EMAIL,
  submits a row, and asserts the DTO serves `submitterVerification=EMAIL` with
  `submitterVerified=false`.
- **(d)** `java.lang.AssertionError: JSON path "$.submitterVerification"
  expected:<EMAIL> but was:<null>` — `AccountErasureStandingIT`
  (`AccountErasureStandingIT.java:218`), the deliberately-updated test 3: author confirms
  EMAIL, revokes it, submits, erases the account; the orphan row must serve the frozen
  `EMAIL` depth (pre-change it froze `null`, i.e. the row went dark — the production
  symptom, reproduced at the DB level).

**(b)** and **(c)** are green-stays-green preservation pins: they passed on the pre-change
baseline and pass after (they pin the parts of the rule the policy does not change — a
second live channel upgrades the depth; a never-revoked full standing freezes FULL).

**GREEN** — focused re-run (same flock), exit **0**, **69/69**:

```
flock /tmp/openshelter-mvn.lock mvn -B -ntp test \
  -Dtest="ShelterQueryServiceTest,UserHierarchyTest,SubmitterVerificationTest,AccountErasureStandingIT" \
  -DfailIfNoTests=false
```

| Class | Result | Carries |
|---|---|---|
| `ShelterQueryServiceTest` | 56/56 | **(a)** `aRevokedChannelStillServesItsDepthForALivingAuthor` (was red) and **(b)** `theDepthUpgradesWhenTheAuthorConfirmsASecondChannel` (pre-existing, unchanged) |
| `AccountErasureStandingIT` | 3/3 | **(c)** `aFullyVerifiedRowKeepsItsVerifiedStandingAfterTheAuthorErasesTheAccount` (pre-existing, unchanged), **(d)** `aChannelRevokedBeforeErasureStillFreezesItsDepthAfterTheAccountGoes` (was red), plus the pre-V31 baseline test |
| `UserHierarchyTest` | 7/7 (was 6) | + `everLevelsSurviveRevocation` — the derivation table at the domain seam: {} → revocation of the only channel still keeps `everLevels()`={EMAIL} while `levels()`={}; two channels → both survive a revocation of one |
| `SubmitterVerificationTest` | 3/3 | `of`'s shape table (null/empty → null, single → level, two+ → FULL) unchanged and green |

**Red honesty note.** The domain-seam table test's pre-red is compile-level (the
`everLevels()` seam it pins did not exist as a testable unit before — it is pinned now).
Proofs (a) and (d) are true assertion-level red→green with the failures quoted above.

## 4. The one deliberate test update (before → after)

`AccountErasureStandingIT` test 3 — the ONLY existing test asserting the old
current-active semantics at erasure. Renamed
`anUnverifiedRowStaysUnverifiedAfterTheAuthorErasesTheAccount` →
`aChannelRevokedBeforeErasureStillFreezesItsDepthAfterTheAccountGoes`; same scenario
(confirm EMAIL → **revoke EMAIL** → submit → erase the account), two assertions changed:

```diff
-        // The depth freezes to the account's standing at the moment of the
-        // erasure — the author's single channel was already revoked before the
-        // erasure, so the orphaned row reads UNVERIFIED, exactly as it read
-        // before the erasure; the V31 boolean still answers the write-time
-        // question.
+        // The depth freezes to the account's EVER-reached standing at the moment
+        // of the erasure — the author's single channel was revoked BEFORE the
+        // erasure, and "is or was" counts it: the orphaned row reads EMAIL,
+        // exactly as the live row read while the account was still active. The
+        // V31 boolean still answers the current-at-write question (false here).
         //
-        // Deliberate test update (pin-depth-ever): this test previously pinned
-        // the current-active semantics — the revoked channel did not count, so
-        // the frozen depth was null (UNVERIFIED). The owner's policy now reads
-        // the pin's depth as the highest standing the submitter EVER reached,
-        // so a revoked-but-once-confirmed channel freezes EMAIL. Nothing is
-        // weakened: the boolean assertion below is unchanged, and the
-        // nothing-confirmed case stays pinned by the pre-V31 test above.
+        // Deliberate test update (pin-depth-ever): this test previously pinned
+        // the current-active semantics — at the erasure the author had no
+        // ACTIVE channel, so the frozen depth was null (UNVERIFIED). The
+        // owner's policy now reads the pin's depth as the highest standing the
+        // submitter EVER reached, so a revoked-but-once-confirmed channel
+        // freezes EMAIL. Nothing is weakened: the boolean assertion below is
+        // unchanged, and the nothing-confirmed case stays pinned by the
+        // pre-V31 test above.
```

```diff
         assertThat(res.getStatus()).isEqualTo(200);
         assertThat(res.getBody()).hasJsonPath("$.submitterVerified").value(true);
-        assertThat(res.getBody()).hasJsonPath("$.submitterVerification").doesNotExist();
+        assertThat(res.getBody()).hasJsonPath("$.submitterVerification").value("EMAIL");
```

(The second assertion is the JSON-body twin of the same check; the test asserts both
the in-memory DTO and the serialized body.) The nothing-confirmed case (author with no
claim at erasure → NULL depth) remains pinned by test 2, unchanged.

## 5. Frontend — untouched, verified

No frontend file was modified by this lane; `npx ng test` was therefore **not** run
(baseline 1591 — the lane touched no `frontend/` file, per the gate rule). Verified
mapping that the backend values already flow correctly:

- `LEGEND_TONES = ['registry','partial','full','reported']` —
  `frontend/src/app/features/map/legend-view.ts:11`; `models.ts:362` types the tone as
  `'user' | 'full' | 'partial' | 'reported' | null` — all four backend depth values are
  already representable; no new tone needed.
- `verificationTone` — `frontend/src/app/shared/shelter-copy.ts`: `null` → `null`
  (plain grey user pin, no badge), `FULL` → `'full'`, anything else → `'partial'` (the
  yellow pin).
- `markerTone` — `frontend/src/app/shared/leaflet-service.ts:69-85`: open report of
  either kind → `'reported'` (red, overrides all); otherwise a `USER` row →
  `verificationTone(submitterVerification)` or `'user'`.
- The legend filter — `frontend/src/app/features/map/map-page.ts:256` — filters
  `markers` by `markerTone(row)`; selecting "added by a partially verified user" keeps
  exactly the yellow pins. With the depth now ever-based, a pin whose author revoked a
  channel stays yellow instead of falling to grey — the symptom is gone.

## 6. The judgement call to flag (one-line question)

**"Is or was" was read as: a REVOKED claim still counts toward the max.** If the intended
reading were "count only non-revoked claims", a pin whose author later lost *all*
channels would read unverified again — and the "added by a partially verified user"
filter would miss it again, i.e. the exact symptom this task exists to fix. The implemented
reading is the one that keeps the badge truthful to the history; confirm it is intended.

## 7. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
(run detached, exit file `/tmp/pin-depth-gate.exit` = **0**, log `/tmp/pin-depth-gate.log`):

**BUILD SUCCESS — Tests run: 1372, Failures: 0, Errors: 0, Skipped: 0.** Exactly the
predicted count: baseline **1370** + 2 new tests (`aRevokedChannelStillServesItsDepthForALivingAuthor`,
`everLevelsSurviveRevocation`) = **1372** (the AccountErasureStandingIT change is a rename
with in-place assertions, not a new test). All checkstyle/PMD/coverage/OpenAPI-snapshot/
doc-anchors stages in the same reactor pass.

Per-method evidence from the gate's own surefire reports (`target/surefire-reports/TEST-*.xml`):

| Proof | Method (class) | Gate result |
|---|---|---|
| a — revoked single claim serves the level for a living author | `aRevokedChannelStillServesItsDepthForALivingAuthor` (ShelterQueryServiceTest) | pass |
| b — 1→2 channels upgrades a living row to FULL (green-stays-green) | `theDepthUpgradesWhenTheAuthorConfirmsASecondChannel` (ShelterQueryServiceTest) | pass |
| c — erasure after two channels freezes FULL (green-stays-green) | `aFullyVerifiedRowKeepsItsVerifiedStandingAfterTheAuthorErasesTheAccount` (AccountErasureStandingIT) | pass |
| d — erasure after one revoked channel freezes the single level (was red) | `aChannelRevokedBeforeErasureStillFreezesItsDepthAfterTheAccountGoes` (AccountErasureStandingIT) | pass |
| baseline — pre-V31 orphan stays unverified | `aPartiallyVerifiedRowKeepsItsPartialStandingAfterTheAuthorErasesTheAccount` (AccountErasureStandingIT) | pass |
| derivation table — revocation never un-reaches a level | `everLevelsSurviveRevocation` (UserHierarchyTest) | pass |
| seam — guest ever-reached standing empty / snapshot component frozen | `guestCannotWrite`, `userDataIsAnImmutableSnapshot` (UserHierarchyTest) | pass |

## 8. Anchor drift (rule 6) — recorded in CODE-REVIEW-NOTES.md

- `SubmitterVerification.java:26-33` (constants block, cited by
  `docs/agent/00-CURRENT-STATE.md` depth sentence) → now **`:28-35`**, delta **+2**
  (class javadoc grew 17→19 lines). `:10-13` (live-derivation sentence) still true and
  still verbatim-cited.
- `ShelterQueryService.java:410-412` (serving ternary, same citation) → now **`:412-414`**,
  delta **+2** (serving comment grew 9→10 lines).
- `ShelterDto.java:126,127-134` — **unchanged** (no `@Schema` text changed).
- `DocumentationFactsTest` still passes: all citations in-range with letters; the citing
  sentences carry no token-checked identifiers, so the checks are structural (per the
  guard's own degradation rule). The doc's depth sentence stays **true** under the new
  rule but under-states it (omits the revocation clause) — flagged for the parent to
  enrich; this lane does not edit `00-CURRENT-STATE.md`.

## 9. Unverified / open items

1. **Attribution** — five in-tree hunks are not in this lane's recorded edit set (see §2);
   per the parent's ruling they are treated as owner's work. If the owner's editor ever
   re-saves, a re-diff against this report's §2 list is the clean audit.
2. **Naming consolidation** — `everVerifiedLevels()` (delegates) vs `everLevels()`
   (call sites) coexist on `RegisteredUser`, plus the `UserData.everVerifiedLevels`
   component. One rename at commit time collapses it; both are test-covered.
3. **Board clobber** — this lane's first claim entry was lost to a stale-base rewrite
   by another lane's append; re-appended. If the board manager truncates/rewrites the
   file, appends should be against the live tail.
4. **Live dev-DB rows** — orphans 301-304, 310-316, 622-623 (incl. named pins
   310/313/314) remain plain by design (no backfill); the one FULL row (id 312) is
   unaffected. No migration was added — the dev-DB state is unchanged by this lane.
5. **PM lint/format** on the new `User.everLevels()` line and the test files — covered
   by the gate's checkstyle/PMD/coverage stages (§7).
