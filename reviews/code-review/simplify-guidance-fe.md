# SIMPLIFY-GUIDANCE-FE — report

**Branch:** `code-review` · **Scope:** `frontend/src/app/features/guidance/**` (8 files, 2 412 lines at start)
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` + skills `clean-code`, `code-review`, `web-design-guidelines`
(§1). **Files changed:** the 4 non-spec files + their 2 templates/styles. **Not changed:** the two spec
files (the pinned guards, rule 1) and every file outside the scope.

## 1. What was flattened, split and renamed

### `guidance-list-page.ts` (253 → 256 lines)

| Before                                                                                                                                                                                                                                                                          | After                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onQueryChange` 33 lines: build-`canonical` if/else for page, if/else for size, then a 4-clause `dirty` expression (two of whose clauses were **dead** — `parsePage(null)` is always 1 and `parseSize(null)` always the default, per `shared/paging.ts`), then navigate-or-load | 17 lines: parse, one `if (wasClamped(page) \|\| wasClamped(size))` early return, load. The dead clauses are gone                                                                                                                                                                        |
| —                                                                                                                                                                                                                                                                               | new `wasClamped(raw, effective)` — "a PRESENT raw value that does not round-trip through the shared clamp"                                                                                                                                                                              |
| —                                                                                                                                                                                                                                                                               | new `canonicalUrlParams(params, page, size)` — the rewrite URL: every param the URL carried, page/size replaced by their normalized form (the rewrite branch keeps foreign query params exactly as before)                                                                              |
| —                                                                                                                                                                                                                                                                               | new `viewParams(page, size)` — the view as URL params, defaults omitted. **De-duplicated across three sites:** the old `onQueryChange` canonical block, `onNavigate`'s local `queryParams` builder, and `gotoFirstPage`'s (all three built the same "omit the defaults" object by hand) |
| `onNavigate` 10 lines (own param builder)                                                                                                                                                                                                                                       | 7 lines (calls `viewParams`)                                                                                                                                                                                                                                                            |
| `gotoFirstPage` 6 lines (own param builder)                                                                                                                                                                                                                                     | 5 lines (calls `viewParams(1, size)`)                                                                                                                                                                                                                                                   |
| `load()` success callback: 8 inline state sets                                                                                                                                                                                                                                  | `load()` (32 → 25) delegates to new `applyPage(value, page, size)` — derive last page / out-of-range flag, swap rows, reset the per-load failed-hero set                                                                                                                                |

Class doc 26 → 20 lines: dropped the `01-TASK.md §7` pointer and the
`crisis-guidance`/`guidance-index-paging`/`list-page-paging` planning-section tags; the constraint
content (URL-is-the-view, server-side paging, X-Total-Count, out-of-range ≠ empty, per-list size) is kept.
Signal/field docs trimmed to the constraint (`row` → `card` where the term was stale — the layout is a
card grid).

### `guidance-detail-page.ts` (197 → 199 lines)

