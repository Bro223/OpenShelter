# Agent 10 — Frontend: security, performance, accessibility

Read-only review. The only file created is this report.

## Environment / method

| Item | Value | Evidence |
| --- | --- | --- |
| Angular | 22.1.0 (standalone, functional guards/interceptors) | `frontend/package.json:11-20` |
| TypeScript | ~6.0.2 | `frontend/package.json:26` |
| Test runner | vitest 4 via `@angular/build:unit-test` | `frontend/angular.json:83-88`, `package.json:15` |
| Third-party UI deps | `leaflet` 1.9.4 (eager), vendored Quill 2.0.3 (`src/vendor/quill/`) | `package.json:19`, `frontend/src/vendor/quill/` |
| Build measured | `npx ng build --configuration production --output-path /tmp/osh-build --stats-json` (no repo file touched; hashes identical to the committed `frontend/dist`) | build log below |
| Tests run | `npx ng test --no-watch` → **56 files / 1263 tests passed** | test run log |

Ignored as instructed: `node_modules/`, `dist/`, `.angular/`, `target/`.

Commands actually run (all read-only):
`npx ng test --no-watch --reporters=dot` (pass), `npx ng build -c production --output-path /tmp/osh-build --stats-json`, plus greps/`read` over `frontend/src`.

---

## Correct — verified, not assumed

