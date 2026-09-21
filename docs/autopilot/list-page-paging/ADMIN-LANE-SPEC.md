# Admin list controls — follow-up lane spec (search + size selector + source filter)

Status: **SPEC ONLY — not implemented.** Owner requirement folded into the
`list-page-paging` / `guidance-index-paging` work: the admin area gets the
same list ergonomics the public `/blog` index received, as **ONE lane
carrying three features together** (they share the admin tab, the shared
`Pagination` component, and the same URL-parameter discipline — building
each in isolation would re-open the same tabs three times).

The implementing lane owns `features/admin/**` and the admin templates; this
spec is the executable contract. It must NOT touch the public `/blog`
page, `features/guidance/**`, or the shared component's public API without
a breaking justification.

## What already exists (do not rebuild)

| Piece | State |
|---|---|
| Shared `Pagination` component (`frontend/src/app/shared/pagination.ts`) | Built by the paging lane: `page`/`pages`/`size`/`sizes`/`sizeLabelKey` inputs, `onNavigate({page, size})` output. Renders nothing at `pages < 2`. Translated via `pagination.*` keys (en/et/ru already in place). |
| `GuidanceService.slice(rows, offset, limit)` | Static, tested; nulls = no paging, offset past end = empty page (never an error). The public `GET /api/guidance` already uses it. |
| `GET /api/guidance?limit&offset` + `X-Total-Count` | Public precedent the admin endpoint mirrors (limit 1..200, offset >= 0, header always present = the un-paged length). |
| `GET /admin/shelters?status&source&q` | **Backend already supports the source filter** (`ShelterSource` enum: registry vs community/user) and `q` — the shelters-tab gap is UI-only (chips). |
| `GET /admin/guidance?locale=` | Locale-scoped admin list, drafts included, stored manual order (`sortOrder` asc). **No `q`, no paging** — both are this lane's work. |
| Admin guidance manual order | Drag-and-drop rows + per-row move buttons; reorder persists via the full-list order endpoint. |

## Feature 1 — Admin guidance search (`q`)

Backend (`AdminGuidanceController.list` + `GuidanceService`):

