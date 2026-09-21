# Review 07 — frontend clean code & dead code (agent 7 of 12)

Scope: `frontend/` (Angular app) — clean code, dead code, duplication, unused
components/services/pipes/routes/models/dependencies, `any`, business logic in
components/templates, hardcoded strings/URLs. Read-only: **no source file was modified**;
this report is the only file created.

Tree state at review time: last commit `d247007`, `git status --porcelain` = **31 entries**:
**22 from the in-flight lane** (20 modified + 2 untracked — 15 frontend files:
`core/{models,i18n/{en,et,ru,messages}}.ts`, `features/admin/{admin-page,guidance-order-list}.{ts,html,scss,spec}`,
`gateways/admin-gateway.{ts,spec}`; 5 backend files; `docs/api/openapi.json`;
`docs/autopilot/list-page-paging/ADMIN-LANE-REPORT.md` and a new
`AdminGuidanceSearchPagingIT.java`) plus **9 `reviews/*.md`** being rewritten by this sweep
(not part of the lane). The lane landing the admin list features
(paging, search, source filter) is **in flight** — half-applied admin state is treated as
unfinished below, and every finding that depends on it says so.

Every "unused" claim below was verified by scanning **all of `src/` including `*.spec.ts`,
`*.html` and `*.scss`**, plus `angular.json`/`scripts/`/`openspec/`/`docs/` where relevant,
and by compiling probes with the repo's own `typescript@6.0.3` / `@angular/compiler-cli@22.1.5`.

## Versions detected (judged against these)

`frontend/package.json` (installed versions read from `node_modules`)

| Tool | Declared | Installed | Notes |
| --- | --- | --- | --- |
| Angular | `^22.1.0` (`common`/`compiler`/`core`/`forms`/`platform-browser`/`router`) | 22.1.5 | standalone-by-default, signals, `@if`/`@for` |
| `@angular/cli` / `@angular/build` / `@angular/compiler-cli` | `^22.1.7` / `^22.1.7` / `^22.1.0` | 22.1.5 / 22.1.5 | `@angular/build:application` + `@angular/build:unit-test` |
| TypeScript | `~6.0.2` | **6.0.3** | `module: preserve`, `target: ES2022`, `importHelpers` |
| Test runner | `vitest@^4.0.8` + `jsdom@^28` | 4.x / 28.x | `angular.json` → `test.setupFiles: src/test-setup.ts` |
| RxJS | `~7.8.0` | 7.8.x | |
| Leaflet | `^1.9.4` (+`@types/leaflet`) | 1.9.x | CommonJS allow-listed in `angular.json` |
| Prettier | `^3.8.1` | 3.9.6 | `.prettierrc`, no npm script (see clean areas) |

Ignored: `node_modules`, `dist`, `.angular`, `target`, `src/vendor/**` (vendored Quill bytes,
`quill.js` + its `.d.ts` — not app code).

## A. The handed-down claims — confirmed, corrected or contradicted