1. **The single `[innerHTML]` is the only HTML sink and is sanitized twice.** `features/guidance/guidance-detail-page.html:55` (`[innerHTML]="p.bodyHtml ?? ''"`); there is **no** `bypassSecurityTrustHtml` / `DomSanitizer` bypass anywhere in `frontend/src` (grep for `bypassSecurityTrust|outerHTML|eval(|new Function|document.write` → only comments and Quill's vendored `innerHTML` getter). Angular 22's own sanitizer covers it: `@angular/core`'s `VALID_ELEMENTS`/`URI_ATTRS`/`HTML_ATTRS` allowlists are present in the runtime chunk.
2. **Dynamic URL bindings are sanitized by Angular and fed only safe values.** `@angular/compiler` registers `['a', ['href','xlink:href']]` and `['img', ['src']]` under `SecurityContext.URL` (`node_modules/@angular/compiler/fesm2022/compiler.mjs:344`), so `[href]`/`[src]` bindings run through `ɵɵsanitizeUrl`. The two computed URLs are numeric: `shelter-detail-page.ts:589-603` (`latitude.toFixed(5)`, `encodeURIComponent(shelter.name)`).
3. **Every `target="_blank"` carries `rel="noopener"`** — 6 sites: `shared/page-shell.html:150,163,167`, `features/map/map-page.html:111`, `features/shelter/submit-shelter-page.html:179`, `features/shelter/shelter-detail-page.html:80,87`.
4. **No secrets or absolute URLs in the environment files**: `environments/environment.ts:19-26` and `environment.development.ts:1` hold `production` + `apiUrl: ''` only; the dev/prod split is `angular.json:66-79`.
5. **Token storage matches the documented tradeoff** (`core/token-store.ts:7-56`): access token in an in-memory signal only, refresh token in `localStorage` under `os.refresh`, every storage access wrapped in `try/catch` (private mode degrades to a session-only token). Single-flight refresh with cross-tab rotation recovery and an identity epoch guard: `session/auth-store.ts:219-288, 310-325, 347-352`.
6. **No token can reach a third-party origin today.** The only external service call is Nominatim, and it uses the global `fetch` (`gateways/geocode-gateway.ts:67`), not `HttpClient`, so `apiInterceptor` never adds a header to it.
7. **No source maps in production.** `@angular/build:application` schema default `sourceMap: false`; `angular.json` does not override it in `production`; the built output contains no `*.map` (also true of the committed `frontend/dist`).
8. **Image handling is deliberate and correct**: explicit `width`/`height` on every `<img>` (no CLS), `loading="lazy" decoding="async"` below the fold, `fetchpriority="high"` for the above-the-fold article hero (`features/guidance/guidance-detail-page.html:34-42`), a neutral placeholder on load failure (`guidance-list-page.html:43`), alt from the stored hero alt with a deliberate empty alt when absent. No `srcset` anywhere.
9. **The WCAG contrast spec is real and passes.** `design-tokens.spec.ts:152-500` implements WCAG 2.1 relative luminance + ratio, checks text pairs at 4.5:1 and UI boundaries at 3:1 for **three** themes (light `:root`, `[data-theme='high-contrast']`, and the runtime `BLACK_AND_YELLOW_TOKENS` map parsed out of `theme-tokens.ts`), asserts the token name-sets are equal in both directions (plus the B&Y extra `--color-link`), and has an "exemptions are honest" test so a fixed token cannot stay exempt. The same file also pins `:focus-visible`, 48px touch targets, `.num-tabular`, and the UA-colour bug class (`a { color: var(--color-primary) }`, `button,input,textarea { color: inherit }`). I re-ran the suite: all pass.
10. **Dialog focus management is complete and tested.** `shared/accessibility-dialog.component.{ts,html}` + `shared/consent-banner.component.*`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`, focus moved into the container on open, Tab/Shift+Tab trap, Escape close (a11y dialog), focus returns to `#a11y-trigger`, backdrop-click rules; 10 specs in `accessibility-dialog.component.spec.ts:85-252` assert each of these.
11. **Semantic structure is sound**: exactly one `<h1>` per rendered state on every page (every multi-`<h1>` template is mutually exclusive `@if`/mode branches: `register-page.html:1-9`, `shelter-detail-page.html:1-13`, `guidance-detail-page.html:1-47`, `submit-shelter-page.html:5-13`); landmarks are present (`header`/`main`/`footer`, `nav` with labels); the skip link is the shell's first element with `main#main tabindex="-1"` as the landing target and focus handed to it on every client-side navigation (`page-shell.ts:160-170`, guarded against stealing focus from an open `aria-modal` dialog); all 49 `<th>` carry `scope`; every form control has a label (explicit `label[for]` or a wrapping `label`); toggle groups use `aria-pressed`; async states use `role="status"`/`role="alert"` (`banner.component.html:4`, `loading-indicator.html:1`); the closed mobile menu is `display: none` (`page-shell.scss:376-378`), so its links are correctly out of the tab order.
12. **Lazy loading works where it is applied**: `/blog`, `/blog/:slug`, `/shelters/:id`, `/submit`, `/admin`, `/privacy`, `/terms` are `loadComponent` (`app.routes.ts:72-140`); Quill stays inside the admin chunk (verified in the emitted bundle: `chunk-DTSKstjC.js` contains `quill`/`ql-editor`, `main-*.js` contains none).
13. **Open-redirect protection** on both `returnUrl` consumers: `core/guards.ts:33-43` (only `/`-prefixed, non-`//`, no backslash) used at `login-page.ts:48` and `verify-page.ts:149-155`.
14. **Local storage users other than the token store are defensive**: `theme-store.ts:81-90`, `i18n.service.ts:180-199`, `consent-store.ts:63-78` all validate the stored value and swallow `JSON.parse`/storage failures.

---

## Findings

### 1. Level: High — Field-level validation errors are not programmatically exposed (a11y, core flows)

* **Where**: `features/auth/login-page.html:22,35`; `features/auth/register-page.html:17,34,36,51,53,66`; `features/auth/reset-page.html:18,55,70,75,91,94`; `features/account/account-page.html:55,68,148,172,251,275` (and further `field-error` blocks in the same files) — all of the form `<p class="field-error">` elements.
* **What is wrong**: no `aria-invalid` on any input in the app, no `aria-describedby`/`aria-errormessage` linking an error to its control, and no `role="alert"`/live region on these error paragraphs. Grep across `frontend/src/**/*.html`: `aria-invalid` → 0 hits; `aria-describedby` → only the two dialogs, the report gauge and the Quill editor comment. The app *does* use live regions elsewhere (`submit-shelter-page.html:199,224` uses `class="field-error" role="alert"`, `banner.component.html:4`), so the auth/account forms are the inconsistent exception.
* **Why it matters**: WCAG 2.1 4.1.3 (Status Messages) and the ARIA form-error pattern — a screen-reader user who submits an empty/invalid login, register, reset or profile form gets **no announcement** and no programmatic indication of which field failed; the error only exists as visual text. These are the account-creation and account-recovery flows, so the dead end is on the critical path.
* **Suggested fix**: on submit, mark the group and expose the message — e.g. give each error an `id`, bind `[attr.aria-describedby]` and `[attr.aria-invalid]="control.invalid && control.touched ? 'true' : null"` on the input, and add `role="alert"` to the error paragraph (the `/submit` precedent). One shared helper in `shared/form-helpers.ts` would keep it consistent.

### 2. Level: High — In the two accessibility themes, third-party light surfaces (Leaflet controls) become unreadable

* **Where**: `shared/accessibility-dialog.component.scss:148-151` (`[data-theme='black-and-yellow'] a { color: var(--color-link); text-decoration: underline; }`, `ViewEncapsulation.None`, i.e. page-wide) together with `shared/leaflet-service.ts:126-131` (OSM tiles + the required attribution link `<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`) and `styles.scss:402-407` (`outline: 2px solid var(--color-primary)`).
* **What is wrong**: Leaflet keeps its own hard-coded **light** chrome — `.leaflet-bar a { background-color: #fff; … color: black }` and `.leaflet-container .leaflet-control-attribution { background: rgba(255,255,255,.8) }` / `.leaflet-container a { color: #0078A8 }` (`node_modules/leaflet/dist/leaflet.css:288-298, 413-426`). Those rules have specificity (0,1,1), exactly like the app's `[data-theme='black-and-yellow'] a` rule, and the component stylesheet is inlined into `main-*.js` and injected into `<head>` at runtime — i.e. **later in the cascade**, so the theme rule wins the tie. Measured with the WCAG formula from `design-tokens.spec.ts`:
  * B&Y link colour `--color-link` `#ffe066` (`core/theme-tokens.ts:87`) on the white zoom-button fill / attribution strip = **1.30:1**, on typical light OSM tiles ≈ **1.14:1**.
  * The same rule repaints Leaflet's zoom `+`/`−` glyphs yellow-on-white (1.30:1) — the map's only visual zoom affordance.
  * The global focus ring (`--color-primary`) against the light, deliberately unthemed map surface: B&Y `#ff9f1c` = **2.05:1**, high-contrast `#7db8f0` = **2.10:1** — both below the 3:1 non-text/focus-indicator floor (light theme is fine at 5.03-5.77:1).
* **Why it matters**: the black-and-yellow / high-contrast themes exist precisely for users who need contrast, and the failure lands on the home route (`/map`), the `/submit` mini-map and `/shelters/:id`. The OSM attribution link is also a tile-usage-policy obligation ("attribution must remain visible", `shared/leaflet-service.ts:128`) that is effectively invisible in B&Y. The token-based contrast spec cannot see this: it only checks token pairs on theme surfaces, never third-party DOM on a light surface — the exception is even acknowledged in `styles.scss:303-306` ("(attribution rgba(255,255,255,0.8), zoom buttons #fff … stay readable in both themes"), which is true for the inherited text colour but not for links.
* **Suggested fix**: add scoped exceptions next to the existing B&Y exceptions (`accessibility-dialog.component.scss:154-187`), e.g. `[data-theme='black-and-yellow'] .leaflet-bar a, [data-theme='black-and-yellow'] .leaflet-control-attribution a { color: #333 }` plus a matching focus-ring override for the light map surface (or `L.map(el, { zoomControl: false })` with an app-styled control). A cheap regression guard: assert in a spec that every `a` rule introduced for a light surface is paired with an override for `.leaflet-*`.
* **Caveat (honesty)**: this is a CSS cascade conclusion, not a browser measurement — I did not render the page. The specificity tie and the runtime-<style> insertion order are both verifiable in the files cited; a one-minute check in a browser with `data-theme="black-and-yellow"` on `/map` confirms it.

### 3. Level: Medium — Initial bundle is 300 kB over its own budget, and it carries all three languages

* **Where**: `frontend/angular.json:44-55` (budgets: `initial` 560 kB warn / 1 MB error, `anyComponentStyle` 4 kB warn), `shared/i18n/i18n.service.ts:44` (`CATALOGS: Record<Locale, Messages> = { en: EN, et: ET, ru: RU }` — static imports), `app.routes.ts:4-9` (eager route components).
* **Measured output** (`ng build -c production`, identical hashes to `frontend/dist`):
  ```text
  Initial total        859.73 kB raw | 200.94 kB transfer
    main-*.js          344.42 kB      (Leaflet 439.6 kB source is inside it)
    chunk-ChqJ_JJ3.js  497.44 kB      (modulepreloaded; holds the i18n catalogs)
    styles-*.css        17.87 kB
  WARNING initial exceeded maximum budget: 560.00 kB not met by 299.73 kB
  WARNING src/app/features/map/map-page.scss 8.29 kB (> 4 kB)
  WARNING src/app/features/admin/admin-page.scss 6.53 kB
  WARNING src/app/features/shelter/shelter-detail-page.scss 6.08 kB
  WARNING src/app/shared/page-shell.scss 4.87 kB
  WARNING src/app/features/admin/guidance-editor.scss 4.27 kB
  WARNING src/app/features/shelter/submit-shelter-page.scss 4.11 kB
  ```
  `stats.json` attributes `src/app/core/i18n/{en,et,ru}.ts` + `i18n.service.ts` + `translate-pipe.ts` to that shared initial chunk; per-locale source/gzip sizes are en 66.4 kB/17.9 kB, et 68.1 kB/19.0 kB, ru 105.2 kB/24.1 kB → **≈61 kB gzip (~30 % of the initial transfer) is catalog text for languages a given visitor does not need**. `main`'s eager set includes `map-page` (→ Leaflet), `login-page`, `register-page`, `reset-page`, `verify-page`, `account-page`, `contributions-panel` (stats.json `outputs.main.inputs`).
* **Why it matters**: the 560 kB budget is permanently red (a warning on every build, for 7 entries), so it no longer guards anything — a real regression would only be caught at the 1 MB error line, 160 kB away. And the two easy wins the routing comments claim to be optimising for (bundle budget, `app.routes.ts:32-35`) are left on the table: the whole auth/account surface (~124 kB of source, incl. the 37 kB contributions panel) ships to anonymous visitors, and all three catalogs ship on first paint.
* **Suggested fix**: (a) `loadComponent` for `/login`, `/register`, `/reset`, `/verify`, `/account` exactly as the other rare routes do; (b) load `ET`/`RU` lazily inside `I18nService` (`await import('./et')` on first use of that locale, keeping `EN` as the shipped default) — the type-parity guard in `i18n.spec.ts` can stay by importing the types, not the values; (c) re-baseline `initial` to the real number (~400 kB after (a)+(b)) so the warning becomes meaningful, or drop it to the error-only form; (d) either raise `anyComponentStyle` to reality or split those stylesheets.

### 4. Level: Medium — The SPA document ships without a Content-Security-Policy

* **Where**: `frontend/src/index.html` (no `<meta http-equiv="Content-Security-Policy">`), `frontend/angular.json` (no `"security": { "autoCsp": true }` in the build options), and `src/main/java/ee/sheltermap/config/SecurityHeadersFilter.java:23-24` which states the CSP `default-src 'self'` it sets is *"defense-in-depth on the API responses, not the UI's real policy — the SPA document is served by the frontend host"*. Nothing in the repo serves that document (no Dockerfile/nginx/Caddy/static-host config for `frontend/`).
* **Why it matters**: the SPA is the one origin that holds the refresh token in `localStorage` for 30 days (`core/token-store.ts:7`, backend `application.yml:158-159`: access 15 m / refresh 30 d). With no CSP, a single future XSS (a new `[innerHTML]` bypass, a compromised dependency, an injected inline script) is unmitigated and yields a month-long credential; CSP is the standard defence-in-depth for exactly this design. Today's sinks are clean (see "Correct" 1-2), so this is prevention, not a live exploit.
* **Suggested fix**: enable Angular's hash-based CSP (`angular.json` → `"security": { "autoCsp": true }`, which emits the meta tag and hashes the inline scripts) or set the policy in whatever host serves `frontend/dist`. Note the two hand-written inline `<script>` blocks in `index.html:14-101` must be hash-allowlisted (Angular's autoCsp normally hashes the index HTML it processes — verify) or moved to external files, and `style-src` must keep `'unsafe-inline'` for Angular's component-style injection, or use `ngCspNonce`.

