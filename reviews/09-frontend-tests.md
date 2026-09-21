# Agent 9 — Frontend tests (Angular suite)

Repository root: `/home/aleks/MyScripts/LocalRepos/OpenShelter`
Scope: `frontend/**` tests only (`frontend/src/app/**/*.spec.ts`, 59 files).
Read-only review; no repository file was modified. Scratch experiments ran on a
throwaway copy under `/tmp` (deleted afterwards).

## Detected stack (from `frontend/package.json`, `frontend/angular.json`)

| Item | Version / setting | Evidence |
| --- | --- | --- |
| Angular | 22.1.x (standalone, zoneless) | `frontend/package.json` deps `@angular/*: ^22.1.0` |
| Test runner | **Vitest 4.0.8** via `@angular/build:unit-test` (no Karma/Jasmine) | `package.json` devDeps `vitest: ^4.0.8`; `angular.json` `architect.test.builder` |
| DOM env | jsdom 28 (`--browsers` unset) | `package.json` devDeps `jsdom: ^28.0.0` |
| TypeScript | ~6.0.2, `strict`; spec program `tsconfig.spec.json` (`types: ["vitest/globals"]`) | `frontend/tsconfig*.json` |
| Spec bootstrap | `src/test-setup.ts` (in-memory `localStorage`, `et`/`ru` locale data, jsdom `Range` rect shim) | `angular.json` → `test.options.setupFiles` |
| E2E layer | **none** (no Cypress/Playwright/Puppeteer dependency or config; documented deferral) | repo-wide search; `frontend/README.md`, root `README.md` Deferrals |

## Suite executed

`cd frontend && npx ng test` (output redirected to `/tmp/final-run.log`; no repository file changed):

```text
Test Files  59 passed (59)
     Tests  1397 passed (1397)
EXIT=0                      # run at 22:31 EEST
```

The same suite reported **1395 tests / 59 files** at 22:14 EEST (matching the
brief and the lane report). The two extra tests come from a *concurrent writer*:
while this review ran, `frontend/src/app/shared/{page-shell.scss,page-shell.spec.ts,
consent-banner.component.scss,consent-banner.component.spec.ts,error-copy.ts}` and
the i18n catalogs were modified (mtimes 22:26–22:30 EEST). Every file my findings
depend on was last written *before* this session (`admin-page.ts` 19:33,
`admin-gateway.ts` 18:59, `admin-gateway.spec.ts` 19:37, `design-tokens.spec.ts`
17:18, `guidance-editor.spec.ts` 03:01, `guidance-translations.ts` 17:15,
`guidance-detail-page.spec.ts` 17:10), i.e. they were stable throughout, and the
tree is green at the revision above.

---

## Confirmation of the earlier sweeps' claims (confirmed / corrected)

