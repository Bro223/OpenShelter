# ERASURE-DEPTH-FIX — the erasure depth bug, fixed

**Branch:** `code-review` · **Lane:** ERASURE-DEPTH-FIX · **2026-09-25**

The bug (diagnosed in `reviews/code-review/remove-unverified-pin.md` §2): when an account is
erased, the V31 boolean snapshot (`submitter_verified_at_creation`) survives, but
`submitterVerification` (the *depth* — FULL / EMAIL / PHONE / SMART_ID) was derived live from the
author's current claims, so `author == null` reverted every orphaned FULL/PARTIAL row to
unverified. The owner's rule: an erased account's rows keep the standing they had while the
account was active.

## 1. What I snapshotted, and where

A new depth twin of the V31 boolean, frozen onto the row:

- **Column:** `shelters.submitter_verification_snapshot VARCHAR(16)` — one of the
  `SubmitterVerification` names (`EMAIL`/`PHONE`/`SMART_ID`/`FULL`) or NULL.
- **Migration:** `src/main/resources/db/migration/V35__shelter_submitter_verification_snapshot.sql`
  (append-only, one `ALTER TABLE … ADD COLUMN`, no backfill — see §4).
- **Domain:** `domain/Shelter.java` — new `String submitterVerificationSnapshot` field
  (declared after `inaccurateMarkedBy`, getter/setter after the V31 accessor). Stored as the
  enum's name because the enum lives in the api layer and the domain stays below it (no new
  package edge; moving the enum was rejected because `00-CURRENT-STATE.md:111` anchors
  `api/SubmitterVerification.java:10-13,26-33` and a move would break the doc guard this lane
  must keep green).
- **Entity/mapping:** `persistence/ShelterEntity.java` (`@Column(name = "submitter_verification_snapshot", length = 16)`)
  + both directions of `persistence/JpaShelterRepository.java` (toEntity `:83`, toDomain `:329`).

**Populated at every row write** (and at the one other event that touches the author link):

1. **Submission** — `app/ShelterService.java:230-231` (`addPlace`, right under the V31 boolean
   write): the depth as at write time, `SubmitterVerification.of(user.getData().levels())`.
2. **Owner edit** — `app/ShelterService.java:518` (`ownerEditRow`): carried through unchanged,
   exactly like the boolean ("an edit never re-snapshots it").
3. **The erasure itself** — `auth/AccountService.java:173` computes
   `SubmitterVerification.of(user.getData().levels())` BEFORE the user row is deleted (the claim
   set cascades away with it — that is the last moment it can be read), and
   `AccountService.java:205` (`purgePrivateHomesAndOrphanPublicRows`, the public-row branch that
   already sets `created_by = NULL` and saves) re-freezes the column to that value. Both
   erasure funnels (owner `DELETE /account` and retention, which calls the same
   `AccountService.deleteAccount`) go through this one step.

## 2. The derivation change

`api/ShelterQueryService.java:412-414` (in `toDto` — the single shared projection):

```java
SubmitterVerification submitterVerification = author == null
        ? SubmitterVerification.stored(shelter.getSubmitterVerificationSnapshot())
        : SubmitterVerification.of(author.getData().levels());
```

- **Author alive → byte-for-byte today's live derivation** (`SubmitterVerification.of(levels)`):
  nothing changes for living accounts, including the live-upgrade behaviour ("a one-channel row
  upgrades to FULL the moment the second channel is confirmed" — still pinned by
  `ShelterQueryServiceTest.theDepthUpgradesWhenTheAuthorConfirmsASecondChannel`).
- **Author gone → the frozen snapshot** via the new read seam
  `api/SubmitterVerification.java:62` (`SubmitterVerification.stored(String)`: null → null,
  otherwise `valueOf` — one conversion point, loud on a value we never write).
- **Author gone + no snapshot** (pre-V35 orphans, registry rows, an author with nothing
  confirmed at erasure) → `null` = UNVERIFIED — exactly today's behaviour for those rows.

**The V31 boolean and its semantics are untouched** — `ShelterQueryService.java:400-402` is
byte-identical; it is still the write-time snapshot with the live fallback for NULL rows.

### Why the freeze happens at erasure, not only at write time

The task sketch said "snapshot the depth as at write time". That alone cannot satisfy the
pinned invariant: `AccountErasureStandingIT.anUnverifiedRowStaysUnverified…` writes the row at
one confirmed channel (write-time depth EMAIL), then REVOKES the channel, and requires the row
to read **no depth** after erasure — a pure write-time snapshot would serve `EMAIL` and stay
red. (Tests 1–2 pass either way; test 3 forces the design.) The only semantics consistent with
all three pins and the owner's rule ("keep the standing they had **while the account was
active**") is: the column carries the row's last live standing, which is why the erasure
re-freezes it. The value is exact, not approximate: it is the same pure function
`SubmitterVerification.of(levels)` over the same active claim set a live read was serving in
the same transaction.