- Add `@RequestParam(required = false) String q` to `GET /admin/guidance`.
- **Search what you see**: when `locale` is present, `q` matches the
  scoped locale's content (the same title/body the list renders); when
  `locale` is absent, it matches ANY of the post's locale content
  (any translation row's title or body, or the home columns).
- Matching: **case-insensitive substring** against
  - `title` (the locale's title, or home title when the post's home is
    the locale),
  - `body` — **tags stripped** (strip all HTML tags, collapse
    whitespace, then match) so `<p>hello</p>` matches "hello" and a
    search for markup is not a feature.
- No ranking, no fuzzy matching — a plain filter over the existing
  manual-order list. Order of the results is UNCHANGED (the stored
  manual order), so search and reorder never fight over sorting.
- Blank `q` (present but empty/whitespace) = no filter (do not 400 —
  the public `q`-less behavior; over-long `q` > 200 chars = 400 with
  the uniform admin vocabulary, mirroring the locale bound).
- OpenAPI: document `q` on the path; regenerate `docs/api/openapi.json`
  with `flock /tmp/openshelter-mvn.lock mvn -Dopenapi.update=true
  -Dtest=OpenApiSnapshotIT test`. The path+method inventory is
  UNCHANGED (a query parameter only), so `OpenApiContractIT` stays green.

Frontend (`features/admin/**` — this lane's files):

- Search input above the guidance table, translated placeholder
  (`admin.guidance.search.placeholder` key, en/et/ru) + a submit
  button. **Submit-based, NOT per-keystroke** (an admin list is tens of
  rows; every keystroke re-filtering + re-paging is churn without
  value). Enter in the input and the button both submit.
- Submitting writes `q` to the admin tab's query params and
  **resets the page to 1** (a new filter has its own page 1; keeping the
  old page number would often land out-of-range).
- Clearing the input (or an explicit clear) removes `q` and resets page 1.
- Empty result for a non-empty `q` shows a translated "no posts match"
  state (NOT the "no posts yet" empty state — they mean different
  things), with the search term in the copy.

Tests: controller IT (case-insensitivity, tag-stripped body match,
locale scoping of the match, blank-q = no filter, over-long q = 400,
order unchanged), service-level unit for the strip/match helper,
frontend spec for the reset-to-page-1-on-search behavior.

## Feature 2 — Admin guidance list: size selector + paging

Backend (`GET /admin/guidance`):

- Add optional `limit` (1..200) and `offset` (>= 0), validated with the
  SAME bounds vocabulary as `GET /api/guidance` ("limit must be between
  1 and 200" / "offset must be non-negative").
- Apply `GuidanceService.slice(rows, offset, limit)` to the (already
  search-filtered) manual-order list; return `ResponseEntity<
  List<AdminGuidancePostDto>>` with the **always-present
  `X-Total-Count`** header = the filter length WITHOUT paging
  (search applied, paging not). Body shape unchanged.
- The endpoint's 1..200 bound fully honours the offered 10..100 range —
  the control never offers a size the backend would refuse.

Frontend:

- Reuse the shared `Pagination` (size selector 10..100 step 10, default
  20, rendered only at 2+ pages, prev/next + "Page X of Y").
- **Namespaced URL params** — the admin tabs share one route, so the
  params are `guidancePage` / `guidanceSize` (never bare `page`/`size`,
  which belong to the public page and would collide if the admin shell
  ever hosts another paged list). Defaults omitted (page 1, size 20).
- Same honest states as the public page: out-of-range page = translated
  notice + first-page action (the total is known from the header),
  empty scope = the existing empty states (locale-scoped vs unscoped
  copy already exist).
- **Manual order x pagination — the interaction rule:**
  - The drag-and-drop reorder (and the full-list order PUT) is
    ALL-ROWS-by-NATURE. It stays enabled **only when the whole current
    scope fits one page** (`total <= size`).
  - When paged across multiple pages, DnD is disabled with a translated
    hint pointing at the size selector ("set the page size to 100 to
    reorder" — the max size; a scope larger than 100 rows is not a real
    admin state today, and if it ever is, the order PUT gains paging in
    its own change).
  - The per-row move up/down buttons work on the VISIBLE page only and
    are disabled on the first/last row of the page (a move across a
    page boundary is exactly the case DnD-when-single-page covers).
- Size change that would strand the current page clamps to the last page
  at the new size (the `Pagination` host contract, same as the public
  page).

Tests: controller IT (paging tiles the manual order, slice after
search, header = filter length, bounds 400s, un-paged default
unchanged), frontend spec (namespaced params, reset-to-page-1-on-search
composing with paging, DnD disabled multi-page / enabled single-page,
move-button boundary disabling).

## Feature 3 — Admin shelters tab: source filter (UI only)

- The backend (`GET /admin/shelters?source=`) already exists — **no
  backend change**.
- UI: a filter chip group above the shelters table — `All / Registry /
  Community` (translated `admin.shelters.source.*` keys; the registry
  value is `Päästeamet` registry + municipality imports, the community
  value is user submissions — use the existing vocabulary already used
  in the `source` column of the table).
- Selecting a chip writes `source` to the tab's query params (so a link
  or refresh keeps the filter), re-fetches, and composes with the
  existing `status` filter and the existing `q` search (AND).
- The shelters tab is NOT paginated in this lane (it is a working queue
  with the status filter, not an unbounded index — revisit if it grows
  past a screen; the shared `Pagination` makes that a small follow-up).

## Shared contract for all three

- i18n: every new string in `messages.ts` + `en.ts` + `et.ts` + `ru.ts`
  in one batch; the `i18n-template-guard` and the catalog-parity tests
  must pass (they are the enforcement).
- URL is the state: every control (search, page, size, source) lives in
  the route query; no component-local hidden state for view parameters.
- No client-side fake pagination: the server slices; `X-Total-Count`
  drives the page count.
- Keyboard: chips are real buttons, search is a real input, the size
  selector is a native `<select>` (all via the shared component where it
  exists).
- Verification: `flock /tmp/openshelter-mvn.lock mvn -q test` (backend,
  with the OpenAPI snapshot regenerated), `npx ng test --watch=false` +
  `npx ng build` (frontend).
