# FINAL-CLEANUPS — the two owner-authorised fixes

Lane: `FINAL-CLEANUPS` · branch `code-review` (HEAD `a1d73e2` at start) · 2026-09-25
Scope: exactly the two authorisations from the owner ("fix what you have found"):
(1) the eight test/describe names citing the dead change name
`admin-locale-split`, reported (not edited) by DEAD-NAMES-CLEAN §1c;
(2) the stale `@Schema` twin of the `AdminAlertDto.kind` contract, reported
by SIMPLIFY-DTOS §4.1 + notes-board line. No commits (parent commits). No
other content: (1) is spec file names only, (2) is one annotation string plus
the regenerated snapshot.

---

## 1. The eight renames (spec file names only)

Method: drop the `(admin-locale-split)` citation; the remaining name already
states what the test verifies (verified per title against its body). Test
bodies, assertions and every other byte untouched — the full diff is 8
lines, 8 insertions / 8 deletions, all `it(`/`describe(` titles.

| File:line | Before | After |
|---|---|---|
| `admin-page.spec.ts:1708` | `a UI language switch changes the admin chrome but leaves the listed content untouched (admin-locale-split)` | `a UI language switch changes the admin chrome but leaves the listed content untouched` |
| `admin-page.spec.ts:1741` | `a UI language switch leaves the scoped empty state on the CONTENT locale (admin-locale-split)` | `a UI language switch leaves the scoped empty state on the CONTENT locale` |
| `admin-page.spec.ts:1765` | `a content language switch changes the listed content and leaves the chrome untouched (admin-locale-split)` | `a content language switch changes the listed content and leaves the chrome untouched` |
| `admin-page.spec.ts:1796` | `the editor detail fetch and save scope to the content locale (admin-locale-split)` | `the editor detail fetch and save scope to the content locale` |
| `admin-page.spec.ts:1837` | `reorder submits the content locale the rendered list came from (admin-locale-split)` | `reorder submits the content locale the rendered list came from` |
| `admin-page.spec.ts:1877` | `the admin-language select is gone and the header switcher still changes the chrome (admin-locale-split)` | `the admin-language select is gone and the header switcher still changes the chrome` |
| `admin-page.spec.ts:1906` | `the content-language control sits on the Guidance tab, re-scopes the list there, and leaves the chrome untouched (admin-locale-split)` | `the content-language control sits on the Guidance tab, re-scopes the list there, and leaves the chrome untouched` |
| `i18n.spec.ts:84` | `describe('contentLocale (admin-locale-split)')` | `describe('contentLocale')` |

Read-correctness, per title: the seven `it` names are complete declarative
sentences stating the verified behaviour (chrome-vs-content independence, in
both switch directions, plus the editor/reorder scoping and the control
placement); the block's own comment above `:1700` states the constraint the
titles now stand alone on. `contentLocale` names the API surface the
`describe` block verifies (the service's second, independent admin language —
default, independence, persistence, reload); the 7-line comment at
`i18n.spec.ts:77-83` (already reworded by DEAD-NAMES-CLEAN) states the
constraint. No reader loses information: the dropped token was a change name
that resolves nowhere.

`git diff --stat` after (1): exactly `i18n.spec.ts` 1/1 and
`admin-page.spec.ts` 7/7. A repo-wide grep for both dead names
(`admin-locale-split`, `admin-locale-scope`) over `frontend/src`, `src`,
`docs` now returns **zero hits in live source** — the remaining occurrences
are the historical review records (`reviews/code-review/*`,
`docs/autopilot/CODE-REVIEW-NOTES.md`), which are records of what was done,
not live text, and were left as-is by every prior sweep. No doc, test-plan
line or other spec cites any of the eight titles verbatim (grep-verified),
so nothing external needed moving.

## 2. The stale `@Schema` twin — reword + sanctioned regen

`AdminAlertDto.kind`'s javadoc was corrected by SIMPLIFY-DTOS to name all four
`ThrottleAlert` kinds; the `@Schema` description (snapshot-pinned) still listed
three. The reword mirrors the javadoc's own wording, verified against
`alerts/ThrottleAlert.java` (the four `KIND_*` constants at :21/:24/:27/:31):

**Before** (`AdminAlertDto.java:30-31`):
`"The closed vocabulary of ThrottleAlert: submission daily cap / OTP contact cap / near-duplicate."`

**After**:
`"The closed vocabulary of ThrottleAlert: submission daily cap / OTP contact cap (both 429 — the throttled caller) / near-duplicate (the 409 repeat-report rejection) / code-send-failure (a code delivery the channel refused — no HTTP error went out at all)."`

Regenerated with the sanctioned locked command
(`flock /tmp/openshelter-mvn.lock mvn -q -Dopenapi.update=true
-Dtest=OpenApiSnapshotIT test`) → **exit 0** (`/tmp/final-cleanups-snapshot.exit`).
`git diff docs/api/openapi.json` contains **exactly one changed line** — the
`kind` description string in `components.schemas.AdminAlertDto.properties.kind`;
no renames, no operationIds, no other schemas, no reordering of the display-only
`$.tags` array (the SNAPSHOT-CLEAN reordering hazard did not recur because no
edited tag is involved). Nothing else changed, so no revert was needed.

## 3. Found and reported, not fixed

**Third instances of shape (1) — planning-id citations in spec titles.** A
whole-tree scan of every `it(`/`describe(` title in `frontend/src/app` for
bare identifier parentheticals, cross-checked against the archive (37 dirs)
and the one live change (`community-review-queue`), found, beyond my eight:

