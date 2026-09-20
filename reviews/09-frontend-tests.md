# Agent 9 — Frontend tests (Angular suite)

Repository root: `/home/aleks/MyScripts/LocalRepos/OpenShelter`
Scope: `frontend/**` tests only. Read-only review; no source file was modified.

## Detected stack (from `frontend/package.json`, `frontend/angular.json`)

| Item | Version / setting | Evidence |
| --- | --- | --- |
| Angular | 22.1.x (standalone, **zoneless**) | `frontend/package.json` deps `@angular/*: ^22.1.0`; `frontend/README.md:15-22` |
| Test runner | **Vitest 4.0.8** via the `@angular/build:unit-test` builder (no Karma/Jasmine) | `frontend/package.json` devDeps `vitest: ^4.0.8`; `frontend/angular.json` `architect.test.builder = "@angular/build:unit-test"` |
| DOM env | jsdom 28 | `frontend/package.json` devDeps `jsdom: ^28.0.0` |
| TypeScript | ~6.0.2, `strict` (`tsconfig.spec.json` extends `tsconfig.json`, `types: ["vitest/globals"]`) | `frontend/tsconfig.json`, `frontend/tsconfig.spec.json` |
| Spec bootstrap | `src/test-setup.ts` (in-memory `localStorage`, `et`/`ru` locale data, jsdom `Range` rect shim) | `frontend/angular.json` `test.options.setupFiles` |
| E2E layer | **none** — no Cypress/Playwright/Puppeteer anywhere in the repo (documented deferral) | Repo-wide search for `playwright`, `cypress`, `puppeteer` → no hits; `frontend/README.md:24` + `README.md:37` ("no e2e framework in v1 (see Deferrals)") |

### Suite executed (permitted by the brief)

`cd frontend && npx ng test --watch=false` → output redirected to `/tmp/ng-test-agent9.log`, no artifact written inside the repo:

```text
Test Files  56 passed (56)
     Tests  1263 passed (1263)
  Duration  19.80s
EXIT=0
```

Confirms the brief's 56 files / 1263 tests, all green. 23 072 lines of spec code for ~9 600 lines of app TS — a very high test-to-code ratio.

---

## Areas found clean (evidence, not assumption)

1. **Every component / service / store / guard / interceptor / pipe / gateway has a spec.**
   A whole-repo export scan cross-checked against every `*.spec.ts` shows no production component, service or gateway file without a sibling spec: `page-shell`, `banner`, `consent-banner`, `accessibility-dialog`, `loading-indicator`, `report-gauge`, all 13 page components, `AuthStore`, `TokenStore`, `ThemeStore`, `ConsentStore`, `I18nService`, `TranslatePipe`, `apiInterceptor`, `ApiClient`, and all 10 gateways. Route `resolve`rs do not exist in `app.routes.ts`, so none are untested.
2. **No "default generated" create-the-component tests.** `rg "should create" src -g "*.spec.ts"` → **0 matches**. The smallest specs are behavioural (`loading-indicator.spec.ts` asserts the `role="status"` default and the input override; `banner.component.spec.ts` asserts `role="alert"` vs `role="status"` per severity and the null-clears-the-banner contract).
3. **Specs assert behaviour through the DOM / public API.** No `as any`, no `@ts-ignore`, no `@ts-expect-error`, no private-member poking across all 23 k lines (`rg "as any|@ts-ignore|@ts-expect-error"` → 0 matches; the only `as unknown as` casts are typed DI fakes).
4. **Guards are covered behaviourally, including the fail-closed admin path.**
   `core/guards.spec.ts` drives `authGuard`/`guestGuard`/`verifiedGuard` **through a real `Router`** (redirect targets and `returnUrl` asserted: `/login?returnUrl=%2Fprotected`, `/verify?returnUrl=%2Fsubmit`, `/map` for guests), incl. the "waits for `AuthStore.init()` before deciding" race. `adminGuard` is covered in `features/admin/admin-page.spec.ts:347,454-476` (anonymous → `/map`, authenticated non-admin → `/map`, page not loaded, no data call).
