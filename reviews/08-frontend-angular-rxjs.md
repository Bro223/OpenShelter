# Agent 8 — frontend-angular-rxjs (sequential sweep, run 3)

Tree: `d247007` + ~23 uncommitted files (the `list-page-paging` admin lane: server paging,
search, source filter; the shelters-side paging is owner-approved beyond
`docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md`, per `ADMIN-LANE-REPORT.md` §4).
Everything below is judged against that revision; findings that depend on the uncommitted
lane are marked **[in-flight]**.

## Versions detected (first, per COMMON RULES)

| Thing | Declared | Installed / effective | Note |
| --- | --- | --- | --- |
| Angular | `^22.1.0` (`@angular/cli`/`@angular/build` `^22.1.7`) | 22.1.5 | zoneless by default: no `zone.js` dep, no `polyfills` entry in `angular.json`, no `provideZonelessChangeDetection()` needed |
| RxJS | `~7.8.0` | 7.8.x | only `lastValueFrom` + `from`/`mergeMap`/`throwError`/`skip`/`map` |
| TypeScript | `~6.0.2` | 6.0.3 | **`strict` is on by default in TS 6.0** — see the verification note below; the absent `"strict": true` in `tsconfig.json` is *not* a gap |
| Tests | `vitest ^4.0.8` | 4.1.11 (`@angular/build:unit-test`, jsdom) | full suite re-run: **59 files / 1395 tests passed**; `ng build` and `tsc --noEmit` clean |
| Other | `leaflet ^1.9.4`, vendored Quill 2.0.3 | | no UI framework, no state library, no NgModule |

---

## Review

### Correct — verified clean (with the evidence)

- **Versions/strictness.** `npx tsc -p tsconfig.app.json --noEmit` → 0 errors, and
  `--strict` adds **nothing** (0 errors both ways), because TS 6.0 defaults strict to on: a
  probe compiled with only `--target/--module/--ignoreConfig` produced `TS7006`
  (noImplicitAny), `TS2322` (`let x: string = null`), `TS2564` (strictPropertyInitialization).
  So the whole app is strict-clean today. (`tsc --showConfig` not printing `strict` is not
  evidence of its absence — it prints only explicitly-set options.)
- **Subscribe/unsubscribe discipline.** All 13 non-spec `subscribe()` sites read:
  - 9 `toObservable(...).subscribe()` (account-page 108/178, verify-page 136/183,
    contributions-panel 68/185, legal terms 38/41, privacy 39/42, guidance-list 128/140,
    guidance-detail 88/123, admin-page 418/655) all unsubscribe in `ngOnDestroy`. That
    teardown is in fact **belt-and-braces**: `toObservable`
    (`node_modules/@angular/core/fesm2022/rxjs-interop.mjs:74-93`) already wires
    `injector.get(DestroyRef).onDestroy(() => { watcher.destroy(); subject.complete(); })`,
    so the stream completes with the component's injector.
  - `admin-page.ts:552` (`queryParams`) and `guidance-list-page.ts:135` unsubscribe ✓.
  - `page-shell.ts:74/107` — the host `keydown` listener and the `router.events`
    subscription are both removed in `ngOnDestroy` (stable arrow-function reference, so
    `removeEventListener` matches) ✓.
  - `account-page.ts:446` (`deleteConfirm.valueChanges`) has no teardown but is a control
    owned by the component — control → observer → closure form an unreachable cycle on
    destroy, so it cannot leak ✓.
  - The two `route.paramMap` sites are the documented-exception case → F5 below.
  - **No nested subscribes anywhere**; nothing subscribes inside a callback.
- **The hand-rolled `toObservable(sig).pipe(skip(1))` idiom is correct** (confirms the
  earlier sweep). Mechanism verified in the installed core: the source is a `ReplaySubject(1)`
  fed by an `effect`, and an `effect` created in a field initializer first runs on the next
  flush — i.e. *after* `.subscribe()` — so the single value `skip(1)` drops is the current
  value on both possible orderings. `distinctUntilChanged` is unnecessary (signals do not
  re-notify on equal values).
