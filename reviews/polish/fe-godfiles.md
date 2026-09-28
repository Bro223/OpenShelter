# FE-GODFILES — frontend god-file sweep

Lane: FE-GODFILES · branch `polish-work` (cut from `feature/frontend` tip 41cc03a) · 2026-09-28

Task: find the frontend's remaining oversized files (non-vendor, non-spec production),
measure each (lines + what the length consists of), judge seams, extract only where the
seam is real — following the established pattern (page-owned state object with a narrow
typed accessor; specs untouched; behaviour-preserving; no reflow).

## 1. Measured census

Non-vendor, non-spec production files ≥ 395 lines (composition: total | code | comment | blank):

| File | Lines | Composition | What the length is |
| --- |---| --- |---|
| `core/i18n/messages.ts` | 1541 | 957 / 536 / 48 | i18n key contract + per-locale docs (tokens) |
| `features/admin/guidance-editor.ts` | 1428 | 744 / 608 / 76 | editor component — see seam verdict |
| `core/i18n/ru.ts` | 1314 | 1128 / 139 / 47 | translation dictionary (tokens) |
| `core/i18n/et.ts` | 1254 | 1110 / 97 / 47 | translation dictionary (tokens) |
| `core/i18n/en.ts` | 1253 | 1111 / 95 / 47 | translation dictionary (tokens) |
| `core/models.ts` | 1230 | 430 / 719 / 81 | DTO/API contracts (tokens + 58% docs) |
| `styles.scss` | 931 | 380 / 472 / 79 | global stylesheet (styles/tokens) |
| `features/admin/guidance-view.ts` | 931 | 519 / 373 / 39 | **already** an extracted page-owned state object |
| `features/admin/admin-page.ts` | 872 | 517 / 312 / 43 | admin page — under its 903 ceiling |
| `features/shelter/shelter-detail-page.ts` | 808 | 500 / 255 / 53 | detail page — see seam verdict |
| `features/shelter/submit-shelter-page.ts` | 805 | 502 / 249 / 54 | submit page — **seam real, extracted** |
| `gateways/admin-gateway.ts` | 624 | 251 / 331 / 42 | gateway — see seam verdict |
| `features/admin/shelters-view.ts` | 612 | 365 / 211 / 36 | **already** an extracted page-owned state object |
| `features/shelter/shelter-detail-page.html` | 536 | 524 markup | markup |
| `shared/shelter-copy.ts` | 531 | 263 / 236 / 32 | pure function module — see seam verdict |
| `features/map/map-page.scss` | 690 | 384 / 233 / 73 | stylesheet |
| `features/map/map-page.ts` | 525 | 285 / 216 / 24 | map page — see seam verdict |
| `features/account/account-page.ts` | 511 | 342 / 131 / 38 | account page — see seam verdict |
| `features/shelter/shelter-detail-page.scss` | 481 | 320 / 100 / 61 | stylesheet |
| `shared/page-shell.scss` | 450 | 242 / 163 / 45 | stylesheet |
| `features/account/account-page.html` | 442 | 419 markup | markup |
| `features/admin/shelters-panel.html` | 435 | 433 markup | markup |
| `shared/location-input.ts` | 408 | 235 / 142 / 31 | pure shared helper (below the 400 line line in practice) |
| `features/map/map-page.html` | 397 | 387 markup | markup |

Nothing else ≥ 395. Vendor (`frontend/src/vendor/**`) and all spec files are out of scope
per the lane brief.

## 2. Seam verdicts

**REAL — extracted: `submit-shelter-page.ts` → `location-capture-view.ts` (new, 540 L).**
The location-capture cluster is a self-contained state object: 11 signals/fields
(`location`, `locationText`, `locationError`, `resolvingLink`, `locating`,
`addressQuery`, `searching`, `addressResults`, `addressError`, `captureGeneration`,
`mapAlive`) plus the stale-response capture-generation guard; five capture modes
(smart input, geolocation, short link, address search, mini-map pick incl. the
`useMapCenter` keyboard path); the address-search request; the mini-map lifecycle
(`wireMap`/`ensureMap`/`destroyMap`); the `afterEveryRender` pick re-arm; and the
module-level error-kind/key maps + link helpers. The spec (`submit-shelter-page.spec.ts`)
pins only `page.form` (×1) and is otherwise DOM-driven; the location section of that
spec reaches everything through the template, and `submit-shelter-page-session.spec.ts`
asserts only component presence. Same shape as the split-admin-page pattern: the page
owns the object, reaches it through narrow typed accessors, the spec is untouched.

