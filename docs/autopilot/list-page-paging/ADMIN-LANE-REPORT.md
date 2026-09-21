# Admin lane report — list-page-paging

Lane `N11-ADMIN-FEATURES`, spec: `docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md`.
Working tree only — **no commits made** (per the lane instructions).

## What was built

### 1. Admin guidance search (server-side)

`GET /admin/guidance` accepts `q`: a case-insensitive substring over the
**content locale's** title and tag-stripped body (a post matches only in the
locale where the words appear — an `et` search never hits the `en` translation
of the same post, and vice versa). `q` composes with `locale`. HTML tags are
stripped before matching, so `q=<p>` finds nothing. The search is
**submit-based** in the UI (Enter or the Search button — never per-keystroke),
the term is URL-backed (`q`), and a submit or an explicit Clear resets the
page to 1 (a new filter has its own page 1). An empty result for a non-empty
search shows a distinct no-match state (naming the term and the locale) —
never the "no posts yet" state.

- Backend spec: `AdminGuidanceSearchPagingIT` (case-insensitivity, locale
  scoping, tag-stripping, blank/absent `q` = no filter).
- Frontend specs: `admin-page.spec.ts` → "guidance search: submit writes q to
  the URL, resets the page to 1; clear removes it (namespaced paging params)";
  `guidance-order-list.spec.ts` → the two empty-state tests (no-match vs
  no-posts-yet).

### 2. Admin guidance paging + size selector

`GET /admin/guidance` accepts `limit` (1..200) / `offset` (>= 0) and answers
with the `X-Total-Count` response header = the filtered scope's length
**without** paging applied (always present; past-the-end answers an empty
array). The Guidance tab uses the shared `<app-pagination>` control with
**namespaced** URL params `guidancePage` / `guidanceSize` (never bare
`page`/`size` — the admin tabs share one route). Size flips that would strand
the current page past the last one clamp to the last page at the new size, so
a size change never lands on a dead page. An out-of-range `guidancePage`
(linked URL, deleted rows) renders a notice + "Show the first page" action,
never a bare empty table.

**Manual-order interaction rule:** the full-list order PUT is all-rows-by-
nature, so reordering (drag + move buttons) is offered only while the whole
scope fits one page (`total <= size`). On a multi-page scope the move buttons
render disabled, the rows are not draggable, and the hint points at the size
selector (max 100) instead of the order hint.

- Backend specs: `AdminGuidanceSearchPagingIT` (absent params answer the whole
  stored order with the total header; pages tile the stored manual order
  without overlap or skips; search + paging compose), `GuidanceServiceTest`
  (unit: matchesSearch / searchableBody / slice).
- Frontend specs: `admin-page.spec.ts` → "guidance size change clamps the
  stranded page", "guidance out-of-range page: the notice + first-page
  action", "guidance manual order is offered only while the whole scope fits
  one page"; `guidance-order-list.spec.ts` → the "paged scope" describe
  (multi-page disables DnD + buttons + flips the hint; single-page keeps the
  order hint).

### 3. Shelters-tab source filter chips

The Shelters tab toolbar has All / Registry / Community chips, URL-backed via
`source` (a link or refresh keeps the filter). `source` semantics on
`GET /admin/shelters` changed from exact source (`PAASETEAMET` /
`MUNICIPALITY` / `USER`) to the **public-list grouping**: `REGISTRY`
(Päästeamet + municipality imports) | `USER` (user submissions) | `ALL`. The
chip composes with the existing search (AND on the server) and starts at page
1. The All chip removes the param (omitted from the URL).

- Backend spec: `AdminModerationIT` (source filter + paging tests).
- Frontend spec: `admin-page.spec.ts` → "shelters source chips are URL-backed
  and compose with the search (AND); the search resets the page".

### 4. Shelter-list pagination (owner-requested, beyond the spec)

The spec deferred shelter paging ("revisit if it grows"); the owner explicitly
asked for it, so it is implemented. `GET /admin/shelters` accepts `limit`
(1..200) / `offset` (>= 0) and answers `X-Total-Count` = the filtered scope's
length without paging. The Shelters tab uses the shared control with
namespaced `shelterPage` / `shelterSize` URL params and the same out-of-range
guard. The tab's search stays **tab-local** (the pre-existing `FormControl`,
submit-based, not URL-backed) — it predates this lane and a second `q` on the
shared route would collide with the guidance search; the term composes with
the chip server-side.

Key decision: the **unconfirmed-queue tab is untouched** — it loads the full
un-paged list in `ngOnInit` via a separate load, so paginating the Shelters
tab cannot hollow out the review queue.

- Backend specs: `AdminModerationIT` (paging test: limit/offset slice the
  filtered list, the header is the un-paged count, past-the-end = empty).
