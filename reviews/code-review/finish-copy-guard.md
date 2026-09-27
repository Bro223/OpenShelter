# FINISH-COPY-GUARD — report

Lane FINISH-COPY-GUARD, branch `code-review`, baseline `2a7ef62` (HEAD at lane start:
`017d4d5`). Three owner-authorised jobs: (1) the false `how.sources` triangle clause in the
English source, (2) the vocabulary-guard census extension plus everything it flags in files no
other lane owns, (3) the two stale QA-document citations. Nothing committed (parent commits).

Concurrent lanes in the same worktree this session: **FINISH-P3-BE** (done — its own report and
lane-done line) and **FINISH-P3-FE** (in flight for most of this session — frozen-spec prose
sweep, `color-scheme` append, i18n-guard comment). See §Concurrency.

---

## 1. Copy correction — `how.sources` (English source only)

`frontend/src/app/core/i18n/en.ts:85`, key `how.sources`.

**Before:**

> Locations come from two sources. Official locations come from Estonian Rescue Board
> (Päästeamet) open data and show a blue Registry marker. Community locations are added by
> users: **an unverified submitter shows a yellow triangle,** a partially verified submitter a
> yellow circle, and a fully verified submitter a green circle. A location with an open report
> shows a red marker. A community submission is never automatically official.

**After:**

> Locations come from two sources. Official locations come from Estonian Rescue Board
> (Päästeamet) open data and show a blue Registry marker. Community locations are added by
> users: a partially verified submitter shows a yellow circle, and a fully verified submitter a
> green circle. A location with an open report shows a red marker. A community submission is
> never automatically official.

The false clause ("an unverified submitter shows a yellow triangle") is deleted; the verb moved
to the first surviving coordinate so the sentence keeps its original parallel structure and the
two correct clauses survive verbatim. In-line edit (one line → one line), so the doc-cited
`en.ts:177,180-182,186` range (05-CONTEXT-MAP.md:116, `map.legend.*` anchors) is unchanged.

**Truth verified against the current marker model** (`leaflet-service.ts:69-89` `markerTone()`
+ `shelter-copy.ts:80-100` `verificationTone()` + the four legend keys `map.legend.registry /
partialVerified / fullVerified / reported`): registry = blue; partial (exactly one confirmed
channel) = yellow; full (two or more) = green; any open report = red. An unverified submitter
(no confirmed channel) gets the plain community circle — `markerTone` returns `'user'`, "the
plain default community marker … no verification affordance of its own (owner decision — the
unverified pin state was removed)". No shape distinguishes them, so the deleted clause was
false; the sentence no longer makes the claim (stating what they DO show is the native-review
copy decision, not this fix).

**Translations NOT touched** (owner instruction — native review owed):

- `frontend/src/app/core/i18n/et.ts:94` — still contains "kinnitamata kasutajal on kollane
  kolmnurk" (an unverified user has a yellow triangle).
- `frontend/src/app/core/i18n/ru.ts:99` — still contains "у неподтверждённого пользователя —
  жёлтый треугольник".

Recorded as an OWNER line in `docs/autopilot/CODE-REVIEW-NOTES.md` (appended, line 189),
continuing board item 1 (REMOVE-UNVERIFIED-PIN:120) with the EN part marked fixed.

---

## 2. Vocabulary-guard census extension — `SourceVocabularyTest`

`src/test/java/ee/sheltermap/config/SourceVocabularyTest.java`. Two proven gaps (board item 15:
SIMPLIFY-GUIDANCE-TESTS:51 — all-caps wave form; SIMPLIFY-SHARED:59 — bare N-digit spec-title
tokens). Three patterns added to `FORBIDDEN_PATTERNS` (the existing sixteen untouched, the
matched-count floors untouched):

| New pattern | Refuses | Allow-list reasoning (census over the whole scanned tree: `src/main/java`, `src/test/java`, `frontend/src`; `.java/.ts/.html/.scss`) |
| --- | --- | --- |
| `\bWAVE \d+` | the all-caps, space-spelled wave citation | Census: **0 occurrences** anywhere in the tree (the two known instances — "WAVE 9 RED-PROOF" in `guidance/GuidanceServiceTest` — were already reworded by SIMPLIFY-GUIDANCE-TESTS). A shape with no legitimate occurrence is only ever a planning row, so it is safe to refuse; the lowercase and title-case space forms were already refused. |
| `\bWAVE-\d+` | the all-caps, dash-spelled wave citation | Same census: 0 occurrences. Added for symmetry with the already-refused `wave-\d+` / `Wave-\d+` dash forms, so the all-caps family cannot slip through the dash spelling. |
| `\bN\d+\b` | a bare N-digit planning id standing alone (the existing set only caught `N\d+ finding` and `reviewer N\d+`) | Census: **22 occurrences, every one a planning reference** — spec `it()`/`describe()` titles and comments ("(N2)", "N6: …", "(N7 i18n-completeness)", "N8 shape", "the shelter-detail N7 pattern"). No identifier, i18n key, CSS class, test constant or Flyway `V` number carries the shape (the word boundaries exclude `N1` inside a longer token, and a standalone token is not a dotted key, a class name or a `V`-number). |

