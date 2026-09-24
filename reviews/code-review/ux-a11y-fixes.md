# UX-A11Y-FIXES — fix report (code-review branch, frontend)

Lane: `UX-A11Y-FIXES`. Scope: the a11y findings already filed in
`reviews/code-review/simplify-shelter-fe.md`, `simplify-account-fe.md`,
`simplify-map.md`, `simplify-shared.md`, `simplify-guidance-fe.md`.
Nothing committed; no `.git` writes; `docs/` untouched (anchor shifts go to
`CODE-REVIEW-NOTES.md`). Every fix is proven red-then-green; the detached
frontend gate passed.

## Fixes (file:line, purpose)

### 1. Address-results region is a persistent live region
`simplify-shelter-fe.md` finding #1.

- `frontend/src/app/features/shelter/submit-shelter-page.html:206` — the
  `@if`-driven results `<ul>` and error `<p>` block now sits inside a
  **persistent** `<div role="status">` (rendered from page load, before any
  search). Screen readers only announce content changes inside a region
  that already exists, so the result list AND the "no results" notice are
  both announced now (previously the region was created on the same change
  as its content — never announced). The non-`no-results` error keeps its
  nested `role="alert"` (the assertive rate-limit copy) inside the polite
  status region.

### 2. Keyboard path for the map pick
`simplify-shelter-fe.md` finding #2. **Decision: an explicit
"Use map center" button, not a keydown handler on the map.**

- `frontend/src/app/shared/leaflet-service.ts:219-233` — new
  `mapCenter(): [number, number] | null` (the current map center; null
  before `create` / after `destroy`). Shared file, shared-lane-owned —
  additive method only, no behavior touched (anchor shift recorded in
  CODE-REVIEW-NOTES.md).
- `frontend/src/app/features/shelter/submit-shelter-page.html:245-248` —
  new `<button type="button" (click)="useMapCenter()">` next to "Use my
  location" in `.location-actions`.
- `frontend/src/app/features/shelter/submit-shelter-page.ts:566-580` —
  `useMapCenter()`: supersedes any pending capture (same
  `captureGeneration++` as every other capture), then the single shared
  writer `setLocation(lat, lng, 'map-pick', false, false)` — the exact
  state write of the pointer pick, minus the `flyTo` (the point is already
  centered) and minus the swap toggle (no double-click event exists).
- i18n: `frontend/src/app/core/i18n/messages.ts:511`,
  `en.ts:380` "Use map center", `et.ts:385` "Kasuta kaardi
  keskpunkti", `ru.ts:396` "Центр карты".

Why a button (recorded per the parent task): the pointer interaction is
click + **drag** (double-click zooms). Leaflet's keyboard support — arrow
keys pan, +/− zoom, on the focusable map container — can express panning
and zooming but has no keyboard equivalent of a drag: no way to move the
pin freely and confirm it. Panning to a place and confirming "use this
center" is the keyboard user's pick flow; a keydown handler could only
add an undocumented, collision-prone gesture on top of Leaflet's own
keys. The button is a normal tab stop (no `tabindex`/`role`/`aria-label`
shims), works with pointer and touch, is announced with its own localized
label, and lands on the same shared location state, so all downstream
consumers (declaration check, swap button, form) are untouched.

### 3. `spellcheck="false"` on code inputs
`simplify-account-fe.md` finding #4 (+ shared file).

- `frontend/src/app/features/account/account-page.html:191`
  (`#change-email-code`), `:303` (`#change-phone-code`) — the two filed
  inputs; `:406` (`#delete-confirm`) — the same class of non-word literal
  ("DELETE"), fixed with them for consistency.
- `frontend/src/app/features/account/verify-page.html:38` (`#verify-code`)
  — the filed input.
- `frontend/src/app/features/auth/reset-page.html:67` (`#reset-code`) —
  not filed by a lane, but the identical 6-digit-code input class with
  `autocomplete="one-time-code"` + `inputmode="numeric"` already present;
  fixed so the code-input class is uniform.