- **`@for` + `track`.** All 11 `@for` blocks in `admin-page.html` carry `track` (0 without).
  `track change.field` in the history panel cannot collide: the backend builds the change
  map from a JSON object (`ShelterHistoryChanges.java:62-76`, `Map<String,Object[]>`), so
  keys are unique by construction — no NG0955 risk.
- **Change detection.** All 26 non-spec components set `ChangeDetectionStrategy.OnPush` (the
  20 files without it are spec host components). No `NgZone`, no `detectChanges()` outside
  specs, no zone-dependent code.
- **Standalone/NgModules consistency.** Zero NgModules, zero `CommonModule`, no
  `ComponentFactoryResolver`, no `@ViewChild`/`@Input` decorators, no `.toPromise()`,
  no deprecated API. Forms are typed `nonNullable` `FormControl`s in `ReactiveFormsModule`
  (no `ngModel`), including the new `searchQuery` / `guidanceSearch` controls.
- **HTTP layer is typed end to end.** `core/api-client.ts` is the only
  `inject(HttpClient)` in the app; every method is generic with one central
  `catchError → toApiError`; `getWithHeaders<T>` returns `{body: T; headers}` for the paging
  seam. All 8 gateways return concrete DTO promises via `lastValueFrom` (~60 call sites);
  the new `PagedRows<T>` (`models.ts:594-600`) is the typed paged shape. **Zero `any`** and
  zero `@ts-ignore` in `src`; the only casts are `api-client.ts:41` (`response.body as T`,
  required by the generic) and `geocode-gateway.ts:75` (external JSON validated row by row
  afterwards). The only non-`ApiClient` network call is Nominatim, which maps its own
  failures to `ApiError` (`geocode-gateway.ts:66-76`).
- **Interceptor correctness.** `api-interceptor.ts` is functional, uses
  `from(refresh()).pipe(mergeMap(...))` — no nested subscribe, no `switchMap` misuse — and
  retries with a direct `next(retried)`, so the retry cannot re-enter the interceptor
  (no refresh loop). `mergeMap` over a one-shot promise is the right operator; there is no
  HTTP stream that would want `switchMap` because the codebase deliberately resolves
  observables at the gateway boundary and guards staleness with monotonic `fetchSeq`
  counters.
- **The async content-locale race that bit five lanes is handled correctly here
  [in-flight].** For the admin page I traced six interleavings of
  `onContentLanguageChange` (`admin-page.ts:672-676`), the `toObservable(contentLocale)`
  subscription (`416-452`) and the router emission (`564-616`):
  switch on the Guidance tab, switch off-tab, switch during a load in flight, two rapid
  switches, switch with `q`/page params in the URL, and switch while the editor is open.
  All are correct: the locale is part of `guidanceViewKey` (line 620), the manual key write
  (441) prevents a second load, `loadGuidance` bumps `guidanceFetchSeq` (`1356`, compared at
  `1371`/`1381`) so a superseded response is dropped, and the editor is closed so no
  stale-locale draft can be saved.
- **`normalizeListParams` cannot loop** (`admin-page.ts:580-616`): `dirty` is only set when
  a raw string differs from its parsed canonical value, and the returned params then differ
  from the current URL — so the normalization navigation always converges in one step, for
  all four params (`guidancePage/Size`, `shelterPage/Size`).
- **The unconfirmed queue is not hollowed out by the shelters paging** [in-flight] — verified
  end to end, not just asserted: `loadQueue()` calls `listShelters()` with no filters
  (`admin-page.ts:728-734`), the gateway omits `limit` and produces the bare path
  (`admin-gateway.ts:576-593`), and the backend treats an absent `limit` as "no paging"
  (`AdminController.java:131-146`).
- **`ConfirmAction`** (6 instances in the admin page) is a signal-backed state machine; the
  one raw `setTimeout(0)` (`confirm-action.ts:76`) is ordered after the signal write's
  scheduled CD, so the focus target exists when it runs.

### Fixed

