# Change-name sweep — archived change names in comments + guard gap

Lane: `CHANGE-NAME-SWEEP` · branch `code-review` · base `0a3c1b3` · 2026-09-25
Scope: `src/main/java/**` comment/Javadoc residue + `SourceVocabularyTest` guard gap.
No commits (parent commits). No `frontend/**`, no migrations, no other guards, no docs.

## Job 1 — sweep of archived change-name residue

**Derived refused set (measured on the clean tree):** 37 archive directories in
`openspec/changes/archive/` → 74 unique names (each date-prefixed directory name plus its
date-stripped slug). `admin-locale-scope` (archived 2026-09-13, cited as a bare name in 10
main-source lines) is in the archive and was swept as part of the set.
`community-review-queue` is cited in two main-source comments **and is a live change again**
(`openspec/changes/community-review-queue/` exists) — the citations were swept as dead
planning references per the lane brief; the guard itself refuses only archived-minus-live
names, so it does not touch that live id.

**Before (measured, raw grep over `src/main/java`):** 201 lines carrying a refused name
(191 archive-slug lines + 10 `admin-locale-scope` lines) across 107 files.

**After:** 8 lines, all deliberately left (below). **Comment/Javadoc residue: 0.**

Replacement pattern (every hit): the parenthetical/planning citation was dropped and the
surrounding sentence reflowed so the *constraint it represented* stays in the comment —
e.g.

- `* Bulk-CSV client for the official Päästeamet shelter dataset\n * (official-dataset-csv).`
  → `* Bulk-CSV client for the official Päästeamet shelter dataset.`
- `* JPA entity for {@code data_imports} (V15, official-dataset-csv) — one`
  → `* JPA entity for {@code data_imports} (V15) — one`
- `* The retention prune (retention-pruning): one pass over the two owner`
  → `* The retention prune: one pass over the two owner`
- `* <p>With {@code ?locale=} (admin-locale-scope) the content fields`
  → `* <p>With {@code ?locale=} the content fields`

