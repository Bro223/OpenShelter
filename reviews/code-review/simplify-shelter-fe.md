# SIMPLIFY-SHELTER-FE — readability pass over `frontend/src/app/features/shelter/**`

**Branch:** `code-review` · **Lane scope (exclusive):** the shelter detail page, the
submit/edit page, their components, styles and specs (6 production files, 3 frozen spec
files). No `shared/**`, `core/**`, `styles.scss`, `_admin-shared.scss`, catalogs or other
feature touched. **Date:** 2026-09-24.

---

## 1. Scope files and before/after

| File | Lines before | Lines after | Δ | Comment lines before → after |
|---|---:|---:|---:|---:|
| `shelter-detail-page.ts` | 843 | 808 | −35 | 299 → 255 |
| `submit-shelter-page.ts` | 769 | 771 | +2 | 252 → 237 |
| `shelter-detail-page.html` | 558 | 536 | −22 | — |
| `submit-shelter-page.html` | 272 | 261 | −11 | — |
| `shelter-detail-page.scss` | 486 | 481 | −5 | — |
| `submit-shelter-page.scss` | 296 | 295 | −1 | — |
| **total** | **3 224** | **3 152** | **−72** | |

`submit-shelter-page.ts` is net +2 because the extracted named steps each carry their own
short constraint doc — the net comment count still dropped (252 → 237) and the longest
methods shrank (see §2).

**Frozen and untouched:** `shelter-detail-page.spec.ts` (2 250), `submit-shelter-page.spec.ts`
(1 516), `submit-shelter-page-session.spec.ts` (351) — byte-identical to HEAD
(`git diff --stat` empty for all three).

## 2. What was flattened and split

### `shelter-detail-page.ts`
- **`load()`** (was a 40-line `gateway.get().then(onFulfilled, onRejected)` with the
  fetch-sequence guard duplicated inside both callbacks and three `loading.set(false)`
  call sites) → `async load()` at `:500` with one seq guard per path and two named steps:
  `applyLoadedShelter()` at `:532` (data, then map: ensure instance → fly → pin) and
  `applyLoadFailure()` at `:545` (clear stale success notice → 404: not-found + destroy
  map / other: error banner + keep container, re-create map if a not-found flip killed it).
  The `finally` settles `loading` **only when `seq === this.fetchSeq`** — exactly the old
  rule that a superseded response drops in full, including its loading-state write.
- **`ngOnDestroy()`** (duplicated the two `destroyLocationMap()` statements verbatim) →
  one call to `destroyLocationMap()`.
- Comments: 45-line class doc (puml/task/feature-tag pointers) → 21-line doc stating what
  the page is and the two invariants that matter to a reader (refetch-after-write; map
  lifetime across not-found flips). Every method comment reworded to constraint form —
  "why the guard exists" kept, "what the next line does" history removed. All
  planning/feature references removed: `01-TASK.md §7`, `05-shelter-review-flow.puml`,
  `N7 i18n-completeness`, `INFO-LAST-REPORTED`, `shelter-trust-and-reports`,
  `community-review-queue`, `map-crisis-actions`, `location-navigation`,
  `submitter-verification-badge`, `i18n-et-en`, "design decision 7", "map-browse delta".

### `submit-shelter-page.ts`
- **`ngOnInit()`** edit branch (19-line promise chain `.then/.catch/.finally` with nested
  early returns) → early returns in `ngOnInit()` + named `loadEditRow(id)` at `:375`
  (async/await, 401 → session-expired state, any other failure → banner, `finally`
  settles `editLoading`).
- **`startAddressSearch()`** → guard clauses only; the request chain moved to
  `runAddressSearch(query)` at `:635` (429 → wait copy, else unavailable copy).
- **`submit()`** payload construction (18 lines of object assembly inline) → extracted
  `buildRequest()` at `:713`; `submit()` is now guard → flags → one await → settle.
- **Four duplicated `gen !== this.captureGeneration` checks** (two geolocation callbacks,
  two short-link branches) → named `isCurrentCapture(generation)` at `:512`; the
  superseded-capture rule now has one named home.
- **Template nested ternary** (the submit button's 9-line
  `pending() ? editMode() ? … : … : editMode() ? … : …`) → `submitButtonLabel()` at
  `:339`, same four keys.