**Legitimate text confirmed still passing** — the guard's green run (§Gate) walks all three
roots, and the census explicitly cleared the named safe classes:

- **i18n keys** (dotted paths, e.g. `map.something`): 0 matches — a dotted key cannot be a bare
  whole `N\d+` token, and no key contains the all-caps word.
- **CSS class names** (`.scss`/`.html`, e.g. `.shelter-marker--full`): 0 matches in either
  shape.
- **Flyway `V` numbers**: untouched by all three patterns (letter-anchored on `WAVE`/`N`); the
  `V\d+` migrations and their prose citations scan clean in the green run.

**Matched-count floors — kept, not weakened:** per-root file floors 300 / 150 / 180
(`src/main/java` / `src/test/java` / `frontend/src`), the 110 000 total-line floor, and the
70-name archived-change floor are all unchanged; the green run cleared them (the tree grew by a
net ~13 lines in this lane and by the other lanes' in-flight work, so every floor has more
headroom than at measurement).

**Red-proof** (throwaway copies, deleted after each run; focused `flock … mvn test
-Dtest=SourceVocabularyTest`, per rule 7):

1. Throwaway copy of `error-copy.ts` as `frontend/src/app/shared/__vocabulary-red-probe__.ts`
   with line 1 `// WAVE 9 red-proof …` → **exit 1**, guard failed naming exactly
   `frontend/src/app/shared/__vocabulary-red-probe__.ts:1` (all-caps pattern fired; no other
   pattern could match the line). Probe deleted. (`/tmp/finish-copy-guard-red-a.log`)
2. Same throwaway with line 1 `// N12 red-proof …` → **exit 1**, guard failed naming exactly
   that line (bare N-digit pattern fired). Probe deleted. (`/tmp/finish-copy-guard-red-b.log`)
3. Probe-free tree → **exit 0, Tests run: 2, Failures: 0** (`/tmp/finish-copy-guard-green.log`).
   FINISH-P3-BE's own guard run independently shows `SourceVocabularyTest` 2/2 green with the
   extended census (its notes line 198).

**What the extended guard flagged, and the disposition** — 22 lines in 14 frontend files, all
title/comment-only, all line-count preserving, all in files no live lane owned at edit time
(the clean worktree at lane start; the claim table shows the later overlap — §Concurrency).
Residual census after the rewording: **0 hits for all three shapes** across all three scanned
roots (and the guard file itself does not self-match: its pattern literals are `N\\d+` /
`WAVE \\d+` text — a backslash after the letter, never a digit):

| Area | File (lines) | Change |
| --- | --- | --- |
| session | `auth-store.spec.ts` (148, 161, 637) | 3× `it()` titles: dropped trailing `(N2)` / `(N2)` / `(N1)` |
| core | `api-interceptor.spec.ts` (219) | `it()` title: dropped `(N3)` |
| auth | `login-page.spec.ts` (296) | `it()` title: dropped `(N7 i18n-completeness)` — "in the active locale" keeps the constraint |
| auth | `register-page.spec.ts` (300, 328, 354) | 3× `it()` titles: dropped `(N16)` ×3 |
| auth | `login-page.ts` (32), `register-page.ts` (35), `reset-page.ts` (52) | identical 2-line `i18n` field comment: "…the active locale (N7 i18n-completeness)." → "…the active locale." |
| map | `map-page.spec.ts` (538, 1666) | `it()` titles: dropped `(N9)`, `(N8 shape)` |
| account | `account-page.spec.ts` (259, 521) | `it()` titles: dropped `(N15)`, `(N14)` |
| shelter | `shelter-detail-page.spec.ts` (519) | `it()` title: dropped `(N7)` |
| shelter | `submit-shelter-page.spec.ts` (1209) | `it()` title: dropped `(N10)` |
| shared | `error-copy.spec.ts` (221) | `it()` title: `N6: a 5xx …` → `a 5xx …` |
| shared | `shelter-copy.spec.ts` (276, 481, 488) | `it()` title dropped `(N7 i18n-completeness)`; section banner comment `// Locale seam (N7 i18n-completeness):` → `// Locale seam:`; `describe('locale seam (N7 i18n-completeness)')` → `describe('locale seam')` |
| guidance | `guidance-detail-page.spec.ts` (696) | section banner comment: "(the shelter-detail N7 pattern)" → "(the pattern the shelter-detail spec pins)" |

