# LAST-NAMES — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** the `SourceVocabularyTest` vocabulary guard (test file), the dead
`bilingual-guidance` comments, and the two recorded drift comments in
`shelters-view.ts` / `unconfirmed-panel.ts`. Every edit in this lane is
comment/javadoc only — zero behaviour change, no user-visible string, no
translation value, no document anchor edited (all edits are
line-count preserving, so no rule-6 shift is owed).

## 1. Why `bilingual-guidance` escaped the guard

The guard's refused list is **derived at runtime from the archive**: every
dated directory under `openspec/changes/archive/` (37 directories) plus each
name's date-stripped slug (→ 74 names), minus the live change names
(`community-review-queue`). The floor `MIN_ARCHIVED_CHANGE_NAMES = 70`
protects **the derivation** — a pruned or mislocated archive shrinks the list
and fails loudly.

`bilingual-guidance` is absent from that list because **it was never a
change directory at all**:

- no `openspec/changes/bilingual-guidance` (live) — the only live change is
  `community-review-queue`;
- no `2026-*-bilingual-guidance` in the archive;
- **no git history of one** — `git log --all -- openspec/changes/bilingual-guidance`
  and `git log --all -S'bilingual-guidance' -- openspec/` are both empty.

The translation feature was the follow-up the archived `crisis-guidance`
spec explicitly predicted ("Version 1 SHALL NOT implement a translation
workflow … the follow-up (a translation …)"); it shipped under the working
name `bilingual-guidance` (V26's own header names the content
`guidance-translation-linking`), but the change was never filed, so the name
never entered the runtime truth the guard derives from. A name that never
existed is structurally invisible to a list derived from what did exist —
and the floor, which only polices the archive, cannot see it either. That is
the exact gap: **dead-by-construction names (filed-not-made) pass silently.**

## 2. Closing the gap — the never-made-name check

New test `SourceVocabularyTest.sourceCommentsContainNoNeverMadeChangeNames`
(test :322). Design: runtime truth where it exists, a maintained list where
it cannot, and the same floor discipline the existing checks use.

1. **The list** — `NEVER_MADE_CHANGE_NAMES` (:192), one entry: the working
   name. It cannot be derived (there is no directory to derive from), so it
   is maintained — and the entry sits in the **string literal on purpose**:
   this file's own comments are scanned too, and writing the name into a
   javadoc here would trip the very check it feeds (the javadoc describes
   the entry without spelling the token).
2. **The floor** — `MIN_NEVER_MADE_CHANGE_NAMES = 1` (:199, measured 1 on a
   clean tree). Pruning the list to empty is a loud failure, not a silent
   pass — the never-made analogue of the archive's 70-name floor.
3. **The staleness check** — each entry is verified at runtime to **still
   resolve to nothing** (not a live directory, not an archived directory in
   full or slug form — `staleNeverMadeNames`, :640). File or archive a
   same-named change and the entry goes red until removed: the
   archive-derived check owns such a name from then on, and the list stays
   disjoint from it by construction.
4. **The scan** — both Java trees' comment text only, whole kebab tokens,
   path tokens exempt: the same matching the archived-name check uses
   (reuses `walkTreeForRefusedNames` / `refusedNameHits` /
   `findRefusedName`), same documented frontend exclusion.

Refactor to share the archive truth without touching behaviour:
`archivedDirectoryNames(root)` (:618) now holds the archive listing +
date-stripping; `archivedChangeNames` (unchanged result: archive names +
slugs minus live, sorted) and `staleNeverMadeNames` both read from it.

**Why not "refuse any unresolved kebab token":** a census of whole kebab
tokens in the two Java trees' comments shows the space is dominated by
legitimate English compounds — `no-op` ×72, `e-mail` ×68, `in-memory` ×57,
`fail-closed` ×25, `one-time`, `end-to-end`, `case-insensitive`, …
— hundreds of occurrences. That rule would be red on healthy code, and the
fix (an allow-list of English compounds) is a hand-maintained list that
rots — the exact pattern this run keeps closing. So the extension uses
runtime truth (resolvability, archive derivation) where it exists and keeps
the residual judgement (a name *was a working change name*) in a small list
that the floor and the staleness check keep honest.

### Mutation proof — both ways, plus the two guardrails

All runs: `flock /tmp/openshelter-mvn.lock mvn -B -ntp test
-Dtest=SourceVocabularyTest -Ddependency-check.skip=true`, logs in
`/tmp/lastnames-*.log`.

| # | Mutation | Verdict | Result |
|---|---|---|---|
| Red proof (no mutation) | current tree, the six dead comments in place | must FAIL | **FAIL** — `6 source comment(s) cite a change name that was never filed (1 name(s) listed in NEVER_MADE_CHANGE_NAMES)`: GuidancePostDto:19, AdminGuidanceController:465, GuidanceController:155, GuidanceService:722, OpenApiContractIT:327, GuidanceServiceTest:1021. The other two tests green. |
| P1 — **refuses** | temp fixture `NeverMadeNameRejectFixture.java` with the comment `// (bilingual-guidance)` | must refuse the fixture | **FAIL** — `1 source comment(s) cite a change name that was never filed … NeverMadeNameRejectFixture.java:9: refused 'bilingual-guidance'` |
| P2 — **accepts** | same file rewritten to cite a live change (`community-review-queue`), an archive **path** token (`openspec/changes/archive/2026-09-23-crisis-guidance`), and ordinary compounds (`fail-closed`, `per-locale rows`) | must pass | **PASS** (3/3) — live names, path tokens and English compounds are not refused |
| P3 — floor | `NEVER_MADE_CHANGE_NAMES = List.of()` | must fail on the empty list | **FAIL** — `Only 0 never-made change name(s) are listed (the floor is 1) — the list is empty, and this guard would pass silently.` |
| P4 — staleness | `mkdir openspec/changes/bilingual-guidance` (fake live directory) | must fail on the now-resolvable entry | **FAIL** — `Never-made list entry(ies) that now resolve: [bilingual-guidance] — a same-named change is live or archived … remove the stale entry from NEVER_MADE_CHANGE_NAMES.` |

Fixture file deleted; list restored; `rmdir` of the fake directory verified
(`openspec/changes/` back to `archive` + `community-review-queue`); final
single-test and full-gate runs green (§5).

## 3. The dead-name comment rewordings — six, not four

The assignment named four (main-source) comments; the red proof surfaced
**two more in the test tree** (the guard walks both Java trees, like its
sibling check), so all six were reworded to make the gate green. Each is
one line, line-count preserving, naming the concept (the feature is the
per-locale translation rows — V26: one row per locale in
`guidance_post_translations`) instead of the unfiled change directory:

| file:line | before (token) | after |
|---|---|---|
| `api/AdminGuidanceController.java:465` | `… translations (bilingual-guidance)` | `… translations (per-locale rows)` |
| `api/GuidancePostDto.java:19` | `{@code alternates} (bilingual-guidance)` | `{@code alternates} (per-locale slugs)` |
| `api/GuidanceController.java:155` | `The public detail (+ bilingual-guidance)` | `The public detail (+ per-locale serving)` |
| `guidance/GuidanceService.java:722` | `… translation linking (bilingual-guidance)` | `… translation linking (per-locale rows)` |
| `test/api/OpenApiContractIT.java:327` | `… translations (bilingual-guidance)` | `… translations (per-locale rows)` |
| `test/guidance/GuidanceServiceTest.java:1021` | `… translation updates (bilingual-guidance)` | `… translation updates (per-locale rows)` |

## 4. The two recorded drifts — verdicts

All six recorded drifts **verified against the current code and confirmed
drifted**; each corrected (comment only, line-count preserving).

`shelters-view.ts`:

- **:26** (REJECT_REASON_MAX doc) — drifted. The unconfirmed queue's reject
  (the `rejectReason` control, validated in `UnconfirmedView.rejectRow`,
  reset in `openRejectEditor`) now lives in `unconfirmed-view.ts`;
  `admin-page.ts` only re-exposes a `rejectReason` getter (:200-201) for the
  spec pin. Corrected `(admin-page.ts)` → `(unconfirmed-view.ts)`. The
  "shared by this view's mark-inaccurate reason" half re-verified accurate
  (:151, :523).
- **:39-42** (SheltersViewDeps.`reviewRefetch` doc) — drifted. The page
  wires `reviewRefetch: () => this.unconfirmed.refreshShelters()`
  (admin-page.ts:281) and the other way `sheltersPagedRefresh:
  () => this.shelters.refreshPagedView()` (:300); the Unconfirmed tab's
  confirm/reject call `this.refreshShelters()` directly, not the page's dep.
  Rewritten: "the page wires it to UnconfirmedView.refreshShelters (the
  queue's full list AND the paged leg); this tab's row actions trigger it,
  and the Unconfirmed tab's confirm/reject call the same refetch directly."
- **:90** — drifted. `queueRows` now lives in `UnconfirmedView`; the page
  has no `queueRows` (grep-verified). Corrected to
  `UnconfirmedView.queueRows`.
- **:94** — drifted. `admin-page.ts` no longer has a `loadQueue` method
  (grep-verified); `UnconfirmedView.load()` clears the shared signal
  (`this.deps.loadError.set(null)`, wired to `this.shelters.loadError` at
  admin-page.ts:294). Corrected to "the Unconfirmed view's load() clears it
  when the queue loads".

`unconfirmed-panel.ts`:

- **:19** — drifted. The full list is kept by `UnconfirmedView.queueRows`,
  not the page. Corrected to "the Unconfirmed view keeps the full list…".
- **:40** — drifted. The view owns the control (validates in `rejectRow`,
  resets in `openRejectEditor`); the page only re-exposes it for the spec.
  Corrected "(the PAGE owns the control)" → "(the Unconfirmed view owns the
  control)".