### 5. Level: Medium — Original-size images are served into small slots (no responsive variants, no thumbnails)

* **Where**: `frontend/src/app/core/models.ts:976-994` (one `url` per `MediaAssetDto`, no variant fields), `features/guidance/guidance-list-page.html:49-59` (400×300 CSS card), `features/guidance/guidance-detail-page.html:34-42` (704×528 hero), `features/admin/admin-page.html:929-939,1144-1152` (40×40 admin thumbs), and the server: `src/main/java/ee/sheltermap/api/MediaController.java` (serves the stored file as-is, with a good `Cache-Control: public, max-age=31536000, immutable`), caps `application.yml:288-308` (`max-bytes: 5242880`, `import-max-side: 10000`).
* **What is wrong**: no `srcset`/`sizes` in any template and no server-side resize/thumbnail endpoint, so a 5 MiB / up-to-10000-px-per-side upload is downloaded at full size for a 400×300 card — and the `/blog` index renders one card per post.
* **Why it matters**: the guidance index is the one page whose weight is entirely media-driven; on a mobile connection a handful of hero images is tens of megabytes and the LCP is bound by image decode. Immutable caching (already present) only helps repeat views.
* **Suggested fix**: generate 1-2 derived variants at upload/import time (e.g. `…/media/<hash>-400.webp`) and expose them on `MediaAssetDto`, or add a query-parameter thumbnail route; then add `srcset`/`sizes` to the card and admin-thumb `<img>`s (the hero can keep the original). A cheaper interim: lower `import-max-side` for imports and document the recommended upload size.