- Frontend specs: `admin-page.spec.ts` → the chip test above (includes page
  2 + search reset), "shelters out-of-range page: the notice + first-page
  action (the total is from the header)"; `admin-gateway.spec.ts` →
  `listShelters` tests rewritten for the paged contract (bare path, fixed
  param order with page params last, `q` encoding/empty-skip, the total read
  from the header, fallback to the page length when the header is absent,
  403 → ApiError).

### 5. Select-style fix — verified

The stylesheet split (commit `fc92e3f`) dropped two rules; both are verified
present in the current tree (`frontend/src/app/features/admin/admin-page.scss`):

1. **`.admin-tab--active { border-color: transparent }`** (line 29) — the
   active tab is a ghost button painted with the primary fill; without the
   transparent border the ghost border rims the fill. This was the wrong
   rule: it is the one that made the active tab look wrong.
2. **`.admin-guidance-language select { … }` + `__hint`** (lines 257-282) —
   the app's 48px input idiom for the content-language selector.

The pre-extraction tokens the original rules used no longer exist; the
restored version (commit `d247007`) names the current equivalents:
`--radius` → `--radius-md`, `--color-surface` → `--color-bg-surface`.

## Bugs the new specs caught (fixed in this lane)

1. **Guidance search submit never re-loaded**: the submit handler stored the
   term in an in-memory signal but never wrote `q` to the URL — no URL
   change, no query emission, no reload. Fixed by passing `q` into
   `navigateGuidance`; the URL emission is what re-loads.
2. **Shelters search submit on page 1 was a no-op**: the reset navigates to
   the same URL (the term is tab-local, page was already 1) and the router
   emits nothing for a same-URL navigation. Fixed: when `shelterPage() === 1`
   the handler loads directly; otherwise the page-reset navigation does the
   work.
3. (IT hygiene) `adminListIds(null)` passes a *null array* through Java
   varargs — NPE; the "no params" call is `adminListIds()`.

## Test / build output

- Backend — `flock /tmp/openshelter-mvn.lock mvn -q test`:
  **`MVN_EXIT=0`**, surefire aggregate **`tests=1139 failures=0 errors=0
  skipped=0`** (incl. `AdminGuidanceSearchPagingIT` 9/9,
  `AdminModerationIT` 20/20).
- Frontend — `npx ng test --watch=false`:
  **`Test Files 59 passed (59)` / `Tests 1395 passed (1395)`**
  (admin-page.spec.ts: 97 tests, incl. 6 new paged-view-state tests;
  guidance-order-list.spec.ts +4; admin-gateway.spec.ts +1).
- Build — `npx ng build`: **exit 0**, `Output location:
  …/frontend/dist/frontend` (only the pre-existing per-file SCSS budget
  warnings; `admin-page.scss` is among the 7 files over the 4 kB style budget
  — warning tier, not an error).
- OpenAPI — `docs/api/openapi.json` regenerated
  (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`); `OpenApiContractIT`
  passes inside the green run. Working-tree diff: `GET /admin/shelters` gains
  `limit` / `offset` params + the `X-Total-Count` header, `source` enum →
  `REGISTRY` / `USER` / `ALL`, descriptions updated. (The guidance endpoint's
  params/header were already in the committed snapshot.)

## Files

Uncommitted delta (20 modified + 1 new): backend `AdminController.java`,
`AdminModerationService.java`, `ShelterQueryService.java`; ITs
`AdminModerationIT.java`, `GuidanceServiceTest.java`, new
`AdminGuidanceSearchPagingIT.java`; `docs/api/openapi.json`; frontend i18n
(`messages.ts`, `en.ts`, `et.ts`, `ru.ts` — 15 keys each catalog),
`models.ts` (`AdminShelterFilters.source: ShelterSourceFilter` + limit/offset,
new `PagedRows<T>`), `gateways/admin-gateway.ts` (+ its spec),
`features/admin/admin-page.{ts,html,scss,spec.ts}`,
`features/admin/guidance-order-list.{ts,html,spec.ts}`.

The guidance endpoint's `q`/`limit`/`offset`/`X-Total-Count` and the style
restoration already landed in HEAD (`197ae58`, `d247007`) before this
session's final state; this lane's delta is the shelters side, the source
filter, the ITs, all frontend work, and the snapshot regeneration.

## Not done / notes

- Nothing from the required list is outstanding.
- No commits (the lane must not commit); the dev server was not restarted.
- Untouched, per the spec: the public `/blog` page, `features/guidance/**`,
  the shared `Pagination` public API (only used, not modified), vendored
  files, migrations.
- The admin tabs share one route; URL state per tab: guidance
  `q`/`guidancePage`/`guidanceSize`, shelters `source`/`shelterPage`/
  `shelterSize`; defaults (page 1, size 20, no term) are omitted from the URL.
  The shelters search term is deliberately the only list state that is
  not URL-backed (tab-local, pre-dates the lane).