- **Unrecorded sibling drift** (same file, verified and corrected, reported
  to the board): **:14-16** "Presentation only …: the page owns the rows,
  the reject-reason form control and the review mutations" — all three
  ownership claims now belong to `UnconfirmedView` (the template binds
  `unconfirmed.rows()` / `unconfirmed.rejectReason`; the page's `rejectRow`
  is a one-line delegate). Left alone, it would contradict the :19
  correction two paragraphs down.

Nothing else in the two files needed changing: the panel's presentational
contract, the `busy`/`rejectFor` docs and the UN-PAGED rationale's
remaining clauses re-verified accurate against the code.

## 5. Gates (detached, exit files)

- **Backend:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` → **exit 0** — `Tests run: 1363, Failures:
  0, Errors: 0, Skipped: 0`, BUILD SUCCESS, PMD clean, JaCoCo floor met.
  **Count change: 1362 → 1363 = +1**, the new
  `sourceCommentsContainNoNeverMadeChangeNames` (ran 3/3 within the gate);
  nothing deleted or weakened. Log: `/tmp/lastnames-gate-be.log`.
- **Frontend:** `cd frontend && npx ng test --watch=false` → **exit 0** —
  **1583/1583, 65 files, baseline exact** (the frontend edits are
  comment-only). Log: `/tmp/lastnames-gate-fe.log`.

## 6. Deliberately left (and why)

- `V26__guidance_post_translations.sql:6` still says "The content model
  (bilingual-guidance)" — an **applied migration** (run rule 5: never touch)
  and outside the guard's scanned extensions. Handed to the owner.
- **24 frontend `.ts` references** in 8 files (`models.ts` ×6,
  `guidance-editor.ts` ×7, `admin-page.spec.ts` ×3,
  `guidance-editor.spec.ts` ×3, `guidance-gateway.ts` ×2,
  `admin-gateway.spec.ts`, `guidance-translations.ts`,
  `guidance-detail-page.spec.ts`) — the refused-name checks **deliberately do
  not walk the frontend** (documented scope: it joins when an HTML/TS-aware
  scan says the tree is clean), and two of the files carry byte-pinned
  specs. All are comment-only; handed to the owner as an optional sweep.
- The frozen-seam re-exposures (`rejectReason` getter, `rejectRow` delegate
  on `admin-page.ts`) — deliberate per the assignment; untouched.
- `docs/agent/00-CURRENT-STATE.md` — untouched; no anchor shift occurred
  (every edit line-count preserving; `DocumentationFactsTest` green in the
  gate).

## 7. Unverified / handed over

- The staleness proof (P4) exercised the **live-directory** branch; the
  archived-branch is the same union code (`archivedDirectoryNames`) and was
  not proven separately.
- The never-made list is, by definition, maintained: a **future** working
  name that is never filed is not caught until someone reports it and adds
  the entry. The floor + staleness check keep the list honest, but
  detection of this dead-reference class starts from a report — the other
  two classes (planning ids, archived names) remain fully derived.
- The mutation-proof runs were single-test (`-Dtest=SourceVocabularyTest`);
  the full gate ran afterwards on the restored tree.
- Handed to the board: the two missed test-tree references (§3), the
  drift-resolved entries (§4), the owner's decision on the V26 SQL header
  and the 24 frontend references (§6), and the test-count change 1362→1363.

**Files for your commit:** `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java`,
`src/main/java/ee/sheltermap/api/AdminGuidanceController.java`,
`src/main/java/ee/sheltermap/api/GuidancePostDto.java`,
`src/main/java/ee/sheltermap/api/GuidanceController.java`,
`src/main/java/ee/sheltermap/guidance/GuidanceService.java`,
`src/test/java/ee/sheltermap/api/OpenApiContractIT.java`,
`src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java`,
`frontend/src/app/features/admin/shelters-view.ts`,
`frontend/src/app/features/admin/unconfirmed-panel.ts`,
`reviews/code-review/last-names.md`, plus this board's LAST-NAMES lines.