No test asserts on `it()`/`describe()` titles (specs assert on DOM/values — the same class of
change BOARD-SWEEP item 1 verified), and no `docs/agent` anchor cites any of these 14 files
(grep 0), so the rewording is behaviour- and anchor-neutral. This is the bare-`N\d+` subset of
board item 16's authorised frozen-spec rewording; the other item-16 shapes (F*/W13/01-TASK.md)
are FINISH-P3-FE's in-flight sweep, reported by area above rather than touched here beyond the
N-digit lines.

---

## 3. The two stale QA-document citations — verified, no edit needed

`qa/security-checklist.md:57` and `qa/test-plan.md:70` (board item 18, filed by
DEAD-TRYRECORD:130 as citing the deleted
`FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly`).

**Finding: the citations were already re-pointed before this lane ran.** Commit `a1d73e2`
("…clear the last dead names and the uncalled test seam") — an **ancestor of the `2a7ef62`
baseline** — changed exactly these two lines; the dead test name has **0 hits** in `qa/` (and in
`scripts/`, `.github/`). Both lines were verified to cite tests that exist in the current tree:

- `qa/security-checklist.md:57` — `test/auth/VerificationThrottleIT` (exists,
  `burstOfVerificationRequestsIsThrottledWith429` at :79), `VerificationDailyCapIT` (exists,
  `dailyCapThrottleCarriesRetryAfterUntilUtcMidnight` at :83),
  `verification/FileVerificationSendLogTest.countsOnlySendsFromToday` (exists at :108).
- `qa/test-plan.md:70` — `auth/VerificationDailyCapIT.dailyCapThrottleCarriesRetryAfterUntilUtcMidnight`
  (exists at :83), `verification/VerificationServiceTest.dailyCapBlocksFurtherSends` (exists at
  :189).

The underlying claims (60 s cooldown + 5 sends/user/level/UTC day, per-contact 5/24 h cap)
remain true and pinned. No edit made; recorded as a VERIFIED line in the notes file (line 190).

---

## Gate

(all Maven under `flock /tmp/openshelter-mvn.lock` per rule 7; long gates detached with exit
files per rule 2. All gates run on the **combined** tree — FINISH-P3-BE's and FINISH-P3-FE's
uncommitted work was in place; attribution of anything foreign is by failing class/file, per
the board-sweep precedent.)