None. This is a read-only review: **no source file was modified**; the only file created is
this report.

### Findings

#### F1 — P1 (Medium-High) [in-flight]: a URL-driven reload is silently dropped while a list fetch is in flight, leaving the URL and the view disagreeing

- **Where:** `frontend/src/app/features/admin/admin-page.ts:643-645` (shelters) and
  `:623-625` (guidance):
  ```ts
  const live = this.shelterRows() !== null || this.shelterLoadError() !== null;
  if (!firstVisit && (!live || key === this.sheltersViewKey)) {
    return;                        // ← no reload, and no later re-check
  }
  ```
  Writers that set `rows = null` for the whole load: `loadShelters()` `:822-824`,
  `loadGuidance()` `:1352-1354`. Triggers that rely on the emission reloading:
  `onSourceChip` `:889-899`, `onSearchSubmit` `:866-884` (page>1 branch), `onGuidanceSubmit`
  `:1407-1416`, `onGuidanceSearchClear` `:1418-1424`, back/forward.
- **What is wrong:** `!live` means "a fetch is in flight" (both the rows and the error are
  null). Any query-param change in that window returns early *without* updating the signals
  and *without* reloading, and nothing re-checks the URL when the in-flight promise settles.
  Repro (Shelters tab, first visit): click **Shelters** → the paged list starts loading (the
  toolbar with the chips stays rendered above the loading branch, `admin-page.html:222-249`,
  and the chips are only disabled by `busy()`, not by the load) → click **Community** during
  that load → the URL becomes `?source=USER` but `shelterSource()` stays `'ALL'`, the
  in-flight unfiltered response renders with the **All** chip active. Re-clicking Community
  does *not* recover: the router skips a same-URL navigation by default
  (`@angular/router` 22.1.5: `_router-chunk.mjs:3833-3836` + `onSameUrlNavigation = 'ignore'`
  at `:4520`) so no emission is produced — the admin must toggle another chip or switch tabs.
  The same drop applies to a Back/Forward step and to a guidance search submitted during a
  load.