### 6. Level: Medium — User-facing ARIA labels are hardcoded English in a trilingual app

* **Where**: `shared/page-shell.html:36` (`<nav aria-label="Primary">`), `:136` (`<nav aria-label="Legal">`), `features/map/map-page.html:10` (`aria-label="Marker legend"`), `:125` (`aria-label="Address results"`), `:210` (`aria-label="Shelter filters"`), `:240` (`aria-label="Shelters"`); also the admin tables (`admin-page.html:897` `"Guidance posts"`, `:1125` `"Media library"`).
* **What is wrong / why it matters**: every other accessible name on these pages goes through the `t` pipe (`'menu.aria'` at `page-shell.html:14`, `'map.filterSourcesAria'` at `:193`, `'legal.toc.aria'`, …) and `<html lang>` is switched by the locale store, yet these landmark/region names stay English, so a screen-reader user in `lang="et"`/`lang="ru"` hears English region names in an otherwise translated UI. `messages/en.ts` has no keys for them (`grep 'legend\|aria' core/i18n/en.ts` → only `map.legend.registry/new/confirmed/reported`, `legal.toc.aria`, etc.).
* **Suggested fix**: add catalog keys (e.g. `nav.primary.aria`, `nav.legal.aria`, `map.legend.aria`, `map.results.aria`, `map.filters.aria`, `map.list.aria`, `admin.guidance.aria`, `admin.media.aria`) and bind them with `[attr.aria-label]="… | t"`; `i18n.spec.ts` already enforces catalog parity across the three locales.