| Gate | Result |
| --- | --- |
| `flock … mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, exit file) | **exit 1 — Tests run: 1359, Failures: 1, Errors: 0, Skipped: 0** (all 157 test classes ran; the build then failed at the surefire stage). The single failure is `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` on **exactly one stale anchor** — `design-tokens.spec.ts:855-865` — shifted by FINISH-P3-FE's +11-line insertion at `design-tokens.spec.ts:494` (unrecorded; re-derivation computed and recorded, see §Concurrency). **1358/1359 green**, including `SourceVocabularyTest` **2/2** with the extended census, `OpenApiSnapshotIT`, and every IT. 1359 = the 1366 baseline − 7 (FINISH-P3-BE's owner-authorised retirement of `AdminGuidanceSearchPolicyTest`); this lane adds zero tests. PMD/jacoco-check did not run in this gate (the build stopped at the test phase); the last full PMD run covering this tree state — including my `SourceVocabularyTest` edit — is FINISH-P3-BE's (exit 0, `/tmp/finish-p3-be-pmd.exit`), and this lane adds no main code. `/tmp/finish-copy-guard-be3.{log,exit}`. Two earlier full-gate attempts (exit 1 each) are recorded in §Concurrency — both failed on foreign in-flight states, never on this lane's files. |
| `cd frontend && npx ng test --watch=false` (detached, exit file) | **exit 0 — 65/65 files, 1583/1583 tests** (the 1582 baseline + FINISH-P3-FE's one new color-scheme pin; this lane's 22 title/comment rewordings + the `en.ts` value change are inside this green run). `/tmp/finish-copy-guard-fe-test.{log,exit}` |
| `cd frontend && npx ng build` (detached, exit file) | **exit 0** — dist emitted (`/tmp/finish-copy-guard-fe-build.{log,exit}`). |
| Guard-focused runs (flock) | Red-proof A (all-caps wave probe): **exit 1**, hit names the probe line. Red-proof B (bare N-digit probe): **exit 1**, hit names the probe line. Probe-free: **exit 0, 2/2**. `/tmp/finish-copy-guard-red-{a,b}.log`, `/tmp/finish-copy-guard-green.log`. |

---

## Concurrency (recorded in the notes file, lines 191-193)

- **Shared-file overlap with FINISH-P3-FE.** Both lanes edited the same eight spec files on
  **disjoint lines** — I dropped the bare N-digit parentheticals (listed above); FINISH-P3-FE
  swept the F*/W13/`01-TASK.md §8`/`bundle-lazy-i18n` lines (its claim note: "item 4
  frozen-spec prose sweep + color-scheme append + i18n guard comment"). The claim table went
  first-wins to it on those eight files (it claimed before this lane's claim call). Verified in
  the worktree that both hunk sets coexist (`git diff HEAD` per file); my lines are
  title/comment-only and line-count preserving, so the union is the intended final state.
- **Mid-move compile snapshot (rule-7-adjacent).** My first focused guard run (~01:24) failed
  with 151 "package Pagination does not exist" errors: FINISH-P3-BE's in-flight api→app move of
  `Pagination`/`PagingBoundsException` was caught mid-snapshot (`api/Pagination.java` deleted,
  one import not yet updated) and `target/` had been wiped by an unlocked build moments earlier
  (6th occurrence on record, board item 21). After the move settled (0 stale `api.Pagination` /
  `api.PagingBoundsException` refs; 12 files import `app.Pagination`), the locked re-runs were
  clean. Not this lane's code.
- **DocumentationFactsTest transient.** My full gate (below) ran while FINISH-P3-FE's
  `design-tokens.spec.ts` sweep had shifted the doc-cited `:855-865` / `:949` ranges without the
  re-derivation landing yet — the single failure in my run is that anchor, in files this lane
  never touched (00-CURRENT-STATE.md is the doc-owner lane's file; rule 6). FINISH-P3-BE
  re-derived its seven backend-move anchors and recorded the same transient (its notes line
  198). The FE anchor re-derivation lands with the FE lane's final state.

## Anything unverified / residual

- **DocumentationFactsTest** (the one red in my mvn gate) — FINISH-P3-FE's +11-line
  insertion at `design-tokens.spec.ts:494` shifted the doc-cited ranges without the rule-6
  shift record landing (its report and notes line were still pending at gate time). I recorded
  the shift with old→new ranges in the notes file (line 199): `:855-865` → `:866-876`
  (machine-flagged; the quoted phrase verified at the new lines), `:913` → `:924` (the
  "unified verified family" it-title verified at the new line), `:949` → `:960` (the "marker
  colours keep their meanings" it-title verified at the new line); `:64-66,73-88` (doc :322)
  is before the insertion — unchanged. Rule 6: I did not edit the state doc (one lane owns it).
  Once the single anchor pass re-derives them, the combined-tree mvn gate is expected exit 0 —
  1358/1359 were already green around it, and my own edits owe no shift (all in-line; no
  anchor cites any of my 16 files).
- The ET/RU `how.sources` values remain false until native review (owner line in the notes
  file) — deliberately untouched.
- The `how.sources` English sentence now states nothing about unverified submitters (per the
  instruction: delete the false clause; the other two clauses were already correct). If the
  owner wants the plain-circle behaviour described, that is a copy decision for the same
  native-review line.
- Board item 16's *other* frozen-spec shapes (F*/W13/`01-TASK.md §8`/`bundle-lazy-i18n`) are
  FINISH-P3-FE's in-flight work — not re-verified here beyond the shared-file coexistence check
  and the combined-tree green runs.
- P3-G's "i18n template guard comment says 23 files, both say 26" (agent 9 F8) is a different
  guard and outside this lane's authorisation — left as filed (FINISH-P3-FE's claim note lists
  an "i18n guard comment" fix among its work; verify with it).
- The gate test counts on the combined tree are 1359 (BE) and 1583 (FE), not the 1366/1582
  baselines: −7 = FINISH-P3-BE's owner-authorised retirement of `AdminGuidanceSearchPolicyTest`
  (board item 14), +1 = FINISH-P3-FE's new color-scheme pin. This lane adds zero tests.
