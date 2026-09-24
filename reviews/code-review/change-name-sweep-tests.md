# Change-name sweep — the test tree

Lane: `CHANGE-NAME-SWEEP-TESTS` · branch `code-review` · base `2d06a5b` (the frontend
sweep) · 2026-09-25
Scope: `src/test/java/**` comment/Javadoc residue + the refused-name guard's scope
extension to the test tree (the gap the main lane's javadoc said "lands with that
sweep"). No commits (parent commits). No main sources, no frontend, no docs.
The last of the three change-name sweeps: main (`18b63b9`), frontend (`2d06a5b`),
this one.

## Refused set (derived, same method as the main lane)

37 archive directories in `openspec/changes/archive/` → 74 unique names (each
date-prefixed directory name plus its date-stripped slug). The owner's brief also
named `community-review-queue` — that change is **live again**
(`openspec/changes/community-review-queue/` exists), so it is not in the guard's
derived list (archived-minus-live, still 74), but its two test-tree citations were
swept as dead planning references — the same treatment the main lane gave the two
main-source citations. **Sweep set: 75 names.**

## Measured residue (explicit path, whole-kebab-token match)

Command (both directions):
`rg -n --pcre2 "(?<![A-Za-z0-9-])(?:<75 names>)(?![A-Za-z0-9-])" src/test/java`

| | Lines | Files |
|---|---|---|
| **Before** | **66** | **54** |
| **After** | **0** | **0** |

(The main lane's pre-sweep measurement of the test tree was 66 lines / 52 files; the
file count moved to 54 as lanes added test files between sweeps.)

Cross-checks on the before set: **zero** names split across line breaks; a
port of the guard's comment state machine classified all 66 lines as comment text —
zero occurrences in test method names, `@DisplayName` texts, assertions or string
literals. So the "report rather than edit" category is **empty** (see below).

## Replacement pattern

Same as the main lane: the parenthetical planning citation is dropped and the
surrounding sentence reflows so the *constraint it represented* stays —

- `* V28 backfill test (guidance-manual-order) — the safety property the`
  → `* V28 backfill test — the safety property the`
- `* Acceptance IT for {@code DELETE /account} (legal-recovery):`
  → `* Acceptance IT for {@code DELETE /account}:`
- `* Trust layer acceptance (shelter-trust-and-reports,` /
  `* community-self-moderation) — full-stack MockMvc against the real`
  → `* Trust layer acceptance — full-stack MockMvc against the real services,`
  (two names spanning two lines; the javadoc paragraph rewrapped, file −1 line)

Cases where the citation carried more than a name:

| File | What was done |
|---|---|
| `api/GuidanceOrderIT.java:31` | The name was the **subject** of the sentence (`guidance-manual-order (V28) over the REAL persistence chain`). Reworded to the feature with its resolvable version tag: `The manual guidance ordering (V28) over the REAL persistence chain` — "manual order" is the main-tree term (`GuidanceService` javadoc). |
| `app/MapsUrlCoordinatesTest.java:11-12`, `app/LocationResolveServiceTest.java:17` | `(shelter-location-input, design decision 4)` — decision 4's constraints (the narrow resolver: host whitelist, ≤3 hops; and the BE/FE shared fixture table both parsers must pass) are already stated in the sentences that follow, so the citation was pure planning reference → deleted (rule 3). |
| `api/ShelterApiIT.java:285` | `(user-contributions, V7)` → `(V7)` — the Flyway version stays resolvable (the main lane's `(V15, official-dataset-csv)` → `(V15)` pattern). |
| `guidance/HeroAddressPolicyTest.java:15` | `(guidance-hero-import, guard 3)` → `(guard 3)` — the guard numbering is load-bearing. |
| `api/CommunityReviewIT.java:39`, `api/AdminModerationServiceTest.java:52` | `(community-review-queue v2)` — the `v2` spec-version tag went with the name. The change is live again; swept per the owner's explicit list, same treatment the main lane applied to its two main-source citations. |
| `auth/AccountDataExportIT.java:30,92` | `pii-at-rest` citations reworded to the constraint (`the persistence boundary hands the` / `persistence boundary hands plaintext`). |
| `api/ShelterReportIT.java:356` | `the admin-moderation change owns the write path` → `the admin moderation API owns the write path` — the constraint (which surface owns the write) stays, the name goes. |

**Diff is comment-only**: verified by diff analysis — every changed line outside
`SourceVocabularyTest.java` is a comment line (`*` / `//` / `/*` / `*/`).

## Line counts

`docs/agent/00-CURRENT-STATE.md` cites **no test file** (grep-verified — no
`*Test.java`/`*IT.java`/`src/test` citation exists in the document), so no file in
this sweep is anchored; no notes-board anchor record is owed.

- 53 of the 54 swept files are line-count preserved (`git diff --numstat`: +N = −N).
- `api/ShelterReportIT.java`: **−1** (the two-line citation collapsed into the
  rewrapped paragraph). Unanchored, so recorded here, not on the notes board.
- `config/SourceVocabularyTest.java`: +83/−33 — the deliberate guard extension below.

## Reported rather than edited

**Nothing.** No test name, `@DisplayName` text, assertion or string literal in
`src/test/java` cites an archived change name — the before measurement (66 lines)
is entirely comment text, and the after measurement is 0 in **all** contexts, not
just comments. No rename decision is pending from this tree.

## Guard extension (closing the test-tree gap)

The main lane's guard walked `src/main/java` only and its javadoc promised the
other trees would "join it as those sweeps land". This lane lands that for the test
tree, in place (no new test method — the 1350 baseline is preserved):

- Method renamed `mainSourceCommentsContainNoArchivedChangeNames` →
  `sourceCommentsContainNoArchivedChangeNames`; it now walks `src/main/java` **and**
  `src/test/java` (the walk extracted into a `walkTreeForRefusedNames` helper).
- **The scanner learned text blocks.** The test tree carries four JSON text blocks
  (`ShelterHistoryIT` ×2, `MarkInaccurateIT`, `ShelterInfoRequestIT`), so the old
  javadoc claim "the scanned tree contains no text blocks" stopped being true for
  the test tree. A `TEXT_BLOCK` state skips blocks whole: the closing delimiter is
  the **last three quotes of its quote run** (a run of four is block content ending
  in a quote), and a line-continuation backslash still ends the source line.
  Line alignment (one scanner entry per source line) verified on a text-block file.
- Javadoc updated: scope is both Java trees; test names, `@DisplayName` texts and
  fixture strings are named as the same class of pinned surface as OpenAPI
  description strings (skipped by design, not an oversight).
- **The frontend tree is still not walked** — reported, not fixed: its comments span
  TS/SCSS and HTML syntax the Java scanner does not parse (template-literal URLs
  would read as comment starts; `<!-- -->` is invisible to it), so joining it with
  this scanner would be unsound. Measured state for the record: a language-aware
  scan (TS strings/templates, SCSS, HTML comments) finds **0** frontend comment
  hits; the 44 remaining raw hits are DOM ids and string literals
  (`id="shelter-location-input"` in `submit-shelter-page.html` and its spec,
  `describe('I18nService (i18n-et-en)')`, spec titles like `'(mobile-responsive-polish)'`
  in `design-tokens.spec.ts`) — the parent's call, the same class the main lane left
  for the snapshot-pinned OpenAPI strings.

## Red proof (throwaway file, deleted)

`src/test/java/ee/sheltermap/SweepRedProof.java` with three planted citations of
`crisis-guidance`: a `//` comment (must be refused), a string literal (must not)
and a text block (must not). Under lock,
`flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest=SourceVocabularyTest
-Ddependency-check.skip=true` → **exit 1**, exactly one refusal, naming the file:

```
1 source comment(s) cite an archived change name (74 names derived from openspec/changes/archive):
  src/test/java/ee/sheltermap/SweepRedProof.java:10: refused 'crisis-guidance' — // crisis-guidance — the comment citation the guard must refuse
A change name stops resolving when the change is archived — keep the constraint it stated, drop the name.
```

`Tests run: 2, Failures: 1` — the other guard test (id shapes) stayed green, which
also proves the swept comments introduce no forbidden id shape. The string literal
and the text block were **not** flagged — the literal/text-block exemptions work in
the test tree, not just in theory. The throwaway was deleted and the tree verified
(`git status`: the 55 modified files only).

## Gate

- Detached, locked, real tree:
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  → **exit 0** — `Tests run: 1350, Failures: 0, Errors: 0, Skipped: 0` (baseline
  exact: the extension is in place, no test added/removed), PMD `pmd:3.27.0:check`
  clean, `All coverage checks have been met`, `SourceVocabularyTest` 2/2,
  `DocumentationFactsTest` 21/21, no missing-class wall. Window 01:23:34→01:26:29
  EEST; evidence `/tmp/sweep-tests-gate.log`, `/tmp/sweep-tests-gate.exit`.

## Cross-lane findings (main tree — reported, not touched)

Measuring the main tree for the sanity check surfaced two inconsistencies with the
main lane's report. Both are outside this lane's write scope (main sources are the
completed lanes' files; snapshot regeneration is a parent call), so they are
reported here and on the notes board:

1. **`community-review-queue` is still cited by 24 comment lines in 14 main-source
   files** (`ShelterService` ×3, `AdminModerationService` ×5, `AdminController` ×2,
   `ShelterController` ×2, `ShelterEntity` ×2, `ModerationAuditLog`,
   `JpaModerationAuditLog`, `ModerationActionEntity`, `AdminAuditDto`,
   `AdminShelterDto`, `AdminShelterReviewRequest`, `CreateShelterRequest`,
   `ShelterDto`, `UpdateShelterRequest`). The main lane's report says the
   main-source citations "were swept as dead planning references", but the tree
   shows only one line removed: 25 lines at `0a3c1b3` → 24 at `18b63b9` and HEAD
   (the `AdminController.java:50` citation is the one that went). These citations
   are **resolvable** — the change is live again — which is exactly why the guard
   (archived-minus-live) does not refuse them; the main lane's own design note
   says it "does not touch that live id". Whether the owner wants the live-name
   citations reworded anyway (this lane reworded the two test-tree ones per the
   explicit brief) is a parent call.
2. **`admin-locale-scope` resolves nowhere.** The two snapshot-pinned OpenAPI
   strings the main lane deliberately left (`AdminGuidanceController.java:115,142`)
   cite it, and the main lane's report says it was "archived 2026-09-13" and "in
   the archive" — but the current archive (37 dated directories, none dated
   2026-09-13) contains no such entry, and it is not a live change either. So
   that name points at nothing a reader can open. Cleaning the two strings
   requires regenerating the `OpenApiSnapshotIT` baseline — out of every lane's
   scope.

(For the record: the 74-name main-tree residue is 6 lines — 5 snapshot-pinned
OpenAPI description strings + the resolvable `PiiKeys.java:20` archive-path —
plus the 2 `admin-locale-scope` strings above = the 8 the main lane reported.)

## Unverified

- The swept content itself: the diff is comment-only (verified line-by-line), so the
  full gate is the check; no behaviour is pinned to comment text.
- The text-block scanner's edge cases (block content ending in a quote → a 4-quote
  run; line-continuation backslashes) are handled by construction and documented in
  the javadoc, but no such shape exists in the tree, so they are not red-proven
  live — the four real JSON blocks (the only text blocks present) are covered.
- The red proof used one name from the derived list; the other 73 go through the
  identical loop (same caveat as the main lane).
- The "frontend comment residue = 0" figure comes from this lane's one-off
  language-aware scan, not from the guard (the guard does not walk the frontend).

## Files for the parent's commit

The 54 swept test files (comments only) + `src/test/java/ee/sheltermap/config/
SourceVocabularyTest.java` (guard extension) + this report + the notes-board line.