5. **`safeReturnUrl` hardened and pinned** (`guards.spec.ts:31-39`): `//evil.example`, `https://evil.example`, `/\evil.example`, `null`, `undefined` → `/map`.
6. **HTTP testing is done correctly.** `HttpTestingController` + `provideHttpClientTesting()` are used in `core/api-client.spec.ts` and `core/api-interceptor.spec.ts`, both with `afterEach(() => httpMock.verify())`. The interceptor spec covers the hard cases: Bearer attach/skip (login/refresh never bearered), refresh-then-retry, refresh failure → `navigate(['/login'], {queryParams:{session:'expired'}})`, network status 0 pass-through, the "post-refresh 401 must not loop" case, and the business-401 `PUT /account/profile` exemption (`api-interceptor.spec.ts:60-259`). All other specs use hand-written gateway fakes — **no spec performs real HTTP** except the latent case in F5 below.
7. **`fakeAsync` misuse: none.** `fakeAsync` is never imported (the README documents "Karma-style specs, `fakeAsync`-free: explicit tick/polling"). Where timers matter, `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()` / `vi.useRealTimers()` are paired (e.g. `resend-countdown.spec.ts:7,13`; `geocode-gateway.spec.ts:57,112`).
8. **No skipped, focused or assertion-less tests.** `rg "\b(it|describe|test)\.(only|skip)\b|\bxit\(|\bxdescribe\(|\btest\.todo"` → 0 matches. A programmatic scan of every `it(`/`it.each(` body found **0 tests without at least one `expect(`**.
9. **Per-test isolation is respected.** `localStorage.clear()` runs before the first `I18nService`/`AuthStore` inject in the specs that read storage; `window.isSecureContext` is re-stubbed in `beforeEach` (`map-page.spec.ts:257`, `submit-shelter-page.spec.ts:178`) instead of leaking the non-secure path; `navigator.geolocation` is reset (`map-page.spec.ts:258`, `shelter-detail-page.spec.ts:659` `afterEach`); `document.title` is restored (`title.spec.ts:44`).
10. **Cross-cutting guards that genuinely fail the build on drift exist and are well built**: the FE↔BE path contract (`gateways/api-contract.spec.ts` scans gateway URL literals against the committed `docs/api/openapi.json`, with a non-vacuous `expect(checked.length).toBeGreaterThanOrEqual(20)`), route-title completeness for all three catalogs (`title.spec.ts:70-88`), catalog key/identity parity (`i18n.spec.ts`, `catalog-identity.spec.ts`), and the design-token colour audit (see F1/F2 for the two spots where it stops guarding).
11. **Numeric Haversine behaviour is pinned through the pages**: 0.01° latitude → "≈ 1.1 km straight line from you", 0.002° → "≈ 222 m" (`shelter-detail-page.spec.ts:711-744`), and the high-accuracy options object is asserted (`map-page.spec.ts:983`).

---

## Findings

### F1 — Medium — the responsive "map re-stacks" guard can pass while the re-stack is gone (regex over-runs the media block)

- **Where:** `frontend/src/app/design-tokens.spec.ts:547-551`
  ```ts
  const media = map.match(/@media \(max-width: 900px\) \{[\s\S]*\n\}/);
  expect(media![0]).toContain('flex-direction: column');
  ```