- **Dead names in spec titles (same shape as the authorised eight; reported,
  not fixed — owner call whether to extend the authorisation):**
  `bilingual-guidance` × 4 — `admin-page.spec.ts:2353`
  (`describe('translations (bilingual-guidance)')`),
  `guidance-editor.spec.ts:1755` (`'translation authoring (bilingual-guidance)'`),
  `guidance-editor.spec.ts:1858` (`'translation editing (bilingual-guidance)'`),
  `guidance-detail-page.spec.ts:724` (`'locale fallback (bilingual-guidance)'`)
  — `bilingual-guidance` resolves nowhere (not in the archive, not live;
  SIMPLIFY-DTOS §2 already flagged it unresolvable);
  `i18n.spec.ts:142` (`describe('site-text overlay (site_texts)')` —
  `site_texts` resolves nowhere); `i18n.spec.ts:242`
  (`describe('lazy catalog loading (bundle-lazy-i18n)')` — resolves nowhere).
  These six sit in the pinned specs SIMPLIFY-CORE-FE's board line (board :83)
  already filed for the parent ("parent must authorise touching them"), which
  is why I did not edit them.
- **Archived names in spec titles** (resolvable — the guard's own exemption
  admits them; same report-only shape, included for completeness):
  `i18n.spec.ts:23` (`'I18nService (i18n-et-en)'`), `page-shell.spec.ts:855`
  (`'language switcher (i18n-et-en)'`), `design-tokens.spec.ts:1709`
  (`mobile-responsive-polish`), `shelter-detail-page.spec.ts:927`
  (`'trust layer (shelter-trust-and-reports)'`), `page-shell.spec.ts:982`
  (`'data provenance line (official-dataset-csv)'`).
- **`shelter-copy.spec.ts:72`** cites `community-review-queue` — the one LIVE
  name; left as-is (a live name is not dead).
- **Ambiguous, not change names as far as I can tell:** `hero-geometry.spec.ts:92/130/159`
  cite `(guidance-detail-page)`, `(guidance-list-page)`, `(guidance-editor)` —
  these read as references to the app's page/components (matching spec-file
  and component names) rather than change citations; if a future sweep treats
  them as dead names, they are the ones to re-check. The rest of the scan hits
  (`re-request`, `mini-map`, `aria-hidden`, `en-GB`, `trust-toned`, …) are
  descriptive phrases, not name citations.

**Third instances of shape (2):** none. The stale three-kind list now exists
only in the historical notes-board line (`CODE-REVIEW-NOTES.md:122`,
SIMPLIFY-DTOS's own filing) — a record, left as-is. No other live code,
comment or doc carries it (grep-verified).

**Not a finding, noted for the gate record:** a pi-lens advisory reported
"json analysis unavailable — language tools missing or LSP not ready" for
`docs/api/openapi.json`. That is an environment limitation (no JSON language
server in this process), not a defect in the file: the change is a one-line
string whose exact bytes are shown in the git diff, and the snapshot IT
re-verified the document against the live annotations in-gate (below).

## 4. GATE

All runs detached, exit files read; every Maven invocation under
`flock /tmp/openshelter-mvn.lock`.

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0** (`/tmp/final-cleanups-ngtest.exit`) — **Test Files 65 passed (65), Tests 1581 passed (1581)** — exactly the stated baseline (log `/tmp/final-cleanups-ngtest.log`) |
| `cd frontend && npx ng build` | **exit 0** (`/tmp/final-cleanups-ngbuild.exit`, log `/tmp/final-cleanups-ngbuild.log`) |
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** (`/tmp/final-cleanups-mvn.exit`) — **`Tests run: 1361, Failures: 0, Errors: 0, Skipped: 0` — exactly the 1361 baseline**; PMD 7.27.0 ran; `All coverage checks have been met` (0.93 floor); `BUILD SUCCESS`; **0** "class file does not exist" lines (no rule-7 wall — log `/tmp/final-cleanups-mvn.log`) |
| snapshot regen (sanctioned) | `flock /tmp/openshelter-mvn.lock mvn -q -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test` → **exit 0** (`/tmp/final-cleanups-snapshot.exit`), diff = the one description string |

In gate: `OpenApiSnapshotIT` 1/1 (the regenerated snapshot matches the live
annotations — i.e. the new string is the only contract delta),
`OpenApiContractIT` 10/10, `DocumentationFactsTest` 21/21 (no anchors owed —
none of the four touched files is cited in `docs/agent/00-CURRENT-STATE.md`,
grep-verified), `SourceVocabularyTest` 2/2 (the guard stays green; the dead
names were never in its refused set, and no id entered the tree).

Test counts unchanged from baseline on both sides (1581 FE / 1361 BE) —
expected: (1) renames no test and (2) changes one annotation string.

## 5. Unverified

- The `hero-geometry.spec.ts` titles' parentheticals (`guidance-detail-page`
  et al.) — classified as component references by file-name coincidence, not
  verified by reading every consumer of that spec.
- The pi-lens JSON advisory (above): the file was not independently linted by
  a JSON language server in this environment; correctness rests on the diff
  inspection plus the in-gate `OpenApiSnapshotIT`.
- No other lane was active in the shared tree during this run (checked
  `git status` before and after the gates — only my four files); if a
  concurrent writer appears, the parent's commit should stage by the file list
  below, not by directory.

**Files for the parent's commit (this lane, 4 + this report):**
`frontend/src/app/features/admin/admin-page.spec.ts` (7 title lines),
`frontend/src/app/core/i18n/i18n.spec.ts` (1 title line),
`src/main/java/ee/sheltermap/api/AdminAlertDto.java` (the one `@Schema`
string), `docs/api/openapi.json` (the one regenerated description line).