**REJECTED (spec-pinned, rule 1):**
- `guidance-editor.ts` (1428): the spec pins 20+ members by direct access
  (`form` ×27, `lastSave` ×62, `onSave` ×44, `quill` ×3, `selectHero` ×2, `cancelled`,
  `uploading`, `error`, …) AND imports the module-level validators/constants
  (`VALID_NAME`/`VALID_URL`/`VALID_CONTENT` + the validator functions). Moving any
  substantive unit breaks the spec or forces re-export shims (seam rot, per
  `reviews/polish/seams-unfreeze.md`).
- `shelter-detail-page.ts` (808): the spec pins `page.reporting()` (L1449) — the
  trust-layer slice is pinned; the picker-only slice would scatter the trust layer
  across two files (the media-tab rejection rationale) and rewrite bindings inside
  markup the UX lane just restructured (25a6b9a, 1252 changed lines).
- `account-page.ts` (511): 20 members / 101 spec accesses pinned.

**REJECTED (no real seam):**
- `map-page.ts` (525): largest section is `load()` (55 L, page core — no own state,
  no handlers to move); the alerts tab is ~25 L (ceremony). No cohesive unit worth a
  state object.
- `admin-gateway.ts` (624): the spec drives the class directly via DI (TestBed +
  mocked `ApiClient`); a split breaks the spec or needs a facade (seam rot). The
  page-owned state-object pattern does not apply to a gateway. 53% of the length is
  doc comments on one documented HTTP surface — not a god file.
- `shelter-copy.ts` (531): pure function module; the spec imports the functions
  directly. Splitting = re-export shim or spec edit.
- `shelters-view.ts` (612) / `guidance-view.ts` (931): already products of the
  established pattern (extracted page-owned state objects). Splitting an
  already-extracted view would fragment it.
- `admin-page.ts` (872): under its ceiling (903); the ceiling note itself states no
  state-object seam remains; the URL normalizer was judged page-level by design.

**FINE AS MEASURED (tokens / styles / markup — reported, not touched):**
`models.ts`, `messages.ts`, `en/et/ru.ts` (i18n catalogs), `styles.scss`,
`map-page.scss`, `shelter-detail-page.scss`, `page-shell.scss`,
`shelter-detail-page.html`, `account-page.html`, `shelters-panel.html`, `map-page.html`.

## 3. The extraction — before/after

| File | Before | After |
| --- |---| --- |
| `submit-shelter-page.ts` | 805 | **369** (218 code / 129 comment / 22 blank) |
| `location-capture-view.ts` (new) | — | **540** (327 / 174 / 39) |
| `submit-shelter-page.html` | 275 | **275** (line-count preserving; ~25 bindings re-prefixed `capture.` in place) |

Shape (established pattern):

- `LocationCaptureView` — plain (non-component) class, constructed by the page in a
  field initializer inside the page's injection context (so the view's
  `afterEveryRender` re-arm runs there, as before).
- Deps record: `{ geo, geocode, leaflet, i18n, mapEl }` — `mapEl` is the page's
  `viewChild` signal passed in (a viewChild can only live on the component).