| Earlier claim | Verdict | Evidence |
| --- | --- | --- |
| Every component/service/store/guard/interceptor/pipe/gateway has a spec | **Corrected** | Whole-repo decorated-class scan: `GuidanceTranslations` (`features/admin/guidance-translations.ts:23-29`) is referenced by **no** spec identifier — the only such class — while its three siblings have specs. See F5. |
| Zero "should create" tests | Confirmed | `grep -rn "should create" src --include=*.spec.ts` → 0; spot-checked specs assert behaviour (e.g. `pagination.spec.ts:44` "renders NOTHING at one page") |
| Zero assertion-free tests | Confirmed | 1065 `it(`/`test(` blocks scanned by paren matching; every non-`each` body contains `expect(` |
| No `.only` / `.skip` / `xit` / `fakeAsync` | Confirmed | one grep for `\.(only\|skip)\(`, `xit(`, `xdescribe(`, `test.todo`, `fakeAsync`, `waitForAsync` → 0 hits |
| Guards driven through a real Router | Confirmed | `core/guards.spec.ts:39-60` `provideRouter([...canActivate: [authGuard]])` + `router.navigateByUrl`; `features/admin/admin-page.spec.ts:494-498` uses the real `adminGuard` |
| `HttpTestingController` + `verify()` used correctly | Confirmed | `core/api-client.spec.ts:24`, `core/api-interceptor.spec.ts:52` `afterEach(httpMock.verify())`; `api-client.spec.ts:94` covers the new `getWithHeaders` header seam |
| Forms / error states / 401-403-409-429 copy covered | Confirmed | `shared/error-copy.spec.ts` is a table-driven exhaustive status×surface map (429 at `:36-42`, 401 anti-enumeration at `:44-80`) |
| Per-test isolation of `localStorage` / `isSecureContext` / `geolocation` | Confirmed | `map-page.spec.ts:257`, `submit-shelter-page.spec.ts:178` re-stub per test; `localStorage.clear()` in 10 specs incl. all storage readers |
| Two design-token layout guards could pass while the behaviour was gone (fixed) | **Partly corrected** | The two named regexes now use brace-balanced extraction (`design-tokens.spec.ts:75-111` `balancedBlock`/`withoutCssComments`, tests at `:762-773` and `:774-816`). **A third first-match scan in the same guard was not fixed** and still passes while a `<td>` declares a `display` — see F2. |
| i18n template guard widened to all templates with a completeness pin | Confirmed | `core/i18n/i18n-template-guard.spec.ts:41-57` walks `src/app`; `EXPECTED_TEMPLATES` (`:65-93`) lists all **26** `.html` files (`find src/app -name '*.html' \| wc -l` → 26) and the equality is asserted (`:146`); allow-lists carry a staleness test (`:200-238`). Only the doc comment is stale ("23 files", `:61`) — see F8. |
| No e2e layer (documented deferral) | Confirmed | no Cypress/Playwright dependency or config |
| Earlier Low findings still open: `app.spec.ts` uses a real `HttpClient`; `app.config.ts` never exercised; the page-scoped `LeafletService` provider removed in all three page specs; `shared/geolocation.ts` has no direct spec | Confirmed, all still true | `app.spec.ts:14-24` `provideHttpClient()` (no testing backend); no spec references `appConfig`; `map-page.spec.ts:284`, `shelter-detail-page.spec.ts:198`, `submit-shelter-page.spec.ts:205`; zero spec files reference `shared/geolocation` |
| The lazy catalogs made locale switches asynchronous — any spec left asserting translated copy without awaiting the catalog? | **Essentially clean** | All switch sites that assert catalog copy await `ensureCatalog` (e.g. `page-shell.spec.ts:875-882`, `login-page.spec.ts:282-283`, `title.spec.ts:57-59`, `map-page.spec.ts:1836-1838`, `admin-page.spec.ts:1669-1670`). Two sites rely on the implicit macrotask inside `settle()` instead — see F7. |

---

## Findings

Severity is the brief's scale; P0/P1/P2 is the merge gate (P0 blocks).

### F1 — Medium (P1) — the whole page-param normalization added by the lane has zero tests; deleting it keeps the suite green

- **Where (code):** `frontend/src/app/features/admin/admin-page.ts:564-607`
  (`onQueryChange` → `normalizeListParams`), and the three module-private helpers it
  rests on: `parseListPage` (`:2042-2045`), `parseListSize` (`:2049-2056`),
  `parseSourceFilter` (`:2061-2063`).
- **Where (tests):** none. `grep -rn "parseListPage\|parseListSize\|parseSourceFilter\|normalizeListParams" src/app --include=*.spec.ts` → **0 hits**.
- **What is wrong:** the lane's out-of-domain handling — a non-numeric / `0` /
  off-step `guidancePage`/`guidanceSize`/`shelterPage`/`shelterSize` is clamped to
  the nearest legal value, the URL is rewritten in place (`replaceUrl: true`,
  `:602-607`) and the one-time re-emission loads once — is exercised by no spec.
  The two paging specs that touch "bad" URLs (`admin-page.spec.ts:2968-2986`,
  `:3048-3062`) use values that are already legal in-domain (`guidancePage=9`,
  `shelterPage=4 with shelterSize=10`), so they take the *in-range* path only.