- **What is wrong:** `[\s\S]*` is **greedy** and the pattern has no closing-brace boundary, so the match is "from the first `@media (max-width: 900px) {` to the **last** column-0 `}` in the file". Today the media block happens to be the last block (match = chars 18 022-19 394 of the file, `map-page.scss:586-621`), so the assertion is accidentally correct. `map-page.scss` already contains 10 `flex-direction: column` declarations (lines 12, 19, 61, 90, 137, 164, 222, 227, 396, 588) and the file is append-only in practice.
- **Why it matters:** this test *is* the automated layout-regression signal for the narrow breakpoint (the comment at `:543-545` states the real check is a manual E2E step). The moment any top-level rule is appended after `map-page.scss:621`, the match extends to the file tail and `toContain('flex-direction: column')` is satisfied by unrelated rules — the re-stack can be deleted and the suite stays green.
- **Repro (no repo file touched, /tmp copy):** delete the re-stack line from the media block, append a top-level rule containing `flex-direction: column`, then run the spec's own regex →
  `media block still re-stacks? false` / `TEST ASSERTION expect(media[0]).toContain("flex-direction: column") -> true`.
- **Fix:** extract the media block by brace balancing (the idiom already used in this repo — `page-shell.spec.ts:524-556` `narrowBlock()`, "a regex alone would over-run into the file tail") and assert on that block; or at minimum use the lazy anchored form used by the neighbouring tests, `/@media \(max-width: 900px\) \{[\s\S]*?\n\}/`.

### F2 — Medium — two admin-table guards match outside the rule they claim to check (dead decoys satisfy them)

- **Where:** `frontend/src/app/design-tokens.spec.ts:578` and `:583`
  ```ts
  ).toMatch(/\.admin-table \{[\s\S]*?border-collapse: collapse/);
  ).toMatch(/th,\s*\n\s*td \{[\s\S]*?border-bottom: 1px solid var\(--color-border-subtle\)/);
  ```
- **What is wrong:** the lazy `[\s\S]*?` has no `}` boundary, so the search continues past the end of `.admin-table { … }` (and past the `th, td { … }` rule) until the literal appears **anywhere later in the file**. Both literals have decoys downstream:
  - `admin-page.scss:101` — the identical text `border-collapse: collapse` inside the explanatory comment (the real declaration is `:70`); one more occurrence at `:455` for `border-bottom: 1px solid var(--color-border-subtle)` (the real one is `:78`, so the file has exactly 2).
- **Why it matters:** this test is the regression guard for the owner-reported row-separator defect (the long assertion at `:555-565` explains that a `display` on a `<td>` splits the separator). Removing the actual declaration now leaves the test green because a *comment* satisfies it.
- **Repro (/tmp copy):** delete `border-collapse: collapse;` from the `.admin-table` rule, re-run the spec's regex → `TEST 578 assertion -> true` while `the .admin-table rule still collapses? -> false`.
- **Fix:** bound the scan to the rule block (brace-balanced extraction, or `[^}]` instead of `[\s\S]*?` where the block has no nesting), and for `:583` match the declaration *inside* the extracted `th, td` block.

### F3 — Medium — the i18n template guard scans 4 of ~20 templates, and the uncovered ones still contain untranslated user-visible copy

- **Where:** `frontend/src/app/features/account/account-i18n-guard.spec.ts:87-94` (`const TEMPLATES = { 'account-page.html','contributions-panel.html','verify-page.html','shelter-detail-page.html' }`), scanner attribute check at `:299-301` (`CHECKED_ATTRS` includes `aria-label`).
- **What is wrong:** the guard's own contract is "no hardcoded user-visible text in the account templates … the scanner re-checks the whole template on every run" and "Adding a template here is mandatory when a translated-surface component gains one". Untranslated literals exist today in templates that are **not** listed:
  - `features/map/map-page.html:10` `aria-label="Marker legend"`, `:125` `aria-label="Address results"`, `:210` `aria-label="Shelter filters"`, `:240` `aria-label="Shelters"` — directly beside the translated sibling on `:193` `[attr.aria-label]="'map.filterSourcesAria' | t"`.
  - `shared/page-shell.html:36` `aria-label="Primary"`, `:136` `aria-label="Legal"` (landmark names announced by screen readers) — while `:14` and `:70` in the same file do use `| t`.
  - `features/admin/admin-page.html:897` `aria-label="Guidance posts"`, `:1125` `aria-label="Media library"` — while `:239` uses `[attr.aria-label]="'admin.shelters.aria' | t"` for the same kind of region.
  These are exactly the strings the scanner flags: the guard's own "the scanner still has teeth" test (`:344-356`) proves a literal `placeholder=`/attribute value is reported as a violation.