- Comments: 40-line class doc (puml/feature tags) → 32-line doc stating the page
  contract (five capture modes → one signal; 201 = public as NEW; 403 → /verify link;
  edit mode = same form, PUT, publishes immediately, NEW status not a gate).
  `design decision 1–5`, `05-shelter-review-flow.puml`, `shelter-location-input`,
  `community-review-queue`, `shelter-editing`, `i18n-et-en` all removed.

### Templates
- `shelter-detail-page.html`: 8 comment blocks reworded to constraint form (planning
  refs out: `community-review-queue`, `shelter-trust-and-reports`, `map-crisis-actions`,
  `location-navigation`, `INFO-LAST-REPORTED`, "owner placement decision", "owner
  overlay fix", "owner decision", the dead "placement pass" notes, and the 12-line
  full-order-of-the-derived-status enumeration — the constraint "NO derived-status row
  here — do not re-add" is kept). DOM verified identical: comment-stripped diff is one
  whitespace-only line between block elements.
- `submit-shelter-page.html`: same treatment + the nested ternary replaced by
  `{{ submitButtonLabel() }}` (rendered text unchanged for all four states).

### Styles
- Both `.scss` files: comments reworded only. **Compiled declarations byte-identical**
  (verified: `git show HEAD:<file>` vs current, block comments stripped, `diff` empty for
  both). The pinned 360px-mechanism blocks (`.pulse-gauges__arrows`, `.pulse-gauges`,
  `.pulse-gauges__captions`, `.pulse-gauges__hint`, `.recent-reports`) kept their
  structure; re-ran every spec regex against the final files — all 13 assertions still
  match (verified with the exact spec patterns, §3).

**No renames** of any public/protected member, template binding, i18n key, DOM class or
id: the frozen specs are DOM/i18n/fake-driven and pin all of them (`page.reporting()` is
the only direct component access, `:1449` of the detail spec). New names added are the
five private/protected steps above — all names that state what the step is.

## 3. Evidence the pinned behaviours hold

All three spec files ran **unmodified** in the final gate (§6): 1562/1562 across 65
files, exit 0. The pinned mechanisms and their specs:

- **Trust ladder (verification depth by shape + colour)** — detail spec `reading
  (public)` (badge tests `:282-551`, incl. NEW yellow / CONFIRMED green / registry fills,
  the `badge--submitter` neutral chip, unverified warning, inaccurate warning, private
  badge/note) + the SCSS `.badge--submitter` block kept byte-identical.
- **Report flows + dampening notices** — detail spec `trust layer` describe (`:927-1498`):
  three negative types only, detail field per factual type, 409 server-message fallback,
  damped vs plain success notice, band/open-status pickers with optimistic pressed state
  and revert-on-failure, latest-wins refetch.
- **360px overflow mechanisms** — detail spec mechanism tests (`:1624-1824`): arrows
  wrapping row + 240px cap, captions normal-flow column, wbr break opportunities,
  height-bounded scrolling log. All 13 SCSS regex assertions re-verified against the
  final file before the gate.
- **Edit path ownership + 403/404/401 order** — submit spec edit-mode tests
  (`:1263-1515`: prefill from /mine only, not-owned/malformed → not-found, failed /mine
  → banner, **401 → session-expired state with no form and no map**, 403 on save →
  banner + /verify + input preserved) and the full-stack session spec (2 tests: refresh
  dies → /login?session=expired + no dead map; refresh recovers → form + live map).
  `loadEditRow` preserves the exact state-transition order (loading → missing /
  sessionExpired / banner → loading false).
- **Info rows (last reported status/capacity)** — detail spec `info section` describe
  (`:2099-2250`): exactly two rows, newest-of-kind rule, empty states, `<time>` in the
  active UI locale, no derived-status row. The info-request *display* itself lives in
  `features/account/contributions-panel.*` + `features/admin/shelters-panel.*` — outside
  this scope (no `infoRequest` reference exists in the six shelter files).
- **Map lifecycle (detail + submit)** — destroy on not-found flip, re-create on found
  re-render, destroy on page leave; edit-mode late-mounted map creation (session spec).
  `load()` restructuring keeps the seq-guarded settlement order (verified by line-level
  code diff, §2).

Code-level verification beyond the suites: `tsc --noEmit` exit 0; comment-stripped
template diff shows only the intended `submitButtonLabel()` substitution;
comment-stripped SCSS diff empty for both stylesheets; code-stripped .ts diff shows
exactly the five restructures and no other code line.

## 4. Web-interface-guidelines findings (fetched fresh from the source URL)

Format: `file:line`, terse. **None were fixed** — the lane is behaviour-preserving and
every finding below is either pinned by a frozen spec, an app-wide convention, or a
feature addition; they are filed in the notes file for the parent.

- `submit-shelter-page.html:256` — submit button `disabled` while the request is in
  flight (guideline: stay enabled + spinner). App-wide convention, pinned by the submit
  spec's loading-state test — cannot change without editing a frozen spec.
- `submit-shelter-page.html:202` (address-results `<ul>`) — async search results have no
  `aria-live` region; a screen reader will not hear "no results" or the result list
  arrive. Small fix (one attribute), filed not applied to keep the lane
  behaviour-neutral.
- `submit-shelter-page.html:138` (`.submit-map`) — the map click/drag pick has no
  keyboard alternative. The other four capture modes (typed, link, geolocation, address
  search) are keyboard-reachable, so the map is the only pointer-only path to the same
  data — noted as a genuine a11y gap, out of scope to fix here.
- `submit-shelter-page.html` placeholders — `e.g. …` convention (catalog keys
  `submit.*Placeholder`, `core/i18n/en.ts:349-371`): they give example patterns (good)
  but don't end with `…` as the guideline prescribes. Catalog is the i18n lane's files.
- Both pages — `prefers-reduced-motion`: no animation exists in either page's own styles
  (no transitions at all); the map fly-to animation lives in the page-scoped
  `LeafletService` (shared lane) — no finding on my files.
- Pass: labels + `for` on every control, radio rows label-wrapped, `autocomplete="off"`
  on the non-auth text inputs, `type=number` + min/max/step on capacity, Enter-key
  handlers on the two capture inputs, `role="status"`/`role="alert"` on the async
  distance lines and duplicate-report line, `aria-busy` on the distance button, `aria-pressed`
  on the radio-style pickers, `aria-label` on the brand-only navigate links, semantic
  `<button>`/`<a>`/`<dl>`/`<fieldset>` throughout, no `transition: all`, no `outline:
  none`, `tabular-nums` on all coordinate/count figures, 360px overflow mechanisms
  present and spec-pinned.

## 5. Anchor shifts

**None owed.** `docs/agent/00-CURRENT-STATE.md` cites no file under
`frontend/src/app/features/shelter/**` (grep-verified for `features/shelter`,
`shelter-detail-page`, `submit-shelter-page`, `frontend/src/app` — the nearest
citations are `shared/`, `core/`, `map/`, `admin/` files, all foreign lanes).

## 6. Gates (detached, exit files read)

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0** — 65 files / **1562 tests passed (1562)**, 0 failed (log `/tmp/shelterfe-test.log`, exit file `/tmp/shelterfe-test.exit`) — exactly the 1562/65 baseline |
| `cd frontend && npx ng build` | **exit 0** (log `/tmp/shelterfe-build.log`, exit file `/tmp/shelterfe-build.exit`) |
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |

Build budget warnings: 15, including two on my files (`shelter-detail-page.scss` 5.46 kB,
`submit-shelter-page.scss` 4.38 kB vs the 4 kB style budget) — **pre-existing, not
caused by this lane**: both stylesheets' compiled declarations are byte-identical to HEAD
(comment-only diff, SCSS comments are stripped at compile) and the same warnings were
already recorded by other lanes' notes (e.g. SIMPLIFY-GUIDANCE-FE). The remaining 13
warnings are foreign files (admin/**, map/**).

Foreign failures: **none** — both gates green on this tree.

## 7. Unverified / residual

- The 360px layout is verified by the specs' mechanism-assertion idiom (jsdom cannot
  measure viewports) — unchanged from before; nothing new to verify.
- `ng build` output was not opened in a browser this lane; the suite covers the DOM
  state, the build covers the bundle.
- The four guidelines findings in §4 remain open by design (filed in the notes file).
- No new files created; nothing to delete. No dependency added. No test deleted or
  weakened.