### 7. Level: Low — `--color-shelter-user` map-row badge is below 4.5:1 in the light theme

* **Where**: `features/map/map-page.scss:463-472` — `.badge { background: color-mix(in srgb, var(--color-shelter-registry) 12%, var(--color-bg-surface)); color: var(--color-shelter-registry) }` and `&.badge--user { background: color-mix(… var(--color-shelter-user) 12%, var(--color-bg-surface)); color: var(--color-shelter-user) }`, rendered in `map-page.html:270` with `communityBadgeClass(shelter)`.
* **What is wrong**: computed in sRGB (the exact 12 %/88 % mix the CSS asks for) with the WCAG formula: registry `#1769aa` on `#e3edf5` = **4.87:1** (passes, barely), user `#2e7d32` on `#e6efe6` = **4.36:1** (**below** the 4.5:1 AA floor for 12 px/600 weight text — `--text-2xs`, `map-page.scss:465-466`). The contrast spec cannot see this: it checks `--color-shelter-user` against the *solid* `--color-badge-user` (the detail-page badge) and explicitly notes the 12 % mix "is covered by the styles.scss D1 note, not this literal-based check" (`design-tokens.spec.ts:248-250`); that note only quotes the high-contrast theme's 7.1/7.5 ratios (`styles.scss:266`).
* **Why it matters**: the community "Community-checked" / trust badge on `/map` rows is exactly the colour-coded trust cue the project treats as safety-critical, and it is the one badge pair that misses AA in the default theme.
* **Suggested fix**: raise the mix ratio (or darken the light-theme `--color-shelter-user` for text use) and add the two `color-mix` pairs to `design-tokens.spec.ts` as explicit expected ratios so the mixed fill is guarded like the solid tokens.

