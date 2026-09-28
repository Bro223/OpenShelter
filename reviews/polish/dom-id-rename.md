# DOM-ID-RENAME — owner-ruled id rename, submitted shelter form

Lane: DOM-ID-RENAME · branch `polish-work` (HEAD 04affe0; the brief said
`feature/frontend`, but the worktree was moved to `polish-work` by the
parent after my checkout and the owner confirmed: proceed on
`polish-work`). 2026-09-28.

**Scope (owner-ruled, FRONT-NAMES §4.2 "filed, not fixed"):** the two DOM
ids on the submitted-shelter form that carry archived change-directory
names — `shelter-location-input` ×24 and `shelter-address-search` ×13 —
renamed in lockstep across template, production TypeScript and the spec.
Selector-contract change, not a comment sweep: the ids are visible in the
accessibility tree (`<label for>` targets) and in every test selector.

Pure rename: zero behaviour change, zero user-visible string, zero
translation value, zero structural edit, zero reflow (numstat is
+N/−N on all three files — 4/4, 1/1, 32/32).

## 1. Line-level inventory (established before any edit)

Counts are line-level and occurrence-level identical (verified: no line
carries the token twice). Earlier lane counts were file-level; this table
is the line-level truth on the current tree (post FE-GODFILES extraction,
which moved the production selector from `submit-shelter-page.ts:775` to
`:339` and left the template line-count preserving).

| id | file | lines | kind | count |
| --- | --- | --- | --- | --- |
| `shelter-location-input` | `frontend/src/app/features/shelter/submit-shelter-page.html` | 141 | `<label … for="…">` | 1 |
| | | 146 | `id="…"` on the smart location text input | 1 |
| | `frontend/src/app/features/shelter/submit-shelter-page.ts` | 339 | `document.getElementById('…')?.focus()` — blocked-submit focus fallback in `submit()` | 1 |
| | `frontend/src/app/features/shelter/submit-shelter-page.spec.ts` | 272 | `input(el, '…')` inside the `typeLocation()` helper | 1 |
| | | 301 | `pressEnterIn(el, '…')` inside the `fillValidForm()` helper | 1 |
| | | 434 | `element.querySelector('#…')` in the focus-fallback assertion | 1 |
| | | 480, 508, 520, 531, 543, 555, 571, 576, 600, 693, 1481 | `pressEnterIn(element, '…')` in tests | 11 |
| | | 596, 615 | `input(element, '…').disabled` assertions | 2 |
| | | 911, 916, 933, 1265, 1381 | `input(element, '…').value` assertions | 5 |
| **subtotal** | | | | **24** |
| `shelter-address-search` | `frontend/src/app/features/shelter/submit-shelter-page.html` | 172 | `<label … for="…">` | 1 |
| | | 177 | `id="…"` on the address-search text input | 1 |
| | `frontend/src/app/features/shelter/submit-shelter-page.spec.ts` | 278 | `input(el, '…')` inside the `typeAddressSearch()` helper | 1 |
| | | 879, 907, 925, 943, 971, 988, 1007, 1015, 1041, 1080 | `pressEnterIn(element, '…')` in tests | 10 |
| **subtotal** | | | | **13** |
| **total** | 3 files | | | **37** |

Cross-checks: no `.scss` anywhere in `frontend/src` references either id;
no i18n file does; no other `.ts`/`.html` does (`grep -rln` over
`frontend/src` excluding `vendor/` returns exactly the three files above).
The FRONT-NAMES report's "22 spec selector strings" for
`shelter-location-input` was one over: the spec carries 21 (21 + 2 html +
1 ts = 24 — the ×24 total was right, the split was off). Its "35 spec
selector strings" combined is likewise 32 at line level.