| Before                                                                                                                                            | After                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load()` 38 lines: three state resets interleaved with per-line comments, success handler, and a rejection handler containing a nested 404 branch | 25 lines: early return for null slug, `clearStaleState()`, fetch, two thin seq-guarded callbacks                                                                |
| —                                                                                                                                                 | new `clearStaleState()` — drops error/not-found/hero-failed with the _reason_ (a fresh fetch may resolve a previously-404'd slug; it may land a different post) |
| —                                                                                                                                                 | new `settleFailure(failure)` — 404 (unknown **or** draft slug — the same not-found by design) → not-found state; anything else → shared error banner            |

Class doc 24 → 22 lines: dropped `01-TASK.md §7`, `crisis-guidance`, `bilingual-guidance`; the
two-sanitization chain, the same-404-by-design rule and the fallback contract are kept in words.
`fallbackNotice()` doc trimmed (same shape, planning tag out). No renames — the public members
(`slug`, `post`, `heroFailed`, `onHeroImageError`, `fallbackNotice`, `load`) are referenced by the
template and the frozen spec and kept as-is.

### `guidance-list-page.html` (115 → 107) / `guidance-detail-page.html` (89 → 84)

Comment-only. Every element, attribute, binding, i18n key and DOM order is unchanged (verified by diff
and by the guard-regex simulation in §2). What went:

- the 20-line "NO-HERO RULE REVISITED — supersedes the earlier rule…" history block → 9 lines of the
  standing constraint (a hero-less card renders the neutral box; a broken thumbnail takes the same box;
  the grid's alignment comes from the box).
- the detail hero's "(owner report) … The old fixed 4/3 box is gone" history → the standing contract
  (natural size, why there are no width/height attributes, 404 → placeholder, above-fold priority).
- the duplicated alt/srcset comment pairs merged; the `sizes` wording corrected — it is a _declared_
  selection width, not "the card box" (see §5 finding 2).

### `guidance-list-page.scss` (99 → 95) / `guidance-detail-page.scss` (132 → 127)

- **Fixed a broken comment** in `guidance-list-page.scss`: the "empty state … no longer carries
  either's CSS" block was never closed (`/*` … blank line … `/*`), so it swallowed the next comment
  into one malformed comment. It is now a properly closed two-line note.
- History comments cut to constraints: "The old 44rem cap … deliberately REMOVED", "clearly bigger
  than the old 64px row thumbnail", "(owner report: a full-column hero takes too much vertical space)",
  "(owner ruling): float to the left …". The constraint content (why auto-fill, the column arithmetic,
  the ratio-preserving caps, the 24rem cap, the failed-variant frame) is kept.
- **Every declaration is byte-identical** to before; only comment text changed (verified by diff and by
  re-running every pinned regex — §2).

## 2. Pinned behaviours — evidence they still hold

The two spec files are the pins and were **not modified** (`git diff --numstat` shows zero changes to
`*.spec.ts` in the scope). All passed unmodified in the final gate:

| Pinned behaviour                                                               | Specs (passed, unmodified)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?locale=` + default-locale fallback, re-fetch on switch, stale-response guard | list: `locale switch` (2 specs) + `refetches the CURRENT page on a locale switch (no URL change)` (the out-of-range-after-shrink case, in Estonian copy); detail: `locale switch` (2), `locale fallback (bilingual-guidance)` (3 — notice naming the served language, the reader-locale alternate link, no notice when a translation exists)                                                                                                                                                  |
| Hero from the stored asset + `srcset` when derivatives exist                   | list: `renders the hero thumbnail with the stored URL and alt`, `the card thumbnail carries the derivative srcset … (sizes = 400px)`, `a post whose asset has no derivatives renders the plain src only`, `a real non-square hero — landscape AND portrait alike`, `renders a stored /api/media URL verbatim — no query string or cache-buster`, the placeholder + error-handler specs; detail: the whole `hero image` describe (8 specs incl. both srcset cases and the no-width/height pin) |
| 360 px overflow mechanisms (fail if removed)                                   | `no page-level horizontal overflow at 360px` in BOTH specs (4 + 4 specs reading the stylesheets) — plus the cross-cutting `hero-geometry.spec.ts` guard (detail natural size, list fixed 4/3 cover box, app-wide no-stretch-box invariants, compiled-cascade checks)                                                                                                                                                                                                                          |
| Paging contract (URL view, clamp, normalize, out-of-range)                     | list: the whole `paging` describe (8 specs)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Independent verification beyond the gate: I re-ran all **40 pinned regexes/attribute probes** from the
two spec suites plus `hero-geometry.spec.ts` (`ownDeclarations`/`decl`/`imgTag` logic) against the
edited files in a standalone script — all pass (§ gate below includes the real suite run).

Planning-id guard (`SourceVocabularyTest` pattern set, run over my 6 files): **0 hits**. History-comment
sweep (`01-TASK`, `REVISITED`, `supersedes`, `owner report/ruling`, `no longer carries`, …): **0 hits**
in the 6 changed files (the remaining hits are inside the two frozen spec files, which this lane must
not touch).

## 3. Readability standard (clean-code) applied

- **Flat control flow:** `onQueryChange` now has one early return; the detail `load()` rejection
  handler's nested 404 branch became the early-return shape in `settleFailure`.
- **One thing per function:** the three new list-page steps (`wasClamped`, `canonicalUrlParams`,
  `viewParams`) and two detail steps (`clearStaleState`, `settleFailure`) each name their job; the
  biggest method in either file is now `onQueryChange` at 17 lines.
- **Deleted what is dead:** the two unreachable `dirty` clauses; the malformed comment block.
- **Comments state constraints, not history:** all `01-TASK.md §N` pointers, feature-tag names
  (`crisis-guidance`, `bilingual-guidance`, `guidance-index-paging`, `list-page-paging`) and
  "old/new/revisited/owner report" phrasing gone from the 6 files; the surviving comments say _why the
  shape must hold_ (the grid arithmetic, the sanitize chain, the same-404 rule, the clamp policy).
- No new dependencies; no test touched; no shared file touched.

## 4. Web Interface Guidelines audit (fetched fresh per the skill)

Guidelines fetched from the source URL in `docs/skills/web-design-guidelines.md` before the audit.

**`guidance-list-page.html` / `.scss`**

- ✓ `img` has explicit `width`/`height` (400×300, the no-CLS pair), below-fold `loading="lazy"`,
  `decoding="async"`, `srcset` + `sizes`.
- ✓ Alt semantics: stored admin alt, empty decorative alt when null, never the title; placeholder
  spans `aria-hidden="true"`.
- ✓ Semantic markup (`ul/li`, `h1`→`h2`), `<a>` for navigation, hover state on the card link, visible
  focus via the app-global `a:focus-visible` (styles.scss, FE-STYLES lane).
- ✓ Empty and out-of-range states handled explicitly (no broken empty list).
- Finding 1 (not fixed — pinned): card title has no `overflow-wrap`; a long unbreakable word can
  overflow the card box visually at narrow widths. The 360 px guard pins the _mechanisms_ (no
  `nowrap`, `min-width: 0`, container-derived columns) but not this; adding `overflow-wrap: anywhere`
  would change pinned-area styling — left as an owner decision.
- Finding 2 (not fixed — pinned, documented): `sizes="400px"` over-declares the slot: the card box
  actually renders 200–320 px wide (≈248 px in the 4-up desktop grid), so srcset selection can pick a
  larger derivative than strictly needed. It is always ≥ the rendered width, so it never picks a too-
  small one (no blur risk) — a bandwidth-conservative pin. Pinned by both spec suites; the template
  comment now states it as a declared selection width instead of "the card box".

**`guidance-detail-page.html` / `.scss`**

- ✓ Above-the-fold hero: `fetchpriority="high"`, `decoding="async"`.
- ✓ Fallback notice is a `role="note"` with an explicit link (never a silent URL switch).
- Finding 3 (waived by owner, pinned): the detail hero declares NO `width`/`height` attributes, which
  the guidelines' CLS rule would normally require. The repo pins the absence deliberately: the natural
  dimensions are not stored server-side, so a pinned pair would mis-reserve the old 4/3 box and jump on
  load (detail spec + `hero-geometry.spec.ts` assert `hasAttribute('width') === false`). Kept as pinned.
- Both SCSS files: no `transition: all`, no `outline: none`, no `white-space: nowrap` (pinned absent),
  no fixed px box without `object-fit: cover` (the app-wide invariant), all tokens from the design
  system (the two `px`/`rem` values are the documented layout exceptions, already flagged in-file).

## 5. Anchor shifts (rule 6)

**None to record.** `docs/agent/00-CURRENT-STATE.md` contains no citation of any file in
`frontend/src/app/features/guidance/` (grep-verified; every guidance citation in the document points
at backend Java/migration files). Nothing owed to the anchor lane.

## 6. Gate (run rule 2 — detached, exit files read)

| Gate                                       | Baseline (clean HEAD, pre-edit)        | Final (post-edit)                                                                                                                                                                                                         |
| ------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cd frontend && npx ng test --watch=false` | **exit 0** — 1562/1562 tests, 65 files | **exit 0** — 1562/1562 tests, 65 files (same count, none deleted/weakened)                                                                                                                                                |
| `npx ng build`                             | **exit 0**                             | **exit 0** — no budget warning on either of my two SCSS files (the per-component 4 kB warnings in the log are all other features' files: map, admin panels, submit-shelter — present at baseline too, other lanes' scope) |

Evidence: `/tmp/gfe-{test,build}-{base,final}.log` + `.exit` files. `tsc`-level soundness covered by
the test-bundle build; pi-lens diagnostics on all 6 files: the only findings are repo-wide conventions
(extensionless Angular imports), the deliberate `failure: unknown` rejection idiom (decoded at
`bannerMessage`), and the inherited `mis-reserve` vocabulary (also used by the frozen spec).

## 7. Unverified / residual

- **Real-browser rendering** at 360 px / with real images: jsdom has no layout engine, so this lane
  relies on the stylesheet-reading pins (unchanged, passing) plus the diff fact that **zero declaration
  lines changed** in either SCSS file and zero attribute/binding lines changed in either template.
- **srcset derivative selection** with `sizes="400px"` in a real browser (finding 2) — the attribute
  is pinned; the over-declaration is documented, not measured.
- The two frozen spec files still carry planning-doc references (`01-TASK.md §8`, "owner report"
  prose). They match no `SourceVocabularyTest` pattern (0 hits verified) so no guard is red, but if
  the id-sweep convention is extended to frozen specs, these two files join that list.

**Files for the parent's commit** (all uncommitted, per the run rule):
`frontend/src/app/features/guidance/guidance-list-page.ts` (253→256), `guidance-detail-page.ts`
(197→199), `guidance-list-page.html` (115→107), `guidance-detail-page.html` (89→84),
`guidance-list-page.scss` (99→95), `guidance-detail-page.scss` (132→127), this report, and the notes
file.