## 3. The conflicting pin, reconciled

`src/test/java/ee/sheltermap/auth/AccountDeletionIT.java:246`
(`deletionPurgesPrivateOrphansPublicAndCascadesTheAccount`) asserted
`jsonPath("$.submitterVerification").doesNotExist()` after erasure — pinning the **buggy**
behaviour, the opposite of the owner's rule (its own comment even said "the depth is still
live-derived"). With the fix, the orphaned row keeps the standing it had while the account was
active; that test's author has exactly one confirmed channel (EMAIL, via `registerVerified`),
so the depth at erasure is EMAIL.

**Updated:** `doesNotExist()` → `value("EMAIL")` (`AccountDeletionIT.java:246`), with the
comment rewritten to state the rule and the provenance of this change. **Nothing else in that
test changed** — the CONFIRMED-stays-CONFIRMED, locationKind, `submitterVerified=true`,
`provenance=COMMUNITY_REPORTED`, address-null, audit-row, cascade, and re-registration
assertions are all intact. The pin and the owner's rule cannot both be right; the owner's rule
(`closing-decisions-2026-09-24.md` §7: erasure keeps the row's standing) wins, and the red
proof below shows the pin was asserting the degradation, not a decision.

## 4. The migration, and what it does to existing rows

`V35__shelter_submitter_verification_snapshot.sql` — one append-only
`ALTER TABLE shelters ADD COLUMN submitter_verification_snapshot VARCHAR(16);`.

- **Version is V35, not V34:** version 34 is already taken by the Java migration
  `migration/V34BlindIndexFramingMigration.java` (the SQL tree tops out at V33, which is why a
  file listing looks like V34 is free). Flyway fails on the duplicate ("Found more than one
  migration with version 34" — reproduced once, fixed by renaming).
- **Existing rows:** all get NULL. NULL is the honest "no snapshot" value and the read falls
  back exactly as today: a live author derives live (unchanged), an already-orphaned row
  resolves UNVERIFIED (unchanged — the no-backfill decision, `closing-decisions` §6, applied to
  this column the same way: inventing a past for rows whose author is gone would be guessing
  provenance). **Backfill decision: none** — an orphaned pre-V35 row's depth is unknowable (its
  claims cascaded away with the author) and the owner's policy is "keep current behaviour", so
  it keeps exactly the standing it has always resolved.
- **Registry / non-user write paths:** never write the column (no author) — NULL, reads
  unchanged.

## 5. Red → green

**Red (pre-fix, this tree)** — focused run under the lock, unmodified production code,
`/tmp/erasure-depth-red.log` (exit 1), matching the shape recorded in
`remove-unverified-pin.md` §2 (same assertions, same lines):

```text
Tests run: 3, Failures: 2, Errors: 0, Skipped: 0  (AccountErasureStandingIT)
  aFullyVerifiedRow…:155    JSON path "$.submitterVerification" expected:<FULL>  but was:<null>
  aPartiallyVerifiedRow…:185 JSON path "$.submitterVerification" expected:<EMAIL> but was:<null>
  anUnverifiedRowStaysUnverified…  PASS
```

(Compile finished at 22:13:23, before the first source edit at 22:13:31 — the red run is on the
unmodified tree.)

**Green (post-fix)** — same two classes under the lock, `/tmp/erasure-depth-green.log`:

```text
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0  (AccountErasureStandingIT)
Tests run: 6, Failures: 0, Errors: 0, Skipped: 0  (AccountDeletionIT, reconciled pin included)
```

- FULL stays FULL, PARTIAL stays PARTIAL, unverified stays unverified (the three erasure pins).
- **Living-author derivation unchanged** is pinned by: the three tests' ACTIVE-account
  baselines (FULL / EMAIL / absent-depth asserted while the account is alive), plus the existing
  `ShelterQueryServiceTest` live-derivation pins (live upgrade to FULL,
  `aFalseSnapshotWinsOverTheLiveVerifiedAuthor` — live depth renders beside a false boolean,
  pre-V35 NULL-snapshot fallback) and `ShelterApiIT`'s live-author assertions — all green in
  the gate below, none modified.
- `AccountErasureStandingIT.java` itself was NOT touched at any point (the pin's currency is
  what it asserts).

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`,
detached, exit file read (run rule 7).

## 7. Gate results

**Attempt 1 — exit 1, `Tests run: 1364, Failures: 2`** (`/tmp/erasure-depth-gate.log`): the
count is exactly the expected 1361 + 3, and the two failures were both my own
bookkeeping, no foreign failure anywhere in the suite (every other test — including all
three erasure pins and the reconciled `AccountDeletionIT` — green in this full run):

1. `OpenApiSnapshotIT` — `docs/api/openapi.json` stale because the `submitterVerification`
   @Schema description changed. Regenerated with the sanctioned command named by the test
   itself (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`); the resulting diff is
   exactly one line — the description string.