| Handed-down claim | Verdict | Evidence |
| --- | --- | --- |
| `admin-page.ts` ≈2,072 lines (1,640 committed; lane added ~432) | **CONFIRMED exactly** | `wc -l` → 2072; `git show HEAD:…/admin-page.ts \| wc -l` → 1640; the template is 1223 lines, 151 members, 9 tabs |
| `shelter-copy.ts` hardcoded ~42 strings, catalog twins existed — *"since routed through a translate seam"* | **CONFIRMED, then PARTLY WRONG** | The seam is real (`ShelterTranslate`, `shelter-copy.ts:36`, `resolve()` `:45`, `EN_FALLBACK` `:40`) and only **one** raw literal is left (`INACCURATE_BADGE` `:178`). But **6 exported constants still bypass the seam** (`EN[...]` snapshots, resolved once at module load) — see **F1(c)** |
| 14 `bannerMessage` call sites omitted the callback — *"since fixed"* | **CONFIRMED for those 14, INCOMPLETE overall** | All 18 production call sites outside `admin-page.ts` now pass `(key) => this.i18n.t(key)`; **`admin-page.ts` still omits it at 29 sites** (`grep -c "bannerMessage("` → 29, none with a callback) — see **F1(a)** |
| `DISTANCE_COPY` duplicated translated `map.nearest.*` — *"since unified"* | **CONFIRMED fixed** | `shelter-detail-page.ts:77-83` is now `DISTANCE_KEY: Record<GeolocationFailureKind, MessageKey>` over `map.nearest.*` |
| `/register` lacked the min-length rule — *"added"* | **CONFIRMED fixed** | `register-page.ts:49` → `[Validators.required, Validators.minLength(8)]` with the comment at `:44-48` citing the server `@Size(min = 8)` |
| Dead exports + copy-pasted `.badge` styles were noted | **CONFIRMED, and both are worse than noted** | The 3 dead exports are still dead (**F3**); `.badge` is still copy-pasted in 4 stylesheets **and** the lane added a 2nd copy of `.chip` + a copy of the out-of-range block (**F4**, **F2(v)**) |
| *(a prior sweep reported the TS `strict` flag missing)* | **the hand-down is right — NOT re-filed; the earlier sweep was wrong** | Verified twice: (1) `node_modules/@angular/compiler-cli/bundles/chunk-72QPVCG5.js:4908-4910` → `get strictTemplates() { return this.options.strictTemplates !== false; }` (absent ⇒ **on**); (2) compiled a virtual probe with the repo's `typescript@6.0.3`: with `strict` **absent** → `"Type 'null' is not assignable to type 'string'"` + `"Parameter 'a' implicitly has an 'any' type."`; with `strict: false` → 0 diagnostics. TS 6.0 defaults the whole strict family **on** (`typescript.js:22255` → `compilerOptions[flag] === undefined ? compilerOptions.strict !== false : …`). `run1/07` P1-6 and `run1/01` F12 are **contradicted** — do not re-file |

## B. Findings

### F1 — The admin page bypasses every i18n seam: English banners, English copy constants, half-translated feedback — **High (P1)**, partly widened by the in-flight lane

The admin page is a **fully catalogued surface** (`messages.ts` carries the `admin.*` family;
its guidance/media tabs already use `this.i18n.t('admin.guidance.success.*')` /
`'admin.media.success.*'`), and it is reachable in **all three locales**: `app.html:1` mounts
`<app-page-shell />` for every route and the shell renders the locale switcher
(`page-shell.html:71-73` → `setLocale(code)` for `en`/`et`/`ru`). Four distinct holes:

**(a) 29 `bannerMessage()` calls without the translate callback** — `admin-page.ts:755, 773,
810, 838, 974, 1007, 1073, 1124, 1145, 1173, 1209, 1226, 1252, 1267, 1280, 1313, 1333, 1383,
1526, 1660, 1734, 1777, 1813, 1863, 1904, 1922, 1957, 1985, 2015`.
`error-copy.ts:126-131` falls back to the English `CLIENT_COPY` table
(`error-copy.ts:113`) while `error.rateLimited` / `_unauthorized` / `_checkInput` /
`_serverError` / `_valueInUse` / `_network` are translated in `en.ts:414-424`, `et.ts:420-430`
and `ru.ts`. So a 5xx, a 429 or an offline network while moderating shows English to an
Estonian/Russian admin. **Every other page in the repo passes the callback** (18 sites across
11 files: `login-page.ts:67`, `register-page.ts:93`, `reset-page.ts:127,146,179`,
`map-page.ts:767`, `account-page.ts:168`, `verify-page.ts:210`,
`contributions-panel.ts:203,209`, `submit-shelter-page.ts:335,680`,
`shelter-detail-page.ts:566,689,733,822`, `guidance-detail-page.ts:182`,
`guidance-list-page.ts:264`).
The in-flight lane added ~6 of these (`loadQueue` `:755`, `loadShelters` `:838`,
`refreshShelters`, the guidance load `:1383`).

**(b) 10 hardcoded English success banners in the same class** — `admin-page.ts:768`
(`'Location confirmed.'`), `:805` (`'Location rejected.'`), `:972`
(`'Shelter hidden.' / 'Shelter restored.'`), `:1005` (`'Shelter deleted.'`), `:1068`
(`'Question sent to the submitter.'`), `:1119` (`'Marked as inaccurate.'`), `:1142`
(`'Inaccurate mark cleared.'`), `:1224` (`'Report dismissed.'`), `:1250`
(`'Shelter restored.'`), `:1311` (`'User suspended.' / 'User unsuspended.'`) — while 10 sibling
sites in the *same* file use the catalog (`:1631, :1644, :1653, :1726, :1775, :1855, :1902,
:1955, :1978, :2013`). Half a file translated is worse than none: the pattern is invisible.

