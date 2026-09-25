# FINISH-FE — the spacing decision + the frontend residue

Lane: `FINISH-FE` · branch `code-review` (HEAD `cdd5346` at start — SPEC-TITLE-CLEAN committed) · 2026-09-25

Scope: the two decided jobs from the parent. (1) Implement the recorded spacing
decision (`docs/closing-decisions-2026-09-24.md` §4) on the map sidebar's
address-result list — one list only. (2) Re-derive the residue census
explicit-path, fix whatever survives in comments (comment-only, the earlier
sweeps' constraint), report what sits in string literals or test titles.
No commits (parent commits). No backend, no catalogs, no other lane's files.

---

## 1. The spacing unification (the one list)

**Decision applied** (§4 of the closing decisions): one value for the same
element — the submit form's (`6 / 8–12`), the surface where the user acts on
the results. The audit (`reviews/19-spacing-audit.md` §5 E15) had kept the
split per-surface; the owner's decision supersedes it. `reviews/19-spacing-audit.md`
is a historical record and was left as-is, per the record-leave convention.

**The change** — `frontend/src/app/features/map/map-page.scss`, 2 declarations:

| File:line | Declaration | Old → New |
|---|---|---|
| `map-page.scss:361` | `.anchor-search__results` list gap | `var(--space-4)` → **`var(--space-6)`** (was `:358` pre-edit) |
| `map-page.scss:368` | `.anchor-search__result` padding | `var(--space-8) var(--space-10)` → **`var(--space-8) var(--space-12)`** (was `:365` pre-edit) |

The unification target (untouched, `submit-shelter-page.scss`): list gap
`var(--space-6)` at `:245` (`li + li` margin), result padding
`var(--space-8) var(--space-12)` at `:254`. The two surfaces now carry
identical list gap and result padding.

**One role comment added** (`map-page.scss:352-354`) naming the role and its
sibling — the audit's own convention ("so the next editor sees the contract,
not just the value"), citing `closing-decisions-2026-09-24 §4`.

**What was deliberately not changed** (outside the decision's `6 / 8–12`):
the map row's internal structure — the two-line `text-sm` name/type stack
with its inner `gap: var(--space-2)` — stays as-is; the decision covers the
list gap and the result padding only, and "no behaviour change beyond the
spacing unification" holds. `git diff` is exactly this one file: 5 insertions
/ 2 deletions (2 value lines + the 3-line comment). The compiled CSS of
`map-page.scss` is **byte-identical to HEAD in size** (7840 B both, `sass
--style=compressed` delta = 0 — the two value swaps are same-length, the
comment is minified away), so the build's per-stylesheet 4 kB budget warning
on this file (3.79 kB over) is the pre-existing warning, unchanged.

**One-list check (the stop condition):** the edit touches only the
`.anchor-search__results` / `.anchor-search__result` pair — one list. No
other selector in any file was modified.

**The spacing-literal guard stays satisfied:** both new values are bare
`var(--space-N)` references — on the `--space-*` scale, no fallback — which
the guard (`design-tokens.spec.ts`, "design tokens — spacing literals")
admits by rule; the declaration count is unchanged (the guard's matched-count
floor is 500 against 641 measured). The guard ran green in-gate (below).

## 2. The 360 px overflow mechanisms — confirmed intact

The regex-pinned 360px tests (`map-page.spec.ts:2125-2188`,
`describe('no page-level horizontal overflow at 360px')`) target
`.map-legend` (in-flow `position: static` below 900px; no fixed width; no
`nowrap`) and `.filter-trust` / `.trust-chip` (`flex-wrap: wrap` +
`min-width: 0`) plus the global `.chip` pill (no nowrap). **None of those
selectors or declarations was touched** — the edit sits three blocks below
them in `.map-page__anchor-search`. All three pass in-gate.

Mechanism-level confirmation for the two surfaces (no regex pin exists on
the result lists themselves — grep-verified, so these are read from the
tree, not asserted in code):

- **Map sidebar** — at 360px the layout stacks (`@media (max-width: 900px)`:
  column layout, sidebar `width: auto` = the full 320px of content). The
  result rows are `width: 100%` buttons in a `flex-direction: column` list —
  they cannot outgrow the list; the +2px horizontal padding (10→12) is
  absorbed by the content box (the text re-wraps) and the +2px row gap
  (4→6) adds vertical height only, which the page scrolls (the anchor list
  has no max-height; `.shelter-list` keeps its 420px capped scroll). The
  search input row keeps its shrink mechanism: `.anchor-search__input`
  `flex: 1; min-width: 0`, the button `flex-shrink: 0` — untouched. No
  `white-space: nowrap` anywhere in `map-page.scss` (rg-verified).
- **Submit form** — untouched file. `.address-result` keeps
  `display: flex; flex-wrap: wrap; width: 100%` (at 320px the type badge
  wraps under the name), already at the unified `6 / 8–12` values. The
  sibling 360px pin on the same surface — the checkbox native-size escape
  (`design-tokens.spec.ts`, "the /submit private-home checkbox keeps its
  native glyph size": `width: 18px` / `height: 18px` / `flex-shrink: 0`
  against `.field input { width: 100% }`) — passes in-gate.
- **Result count bound:** both surfaces share the geocode-gateway Nominatim
  contract (`format=jsonv2&limit=5&countrycodes=ee`, defensive cap at 5) —
  the mechanism above holds for that count.

## 3. The residue census — re-derived (explicit-path `rg -w`)

Method: all 37 archived change names (date prefix stripped from
`openspec/changes/archive/`), plus `admin-locale-split` /
`admin-locale-scope`, grepped with explicit paths over `frontend/src` (and
the whole `frontend/` dir excl. node_modules/dist), both bare and
date-prefixed. Before = after for every name: **no comment-line hit exists,
so there was nothing to edit in this job.**

| Name | frontend/src | Nature of every hit |
|---|---|---|
| `map-crisis-actions` | 1 | **test title** — `contributions-panel.spec.ts:113` `it('offers "Submit a shelter" while shelters are present (map-crisis-actions regression pin)')` → reported (§4) |
| `shelter-address-search` | 13 | **functional DOM id** — `submit-shelter-page.html:172,177` (`for=` / `id="shelter-address-search"`) + 11 test selector strings in `submit-shelter-page.spec.ts` → reported (§4) |
| `shelter-location-input` | 24 | **functional DOM id** — `submit-shelter-page.html:141,146` (`for=` / `id=`), `submit-shelter-page.ts:775` (`document.getElementById('shelter-location-input')?.focus()`), + 21 test selector strings → reported (§4) |
| the other 34 archived names | 0 | — |
| `admin-locale-split` | **0** | verified with explicit path (consistent with FINAL-CLEANUPS §1: zero hits in live source repo-wide) |
| `admin-locale-scope` | **0** | verified with explicit path |
| **comment-line hits, any archived name** | **0** | `rg -w <all 37> frontend/src` filtered to comment lines: empty |

The two surviving id families are the inputs the archived changes
introduced, named after them — live template↔component↔test coupling, not
citations: renaming them would be a behaviour change (out of scope) and they
are string-literal usages (report-only per the instruction).

**Sanity of the re-derivation:** the previous census's seven names
re-measured identically to `SPEC-TITLE-CLEAN` §3's table —
`bilingual-guidance` 27, `site_texts` 22, `bundle-lazy-i18n` 17,
`i18n-et-en` 0, `mobile-responsive-polish` 0,
`shelter-trust-and-reports` 0, `official-dataset-csv` 0 in `frontend/src` —
so the greps demonstrably are not false-zeroing. Those three surviving
unresolvable/comment families are out of this job's scope (they are not
archived change names) and are unchanged, still filed on the note-board by
their owning lanes.

Whole-`frontend/` sweep (excl. node_modules/dist): the only hits outside
`frontend/src` are **documentation records** — `frontend/README.md`,
`frontend/docs/agent/00-README.md`, `01-TASK.md`, `02-CONTEXT-API.md`,
`03-CONTEXT-CORE-AUTH.md`, `04-CONTEXT-ACCOUNT-VERIFY.md`, `05-CONTEXT-MAP.md`,
`06-CONTEXT-SHELTER.md`, `07-STEPS.md`, `frontend/docs/01-frontend-architecture.puml`,
`frontend/docs/out/01-frontend-architecture.svg` (including two
date-prefixed `2026-09-09-frontend-m6-polish-prod` occurrences). Left as-is:
records, the convention of every prior sweep. Listed here so the parent can
route them if it wants a docs pass.

## 4. Reported, not edited

1. **One spec title citing an archived name** — `contributions-panel.spec.ts:113`
   (`map-crisis-actions` regression pin). Same shape as the eleven
   SPEC-TITLE-CLEAN renames (resolvable archive dir
   `2026-09-11-map-crisis-actions`, verified present) but a *test title* —
   report-only per the instruction; the parent can fold it into the next
   title sweep.
2. **Thirty-seven functional id references** (`shelter-address-search` ×13,
   `shelter-location-input` ×24) — template `id`/`for` attributes, one
   `getElementById` in component code, and 32 test selector strings. String
   literals and live DOM identifiers, not comments; editing them would break
   template↔test coupling (a behaviour change).
3. **Docs-record hits** — the `frontend/docs/**` + `frontend/README.md` list
   in §3.

Nothing else survived in any comment in the frontend.

## 5. GATE

Both runs detached (`nohup … ; echo $? > /tmp/…exit`), exit files read; no
Maven invocation (frontend-only lane, no backend file touched).

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0** (`/tmp/finish-fe-ngtest.exit`) — **Test Files 65 passed (65), Tests 1581 passed (1581)** — exactly the stated baseline (log `/tmp/finish-fe-ngtest.log`) |
| `cd frontend && npx ng build` | **exit 0** (`/tmp/finish-fe-ngbuild.exit`) — `Application bundle generation complete` (log `/tmp/finish-fe-ngbuild.log`) |

In-gate and passing: the three 360px regex pins (`map-page.spec.ts`), the
checkbox native-size pin and the spacing-literal guard (`design-tokens.spec.ts`),
and the full 1581-test baseline.

**Concurrent writer in the shared tree (not mine):** `pom.xml` and
`src/main/resources/application.yml` were modified during this run by another
lane — comment cleanups dropping `crisis-guidance` citations from backend
files (consistent with the backend-side of this residue class). My commit
file list below is exact; the parent should stage by file list, not by
directory.

## 6. Unverified

- **Visual check at 360 px** — no browser in this loop; the confirmation is
  mechanism-level (the width-100% rows, the wrap declarations, the stacked
  layout, the untouched regex pins) plus the in-gate suite. A visual pass on
  the map sidebar's result list at 360 px is an owner eye, per
  closing-decisions §11 (visual checks are OWNER).
- The build's 15 per-stylesheet budget warnings (incl. `map-page.scss` at
  7.79 kB / 4 kB budget) — pre-existing warning class, exit 0; verified for
  `map-page.scss` that the compiled CSS size is byte-identical to HEAD, i.e.
  the warning is neither caused by nor affected in substance by this change.
  The other 14 files were not individually diffed against HEAD (my diff
  touches none of them).
- No other lane's frontend work was active in the shared tree during the run
  (`git status` before and after shows my one file plus the two backend
  files above); if a concurrent frontend writer appears, stage by file list.

**Files for the parent's commit (this lane, 1 + this report):**
`frontend/src/app/features/map/map-page.scss` (2 declaration lines + the
3-line role comment), `reviews/code-review/finish-fe.md`.
