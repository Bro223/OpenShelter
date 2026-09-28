# FRONT-NAMES — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** the owner's hand-off from LAST-NAMES §6 — the 24 frontend
`.ts` references to the never-filed change name `bilingual-guidance` —
plus the full "sibling dead change name" search the assignment mandates,
plus the recommendation on extending the Java name guards to the
frontend. Every edit is comment-only, line-count preserving (numstat:
+24/−24 across 9 files, in place), so zero anchor shifts are owed and
`docs/agent/00-CURRENT-STATE.md` is untouched.

---

## 1. Count verification

The sibling report's "24 frontend `.ts` references in 8 files" is
**verified exactly**: 24 occurrences of `bilingual-guidance` in
`.ts` files, in exactly those 8 files. The sibling's count was
`.ts`-scoped; the same dead name also sits in **3 non-`.ts` frontend
files** (2 HTML comments, 1 SCSS comment) — tree total **27
occurrences, 29 files-scoped lines, 0 in code** (a character-level
comment/string scanner, not raw grep, classifies each; raw grep agrees).

While establishing "any sibling dead change name" I found a **second
dead name** the earlier sweeps missed: `submitter-verification-badge`
— never filed (no live or archive directory, no git history under
`openspec/` — verified with `git log --all -S`), still cited in **2
comments in `styles.scss`** that BOARD-SWEEP's removal of the same name
from `models.ts`/`map-page.spec.ts` left behind.

## 2. The exact reference list — every hit, verdict, file:line

Classification method: whole-kebab-token match of every token that
resolves to no `openspec/changes/` (live) or `openspec/changes/archive/`
(dated dir or date-stripped slug) directory, classified per occurrence
as comment vs code by a TS state machine (line/block comments,
string/template literals incl. `${}` depth) and HTML/SCSS comment
ranges. The 27 + 2 hits below are the dead-change-name class; §3 lists
the other unresolved candidates and why each is not one.

### `bilingual-guidance` — 27 references, all comments, 0 code