### 8. Level: Low — Interceptor attaches the Bearer token by path suffix, not by origin

* **Where**: `core/api-interceptor.ts:13` (`NO_BEARER_ENDPOINT = /\/auth\/(login|refresh)$/`) with `:56-61`, plus `core/api-client.ts:41` (`path.startsWith('http') ? path : baseUrl + path`).
* **Why it matters**: the exemption list is origin-blind, and `ApiClient` happily forwards absolute URLs. Every current `HttpClient` call is same-origin (`environment.apiUrl: ''`), and the one external call uses raw `fetch` (`geocode-gateway.ts:67`), so nothing leaks today — but the first future `api.get('https://third-party/…')` will ship the 15-minute access token to that origin with no test noticing.
* **Suggested fix**: only attach the header when the request URL is same-origin (`new URL(req.url, location.origin).origin === location.origin`) and/or add an interceptor spec asserting no header for an absolute cross-origin URL.

### 9. Level: Low — Logout is not cross-tab; a second tab keeps a live access token

* **Where**: `session/auth-store.ts:200-210` (best-effort `POST /auth/logout`, then local clear), `core/token-store.ts:49-56`. There is no `storage` event listener anywhere in `src/app` (grep: `addEventListener('storage'` → 0 hits).
* **Why it matters**: logging out in one tab revokes the refresh token server-side, but another open tab keeps a valid in-memory access token until it expires — up to the documented 15-minute access TTL (`application.yml:158`). Bounded, but non-zero, and easy to miss when testing "log out". (The much harder cross-tab case — concurrent refresh rotation — *is* handled: `auth-store.ts:264-288`.)
* **Suggested fix**: subscribe to `window.addEventListener('storage')` for the refresh-token key and call `clearSession()` when it disappears (or use a `BroadcastChannel` for a logout signal).

### 10. Level: Low — The duplicated black-and-yellow token map in `index.html` is only partly pinned by tests

* **Where**: `src/index.html:29-80` (45 inline `--color-*` tokens) vs `src/app/core/theme-tokens.ts:86-141`. I diffed them programmatically: **they agree today** (45 vs 45 names, no value mismatch).
* **What is wrong**: the lockstep is asserted for one pinned token (`prepaint.spec.ts:60` `BLACK_AND_YELLOW_PIN = '--color-text'`), by substring presence (`theme-store.spec.ts:243-247`) and by behavioural equality of the two implementations for 10 states (`prepaint.spec.ts:246-277`) — none of which compares the two *maps*. `design-tokens.spec.ts` parses only `styles.scss` and `theme-tokens.ts`.
* **Why it matters**: adding a token to `:root` + `theme-tokens.ts` and forgetting `index.html` keeps the whole suite green while the pre-paint palette is incomplete — the exact flash the pre-paint mechanism exists to prevent (and `design-tokens.spec.ts:409-417` would still pass).
* **Suggested fix**: in `design-tokens.spec.ts`, extract the inline `openshelterThemeTokens` object from `index.html` and assert its name→value map equals `BLACK_AND_YELLOW_TOKENS` (both directions).

### 11. Level: Low — `/map` renders every shelter as a DOM row *and* a Leaflet `divIcon`; the backend paging/bbox API is unused

* **Where**: `gateways/shelter-gateway.ts:49-51` (`list()` — "no paging — Estonia-scale fetch-all"), `features/map/map-page.html:240-246` (`@for (shelter of sorted(); track shelter.id)` → `<li><button>` per row), `shared/leaflet-service.ts:157-173` (one `L.marker`+`L.divIcon` per shelter, no clustering), while the backend offers `minLat/minLng/maxLat/maxLng/limit(1..200)/offset` (`src/main/java/ee/sheltermap/api/ShelterController.java:148-205`).
* **Why it matters**: at the documented production scale (~300 rows — `README.md:518`, `docs/whitepaper.md:182`) this is fine and I am **not** reporting it as a defect today; it is a scaling ceiling (two DOM-heavy representations, no virtualization, no marker clustering) that arrives silently with community growth, because the API already provides the paging the page never asks for.
* **Suggested fix**: nothing now; note as a known limit, and consider viewport-bbox fetching plus `leaflet.markercluster` when the row count grows (both are already supported server-side).

### 12. Level: Low — `ng test` prints an `ERROR TypeError: region.scrollIntoView is not a function` for every admin-editor spec