- **Proof (mutation, `/tmp` copy of the tree):** replacing the body of
  `normalizeListParams` with `return false;` (no clamping, no URL normalization)
  leaves the **entire suite green: 59 files / 1395 tests passed**. Nothing in the
  suite notices the feature is gone.
- **Proof (probe, `/tmp` copy):** navigating to
  `/admin?source=BOGUS&shelterSize=15&shelterPage=abc` yields `router.url ===
  '/admin?source=BOGUS'` — i.e. the page/size normalization *works today* (both
  params are dropped, the request would use the 20/0 default), which is exactly why
  no test notices when it is removed.
- **Why it matters:** this is the guard that keeps the size `<select>` and the URL
  from disagreeing (the code comment at `:577-579` states that contract). If the
  clamp regresses, a linked/stale URL renders a control whose value matches no
  option and a list sliced with a size the control does not show — silently, with a
  green suite. Note also the sub-case the same probe exposes: `source=BOGUS` is
  sanitized for the *request* but left in the URL, contradicting the comment at
  `:2058-2060` ("the URL normalizes before it can reach a link").
- **Suggested fix (small):** add 4-6 cases to the existing `'AdminPage paged list
  view state'` describe — `guidanceSize=15`→ URL param dropped, request `limit: 20`;
  `guidanceSize=999`→ `guidanceSize=100`; `shelterPage=abc`/`0` → dropped, `offset: 0`;
  `source=BOGUS` → decide (normalize to "no param" or keep) and pin the decision.

### F2 — Medium (P1) — the `<td>`-class guard in `design-tokens.spec.ts` still takes the FIRST match only and silently skips a class it cannot find

- **Where:** `frontend/src/app/design-tokens.spec.ts:826-834`
  ```ts
  for (const c of tdClasses) {
    const block = adminScss.match(new RegExp(`\\.${c} \\{[\\s\\S]*?\\n\\}`));
    if (!block) continue;
    expect(block[0], `.${c} is carried by a <td>; a display declaration there demotes the cell …`)
      .not.toMatch(/display\s*:/);
  }
  ```
- **What is wrong:** `String.match` returns the **first** occurrence only, and the
  scan is not brace-balanced (unlike the `balancedBlock` helper introduced two
  tests above). A `display` declared for the same class in any *later* rule (a
  `@media` override, a more specific selector) is invisible; and when no top-level
  rule matches at all, `continue` makes "unchecked" indistinguishable from "clean".
- **Proof (mutation, `/tmp` copy):** appending
  ```scss
  @media (max-width: 900px) { .admin-cell--name { display: flex; } }
  ```
  to `frontend/src/app/features/admin/_admin-shared.scss` — i.e. exactly the defect
  the guard's own comment describes ("a flex td … splits the row line into
  staggered segments", owner-reported) — leaves `design-tokens.spec.ts`
  **107/107 green**.
- **Why it matters:** this is the fourth instance of the class the brief names
  (a guard that passes while the behaviour is gone). The two instances the earlier
  sweep found were fixed by adopting `balancedBlock`; this call site was left on the
  old idiom, so the row-separator regression the lane just repaired
  (`frontend/src/app/features/admin/_admin-shared.scss:36-78`) is still not really
  guarded at narrow widths.
