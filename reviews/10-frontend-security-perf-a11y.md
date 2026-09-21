# Agent 10 — Frontend: security, performance, accessibility

Read-only review (2026-09-21). The only file created is this report.
Repository root: `/home/aleks/MyScripts/LocalRepos/OpenShelter`, frontend in `frontend/`.
Tree state reviewed: commit `d247007` **plus** the uncommitted lane (37 changed paths, see
"Half-applied state" below). Findings that depend on that uncommitted state are marked
**[uncommitted]**.

## Environment / method

| Item | Value | Evidence |
| --- | --- | --- |
| Angular | `^22.1.0` in package.json, **22.1.5 installed** (standalone components, functional guards/interceptors) | `frontend/package.json:11-20`; `node -e require('@angular/core/package.json').version` |
| TypeScript | `~6.0.2` | `frontend/package.json:26` |
| Test runner | vitest `^4.0.8` via `@angular/build:unit-test`, jsdom 28.1.0 | `frontend/angular.json:83-90`, `package.json:15` |
| Third-party UI | `leaflet` 1.9.4 (eager — the default `/map` route), vendored Quill 2.0.3 (`src/vendor/quill/`) | `package.json:19`, `frontend/src/vendor/quill/2.0.3/` |
| Build measured | `npx ng build --configuration production --output-path /tmp/osh-build10 --stats-json` (nothing written into the repo) | build log below |
| Tests run | `npx ng test --no-watch` → **59 files: 1396 passed, 2 failed (1398)** | see Finding 1 |

Ignored as instructed: `node_modules/`, `dist/`, `.angular/`, `target/`.
Read-only commands used: `npx ng build -c production --output-path /tmp/osh-build10 --stats-json`,
`npx ng test --no-watch`, `python3 scripts/spa-csp.py /tmp/osh-build10/browser/index.html`,
plus greps / `read` over `frontend/src`. No repo file was modified by this review: the sole write
was `write reviews/10-frontend-security-perf-a11y.md` (the pre-existing uncommitted state — other
agents' `reviews/*.md`, the lane's source edits — was already there when I started).

### Half-applied state (per the sweep brief)

Note: the working tree moved while this review ran (other writers were active — `frontend/src/styles.scss`
mtime 22:36:58, `design-tokens.spec.ts` 22:37:00, `frontend/README.md` 22:36:28,
`qa/accessibility-checklist.md` 22:35:20, `README.md` 22:40:51, and a build written into the
(git-ignored) `frontend/dist` at 22:36:12). I re-ran the suite at 22:43:11 **after** those writes and
re-read the two files the findings rest on; every result below was re-confirmed in that final state.
Nothing outside `reviews/10-frontend-security-perf-a11y.md` was written by this review.

Uncommitted paths that matter to this review: `frontend/src/styles.scss`,
`frontend/src/app/shared/page-shell.scss`, `frontend/src/app/shared/consent-banner.component.scss`,
`frontend/src/app/features/admin/*` (admin list paging lane), `frontend/src/app/design-tokens.spec.ts`,
`qa/accessibility-checklist.md`, `frontend/README.md`. Finding 1 is **caused by** that state
(a re-wrapped CSS token); Finding 2 is **the new `*:focus` block** in it; Finding 4 has two extra
style-budget warnings from the new admin stylesheets.

---

## Correct — verified in the current tree, not assumed

**The five fixed items from the previous sweep are genuinely fixed. I re-verified each.**

1. **Field-level validation errors are now announced.** `aria-invalid` + `aria-describedby` +
   `role="alert"` are present on every field-error group that previously had none:
   `features/auth/login-page.html:27,34,46,53`, `register-page.html:26,33,50,57,80,87,106,113`,
   `reset-page.html:24,31,68,75,91,98,123,130`, `account-page.html:64,70,83,89,167,174,194,201,278,285,306,313`
   (12 controls across the four forms). Every referenced id resolves inside its own template
   (I extracted all `id=` and `[attr.aria-describedby]` values programmatically — 0 unresolved), and
   the `@let …Invalid` single-condition pattern means the binding and the `@if` cannot disagree.