| # | file:line | kind | verdict | action |
|---|---|---|---|---|
| 1 | `frontend/src/app/core/models.ts:905` | comment (javadoc of `GuidancePostDto.locale` — a models-contract-pinned interface) | comment | **reworded** → `(per-locale serving)` |
| 2 | `frontend/src/app/core/models.ts:917` | comment (javadoc of `alternates`) | comment | **reworded** → `(per-locale slugs)` |
| 3 | `frontend/src/app/core/models.ts:925` | comment (javadoc of `localeFallback`) | comment | **reworded** → `(per-locale serving)` |
| 4 | `frontend/src/app/core/models.ts:1108` | comment (javadoc of `GuidanceTranslationDto`) | comment | **reworded** → `(per-locale rows, V26)` |
| 5 | `frontend/src/app/core/models.ts:1137` | comment (javadoc of `CreateGuidanceTranslationRequest`) | comment | **reworded** → `(per-locale rows)` |
| 6 | `frontend/src/app/core/models.ts:1158` | comment (javadoc of the update request) | comment | **reworded** → `(per-locale rows)` |
| 7 | `frontend/src/app/features/admin/guidance-editor.ts:113` | comment (`GuidanceEditorSave` doc) | comment | **reworded** → `(per-locale rows)` |
| 8 | `frontend/src/app/features/admin/guidance-editor.ts:128` | comment (`createTranslation` javadoc) | comment | **reworded** → `(per-locale rows)` |
| 9 | `frontend/src/app/features/admin/guidance-editor.ts:132` | comment (`updateTranslation` javadoc) | comment | **reworded** → `(per-locale rows)` |
| 10 | `frontend/src/app/features/admin/guidance-editor.ts:564` | comment (`translationEditMode` javadoc) | comment | **reworded** → `(per-locale rows)` |
| 11 | `frontend/src/app/features/admin/guidance-editor.ts:773` | line comment | comment | **reworded** → `(per-locale rows)` |
| 12 | `frontend/src/app/features/admin/guidance-editor.ts:1368` | line comment | comment | **reworded** → `(per-locale rows)` |
| 13 | `frontend/src/app/features/admin/guidance-editor.ts:1392` | line comment | comment | **reworded** → `(per-locale rows)` |
| 14 | `frontend/src/app/gateways/guidance-gateway.ts:18` | javadoc (class) | comment | **reworded** → `(per-locale serving)` |
| 15 | `frontend/src/app/gateways/guidance-gateway.ts:80` | javadoc (`getBySlug`) | comment | **reworded** → `(per-locale serving)` |
| 16 | `frontend/src/app/features/admin/guidance-translations.ts:8` | component header comment | comment | **reworded** → `(per-locale rows)` |
| 17 | `frontend/src/app/gateways/admin-gateway.spec.ts:595` | section-header comment | comment (spec file, NOT byte-pinned — see §4) | **reworded** → `(per-locale rows)` |
| 18 | `frontend/src/app/features/guidance/guidance-detail-page.spec.ts:718` | section comment | comment (spec file, NOT byte-pinned) | **reworded** → `(per-locale serving)` |
| 19 | `frontend/src/app/features/admin/admin-page.spec.ts:321` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 20 | `frontend/src/app/features/admin/admin-page.spec.ts:400` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 21 | `frontend/src/app/features/admin/admin-page.spec.ts:2345` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 22 | `frontend/src/app/features/admin/guidance-editor.spec.ts:131` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 23 | `frontend/src/app/features/admin/guidance-editor.spec.ts:1748` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 24 | `frontend/src/app/features/admin/guidance-editor.spec.ts:1839` | comment | comment in a **byte-pinned spec** | **filed, not edited** |
| 25 | `frontend/src/app/features/admin/guidance-panel.html:67` | HTML comment | comment | **reworded** → `(per-locale rows)` |
| 26 | `frontend/src/app/features/admin/guidance-panel.html:107` | HTML comment | comment | **reworded** → `(per-locale rows)` |
| 27 | `frontend/src/app/features/admin/guidance-translations.scss:3` | SCSS comment | comment | **reworded** → `(per-locale rows)` |

### `submitter-verification-badge` — 2 references, both comments (the
sibling dead name this search was asked to find)

| # | file:line | kind | verdict | action |
|---|---|---|---|---|
| 28 | `frontend/src/styles.scss:103` | SCSS comment | comment | **reworded** (2-line reflow, count-neutral): `(submitter-verification-badge; the verified-green re-tint)` → `(the verified-green re-tint)` |
| 29 | `frontend/src/styles.scss:394` | SCSS comment | comment | **reworded** (2-line reflow, count-neutral): `(submitter-verification-badge):` → `:` |

Post-edit residual, verified by re-running the census: **0 hits for
`submitter-verification-badge`**; **6 hits for `bilingual-guidance`**,
all in the two byte-pinned specs (rows 19–24).

## 3. Other unresolved change-like tokens — verified, not dead names

The full-tree search (every kebab token, every frontend file excl.
`src/vendor/`; 2 398 distinct tokens) surfaced the following
unresolved candidates; each was checked against git history, the
specs, `docs/autopilot/` and the guarded Java tree before verdict:

| token | hits (comment) | verdict / evidence |
|---|---|---|
| `list-page-paging` | 2 (`shared/pagination.ts:7`, `guidance-list-page.spec.ts:542`) | **Resolves** — `docs/autopilot/list-page-paging/` (spec + lane report) exists in the tree; a citation the reader can open. Left. |
| `review-queue` | 8 (`unconfirmed-view.ts:11`, `admin-page.ts:197,284,625`, `admin-page.spec.ts:1144`, `architecture.spec.ts:69`, `_admin-shared.scss:48`, …) | Concept shorthand for the Unconfirmed tab of the **live** change `community-review-queue`; never a directory of its own. Left. |
| `community-review` (`models.ts:696`) | 1 | Line-wrapped citation of the LIVE `community-review-queue` (token split across the comment's line break). Resolves. Left. |
| `shelter-trust-and` (`shared/leaflet-service.ts:51`) | 1 | Line-wrapped citation of the archived slug `shelter-trust-and-reports`. Resolves. Left. (A line-wrapped citation never matches as a whole kebab token, in the Java scanner's per-line semantics or mine — consistent both ways.) |
| `admin-tab-persist` | 2 (`shared/admin-tab.ts:2`, `admin-page.spec.ts:3905`) | Concept citation, never a change directory (git-verified). **Still not listed in the guard's `NEVER_MADE_CHANGE_NAMES`** and not cited from the Java tree. Left. Observation for the owner: SIMPLIFY-ADMINPAGE removed the same three tokens (`admin-tab-persist`, `admin-page-size`, `admin-guidance-search`) from `admin-page.ts`/`.html` as "planning ids" while the guarded Java tree still cites `admin-guidance-search` (GuidanceSearch.java:10,38; GuidanceService.java:130,139) and `guidance-index-paging` (GuidanceController.java:82,141; GuidancePaginationIT.java:30) green — the run treats the family inconsistently; the guard's authoritative classification is "legitimate concept name". |
| `admin-guidance-search` | 5 (`guidance-order-list.ts:41`, `guidance-order-list.html:9`, `guidance-panel.html:19`, `admin-page.spec.ts:3210`, …) | Same as above — still cited in the guarded Java tree. Left. |
| `admin-page-size` | 3 (`guidance-order-list.html:31`, `guidance-panel.html:167`, `admin-page.spec.ts:3210`) | Same. Left. |
| `guidance-index-paging` | 2 (`guidance-gateway.ts:47`, `guidance-list-page.spec.ts:542`) | Same — still cited in the guarded Java tree. Left. |

Everything else unresolved is census noise, not change names: English
compounds (`server-side`, `out-of-range`, `two-tap`, `no-op`,
`un-paged`, `anti-enumeration`, `server-sanitized`, …), CSS/design-token
vocabulary (`color-*`, `space-*`, `aria-*`, `black-and-yellow`),
component/file names (`page-shell`, `leaflet-service`,
`guidance-order-list`), i18n keys, URL paths, DOM ids. Full distinct
list available in the census artifacts (§6).

## 4. Code cases — filed, not fixed (a wider decision each)

1. **The 6 `bilingual-guidance` comments inside the two byte-pinned
   specs** (rows 19–24). Byte-pin verification, as the assignment
   demanded: no runtime test hashes or byte-pins any frontend file;
   the two pins that read file *content* are
   `core/models-contract.spec.ts` (parses `models.ts` interface field
   names — comments skipped by its parser) and
   `gateways/api-contract.spec.ts` (scans `*-gateway.ts` for `/…`
   string literals — comments stripped first). The "byte-pinned" status
   of `admin-page.spec.ts` / `guidance-editor.spec.ts` is the
   SPLIT-ADMIN-PAGE lane-discipline freeze (spec sha256-verified
   byte-identical by that lane; the run's "specs pass UNCHANGED"
   convention) plus the board's open owner item "frozen
   pinned-spec prose/titles". Per my rule I did not touch either file;
   the 6 comment lines join that owner item (comment-only,
   line-count preserving, zero behaviour change).
2. **38 code occurrences of refused names** — the same pinned-surface
   class the Java guard exempts (string literals / DOM ids / test
   titles), verified per occurrence:
   - `shelter-address-search` ×13 — DOM id `id="shelter-address-search"`
     (`submit-shelter-page.html:172,177`) + the template/spec selector
     strings (`submit-shelter-page.spec.ts:278,879,907,925,943,971,988,
     1007,1015,1041,1080`).
   - `shelter-location-input` ×24 — DOM id (`submit-shelter-page.html:141,
     146`) + production selector `document.getElementById(
     'shelter-location-input')` at `submit-shelter-page.ts:775` + 22
     spec selector strings.
   - `community-review-queue` ×1 — `describe('community + private copy
     (community-review-queue)')` at `shelter-copy.spec.ts:72`; a **live**
     (resolvable) name in a test title — not dead, but the same
     pinned-surface class if the owner ever wants titles clean.
   Renaming a DOM id moves template + 2 specs + production code in
   lockstep; that is a selector-contract change, not a comment sweep.

## 5. Recommendation — should the Java guard walk the frontend too?

**Recommendation: YES — extend both refused-name checks to
`frontend/src`, now that the guard's own documented join condition is
met.** The guard says the frontend "joins when an HTML/TS-aware scan
says the tree is clean" (SourceVocabularyTest, archived-name check
javadoc). This sweep IS that scan, and it measured: **0 hits for the 74
archived names in frontend comments, and exactly 27 hits for the one
never-made name — of which 21 are cleaned by this lane and 6 remain in
the two byte-pinned specs awaiting the owner's comment-only
authorisation that is already an open board item.** The id-shape check
already walks `frontend/src` (all four extensions), so this completes
the guard's documented scope rather than adding a new mechanism. One
hard precondition: the walk needs a **TS/SCSS/HTML-aware comment
extractor**, not a port of the Java state machine (see cost (c) below).

### The evidence

**(a) The cleanup cost is zero today for the archive-name check, and six
frozen-spec lines for the never-made check.** A whole-kebab-token match
(the guard's exact matching, path tokens exempt) of the full 74-name
archived set + `bilingual-guidance` over every frontend comment: 0
archived-name hits, 27 never-made hits (now 6, all in
`admin-page.spec.ts` / `guidance-editor.spec.ts`). The 38 code
occurrences (§4.2) stay out — the guard already exempts string literals
and test names in Java; code is code in both trees.

**(b) The census — why "refuse any unresolved kebab token" stays
wrong.** Frontend comment text (`.ts`/`.js`, `src/` excl. vendor):
**4 024 kebab-token occurrences in 1 444 distinct tokens**; whole tree
(incl. strings, attributes, properties): 13 411 occurrences, 2 398
distinct. The comment space is dominated by legitimate English
compounds and concept citations — `server-side` ×64, `client-side`
×53, `in-flight` ×53, `out-of-range` ×50, `not-found` ×44, `two-tap`
×40, `no-op` ×38, `un-paged` ×37, `black-and-yellow` ×34 (the theme
name), `high-contrast` ×24, `page-shell` ×22, `home-locale` ×18 — the
same noise class the Java lane measured (`no-op` ×72, `e-mail` ×68). A
naive "unresolved token" refusal would be red on healthy code, and its
"fix" (an allow-list of English compounds) is a hand-maintained list
that rots — the exact pattern this run keeps closing. The extension
therefore must keep the existing architecture (runtime-derived archive
names + floor; maintained never-made list + floor + per-entry
staleness check), not a broader rule.

**(c) What it costs to keep such a guard honest — three standing items,
all bounded and visible:**

1. *Scanner correctness (one-time, then frozen).* The Java
   `commentTextByLine` machine cannot be reused: a `//` inside a TS
   template literal or URL string is not a comment (porting it would
   **false-positive** a refused name inside a string and swallow code
   after a fake comment start), `<!-- -->` is invisible to it (it would
   **false-negative** the real HTML-comment citations, e.g. the two in
   `guidance-panel.html`), and `${}` interpolation nests strings and
   comments the Java machine has no state for. A purpose-built
   extractor needs red-proof probes for exactly those shapes (refused
   name in a template literal → must NOT refuse; in an HTML/SCSS
   comment → must refuse).
2. *Collision surface grows +2 names per archived change.* Every
   archive adds the full name + slug to the refused set, and the
   frontend cites its features by concept name in comments as a
   house style (that is what the 1 444-token census measures). The
   collision mode is already observable: three archived slugs
   (`shelter-address-search`, `shelter-location-input`) are live DOM
   ids in the frontend (38 code occurrences) — code is exempt, but the
   next lane that writes a comment citing one of those concepts trips
   the guard. The fix in that case is the run's settled one — reword to
   the constraint, drop the name, one comment line — so the cost is a
   visible red gate, never a silent pass. One policy deserves an
   explicit sentence in the guard's javadoc: a comment that cites a
   spec by its bare slug (spec dirs share slugs with archived changes,
   e.g. `crisis-guidance`) is refused, while citing it by
   `openspec/specs/…` path stays legal via the existing path-token
   exemption.
3. *The frozen-spec coupling.* Six refused-name comment lines live in
   byte-pinned specs; the extension turns them into a hard gate
   dependency until the owner authorises the comment-only rewording
   (the board's "frozen pinned-spec prose/titles" item, already open).

The alternative — never joining — leaves the exact gap that produced
this hand-off (a never-filed name cited in 27 frontend places, invisible
to the guard) open for every future dead name, in the tree where this
codebase's comment style makes such citations most likely.

## 6. Gates (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0** —
  **1583/1583 tests, 65 files, baseline exact** (comment-only diff).
  Log: `/tmp/frontnames-gate-test.log`, exit:
  `/tmp/frontnames-gate-test.exit`.
- `npx ng build` → **exit 0** (pre-existing SCSS budget warnings only —
  map-page.scss 7.70 kB, recorded by other lanes). Log:
  `/tmp/frontnames-gate-build.log`, exit: `/tmp/frontnames-gate-build.exit`.
- Line-count neutrality: `git diff --numstat` = +N/−N on all 9 files
  (6/6, 7/7, 2/2, 1/1 ×4, 2/2, 4/4) — no line moved, so no
  DocumentationFactsTest anchor is affected (the doc's cited
  `styles.scss` lines :102/:393 sit above my two comment edits and are
  byte-identical in place).
- Residual census (re-run post-edit): `bilingual-guidance` comment=6
  (the filed frozen-spec lines), code=0; `submitter-verification-badge`
  = 0; archived-name comment hits = 0.

## 7. Unverified / handed over

- The 6 frozen-spec lines (rows 19–24) — owner decision (board item
  "frozen pinned-spec prose/titles" + this report §4.1).
- The 38 code occurrences (§4.2) — owner decision, same treatment as
  the snapshot-pinned OpenAPI strings.
- The `admin-tab-persist` / `admin-page-size` / `admin-guidance-search`
  / `guidance-index-paging` classification (§3) — the guard treats the
  family as legitimate (Java tree cites two of them green) while one
  earlier lane removed them as planning ids; reconciling is the
  owner's call. I left all of them.
- `V26__guidance_post_translations.sql:6` — stands as filed by
  LAST-NAMES (applied migration, rule 5).
- I ran no backend gate — no backend file is touched by this lane.
- Census artifacts (kept for the guard lane if the owner authorises):
  `/tmp/frontnames/{census.mjs,census-comment.json,census-all.json,
  all-hits.json,refused.mjs,unresolved-summary.tsv}`.

**Files for your commit (9, all comment-only, line-count preserving):**
`frontend/src/app/core/models.ts`,
`frontend/src/app/features/admin/guidance-editor.ts`,
`frontend/src/app/features/admin/guidance-translations.ts`,
`frontend/src/app/features/admin/guidance-translations.scss`,
`frontend/src/app/features/admin/guidance-panel.html`,
`frontend/src/app/features/guidance/guidance-detail-page.spec.ts`,
`frontend/src/app/gateways/guidance-gateway.ts`,
`frontend/src/app/gateways/admin-gateway.spec.ts`,
`frontend/src/styles.scss` — plus this report and this board's
FRONT-NAMES lines.