**(c) Three copy constants consumed only by the admin that can never localize** — the seam
was applied to the *functions* but the lane/earlier fix left the *constants* as `EN[...]`
snapshots or a raw literal:

| Constant | Rendered at | Same fact elsewhere |
| --- | --- | --- |
| `PRIVATE_LOCATION_BADGE = EN['shelter.privateBadge']` — `shelter-copy.ts:135`, re-exported `admin-page.ts:478` | `admin-page.html:135,319` → always `Private home (declared)` | `map-page.html:270`, `shelter-detail-page.html:22` use `'shelter.privateBadge' \| t` → `et.ts:319` `Privaatkodu (deklareeritud)`, `ru.ts:334` |
| `INACCURATE_WARNING = EN['account.contrib.inaccurate']` — `shelter-copy.ts:170`, `admin-page.ts:482` | `admin-page.html:304` → always English | the key **is** translated: `et.ts:531`, `ru.ts:544` |
| `INACCURATE_BADGE = 'Inaccurate'` — `shelter-copy.ts:178` (raw literal, no key), `admin-page.ts:483` | `admin-page.html:316` | no catalog key exists (the spec at `shelter-copy.spec.ts:518` calls it "admin-only literal (no key on purpose)") — the only keyless user-visible string left in that module |

The same badge/text therefore reads in **two languages inside one product** (public map in
Estonian, admin in English) — the exact drift the earlier sweep's P1-1 was about, now confined
to the admin surface.

**(d) The two seam-aware helpers are re-exposed without the callback** —
`admin-page.ts:476` `protected readonly sourceTrustLabel = sourceTrustLabelShared;` and
`admin-page.ts:492` `return occupancyTextShared(occ, now);`. Both fall to `EN_FALLBACK`
(`shelter-copy.ts:40-43`), while the *same* helpers are wired on the public pages:
`map-page.ts:235,242` and `shelter-detail-page.ts:190,197` pass `this.translate`
(`map-page.ts:211`, `shelter-detail-page.ts:158`). Rendered at `admin-page.html:313` (source
column) and `:331` (occupancy block) → the admin list is English for both.

**Why it matters:** user-visible wrong-language copy on a shipped surface, reachable today in
`et`/`ru`; the repo's own `docs/i18n-review.md` claims this class is catalog-driven; and the
specs currently *pin* the English literals (`admin-page.spec.ts:599,642,772,908,1087,1160,1520`),
so the drift looks intentional.

**Minimal fix:** add `private readonly translate = (key: MessageKey, params?: Record<string,
string \| number>): string => this.i18n.t(key, params);` (copy `map-page.ts:211`), pass it at
the four (d) sites, pass `(key) => this.i18n.t(key)` at all 29 (a) sites, add
`admin.shelters.success.*` / `admin.reports.*` / `admin.users.*` keys for the 10 (b) lines, and
replace the three (c) constants with `MessageKey`s resolved through the pipe (`| t`) or the
translate callback. Update the seven spec pins in the same commit. Cheap and mechanical —
the file already imports `I18nService`, `TranslatePipe` and `MessageKey`.

### F2 — The paging rules now live in 4-5 copies; the lane re-implemented the public page instead of reusing it — **Medium (P1 for the in-flight lane: fix it before this lands)**

This is the "duplicated logic introduced by the recent refactors" item. Seven distinct copies:

| Rule | Copies |
| --- | --- |
| Parse page (`Number.isInteger(n) && n >= 1 ? n : 1`) + clamp size to 10..100 step 10 (`Math.min(100, Math.max(10, Math.round(n/10)*10))`) | `admin-page.ts:2042-2056` (`parseListPage`/`parseListSize`) — **byte-identical**, comments included, to `guidance-list-page.ts:188-203` (`parsePage`/`parseSize`) |
| "last page at the new size" + clamp (`total > 0 ? max(1, ceil(total/size)) : 1`) | `guidance-list-page.ts:214`; `admin-page.ts:942`, `:1461`; plus the derivations at `:246`, `:349` and `:252` (public) — 6 sites |
| `X-Total-Count` → total, degrading to `body.length` | `admin-gateway.ts:557-568` (`pagedResult`) vs the inline copy in `guidance-gateway.ts:93-97` (`listPage`) |
| The page-result type | `PagedRows<T>` (`models.ts:599-605`, fields `rows`/`total`) vs `GuidancePageResult` (`guidance-gateway.ts:14-20`, fields `posts`/`total`) — two models for one header contract |
| Out-of-range markup (notice + first-page button) | `admin-page.html:261-268` **and** `:991-998` (differ only in the key and the handler) + `guidance-list-page.html:21-28` |
| Out-of-range CSS | new `.admin-oob` (`admin-page.scss:100-110`) is `.guidance-list__oob` (`guidance-list-page.scss:99-109`) verbatim |
| Write-the-view-to-the-URL (merge params, omit defaults, `replaceUrl`/push) | `navigateShelters` (`admin-page.ts:905-935`) vs `navigateGuidance` (`:1428-1451`); `onSheltersNavigate` (`:940-946`) vs `onGuidanceNavigate` (`:1459-1465`); `gotoSheltersFirstPage` (`:948`) vs `gotoGuidanceFirstPage` (`:1467`); `syncSheltersFromParams` (`:638-651`) vs `syncGuidanceFromParams` (`:618-631`) — the last two differ only in the view key's final member |

Adjacent coupling: the **Shelters** tab's default size and its size list come from the
**guidance/blog** feature — `admin-page.ts:42-43` imports `GUIDANCE_PAGE_SIZE` /
`GUIDANCE_PAGE_SIZES` from `gateways/guidance-gateway.ts`, uses them at `:240` (`shelterSize`),
`:347`, `:254` (`pageSizes`), `:2052` and renders them at `admin-page.html:616`.
`Pagination` already declares exactly that range as its own default
(`pagination.ts:45` `sizes = input<number[]>([10,20,…,100])`), so the admin's `[sizes]="pageSizes"`
bindings (`admin-page.html:616`, `:1026`) are no-ops — and the shelters list now silently
changes behaviour if the blog's page size ever changes.

