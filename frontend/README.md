# OpenShelter — Frontend

Angular SPA for the OpenShelter public-shelter map (Estonia): browse the registry +
user-submitted shelters on a map, register and verify an account, submit shelters,
review them (the community rating **is** the moderation), and manage the account —
including one's own contributions (M8: list/edit/delete own shelters + reviews in
the account page's "My contributions" panel).

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
  tick/polling against real async timing)
- No state library, no UI kit, no e2e framework in v1 (see [Deferrals](#deferrals))

## Quick start (dev)

Prereqs: a running backend on `http://localhost:8080` (repo root: Docker Postgres +
`mvn spring-boot:run` — see the root [README](../README.md)) and Node 22+.

```bash
cd frontend
npm install

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
server with `--proxy-config proxy.conf.json`, which forwards `/api`, `/auth`,
`/account` and `/verify` to `http://localhost:8080` on the host. This is what
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
│   ├── gateways/      # auth / verify / account / shelter / review / geo-gateway.ts /
│   │                  #   geocode-gateway.ts — HTTP, no UI (geocode = raw fetch to Nominatim)
│   ├── features/
│   │   ├── auth/      # login, register, reset (guestGuard)
│   │   ├── account/   # verify (cross-channel), contact change, ContributionsPanel (M8)
│   │   ├── map/       # browse: Leaflet map + list + source filter (default route);
│   │   │              #   crisis actions: "Nearest shelter" CTA + "Add shelter" entry (auth-only)
│   │   └── shelter/   # detail + reviews (review-form), submit; detail header carries the
│   │                  #   "Navigate" + "Open in Apple Maps" deep links
│   ├── shared/        # PageShell (header + main; nav lives in the header), BannerComponent,
│   │                  #   LoadingIndicator (real component, role=status), RatingStars,
│   │                  #   LeafletService, error-copy, form-helpers, shelter-copy,
│   │                  #   location-input.ts (pure location-string parser)
│   ├── app.routes.ts  # 8 routes — every one carries data.title + titleGuard
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
(colors, 9-step type scale, 2px-grid spacing, radii, weights, tracking, the 720px narrow
breakpoint, content max-width). Components may only use token references or layout-neutral
literals; `design-tokens.spec.ts` scans every `.scss` file and fails on hex/rgb colors or
off-grid font-sizes, so the audit stays mechanical. A global `:focus-visible` rule makes
every interactive element keyboard-visible.

## Production build

```bash
npm run build     # → dist/frontend/browser/ (outputHashing: all, relative asset paths)
```

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
  `/shelters/:id` and `/submit` are `loadComponent`-lazy (~27 kB out of the initial
  bundle). Measured initial total: **530.5 kB raw / 136 kB transfer** →
  `maximumWarning: 560kB` (measured + ~5% headroom), `maximumError: 1MB` unchanged.
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

- **`GET /shelters/{id}/reviews/mine` (per-shelter)** — still no such endpoint; the detail
  page loads all reviews and finds "mine" client-side (fine at v1 review counts). M8 built the
  cross-shelter list instead — `GET /account/reviews/mine`, consumed by the account page's
  "My contributions" panel.
- **Paging / bbox search** — the backend list is unpaged in v1; the map shows all rows
  (≈300). Nearest-neighbor/bbox search (`GET /api/shelters/nearest`-style, would need a
  GeoService + PostGIS GIST index) is documented as deferred on the backend — **no such
  endpoint exists**; the UI has no nearest feature either.
- **i18n (feature pages)** — the app chrome (header nav/actions, footer,
  document titles) is bilingual EN/ET (M14 slice 1: `core/i18n`, the `t`
  pipe, the header language switcher, persisted `openshelter-locale`, default
  `en`). Feature-page copy (shelter trust copy, forms, error copy, legal
  page bodies) is still English-only — M14 slice 2+.
- **MapLibre** — Leaflet 1.9 stays in v1 (MapLibre was considered for M4, deferred).
- **httpOnly refresh cookie** — see [token storage](#token-storage-tradeoff).
- **SSR / prerender** — client-rendered SPA; v1 is a JS app by design.
- **e2e framework** — no `ng e2e`; the milestones were verified by manual E2E against
  the live backend (the M6 manual journey: browse → narrow-viewport reflow → register →
  login → verify EMAIL → submit shelter → review (★5) → account, run headless with a
  scripted Chromium/CDP driver — zero console errors).

## Docs

- [`docs/agent/`](docs/agent/) — the build pack (task contract, API contract, per-milestone
  context, milestone plan with acceptance criteria).
- [`docs/`](docs/) PlantUML — source-of-truth UML (`01-frontend-architecture.puml`
  covers layering, guards incl. `titleGuard`, and the route table; `./render.sh` for PNGs).
- `openspec/changes/` — change proposals (M6: `frontend-m6-polish-prod`).
