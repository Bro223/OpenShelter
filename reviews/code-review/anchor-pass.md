# ANCHOR-PASS — re-derive the drifted 00-CURRENT-STATE.md anchors

Lane report for the `code-review` run. No commits (parent commits). Only
`docs/agent/00-CURRENT-STATE.md` edited; notes board appended to only.

**Scope:** every `file:line` citation in `docs/agent/00-CURRENT-STATE.md` that
points into a file changed since the `code-review` branch was cut
(`43bebe7`, tip of `feature/frontend`), verified against a pristine
`git archive HEAD`, not the working tree.

## 1. The failure, reproduced exactly

Command (detached, exit file read):

```
flock /tmp/openshelter-mvn.lock mvn -B -ntp -q -Dtest=DocumentationFactsTest test
```

Result: **exit 1**, `Tests run: 21, Failures: 1, Errors: 0`, the sole failure:

```
DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode:1642
Expecting empty but was: ["frontend/src/app/features/admin/admin-page.ts:515 — none of
  the clause's code tokens [] (or quoted phrases [the view IS the URL]) appear at the
  cited lines — the code moved and the anchor did not",
 "frontend/src/app/features/admin/admin-page.ts:603-618 — none of the clause's code
  tokens [auditPage, auditSize, mediaPage, mediaSize, reportPage, reportSize,
  userPage, userSize] (or quoted phrases []) appear at the cited lines — the code
  moved and the anchor did not"]
```

Exactly the two anchors the brief expected. No other anchor was red.

## 2. How the guard checks an anchor (read from `DocumentationFactsTest`)

Each backticked `path:lines` citation is resolved (relative `:lines` resolve
against the previous full citation, in document order). The cited lines must
carry content; and when the clause window (back to the previous newline or
previous citation, up to four wrapped lines) names a code identifier
(backticked, 4+ chars) or a verbatim quoted phrase, the cited lines must
contain one of them — case-insensitive, comment leaders stripped. A clause
naming no token degrades to the structural check only: **that is how a
drifted range can stay green while pointing at the wrong lines** — which is
why every citation into a changed file was re-derived, not just the two red
ones.

## 3. Which files could have drifted, and which actually did

`git diff --name-only 43bebe7..HEAD` ∩ cited files = 23 files. Per-file hunk
maps (`git diff --unified=0`) show the drift:

- **`admin-page.ts`** — rewritten by commit `225ebf6` (2126 → 981 lines;
  guidance state → `guidance-view.ts`, the four paged tabs → `paged-view.ts`).
  All three cited ranges moved. **Fixed.**
- **`SecurityConfig.java`** — commit `33793ce` net −8 lines from old line 177
  on (the limiter table). Cited `:192-196` moved. **Fixed.**
- **`GuidanceService.java`** — commit `33793ce` rewrote the file above line
  800 (the validation-prologue collapse) and grew the hero catch's fallback
  from a 2-line ternary to a 4-line if. The SIMPLIFY-GUIDANCE board entry said
  its five clauses "still PASS" and "re-derive optionally" — that is true for
  the guard (the two tokened clauses kept their tokens in range), but two of
  the five cited ranges had silently lost their exact referent: `:839-848`
  no longer ends where the catch ends, `:845-847` no longer starts where the
  fallback starts, and `:851-858` starts on a blank line. **Re-derived.**
- **All other changed cited files** (`styles.scss`, `theme-tokens.ts`,
  `leaflet-service.ts`, `shelter-copy.ts`, `en.ts`, `et.ts`, `ru.ts`,
  `design-tokens.spec.ts`, `map-page.ts`, `Pagination.java`, `ShelterDto.java`,
  `AdminController.java`, `AdminModerationService.java`, `ShelterReportService.java`,
  `ShelterReport.java`, `Shelter.java`, `Provenance.java`, `ReviewStatus.java`,
  `SpringDataShelterReportRepository.java`, `HeroImageImportService.java`) —
  every hunk is a single-line **in-place** rewording (the id sweep, line
  counts preserved); zero line-number movement. No drift. Where such an
  in-place edit fell inside a cited range, the content at the cited lines was
  re-read against the claim and still holds (spot-checked:
  `AdminModerationService:311-315` "its X-Total-Count IS the sum of the
  per-shelter open counts the pins read" ✓; `Pagination:112-122` the
  `X-Total-Count` total javadoc ✓; `map-page.ts:62-76` the five
  `LEGEND_TONES` ✓, `:231-244` the legend-is-the-filter javadoc ✓;
  `ru.ts:198-204` "MACHINE DRAFT — awaiting native Russian review" ✓;
  `HeroImageImportService:24-33` save-time import + `REQUIRES_NEW` ✓).

