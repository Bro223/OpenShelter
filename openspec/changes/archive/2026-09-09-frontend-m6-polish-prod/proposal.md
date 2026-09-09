## Why

M6 is the final frontend milestone: turn the feature-complete M1–M5 app into a polished,
production-buildable product with honest documentation. The functionality exists and is green
(226 tests); what remains is consistency (design tokens, responsive layout), a loading/error
audit across every route, real page titles/favicon, a prod-ready `environment.ts` + build, and a
README that documents how to run the full product and what v1 deliberately defers.

## What Changes

- **Design tokens applied consistently** — consolidate the current ad-hoc `styles.scss` tokens
  (`--color-*`, `--font-sans`, spacing/type scale) and apply them across components so colors,
  type, and spacing come from one source (no new hardcoded values in component styles).
- **Responsive layout** — the map page and shell stack sensibly on mobile (map on top/sidebar
  below or per the architecture diagram); forms/detail pages remain usable at narrow widths.
- **Loading / empty / error audit** — every route (map, login/register/reset, verify/account,
  shelter detail, submit) has loading, empty, and error states with the page chrome intact;
  keyboard-operable nav; no console errors on the happy path.
- **Route titles + favicon** — real `<title>` per route (Angular `Title` service or route
  `data.title`) and a project favicon replacing the Angular default.
- **Prod build** — `environment.ts` documents production values (deployed API URL), `ng build`
  (production) succeeds, bundle budget sane (leaflet pushed the initial chunk past the 500 kB
  warning — decide lazy-loading or a documented budget adjustment).
- **README** — frontend section documenting stack, dev run (backend + frontend), prod build,
  the token-storage tradeoff, and honest v1 deferrals (`GET /me`, `GET /reviews/mine`, paging,
  i18n, MapLibre, httpOnly cookies).

## Capabilities

### New Capabilities

- `app-polish`: the product-level presentation and packaging contract — consistent visual
  tokens, responsive behavior, per-route titles and favicon, audited loading/empty/error states,
  and a documented production build for the Angular app as a whole (not tied to one feature page).

### Modified Capabilities

## Impact

- `frontend/src/styles.scss` + component `.scss` files — token consolidation (colors/type/spacing).
- `frontend/src/app/app.routes.ts` — optional per-route `data: { title }` wiring.
- `frontend/src/app/**/*.ts` — `Title` service / route-title hook where routes render.
- `frontend/public/favicon.ico` — replaced with a project icon (or generated SVG favicon + link).
- `frontend/src/environments/environment.ts` (+ `.development.ts` if split needed) — production
  values documented.
- `frontend/angular.json` — budget review (initial-chunk warning) — either lazy-load
  map-heavy/shelter routes or adjust the documented budget with rationale.
- `frontend/README.md` — full rewrite from the Angular-CLI boilerplate to a project README.
- Root `README.md` — the frontend section at the end that currently says "out of scope" should
  point to the new frontend README (the repo is now a full-stack product).
- `frontend/docs/agent/00-README.md` — status section (M1–M6) updated to reflect reality.
- Diagrams stay in sync if a route/layout change affects `01-frontend-architecture.puml`.
- No backend changes. No new API surface.