Where a citation carried load ("the hero image (guidance-hero-import) is fetched, validated
and stored AT SAVE"), the sentence keeps the behavior and loses only the name. No code,
no signatures, no renames, no string literals were changed; only comment/Javadoc text moved.
`git diff` is comment-only: 107 files, all `+0` line-count except four **unanchored** files
(−1 each: `app/HttpUrlRedirectClient.java`, `app/LocationResolveService.java`,
`app/ShelterHistoryChanges.java`, `auth/DataExportResponse.java` — two-line citations
collapsed to one line). Every file cited with line ranges in
`docs/agent/00-CURRENT-STATE.md` is **byte-for-byte line-count preserved** (verified by
`git diff --numstat`: all anchored files `+0`), so no notes-board record was needed.

**Left deliberately (8 lines):**

| Line | Why it stays |
|---|---|
| `api/DataSourceController.java:23`, `api/GuidanceController.java:52`, `api/LocationController.java:44`, `api/ShelterController.java:153`, `auth/RegisterRequest.java:20` | OpenAPI `@Operation`/`@Parameter` description strings — **pinned by `OpenApiSnapshotIT`**. Changing them changes the published OpenAPI doc; that is a snapshot-regeneration decision, out of this lane. |
| `api/AdminGuidanceController.java:115`, `:142` | Same class of pin — `admin-locale-scope` inside OpenAPI description strings, snapshot-pinned. |
| `security/PiiKeys.java:20` | `openspec/changes/archive/2026-09-16-pii-at-rest/design.md` — a **resolvable path** to the archived design doc, not a dead bare name. |

## Job 2 — guard gap in `SourceVocabularyTest`

The pre-existing check forbids a fixed list of id *shapes* (ORCH-, wave-, D-n, M-n,
P-n-n, …) across `src/main/java`, `src/test/java`, `frontend/src`. It had no notion of
**archived change names**, so a comment citing `crisis-guidance` or `retention-pruning`
passed silently. Added a second test method to the same class:
`mainSourceCommentsContainNoArchivedChangeNames`.

**Design:**

- **List derived at runtime** from `openspec/changes/archive/` (every dated directory name
  plus its date-stripped slug), **minus the live change names** under `openspec/changes/`
  (a live change re-opening a name makes it resolvable again — currently
  `community-review-queue` is exactly that case). Archiving a new change extends the
  refusal list with zero edits to the test. Measured list: **74 names**.
- **Matched-count floor** `MIN_ARCHIVED_CHANGE_NAMES = 70` (measured 74 on a clean tree):
  the list is derived, so a pruned/mislocated archive would shrink it silently — the floor
  makes that a loud failure, matching the class's existing floor discipline
  (`ROOT_FLOORS`, `MIN_SCANNED_LINES`).
- **Scope: `src/main/java` comment text only.** A Java-aware state machine extracts comment
  text per line (line comments, block comments; string/char literals skipped, escapes
  handled, no text blocks exist in the tree — noted in the javadoc). Consequences:
  - the 7 snapshot-pinned OpenAPI **string literals** are not comments → allowed;
  - a slug inside a URL or string is not reported;
  - the test tree (66 lines of the same residue in 52 files) and the frontend (≈195 lines
    in 61 files, measured pre-sweep) are separate in-flight sweeps — this check covers the
    tree that sweep cleaned and the other trees join it as those land (stated in the
    method javadoc).
- **Whole-kebab-token match:** a slug embedded in a longer identifier
  (`x-crisis-guidance-y`) is a coincidental substring, not a citation — allowed.
- **Path-token exemption:** a whitespace-delimited token containing `/` is a document path,
  still resolvable — `security/PiiKeys.java:20` passes by design.
- Failure output names the file, the line, and the refused name.

**Red proof (throwaway copy, before restore):** the overlay copy
(`/tmp/sweep-overlay`, `git archive HEAD` + working-tree tar overlay) was contaminated with
one injected citation —
`* One throttle/abuse alert row (community-self-moderation) served by …` in
`alerts/ThrottleAlert.java`. `mvn -Dtest=SourceVocabularyTest` in the overlay then failed:

```
1 source comment(s) cite an archived change name (74 names derived from openspec/changes/archive):
  src/main/java/ee/sheltermap/alerts/ThrottleAlert.java:6: refused 'community-self-moderation' — * One throttle/abuse alert row (community-self-moderation) served by {@code GET /admin/alerts},
A change name stops resolving when the change is archived — keep the constraint it stated, drop the name.
```

(the other, pre-existing check stayed green: 2 run, 1 failure.) The injection was then
reverted in the copy and the copy verified byte-identical to the real tree for that file.

## Gates

- **Gate 1** — detached, locked, real tree:
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  → **exit 0**, `Tests run: 1350, Failures: 0, Errors: 0, Skipped: 0` (baseline 1349 + the new
  guard test), PMD check clean, `All coverage checks have been met`, BUILD SUCCESS (03:00).
- **Gate 2** — same guard inside the overlay archive (the throwaway copy above, after the
  red-proof revert; `git archive HEAD` + working-tree tar overlay of `/tmp/sweep-overlay`):
  same command in `/tmp/sweep-overlay` → **exit 0**, `Tests run: 1350, Failures: 0, Errors: 0,
  Skipped: 0`, `All coverage checks have been met`, BUILD SUCCESS.

## Out of scope / left for other lanes

- `src/test/java`: 66 lines / 52 files still cite archived change names (this sweep was
  comment/Javadoc in `src/main/java` only; the guard's test-tree scope lands with that
  sweep).
- `frontend/src`: ≈195 lines / 61 files of the same residue.
- The 7 snapshot-pinned OpenAPI description strings: cleaning them requires regenerating
  the `OpenApiSnapshotIT` baseline — a product-visible API-doc change, parent's decision.
- `community-review-queue` is live again; the guard intentionally excludes live names, so
  citations of the live change remain resolvable and unrefused.

## Unverified

- Nothing on the swept content itself: the diff is comment-only and the full gate
  (compile + all unit/integration tests + PMD + JaCoCo floor) is the check.
- The red proof used one injected name from the middle of the derived list; other names
  go through the identical code path (single `indexOf` loop over the same 74-name list).