**Why it matters:** these are domain rules (URL contract, bounds, header fallback) copied
across four files; a change in one copy (e.g. widening the size bound to the endpoint's 1..200)
leaves the others silently wrong, and no test pins the rule *in one place* — each copy has its
own spec, so drift passes CI.

**Minimal fix:** put the pure rules in one module next to the control — e.g.
`shared/paging.ts` exporting `parsePage`, `parseSize`, `lastPage`, `parseTotal(headers, body)`
— and have both pages and both gateways import it; unify the result type on `PagedRows<T>`
(drop `GuidancePageResult`, or make it an alias); move `PAGE_SIZE`/`PAGE_SIZES` into
`shared/pagination.ts` (the control's home) and let the admin import them from there (the
`[sizes]` bindings can then be deleted); extract the out-of-range block into a tiny
`shared/out-of-range` component or at least move both CSS copies into `styles.scss`.

### F3 — Dead exports and dead API surface, including two items the lane created or orphaned — **Medium (P2)**

Every item below was checked across the whole repo (all `*.ts`, `*.html`, `*.scss`, specs,
`angular.json`, `scripts/`, `openspec/`, `docs/`); "spec-only" means the **only** reference is
the symbol's own spec, i.e. production-dead code kept alive by a test.

- **New from the lane:** `AdminGateway.listGuidancePosts(locale?)` — `admin-gateway.ts:253`.
  Its only callers are `admin-gateway.spec.ts:431,434,441,444`; the admin page switched to
  `listGuidancePostsPage` (`admin-gateway.ts:267`, called at `admin-page.ts:1358`). Its private
  helper `guidanceListPath` (`admin-gateway.ts:524-526`) dies with it. Two ways to fetch the
  same endpoint now exist, and the gateway's own endpoint list documents both
  (`admin-gateway.ts:54`). *Fix: delete the un-paged method (and its two spec cases), or have
  the page use it when nothing is paged.*
- `AdminGateway.updateGuidanceTranslation` — `admin-gateway.ts:428`: **no production caller**
  (spec-only: `admin-gateway.spec.ts:657`); the panel only creates (`admin-page.ts:1630`) and
  deletes (`admin-page.ts:1854`) translations. Consequence: an existing translation cannot be
  corrected from the UI — you must delete and re-create (the create path 409s on an existing
  locale). *Fix: wire an edit path in `guidance-translations`, or delete the method; either way
  the current state is an undocumented dead endpoint.*
- **`shelter-copy.ts` constants with no production consumer** (each referenced only by
  `shelter-copy.spec.ts`, and each carrying a comment saying the surfaces use the `t` pipe):
  `PRIVATE_LOCATION_NOTE` `:143`, `COMMUNITY_UNVERIFIED_WARNING` `:155`, `REPORT_SUBMITTED`
  `:291`, `REPORT_SUBMITTED_DAMPED` `:301`. Verified live equivalents:
  `shelter-detail-page.html:63` `'shelter.privateNote' | t`, `map-page.html:163` +
  `shelter-detail-page.html:52` `'shelter.unverifiedWarning' | t`, `shelter-detail-page.ts:809`
  `'shelter.notice.reportSubmitted(Damped)'`. *Fix: delete the four constants (the seam's
  function form is the live API).*
- `readCoordinate` — `form-helpers.ts:22`: the earlier sweep reported it as shared by both
  forms; it is not. `submit-shelter-page.ts:23` imports only
  `capacityValidator`/`nameBlankValidator`, `contributions-panel.ts:21` only
  `nameBlankValidator`; the only caller is `form-helpers.spec.ts:38-69`. *Fix: delete, or use
  it where a number control's raw value is read.*
- **Confirmed still dead** (handed down, unchanged, line numbers re-verified against the
  current tree): `ThemeRoot` — `theme-tokens.ts:151`; `isSiteTextKey` — `site-texts.ts:116`;
  `BODY_EDITOR_HEADER_VALUES` — `guidance-editor.ts:229` (note: `:221` in the earlier sweep is
  stale, the file grew; the value is still restated in the same file).
- `AdminShelterFilters.status` — `models.ts:582`: no production caller ever sets it (only
  `admin-gateway.spec.ts:77` exercises the query string); the admin UI has no status filter.
  *Fix: drop the field, or expose the filter.*

### F4 — Copy-pasted control styles: the lane added a second `.chip` and a second out-of-range block; the `.badge` base is still ×4 — **Low (P2)**

- `admin-page.scss:75-94` (`.admin-chips .chip`, new) is `.chip` (`map-page.scss:323-342`)
  declaration-for-declaration — `padding`, `border`, `border-radius`, `background`, `font-size`,
  `font-family`, `cursor`, `&:hover:not(:disabled)`, `&.chip--active` — the only differences are
  map's `flex: 1` vs admin's `min-height: var(--space-48)`. The new comment concedes
  "component styles are not shared", yet `styles.scss` already hosts the shared control layer
  (`.btn` `:544`, `.btn--ghost` `:582`, `.field` `:487`).
- `.admin-oob` (`admin-page.scss:100-110`) duplicates `.guidance-list__oob`
  (`guidance-list-page.scss:99-109`) exactly (see F2(v)).
- Unchanged from the hand-down (line numbers re-verified against this tree — the admin copy
  moved into the new admin partial): the `.badge` base is copy-pasted in **four** stylesheets —
  `map-page.scss:462`, `admin/_admin-shared.scss:214`, `shelter-detail-page.scss:37`,
  `account-page.scss:130` — each repeating the same five declarations
  (`--text-2xs` / `--font-weight-semibold` / `--space-2 --space-4` padding / `--radius-full` /
  the `--color-badge-registry`+`--color-shelter-registry` pair), with the modifiers re-declared
  per file (`&.badge--new` at `map-page.scss:508`, `shelter-detail-page.scss:83`,
  `_admin-shared.scss:238`, and the fifth variant `.contrib-badge` at
  `contributions-panel.scss:79`). `styles.scss` still defines **no** `.badge` base (its 31
  "badge" hits are token definitions and contrast notes), while it does own `.btn` (`:544`),
  `.btn--ghost` (`:582`) and `.field` (`:487`).

  *Fix: move `.chip`/`.chip--active`, `.badge` + its shared modifiers and an `.out-of-range`
  block into `styles.scss` next to `.btn`; keep only genuinely layout-local overrides in the
  component stylesheets. `design-tokens.spec.ts` + the component specs guard the move.*

### F5 — The new URL contract is spelled as bare string literals at ~20 sites in one file — **Low (P3)**

`admin-page.ts`: `'guidancePage'` ×5 (`:436, :600, :620, :1439, :1441`), `'guidanceSize'` ×5
(`:437, :601, :621, :1446, :1448`), `'shelterPage'` ×4 (`:601, :640, :920, :922`),
`'shelterSize'` ×4 (`:601, :641, :927, :929`), plus `'q'` ×4 and `'source'` ×3. The same name is
written in one branch and read in another; a single typo (e.g. normalizing `shelterPages` while
the sync reads `shelterPage`) makes the URL silently stop round-tripping, and only the specs
that assert `router.url` would notice.

*Fix:* one frozen table (`const VIEW_PARAMS = { shelters: { page: 'shelterPage', size:
'shelterSize' }, guidance: { page: 'guidancePage', size: 'guidanceSize' }, q: 'q', source:
'source' } as const`) and reference it from the four routines — this also makes F2's
`navigateX` extraction trivial.

### F6 — `q` is the *guidance* search's URL key while the shelters search is tab-local: an asymmetric contract on a shared route — **Low (P3)**

The same code deliberately namespaces everything else (`guidancePage`/`shelterPage`, and
`admin-page.spec.ts` asserts `router.url).not.toContain('page=2')` for exactly that reason),
but the guidance search uses the bare **`q`** (`admin-page.ts:620` read, `:1434` write)
while the shelters search is intentionally **not** in the URL (`admin-page.ts:230-232`,
`onSearchSubmit` `:866-880`). Today that is documented and harmless — but it means:
1. while the admin is on the Shelters tab, `?q=kelder` in the address bar refers to the
   *guidance* term, i.e. the visible list and the URL disagree;
2. the natural next step (make the shelters search URL-backed like its own source/page/size)
   will collide with the guidance term, and the collision will be silent.

*Fix now, while the specs are fresh:* rename to `guidanceQ` (or `gq`) — a three-line change
plus the two spec assertions — or state the `q`-scoping exception in the route contract.

### F7 — Note: every moderation action now refetches the whole un-paged shelter list — **Low (P3)**

`refreshShelters` (`admin-page.ts:845-860`) unconditionally refetches the **entire, un-paged**
shelter list for the queue (`:846` `this.admin.listShelters()`, no `limit`) and then the
Shelters page when it is live; it is called from five action paths (`:769, :807, :1069, :1120,
:1143`). The lane's own spec now asserts `toHaveBeenCalledTimes(4)` where it asserted `2`
(`admin-page.spec.ts` diff), i.e. two list requests per click, one of them the full table while
the queue is off-screen. This is a *deliberate* trade-off (the queue is a client-side filter of
the whole scope and `reviewStatus` has no server filter), so it is reported as a note, not a
defect: the alternative is to refresh the queue only when the Unconfirmed tab is active or has
been visited *and* the tab switch re-loads it (`switchTab` currently does not re-load
`unconfirmed`, `admin-page.ts:737`).

## C. Areas checked and found clean

- **`any` / disabled checks: none.** `grep` for `: any`, `as any`, `<any>`, `any[]`, `$any(`,
  `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` over all of `src/` (excluding `src/vendor`)
  matches only prose inside comments (e.g. `api-error.ts:158`, `token-store.ts:20`) and
  `expect.any(...)` in specs. Implicit `any` and `null` flow are compiler-enforced on
  (`strict`/`strictNullChecks` default **on** in TS 6.0.3 — see section A), and
  `strictTemplates` is on by default in Angular 22.1.5.
- **Unused TS imports and unused `@Component.imports` entries: none.** Scripted: for every
  `*.ts` in `src/`, each imported identifier was searched in the rest of the file (0 hits), and
  for every standalone component each `imports:[…]` entry was resolved to its selector/pipe
  name and searched in the template (0 hits, after mapping `TranslatePipe`→`| t`,
  `RouterLink`→`routerLink`, `RouterOutlet`→`router-outlet`, `ReactiveFormsModule`→`formControl`
  etc.).
- **Unused npm dependencies: none, with evidence.**
  `@angular/{common,forms,router}` are imported directly; `@angular/platform-browser` via
  `main.ts:4` + `core/title.ts:3`; `@angular/compiler` is a **required (non-optional) peer** of
  both `@angular/compiler-cli` (`peerDependencies["@angular/compiler"] = 22.1.5`) and
  `@angular/build`, i.e. it is needed for the AOT build; `rxjs` throughout; `tslib` via
  `importHelpers: true` + `@angular/core`'s dependency; `leaflet` + `@types/leaflet` in
  `shared/leaflet-service.ts`; `typescript`/`@angular/cli`/`@angular/build`/
  `@angular/compiler-cli` are the `ng`/`ngc`/`tsc` toolchain; `vitest` + `jsdom` are the
  configured runner/environment (`angular.json` → `@angular/build:unit-test`, whose schema
  documents "when not specified, tests are run in a Node.js environment using jsdom", and
  `test-setup.ts` relies on jsdom behaviour); `prettier` is used by the repo's documented
  per-change gate (`openspec/changes/**/tasks.md`: `npx prettier --check` on touched files).
  No dependency is unused; the only nit is that `prettier` (and `@angular/compiler`) would read
  better as a `devDependency` — cosmetic, not a finding.
- **Unused components / pipes / routes / models: none found.** Every `@Component` selector is
  referenced from a template or a route; `TranslatePipe` is the only pipe and is used in every
  feature template; there are **0** NgModules and no directives. All 13 component routes in
  `app.routes.ts` carry a `title` key (the two redirect-only entries `''` and `'**'` need none)
  and every `routerLink` target resolves to a declared path
  (`/map /login /register /reset /verify /account /privacy /terms /shelters/:id /blog
  /blog/:slug /submit /admin`), with `title.spec.ts` checking the titles against all catalogs.
  Every exported model type has a live consumer through the DTO graph (`grep` + a per-export
  consumer scan).
- **Commented-out code, `console.*`, `debugger`, `TODO`/`FIXME`: none.** No commented-out TS
  statements or template markup; the single `console.*` in `src/` is `main.ts:15`
  (`bootstrapApplication(...).catch(console.error)` — Angular's canonical bootstrap handler).
- **`@Injectable` services: no dead methods.** Scanned every `@Injectable` class method for an
  external caller: the only hits are constructors (false positives). `GuidanceGateway.list()`
  *looks* dead now that `listPage()` exists, but it is still used by the admin's publishedAt
  merge (`admin-page.ts:1392-1393`) — **not** a finding.
- **Business logic in templates: still clean.** The admin template (1223 lines) contains no
  arithmetic, sorting, filtering or domain predicates — only `@if`/`@for`, `… .length === 0`
  guards and the `aria-pressed` ternaries (`admin-page.html:22-94`); the new paging templates
  delegate to `page()/pages()/size()` inputs and emit `{page, size}`.
- **API paths: still single-sourced.** Each `/api/...` and `/admin/...` string is built in
  exactly one gateway function; `ApiClient` remains the only `HttpClient` consumer and maps
  every failure to `ApiError` in one `catchError` (`api-client.ts:36-65`); the new
  `getWithHeaders` seam is used by exactly the two paged gateway calls + the public one, with
  no second HTTP path.
- **Hardcoded external URLs: bounded and identifiable** (unchanged from the hand-down, still
  not worth a finding): OSM tiles + attribution `leaflet-service.ts:126,129`,
  `Nominatim` `geocode-gateway.ts:28` (already a named const), the three OSM copyright links in
  `map-page.html:111` / `submit-shelter-page.html:179`, Google/Apple directions
  `shelter-detail-page.ts:603,612`.
- **The in-flight paging logic itself is functionally sound.** I traced the URL→state→load
  paths (`onQueryChange` `:564`, `normalizeListParams` `:580`, the two `syncXFromParams`, the
  two `navigateX`, the size-change clamp, the `replaceUrl` normalization, the locale-change
  reset at `:416-450` and the `guidanceViewKey` suppression of the duplicate load) and found no
  incorrect state transition, no double fetch and no lost update; the monotonic `fetchSeq`
  guards (`:1354`) and the in-place total patches (`:1004`, `:1642`, `:1767`) are consistent
  with their consumers, and the added specs assert behaviour (URL + gateway call shape) rather
  than implementation details. The problems in that code are structural (F2, F5, F6), not
  functional — it is *not* a defect that the lane is half-applied.

## D. Top 5 findings

1. **F1 — the admin page bypasses every i18n seam (High).** 29 `bannerMessage` calls without
   the callback (`admin-page.ts:755,773,810,838,974,1007,1073,1124,1145,1173,1209,1226,1252,
   1267,1280,1313,1333,1383,1526,1660,1734,1777,1813,1863,1904,1922,1957,1985,2015`), 10
   hardcoded English success banners (`:768,805,972,1005,1068,1119,1142,1224,1250,1311`), three
   `EN[...]` copy constants consumed only there (`shelter-copy.ts:135,170,178` → repeated
   badges in two languages; the `INACCURATE_BADGE` literal has no key at all) and two helpers
   re-exposed without `translate` (`admin-page.ts:476,492`). The ET/RU admin sees English
   today. The hand-down's "since fixed" covers only the non-admin pages (run1's 14 sites plus
   the rest — 18 call sites outside `admin-page.ts` pass the callback today).
2. **F2 — the paging domain rules are now in 4-5 copies (Medium; blocking for this lane).**
   `parseListPage`/`parseListSize` (`admin-page.ts:2042-2056`) are byte-identical to
   `parsePage`/`parseSize` (`guidance-list-page.ts:188-203`); the `X-Total-Count` fallback is
   duplicated (`admin-gateway.ts:557-568` vs `guidance-gateway.ts:93-97`); two result types
   (`PagedRows<T>` vs `GuidancePageResult`); the out-of-range block ×3 and its CSS ×2; the
   navigate/sync/goto routines ×2; and the admin imports the blog's
   `GUIDANCE_PAGE_SIZE(S)` (`admin-page.ts:42-43,240,254,347`). Extract `shared/paging.ts` +
   one page-result type, and move the size constants to `shared/pagination.ts`.
3. **F3 — dead code, including two items the lane created/orphaned (Medium).**
   New: `AdminGateway.listGuidancePosts` (`:253`) + its `guidanceListPath` helper, superseded by
   `listGuidancePostsPage` — spec-only callers remain. Also spec-only: four `shelter-copy.ts`
   constants (`:143,155,291,301`), `readCoordinate` (`form-helpers.ts:22` — the earlier sweep's
   "used by both forms" is wrong), `updateGuidanceTranslation` (`admin-gateway.ts:428`, which
   also means a translation cannot be edited in the UI), plus the re-confirmed `ThemeRoot`
   (`theme-tokens.ts:151`), `isSiteTextKey` (`site-texts.ts:116`),
   `BODY_EDITOR_HEADER_VALUES` (`guidance-editor.ts:229`) and the never-set
   `AdminShelterFilters.status` (`models.ts:582`).
4. **F4 — copy-pasted styles, two of them added by this lane (Low).** `.admin-chips .chip`
   (`admin-page.scss:75-94`) duplicates `.chip` (`map-page.scss:323-342`) and `.admin-oob`
   (`admin-page.scss:100-110`) duplicates `.guidance-list__oob` (`guidance-list-page.scss:99-109`)
   verbatim, in a repo whose `styles.scss` already owns `.btn`/`.field`; the `.badge` base is
   still copy-pasted ×4 (unchanged from the hand-down).
5. **F5 — the new URL contract is 20 bare string literals in one file (Low).**
   `'guidancePage'/'guidanceSize'/'shelterPage'/'shelterSize'/'q'/'source'` are written and read
   across `admin-page.ts:436-437,600-601,620-621,640-641,920-929,1439-1448`: one typo silently
   breaks URL round-tripping. Freeze the names in one table (which also makes F2's
   `navigateX` extraction mechanical). Runner-up: **F6** (bare `q` is the guidance search's key
   on a shared route — a latent collision) and **F7** (each moderation action refetches the
   whole un-paged shelter table as well as the page).

**Honest verdict:** no **Critical** finding. The frontend is a disciplined codebase — zero
`any`, zero unused imports/dependencies/components/routes, no commented-out code, no dead
service methods, templates free of business logic, and an in-flight paging feature whose
*logic* I could not fault. The real weaknesses are (a) one surface — the admin page — left
outside the i18n seam the rest of the app adopted, (b) the lane re-implementing the public
page's paging rules four times instead of extracting them, and (c) dead code (two gateway
methods, four copy constants, one form helper and three re-confirmed exports) that only its own
specs keep alive.