### 4. Focus first invalid field on blocked submit
`simplify-shared.md` finding #4. **Shared helper disclosed:**
`frontend/src/app/shared/form-helpers.ts:40-62` —
`focusFirstInvalidField(form, fields: [controlKey, domId][])`: walks the
page's fields in visual order, focuses the first invalid control's input,
returns whether it focused anything (pages with a page-managed field that
has no control — the /submit location — decide the fallback).

Applied to the cheap, consistent public submit flows:

- `frontend/src/app/features/auth/login-page.ts:60-64` — contact →
  password.
- `frontend/src/app/features/auth/register-page.ts:69-74` — name → email
  → phone → password.
- `frontend/src/app/features/auth/reset-page.ts:116` (request: email) and
  `:171-181` (confirm: code → password → repeat; when only the
  password-again mismatch blocks — both passwords filled, so no control
  is invalid — focus lands on the repeat field, the field the inline
  error points at).
- `frontend/src/app/features/shelter/submit-shelter-page.ts:766-774` —
  name → capacity; when the form controls are valid but no location was
  picked, focus goes to the location capture input (the page-managed
  field that actually blocks the submit).

Deliberately NOT applied (recorded per the parent task): the account/
verify button-driven flows (they already land focus on their primary
action button after every success — same pattern as login/register, and
their errors are banner-level, not field-level) and the admin
guidance-editor (ngSubmit form; admin surface, out of the public-flow
scope).

### 5. `autocomplete="off"` on the anchor search
`simplify-map.md` finding #1.

- `frontend/src/app/features/map/map-page.html:167` — `#anchor-search-input`.
  `off` (not `new-address`): the field is a free-text query over the
  geocoder's own results, not the user's own address — the /submit
  address-search input (the repo convention, `submit-shelter-page.html:138`)
  uses the same value.

### 6. `overflow-wrap` on the guidance card title
`simplify-guidance-fe.md` finding #4 (pinned 360 px region).

- `frontend/src/app/features/guidance/guidance-list-page.scss:74` —
  `overflow-wrap: anywhere` on `.guidance-post__title`. `min-width: 0`
  alone cannot break a word with no break opportunity; with the
  declaration, a long unbreakable word wraps inside the card instead of
  stretching the track and the 360 px layout. The guidance-detail title
  (the same finding's second instance) is in a full-width, non-scroll
  layout where the word stretches the page, not a pinned 360 px region —
  the filed scope was the card list; the detail title left as-is.

### 7. Hero `sizes` over-declaration
`simplify-guidance-fe.md` finding #5. **Left unchanged, per the parent
task ("change only if the slot can be measured").**

- `guidance-list-page.html:16` `sizes="(max-width: 640px) 400px, 1fr"` and
  `guidance-detail-page.html:14` `sizes="(max-width: 640px) 704px, 1fr"`
  are pinned by `guidance-hero-geometry.spec.ts:18-19` ("hero sizes
  values are pinned to the measured layout") — i.e. the values ARE the
  measured slot, and the spec asserts the exact strings. The "over-
  declaration" claim is unproven without a different measured value to
  compare against, and changing either string breaks the geometry pin.
  No change; flagged here so the parent can re-adjudicate.

## Red → green proof

Red (new specs only, production untouched) — `/tmp/ux-a11y-red.log`,
`/tmp/ux-a11y-red.exit`:

```
Test Files  8 failed (8)
     Tests  18 failed | 274 passed (292)
EXIT=1
```

All 18 new tests failed for the right reasons (button/region absent,
no focus move, attribute absent); all 274 pre-existing tests in those
files passed, so the red is exactly the new behavior and nothing else.

Green — `/tmp/ux-a11y-green-targeted2.log`,
`/tmp/ux-a11y-green-targeted2.exit`:

```
Test Files  8 passed (8)
     Tests  292 passed (292)
EXIT=0
```

New spec locations (red-then-green, each asserting the DOM attribute or
behavior):

- `submit-shelter-page.spec.ts` — "the address results + error region is
  a persistent live region — present before any search"; "the 'no
  results' notice lands inside the live region (a screen reader hears
  it)"; "the map pick is reachable without a pointer: 'Use map center'
  places the pin at the map center" (drives a real `map.getCenter()`
  value into the fake and asserts the shared `pick` state, the hint
  text, the `locating()` flag, and that no `flyTo` fired); three focus-
  first-invalid-field tests (name / capacity / location-capture-input
  fallback).
