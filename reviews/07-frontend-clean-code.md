# Review 07 — frontend clean code & dead code (agent 7 of 12)

Scope: `frontend/` (Angular app). Read-only: no source file was modified; this report is the only file created.
Tree state at review time: frontend source committed; uncommitted changes exist in `frontend/src/app/features/shelter/shelter-detail-page.html`
(prettier reflow of two `<time>` blocks, lines ~507–525) and `frontend/src/app/shared/shelter-copy.spec.ts` (added cross-pins only).
Neither touches the lines cited below.

## Versions detected (judged against these)

`frontend/package.json`

| Tool        | Version                                                                                            | Notes                                                      |
| ----------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Angular     | `^22.1.0` (core/common/forms/router/platform-browser), `@angular/cli` + `@angular/build` `^22.1.7` | standalone-by-default, signals, `@if/@for` control flow    |
| TypeScript  | `~6.0.2` (installed 6.0.3)                                                                         | `module: preserve`, `target: ES2022`                       |
| Test runner | `vitest@^4` via `@angular/build:unit-test` + `jsdom@^28`                                           | `angular.json` → `test.setupFiles: src/test-setup.ts`      |
| Map         | `leaflet@^1.9.4` (+`@types/leaflet`)                                                               | CommonJS allow-listed in `angular.json`                    |
| RxJS        | `~7.8.0`                                                                                           |                                                            |
| Prettier    | `^3.8.1`                                                                                           | configured (`.prettierrc`), **no** npm script              |
| Linter      | **none**                                                                                           | no ESLint, no `ng lint` target, no CI workflow in the repo |

Ignored throughout: `node_modules`, `dist`, `.angular`, `src/vendor/**` (vendored Quill bytes).

## Method