2. `DocumentationFactsTest.theReadmeFlywayRangeMatchesTheMigrationFiles` — the README's
   Flyway range must end at the highest SQL migration (now V35). Updated both occurrences
   (`README.md:230,865`) and completed the migration enumeration in the sentence I touched
   (V35 clause + the previously unlisted Java `V34`, a pre-existing omission from the V34
   lane's commit).

**Attempt 2 — exit 0:**

```
[INFO] Tests run: 1364, Failures: 0, Errors: 0, Skipped: 0
[INFO] AccountErasureStandingIT:  3/3   AccountDeletionIT: 6/6
[INFO] DocumentationFactsTest:   21/21   OpenApiSnapshotIT: 1/1
[INFO] PMD: clean · "All coverage checks have been met" · BUILD SUCCESS
```

**Final: exit 0, 1364 run / 0 failures** — baseline 1361 + the three erasure tests.

Environment note (pre-existing, not caused by this change): every surefire run in this
environment — including the pre-fix red run — logs hundreds of non-fatal
`Error while instrumenting … with JaCoCo 0.8.13 / Unsupported class file major version 71`
warnings while the forked JVM loads JDK classes. They do not affect any test result;
flagged so a future lane does not mistake them for a regression.

## 8. Anchors (run rule 6)

Verified against `docs/agent/00-CURRENT-STATE.md` (owned by the anchor pass — not edited here):

- `domain/Shelter.java:74` (`reviewStatus` default) — **stable**; all my field/accessor
  insertions land below it.
- `api/SubmitterVerification.java:10-13,26-33` — **stable, line-count-neutral**: the class
  javadoc was rewritten in place (same 17 lines), the enum values stay at 26–33, and the new
  `stored()` method was appended at the bottom.
- `api/ShelterDto.java:126,127-134,134` — **stable, line-count-neutral**: the
  `submitterVerification` @Schema text (115–121) was rewritten in place at the same 7 lines, so
  every cited line and the quoted "EITHER report kind turns the pin red when open" phrase sit
  exactly where they did.

**Owed to the anchor pass (wording, not ranges):** the trust-ladder clause at
`00-CURRENT-STATE.md:108-111` — "The submitter-verification depth is **derived on every
read** … nothing is stored on the shelter" — is now true only for rows with a live author.
Orphaned rows serve the V35 frozen depth. The cited ranges remain in-bounds and structural-only
(DocumentationFactsTest passes), so this is prose debt, recorded on the notes board for the
single anchor pass.

## 9. Not touched / unverified

- Trust-ladder thresholds (`VerificationPolicy`), report rules, guards, frontend, other
  packages, `docs/agent/00-CURRENT-STATE.md`, the persistence test tree — all untouched
  (verified by the final `git status`: 12 modified + 3 new files, all listed below).
- No test deleted or weakened; the one assertion changed is the conflicting pin, with red
  proof.
- Retention-driven erasure is code-verified to funnel through the same
  `AccountService.deleteAccount` (no separate depth test for it — same seam, same freeze).
- The `ownerEditRow` carry-over has no direct assertion on the new column (same test posture
  as the V31 boolean's carry-over); it is exercised on every owner-edit IT and pinned
  indirectly through the erasure freeze. A known small gap: an edit that silently dropped
  the column value would only surface at a later erasure, not in the current suite — flagged
  for a future seam test if desired.

**Commit-facing file set (parent commits — this lane did not commit):**

| File | Change |
|---|---|
| `src/main/resources/db/migration/V35__shelter_submitter_verification_snapshot.sql` | NEW — the column |
| `src/main/java/ee/sheltermap/domain/Shelter.java` | field + accessors |
| `src/main/java/ee/sheltermap/persistence/ShelterEntity.java` | column + field + accessors |
| `src/main/java/ee/sheltermap/persistence/JpaShelterRepository.java` | mapping, both directions |
| `src/main/java/ee/sheltermap/app/ShelterService.java` | write at submission + edit carry-over |
| `src/main/java/ee/sheltermap/auth/AccountService.java` | the erasure freeze |
| `src/main/java/ee/sheltermap/api/SubmitterVerification.java` | `stored()` read seam + javadoc |
| `src/main/java/ee/sheltermap/api/ShelterQueryService.java` | the derivation change |
| `src/main/java/ee/sheltermap/api/ShelterDto.java` | contract text |
| `src/test/java/ee/sheltermap/auth/AccountDeletionIT.java` | the reconciled pin |
| `README.md` | Flyway range + migration enumeration (guard-forced) |
| `docs/api/openapi.json` | one-line regen of the changed description |
| `docs/autopilot/CODE-REVIEW-NOTES.md` | lane board entries |
| `reviews/code-review/erasure-depth-fix.md` | this report |

(`src/test/java/ee/sheltermap/auth/AccountErasureStandingIT.java` is untracked but belongs
to the previous lane's commit — untouched by this lane.)