Out-of-scope references (historical record — see §4 for the residual
proof): the two archived change directories
`openspec/changes/archive/2026-09-11-shelter-location-input/` and
`…/2026-09-11-shelter-address-search/` (the guard derives its
archived-name refused list FROM these directories — renaming them would
corrupt the guard's basis), their internal citations, other archived
proposals that cite them, agent-context docs, lane reports, and the
stale-decisions fetch snapshot. None of these reference the DOM id as a
selector; they cite the archived change names, which remain resolvable
and legal.

## 2. Replacement names (one-line justification each)

| old | new | justification |
| --- | --- | --- |
| `shelter-location-input` | **`shelter-location`** | The free-text location field of the shelter submit form, named exactly like its siblings `shelter-name` / `shelter-description` / `shelter-capacity` / `shelter-private` — `shelter-<what the field holds>` — and matching the user-visible label (`submit.locationLabel` → "Location"). |
| `shelter-address-search` | **`shelter-address`** | The address field of the same form (Nominatim search input, label `submit.addressLabel` → "Address"), same `shelter-<field>` convention, a consistent pair with `shelter-location`. |

Both names: read as what the element is; follow the form's existing id
convention (all four other form ids are `shelter-<field>`); stable (no
versioning, dates or churn words); collision-free (no existing
`shelter-location`/`shelter-address` token anywhere in `frontend/src`);
guard-clean (whole-kebab-token check: neither equals any archived slug —
verified against all 32 archive dirs — nor any
`NEVER_MADE_CHANGE_NAMES` entry nor any `FORBIDDEN_PATTERNS` id shape in
`SourceVocabularyTest`).

## 3. The rename (atomic, same change)

Mechanics: exact-kebab-token replacement, one pass per token, on the
three files only. `git diff --numstat` = 4/4 (html), 1/1 (ts), 32/32
(spec) — no line added, removed or reflowed. Verified mechanically that
every changed line in the spec is a pure token swap (pairwise
diff: each `+` line equals its `-` line with only the old token
replaced): **all 32 lines pure token swaps, no other assertion touched**.

Resulting references (37, one per line, unchanged line numbers):

- `submit-shelter-page.html:141,146` — `for="shelter-location"` /
  `id="shelter-location"`
- `submit-shelter-page.html:172,177` — `for="shelter-address"` /
  `id="shelter-address"`
- `submit-shelter-page.ts:339` —
  `document.getElementById('shelter-location')?.focus()`
- `submit-shelter-page.spec.ts` — the 32 selector strings of §1
  (21 → `shelter-location`, 11 → `shelter-address`)

## 4. Proof: zero old-name references remain

- `grep -rn 'shelter-location-input\|shelter-address-search'
  frontend/src` (excl. `vendor/`) → **0 hits** (exit 1).
- `frontend/dist` after the gate build: **0 hits** (verified post-build);
  the new ids are present in the rebuilt submit-page lazy chunk.
- Whole-repo residual census (all remaining hits, classified):
  - `openspec/changes/archive/2026-09-11-shelter-{location-input,address-search}/` —
    the archived change directories themselves + internal citations
    (historical record; the guard's archived-name source of truth).
  - `openspec/changes/archive/*/…` — 5 other archived docs citing the
    names as change references (resolvable citations, legal per the
    guard's deliberate-not-forbidden class).
  - `frontend/docs/agent/02-CONTEXT-API.md:62`,
    `frontend/docs/agent/06-CONTEXT-SHELTER.md:25,42,59` — agent-context
    prose citing the archived changes as the capability's origin, not the
    DOM ids as selectors.
  - `docs/autopilot/CODE-REVIEW-NOTES.md`, `reviews/**` — lane reports
    describing this history (this report included).
  - `reviews/stale-decisions/fetches-sd1/**`,
    `context-and-tasks/*` — frozen fetch snapshots / old task context.
  - `frontend/dist/**` — stale until the gate rebuild; clean after.

  No live code, template, style, spec or test references either old name
  anywhere.

## 5. Accessibility associations (the contract, named case by case)

There are no `aria-*` attributes anywhere in the submit template
(grep-verified), so the only id-carrying associations are the two
`<label for>` pairs. Both renamed in the same pass as their targets,
verified to still resolve:

1. **`for="shelter-location"` (html:141) ↔ `id="shelter-location"`
   (html:146)** — the smart location input keeps its label association;
   label click still focuses the field.
2. **`for="shelter-address"` (html:172) ↔ `id="shelter-address"`
   (html:177)** — the address search input keeps its label association.

Plus the two programmatic lookups, both verified to resolve against the
renamed ids:

3. **`document.getElementById('shelter-location')?.focus()`
   (submit-shelter-page.ts:339)** — the blocked-submit keyboard focus
   fallback; target `id="shelter-location"` at html:146. Pinned by the
   spec at line 434
   (`expect(document.activeElement).toBe(element.querySelector('#shelter-location'))`),
   which passes (gate, below).
4. **The spec's `input(el, id)` helper (`#` + id `querySelector`,
   spec:253-259)** — every one of the 32 selector strings goes through
   it; a broken rename would throw `#… not found` on the first helper
   call, so the 1583/1583 green run is itself the resolution proof for
   all 32.

No `aria-labelledby`/`aria-describedby`/`aria-controls` reference either
id (full-file grep: none), so no further association class exists.

## 6. Spec hashes (sha256, before → after)

| spec | before | after |
| --- | --- | --- |
| `submit-shelter-page.spec.ts` | `564774cf08a55af9ff34be1c9f8da073a2accb0a25c43a73705e7f69b7e38da7` | `68d293c7eb3b6a382b019c96b38c3e8de9d6c299cff52fe756edd57d9d1d2e49` |

(The before hash matches the FE-GODFILES lane's recorded HEAD hash for
the same spec — this lane started from their committed state.)
Non-spec touched files, for completeness:

| file | before | after |
| --- | --- | --- |
| `submit-shelter-page.html` | `721de09f2a2da1b7f8c660a899ffbdf25c20c768396e13aa18fad5d44b478973` | `b8cc829af64035274c4ccc79194541b92331709a73185dd443270fe8350bb9b3` |
| `submit-shelter-page.ts` | `3f9c7109c989cfed887cd5d926f9c9af3849bf3a5001e5f6895d3ac7533e2f16` | `742693c0becc47dbfe4e25aac4e2e79afed1b5e3e4d78214eaad99ffd72cf3b8` |

`submit-shelter-page-session.spec.ts` and every other spec: untouched
(no id references; git-status clean for all other paths).

## 7. Gates (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0** —
  **1583/1583 tests, 65 files, baseline exact**.
  Log `/tmp/domrename/test-gate.log`, exit `/tmp/domrename/test-gate.exit`.
- `cd frontend && npx ng build` → **exit 0** (pre-existing SCSS budget
  warnings only — same set as the before-build and every sibling lane)
  — log `/tmp/domrename/build-gate.log`, exit
  `/tmp/domrename/build-gate.exit`.
- **Bundle delta: −32 B total (1,505,631 → 1,505,599 bytes; 35 → 35
  files).** Method: before-build to `/tmp/domrename/dist-before` taken
  from the untouched tree (total 1,505,631 B — the exact post-FE-GODFILES
  total, so the baseline is the current tree), gate build into the
  project's usual `dist`, compared file by file.
  - The ONE substantive content change: the submit page's lazy chunk
    `chunk-hPdkpSDY.js` → `chunk-CvJcgoGP.js`, 29,214 → 29,182 B =
    **exactly −32 B = the five token swaps themselves**
    (`shelter-location-input` ×3 → 3×6 B, `shelter-address-search` ×2 →
    2×7 B; word-level diff of the two chunks shows no other byte
    change).
  - Everything else is size-neutral hash churn: `main-*.js` (its
    lazy-import map now names the new chunk hashes; 229,553 → 229,553),
    8 lazy chunks that import main (their `from"./main-…"` specifier
    changed, 8-char hash names keep the size), `index.html` (main-chunk
    reference, 8069 → 8069), and two minifier single-letter swaps
    (`ct`↔`dt`) inside the submit chunk. 25 files byte-identical by name
    (`cmp`-verified).

## 8. Unverified / handed over

- No backend file touched; no backend gate run (rule: frontend gates
  only).
- The −32 B arithmetic was re-derived two ways (occurrence counts in the
  before-chunk: 3×22→16 and 2×22→15 bytes; word-level diff: `−input` ×3
  + `−search` ×2) — both give 32.
- `docs/agent/00-CURRENT-STATE.md`: FE-GODFILES verified it carries no
  citations to the touched files; the rename is line-count preserving in
  place, so nothing drifts either way. Not edited (rule 5).
- The agent-context docs (`frontend/docs/agent/02-CONTEXT-API.md`,
  `06-CONTEXT-SHELTER.md`) still cite the archived change names in prose
  as the capability's origin — historically correct and resolvable;
  flagged here in case the owner wants the id spellings updated there
  too (doc-lane territory, not a selector reference).
- LSP diagnostics: the ng gate is the decisive check (as in the sibling
  lanes); not separately run.
- **Shared worktree, sibling lane concurrent** (`wrap-closer.md` author,
  active during this lane): uncommitted in the tree while my gates ran —
  `guidance-editor.ts` + `admin-gateway.ts` (comment-only rewordings,
  mtime 23:08:31 — BEFORE my before-build started ~23:10, so both my
  before- and after-builds contain them and they minify away: the
  −32 B attribution is unaffected) and backend guard work
  (`SourceVocabularyTest.java` +187/−33, `FrontendCommentExtractor*`,
  `ApiErrorHandler`/`ContactChangeService`/`Hashes`, and the V26
  migration header — NOT this lane's files, untouched by me). My test
  gate therefore ran on the combined tree; the sibling's FE diff is
  comment-only (diff-verified), so 1583/1583 holds for my change alone.
  If the sibling's extended guard now scans `frontend/src` for
  archived names beyond the documented code exemption, note that this
  lane's residual proof (0 hits in `frontend/src`) already clears the
  surface it would scan.