- Static reading with `rg`/`grep` and small scripts; every "unused" claim was checked repo-wide (all of `src/`, including `*.spec.ts`, `*.html`, `angular.json`, `proxy.conf.json`).
- Dead-code and strictness claims were **compiler-verified**, not eyeballed: a byte-identical copy of `frontend/src` was made under `/tmp/probe` (symlinked `node_modules`) and compiled with `ngc`/`tsc` under stricter settings. Nothing in the repository was touched.
- The Angular test suite was not executed (out of scope for a read-only clean-code review, and the tree contains another agent's in-flight spec edits).

---

## A. The three handed-down claims — independently confirmed

**A1. `admin-page.ts` is a 1654-line, 9-tab component with only 2 extracted tabs — CONFIRMED (and worse than "large").**

- `src/app/features/admin/admin-page.ts` = 1654 lines (`wc -l`), **54** methods/accessors.
- `AdminTab` union (`admin-page.ts:69-78`) = 9 members: `unconfirmed, shelters, reports, alerts, users, guidance, media, settings, audit`.
- `src/app/features/admin/admin-page.html` has **9** `@if (tab() === '…')` section blocks (`admin-page.html:102, 216, …`).
- Only 2 tabs are extracted as child components (`GuidanceEditor`, `SiteTextsPanel`) — `admin-page.ts:200-210`.

**A2. `shelter-copy.ts` hardcodes user-visible copy while the catalogs already carry translated twins — CONFIRMED, with a higher count than handed down.**

`src/app/shared/shelter-copy.ts` (420 lines) contains **42** user-visible copy strings (28 plain literals + 14 template patterns such as
`` `Reported (${nonexistentReports})` ``, `` `Last verified ${ago}` ``, `` `Community reports: ${reportCount} (total, all types)` ``).
Of those, **9 plain strings already have catalog twins that are translated in ET _and_ RU**:

| `shelter-copy.ts` literal                      | line | existing catalog key(s)                                    | ET value                         |
| ---------------------------------------------- | ---- | ---------------------------------------------------------- | -------------------------------- |
| `'Newly added'`                                | 27   | `account.contrib.badge.new`                                | `Uus kogukonnalt`                |
| `'Community-checked'`                          | 29   | `account.contrib.badge.confirmed`                          | `Kogukonna poolt kinnitatud`     |
| `'Rejected'`                                   | 31   | `account.contrib.badge.rejected`                           | `Tagasi lükatud`                 |
| `'Päästeamet registry'`                        | 47   | `account.contrib.source.paasteamet`                        | `Päästeameti register`           |
| `'Municipal registry'`                         | 50   | `account.contrib.source.municipality`                      | `Kohaliku omavalitsuse register` |
| `'Reported inaccurate — details may be wrong'` | 120  | `account.contrib.inaccurate`                               | `Teatatud ebatäpseks — …`        |
| `'Space available'`                            | 247  | `detail.band.space`, `detail.pulse.kind.space`             | `On vaba mahtu`                  |
| `'Getting full'`                               | 248  | `detail.band.gettingFull`, `detail.pulse.kind.gettingFull` | `Täitumas`                       |
| `'Full'`                                       | 249  | `detail.band.full`, `detail.pulse.kind.full`               | `Täis`                           |

(Handed down as "5 of them"; the verified number is 9. RU twins verified at `ru.ts:490-497` and `ru.ts:264-266`.)

**A3. `frontend/tsconfig.json` has neither `strict` nor `strictTemplates` — CONFIRMED, and enabling both is provably free.**

`frontend/tsconfig.json` `compilerOptions` (lines 7-17) sets only `noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`, `skipLibCheck`, `isolatedModules`, `experimentalDecorators`, `importHelpers`,
`target`, `module`; `angularCompilerOptions` (lines 17-21) sets only `enableI18nLegacyMessageIdFormat: false`,
`strictInjectionParameters: true`, `strictInputAccessModifiers: true`. No `strict`, no `strictTemplates` — so
`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `useUnknownInCatchVariables`, `strictPropertyInitialization` are all OFF,
and template type-checking stays in the lenient mode.

**Verified cost of turning them on** (compiler-verified on a byte-identical copy of `src/`):

| Configuration                                                                                                           | Result                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `strict: true` + `strictTemplates: true` + `strictInjectionParameters` + `strictInputAccessModifiers`, all 70 app files | **0 errors** (`ngc` exit 0, empty output) |
| same, all 123 spec/bootstrap files (`tsconfig.spec` shape)                                                              | **0 errors** (`tsc` exit 0)               |
| additionally `noUnusedLocals: true` + `noUnusedParameters: true`, app files                                             | **0 errors** (`ngc` exit 0)               |

The harness was validated by injecting a deliberate defect and confirming it is caught: `{{ nonExistentProperty123 }}` →
`TS2339`, and `<app-banner severity="notASeverity" …>` → `TS2322 'notASeverity' is not assignable to type 'BannerSeverity'`
(the latter is rejected **only** with `strictTemplates: true`, proving the flag was in force).

Corroboration that "strict" is the intended state: `frontend/README.md:19` advertises `**TypeScript** (strict)`.

---

## B. Findings

### P1 (fix before release)

#### P1-1 — Localization is dual-sourced: trust/occupancy copy is hardcoded in `shelter-copy.ts` while the same strings are translated in the catalogs — **High**

- Wrong: `src/app/shared/shelter-copy.ts:24-52, 120, 123, 247-258` returns hardcoded English (`communityTrustLabel`, `sourceTrustLabel`,
  `INACCURATE_WARNING`, `OCCUPANCY_FIRM_COPY`, `OCCUPANCY_HEDGED_COPY`). Its consumers — `map-page.ts:220-225`,
  `shelter-detail-page.ts:181-186`, `admin-page.ts:415-422` — render those literals directly.
  The very same concepts are rendered from the catalogs elsewhere: `contributions-panel.ts:108-119` + `contributions-panel.html:71`
  (`account.contrib.*`), and `shelter-detail-page.ts:351-353` (`detail.band.*` picker) + `RECENT_KIND_KEYS` (`detail.pulse.kind.*`, `:89`).
- Why it matters: a user on `et` or `ru` sees the **same fact in two languages inside one view**. On `/shelters/:id` the
  "how full" picker and the recent-reports rows render `Täitumas`/`Täis` (catalog) while the occupancy badge and
  `occupancyText()` line above them render `Getting full`/`Full` (`shelter-detail-page.html:40, 209`). The two sources can also
  drift silently: a copy change in `en.ts` does not change the badge, and `docs/i18n-review.md:3-6` already claims these surfaces are
  "now catalog-driven".
- Also wrong at the architecture level: `src/app/core/i18n/i18n.service.ts:67-69` documents that "non-template code
  (titleGuard, the **shelter-copy**/error-copy helpers) calls it [`t()`] directly" — `shelter-copy.ts` contains **zero** references to
  `I18nService`/`i18n` (verified: `rg -c "I18nService|i18n" src/app/shared/shelter-copy.ts` → no match).
- Minimal fix: give `shelter-copy.ts` the same seam `error-copy.ts` already has (an optional `translate: (key) => string` parameter
  or `inject(I18nService)` where it runs inside an injection context), map the 9 duplicated strings onto the existing keys, and add
  new keys only for what has none (`PRIVATE_LOCATION_BADGE/NOTE`, `COMMUNITY_UNVERIFIED_WARNING`, `REPORT_SUBMITTED*`,
  `verifiedAgoText`/`lastVerifiedText`/`communityReportsText`/`reportedBadgeText`, `shelterStatusText`). Pins in
  `shelter-copy.spec.ts` then assert key-by-key instead of literal-by-literal.

#### P1-2 — `bannerMessage()` is called without its translate callback at 14 sites, making 9 already-translated error keys unreachable — **High**

- Wrong: `src/app/shared/error-copy.ts:114-120` takes an optional `translate` callback; only **4** call sites pass it
  (`contributions-panel.ts:203,209`, `verify-page.ts:210`, `account-page.ts:168`). **14** do not, e.g.
  `map-page.ts:752`, `shelter-detail-page.ts:554,676,720,809`, `submit-shelter-page.ts:335,680`,
  `login-page.ts:63`, `register-page.ts:81`, `reset-page.ts:123,142,175`, `guidance-list-page.ts:115`, `guidance-detail-page.ts:156`
  (plus ~20 sites in `admin-page.ts`, e.g. `:595,648,924,1048,1530`). Without the callback, `error-copy.ts:100-111` falls back to
  the English `CLIENT_COPY` table.
- Why it matters: `error.rateLimited`, `error.unauthorized`, `error.checkInput`, `error.serverError`, `error.valueInUse` are fully
  translated in ET (`et.ts:375-379`) and RU (`ru.ts:388-392`) but are unreachable on those pages — a 5xx or 429 while browsing the map
  or a `409` on an account edit shows English to an Estonian/Russian user. `docs/i18n-review.md:5` lists "the shared error-copy module"
  among the surfaces that are "now catalog-driven"; that is only one third true.
- Minimal fix: pass `(key) => this.i18n.t(key)` at the 14 sites (each page already injects or can inject `I18nService`), or make
  `translate` a required argument so the next call site cannot silently regress to English.

#### P1-3 — Hardcoded English copy tables in components that duplicate byte-identical translated catalog values — **High**

- Wrong A: `src/app/features/shelter/shelter-detail-page.ts:78-84` (`DISTANCE_COPY`) holds 5 strings that are **byte-identical** to
  the translated `map.nearest.*` values used by the map page for the same five `GeolocationFailureKind`s
  (`en.ts:209-216`, ET `et.ts:214-220`). Verified character-for-character for `denied`, `timeout`, `unsupported`, `unavailable`, `insecure`.
- Wrong B: `src/app/shared/leaflet-service.ts:315` sets the anchor pin's `title: 'Searched address'`, while the visible label for the same
  concept is the translated key `map.searched` (`map-page.html:49`, `en.ts:197`/`et.ts:202`/`ru.ts:214`).
- Wrong C: `shelter-detail-page.ts:673,715,806` hardcode three report notices (`'Your occupancy report was saved.'`,
  `'Your open/closed report was saved.'`, `'You have already reported this shelter with this report type.'`) while the sibling notices
  `REPORT_SUBMITTED` / `REPORT_SUBMITTED_DAMPED` live in the shared copy module (`shelter-copy.ts:151,155`).
- Why it matters: identical user-facing sentences exist twice; the hardcoded copy stays English on an ET/RU UI, and a fix applied to one
  copy never reaches the other. `shelter-copy.ts` even documents the intended rule ("the geolocation ERROR copy stays mirrored per
  feature") — mirroring is exactly what makes these drift.
- Minimal fix: `DISTANCE_COPY` → `Record<GeolocationFailureKind, MessageKey>` reusing `map.nearest.*` (both pages already inject
  `I18nService`); pass the `map.searched` label into `LeafletService.setAnchorPin` from `MapPage`; move the three reports notices next to
  `REPORT_SUBMITTED` and key them.

#### P1-4 — Admin shelter/report/user feedback is hardcoded English in a file that already localizes its other tabs — **Medium**

- Wrong: `admin-page.ts:91-113` defines 28 English label entries (`SHELTER_REPORT_TYPE_LABEL`, `AUDIT_ACTION_LABEL`,
  `SHELTER_HISTORY_ACTION_LABEL`, `ALERT_KIND_LABEL`) rendered as table cells (`admin-page.html:598,672,1268`) and 10 English success
  banners (`admin-page.ts:590,627,691,720,783,834,857,939,965,1026`). In the **same class**, the guidance and media tabs already set
  banners through the catalog: `admin-page.ts:1259,1268,1386,1510,1563,1586,1621` (`this.i18n.t('admin.guidance.success.*' / 'admin.media.success.*')`).
  `admin-page.spec.ts:521,538,562,688,820,844,995,1018,1068,1126` pins the English literals, so the drift is locked in by tests.
- Why it matters: the admin is a fully catalogued surface (`messages.ts` carries 228 `admin.*` keys) — an ET/RU-locale moderator sees a
  half-translated tool, and the repo's own spec pins make the inconsistency look intentional.
- Minimal fix: add `admin.shelters.feedback.*`, `admin.reports.feedback.*` etc. and route lines 590-1026 through `i18n.t(...)`, exactly like
  the guidance/media tabs; convert the four label maps to `Record<…, MessageKey>` and render with `| t`; update the specs to assert on the
  catalog values (or `defaultText(key, 'en')`).

#### P1-5 — `/register` does not enforce the backend's 8-character password floor, and its comment states the opposite — **Medium**

- Wrong: `register-page.ts:38` → `password: new FormControl('', { validators: [Validators.required] })`, while the same payload
  constraint is enforced on `/reset` (`reset-page.ts:92` → `Validators.required, Validators.minLength(8)`, with the correct comment
  citing the server's `@Size(min = 8)`). The backend does enforce it for registration:
  `src/main/java/ee/sheltermap/auth/RegisterRequest.java:33` → `@NotBlank @Size(min = 8, max = 200, message = "Password must be at least 8 characters long")`.
  `register-page.ts:13-16` claims "The backend has no password policy beyond non-blank, so the form does not invent one either" — factually wrong.
- Why it matters: a 3-character password passes client validation, is POSTed, and comes back as a 400 banner error instead of an inline field
  error — the exact UX the reset page already avoids; the two auth pages disagree about the same rule, and the comment sends the next
  developer the wrong way.
- Minimal fix: add `Validators.minLength(8)` to `register-page.ts:38` (and a `passwordTooShort` error line in `register-page.html`, mirroring
  `reset-page`), or move the rule into `shared/form-helpers.ts` (e.g. `PASSWORD_MIN_LENGTH = 8` + a validator) so register/reset/change-password
  share one definition; fix the comment at `register-page.ts:13-16`.

#### P1-6 — `strict` / `strictTemplates` are off although enabling them costs nothing (proved) — **Medium**

- Wrong: `frontend/tsconfig.json` (see A3). With `strict` off, `null`/`undefined` flow, implicit `any` in callbacks and template
  bindings are unchecked; with `strictTemplates` off, wrong input types, unknown properties and wrong `[binding]` types are not caught at build time.
- Why it matters: `frontend/README.md:19` already advertises "TypeScript (strict)", so the documented contract and the config disagree;
  and every future template/type defect that strict mode would have caught becomes a runtime bug. Measured cost today: **zero** (A3 table).
- Minimal fix: add `"strict": true` to `frontend/tsconfig.json` `compilerOptions` and `"strictTemplates": true` to `angularCompilerOptions`
  (optionally `"noUnusedLocals": true`, `"noUnusedParameters": true` — also 0 errors). Re-run `npx tsc -p tsconfig.app.json`/`tsconfig.spec.json`
  and `npx ng test` to confirm; also add the `tsc` gate to `frontend/README.md` so it is reproducible (currently undocumented).

#### P1-7 — `AdminPage` is a 1654-line component with mechanically duplicated tab plumbing — **Medium**

- Wrong: `admin-page.ts` (1654 lines, 54 members, 9 tabs, 2 extracted panels — A1) repeats the same structures three times over:
  - `admin-page.html:20-100`: **9** near-identical 7-line tab buttons (only the tab name and copy key differ; ~63 lines).
  - `admin-page.ts:526-578` `switchTab()`: **7** identical `if (rows()===null && err()===null) loadX()` cases.
  - **6** identical loader bodies: `loadShelters():641-649`, `loadReports():918-925`, `loadAlerts():976-983`, `loadUsers():988-996`,
    `loadAudit():1042-1049`, `loadMedia():1524-1531` (each: reset rows → reset error → promise → `.catch(set bannerMessage(error,'shelter'))`).
  - 6 parallel `xRows` / `xLoadError` signal pairs (`admin-page.ts:250-303, 287-298, 393-394`).
- Why it matters: adding or renaming a tab requires edits in 5 places (union `:69-78`, `switchTab` `:536-571`, the template block,
  the loader, the two signals) and the tab label key list is duplicated between template and union; the repeated loader bodies are the
  highest-traffic place for copy-paste defects (e.g. a wrong error signal silently misroutes an error banner).
- Minimal fix: a `TABS` registry — `interface AdminTabSpec { key: AdminTab; labelKey: MessageKey; rows: WritableSignal<Row[]|null>; error: WritableSignal<string|null>; load: () => Promise<Row[]|void> }`
  — drives the `@for` over the tab bar (`track spec.key`) and a single `switchTab` lookup; a generic
  `private loadInto<T>(rows, err, fetch: () => Promise<T[]>)` collapses the six loader bodies. Extracting the remaining tab bodies into the
  already-established child-component pattern (`GuidanceEditor`, `SiteTextsPanel`) then brings the file back to a coordinator.

### P2 (report only)

#### P2-1 — Three exported symbols are dead (compiler-verified: zero references repo-wide)

- `src/app/core/theme-tokens.ts:151` `export type ThemeRoot` — nothing uses it; `applyBlackAndYellowTokens`/`clearBlackAndYellowTokens`
  take `ThemeStyleRoot` (`:159,165,172`). Fix: delete, or use it in `ThemeStore` instead of `ThemeStyleRoot`.
- `src/app/core/i18n/site-texts.ts:116` `export function isSiteTextKey()` — never called (`isSiteTextLink` at `:111` is the used one).
- `src/app/features/admin/guidance-editor.ts:221` `export const BODY_EDITOR_HEADER_VALUES = [2, 3]` — never referenced, while its value is
  restated in the same file: `:664` `[{ header: [2, 3, false] }]`, `:230` `header: ['h2','h3']`, and the matcher at `:841`
  (`['h1','h4','h5','h6']`). Fix: consume the constant in the toolbar config/`BODY_EDITOR_FORMAT_TAGS` so the header-level fact has one home.

#### P2-2 — `AccountPage` duplicates the whole email/phone change flow

- `account-page.ts:254-327` (email: `emailSend/emailConfirm/emailResend/emailStartOver`) vs `:329-415` (phone: the same four methods) are
  line-for-line parallel; only the control, gateway method and copy key differ (~80 duplicated lines).
- In-repo precedent for the fix: `verify-page.ts:166-198,238,274` already does this with `Record<VerifyChannel, …>` state and one
  parameterized `request(level)` / `confirm(level)` pair.
- Fix: one `changeFlow('email'|'phone')` helper or a `Record<ChangeKind, ChangeFlowState>`, mirroring `verify-page.ts`.

#### P2-3 — `MapPage.sorted()` duplicates the distance-sort branch

- `map-page.ts:318-350`: the `userPosition` branch and the `anchor` branch are the same Haversine sort with the same
  `localeCompare` tiebreak, differing only in the origin point. Fix: `const origin = this.userPosition() ?? this.anchor();`
  then one sort (the `label` field on the anchor is unused in the comparator, so the shapes unify cleanly).

#### P2-4 — `recencyText` and `verifiedAgoText` re-implement the same branches

- `shelter-copy.ts:266-275` (`just now` / `N min ago` / `N h ago`) is duplicated at `shelter-copy.ts:333-347` before the day/date branches are added.
  Fix: `verifiedAgoText` calls `recencyText` for the <1 h cases (or both delegate to a private `minutesAgo` helper).

#### P2-5 — `.badge` base rule copy-pasted into 4 component stylesheets

- `admin-page.scss:294`, `map-page.scss:462`, `shelter-detail-page.scss:37`, `account-page.scss:130` each re-declare the same base
  (`font-size: var(--text-2xs)`, `font-weight: var(--font-weight-semibold)`, `padding: var(--space-2) var(--space-4)`,
  `border-radius: var(--radius-full)`), and the shared modifiers are re-declared per file (`&.badge--new` at `admin-page.scss:315`,
  `map-page.scss:502`, `shelter-detail-page.scss:83`; `&.badge--reported` at `map-page.scss:482`, `shelter-detail-page.scss:55`).
  `contributions-panel.scss:79` invents a fifth base (`.contrib-badge`) carrying the same modifiers.
- `src/styles.scss` already hosts the global design system (`.btn` `:536`, `.btn--ghost` `:574`, `.field` `:479`, `.page-title` `:465`,
  `.shelter-marker` `:620`) but contains **no** `.badge` rule (verified). Fix: move the `.badge` base and the shared `--user/--new/--reported/
--closed/--occupancy/--private` modifiers into `styles.scss` next to `.btn`, keeping component-only modifiers local; `design-tokens.spec.ts`
  (which pins the contrast pairs) and the component specs guard the change.

#### P2-6 — Default resend cooldown `60` duplicated 7×

- `verify-page.ts:247,262`, `account-page.ts:270,345,422`, `reset-page.ts:118,139,155` all write `?? 60`. `shared/resend-countdown.ts` already
  owns the cooldown mechanics (`SECOND_MS` at `:3`) but not the default. Fix: `export const DEFAULT_RESEND_SECONDS = 60;` there and use it.
- Related, and deliberate: `map-page.ts:103` `ANCHOR_ZOOM = 14` vs `:108` `AROUND_ZOOM = 14` — documented as "same scale, separate intent";
  acceptable, but a shared `NEIGHBOURHOOD_ZOOM` would prevent an accidental divergence.

#### P2-7 — File/class naming is split three ways for shared components

- `shared/banner.component.ts` → `BannerComponent` (suffix in file _and_ class), `consent-banner.component.ts` → `ConsentBanner` and
  `accessibility-dialog.component.ts` → `AccessibilityDialog` (suffix in file only), `loading-indicator.ts`/`report-gauge.ts`/`page-shell.ts`
  → same-named classes (no suffix). Feature pages (`*-page.ts` → `XPage`), gateways (`*-gateway.ts` → `XGateway`) and stores (`*Store`) are consistent.
  Fix: pick one convention (Angular v20+ style guide favours dropping the suffix) and rename the three `.component.ts` files/classes.

#### P2-8 — Storage key literals live in four places

- `prepaint.ts:21,28` exports `THEME_STORAGE_KEY`/`LOCALE_STORAGE_KEY`, but `theme-store.ts:17` (`THEME_KEY`), `i18n.service.ts:20`
  (`LOCALE_KEY`) and `index.html:25,94` re-state the same strings. Specs assert the literals (`theme-store.spec.ts:57-68`,
  `page-shell.spec.ts:892-940`), so only a partial safety net exists. Fix: import the constants into `ThemeStore`/`I18nService`
  (the inline script stays a documented twin — `prepaint.spec.ts:104-105` already ties it to the constants).

#### P2-9 — `api-interceptor.ts` duplicates its own endpoint patterns and redirect

- `NO_BEARER_ENDPOINT` (`:15`) and `NO_REFRESH_DANCE_ENDPOINT` (`:28`) both spell `/\/auth\/(login|refresh)$/`; adding an auth endpoint to one
  and not the other is a silent auth bug. The session-death redirect is written twice (`:79` and `:96`). Fix: build
  `NO_REFRESH_DANCE_ENDPOINT` from `NO_BEARER_ENDPOINT`'s source (or a shared list), and extract `redirectToLoginExpired()`.

#### P2-10 — Five `armed()!` non-null assertions on the same call in one template region

- `admin-page.html:746,755,757,763,1178` use `userActionConfirm.armed()!.value` repeatedly. Safe today (the enclosing `@if` guards it) but
  it re-invokes the accessor and hides the invariant. Fix: `@if (userActionConfirm.armed(); as armed)` and use `armed.value`.

---

## C. Areas checked and found clean

- **`any` in production code: none.** `rg "\bany\b"` over `src/app` + `src/environments` + `main.ts` (excluding specs) matches only prose
  inside comments; no `: any`, `as any`, `<any>`, `$any(...)`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` or `eslint-disable` anywhere in
  `src/`. The single spec-side match is a comment in `shelter-copy.spec.ts`.
- **Unused imports / locals / parameters: none.** Compiler-verified with `noUnusedLocals` + `noUnusedParameters` (0 errors, app + specs) —
  a stronger guarantee than grep.
- **Commented-out code: none.** No commented-out TS statements, no commented-out template markup, no `debugger`, no `TODO`/`FIXME`/`HACK`/`XXX`
  in `src/` (the only `console.*` is `main.ts:15`, Angular's canonical bootstrap error handler).
- **Unused components, pipes, directives, routes, models: none.** All 23 `@Component` selectors are referenced from a template or a route;
  `TranslatePipe` is the only pipe and is used in every feature template; there are no NgModules (0 `*.module.ts`) and no directives.
  Every route in `app.routes.ts` is linked (`routerLink` values `/account /admin /blog /login /map /privacy /register /reset /submit /terms /verify`
  all resolve to declared paths) and every `router.navigate`/`createUrlTree` target (`/map`, `/login`, `/submit`, `/verify`) exists.
  Every type in `core/models.ts` (1019 lines) is reached from a gateway, component or spec — spot-checked and compiler-corroborated.
- **Unused npm dependencies: none.** All imported roots are declared (`@angular/*`, `rxjs`, `leaflet`, `tslib` via `importHelpers: true`);
  `@angular/build`/`@angular/cli`/`@angular/compiler-cli`/`typescript` are CLI/build tools used via `ng`, `ngc` and `tsc`; `vitest` + `jsdom`
  are the configured unit-test runner/environment (`angular.json` → `@angular/build:unit-test`); `prettier` is used by the repo's documented
  per-change gate (`openspec/changes/**/tasks.md`: `npx prettier --check` on touched files) although it has no npm script. No dependency is unused.
- **Business logic in templates: clean.** Templates contain no arithmetic, no sorting/filtering and no domain predicates; they call named
  members or `| t` (e.g. `{{ occupancyText(occ) }}`, `{{ straightLineText(nearestKm()!) }}`, `@if (hasTrustBadges(...))`). Both template `!`
  assertions are guarded and documented (`map-page.html:156-157` guards `nearestKm()`; `map-page.html:277-280` guards `anchor()` before
  `anchorDistance(shelter)!`, which is `null` only when no anchor is set — `map-page.ts:658-664`).
- **Domain rules are single-sourced where it counts.** Trust/status/open/occupancy derivation lives in one module
  (`shelter-copy.ts`: `isOpenRow`, `hasReports`, `hasTrustBadges`, `shelterStatusText`) and every surface imports it rather than re-deriving
  it; only 4 inline `status === 'INACTIVE'` / `reviewStatus === 'NEW'` checks exist outside it (`admin-page.html:254,289,620`,
  `contributions-panel.ts:154`, `leaflet-service.ts:61`), each for a distinct presentation decision.
- **Shelter-form rules are shared, not copy-pasted.** `shared/form-helpers.ts` (`CODE_SIX_DIGITS`, `capacityValidator`, `nameBlankValidator`,
  `readCoordinate`) is used by both `submit-shelter-page.ts:23,166,173` and `contributions-panel.ts:21,92`, with boundary specs
  (`form-helpers.spec.ts:79-102`).
- **API paths and HTTP plumbing: no duplication.** Each `/api/...` string appears exactly once, inside its owning gateway
  (`shelter-gateway.ts`, `guidance-gateway.ts`, `geo-gateway.ts`, `data-source-gateway.ts`, `site-texts-gateway.ts`); `ApiClient` is the only
  `HttpClient` consumer and converts every failure to `ApiError` in one `catchError`.
- **Pre-paint duplication is mitigated, not accidental.** The two `<head>` scripts in `index.html:14-104` intentionally restate the typed
  logic in `core/prepaint.ts` + `core/theme-tokens.ts`, and `prepaint.spec.ts:104-105` locates the scripts by their exported key constants and
  evaluates their source against the typed functions — the duplication fails the suite if it drifts.
- **No function is pathologically long.** The longest methods are `guidance-editor.ts:1183 onSave()` (70 lines) and `site-texts-panel.ts:147 save()`
  (69); everything else is under 60. Size pressure in this codebase is at the class/file level (`admin-page.ts`, `guidance-editor.ts:1257`), not the method level.
- **Hardcoded URLs are bounded and identifiable.** Six external URLs exist (`leaflet-service.ts:126` OSM tiles, `:129` OSM attribution HTML,
  `map-page.html:111`, `submit-shelter-page.html:179` OSM copyright ×3, `geocode-gateway.ts:28` Nominatim,
  `shelter-detail-page.ts:591,600` Google/Apple directions). The triple OSM copyright URL would be nicer as one constant, but each template
  already routes its _label_ through its own catalog key by explicit design, so this is a nit, not a finding.

## D. Top 5 findings

1. **P1-1 — Localization is dual-sourced for the trust/occupancy copy** (`shelter-copy.ts:24-52,120,123,247-258` vs the already-translated
   `account.contrib.*` / `detail.band.*` / `detail.pulse.kind.*` keys). ET/RU users see the same fact in two languages inside one view
   (`shelter-detail-page.html:40,209` vs `shelter-detail-page.ts:351-353`), and `i18n.service.ts:67-69` documents a seam `shelter-copy.ts` never uses.
2. **P1-2 — `bannerMessage()` without its translate callback at 14 call sites** (`map-page.ts:752`, `shelter-detail-page.ts:554,676,720,809`,
   `submit-shelter-page.ts:335,680`, `login-page.ts:63`, `register-page.ts:81`, `reset-page.ts:123,142,175`, `guidance-*-page.ts:115,156`,
   ~20 in `admin-page.ts`) leaves 9 fully translated `error.*` keys unreachable — English error banners in an ET/RU UI.
3. **P1-6 — `strict` and `strictTemplates` are off**, although compiler-verified enabling them yields **0 errors** on all 70 app files and all
   123 spec files (and `noUnusedLocals`/`noUnusedParameters` too). `README.md:19` already claims "TypeScript (strict)"; this is the cheapest
   correctness win in the frontend.
4. **P1-7 — `AdminPage` (1654 lines, 9 tabs, 2 extracted) with triplicated tab plumbing** (9 tab buttons `admin-page.html:20-100`, 7 identical
   `switchTab` cases `admin-page.ts:526-578`, 6 identical loader bodies `:641,918,976,988,1042,1524`): a `TABS` registry + one generic
   `loadInto()` removes most of the mechanical code and the 5-edit cost of adding a tab.
5. **P1-3 / P1-4 — Hardcoded English copy that already has translated twins elsewhere**: `DISTANCE_COPY`
   (`shelter-detail-page.ts:78-84`, byte-identical to `map.nearest.*`), the pin title `'Searched address'`
   (`leaflet-service.ts:315` vs `map-page.html:49`), and the admin label maps + banners (`admin-page.ts:91-113, 590-1026`) in a file that
   already localizes its guidance/media tabs through `i18n.t(...)`.

**Honest verdict:** no **Critical** finding (no crash, no security hole, no data loss, no broken build) exists in the frontend clean-code
dimension, and the three **High** findings are all localization/maintainability rather than functional defects — the app itself works. This is a
tidy, well-commented, type-disciplined codebase with genuinely no dead code, no `any`, no unused dependencies and no commented-out fragments. The real weaknesses are (a) localization applied unevenly, with the same strings available in two sources and the helpers documented
as i18n-aware but not wired, (b) two config settings (`strict`, `strictTemplates`) left off at zero cost, and (c) one component
(`AdminPage`) that has grown past the point where its mechanical duplication is cheap to maintain.