- **Why it matters:** the app ships EN/ET/RU; the guard exists precisely to stop English leftovers from drifting back in, but the templates where drift is live are outside its coverage map, so the suite is green while screen readers get English labels in Estonian/Russian sessions.
- **Fix (test first, then the copy):** add `map-page.html` (dir `map`), `page-shell.html` (dir `shared`) and `admin-page.html` (dir `admin`) to `TEMPLATES`; the guard then fails and the literals get catalog keys (only `--color-*`-style keys already exist: `map.filterSourcesAria`, `admin.shelters.aria` show the intended pattern). If the guard must stay scoped, add a companion test that enumerates every `*.html` under `src/app` and asserts it is either listed as a translated surface or explicitly exempt — otherwise new templates silently opt out.

### F4 — Medium (documented deferral) — no e2e layer, and the browser-only behaviours are asserted only as stylesheet/source text

- **Where:** no Cypress/Playwright dependency or config in the repo (verified by repo-wide search); `frontend/README.md:24` and the Deferrals section document the omission; the specs themselves admit the limits: `design-tokens.spec.ts:543-545` ("jsdom cannot do real layout … the real narrow-width check is a manual E2E step"), `page-shell.spec.ts:513-519, 630-636`, `admin-page.spec.ts:2195-2198`.
- **What is wrong:** the acceptance for several user-visible behaviours is the *presence of text in a source file*, not the behaviour: narrow-breakpoint re-stack, header wrap, footer centring/orphaned separators, 48 px touch targets, focus-ring visibility, table row separator, badge sizing, Quill theme linking. Similarly the page specs inject `FakeLeafletService` (which re-implements the real service's `create`/`alive` guards by hand — `shelter-detail-page.spec.ts:55-93`) so no test renders a real Leaflet map, and geolocation is always stubbed.
- **Why it matters:** the highest-risk user flows have no automated coverage at any level above "the source text says so":
  1. map browse → marker click → detail navigation with real tiles/markers (`LeafletService` is exercised only under jsdom in `leaflet-service.spec.ts`);
  2. the geolocation permission prompt and the insecure-context path in a real browser;
  3. reload with a stored theme/locale — the pre-paint no-flash guarantee (the jsdom suite can only re-run the extracted script, `prepaint.spec.ts:88`);
  4. responsive layout at 320/900 px and keyboard focus order through the real DOM;
  5. real Quill editing/clipboard sanitising (the editor spec drives Quill's JS API under jsdom, not a browser paste).
- **Fix:** when the deferred e2e layer lands, target these five flows first rather than re-testing what TestBed already covers; until then, treat F1/F2 as the only automated stand-ins and keep them honest.

### F5 — Low — the root-app spec wires the real `HttpClient` (no testing backend)

- **Where:** `frontend/src/app/app.spec.ts:20-21` — `providers: [provideRouter(...), provideHttpClient()]`.
- **What is wrong:** `App.ngOnInit()` calls `AuthStore.init()` (`app.ts:29-31`); with a stored refresh token that path performs a real `POST /auth/refresh` through `AuthGateway` → `ApiClient` → the **real** `HttpClient` (jsdom XHR), not `HttpTestingController`. It passes today only because `localStorage` is empty at that point (`auth-store.ts:129-134` returns early when there is no refresh token).
- **Why it matters:** the one spec that boots the *real* app root is the one that can silently start hitting the network as soon as a test (or a change to `PageShell`) seeds a token — a flaky, environment-dependent failure instead of a deterministic one.
- **Fix:** add `provideHttpClientTesting()` + `afterEach(() => httpMock.verify())`, or provide the gateway fakes as every page spec does.

### F6 — Low — 35 wall-clock settle ticks and 30 fixed-iteration polling loops replace deterministic waiting

- **Where:** `setTimeout(resolve, 0)` settles: 28 in `features/admin/admin-page.spec.ts` (helper at `:400-406`), 2 in `account-page.spec.ts`, 1 each in `confirm-action.spec.ts`, `site-texts-panel.spec.ts`, `guidance-editor.spec.ts`, `contributions-panel.spec.ts`, `api-interceptor.spec.ts:26-27`. Bounded polls: 25 `for (let i = 0; i < 5…9; i++) await settle(...)` loops in `features/shelter/submit-shelter-page.spec.ts` (e.g. `:1177-1186`, which polls up to 10 times for `.submit-success`), 4 in `shelter-detail-page.spec.ts` (`:852, 872, 1446, 1463`).
- **What is wrong:** zoneless CD needs an explicit settle, but the current idiom is "wait a fixed number of real macrotask turns and hope". The bounded poll at `submit-shelter-page.spec.ts:1180-1186` *silently passes* if the state only appears on the 9th iteration, and a loaded CI machine can exhaust the budget before the microtask chain finishes.
- **Fix:** prefer `await fixture.whenStable()` + an explicit `expect.poll(...)`/`vi.waitFor(...)` (the repo already uses `vi.waitFor` correctly in `guards.spec.ts:90-96`) so a slow machine fails with "state never appeared" rather than a misleading DOM assertion, and so the iteration count is not part of the contract.

### F7 — Low — exact copy assertions derived from the live clock (±30 s rounding boundary)

- **Where:** `features/admin/admin-page.spec.ts:44` `const ago = (ms) => new Date(Date.now() - ms).toISOString()` used by fixtures (`:80`) and asserted as exact copy at `:490` (`'Full · 12 min ago'`); same pattern at `features/map/map-page.spec.ts:1558,1677` and `features/shelter/shelter-detail-page.spec.ts:404,418,430,448,929,1507`.
- **What is wrong:** the formatter rounds to the nearest minute (`shelter-copy.ts:266-274`, `Math.round((now - Date.parse(iso)) / 60000)`) and the component calls it with the default live `Date.now()`, so "12 min ago" flips to "13 min ago" after 30 s of wall-clock elapsing inside that test.
- **Why it matters:** the window is small, but it is the only wall-clock dependency left in the suite and it fails as an unrelated, hard-to-diagnose assertion.
- **Fix:** the pure-function specs already show the right technique — pass an explicit `now` (`shelter-copy.spec.ts:274-286` uses `Date.parse('2026-09-11T12:12:00Z')`); give the components the same optional `now` seam, or assert the shape (`/Full · \d+ min ago/`) instead of the exact minute.

### F8 — Low — the real application bootstrap (`app.config.ts`, `main.ts`) is never exercised

- **Where:** no spec references `appConfig` or `main.ts` (verified repo-wide: the only matches are two comments in `shelter-detail-page.spec.ts:25-26`).
- **What is wrong:** `provideHttpClient(withInterceptors([apiInterceptor]))` and `provideRouter(routes)` live only in `src/app/app.config.ts:6-13`; every test builds its own providers, and `api-interceptor.spec.ts` supplies its own `provideHttpClient(withInterceptors([apiInterceptor]))`. Dropping the interceptor (or a route) from the real config therefore breaks authentication in the shipped app with a fully green suite.
- **Fix:** one small spec that mounts `App` with `appConfig.providers` (`TestBed.configureTestingModule({ imports: [App], providers: [appConfig.providers …] })`) and asserts that a request through the real `ApiClient` carries `Authorization: Bearer` — that single test covers the config wiring, the interceptor registration and (via `main.ts`'s `registerLocaleData` mirror in `test-setup.ts`) the locale-data registration the suite currently duplicates by hand.

### F9 — Low — the page-scoped `LeafletService` provider is removed in every spec that mounts those pages

- **Where:** `map-page.spec.ts:284`, `shelter-detail-page.spec.ts:198`, `submit-shelter-page.spec.ts:205` — each `TestBed.overrideComponent(<Page>, { remove: { providers: [LeafletService] } })`, while the production code relies on that entry (`map-page.ts:194`, `shelter-detail-page.ts:144`, `submit-shelter-page.ts:141`; `LeafletService` is `@Injectable()` with **no** `providedIn`, `leaflet-service.ts:84`).
- **What is wrong:** the specs deliberately delete the DI-scoping line under test, so nothing verifies that each page mount gets its own service instance (the mechanism that keeps one page's map/markers from leaking into another) — and the fakes re-implement the real service's guards by hand, so a fake/real drift is invisible to the page specs (the real service itself is covered separately in `leaflet-service.spec.ts`, 25 tests).
- **Fix:** add one test that keeps the component provider and mounts the page twice (two `TestBed` component instances / a navigation away and back) asserting distinct `LeafletService` instances and that the first destroy does not clear the second's markers.

### F10 — Low — shared modules with no direct spec (`geolocation.ts`, `site-texts.ts` helpers)

- **Where:** `src/app/shared/geolocation.ts` — all six exports (`GeolocationError`, `GeolocationFailureKind`, `HIGH_ACCURACY_POSITION_OPTIONS`, `geolocationErrorKind`, `getCurrentPositionHighAccuracy`, `haversineKm`) are referenced by **no** spec file (verified by an export-by-export scan across all 56 specs). Also `src/app/core/i18n/site-texts.ts:126` `isSiteTextKey` is exported, has **no caller** anywhere in the repo and no test (the panel uses `SITE_TEXT_BLOCKS` / `isSiteTextLink`).
- **What is wrong:** the module's behaviour *is* covered, but only indirectly and in duplicate: the failure kinds via `map-page.spec.ts:847-905` and `shelter-detail-page.spec.ts:746-810`, the options object via `toHaveBeenCalledWith` (`map-page.spec.ts:983`), the math via the pinned distances. A regression in the shared mapping therefore surfaces as two page failures, and `geolocationErrorKind`'s non-numeric-code fallback (`geolocation.ts:43-58`, `code = 2` for a missing/NaN code) is exercised nowhere.
- **Fix:** a small `geolocation.spec.ts` (11-15 cases: 5 failure kinds incl. the non-numeric code, the insecure-context guard, the unsupported guard, Haversine on a known pair — e.g. Tallinn 59.437/24.754 → Tartu 58.378/26.729 ≈ 160 km — and the 0-distance case). Cosmetic follow-up: delete `isSiteTextKey` or use it where the key membership is checked.

---

## Judgement on the "assert stylesheet invariants by reading SCSS text" pattern

The pattern is defensible here and is **not** the usual "test asserts implementation detail" anti-pattern, for three reasons I could verify: (a) jsdom cannot measure layout, so the alternative is no signal at all until e2e exists; (b) the colour/token audit (`design-tokens.spec.ts:96-111, 200-380`) enforces real invariants (WCAG ratios computed from the literal values, a two-way token-name set equality with the theme blocks, honest-exemption checks) — these catch genuine defects such as the "dark text on a dark background" class called out at `:688-704`; (c) most extractions are done by brace balancing with column-0 anchoring (`design-tokens.spec.ts:75-91` `blockLines`, `page-shell.spec.ts:524-592, 636-690` `narrowBlock`/`topLevelBlock`, `shelter-detail-page.spec.ts:1634-1676`), and the authors documented why ("a regex alone would over-run into the file tail").

What is *not* defensible is the minority that reads text without the boundary — F1 and F2 — and the fact that ~40 of these assertions encode formatting (exact selector line breaks, `\n {2}\}` indentation such as `design-tokens.spec.ts:643, 662` and `page-shell.spec.ts:822`), so a pure reformat can fail a test with a misleading message. Concrete net recommendation: keep the token/colour audit as-is, replace the two unbounded regexes with the brace-balanced helper that already exists in the same file, and move the geometry claims (re-stack, wrap, tap targets, row separator) to the e2e layer when it lands.

---

## Prioritized list — tests to add / fix first

| # | Item | Type | Effort | Why first |
| --- | --- | --- | --- | --- |
| 1 | Fix `design-tokens.spec.ts:549` (anchor the media block) and `:578`/`:583` (bound the rule scan) | fix existing guard | S | These are the only automated layout-regression signals; both are provably able to pass while the behaviour is gone (F1/F2). |
| 2 | Add `map-page.html`, `page-shell.html`, `admin-page.html` to the i18n template guard, then catalog-key the 8 untranslated `aria-label`s (F3) | fix guard + copy | S | Live user-visible defect that the guard is supposed to catch; the scanner already supports it. |
| 3 | `app.config.spec.ts` — mount `App` with the real `appConfig.providers` and assert `Authorization` on a real `ApiClient` call (F8) | new test | S-M | The only wiring the whole suite never touches; covers interceptor + routes + locale registration. |
| 4 | `shared/geolocation.spec.ts` — 5 failure kinds (incl. non-numeric code), both pre-checks, Haversine known pairs (F10) | new test | S | Cheap; turns two page-level failures into one precise unit contract; pins client-side distance math. |
| 5 | Determinism pass: replace the fixed-count settle loops with `vi.waitFor`/`expect.poll` and remove the wall-clock copy assertions (F6, F7) | refactor tests | M | Removes the suite's remaining flake sources before CI relies on it. |
| 6 | DI-scoping test for the page-scoped `LeafletService` (two page mounts, distinct instances) (F9) | new test | S | Protects the line every page spec deletes. |
| 7 | e2e layer for the five browser-only flows: map+markers, geolocation permission/insecure context, pre-paint no-flash on reload, 320/900 px layout + focus order, real Quill paste (F4) | new layer | L | Documented deferral; these flows currently have no behavioural coverage at any level. |
| 8 | `provideHttpClientTesting()` in `app.spec.ts` (F5) | fix existing test | XS | Removes the only latent real-HTTP coupling in the suite. |

---

## Top 5 findings

1. **F1 (Medium)** — `design-tokens.spec.ts:549`: the narrow-breakpoint "map re-stacks" guard uses a greedy, unbounded regex; proven to pass after the re-stack is deleted (repro in /tmp). It is the stand-in for the manual E2E step.
2. **F2 (Medium)** — `design-tokens.spec.ts:578,583`: the admin-table row-separator guards match literals anywhere later in the file; a comment in `admin-page.scss:101` alone satisfies the first one, so the guarded declaration can be removed with a green suite.
3. **F3 (Medium)** — `account-i18n-guard.spec.ts:87-94`: the i18n template guard covers 4 of ~20 templates, while untranslated `aria-label`s are live in `map-page.html:10,125,210,240`, `page-shell.html:36,136` and `admin-page.html:897,1125` — beside translated siblings in the same files.
4. **F4 (Medium, documented deferral)** — no e2e layer at all; the browser-only behaviours (real Leaflet map/markers, geolocation prompt, pre-paint no-flash, responsive layout, real Quill editing) are accepted solely from source text, and the page specs fake the map service.
5. **F5/F6/F7/F8/F9/F10 (Low)** — the root-app spec uses a real `HttpClient` (`app.spec.ts:20`), 30 fixed-iteration polling loops + 35 wall-clock settle ticks, live-clock copy assertions (±30 s flip), an unexercised real bootstrap (`app.config.ts`), the page-scoped `LeafletService` provider deleted in all three page specs, and `geolocation.ts` with no direct spec.

**Merge verdict: OK with notes.** Nothing here is a product defect introduced by the current tree; the suite is unusually strong (56 files / 1263 tests, all green, verified). F1 and F2 should be fixed before they are trusted as regression guards, and F3's guard coverage (or the copy) before further i18n work ships.