2. **The accessibility themes no longer break Leaflet's light chrome.**
   `shared/accessibility-dialog.component.scss:196-266` now overrides the zoom bar (black fill +
   `--color-text` glyph, 14.67:1), the attribution strip (black fill, `--color-link` underlined,
   16.11:1) and the focus ring on the light map surface (`--color-bg-surface` 21.00:1 / 18.42:1;
   yellow on the black strip 14.67:1), with a specificity argument (0,2,1)+ vs Leaflet's (0,1,1).
   The `a:focus-visible` token rule at `styles.scss:410-415` is (0,1,1), so the page-wide
   `[data-theme='black-and-yellow'] a` rule no longer wins the tie on white.
3. **The map-row badge reaches AA.** `features/map/map-page.scss:473,477` is now an **8 %**
   `color-mix`; I recomputed it with the WCAG formula: registry `#1769aa` on `#ecf3f8` = **5.15:1**,
   user `#2e7d32` on `#eef4ef` = **4.60:1** (both ≥ 4.5:1). The spec now *re-parses the percentage
   out of the SCSS* (`design-tokens.spec.ts:494-530, 596-660`: `MIXED_PAIRS` reads the `color-mix(…)`
   string from `map-page.scss`, and a companion test fails if a *new* `color-mix` background appears
   without a declared entry). That test passes in my run.