- **Why it matters:** the spec this lane implements states "**URL is the state**: every
  control … lives in the route query; no component-local hidden state for view parameters"
  (`ADMIN-LANE-SPEC.md`, "Shared contract"). The guard re-introduces exactly that hidden
  state: a refresh, a copied link or the next tab visit shows a different list than the one
  on screen, and the reported "search/chip relies on the URL emission" fixes (§"Bugs the new
  specs caught" 1-2 of `ADMIN-LANE-REPORT.md`) are defeated whenever the click lands during a
  load. The specs cannot catch it: every helper awaits (`admin-page.spec.ts:470-477`
  `settle()`, `516-524` `toShelters`), so no test ever observes an in-flight list.
- **Suggested fix:** drop the `!live` clause and compare only the view key
  (`if (!firstVisit && key === this.sheltersViewKey) return;`) — the key is written by every
  load, so this still prevents the double load the clause was added for — or, if the intent
  is to avoid piling up requests, re-run the sync from the load's `.then`/`.catch`
  (`if (seq === this.seq) this.onQueryChange(this.route.snapshot.queryParams)`).

#### F2 — P2 (Medium) [in-flight]: the shelters list has no fetch-sequence guard, so two loads can land out of order and render a superseded filter

- **Where:** `admin-page.ts:822-834` (`loadShelters`) and `:845-861` (`refreshShelters`
  writes `shelterTotal.set` / `shelterRows.set` at `:859-860` with no guard), versus the
  sibling guidance path which *does* guard (`guidanceFetchSeq` at `:1356`, compared at
  `:1371`/`:1381`) and the public precedent (`guidance-list-page.ts:118-121`,
  `shelter-detail-page.ts` `fetchSeq`).
- **What is wrong:** three writers (`loadShelters`, `refreshShelters`, and the same again via
  a tab re-entry) can be in flight at once and the last response to *arrive* wins, not the
  last one *issued*. Reachable path: a review action (Confirm/Reject/Hide) starts
  `refreshShelters()`; when its first await resolves the rows are still loaded, so it reads
  `source`/page/size (`:852-858`) and fires the page fetch; the admin then flips the source
  chip (allowed — `live` is true, so F1's guard does *not* block this one) and that load
  resolves first; the older page fetch then lands and re-renders the previous filter's rows
  under the new chip/URL permanently (no later load corrects it).
- **Why it matters:** stale-moderation-data risk in a tool whose purpose is filtering the
  queue. The failure is intermittent (a sub-second window), untested, and inconsistent with
  the discipline the file itself documents for guidance ("a superseded load must not
  overwrite a newer one", `:1346-1350`).
- **Suggested fix:** one monotonic counter per list, incremented in `loadShelters` *and*
  `refreshShelters`, captured and compared before every `.set` — the pattern already used 40
  lines below for guidance.

#### F3 — P2 (Low): `index(row)` is a linear scan called three times per rendered row (the earlier sweep's P2-3, confirmed at its new location)

- **Where:** `frontend/src/app/features/admin/guidance-order-list.ts:118-120`
  (`return (this.rows() ?? []).findIndex((r) => r.id === row.id);`) called from
  `guidance-order-list.html:121`, `:130`, `:139` inside `@for (… track row.id)` (`:53`).
- **What is wrong:** 3 × n linear id scans per change-detection pass (O(3n²)), each also
  re-evaluating `this.rows() ?? []`. The extraction from `admin-page.ts` (previous sweep
  reported it at `admin-page.ts:1416`, pre-extraction — `guidanceIndex()` no longer exists)
  **moved** the code, it did not fix it. One thing the lane did improve: the new
  `!reorderable() ||` prefix short-circuits the call on multi-page lists, where reordering is
  off, so the cost now only applies to single-page scopes (≤100 rows → ≤30k id comparisons
  per pass — small, which is why this stays Low).
- **Why it matters:** avoidable work on the app's largest table, in the exact shape
  ("heavy logic in a template") this review targets; it scales with the row count while the
  answer (`$index`) is already available.
- **Suggested fix:** `@for (row of rows() ?? []; track row.id; let i = $index)` and compare
  `i <= 0` / `i >= (rows() ?? []).length - 1`, or expose
  `computed(() => new Map(rows.map((r, i) => [r.id, i])))`.

#### F4 — P2 (Low): route query params are read once at construction/`ngOnInit` on components the router reuses (the earlier sweep's P2-6, confirmed)

- **Where:** `features/auth/login-page.ts:49-52` (`session`/`returnUrl` read into
  `sessionExpired`/`destination`), `features/account/verify-page.ts:148-154`
  (field-initializer IIFE reading `returnUrl`), `features/shelter/submit-shelter-page.ts:312`
  (`?edit=` read in `ngOnInit`).
- **What is wrong:** `BaseRouteReuseStrategy.shouldReuseRoute` is
  `future.routeConfig === curr.routeConfig` (`_router-chunk.mjs:4211-4213`, still the
  default), so a query-only navigation to the same route reuses the instance and never
  re-runs the initializer/`ngOnInit`. Repro: `/login?session=expired&returnUrl=/account` →
  Back to `/login` → the component is reused, `sessionExpired` stays true and
  `destination` stays `/account`.
- **Why it matters:** navigation-driving state can disagree with the URL the user is on.
  Impact is benign (a plausible destination, no leakage) hence Low — but note it does **not**
  apply to the admin page's `route.snapshot.queryParams` reads inside click handlers, which
  are re-readable and current (the snapshot is reassigned on every navigation:
  `advanceActivatedRoute`, `_router-chunk.mjs:1633-1641`). See the "contradicted" note below.
- **Suggested fix:** derive from a signal — `toSignal(this.route.queryParamMap)` or a
  `queryParams` subscription with `takeUntilDestroyed` (the admin/guidance pages already do
  this properly).

#### F5 — P2 (Low): the "paramMap completes on deactivate" rationale is false for router 22.1.5 (the earlier sweep's P2-5, confirmed — still uncorrected)

- **Where:** `features/shelter/shelter-detail-page.ts:475-480` and
  `features/guidance/guidance-detail-page.ts:114-119` ("paramMap replays the current params on
  subscribe and completes when the route deactivates, so the subscription needs no manual
  teardown").
- **What is wrong:** in the installed router, `ActivatedRoute.params` *is* a plain
  `BehaviorSubject` created per activation (`_router-chunk.mjs:1434-1471`, `:2144`) and the
  only `complete()` calls in the bundle are on the router's `transitions`/
  `navigationTransitions` (`:3779`, `:4639`, i.e. only when the `Router` is destroyed);
  `deactivateRouteAndOutlet` (`:1797`) merely destroys the component instance. Nothing
  completes the route subjects on deactivation.
- **Why it matters:** the pattern's safety rests on a misstated framework invariant. I could
  not construct an observable failure (a deactivated route object is unreachable, so no
  further emission reaches the callback and the subscription is collected with it) — hence
  Low, not a live bug — but the claim will mislead the next reader, and `takeUntilDestroyed`
  is used nowhere in the repo, so there is no house idiom to fall back on.
- **Suggested fix:** `this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(…)` in the same
  field initializer, or correct the comment to state the real reason ("the router drops the
  deactivated route object, so the subscription dies with the component — no completion is
  sent").

#### F6 — P2 (Low): the impure `t` pipe's justification is wrong by ~2 orders of magnitude

- **Where:** `core/i18n/translate-pipe.ts:8-11` ("`pure: false` on purpose … **The chrome is
  the only pipe consumer**, so the per-CD evaluation cost is negligible") + `:22`
  (`@Pipe({name: 't', pure: false})`).
- **What is wrong:** measured in this tree: **160** `| t` bindings in `admin-page.html`
  alone (34 of them inside the shelters row block), 86 in `account-page.html`, 58 in
  `shelter-detail-page.html`, 46 in `map-page.html`, 25 in `page-shell.html` — i.e. every page,
  not the chrome. Each evaluation runs `I18nService.t()` → `overrideFor()` (three property
  lookups + a `siteTexts()` read) + `catalogVersion()` + a catalog lookup
  (`i18n.service.ts:236-256`). At the max page size (100 rows) an admin CD pass performs
  ~3,400 impure-pipe evaluations (≈34/row) plus the per-row helpers in F9.
- **Why it matters:** the decision (`pure: false`) is sound — a runtime locale switch with no
  reload requires re-evaluation, and signals+OnPush confine the cost to dirty views; there is
  no DOM churn because interpolation compares before writing. The defect is the *comment*: it
  tells a future maintainer that impure-pipe cost is an app-wide non-issue, which is the
  opposite of what the code does.
- **Suggested fix:** correct the comment (state why it is acceptable despite ~400 call sites),
  or memoize on `(key, params, locale, siteTexts identity, catalogVersion)`. A pure pipe with
  the locale threaded as an argument (`'k' | t: i18n.locale()`) is the conventional escape
  hatch if profiling ever demands it.

#### F7 — P3 (Low) [in-flight]: the guidance search keeps two sources of truth for the same value, so the input and the applied filter can disagree

- **Where:** `admin-page.ts:618-630` (`syncGuidanceFromParams` writes `guidanceQuery`, never
  `guidanceSearch`), `:441-449` (the locale switch resets `guidanceQuery`/the URL but not the
  control), template `admin-page.html:899` (the Clear button keys off `guidanceQuery()`) and
  `:895` (`[formControl]="guidanceSearch"`).
- **What is wrong:** two ways to observe the term — the `FormControl` and the
  `guidanceQuery`/`?q=` state — are kept in sync only on the two handler paths. Opening
  `/admin?q=foo` (a shared link/refresh) or switching the content language leaves the input
  showing a term the list is not filtered by (or the reverse: a filter active with an empty
  input until the Clear button is used).
- **Why it matters:** cosmetic on its own, but it is the classic two-sources-of-truth shape
  inside code the lane just wrote, and it makes the "URL is the state" claim only ~half true
  for this control.
- **Suggested fix:** write the control in the sync (`this.guidanceSearch.setValue(q, {emitEvent: false})`)
  and in the locale reset, or drop `guidanceQuery` and read the control (the shelters tab
  deliberately does the latter for its tab-local term).

#### F8 — P3 (Low) [in-flight]: the two paged tabs re-fetch on *every* tab switch, contradicting the documented lazy-load rule

- **Where:** `admin-page.ts:706` `case 'shelters': this.syncSheltersFromParams(this.route.snapshot.queryParams, true)` and `:722` (guidance) — `firstVisit` is hard-coded `true`, and the guard short-circuits the key comparison whenever `firstVisit` is set (`:644`, `:624`). Compare `ngOnInit`'s comment `:663-668` ("the other tabs load lazily on first switch (a visit after a load keeps the in-memory rows)") and `switchTab`'s comment.
- **What is wrong:** every visit to Shelters/Guidance issues a fresh request + loading flash,
  while Reports/Alerts/Users/Media/Audit correctly use the `rows === null` lazy rule. The
  comment documents the rule the paged tabs break.
- **Why it matters:** needless round trips and a state flash on a tab the admin flips back and
  forth constantly; a documentation/behaviour mismatch that will be trusted later.
- **Suggested fix:** pass `false` and let the key comparison do the work (add "nothing loaded
  yet" to the condition), or correct the comment.

#### F9 — P3 (Low): time-dependent function calls in template bindings re-evaluate on every pass with a fresh `Date.now()`

- **Where:** `admin-page.html:331` `@if (occupancyText(row.occupancy); as occ)` and `:653`
  `{{ ageText(row.createdAt) }}` → `admin-page.ts:495-500`/`:511-513` → `shelter-copy.ts:392-401`
  (`now: number = Date.now()` default) and `:320` (`recencyText`).
- **What is wrong:** these are per-row, per-change-detection-pass evaluations whose result can
  *change with time alone*. The minutes-granularity buckets mean that if the value is computed
  in a CD pass and re-computed in the dev-mode verification pass across a minute boundary, the
  binding differs → `ExpressionChangedAfterItHasBeenCheckedError` (dev only, rare); in
  production the cost is a `Date.parse` + string build per occupancy row per pass. The same
  pattern already exists on the public pages (`map-page.html:304` vs the explicit-`now` calls
  elsewhere), so this is a pre-existing convention the lane extended, not a new invention.
- **Why it matters:** cheap to keep out of templates; the "no heavy logic in templates" rule
  applies to time-dependent formatting more than to anything else because it is non-idempotent.
- **Suggested fix:** compute once per load (`computed` over `rows` + a `now` signal refreshed on
  load), or pass a stable `now` captured at load time into the row's stored value.

#### F10 — P3 (Low): `ResendCountdown.active` is a plain boolean read by 15 template bindings

- **Where:** `shared/resend-countdown.ts:30` (`active = false;`, written at `:39`/`:52`), read
  in `auth/reset-page.html:39/44/152`, `account/account-page.html:218/221/240/245/329/332/351/356`,
  `account/verify-page.html:61/66/77/82`. (This corrects the earlier sweep's count of 8 — it is
  15 `.active` reads in the current tree, across three templates, since the account page renders
  two countdowns.)
- **What is wrong:** the app is zoneless + OnPush, so a view re-renders only when a signal it
  read changes; `active` is not a signal. I traced all three transition paths
  (`start` `:37-45`, `stop` `:51-56`, `tick` `:58-64`) and found **no reachable stale render
  today**: every `active` flip is accompanied by a `remaining` write in the same synchronous
  block (`active === true ⇒ remaining ≥ 1`, so `stop()`'s `remaining.set(0)` always changes
  the value). The correctness of 15 buttons therefore rests on an unstated invariant.
- **Why it matters:** any future path that flips `active` alone (pause/resume, `stop()` from an
  already-zero state, an externally driven re-arm) renders a stale disabled/label state with no
  error and no failing spec.
- **Suggested fix:** `readonly active = computed(() => this.remaining() > 0)` (writing
  `remaining` on every transition), or make `active` a signal set through `set()`.

#### F11 — P3 (Low): the new paging feature depends on `X-Total-Count`, which CORS never exposes

- **Where:** the header is produced (`AdminController.java:147`, `AdminGuidanceController.java:181`)
  and consumed (`admin-gateway.ts:557-566`, feeding `shelterPages`/`guidancePages`
  `admin-page.ts:245-250`, `348-353`, the control and the out-of-range notice), but the CORS
  bean sets no exposed headers (`config/SecurityConfig.java:167-176`: origins/methods/headers/
  credentials only), while `src/environments/environment.ts` documents a cross-origin
  deployment as supported ("Deployments with the API on another origin must set this to that
  origin").
- **What is wrong:** in a cross-origin deployment the JS client cannot read `X-Total-Count`
  (not a CORS-safelisted response header), so `pagedResult` falls back to `body.length`; a
  *full* last page then reports `total = size` → `pages = 1` → the pagination control
  disappears and the out-of-range notice never fires, and the size-change clamp
  (`admin-page.ts:940-945`) computes the wrong last page. The fallback's comment ("such a page
  IS empty — out-of-range detection stays honest", `admin-gateway.ts:560-564`) only covers the
  empty page. Default deployments (dev proxy, same-origin `apiUrl: ''`) are unaffected.
- **Why it matters:** a silently degraded paging contract in exactly the deployment the
  environment file tells operators to configure; the failure is invisible (no error, just a
  one-page list).
- **Suggested fix:** `config.setExposedHeaders(List.of("X-Total-Count"));` (one line). Flagging
  it here as well as for agents 4/11 so agent 12 can de-duplicate.

#### Minor consistency note (not a finding)

`shared/pagination.html:1` still uses the legacy `*ngIf` microsyntax with `NgIf` imported,
while every feature template (and the rest of this component's siblings) uses `@if`. Not
deprecated and not wrong — `NgIf` is only kept alive for this one line.

### Earlier sweeps: confirmed / corrected / contradicted

| Earlier claim | Verdict | Evidence |
| --- | --- | --- |
| Zoneless Angular 22, signals + OnPush everywhere, no NgModules | **Confirmed** | no `zone.js`/polyfills entry; 26/26 production components OnPush; zero `@NgModule` |
| No nested subscribes; every long-lived subscription torn down | **Confirmed** | all 13 non-spec subscribe sites read; 11 unsubscribed (`toObservable` self-completes too); the 2 `paramMap` ones are F5 |
| `toObservable(i18n.locale).pipe(skip(1))` is correct | **Confirmed**, with the mechanism | `rxjs-interop.mjs:74-93` `ReplaySubject(1)` + effect first-run after subscribe |
| All `@for` have `track`; no deprecated APIs; one `ApiClient` with `catchError → ApiError`; zero `any` | **Confirmed** | 11/11 tracks; zero `any`/`@ts-ignore`; single `inject(HttpClient)`; `delete<T = void>` etc. |
| One O(3n²) call in `admin-page.ts` (~1416) called 3× per row per pass | **Confirmed but relocated**, F3 | `guidanceIndex()` no longer exists; the code moved to `guidance-order-list.ts:118-120` + `.html:121/130/139`, now partly short-circuited by `!reorderable()` |
| Non-signal read driving 8 template bindings in `resend-countdown.ts` | **Confirmed, count corrected**, F10 | 15 `.active` reads across 3 templates; no reachable stale render — all three transition paths traced |
| Two files' comments claim router `paramMap` completes on deactivate (false in 22.1.5) | **Confirmed** — still uncorrected at `d247007`, F5 | router bundle: `BehaviorSubject`, no completion; `deactivateRouteAndOutlet` only destroys the component |
| Stale query-param snapshots on reused components | **Partly contradicted / refined** | The *one-shot* reads in field initializers/`ngOnInit` are a real issue (F4: login-page, verify-page, submit-shelter-page), but `route.snapshot.queryParams` read inside a *handler* is not stale — the snapshot is reassigned on every navigation (`advanceActivatedRoute`, `_router-chunk.mjs:1633-1641`), so the admin page's `route.snapshot` reads (`:706`, `:722`, `:921`, `:443`) are current; the only staleness window is mid-navigation, and the param-merging paths are insensitive to it |
| Impure-pipe comment misdescribes usage | **Confirmed with numbers**, F6 | 160 `t`-pipe bindings in `admin-page.html`, ~375 repo-wide (earlier sweep: 834 — the count depends on how parameterised calls are counted; either way "the chrome only" is false) |
| An earlier verdict: `strict` is on by default in TS 6.0, so the missing `"strict": true` is *not* a finding | **Confirmed independently** | I had flagged it, then disproved my own finding: a probe compiled with no config and no `--strict` errors with TS7006/TS2322/TS2564, so TS 6.0.3 defaults strict on and the app is strict-clean (`--strict` adds 0 errors) |
| Five lanes tripped over the async locale switch | **Not reproduced here** | The admin page's locale reset is correctly sequenced (see "Correct": six interleavings traced) |

### Areas found clean

- HTTP layer design: interceptors, typed responses, error mapping, operator choice (F11 is the
  only gap, and it is deployment-shaped, not code-shaped).
- Subscribe lifecycle and teardown across the whole app.
- Signal/computed usage: the new `computed`s (`unconfirmedRows` `:210-214`, `shelterPages`
  `:245-247`, `shelterOutOfRange` `:248-250`, `guidancePages`/`-OutOfRange` `:348-353`,
  `guidanceReorderable` `:357-359`) are pure derivations; the one sort inside a `computed` runs
  on dependency change only, not per CD pass.
- The in-flight guidance paging/search stream handling: the monotonic `guidanceFetchSeq` guard,
  the locale-in-the-key strategy, the URL normalization, and the search/page-reset composition.
- Standalone components, typed reactive forms, `@for`/`track`, and the absence of deprecated
  APIs.
- The lane's own test suite is green and the build/type-check are clean: `59 files / 1395 tests
  passed`, `ng build` OK, `tsc --noEmit` OK (so F1/F2 are untested paths, not broken builds).

### Merge verdict

**OK with notes.** The in-flight admin lane is well-built on the axes this review covers, and
the two earlier-sweep items that were "still open" are documentation/perf-shaped rather than
functional. **F1 must be fixed before release** (it silently voids the lane's own
"URL is the state" contract; it is a two-line change in code the lane just wrote), and F2
should be fixed in the same lane (one counter, copying the guidance path). F4/F5/F6/F10 are
small, independent follow-ups that predate this lane; F3, F7, F8, F9, F11 are Low.

### Top 5 findings

1. **F1 (P1, in-flight)** — a query-param change during an in-flight list fetch is dropped
   (`admin-page.ts:643-645`, `:623-625`), leaving the URL and the rendered list disagreeing and
   unrecoverable by re-clicking (same-URL navigation is skipped by the router).
2. **F2 (P2, in-flight)** — the shelters list has no fetch-sequence guard
   (`loadShelters`/`refreshShelters`, `admin-page.ts:822-861`) although the guidance path 40
   lines below has one, so a superseded filter's rows can win the race and stick.
3. **F3 (P2)** — `index(row)` (`guidance-order-list.ts:118-120`) is a linear scan invoked three
   times per rendered row per change-detection pass (the earlier sweep's O(3n²) finding,
   relocated by the extraction).
4. **F4 (P2)** — route query params are read once at construction/`ngOnInit`
   (`login-page.ts:49-52`, `verify-page.ts:148-154`, `submit-shelter-page.ts:312`) and go stale
   whenever the router reuses the component for a query-only navigation.
5. **F6 (P2)** — the impure `t` pipe's "the chrome is the only pipe consumer" comment
   (`translate-pipe.ts:8-11`) is false by ~2 orders of magnitude (160 bindings in the admin
   template alone), so the cost rationale for `pure: false` is mis-documented app-wide.