- `login-page.spec.ts` (2), `register-page.spec.ts` (2),
  `reset-page.spec.ts` (4 — request email, confirm code, confirm repeat
  on mismatch, reset-code spellcheck).
- `account-page.spec.ts` — "code-style inputs disable spellcheck (the
  6-digit codes + the typed DELETE literal)";
  `verify-page.spec.ts` — "the channel code input disables spellcheck".
- `map-page.spec.ts` — "the anchor search input opts out of the
  autocomplete heuristics (the /submit address-search convention)".
- `guidance-list-page.spec.ts` — SCSS pin "the card title wraps long
  unbreakable words (overflow-wrap)" inside the pinned 360 px describe.

## Detached frontend gate (run rule 2)

`cd frontend && npx ng test --watch=false` → **exit 0**
(`/tmp/ux-a11y-gate-test.exit`; 65 files, **1580/1580 tests** — the
1562 baseline + the 18 new). `npx ng build` → **exit 0**
(`/tmp/ux-a11y-gate-build.exit`). Build emits three pre-existing SCSS
budget warnings (admin users/audit panels 4.09 kB, submit-shelter-page
4.38 kB — the latter is the shelter lane's committed 295-line scss
growth, not this lane; the file is not in this lane's diff); warnings
do not fail the build.

## Not fixed / left as found (with reason)

- Hero `sizes` (finding #7 above) — pinned to the measured layout; no
  provable better value; parent to re-adjudicate.
- `submit.*Placeholder` keys not ending in `…` (shelter lane's
  placeholder convention) — catalog wording, not an a11y barrier; not in
  the filed list; left for the parent.
- Submit button not disabled while the submit is in-flight (shelter
  lane) — its disabled-while-pending spec is frozen evidence; changing
  the behavior is a product decision beyond this lane's filed findings.
- `verify-page.html:52` plain `aria-label` on a `<ul>` (account lane,
  "harmless") — attribute removal with no a11y gain; left as-is.
- Account/verify focus-on-blocked-submit and admin guidance-editor
  focus — see §4 "deliberately not applied".
- `guidance-detail-page` title `overflow-wrap` — not the pinned 360 px
  card region; see §6.

## Unverified / parent follow-ups

- **Anchor shifts** recorded in `CODE-REVIEW-NOTES.md`: the
  `leaflet-service.ts:274,285,317,327,338` citations in
  `docs/agent/00-CURRENT-STATE.md` are now `288,299,331,341,352`
  (+14, the `mapCenter()` block). `DocumentationFactsTest` (backend
  guard) validates those anchors against the code and cannot be re-run
  here (detached backend gate is the parent's).
- Screen-reader announcement of the `role="status"` region is asserted
  structurally (region present before the content change) — actual
  NVDA/VoiceOver/VTalk announcement timing not exercised (no AT in the
  gate).
- Keyboard panning of the Leaflet map itself (arrow keys on the focused
  map) is Leaflet's built-in behavior, verified by code inspection of the
  pinned Leaflet 1.9.4 container options, not by a test.
- i18n: the new `submit.useMapCenter` key is asserted by the pre-existing
  i18n parity/template-guard/catalog-identity specs (all green in the
  full gate).
