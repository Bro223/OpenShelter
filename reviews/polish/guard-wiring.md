# GUARD-WIRING — the frontend comment extractor, wired in

**Branch:** `polish-work` @ `2084c47` (the working tree the parent cut this lane from; the task
brief said `feature/frontend`, which is two commits behind — the extractor-restore commit
`1e9850a` and the seam-removal commit `2084c47` only exist on `polish-work`, and the tree also
carries two uncommitted sibling-lane comment rewordings in `shelters-view.ts` /
`unconfirmed-view.ts` that predate this lane. Worked the live tree as cut; no commit — parent
commits.) **Lane:** the never-made-name check's frontend wiring + the family verdict + the
single anchor pass.

**Skills:** `docs/skills/clean-code.md` (readability standard), `docs/skills/code-review.md`
(Standards/Spec two-axis report discipline).

---

## 1. The truth: what the check actually scanned (verified, not reported)

The parent's framing is correct, and the FE-GUARD report (`reviews/polish/fe-guard.md`, read
from the `polish` branch, where that lane's commit `922420a` lives) is correct *about its own
branch* but describes code that was never on this line.

Verified on the tree as found (`polish-work` @ `2084c47`, pre-my-edits):

- `FrontendCommentExtractor.java` + `FrontendCommentExtractorTest.java` **exist** (restored by
  `1e9850a`), and `grep -c FrontendCommentExtractor SourceVocabularyTest.java` = **0** —
  nothing referenced the extractor. Baseline focused run (flock, detached,
  `/tmp/gw-baseline.log`): `SourceVocabularyTest` 3/3 + `FrontendCommentExtractorTest` 3/3,
  exit 0 — the extractor's own shape probes pass, but the guard never calls the class.
- The never-made check (`sourceCommentsContainNoNeverMadeChangeNames`, old :322) walked
  exactly `for (String javaRoot : List.of("src/main/java", "src/test/java"))` — **two Java
  trees, no frontend**. Per file it did `Files.readAllLines` (line-based), joined the lines,
  ran the Java state machine `commentTextByLine` over the whole content, and matched each
  comment line with `findRefusedName(commentLine, NEVER_MADE_CHANGE_NAMES)` (whole-kebab-token
  + path-token exemption). The matcher is name-list-driven: a name not in the list is never
  searched for, and a name cited only in frontend comments was invisible by construction.
- `NEVER_MADE_CHANGE_NAMES` was the single entry `bilingual-guidance` (string literal, floor 1).
- The archived-name check walks the same two Java roots (owner ruling — stays Java-only).
  The id-shape check is the only one of the three that walks `frontend/src`
  (`SCANNED_ROOTS`, old :133) — and line-based, no comment extraction.
- So: a dead never-filed name cited only in frontend comments could never be refused.
  Confirmed by the census: `bilingual-guidance` sat in **6** frontend spec comments and the
  family's four names in **15** frontend comments + **9** Java comments (24 total on this tree;
  the FAMILY-INVESTIGATE 28/17/11 census was measured at `41cc03a` before `2084c47` removed the
  two `GuidanceService` seam delegates that carried two of the Java citations).
- **Record correction:** FE-GUARD's §2 ("now walks, after its two Java trees: frontend/src …")
  was true only on the `polish` branch. The "orphaned ceiling commit" `41cc03a` on this line
  landed the *other* half of that lane's diff (the six spec rewordings were **not** among what
  it landed either — the six `bilingual-guidance` spec lines were still present here when I
  arrived), and `1e9850a` restored only the two extractor files, not the wiring. The
  FE-GUARD mutation proofs (its §4) could not be reproduced on this branch because the code
  they exercised did not exist here — the parent's assessment stands.
- FAMILY-INVESTIGATE is accurate as far as it goes (both name checks Java-only at :284/:337 on
  `41cc03a`; all four family names never filed — re-verified below against the live tree).

## 2. The wiring change (task 2)