## 4. Each citation changed, with old/new values and the content verification

All line numbers below verified by reading the pristine `git archive HEAD`
tree (`/tmp/anchor-pristine`), not the working tree.

### `frontend/src/app/features/admin/admin-page.ts` (the two red anchors + one silent drift)

| Doc line | Old | New | Content verified at the new lines |
|---|---|---|---|
| 177 ("the view IS the URL") | `:515` | `:368` | L368 = `/** The view IS the URL: every emission (the initial navigation and every` — the queryParams-subscription doc; the guard's quoted phrase matches case-insensitively ✓ (the class doc at L134 repeats the idiom, but 368 is the URL-emission discipline the clause describes) |
| 184 (clamp/normalize discipline) | `:575-602,651-656` | `:419-509` | Old = the `check` clamp helper (575-602) + the `replaceUrl` navigate block (651-656) of the pre-rewrite file. New = the whole `normalizeListParams` unit: constraint javadoc 419-424 ("…is clamped to the nearest legal value and the URL is normalized in place (replaceUrl), so the control and the URL can never quietly disagree"), signature 425, the six `check(…)` pairs 453-468, the `source`/`excludeDismissed`/`tab` sanitizers 469-499, `replaceUrl: true` at 504, `}` at 509 |
| 188 (the six `{list}Page`/`{list}Size` pairs) | `:603-618` | `:453-468` | L453-468 = the six `check(…)` calls, `guidancePage/guidanceSize` (453-458), `shelterPage/shelterSize` (459-464), `reportPage/reportSize` (465), `userPage/userSize` (466), `mediaPage/mediaSize` (467), `auditPage/auditSize` (468) — all eight failing tokens present ✓ |

The lane-recorded shifts (`:368`, `:425-508`, `:453-468`) were spot-confirmed
correct; my re-derivation differs from the board on one boundary: the lane
gave `:425-508` (signature → `return false;`, off by the closing brace) and
omitted the constraint javadoc. I cite **419-509** — the complete unit
including the comment that states the discipline the claim quotes, and the
closing brace.

### `src/main/java/ee/sheltermap/config/SecurityConfig.java` (silent drift, recorded by SIMPLIFY-CONFIG)

| Doc line | Old | New | Content verified |
|---|---|---|---|
| 201 (X-Total-Count exposed by name, never a wildcard) | `:192-196` | `:183-188` | L183-187 = the five-line comment ("Only the paged endpoints' custom response header crosses the origin boundary: without it the browser can read the body but NOT X-Total-Count … Listed BY NAME (never a wildcard)…"), L188 = `config.setExposedHeaders(List.of("X-Total-Count"));`. The old `:192-196` was exactly the five-line comment (the call sat at old 197, outside the range); 183-188 keeps the comment and adds the line that enforces it |

The board said `:184-188`; my read starts the citation at the comment's first
line (183) so the range does not open mid-sentence.

### `src/main/java/ee/sheltermap/guidance/GuidanceService.java` (silent drift, "re-derive optionally" per SIMPLIFY-GUIDANCE)

The hero region landed at 799-867; the old anchors' referents, mapped line by
line against the baseline (`225ebf6^`… precisely `43bebe7`) and the pristine
HEAD:

| Doc line | Old | New | Content verified |
|---|---|---|---|
| 222 (import runs at save time, draft or published alike) | `:801-806` | `:802-807` | L802 = `/**` opening `resolveHeroOnSave`'s javadoc; L803-804 = "The save-time hero decision: the import runs when the post is SAVED, draft or published alike, not when it is published —". The old range was the same six javadoc lines; new 801 is a blank, so the citation moves down one |
| 228 (the catch that says a failed import never blocks the save) | `:839-848` | `:839-850` | The catch block is now 839-850: signature 839-840, "A failed import NEVER blocks the save — the error is returned to the write response (the admin sees it against the hero field), the post is stored with the URL kept" 841-844, fallback 845-848, return 849, `}` 850. The old range was the whole 8-line catch; the fallback rewrite (ternary → if) grew it to 12 |
| 234 (hero falls back to the request's library reference, else what the post already had) | `:845-847` | `:845-849` | L845 = `Long fallback = requestHeroImageId;`, L846-848 = `if (fallback == null && post != null) { fallback = post.getHeroImageId(); }`, L849 = `return new HeroResolution(fallback, cleanImportUrl, ex.getMessage());` — both halves of the fallback plus the return that carries it (the old 845-847 was the 2-line ternary + return) |
| 238 (idempotent re-save: same-URL save does not re-fetch or duplicate; token `source_url`) | `:826-834,851-858` | `:826-834,853-860` | First half unchanged: 826-827 = `resolveHeroOnSave` signature, 828-830 = the null-URL guard, 831-834 = the `isHeroImportedFrom` guard with "The current hero IS this URL's import — a re-save with the same URL does not re-fetch". Second half: 853-859 = `isHeroImportedFrom`'s javadoc (L855 carries `{@code source_url}` — the token the guard checks), 860 = the signature. The old range was the same javadoc+signature, sitting at 851-858 before the catch grew above it |

## 5. Pristine-archive verification

- `git archive HEAD | tar -x -C /tmp/anchor-pristine` (clean `HEAD` = `7e4ffde`,
  working tree at verification time was clean: `git status --porcelain` empty).
- The edited document copied in (`git diff` of the doc against HEAD = exactly
  the 8 citation lines, no prose touched).
- Guard run **there**: `flock /tmp/openshelter-mvn.lock mvn -B -ntp -q
  -Dtest=DocumentationFactsTest test` in `/tmp/anchor-pristine` → **exit 0**
  (`Tests run: 21, Failures: 0, Errors: 0`).
- The full acceptance gate additionally runs the same guard in the repo
  working tree (identical tree + the same doc edit) — see §7.

## 6. Claims that need a symbol anchor instead of (or beside) the range

The guard token-checks a citation only when the clause names a symbol or a
quoted phrase. Two of the re-derived anchors are **structural-only** — green
today, and they would stay green if the code moved again, silently pointing
at the wrong lines:

1. **Doc line 184 — clamp/normalize discipline → `admin-page.ts:419-509`.**
   The clause names no symbol (the `replaceUrl` backtick sits before the
   previous citation, outside the clause window). `admin-page.ts` is the file
   this run is still actively shrinking — `architecture.spec.ts` pins its
   ceiling at 981 and names the next seam (the review-queue state) — so this
   method WILL move again. **Suggestion:** add the symbol to the clause,
   e.g. "…can never quietly disagree (`normalizeListParams`,
   `frontend/src/app/features/admin/admin-page.ts:419-509`)". The guard would
   then fail loudly on any move, exactly like the two anchors that just
   caught this drift.
2. **Doc line 201 — X-Total-Count exposed by name → `SecurityConfig.java:183-188`.**
   Same shape: the clause window carries no token. **Suggestion:** backtick
   `setExposedHeaders` in the clause ("…never a wildcard
   (`setExposedHeaders`, `src/…/SecurityConfig.java:183-188`)") so the anchor
   pins the call by name.

Not applied by this pass: both are one-word clause edits to settled prose,
and the anchor pass's job is to re-derive ranges; the parent or the next
docs-lane edit should make the wording change deliberately (one change at a
time, per the doc's own maintenance rule). Everything else re-derived in §4
is already token- or phrase-anchored (`source_url`, the six param names, "the
view IS the URL"), so those ranges will fail loudly on the next drift.

## 7. Gates

| Gate | Command | Result |
|---|---|---|
| Pristine-tree guard | `cd /tmp/anchor-pristine && flock /tmp/openshelter-mvn.lock mvn -B -ntp -q -Dtest=DocumentationFactsTest test` | **exit 0** — 21/21 |
| Acceptance gate (repo, detached, exit file read) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — 1356 tests, 0 failures/errors, PMD clean, `jacoco:check` "All coverage checks have been met" (see `/tmp/anchor-gate.log`) |

No red item outside this pass's anchors appeared at any point; the gate's
only red before the fix was the reproduced `DocumentationFactsTest` clause.

## 8. Unverified / caveats

- None within scope. The doc edit is citation-only (8 lines, verified by
  diff); no claim's wording changed, so no test that pins doc prose is
  affected beyond the anchor pin itself.
- The pristine tree at `/tmp/anchor-pristine` is throwaway; the committed
  tree is what the gate verifies, and the working tree was clean when the
  archive was taken.
