# OpenShelter — Frontend

Angular SPA for the OpenShelter public-shelter map (Estonia): browse the registry +
user-submitted shelters on a map, register and verify an account, submit shelters,
report listed locations, and manage the account — including one's own contributions
(M8: list/edit/delete own shelters in the account page's "My contributions" panel).

The Spring Boot backend lives in the repo root (`src/`); the backend task pack is in
`context-and-tasks/agent/`. This frontend was built from the task pack in
[`docs/agent/`](docs/agent/) (`01-TASK.md` is the contract, `07-STEPS.md` the milestone
plan M0–M6, all milestones complete). OpenSpec change history: `openspec/changes/` (M6:
`frontend-m6-polish-prod`).

## Stack

- **Angular 22** — standalone components, **zoneless** change detection, signals
  (signals + `computed()` are the state layer; `@angular/core/rxjs-interop` `toSignal`
  where a value needs to cross into a template without a store)
- **TypeScript** (strict) · **SCSS**
- **Leaflet 1.9** (plain CSS import, no `ng-leaflet`) for the map
- **Vitest + @angular/build:unit-test** (Karma-style specs, `fakeAsync`-free: explicit
  tick/polling against real async timing) — the suite is green on this tree; run
  `npx ng test --watch=false` to see the current test and spec-file counts
- No state library, no UI kit, no e2e framework in v1 (see [Deferrals](#deferrals))

## Quick start (dev)

Prereqs: a running backend on `http://localhost:8080` (repo root: Docker Postgres +
`./dev-start.sh` — see the root [README](../README.md)) and Node 26+ / npm 11+
(`package.json` `engines`).

```bash
cd frontend
npm install            # CI installs with `npm ci` against the committed lockfile

npm start              # ng serve → http://localhost:5173 (same-origin API via dev proxy)
npm run start:host     # same, but bound to 0.0.0.0 — reachable from other machines/containers
npm test               # Vitest suite (ng test, watch mode)
npm test -- --watch=false   # single run (CI style)
npm run build          # production build → dist/frontend/
```

Every page works against the live backend — no mocks. The dev server is what the
milestone manual reviews used (backend `:8080` + frontend `:5173`).

**API base in dev.** The SPA calls the API same-origin (`apiUrl: ''` in
`environment.development.ts`); `npm start` / `npm run start:host` run the dev
server with `--proxy-config proxy.conf.js`, which forwards `/api`, `/auth`,
`/account`, `/verify/` and `/admin/` to `http://localhost:8080` on the host.
`/account` is not a plain key: it is both an Angular route and an API path, so
the `.js` config keys on the request (a browser navigation gets
`index.html`, the API calls proxy — the failure modes of a bare `/account`
or `/account/` JSON key are documented in the file). This is what
makes the app work when the page is loaded from _another_ machine — the API
calls ride the same connection to the dev server instead of pointing at the
viewer's own localhost.

**Accessing the dev server from a Docker container** (e.g. an Odysseus browser
container on the default bridge network): start with `npm run start:host`,
then open `http://172.18.0.1:5173` from inside the container (`172.18.0.1`
is the host's bridge gateway). The backend (`:8080`) already binds all
interfaces, and the proxy above keeps all API traffic on the host — no
container-side configuration needed.

## Project layout

```
src/
├── app/
│   ├── core/          # ApiClient, ApiError, TokenStore, ThemeStore (high-contrast theme
│   │                  #   toggle, 'openshelter-theme' localStorage key), guards (auth/guest/verified),
│   │                  #   ApiInterceptor, titleGuard (route titles), models
│   ├── session/       # AuthStore (session state + REAL profile from /account/me)
│   ├── gateways/      # auth / verify / account / shelter / geo / geocode / admin /
│   │                  #   data-source / guidance (*-gateway.ts) — HTTP, no UI
│   │                  #   (geocode = raw fetch to Nominatim)
│   ├── features/
│   │   ├── auth/      # login, register, reset (guestGuard)
│   │   ├── account/   # verify (cross-channel), contact change, ContributionsPanel (M8)
│   │   ├── admin/     # the moderation tool (adminGuard): unconfirmed review queue,
│   │   │              #   shelters, shelter reports, alerts, users, guidance (post
│   │   │              #   authoring + editor), media library, audit
│   │   ├── legal/     # privacy + terms static pages (no backend)
│   │   ├── map/       # browse: Leaflet map + list + source filter (default route);
│   │   │              #   crisis actions: "Nearest shelter" CTA + "Add shelter" entry (auth-only)
│   │   ├── shelter/   # detail + submit; the detail header carries the
│   │   │              #   "Navigate" + "Open in Apple Maps" deep links
│   │   └── guidance/  # the public /blog index + detail pages (crisis-guidance — lazy,
│   │                  #   public, no auth guard)
│   ├── shared/        # PageShell (header + main; nav lives in the header), BannerComponent,
│   │                  #   LoadingIndicator (real component, role=status), LeafletService,
│   │                  #   error-copy, form-helpers, shelter-copy,
│   │                  #   location-input.ts (pure location-string parser)
│   ├── app.routes.ts  # 13 component routes + 2 redirects ('', '**') — the 13
│   │                  #   component routes carry data.title + titleGuard; the two
│   │                  #   redirects ('', '**') carry neither
│   └── design-tokens.spec.ts   # M6 audit: tokens defined/used, responsive + title mechanics
├── environments/      # environment.development.ts (dev server) / environment.ts (prod build)
└── styles.scss        # design tokens (the single source of truth) + global rules;
                       #   also the persisted [data-theme='high-contrast'] token-override block
                       #   (styles.scss:162-255 — accessibility-and-provenance D1/D2)
```

Dependency rule (enforced by review, not tooling): `features` → `gateways` → `core`; `features`
also reach `shared/` and `session/` directly; `shared` is UI + cross-feature helpers; no
`features ↔ features` imports (verified: zero cross-feature imports).

## Design tokens (M6)

All visual constants are CSS custom properties on `:root` in [`src/styles.scss`](src/styles.scss)
(colors, 9-step type scale, 2px-grid spacing, radii, weights, tracking, the 900px narrow
breakpoint, content max-width). Components may only use token references or layout-neutral
literals; `design-tokens.spec.ts` scans every `.scss` file and fails on hex/rgb colors or
off-grid font-sizes, so the audit stays mechanical. A global `:focus-visible` rule makes
every interactive element keyboard-visible.

**Focus rings — the UA ring is suppressed; every operable control keeps a token ring (owner decision
2026-09-21).** The browser-default (UA) ring is suppressed globally by `*:focus { outline: none }` in
`src/styles.scss`, because Chromium painted a dark box on every focused element that had no project rule
— which read as a stray black border. That rule is lower specificity than the token rings, so the
project's own rings still render: `a`, `button`, `input`, `textarea`, **`select`** and
**`.admin-table-wrap`** (the seven `tabindex="0"` admin table scroll regions) all carry
`:focus-visible { outline: 2px solid var(--color-primary) }`, alongside the shell chrome, the dialogs and
the Leaflet map chrome. **No WCAG 2.4.7 deviation remains** — the only thing still suppressed is the two
containers the shell focuses PROGRAMMATICALLY (a route change, a dialog open): not keyboard-operable, so
no indicator is owed. **When you add a focusable control, add its selector to the token-ring list in
`src/styles.scss`**, or the global suppression leaves it with no visible focus indicator. Recorded in
[`qa/accessibility-checklist.md`](../qa/accessibility-checklist.md) §3 and pinned by
`design-tokens.spec.ts` (it asserts both the suppression and the ring).

## Production build

```bash
npm run build     # → dist/frontend/browser/ (outputHashing: all, relative asset paths)
```

`npm run build` runs a `postbuild` hook (`scripts/postbuild-csp.mjs`) after `ng
build`: it rewrites the builder's critical-CSS `print`/`onload` stylesheet swap
into a plain `<link rel="stylesheet">`, because the swap's inline **event
handler** would be blocked by the hash-based proxy CSP (event handlers cannot be
allow-listed by hash — a blocked swap leaves the SPA unstyled). Build with
`ng build` directly only when you do not need the CSP-safe output — the policy
itself is documented in the root [`docs/deploy/spa-csp.md`](../docs/deploy/spa-csp.md).

- **Deploy**: serve `dist/frontend/browser/` from any static host. `index.html` uses
  relative asset paths and `<base href="/">`, so it works at the domain root as-is;
  for a sub-path use `ng build --base-href /path/`. Point the browser's API origin at
  the backend — see [`environment.ts`](src/environments/environment.ts): the production
  file ships `apiUrl: ''` (same-origin default: correct when a reverse proxy serves
  SPA + API from one origin, and never points an end user at their own localhost). If
  the API lives on another origin, set it to that public origin and rebuild.
- **Bundle budget** (`angular.json`, documented per the M6 change — strict-JSON
  tooling keeps the rationale here, not in the file): the default route `/map` is a
  Leaflet map, so Leaflet + Angular core must be in the **initial** bundle; the CLI's
  500 kB default warning is unreachable without dropping the map from first paint.
  Twelve routes are `loadComponent`-lazy: the five auth/account routes (login,
  register, reset, verify, account — none is needed for first paint), admin,
  shelter detail, submit, privacy, terms and the two /blog guidance routes.
  The initial budget was re-baselined at the then-measured initial total
  (`maximumWarning: 741401b` — the previous 560 kB warning budget sat under the
  measured bundle and was permanently red, so it guarded nothing). Measured
  initial total on a fresh build (2026-09-22, re-measured after the five admin
  panels landed): **610.08 kB raw / 157.31 kB transfer** — under the
  741401 b warning, so a fresh build prints no initial-budget warning (fifteen
  component SCSS budgets warn instead, largest first, all against the 4 kB
  warning: map-page 7.42 kB, shelter-detail-page 5.46 kB, page-shell 4.92 kB,
  guidance-translations 4.88 kB, guidance-order-list 4.83 kB, guidance-panel
  4.65 kB, media-panel 4.50 kB, shelters-panel 4.31 kB, guidance-editor
  4.27 kB, submit-shelter-page 4.11 kB, alerts-panel 4.01 kB, audit-panel
  4.01 kB, reports-panel 4.01 kB, unconfirmed-panel 4.01 kB, users-panel
  4.01 kB). The
  `anyComponentStyle` budget
  stays at its defaults (4 kB warning / **10 kB error** — no exception, and the
  30 kB exception a previous lane added for the Quill theme was reverted
  deliberately): the guidance editor's vendored Quill snow stylesheet (≈24 kB,
  admin-only) is NOT inlined into the component style and NOT a global style —
  the build copies it verbatim as the versioned static asset
  `/vendor/quill/<version>/dist/quill.snow.css` (an `assets` entry), and the
  editor's init injects one `<link>` per app, so it is fetched only by the
  admin editor and costs the initial bundle nothing — see
  [`docs/rich-text-editor.md`](docs/rich-text-editor.md) and
  [`src/vendor/quill/README.md`](src/vendor/quill/README.md). Trimming
  the initial bundle further, or raising the warning with a recorded rationale,
  is open work; `maximumError: 1MB` is unchanged.
- **dist sanity** (M6): hashed assets referenced by `index.html`, Leaflet media
  (marker icons) copied under `media/`, favicon (`.ico` + `.svg`) present, all
  assets 200 when the folder is served statically, `3rdpartylicenses.txt` shipped
  (Leaflet MIT).

## Token-storage tradeoff (documented decision)

Only the **refresh token** is persisted in `localStorage`; the **access token lives in
memory only** (a `TokenStore` signal) and is lost on reload — whereupon boot re-validates
the refresh token and mints a fresh pair (`AuthStore.init()` silent refresh). The tradeoff:
`localStorage` is readable by any script on the origin, so an XSS would expose the refresh
token and thereby the session (it can mint new access tokens) — but not a persisted access
token, whose in-memory-only lifetime keeps the XSS surface smaller. Accepted for v1 because
(a) the backend surface is public, rate-limited and rotation-revoked (a stolen refresh token
is single-use), and (b) the httpOnly-cookie + CSRF-protection alternative is a cross-stack
change (Spring security config + Angular `withCredentials`) that v1 deliberately defers — see
[`docs/agent/03-CONTEXT-CORE-AUTH.md`](docs/agent/03-CONTEXT-CORE-AUTH.md).

## Deferrals (v1, honest list)

- **Server-side nearest search** — the list's viewport filter + paging IS built
  (shelter-bbox-paging): `GET /api/shelters` takes the optional `minLat`/`minLng`/`maxLat`/
  `maxLng` box (all four together or none — a partial box is a 400) and `limit` (1…200) /
  `offset` (≥ 0) over the stable id-ascending order; the index is a plain composite B-tree
  on the coordinates — **no PostGIS** (the deployment stays a single database with no
  extensions). What stays deferred is a _nearest_ endpoint: nearest is a ranking, not a
  filter, and the "Show shelters around you" action keeps ranking the already-loaded list
  client-side (browser geolocation + Haversine, no server round-trip) by design.
- **i18n (feature pages)** — the app chrome (header nav/actions, footer,
  document titles) is trilingual EN/ET/RU (M14 slice 1: `core/i18n`, the `t`
  pipe, the header language switcher, persisted `openshelter-locale`, default
  `en`; the RU catalog is machine-assisted and awaits native-speaker
  review), and shelter detail + submit are translated too (slice 2). Still
  English-only: the account page, the contributions panel, the verify page,
  the admin panel and the legal page bodies.
- **MapLibre** — Leaflet 1.9 stays in v1 (MapLibre was considered for M4, deferred).
- **httpOnly refresh cookie** — see [token storage](#token-storage-tradeoff).
- **SSR / prerender** — client-rendered SPA; v1 is a JS app by design.
- **e2e framework** — no `ng e2e`; the milestones were verified by manual E2E against
  the live backend (the M6 manual journey: browse → narrow-viewport reflow → register →
  login → verify EMAIL → submit shelter → account, run headless with a
  scripted Chromium/CDP driver — zero console errors).

## Docs

- [`docs/agent/`](docs/agent/) — the build pack (task contract, API contract, per-milestone
  context, milestone plan with acceptance criteria).
- [`docs/`](docs/) PlantUML — source-of-truth UML (`01-frontend-architecture.puml`
  covers layering, guards incl. `titleGuard`, and the route table; `./render.sh` for PNGs).
- [`docs/rich-text-editor.md`](docs/rich-text-editor.md) — the admin guidance
  body editor: vendored Quill 2.0.3 (snow theme, standard toolbar), the
  formats ↔ server-sanitizer contract, the stylesheet's lazy-chunk wiring,
  and the toolbar/ re-vendor procedures.
- `openspec/changes/` — change proposals (M6: `frontend-m6-polish-prod`).