4. **The two non-default catalogs are lazy and the bundle is measurably smaller.**
   `core/i18n/i18n.service.ts:61-64` (`EAGER_CATALOGS = { en: EN }`, `LAZY_CATALOG_LOADERS` with
   `import('./et')` / `import('./ru')`). My production build emits `chunk-DrY8l-Rx.js | et 66.50 kB`
   and `chunk-6-Ba7gHb.js | ru 100.36 kB` as **lazy** chunks and no `en` chunk (EN stays in the
   initial graph). Initial total: **720.85 kB raw / 175.40 kB transfer** (previous sweep: 862 kB /
   200.94 kB; the claim's "711–720 kB, 173.56 kB" is confirmed within hashing noise).
5. **The CSP enabler works, hash-included.** The builder still emits
   `<link rel="stylesheet" href="styles-*.css" media="print" onload="this.media='all'"><noscript>…`
   (`/tmp/osh-build10/browser/index.html`), and `frontend/scripts/postbuild-csp.mjs`'s pattern
   matches it exactly: I ran the script's own regex against the real emitted HTML →
   `matches: 1, changed: true`, no residual `onload=` / `media="print"`. The documented policy's two
   pre-paint hashes are **current**: `python3 scripts/spa-csp.py /tmp/osh-build10/browser/index.html`
   prints exactly `sha256-eEsoRzCi5dUPfjfiEAEbV+3sri1glfPnaHWpq5qf7ko=` and
   `sha256-uRaocgOj5NiVsHL0rjZSuS7oiMAjFXrAjPwRiKToi6c=`, matching `docs/deploy/spa-csp.md:41,74,97`.
   The doc's load table also holds: the built `styles-WFZD5YTH.css` contains **no `@font-face` and no
   absolute `url()`** (only `./media/*.png` Leaflet assets → `'self'`).

**Security — clean, re-verified (no changes from the previous sweep's conclusions):**

- Exactly **one** `[innerHTML]` in application code: `features/guidance/guidance-detail-page.html:74`
  (`[innerHTML]="p.bodyHtml ?? ''"`), annotated as server-sanitized + Angular-sanitized.
  No `bypassSecurityTrust*`, no `DomSanitizer`, no `eval`/`new Function`/`document.write`/`outerHTML`
  anywhere in `frontend/src/app` (the only other `innerHTML` hits are comments, specs, and the
  vendored Quill bundle).
- The admin editor's HTML round-trip is **not** an XSS sink either: `guidance-editor.ts:886-890`
  loads stored markup through `quill.clipboard.dangerouslyPasteHTML`, and Quill 2's `convertHTML`
  parses it with `new DOMParser().parseFromString(t,'text/html')` (vendored `quill.js`) — an inert
  document, so no script executes and no `onerror` image fires. The `root.innerHTML` reads
  (`guidance-editor.ts:857,911`) only read the admin's own already-allowlisted document.
- Dynamic URLs are safe by construction: `shelter-detail-page.ts:601-615` builds
  `https://www.google.com/maps/dir/…<lat.toFixed(5)>,<lng.toFixed(5)>` and
  `https://maps.apple.com/?daddr=…&q=encodeURIComponent(name)` behind a `Number.isFinite` guard
  (`:624-626`), and `[href]` bindings run through Angular's `ɵɵsanitizeUrl`.
- **Every `target="_blank"` carries `rel="noopener"`** — 7 sites, no exceptions:
  `shared/page-shell.html:150,163,167`, `features/map/map-page.html:111`,
  `features/shelter/submit-shelter-page.html:179`, `features/shelter/shelter-detail-page.html:80,87`
  (grep for `_blank` returns exactly these plus specs).
- No secrets in `environments/environment.ts` / `environment.development.ts` — `production` +
  `apiUrl: ''` only, with the "public configuration only" note (`environment.ts:19-22`).
- Token storage is the documented tradeoff: access token in an in-memory signal, refresh token in
  `localStorage['os.refresh']`, every storage access wrapped in `try/catch`
  (`core/token-store.ts:12-56`).
- Guards fail closed: `adminGuard` (`core/guards.ts:84-94`) requires authenticated **and** admin,
  anonymous and non-admin both go home; `safeReturnUrl` (`guards.ts:33-43`) rejects absolute/`//`/
  backslash values on both consumers.
- **No source maps in production**: `find /tmp/osh-build10 -name '*.map'` → empty; `angular.json`
  does not enable `sourceMap` for `production`.
- Quill stays inside the admin chunk (grep `ql-editor` → only `chunk-CXAKo5E-.js`), and the only
  external origins the app talks to are `tile.openstreetmap.org` and `nominatim.openstreetmap.org`
  (the latter via global `fetch`, `gateways/geocode-gateway.ts:67`, never `HttpClient` — so no
  Bearer header can reach it).

**Accessibility — clean, re-verified:**

- The WCAG contrast spec is real and passes (three themes): the only failing tests in the suite are
  the two token **name-set** assertions (Finding 1) — every `CONTRAST_CHECKS` pair,
  `MIXED_PAIRS` pair and "exemptions are honest" assertion passes.
- The previous sweep's "hardcoded English ARIA labels in a trilingual app" item is now **fixed
  everywhere**: `grep 'aria-label="[^"]' src/app/**/*.html` → 0 hits (no unbound literal aria-label
  remains); every one is `[attr.aria-label]="… | t"` — including the shell navs
  (`page-shell.html:36,136`), the map legend/results/filters/list (`map-page.html:10,125,193,210,240`)
  and the admin regions (`admin-page.html:17,235,278,703,741,1064,1184`).
- All 42 `<th>` carry `scope` (0 without), all 6 `<img>` carry explicit `width`/`height` +
  `loading="lazy" decoding="async"` (the above-the-fold article hero adds `fetchpriority="high"`),
  the hero's alt follows the stored alt with a deliberate empty alt when absent
  (`guidance-detail-page.html:34-42`), and no template renders two `<h1>` in the same state
  (the two-`<h1>` files are documented mutually exclusive `@if` branches).
- The new admin work I checked for regressions is **clean**: the source chips are real `<button>`s
  with `aria-pressed` inside a labelled `role="group"` (`admin-page.html:235-249`), both new search
  forms have explicit `<label for>` (`:236, :888`), the out-of-range states use `role="status"`,
  the shared `app-pagination` is a labelled `<nav>` with labelled buttons and a `role="status"`
  page readout (`shared/pagination.html:1-27`), the two pagination instances never co-render
  (mutually exclusive tabs), and the new stylesheets introduce **no** new contrast risk: I computed
  `.chip--active` (primary fill, `--color-bg-surface` text) = **5.77:1** light / **8.76:1** HC /
  **10.23:1** B&Y, and `.admin-oob` muted text = 5.64:1 light — all pass.
- The Quill toolbar/editor keeps explicit token focus rings (`guidance-editor.scss:303-308`), so the
  new `*:focus` suppression does **not** silently swallow them.

---

## Findings

### 1. Level: High — **[uncommitted] the frontend test suite is RED: a re-wrapped CSS token drops out of the parser and fails two design-token assertions

- **Where**: working tree `frontend/src/styles.scss:33-37` (the wrap) vs `frontend/src/app/design-tokens.spec.ts:243-253` (the parser) and `:523-545` (the assertions).
- **What is wrong**: the `:root` declaration is written across five lines in the working tree:
  ```scss
  --color-surface-overlay: rgba(
    255,
    255,
    255,
    0.92
  ); /* map legend overlay — white card, neutral on the new background */
  ```
  `colorTokens()` reads **one line at a time** (`/(--color-[\w-]+)\s*:\s*([^;]+);/`,
  `design-tokens.spec.ts:247`), so `--color-surface-overlay` is never captured from `:root` — while
  the high-contrast block (`styles.scss:327`, single line) and the B&Y runtime map
  (`core/theme-tokens.ts:77`) still are. The name-set equality tests then fail.
- **Evidence (repro)**:
  - `cd frontend && npx ng test --no-watch` → `Test Files 1 failed | 58 passed (59)`,
    `Tests 2 failed | 1396 passed (1398)`:
    `design-tokens.spec.ts:523` → `high-contrast tokens missing from :root: expected ['--color-surface-overlay'] to deeply equal []`
    and `:531` → `black-and-yellow tokens without a :root counterpart: ['--color-surface-overlay']`.
  - Independent reproduction with the same regex over `git show HEAD:frontend/src/styles.scss` vs the
    working-tree file: HEAD → `root=44 hc=44 by=45`, mismatches `[]`; working tree → `root=43 hc=44 by=45`,
    mismatches `['--color-surface-overlay']` on both sides.
  - Re-confirmed on a second full run at 22:43:11 (after the concurrent writes noted above):
    `Test Files 1 failed | 58 passed (59)`, `Tests 2 failed | 1396 passed (1398)`, same two tests, same
    assertions; `src/styles.scss:33-37` still carries the wrap.
  - This is a **regression of a fix that already exists**: commit `f47e106`
    ("fix(a11y): a wrapped token reads as missing…") unwrapped exactly this declaration
    (`git show HEAD:frontend/src/styles.scss` has it on one line). The uncommitted lane re-wrapped it.
- **Why it matters**: the suite is red in the current tree, so the project's single strongest a11y
  guard (the three-theme contrast/name-set spec) can no longer be trusted as a gate; and because the
  failure is a *formatting* change, it will look like noise and be "fixed" by editing the test.
- **Suggested fix** (minimal, two parts):
  1. Un-wrap the declaration again (one line), as `f47e106` did.
  2. Harden the parser so a multi-line value cannot silently drop a token: join continuation lines in
     `colorTokens()` until the `;` is seen (or assert
     `count of /--color-[\w-]+\s*:/ in the block === rootTokens.size`). Otherwise the same trap
     returns the next time prettier wraps a value.

### 2. Level: Medium — **[uncommitted] `*:focus { outline: none }` removes the keyboard-focus indicator from the `<select>` controls (including a public page) and from the seven `tabindex="0"` scroll regions; the documented deviation undercounts its own scope

- **Where**: `frontend/src/styles.scss:423-446` (`*:focus { outline: none; }` at `:444`), the
  survivors list at `:410-415`; suppressed elements: `shared/pagination.html:28` (page-size
  `<select>`, rendered on the **public** `/blog` index at `features/guidance/guidance-list-page.html:92`),
  `features/admin/admin-page.html:871` (content-language `<select>`), and the `tabindex="0"` regions
  `admin-page.html:113,278,703,741,1064,1184` + `features/admin/guidance-order-list.html:36`.
- **What is wrong**: an author rule beats the UA stylesheet, and `*:focus` is (0,1,0) while the
  project's token ring only covers `a|button|input|textarea:focus-visible` (0,1,1) — so any
  *other* keyboard-focusable element loses its only focus indicator. That is exactly the
  owner-accepted WCAG 2.4.7 (Focus Visible, AA) deviation documented in
  `qa/accessibility-checklist.md` §3 and `frontend/README.md:113-124`. Two gaps in that record:
  (a) the deviation's scope is stated as "the six `tabindex="0"` admin table regions" while the
  evidence lists **seven** (`admin-page.html:113,278,703,741,1064,1184` + `guidance-order-list.html:36`);
  (b) it lands on one **public** control — the `/blog` page-size selector — not just admin surfaces.
- **Why it matters**: a keyboard user (the exact audience of the accessibility themes this project
  ships) cannot see where focus is on the blog pager's size `<select>`; on the admin tables they lose
  the "you are now in this scroll region" cue that the region was given `tabindex` for. The 10 other
  rings are genuinely unaffected — I checked every `outline` declaration in `styles.scss` and
  `src/app/**/*.scss` and each survivor has specificity ≥ (0,1,1), plus the Quill controls keep an
  explicit ring at `guidance-editor.scss:303-308`.
- **Suggested fix**: retire the deviation instead of documenting it — extend the existing survivor rule
  to the two shapes it misses:
  ```scss
  select:focus-visible,
  .admin-table-wrap:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  ```
  (this cannot bring back the complaint the suppression fixed: that was the UA ring on
  *programmatically* focused containers, and the token ring is (0,1,1)+). If the suppression is kept,
  fix the "six → seven" count and name the public `<select>` in both the comment and the checklist.

### 3. Level: Medium — Full-size media originals are served into 40×40 admin thumbnails with no variant URL and no `srcset`, and the media library is unpaged

- **Where**: `features/admin/admin-page.html:1083-1091` (`width="40" height="40"`, `[src]="row.url"`),
  `features/admin/guidance-order-list.html:69-76` (40×40, hero),
  `features/admin/guidance-editor.html:133-140` (56×56) and `:187-196` (72×72, hero picker);
  `gateways/admin-gateway.ts:460-466` (`GET /admin/media` → **every** asset, no limit/offset);
  `api/MediaAssetDto.java` has a single `url` (no derived variants); the server serves the stored
  file as-is (`api/MediaController.java`) under a 5 MiB / 10000-px-per-side cap
  (`application.yml` media caps). `grep -rn 'srcset|<picture' src/app` → 0 hits; `ngSrc`/`NgOptimizedImage`
  → 0 hits.
- **What is wrong**: the admin Media tab renders one row per asset *and* one full-size `<img>` per row,
  so opening the tab in a library with N uploads issues N full-resolution downloads to fill 40×40
  boxes. `loading="lazy"` bounds it to what scrolls into view — it does not bound the bytes per image.
  The public `/blog` index has the same shape at card scale (400×300 box for the same original).
- **Why it matters**: this is the one page whose weight is entirely media-driven, and it is the
  sharpest case of the previous sweep's Medium finding; a routine admin review session on a metered
  connection is tens to hundreds of megabytes. The public-index variant is a **documented** deferral
  (`openspec/changes/crisis-guidance/design.md:258` "No derivative pipeline in v1", `:442-443` future
  work), so I am reporting the *new* unpaged admin library as the actionable half.
- **Suggested fix**: cheapest first — (a) add `?w=80` (or a `-80.webp` derived name) to the media
  thumbnail path in the admin templates and teach `MediaController` to resize-on-miss with the
  existing immutable cache header; (b) page `GET /admin/media` with the same `limit`/`offset` +
  `X-Total-Count` contract the guidance list already uses (`app-pagination` is already imported in
  that component), which alone caps a page at `size` images; (c) then add `srcset`/`sizes` to the
  public card.

### 4. Level: Medium — The initial bundle is still ~161 kB over its own warning budget, and the auth/account surface is still eager

- **Where**: `frontend/angular.json:44-55` (`initial` 560 kB warn / 1 MB error, `anyComponentStyle`
  4 kB warn), `frontend/src/app/app.routes.ts:39-70` (`component:` — eager — for `MapPage`,
  `LoginPage`, `RegisterPage`, `ResetPage`, `VerifyPage`, `AccountPage`).
- **Measured** (`/tmp/osh-build10`, my build): `Initial total 720.85 kB raw / 175.40 kB transfer`
  and **9 budget warnings**:
  `WARNING bundle initial exceeded maximum budget. Budget 560.00 kB was not met by 160.85 kB`,
  plus 8 `anyComponentStyle` warnings (> 4 kB): `map-page.scss` 8.29, `admin-page.scss` 6.68,
  `shelter-detail-page.scss` 6.08, `page-shell.scss` 4.92, `guidance-editor.scss` 4.27,
  `submit-shelter-page.scss` 4.11, `guidance-translations.scss` 4.08, `guidance-order-list.scss` 4.04
  (the last two are new in this lane).
- **What is wrong / why it matters**: two things. (i) The fix landed the catalogs but not the second
  half of the previous recommendation: `main-BGLWAITF.js` still contains the whole logged-in surface
  for anonymous visitors — `map-page.ts` 33.8 kB, `account-page.ts` 27.3 kB,
  `contributions-panel.ts` 16.8 kB, `verify-page.ts` 11.1 kB, `reset-page.ts` 9.3 kB,
  `register-page.ts` 7.8 kB, `login-page.ts` 4.8 kB ≈ **111 kB of output bytes** that no first-paint
  visitor needs, i.e. roughly 15 % of the initial bundle, while the surrounding routing comments claim
  to be "bundle budget"-driven (`app.routes.ts:32-35`). (ii) The warn budgets are permanently red, so
  they no longer guard anything for the whole initial chunk or the eight component styles; a real
  regression is only caught at the 1 MB error line, and the 8 recurring style warnings train reviewers
  to ignore the build output.
- **Suggested fix**: `loadComponent` for `/login`, `/register`, `/reset`, `/verify`, `/account` (same
  one-line pattern already used 7× in the same file — no test change needed, the guards are
  route-level and unchanged); then re-baseline `initial.maximumWarning` to the measured number
  (~600 kB, keeping the 1 MB error) and raise `anyComponentStyle` to something true (6 kB) or split
  the two largest sheets. Leaving both red is the status quo this finding is about.

### 5. Level: Low — The shipped CSP one-liner silently assumes a same-origin API, while the environment file explicitly supports a cross-origin one

- **Where**: `docs/deploy/spa-csp.md:41` (`script-src …; default-src 'self'; … connect-src 'self'
  https://nominatim.openstreetmap.org; img-src 'self' data: blob: https://tile.openstreetmap.org`)
  vs `frontend/src/environments/environment.ts:19-22` ("Deployments with the API on another origin
  must set this to that origin … before building").
- **What is wrong**: the policy has no slot for the API origin. In the documented cross-origin
  deployment (`apiUrl: 'https://api.example.ee'`) the same one-liner blocks **every** `HttpClient`
  call (`connect-src 'self'`) and every media/hero image (`img-src 'self'`), i.e. pasting the
  ready-to-use header breaks the app — with a console-only failure mode. The doc's prose is careful
  everywhere else (it explains why the meta tag is wrong, why tile/geocoder origins are listed), so
  this looks like a gap rather than a decision.
- **Why it matters**: the doc is presented as copy-paste-ready for exactly the operator who also has
  to edit `apiUrl`; the two instructions can be followed correctly and still produce a broken site.
- **Suggested fix**: one sentence in the doc's notes — "if `apiUrl` is not empty, add that origin to
  `connect-src` (and `img-src` if it serves `/api/media/*`)" — and, optionally, an entry in the
  load table next to the Nominatim row.

### 6. Level: Low — The CSP-safe `index.html` is produced only by the npm `postbuild` hook; a direct `ng build` emits the CSP-hostile document with exit code 0

- **Where**: `frontend/package.json:9` (`"postbuild": "node scripts/postbuild-csp.mjs"`),
  `frontend/scripts/postbuild-csp.mjs:44-71`, `frontend/README.md:115-124`,
  `docs/deploy/spa-csp.md:55-62`.
- **What is wrong**: the rewrite is not part of the Angular build, so any `ng build` (the command used
  in `openspec/changes/*/tasks.md`, e.g. `shelter-meta-truth/tasks.md:62`, `docs/autopilot/…` reports,
  and the natural thing to run in an ad-hoc shell) produces an `index.html` whose stylesheet swap uses
  `onload="this.media='all'"` — an inline event handler that a hash-only `script-src` cannot allow, so
  under the documented policy the SPA renders **unstyled** (the link stays `media="print"`). There is
  no CI in the repo to run `npm run build`, so nothing enforces the hook.
- **Why it matters**: this is the failure the previous sweep's CSP fix was written to prevent, and it
  is currently prevented only by prose in two docs and by remembering to type `npm run`.
- **Suggested fix**: make the invariant enforced rather than documented — e.g. a tiny wrapper target
  used by the docs (`npm run build`), or have `postbuild-csp.mjs` also fail (exit 1) when the pattern
  is present but the rewrite cannot be applied, and add a `ng build`-time assertion (an
  `@angular/build` plugin or a script in `scripts/`) that greps the emitted `index.html` for
  `onload=` and exits non-zero.

### 7. Level: Low — Admin thumbnails repeat the filename in `alt`, duplicating the visible text right next to it

- **Where**: `features/admin/admin-page.html:1086` (`[alt]="row.originalFilename"`, with the same
  filename rendered as text in the next cell at `:1092`), `features/admin/guidance-editor.html:189`
  (`[alt]="asset.originalFilename"` inside a `<button>` that also renders
  `<span class="hero-picker__name">{{ asset.originalFilename }}</span>` at `:197`).
- **What is wrong**: the image is decoration *for* a label that is already in the accessibility tree,
  so a screen reader announces the filename twice per row/button; the admin media grid then reads as
  a stream of duplicated names.
- **Why it matters**: WCAG 1.1.1 wants a text alternative, not a second copy of adjacent text; the
  duplication is noise in the one table an admin scans linearly. (The public card/detail alts are
  already correct: `heroImageAlt` with a deliberate empty alt when absent.)
- **Suggested fix**: `alt=""` on these three admin thumbnails (the filename is the adjacent text and,
  in the picker, the button's own label).

### 8. Level: Low — Unchanged from the previous sweep: the interceptor is still origin-blind

- **Where**: `core/api-interceptor.ts:13` (`NO_BEARER_ENDPOINT = /\/auth\/(login|refresh)$/`) with
  `:56-61`, plus `core/api-client.ts:37,59` (`path.startsWith('http') ? path : baseUrl + path`).
- **Status**: **confirmed open** — grep for `location.origin` / `sameOrigin` in
  `api-interceptor.ts` and `api-client.ts` → 0 hits; no spec asserts the no-header case for an
  absolute cross-origin URL. Nothing leaks today (every `HttpClient` path is same-origin with
  `apiUrl: ''`, and the one external call uses global `fetch`), so this stays Low — but the first
  future `api.get('https://third-party/…')` ships the 15-minute access token there silently.
- **Suggested fix**: attach the header only when
  `new URL(req.url, location.origin).origin === location.origin`, and add the interceptor spec case.

### 9. Level: Low — Unchanged from the previous sweep: logout is not cross-tab

- **Where**: `session/auth-store.ts:200-210` (best-effort `POST /auth/logout`, then local clear) and
  `core/token-store.ts:49-56`; grep `addEventListener('storage'` / `BroadcastChannel` in `src/app`
  → 0 hits.
- **Status**: **confirmed open**. A second open tab keeps a valid in-memory access token until it
  expires (documented 15-minute TTL) after the user logs out in the first tab.
- **Suggested fix**: a `storage` listener that calls `clearSession()` when `os.refresh` disappears,
  or a `BroadcastChannel('logout')` ping.

### Also verified — no issue found (explicitly)

- Production source maps: none emitted (`find /tmp/osh-build10 -name '*.map'` → empty), no
  `sourceMap` override in `angular.json`'s `production` configuration.
- Vendored Quill 2.0.3 and Leaflet 1.9.4: no known sink-relevant pattern; Quill is confined to the
  admin chunk; Leaflet is deliberately eager because `/map` is the default route.
- `renderToString`/SSR-style HTML injection: none.
- Template-injection through i18n: `t()` renders through Angular interpolation, and the
  site-texts overlay is plain text (documented at `core/i18n/i18n.service.ts:98`,
  `core/i18n/site-texts.ts:16`) — escaped, never `innerHTML`.
- `/map` still renders every shelter as a DOM row *and* a Leaflet `divIcon` (no virtual scroll /
  clustering) while the backend offers bbox + `limit/offset` (`gateways/shelter-gateway.ts:49-51`).
  At the documented ~300-row scale this is fine and is a known scaling ceiling, not a defect — same
  conclusion as the previous sweep; the new work did add server-side paging to the admin lists and
  the public `/blog` index, which is a real improvement.
- The previous sweep's `region.scrollIntoView is not a function` noise: **corrected / resolved** —
  the current run prints no `ERROR` lines at all, and `admin-page.spec.ts:2377-2397` stubs
  `Element.prototype.scrollIntoView` and asserts focus lands on `#ge-title` (`:2456,2476,2495,2509,2534`).
- The duplicated B&Y token map in `index.html` vs `core/theme-tokens.ts`: still in lockstep
  (45/45 names, 0 value mismatches, checked programmatically). The previous sweep's note stands
  (only `--color-text` is pinned, `prepaint.spec.ts:60`) — and Finding 1 shows how this class of
  "reads as missing" drift actually bites.

---

## Top 5 findings

1. **High [uncommitted]** — the frontend suite is **red**: `npx ng test --no-watch` → 2 failed /
   1396 passed, both in `design-tokens.spec.ts:523,531`, because `frontend/src/styles.scss:33-37`
   re-wraps `--color-surface-overlay` across lines and `colorTokens()` (`:247`) reads one line at a
   time. It is a regression of the fix in commit `f47e106`. Un-wrap the declaration and make the
   parser join continuation lines.
2. **Medium [uncommitted]** — `*:focus { outline: none }` (`styles.scss:444`) strips the focus
   indicator from the two `<select>`s — one of them the **public** `/blog` page-size selector
   (`shared/pagination.html:28`) — and from seven `tabindex="0"` admin regions (the deviation is
   documented as "six", and it is owner-accepted). Add `select:focus-visible` (and
   `.admin-table-wrap:focus-visible`) to the token ring to retire the deviation; fix the count.
3. **Medium** — full-size media originals (≤5 MiB / ≤10000 px per side) are served into 40×40/56×56/
   72×72 admin thumbnails with no variant URL and no `srcset`, and `GET /admin/media` is unpaged, so
   the Media tab downloads one original per asset (`admin-page.html:1083-1091`,
   `admin-gateway.ts:460-466`, `MediaAssetDto.java`). Add a resize/`?w=` variant and page the listing.
4. **Medium** — the initial bundle is still **160.85 kB over its own 560 kB warning budget**
   (720.85 kB raw / 175.40 kB transfer) with 9 build warnings, and the whole auth/account surface
   (~111 kB of `main-*.js` output: account, contributions, verify, reset, register, login) is still
   eager (`app.routes.ts:39-70`) despite the routing comments citing bundle budget.
5. **Low** — the documented CSP one-liner (`docs/deploy/spa-csp.md:41`) assumes a same-origin API but
   `environment.ts:19-22` explicitly supports a cross-origin one, so following both documents
   correctly yields a page whose API calls and images are blocked by `connect-src 'self'` /
   `img-src 'self'`; and that policy's usability depends on the `postbuild` hook, which a plain
   `ng build` (exit 0) skips, emitting the CSP-hostile inline `onload` swap instead.