The extractor's API fits the guard exactly: all three entry points
(`tsCommentTextByLine` / `htmlCommentTextByLine` / `scssCommentTextByLine`) return
`List<String>` — one entry per source line, comment text only — which is precisely the shape
`refusedNameHits` feeds to the line-indexed `findRefusedName`. Nothing was bent; the wiring
reuses the guard's existing matcher unchanged, so the string/template-literal, HTML-attribute
and path-token exemptions apply identically in both trees. (The implementation follows the
settled `polish`-branch landing, re-verified against this tree's files and measurements.)

`src/test/java/ee/sheltermap/config/SourceVocabularyTest.java` (the only guard file changed;
+137/−14, all test-tree):

- **New walk** in `sourceCommentsContainNoNeverMadeChangeNames` (:382): after the two Java
  trees, `walkFrontendTreeForRefusedNames(root, NEVER_MADE_CHANGE_NAMES, hits, frontendFiles)`
  walks `frontend/src` with the same `SKIPPED_DIRECTORIES`, over `.ts` / `.html` / `.scss`
  (the extractor's three syntaxes), counting files. Missing `frontend/src` fails loudly
  ("No frontend/src walk was executed …"), mirroring the Java-tree guard.
- **Per-file** (`frontendRefusedNameHits`, :775): `Files.readAllLines` + `String.join("\n")` →
  `frontendCommentTextByLine` dispatches by extension to the extractor → each line matched with
  the same `findRefusedName`. A name in a string or template literal is not comment text, so it
  is not refused; a comment marker inside one does not confuse the scan.
- **New floor** `MIN_FRONTEND_NEVER_MADE_FILES = 180` (:221) — measured **230** on the clean
  tree (157 `.ts`, 36 `.html`, 37 `.scss`; the same file set the id-shape walk floors at 180
  under `frontend/src` in `ROOT_FLOORS`). Below the floor the check fails with "Only N
  frontend source files were scanned for never-made names (the floor is 180) …".
- Javadocs: the class javadoc now says the check walks both the Java trees and the frontend
  tree; the never-made check's javadoc states the new scope and why the Java scanner cannot be
  ported; the archived check's javadoc records that it stays Java-only (joining is a separate
  owner decision) and points at the extractor.
- **Deliberately not changed:** the archived-name check (owner ruling), the id-shape check
  (already walks the frontend, line-based), `ROOT_FLOORS`, `MIN_SCANNED_LINES`,
  `MIN_ARCHIVED_CHANGE_NAMES`, the Java `commentTextByLine` machine, and the shared matcher.

## 3. The family verdict, acted on (task 3)

Re-verified the FAMILY-INVESTIGATE verdict myself on the live tree before touching the list:
`openspec/changes/` holds `archive/` + `community-review-queue` only; none of the 34 archive
directories matches or slugs to any of the four names; `git log --all -- 'openspec/changes/<name>'`
and `-S'<name>' -- openspec/` are empty for all four (spot-checked each). All five list entries
resolve to nothing, so the runtime staleness check passes.

- **`NEVER_MADE_CHANGE_NAMES`** (:200) is now the five entries, in the string literal on
  purpose (this file's own comments are scanned): `bilingual-guidance` + the four family names.
- **`MIN_NEVER_MADE_CHANGE_NAMES` raised 1 → 5** (:211), deliberately, with the reason in the
  javadoc (per the guard's own floor discipline and the family report's recommendation): the
  list is maintained, and pruning it below the five measured entries would let the check pass
  on less than it was written for.
- **30 comment rewordings** (9 Java + 15 frontend comments = the 24 family sites on this tree,
  plus the 6 pre-existing `bilingual-guidance` frozen-spec lines the wiring made visible;
  every one is a comment, line-count preserving, numstat 1:1 per file — the frozen-spec byte
  discipline). Keep-the-constraint, drop-the-name:

| file:line | before (name dropped) | after |
|---|---|---|
| `GuidanceController.java:82` | `Paging (guidance-index-paging):` | `Paging:` |
| `GuidanceController.java:141` | `stable order (guidance-index-paging).` | `stable order.` |
| `GuidanceSearch.java:10` | `search match (admin-guidance-search) —` | `search match —` |
| `GuidanceSearch.java:34` | `query bound (admin-guidance-search):` | `query bound:` |
| `GuidancePaginationIT.java:30` | `guidance-index-paging over the REAL …` | `Public-index paging over the REAL …` |
| `AdminGuidanceSearchPagingIT.java:28` | `admin-guidance-search + the admin list's paging` | `Admin guidance search + the admin list's paging` |
| `GuidanceSearchTest.java:65` | `q bound (admin-guidance-search) —` | `q bound —` |
| `GuidanceServiceTest.java:1518` | `paging (guidance-index-paging)` | `paging` |
| `GuidanceServiceTest.java:1570` | `admin search (admin-guidance-search)` | `admin search` |
| `admin-gateway.ts:268` | `(admin-guidance-search / admin-page-size)` | `(search + size paging)` |
| `guidance-gateway.ts:47` | `(guidance-index-paging). One page's posts …` | `— one page's posts …` |
| `admin-tab.ts:2` | `(admin-tab-persist)` | `(the tab query param)` |
| `shared/paging.ts:2` | `(list-page-paging, admin-page-size)` | `(list-page-paging, the admin size paging)` |
| `admin-page.spec.ts:3220` | `(admin-page-size / admin-guidance-search)` | `(size paging + the search filter)` |
| `admin-page.spec.ts:3914` | `(admin-tab-persist)` | `(the tab query param)` |
| `guidance-order-list.html:9` | `<!-- admin-guidance-search: the no-match state` | `<!-- the no-match state` |
| `guidance-order-list.html:31` | `lists (admin-page-size):` | `lists (multi-page):` |
| `guidance-order-list.spec.ts:282` | `(admin-page-size's interaction rule)` | `(the size-paging interaction rule)` |
| `guidance-order-list.ts:41` | `(admin-guidance-search)` | `(the q filter)` |
| `guidance-order-list.ts:45` | `(admin-page-size's interaction rule)` | `(the size-paging interaction rule)` |
| `guidance-panel.html:19` | `<!-- admin-guidance-search: the list's search` | `<!-- the list's search` |
| `guidance-panel.html:134` | `<!-- admin-page-size: an out-of-range page` | `<!-- an out-of-range page` |
| `guidance-panel.html:167` | `size control (admin-page-size): namespaced` | `size control: namespaced` |
| `guidance-list-page.spec.ts:542` | `(guidance-index-paging / list-page-paging)` | `(list-page-paging)` |
| `admin-page.spec.ts:323,402,2355` + `guidance-editor.spec.ts:131,1748,1839` (the six `bilingual-guidance` frozen-spec lines, owner-ruled wording per the FE-GUARD record) | `(bilingual-guidance)` | `:` / `(per-locale rows)` |

`list-page-paging` was kept where cited (it resolves to the openable `docs/autopilot/`
directory; it is not a listed name). Dash-run section headers kept their line lengths by
compensating the trailing dash run (the frozen-spec convention; lengths 77/80/81/82 preserved).

**Filed, not touched (selector contracts — code, exempt in both trees):** the live CSS class
`admin-guidance-search` at `guidance-panel.html:24` and its three spec selector strings
(`admin-page.spec.ts:3255,3415,3505`, `querySelector('.admin-guidance-search')`). Renaming the
class is a selector-contract change, not a comment sweep — the same class as the 38
`shelter-location-input`/`shelter-address-search` code occurrences already on the owner's list.
Residual census after the rewordings (grep over both trees, all four scanned extensions): the
names appear only in the guard's own string literal and those four code sites.

## 4. The seven anchor citations (task 4) — applied and verified

I am this run's single anchor pass (the parent assigned it here). All seven new ranges were
re-derived in-tree from the code before applying (not taken from the seams lane's table on
trust); clause tokens verified against the doc guard's content semantics
(`DocumentationFactsTest:1595-1642`):

| doc line | old | new (verified in-tree) |
|---|---|---|
| `:128` | `ShelterQueryService.java:413-415` | `:410-412` — the `SubmitterVerification submitterVerification = …` orphan-serving read at :410 |
| `:194` | `AdminModerationService.java:415-439` | `:403-427` — `openReportPage` signature at :403, close at :427 |
| `:197` | `AdminModerationService.java:312-327` | `:300-315` — 4-arg `listShelterReports` javadoc opener :300 → signature close :315 (`excludeDismissed` at :313) |
| `:200` | `AdminModerationService.java:415,449` | `:403,437` — `openReportPage` :403 / `openReportCount` :437 |
| `:208` | `admin-page.ts:371` | `:352` — "The view IS the URL" querySub javadoc opener |
| `:215` | `admin-page.ts:422-512` | `:403-493` — `normalizeListParams` javadoc opener :403 → close :493 (signature :409) |
| `:219` | `admin-page.ts:456-470` | `:437-451` — the namespaced `check(` calls; the old range covered the five pairs guidance→media (audit at :471 was outside it then, still at :452 outside now) — the same span, shifted −19 |

One-for-one line swaps (numstat 7/7); no other citation in the doc touches any file this lane
edited (grep-verified), so no further shift is owed. **DocumentationFactsTest 21/21 green** in
the P2 run and in the full gate.

## 5. The mutation proofs — four, both directions, reproducible

All runs: `flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest=… -Ddependency-check.skip=true`,
detached (`nohup … echo $? > /tmp/gw-*.exit`), warm `target/` (the full `clean verify` gate ran
afterwards). Logs + exit files: `/tmp/gw-{baseline,p1,p2,p3,p4,guard.sha}.log/exit`.

Fixtures lived in `frontend/src/app/fe-guard-fixtures/` (`reject.ts`, `reject.html`,
`reject.scss`), deleted after P1 — the directory no longer exists. Each plants one dead name
in a comment of one shape AND the same name in a literal position that must stay exempt:

```
reject.ts:    line 1  // … (bilingual-guidance) …            ← comment, must be cited
              line 2  const _url = 'https://…/bilingual-guidance';   ← string, exempt
              line 3  const _tpl = `… ${'bilingual-guidance'} …`;    ← template literal, exempt
reject.html:  line 2  <!-- … (admin-page-size) … -->         ← comment, must be cited
              line 3  <a href="https://…/admin-page-size">   ← attribute, exempt
reject.scss:  line 2  $x: 1; // … (admin-tab-persist) …      ← comment, must be cited
              line 3  .y { content: 'admin-tab-persist'; }   ← string, exempt
```

| # | State | Command | Must | Result |
|---|---|---|---|---|
| P2 | real tree, wired + reworded + anchors | `-Dtest=SourceVocabularyTest,FrontendCommentExtractorTest,DocumentationFactsTest` | green | **exit 0 — 27/27** (guard 3/3, extractor 3/3, doc facts 21/21). Log `/tmp/gw-p2.log` |
| P1 | fixtures planted (3 shapes) | `-Dtest=SourceVocabularyTest,FrontendCommentExtractorTest` | red, citing exactly the 3 comment lines | **exit 1** — `3 source comment(s) cite a change name that was never filed (5 name(s) listed in NEVER_MADE_CHANGE_NAMES)`: `reject.ts:1 refused 'bilingual-guidance'`, `reject.html:2 refused 'admin-page-size'`, `reject.scss:2 refused 'admin-tab-persist'` — one per shape, and **none of the three literal lines cited** (the string/template/attribute exemption holds in all three syntaxes). Log `/tmp/gw-p1.log` |
| P3 | `NEVER_MADE_CHANGE_NAMES = List.of()` (floor emptied) | `-Dtest=SourceVocabularyTest` | red on the empty list | **exit 1** — `Only 0 never-made change name(s) are listed (the floor is 5) — the list is empty, and this guard would pass silently.` Restored (sha256-verified). Log `/tmp/gw-p3.log` |
| P4 | `MIN_FRONTEND_NEVER_MADE_FILES = 300` (frontend floor raised above the tree) | `-Dtest=SourceVocabularyTest` | red on the shrunken walk | **exit 1** — `Only 231 frontend source files were scanned for never-made names (the floor is 300) — the frontend walk shrank to a fraction of the tree it is written for …` (231, not 230: a sibling lane's untracked `location-capture-view.ts` landed at 22:22, see §8). Restored (sha256-verified). Log `/tmp/gw-p4.log` |

The guard's own file was sha256-pinned before the P3/P4 mutations and byte-verified after each
restore (`/tmp/gw-guard.sha`). P1 proves the frontend half of the check fails **loudly** on
each comment shape; P3/P4 prove the two floors fail loudly when emptied/shrunken; P2 proves
the real tree is green. A guard that cannot fail is what this exists to prevent: this one now
has four independently proven failure modes for the new surface.

## 6. Gates (detached, exit files) — and the reconciled counts

- **Baseline (pre-change, flock, detached):** `clean verify` not re-run — the focused guard +
  extractor run (exit 0, 6/6, `/tmp/gw-baseline.log`) is the pre-change state; the seams lane's
  full baseline on this tree is on record (`/tmp/seams-baseline.log`, 1363 at the cut, before
  `1e9850a`).
- **Backend full gate (first, 22:28:37–22:31:40, flock, detached):**
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` →
  **exit 0 — Tests run: 1365, Failures: 0, Errors: 0, Skipped: 0** (log `/tmp/gw-gate-be.log`,
  exit `/tmp/gw-gate-be.exit`). **Reconciliation: 1365 = 1363 (the measured baseline at the
  `41cc03a` cut) + 3 (`FrontendCommentExtractorTest` shape probes, landed mid-lane as
  `1e9850a`) − 1 (the `GuidanceSearchTest` delegate pin removed by `2084c47`, whose subject no
  longer exists — flagged per the rules). This lane adds **zero** test methods: the wiring
  extends the existing never-made test, the extractor tests were already in the count, and every
  rewording is comment-only. The parent's stated baseline (1365 with the anchor pin red /
  1344 green excluding it) matches exactly, with the delta explained: the anchor pin (21 of the
  1365) is now **green**, so the full scope is 1365 green and the
  scope-minus-`DocumentationFactsTest` is 1344 green.
- **Frontend test gate (first, 22:32:05):** exit **1** — **not my diff.** The compile failed on
  the sibling lane's in-flight location-capture extraction: TS2322, `submit-shelter-page.ts:102`
  (`mapEl: this.mapEl`, a `Signal<ElementRef<HTMLElement> | undefined>` from the non-required
  `viewChild` at :83) against `LocationCaptureViewDeps.mapEl: Signal<ElementRef<HTMLElement> | null>`
  in the sibling's untracked `location-capture-view.ts:101`. Neither file is in my diff (21
  comment/doc lines, numstat-verified) and a type error cannot arise from comment edits. The
  sibling settled the mismatch ~22:36; **re-gate (22:36:49, `/tmp/gw-gate-fe2.log/.exit`): exit
  0 — 1583/1583 across 65 files** — the stated baseline count exact, both reworded frozen specs
  (`admin-page.spec.ts`, `guidance-editor.spec.ts`) passing in the run. Recorded on the notes
  board per rule 4.
- **Frontend build (run rule 2):** `npx ng build` → **exit 0** (pre-existing SCSS budget
  warnings only — `alerts-panel.scss` / `users-panel.scss` / `reports-panel.scss` +87 bytes;
  none in my diff; log `/tmp/gw-gate-build2.log`).
- **Backend re-gate on the settled combined tree (22:39:29, `/tmp/gw-gate-be2.log/.exit`):**
  in flight at report time — after my first backend gate finished (22:31:40), sibling lanes
  landed further main-tree Java edits (7 files: `DuplicateReportException`, `ReportActionLog`,
  `ShelterInfoRequestLog`, `ShelterOccupancyRepository`, `PasswordResetTokenRepository`,
  `PendingContactChange`, `GuidanceTranslationRepository`, mtimes 22:33:59–22:34:50) that the
  first gate did not see. The re-gate is the definitive combined-tree number:
  **exit 0 — Tests run: 1365, Failures: 0, Errors: 0, Skipped: 0, BUILD SUCCESS** (PMD clean,
  JaCoCo 0.93 floor met) — the sibling's Java edits are test-count neutral, so the combined
  tree holds the same 1365 as my first gate, now including their settled work.

## 7. What deliberately did not change

No behaviour change anywhere: the guard diff is test-tree only; every other diff is a comment
or a doc line. No user-visible string or translation value touched. No CSS class, DOM id or
code identifier renamed (the four code sites above are filed, not renamed). No test deleted or
weakened; no assertion touched. All 107+ doc anchors stay valid (the seven re-derived are
content-token-verified; the rest untouched — no edited file is doc-cited except the seven and
the two `paging.ts` citations whose cited ranges my line-preserving edit does not shift).

## 8. Unverified / handed over

- **Shared-tree hazard (not mine):** two sibling lanes were live in this worktree during the
  lane. (a) The untracked `frontend/src/app/features/shelter/location-capture-view.ts` (mtime
  22:22) plus the sibling's rewrite of `submit-shelter-page.{ts,html}` red the 22:32 FE gate on
  the in-flight TS2322 (rule-4 line on the notes board); the sibling settled it, my 22:36:49
  re-gate is green. (b) A sibling's 7 main-tree Java edits (22:33:59–22:34:50) landed after my
  first backend gate (finished 22:31:40); the 22:39:29 re-gate covers them (see §6).
  (c) The untracked `location-capture-view.ts` is also why P4's floor message counted 231
  against my 230 clean-tree measurement (the `MIN_FRONTEND_NEVER_MADE_FILES` javadoc keeps 230 —
  measured on the clean tree, floor 180 holds with the same margin either way). It carries no
  never-made name and no forbidden id shape (grep-verified), so it is inert for both name
  checks and the id walk.
- **The staleness check's archived branch** is the same union code as its live branch
  (`archivedDirectoryNames`); only the live-directory arm is exercised by the proofs (same
  standing note as FE-GUARD / LAST-NAMES).
- **`docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md:4`** still carries `guidance-index-paging`
  in the planning spec's own prose. `docs/` is not a scanned tree, and rewording a historical
  planning document is a record-keeping decision, not a comment sweep — left as the one
  resolvable-thread case the family report named, for the owner.
- **The archived-name check still does not walk the frontend** (owner ruling). The mechanism to
  join it is now in place (the walk and the extractor are name-agnostic) — handed to the owner
  as before, now with a working mechanism instead of a recommendation.
- **The extractor's documented limits** (regex literals not disambiguated, HTML-comment/script
  nesting, per-line matching) are verified-absent-today, not parser-complete — a future
  regression surfaces as a visible false refusal, never a silent pass (FE-GUARD §1, unchanged).
- The mutation-proof runs were single/focused-test under the lock; the full `clean verify` gate
  ran afterwards on the restored tree and is the standing proof.

**Files for your commit:** `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java` (the
wiring + the family entries + the floors), the 8 Java comment files
(`GuidanceController`, `GuidanceSearch`, `GuidancePaginationIT`, `AdminGuidanceSearchPagingIT`,
`GuidanceSearchTest`, `GuidanceServiceTest`), the 10 frontend files
(`admin-gateway.ts`, `guidance-gateway.ts`, `shared/admin-tab.ts`, `shared/paging.ts`,
`admin-page.spec.ts`, `guidance-editor.spec.ts`, `guidance-order-list.{ts,html,spec.ts}`,
`guidance-panel.html`, `guidance-list-page.spec.ts`), `docs/agent/00-CURRENT-STATE.md` (the
seven anchors), and this report. (The two uncommitted `shelters-view.ts` / `unconfirmed-view.ts`
rewordings are the seams lane's, not this lane's.)