* **Where**: `features/admin/admin-page.ts:1209` inside the `afterNextRender` reveal hook (`region.scrollIntoView({...})`), surfaced in the run as `stderr | admin-page.spec.ts … ERROR TypeError` (the suite still passes: 1263/1263).
* **Why it matters**: it is a jsdom limitation, not a product bug (real browsers implement it), but the unguarded call also means the reveal hook can throw before `firstField?.focus()` runs — in any environment without `scrollIntoView`, the keyboard user silently loses the "focus lands in the form" guarantee. It also adds noisy `ERROR` lines to the test output, which hides real errors.
* **Suggested fix**: guard the call (`if (typeof region.scrollIntoView === 'function')`) or shim `Element.prototype.scrollIntoView` in `src/test-setup.ts` (the file already shims `Range.getBoundingClientRect` for the same reason).

### Nit (informational, no fix required)

* `core/token-store.ts:7` uses `os.refresh` while the other four storage keys use the `openshelter-` prefix (`theme-store.ts:17`, `i18n.service.ts:20,31`, `consent-store.ts:11`) — harmless, but the odd one out.
* `shared/page-shell.html:85-93`: the accessibility trigger sets `aria-expanded` but no `aria-controls`/`aria-haspopup="dialog"` pointing at the dialog.
* `features/admin/guidance-editor.ts:823` reads `root.innerHTML` from the Quill editor — safe (it is the admin's own sanitized content and it is re-sanitized server-side on save), but it is the one place where DOM HTML becomes a value again; a comment stating why it cannot carry untrusted markup would help future readers.

---

## Areas found clean (checked, no issue)

XSS sinks and dynamic URLs (see "Correct" 1-2); `target="_blank"` handling; secrets/URLs in `environment*.ts`; production source maps; image markup (dimensions, lazy/async, error fallback, alt); lazy loading of the rare routes (Quill confirmed out of the initial bundle); open-redirect handling; third-party token leakage (Nominatim via `fetch`); dialog focus management (trap, Escape, focus return, backdrop) including the "never steal focus from an open modal" guard on route change; heading structure and landmarks; table headers and form labelling; live regions for banners/loading/async results; skip link; mobile-menu tab-order behaviour; storage robustness in the theme/locale/consent stores; the WCAG contrast spec itself (real, passing, three themes, honest exemptions); `@for ... track` used everywhere (compiler-enforced in Angular 22).

## Contradiction check for agent 12

* `styles.scss:303-306` asserts Leaflet's light chrome "stays readable in both themes and needs no `.leaflet-…` override". My finding 2 contradicts that for **links and the focus ring** (the inherited text colour argument is correct; the link colour and the ring are not covered). This is a doc-vs-cascade conflict worth resolving, not two reviews disagreeing about the code.

---

## Top 5 findings

1. **High** — Field-level validation errors are invisible to assistive tech (no `aria-invalid`/`aria-describedby`/`role="alert"`) on `/login`, `/register`, `/reset` and `/account`, unlike the `/submit` precedent (`features/auth/*.html`, `features/account/account-page.html`).
2. **High** — In the black-and-yellow (and, for the focus ring, high-contrast) themes, Leaflet's white zoom buttons/attribution strip are outside the token system: link/glyph contrast 1.14-1.30:1 and the focus ring 2.05-2.10:1 on the light map surface — on the home route, and including the OSM attribution link (`accessibility-dialog.component.scss:148`, `leaflet-service.ts:126-131`).
3. **Medium** — Initial bundle 859.73 kB raw / 200.94 kB transfer, 299.73 kB over its own 560 kB budget with 7 build warnings, including all three i18n catalogs (≈61 kB gzip) and the whole eager auth/account surface (`angular.json:44-55`, `i18n.service.ts:44`, `app.routes.ts:4-9`).
4. **Medium** — No CSP on the SPA document while the 30-day refresh token lives in `localStorage`; the backend's CSP is explicitly API-only (`SecurityHeadersFilter.java:23-24`, `index.html`, `angular.json`).
5. **Medium** — Full-size images (≤5 MiB / ≤10000 px per side) are served into 400×300 cards and 40×40 thumbnails with no `srcset` and no server-side variants (`MediaController.java`, `application.yml:288-308`, `guidance-list-page.html:49-59`).