- **Suggested fix (small):** reuse the file's own `balancedBlock`; iterate **every**
  occurrence of the class (`while` over `matchAll`, or extract all blocks via brace
  balancing) and assert none declares a `display`; replace the silent
  `if (!block) continue` with a failure ("expected a top-level rule for
  `.admin-cell--x`, none found") so an unstyled/renamed class cannot slip through.

### F3 — Low (P2) — the vendor-asset wiring for the editor theme is unpinned: deleting the `assets` entry leaves the built app unstyled and the suite green

- **Where (guard):** `frontend/src/app/features/admin/guidance-editor.spec.ts:1266-1277`
  reads `angular.json` and asserts only `…architect.build.options.**styles**` is
  quill-free. The companion test (`:1279-1310`) asserts the injected link's `href`
  equals `SNOW_THEME_HREF` (the app's own constant) and that the *vendored bytes*
  contain the bullet rule.
- **Where (unpinned):** `frontend/angular.json:32-36` is the entry that actually
  copies the file to that URL (`{glob: "**/dist/quill.snow.css", input:
  "src/vendor/quill", output: "/vendor/quill"}` → `/vendor/quill/2.0.3/dist/quill.snow.css`,
  `SNOW_THEME_HREF` at `guidance-editor.ts:60`).
- **Proof (mutation, `/tmp` copy):** removing that one asset entry leaves
  `guidance-editor.spec.ts` **71/71 green** (jsdom creates the `<link>` element
  regardless of whether the URL resolves).
- **Why it matters:** the guard's stated purpose is "the stylesheet must ride in the
  lazy admin chunk"; the file it points at can be absent from the build (404 in dev
  and production) — the editor then renders with no toolbar icons and Quill's
  numbered list markers — with a green suite.
- **Suggested fix (XS):** extend the existing pin to
  `config.projects['frontend'].architect.build.options.assets` (assert the quill
  glob/input/output triple), or assert
  `readdirSync`-style that the built `dist` contains `vendor/quill/2.0.3/dist/quill.snow.css`.

### F4 — Low (P2) — `AdminGateway.listGuidancePostsPage` (the lane's new paged guidance call) has no gateway-level test, while its shelters twin has five

- **Where:** `frontend/src/app/gateways/admin-gateway.ts:267-275`
  (`listGuidancePostsPage`), `:539-556` (`guidanceListPagePath` — fixed param order
  `locale, q, limit, offset`, only set fields emitted) and `:561-568`
  (`pagedResult` — `X-Total-Count` → `total`, falling back to the page length).
- **Evidence:** `grep -c listGuidancePostsPage frontend/src/app/gateways/admin-gateway.spec.ts`
  → **0**; the sibling `listShelters` has 11 references / 5 tests covering exactly
  this contract (bare path, fixed order with page params last, `q` encoding and
  empty-skip, header → total, absent-header fallback, 403 → `ApiError`,
  `admin-gateway.spec.ts:60-118`). The public paged guidance path *is* covered
  (`guidance-gateway.spec.ts:178`), so the admin copy is the only untested one.
- **Why it matters:** the admin page specs call the **fake** gateway
  (`admin-page.spec.ts:322`), so the URL builder is never executed in any test: a
  wrong param order, a dropped `q` encoding or a broken header mapping would ship
  silently — and the api-contract guard only checks the *path* (`/admin/guidance`),
  not the query contract.
- **Suggested fix (XS):** mirror the four `listShelters` cases for
  `listGuidancePostsPage` (bare path, `{locale:'en',q:'a b & c',limit:10,offset:20}`
  → fixed order + encoding, `X-Total-Count: 25` → `total: 25`, no header → page
  length).

### F5 — Low (P2) — the extracted `GuidanceTranslations` panel is the only component without its own spec

- **Where:** `frontend/src/app/features/admin/guidance-translations.ts:23-29`
  (`@Component`, 97 lines, own template + the two-tap delete strip and
  `addableLocales`).
- **Evidence:** a whole-repo scan of decorated classes cross-checked against every
  spec file (identifier search) reports `GuidanceTranslations` as the single class
  referenced by **no** spec; the other three panels the extraction created each have
  a sibling spec (`guidance-order-list.spec.ts` 302 lines, `site-texts-panel.spec.ts`
  187, `guidance-editor.spec.ts` 1675) and so does the new `pagination.spec.ts`.
  Its behaviour is covered indirectly and well through
  `admin-page.spec.ts:2181-2373` (loading / empty / add-only-missing-locale /
  create-vs-update / two-tap delete + Cancel / delete-of-the-shown-row).
- **What is *not* covered anywhere:** the panel's own contract — `armed(locale)`
  for a `null`/foreign-instance confirm, the `translationTarget() !== null` gating
  (add buttons held, delete triggers hidden), the `busy()` label swap on the confirm
  button (`guidance-translations.html:52-58` shows `admin.guidance.working`), and the
  emitted outputs as such (`start`/`requestDelete`/`cancelDelete`/`confirmDelete`).
- **Why it matters:** the repo's convention is a spec per component, and the page
  spec is already 3063 lines; a panel is the cheap place to pin these states. Low
  because the user-visible flows are covered.
- **Suggested fix (S):** add `guidance-translations.spec.ts` mounting the panel
  directly (inputs: rows null/empty/full, `translationTarget` set, `busy` true,
  an armed `ConfirmAction`) and assert the four states + the emitted events.

### F6 — Low (P2) — the deliberate "the review queue is never paged" decision has no assertion

- **Where:** `frontend/src/app/features/admin/admin-page.ts:749-757` (`loadQueue`
  calls `this.admin.listShelters()` **bare** — the un-paged full list) and
  `:845-847` (the same bare call inside `refreshShelters`).
- **Evidence:** the specs assert only the *number* of calls
  (`admin-page.spec.ts:597-600` `toHaveBeenCalledTimes(2)`, `:768-770`
  `toHaveBeenCalledTimes(4)`); no test asserts the argument shape of the queue load.
- **Why it matters:** this is the lane's stated key decision ("the unconfirmed-queue
  tab is untouched … paginating the Shelters tab cannot hollow out the review
  queue"). If the queue leg ever acquired `{limit, offset}`, moderators would silently
  see only page 1 of the queue and every assertion would still pass.
- **Suggested fix (XS):** in one queue test, assert
  `expect(admin.listShelters).toHaveBeenCalledWith()` for the bare call (and, if
  desired, that the fixtures include >20 NEW rows so a page-sized regression is
  visible in the rendered count).

### F7 — Low (P2) — two locale-switch tests assert catalog copy after a microtask-only settle instead of awaiting the catalog

- **Where:** `frontend/src/app/features/guidance/guidance-detail-page.spec.ts:143-150`
  (`settle` = `whenStable()` + `detectChanges()` + one microtask, **no** macrotask),
  used at `:350-354` and `:357-361` right after `setLocale('et')`, where the asserted
  string comes from the lazy `et` catalog (`'Juhise artiklit ei leitud'`). Every other
  switch site in the suite calls `await …ensureCatalog('et'|'ru')` explicitly.
- **Evidence it is *not* broken today:** running that spec alone (fresh module graph,
  no other spec importing `et.ts`) passes 3/3.
- **Why it matters:** the chunk's arrival is satisfied only via whatever macrotask
  the framework happens to run inside `whenStable()`; the file's other switch tests
  already carry the explicit await, so the idiom is inconsistent, and a future
  settle refactor or a slower transform turns this into the intermittent failure five
  lanes already hit once.
- **Suggested fix (XS):** add `await TestBed.inject(I18nService).ensureCatalog('et');`
  before the copy assertions (matching `title.spec.ts:57-59`).

### F8 — Low (P2, cosmetic) — stale count in the i18n guard's own documentation

- **Where:** `frontend/src/app/core/i18n/i18n-template-guard.spec.ts:61`
  `/** The full template set as of 2026-09-21 (23 files). */` while
  `EXPECTED_TEMPLATES` (`:65-93`) lists **26** entries and the walk discovers 26
  (`find src/app -name '*.html' | wc -l` → 26). The guard itself is correct and
  complete (the equality assertion at `:146` passes); only the comment misleads a
  reader about coverage.
- **Suggested fix (XS):** update the comment to 26 (or drop the number).

---

## Areas found clean (evidence, not assumption)

1. **The in-flight lane's paging feature, apart from F1.** Guidance search:
   submit writes `q` to the URL and resets the page, explicit Clear removes it
   (`admin-page.spec.ts:2905-2947`); size change clamps a stranded page
   (`:2948-2968`); out-of-range page renders the notice + "Show the first page" and
   never a bare empty table (`:2970-2986`); shelters chips are URL-backed and compose
   with the search (AND), the search resets the page (`:3014-3047`); shelters
   out-of-range uses the header total (`:3048-3062`); the empty-search vs empty-scope
   copy is distinguished as a separate state (`guidance-order-list.spec.ts:277-301`).
2. **The drag-and-drop / `reorderable` rule — genuinely behaviour-tested.** The
   component spec drives it with a real DOM: with `reorderable: false` **every** row's
   move buttons are disabled (including the middle row where `up`/`down` are normally
   enabled), `draggable` is `null` on every row, a dispatched `dragstart` leaves
   `panel.dragId === null`, a dispatched `drop` and a direct `panel.movePost(13,'up')`
   emit nothing (`guidance-order-list.spec.ts:251-275`); the single-page case keeps the
   order hint (`:277-285`). The page adds the two-way hint flip plus the disabled
   button (`admin-page.spec.ts:2987-3012`).
3. **The paging plumbing that the header contract rests on.**
   `ApiClient.getWithHeaders` is covered against `HttpTestingController` with a real
   response header (`core/api-client.spec.ts:94-108`) and its error mapping (`:110-128`);
   `Pagination` is covered for the "renders nothing at ≤1 page" rule, boundary
   disables, size emission, offered sizes and keyboard reachability
   (`shared/pagination.spec.ts`, 7 tests).
4. **The two input-order/paging couplings I suspected and then refuted** (reported so
   the next sweep does not re-litigate them):
   `guidance-order-list.html:37` hardcodes `{max: 100}` in the paged hint while the
   test asserts the hint contains `'100'` (`admin-page.spec.ts:3000`) — dropping size
   `100` from `GUIDANCE_PAGE_SIZES` **does** fail the suite (mutation: 1 test red, the
   size-change clamp spec), so the hint cannot drift while the suite is green. The
   queue's "un-paged" property is F6, not clean, but the *loading* behaviour of both
   lists is asserted through real DOM renders, not mocks of the component.
5. **The i18n template guard, as rebuilt.** Full-template discovery with a
   completeness pin, a character-level scanner that also flags copy inside
   interpolations, a "has teeth" synthetic test (`:163-186`) and per-file allow-lists
   with a staleness test (`:200-238`) — this closes the earlier sweep's F3 properly.
6. **The cross-cutting contract guards.** `gateways/api-contract.spec.ts` (gateway URL
   literals vs the committed OpenAPI snapshot, with a non-vacuous `checked.length ≥ 20`)
   and `core/models-contract.spec.ts` (FE response-DTO fields vs the snapshot schemas,
   `checkedFields ≥ 100`, the F1-class bug that motivated it documented in the header).
7. **The catalogue of suite-wide anti-patterns stays empty:** no `.only`/`.skip`/
   `test.todo`/`fakeAsync`/`waitForAsync`, no "should create", no assertion-free test,
   no `as any`-style escape hatch in the switch-heavy specs I read.

---

## Notes (checked, not findings)

- **`ng test` writes the build output.** My runs regenerated the gitignored
  `frontend/dist/frontend` (all 23 files, mtime 22:28 EEST); it is a normal
  production-shaped build of the current tree (no `vitest`/`TestBed` leakage, has
  `prerendered-routes.json`). No tracked file was touched; the running dev server on
  :5173 does not serve from `dist`. Run `npx ng build` if a pristine directory is
  wanted.
- **One jsdom stderr line per run** — `Not implemented: navigation to another
  Document`. I bisected it to `frontend/src/app/shared/page-shell.spec.ts` (by
  per-file runs; group `--include` globs are unusable here, they break the app build:
  "No loader is configured for .html files"). I could not attribute it to a single
  test within budget, and it is harmless (one line, no failure), so it is recorded as
  an observation, not a finding.
- The `ShelterSourceFilter` union (`models.ts:50`) is not pinned to the snapshot's
  `enum: [REGISTRY, USER, ALL]` (`docs/api/openapi.json`, `/admin/shelters` GET) by any
  frontend test — `models-contract.spec.ts` deliberately covers response DTOs only.
  Reported here only as context for agent 11 (FE/BE contract), not as a test gap I
  would gate on.

---

## Prioritized list — tests to add / fix first

| # | Item | Type | Effort | Why first |
| --- | --- | --- | --- | --- |
| 1 | URL normalization cases: `?guidanceSize=15`, `?guidanceSize=999`, `?shelterPage=abc`, `?shelterPage=0`, `?source=BOGUS` (F1) | new tests | S | The only lane behaviour proven absent from the suite entirely (mutation: 1395 green without it). |
| 2 | Replace the `<td>`-class first-match scan with a brace-balanced all-occurrence scan + fail on a missing rule (F2) | fix guard | S | Fourth instance of "guard passes while the behaviour is gone"; the row-separator defect it guards is an owner-reported one. |
| 3 | Extend the `angular.json` pin to the quill `assets` entry (F3) | fix guard | XS | Three lines; keeps the built editor styled. |
| 4 | `listGuidancePostsPage` gateway tests (params order/encoding, bare path, header total, absent-header fallback) (F4) | new tests | XS | The one new endpoint wrapper with no boundary test, while its twin has five. |
| 5 | `guidance-translations.spec.ts` — the panel's own states + emitted outputs (F5) | new spec | S | Restores the "spec per component" convention for the newest panel. |
| 6 | Assert the queue load is bare (F6) | new assertion | XS | Protects the lane's key decision (the review queue must not page). |
| 7 | `ensureCatalog('et')` at the two microtask-only switch sites (F7) | fix test | XS | Removes the last implicit dependency on the lazy chunk's timing. |
| 8 | e2e layer for the five browser-only flows from the earlier sweep (real map/markers, geolocation prompt + insecure context, pre-paint no-flash, 320/900 px layout + focus order, real Quill paste) | new layer | L | Still the documented deferral; unchanged by this lane. |

---

## Top 5 findings

1. **F1 (Medium, P1)** — `admin-page.ts:564-607, 2042-2063`: the page-param clamping/normalization the lane advertised has **no** test; neutering `normalizeListParams` in a `/tmp` copy leaves **1395/1395 green** (probe shows the feature does work today, and leaves `?source=BOGUS` un-normalized against its own comment).
2. **F2 (Medium, P1)** — `design-tokens.spec.ts:826-834`: the `<td>`-class guard still takes the first match and silently `continue`s; appending `@media (max-width: 900px) { .admin-cell--name { display: flex } }` keeps `design-tokens.spec.ts` **107/107 green** — the row-separator regression can return.
3. **F3 (Low, P2)** — `guidance-editor.spec.ts:1266-1277` pins `angular.json`'s `styles` but not the `assets` entry that copies the Quill snow theme to `SNOW_THEME_HREF`; removing it keeps **71/71 green** while the built app's editor loses its theme (404).
4. **F4 (Low, P2)** — `admin-gateway.ts:267-275` `listGuidancePostsPage` has no gateway spec (0 references in `admin-gateway.spec.ts`) while `listShelters` has five covering the identical contract; the page specs use a fake gateway, so the URL builder and the `X-Total-Count` mapping are never executed.
5. **F5 (Low, P2)** — `guidance-translations.ts` is the only decorated class in `src/app` with no spec reference (its three extracted siblings and the new `Pagination` all have one); the panel's own gating states (`translationTarget`, `busy`, `armed`) are covered nowhere.

**Merge verdict: OK with notes.** The suite is strong and genuinely green (verified 59 files / 1397 tests at 22:31 EEST; 1395 at 22:14 — a concurrent writer is still editing `page-shell.*`, `consent-banner.*`, `error-copy.ts` and the catalogs, so this review pins the revision of the files it names, all of which were untouched during the session). No product defect was found caused by the change under review; F1 and F2 are the two items worth fixing before the next release — F1 because a shipped behaviour has no test at all, F2 because it is the same "guard that can pass while the behaviour is gone" class the repo has now hit four times.