- Page-side accessors (narrow, typed): `location()` (payload + prefill guard),
  `locationText()` (prefill), `applySavedLocation(lat, lng)` (edit prefill —
  replaces the old `private setLocation`), `markMissingLocation()` (submit-time
  error), `wireMap()`/`destroyMap()` (from the page's view hooks); template bindings
  reach the rest directly (`capture.useMyLocation()`, `capture.addressResults()`, …)
  exactly as they reached the page before.
- Behaviour preserved verbatim: same bindings (only the receiver changed), same
  event wiring, same i18n keys (only their `MessageKey` map constants moved files),
  same fetch sequencing, the capture-generation stale-response guard moved intact
  inside the view, single-writer `setLocation` discipline (now private in the view),
  same `#mapEl` ownership, no user-visible string changes.

## 4. Ceilings

- The only size ceiling in the tree is `ADMIN_PAGE_MAX_LINES = 903`
  (`architecture.spec.ts:90`, applies to `admin-page.ts` only). No other per-file
  size guard exists (grep-verified), so the new 540 L file trips nothing.
- This lane lowered no ceiling, so rule 3 is N/A. Observation for the owner:
  `admin-page.ts` sits at 872 of 903 — the 31-line slack is the owner's own
  prettier re-wrap (deliberate 901→903 raise in 41cc03a); left as-is.

## 5. Anchor shifts (deltas) — recorded on the notes board

`docs/agent/00-CURRENT-STATE.md` carries **no** citations to the touched files
(grep-verified) — DocumentationFactsTest unaffected. The template is line-count
preserving, so all `.html` citations stay valid. Drifted `.ts` citations (notes-board
open decisions), old → new:

| Old | New |
| --- |---|
| `submit-shelter-page.ts:559` (geolocation options literal, SIMPLIFY-SHARED) | `location-capture-view.ts:382` (`useMyLocation` block view:342-384) |
| `submit-shelter-page.ts:566-580` (`useMapCenter()`, UX-A11Y-FIXES) | `location-capture-view.ts:394-402` |
| `submit-shelter-page.ts:766` (focus fallback in `submit()`, UX-A11Y-FIXES) | `submit-shelter-page.ts:339` |
| `submit-shelter-page.ts:775` (`document.getElementById`, FRONT-NAMES) | `submit-shelter-page.ts:339` |
| `submit-shelter-page.html:141,146,172,177` / `:206` / `:245-248` | **unchanged** (line-count preserving) |

Entry appended to `docs/autopilot/CODE-REVIEW-NOTES.md` (FE-GODFILES, 2 rows).
`00-CURRENT-STATE.md` not edited (rule 5).

## 6. Gate

- `cd frontend && npx ng test --watch=false` → **exit 0**, 1583/1583 tests, 65 spec
  files (baseline count held). First run exited 1 on a type error in the new file
  (TS2322: `viewChild` yields `Signal<… | undefined>`, deps declared `| null`) —
  fixed type-only, re-run green.
- `cd frontend && npx ng build` → **exit 0** (pre-existing scss budget warnings
  untouched and unrelated).
- Bundle delta: **+728 B total** (1,504,903 → 1,505,631 bytes across dist). Exactly
  ONE chunk changed — the submit page's lazy chunk, 28,467 → 29,195 B (all other
  chunks size-identical; chunk-hash churn only). Method: temporarily reverted this
  lane's 3 files (restoration verified byte-identical via `cmp`), built to a separate
  output dir, compared. Attribution is clean: the concurrently-uncommitted FE changes
  of the sibling guard-wiring lane are comment-only (diff-verified in
  `leaflet-service.ts`, `paging.ts`, `admin-tab.ts`, `admin-gateway.ts`) and
  minify away.

## 7. Specs byte-identical

This lane made **zero spec edits** (git-status verified: no spec file in this lane's
change set; the spec files that appear modified in the shared worktree belong to the
sibling guard-wiring lane). SHA-256 of the specs that drive the touched page, at HEAD:

| Spec | SHA-256 |
| --- |---|
| `submit-shelter-page.spec.ts` | `564774cf08a55af9ff34be1c9f8da073a2accb0a25c43a73705e7f69b7e38da7` |
| `submit-shelter-page-session.spec.ts` | `e8fa2fec6df85bb1c3d2333dae771e71a0ad49cf440d82f09ec6e8b16ff09441` |
| `architecture.spec.ts` | `f809696f0453b359139a9d6b83c127fb5aaa911883bad5c8d7a0902c790eb3b3` |

## 8. Unverified / caveats

- **Shared worktree**: the gate ran with the sibling guard-wiring lane's uncommitted
  changes present (their FE diff verified comment-only, zero API impact on my files).
  If the parent re-runs gates after their lane commits, the counts are expected to
  hold (1583 includes their spec rewordings already).
- **Prettier**: the owner reflows — the new `location-capture-view.ts` and the slimmed
  page are pre-reflow (369/540 are pre-reflow measurements).
- **LSP diagnostics** were inconclusive in this environment (push-only server);
  the ng gate is the decisive check and it is green.
- Pre-existing working-tree changes from the seams-unfreeze lane
  (`shelters-view.ts`, `unconfirmed-view.ts`, comment-only) are not this lane's and
  were left untouched.
- No commits made (parent commits).
