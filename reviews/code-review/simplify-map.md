# SIMPLIFY-MAP — `frontend/src/app/features/map/**`

**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md`
**Scope:** `map-page.ts` (951 L), `map-page.html` (442 L), `map-page.scss` (705 L),
`map-page.spec.ts` (2 175 L, **byte-identical**). Nothing outside
`frontend/src/app/features/map/` was modified (verified: `git status` — my six
files only; the other dirty files on the branch belong to other lanes).

---

## 1. What I changed

### 1.1 The 950-line component, split into page + three domain views (the admin pattern)

`map-page.ts` was one class carrying the whole map feature: legend tone
filtering, the anchor search (Nominatim), the geolocation nearest flow, the
marker/list selection, URL sync, load orchestration. I extracted the three
self-contained domains into view classes following the repo's established
admin-lane pattern (page-owned state objects, plain classes with signals, a
`deps` interface, constructed and owned by the page — the same shape as
`admin-page.ts` and its views):

| New file | Owns | Public surface used by the template |
| --- | --- | --- |
| `legend-view.ts` (158 L) | the legend-as-filter domain: tone selection (URL-only via `?tones=`, `replaceUrl` normalization, no localStorage), selection state, keyboard handling | `selectedTones`, `toneSelected`, `toggleTone`, `onToneToggleKey`, `syncFromParams` |
| `anchor-view.ts` (144 L) | the address-search anchor: query text, Nominatim search + debounce-free deliberate-press contract, geocode error mapping, result selection, the straight-line distance | `anchorQuery`, `anchorSearching`, `anchorResults`, `anchorError`, `onQueryChange`, `onSearchKey`, `startSearch`, `select`, `clear`, `errorText`, `distanceTo` |
| `nearest-view.ts` (170 L) | the geolocation nearest flow: locating state, geolocation call, nearest-of-loaded-lists ranking, supersede-on-new-fix, camera focus | `locating`, `nearest`, `nearestKm`, `userPosition`, `nearestEmpty`, `nearestError`, `findNearest`, `supersede` |

The page keeps what a page should keep: DI, the three view instances
(`protected readonly legend/anchor/nearest`), the leaflet service seam, URL
subscription and lifecycle, the browse state (list/selected/open/hasCapacity),
the `sorted`/`showEmpty` computeds, and the cross-domain orchestration the
views can't own alone (`selectAnchorResult` — camera flight + list scroll;
`load` — the gateway call feeding both views). `nearestShelterAt` (pure:
nearest shelter to a lat/lng) is exported from `nearest-view.ts` because the
page's `selectAnchorResult` uses it for the camera flight.

**`map-page.ts`: 951 → 514 lines (−437).** The three views total 472 lines —
the net feature grew 10 lines because each view carries its own header,
imports and deps interface (the pattern's cost), while the component itself
is the 514-line page it is.

**Why this split was legal** (the part that had to be verified first):
`map-page.spec.ts` (2 175 L, 82 tests) is **100 % DOM-driven** — zero direct
`page.<member>(…)` calls (verified: 0 matches; the 39 `page` identifier
occurrences are file-path strings and comments). It imports `MapPage` only
for `createComponent`, drives everything through the rendered DOM
(classes/ids/aria attributes/tab order/text), the router URL, the fake
Leaflet service, and `readFileSync` of the stylesheet (its 360 px guard).
The pinned surface is the rendered contract; the TypeScript internals were
free to restructure. The spec file is byte-identical to HEAD (`git diff`
empty) and its 82 tests pass unmodified (§4).

### 1.2 Comments: history → constraint, in all three non-spec files

The heaviest history-tone comments in the frontend main code were in this
component. Removed/rewritten (guard-legal after — zero planning-id tokens
remain; verified against `SourceVocabularyTest`'s forbidden patterns, which
scan `frontend/src`):

| File:line (old) | Before | After |
| --- | --- | --- |
| `map-page.ts:271` | "through the active locale **(N7 i18n-completeness)**, and the anchor pin…" | the constraint only: the i18n service renders through the active locale; the i18n template guard pins the keys |
| `map-page.ts:563-565` | "keeps the **legacy** single-arg `list(source)` call … (The `reviewed` param is **gone with the review model**; …)" | "the absent filter maps to the bare `list(source)` call — there is no `reviewed` server param to send" |
| `map-page.ts:943` | "through the active locale **(N7 i18n-completeness — a 5xx on the …**)" | the constraint only (error text is i18n-keyed, never spliced) |
| `map-page.scss:452` | "Trust filters (**shelter-trust-and-reports, review model gone**): the…" | "Practical filter chips — 'Open' (client-side) and 'Has capacity' (server-side) — composing with the legend tone filter" |

Everything else was cut to the constraint a reader needs: why the legend
sits out of the map element (the narrow placement), why the triangle
pseudo-element containment exists, why the scroll area is snap-free (with the
measurement that proves it), why the 8 % tint percentages are spec-pinned.
No new history was added: every comment states *what must be true and why
it would break*, not *what changed when*.

### 1.3 The stylesheet: declarations byte-identical, comments trimmed

`map-page.scss` (705 → 707 L; the +2 is prettier re-wrapping two comment
lines). **The declarations are byte-identical with HEAD** (verified:
comments stripped, normalized — exact match). Zero rendered-CSS change,
which is why the build's compiled-CSS budget for this file is identical to
baseline (7.79 kB in both). The 360 px overflow mechanisms (in-flow legend
below 900 px, no top-level width on the legend, `flex-wrap: wrap` +
`min-width: 0` chips, no scroll-snap) are guard-pinned and preserved exactly
— see §3.

### 1.4 The template: rendered DOM byte-identical, member paths through the views

`map-page.html` (442 → 415 L). Only two kinds of line changed: comment
trims, and binding member paths moving through the views
(`toneSelected('registry')` → `legend.toneSelected('registry')`,
`locating()` → `nearest.locating()`, `anchorQuery()` → `anchor.anchorQuery()`,
`anchorDistance(s)` → `anchor.distanceTo(s)`). Verified:
- **tag sequence identical** — 164 tags old and new, first difference is a
  binding expression *inside* an attribute, not a DOM node;
- **normalized text identical** except the same interpolation member paths;
- **all 28 i18n keys unchanged** (the i18n template guard re-parsed both
  versions: exact key-set match);
- the allowed glyph splices (`·`, `:`, `→`) all still present live.

`selectAnchorResult`/`clearAnchor` stay page methods (they orchestrate
page-level camera + list state, not one view).

## 2. The pinned surface (why the extraction is safe)

The full pin catalogue that constrained this lane — none of it touched, all
of it re-verified green:

1. **`map-page.spec.ts` (82 tests) — DOM-only contract.** Rendered legend
   (6 entries, 5 toggle buttons with exact classes/aria-pressed/
   aria-describedby, inert anchor entry), marker classes by verification
   depth, URL-only `?tones=` selection with `replaceUrl`, the reported
   pin red-orange, the 360 px stylesheet guard below, list row structure
   (`data-shelter-id`, badges, details link on selection), anchor search
   (label/input/button/error/results), nearest line (name + `·` address +
   `≈ N m straight line` + the two warning lines), chip toggles, empty/
   loading states.
2. **The spec's 360 px guard (stylesheet text reads).** Re-simulated every
   regex against the new file — all pass: `@media (max-width: 900px) {` →
   first column-0 close contains `.map-legend {` … `  }` with `position:
   static`; base `.map-legend` top-level declarations contain no `width:`
   and the block has no `white-space: nowrap`; `.filter-trust` block has
   `flex-wrap: wrap`; nested `.trust-chip` block has `min-width: 0`; zero
   `scroll-snap-*` anywhere.
3. **`design-tokens.spec.ts`.** The MIXED_PAIRS re-parse (`.badge--source`
   8 % registry mix + `.badge--source.badge--user` 8 % verified mix, with
   matching `color` tokens) — both fills byte-identical; no new color-mix
   backgrounds (still exactly 2). The `balancedBlock` pins: media block
   `flex-direction: column`; base `.map-legend` `position: absolute`;
   `.map-page__layout` `position: relative`; exactly ONE comment-stripped
   `.map-legend {` inside the media containing `position: static` (and not
   the text "legend-swatch"); `.anchor-search__button` with the three token
   declarations. The DOM-move regex
   (`<div #mapEl class="map-page__leaflet"></div></div> … <div
   class="map-legend"`) — the exact sequence is preserved in the template.
4. **`i18n-template-guard.spec.ts`.** All 28 keys in `map-page.html` stay;
   the `·`/`:`/`→` glyph allow-list entries keep their live matches.
5. **`SourceVocabularyTest.java` (backend, scans `frontend/src`).** The
   floors are on file count (≥180) and line count (≥110 000) — my change
   adds 2 net files and 472 net lines, both floors hold. The forbidden
   planning-id patterns: zero hits in the new/changed files (the one old
   `N7` id is gone; the spec's frozen test titles don't hit the patterns
   either — re-checked).
6. **`architecture.spec.ts`.** No map pins (its line ceiling is
   admin-page.ts only).

## 3. Before / after

| File | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `map-page.ts` | 951 | 514 | −437 |
| `map-page.html` | 442 | 415 | −27 |
| `map-page.scss` | 705 | 707 | +2 (prettier comment wraps) |
| `map-page.spec.ts` | 2 175 | 2 175 | 0 (byte-identical) |
| `legend-view.ts` (new) | — | 158 | +158 |
| `anchor-view.ts` (new) | — | 144 | +144 |
| `nearest-view.ts` (new) | — | 170 | +170 |
| **scope total** | **4 273** | **4 283** | **+10** |

The goal was the 950-line component holding the whole map UI: it is now a
514-line page plus three ~150-line domain views, each one a single
testable seam.

## 4. Gate evidence

Detached runs (nohup + exit files), on the final tree (prettier-formatted):

| Gate | Command | Exit | Detail |
| --- | --- | ---: | --- |
| test | `cd frontend && npx ng test --watch=false` | **0** | `Test Files 65 passed (65)`, `Tests 1562 passed (1562)` — exact baseline, no test deleted or weakened |
| build | `cd frontend && npx ng build` | **0** | 15 budget warnings — the same 15 as the pre-change baseline (14 other files + `map-page.scss` at 7.79 kB, byte-identical to baseline since compiled CSS excludes the trimmed comments) |

Baseline for comparison (pre-change tree, same machine): test exit 0
(65/1562), build exit 0 (same 15 warnings).

Pinned-semantics evidence, spec-first:
- **`map-page.spec.ts` (82 tests) — byte-identical, all 82 pass** (also in
  an isolated `--include` run: `82 passed (82)`).
- Full suite 1 562/1 562 — covers `design-tokens.spec.ts`,
  `i18n-template-guard.spec.ts`, `architecture.spec.ts` and every other
  guard that reads the map files.
- Static verification of every stylesheet regex pin (§3 of this report,
  §2 here) — all pass.
- Java vocabulary guard: not run (Maven gate is parent's; the frontend
  half — the pattern scan over `frontend/src` — was simulated over my six
  files: zero forbidden tokens; both file-count and line-count floors hold).

**Board interaction, resolved:** while my rewrite was mid-flight
(`map-page.ts` updated, `map-page.html` still on the old members), the
shared frontend bundle build was broken and the parallel SIMPLIFY-MODELS
lane's gate went red (`TS2339: Property 'toneSelected' does not exist on
type 'MapPage'`). That is an intermediate-state artifact of this lane —
named here and on the board; it cleared the moment the template landed,
and the final gate above ran green on the complete change.

## 5. Web-interface-guidelines audit (current set, fetched per `docs/skills/README.md`)

The skill's instruction is to fetch the live guideline set (done — the
current Vercel web-interface-guidelines command set). I audited it against
the rendered surface of this feature (template + stylesheet — the only
surface a refactor of this kind can affect; my change adds no new rendered
UI). Findings:

| Guideline rule | State in this feature | Action |
| --- | --- | --- |
| Interactive elements need visible `:focus-visible` focus; never `outline: none` without replacement | `.anchor-search__input` has `:focus-visible` outline (2px solid primary); the legend toggle buttons, chips, rows and result buttons inherit the global `.btn`/`.chip` focus treatment; no `outline: none` in the map stylesheet | already compliant — pinned; no change |
| Interactive states increase contrast (hover/active more prominent than rest) | hover rules on legend toggles, anchor results, clear button, CTA (brightness) — all present | already compliant; no change |
| Never colour as the only cue (incl. WCAG 1.4.1) | legend selection = border + fill (shape cue), `aria-pressed` state; reported marker = red-orange **plus** distinct shape; error lines add `font-weight: medium` to the danger colour (stated in the comment as the WCAG 1.4.1 reason) | already compliant; the trimmed comments now state these as constraints, not history |
| Loading states: busy feedback, end with `…` (locale copy) | both async CTAs carry `aria-busy` + disabled while in flight; list shows the shared loading indicator; the copy lives in locale files (out of scope) | already compliant; no change |
| `tabular-nums` for number columns/comparisons | the per-row anchor distance uses the `num-tabular` class (pinned) | already compliant; no change |
| Form inputs: label + meaningful controls | the anchor search input has a real `<label for>` + id + placeholder (pinned) | already compliant; no change |
| Inputs need `autocomplete` | the anchor search input has **no** `autocomplete` attribute | **noted, not acted on** — see §6 |
| Buttons/links need hover states | present on all interactive elements above | already compliant; no change |
| Large arrays `.map()` without virtualization | the shelter list is an unvirtualized 300-row DOM (its scroll behaviour is spec-measured, incl. the snap-free verification with 300 rows) | pre-existing; virtualization would be a behaviour change (rule 1) — out of scope, flagged |

No guideline finding required a code change: the rendered surface already
satisfies every applicable rule (most of it spec-pinned), and behaviour
preservation outranks cosmetic alignment per the lane brief.

## 6. Unverified / out of reach in this lane

- **Real-browser rendering** (actual Leaflet tile/marker painting, real
  geolocation permission flows, real Nominatim): not verified visually.
  The 82 spec tests pin the Leaflet *call* contract (fake service) and the
  rendered DOM; a human pass on a live map would be the remaining check.
- **The `autocomplete` finding** (§5): adding `autocomplete="off"` to the
  anchor search input would be a DOM change against this lane's
  byte-identical-DOM invariant, and a plain address search box is not a
  password-manager trigger in practice. Left for the parent's call; no
  spec breakage either way.
- **The list virtualization observation** (§5): pre-existing, behaviour-
  preserving scope forbids it.
- **Backend gate**: not run — no backend file was touched by this lane.
- **Java `SourceVocabularyTest`**: the pattern-scan half was simulated
  (zero forbidden tokens in the six files; floors hold), but the test
  itself runs under the parent's Maven gate, which the run standard locks
  against lane-local runs.
