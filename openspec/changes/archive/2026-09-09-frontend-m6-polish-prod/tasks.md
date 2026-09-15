## 1. Design tokens

- [x] 1.1 Extend the token set in `frontend/src/styles.scss` `:root` (spacing/type/radius scales beside the existing color tokens, plus a `--bp-narrow` breakpoint) and document each token with a comment; verify the token list is complete for the values components currently hardcode
- [x] 1.2 Migrate component styles to tokens: replace hardcoded colors/fonts/spacing in `src/app/**/*.scss` with the token variables where a token covers the value; add a token (not a per-component literal) for genuinely new values, or keep a commented exception; verify `npx ng test` stays green and no new literal color/type values remain for covered cases (grep audit)

## 2. Responsive layout

- [x] 2.1 Make the map page responsive at the `--bp-narrow` breakpoint (map + sidebar stack or reflow, no horizontal scroll); verify the media query exists and the rendered class structure is unchanged for tests
- [x] 2.2 Make the auth/account/detail/submit pages responsive at narrow width (forms, detail sections, review area reflow); verify no page relies on fixed widths that force horizontal scrolling and the class names specs assert are unchanged
- [x] 2.3 Add/adjust any component test that would catch a layout-regression signal (e.g. page shells still render all sections at both viewport class states where testable); run `npx ng test` green

## 3. Route titles + favicon

- [x] 3.1 Implement the route-title mechanism (route `data: { title }` + a small navigation hook that sets `document.title` to `<Page> — OpenShelter`) and wire every route (`map`, `login`, `register`, `reset`, `verify`, `account`, `shelters/:id`, `submit`); verify a unit test asserts `document.title` after navigation to a route
- [x] 3.2 Replace the Angular-default favicon with a project favicon (e.g. an SVG mark + fallback in `public/`, referenced by `index.html`) and set a sensible base `<title>` in `index.html`; verify the favicon file is referenced and the shell title no longer says "Frontend"

## 4. Loading / empty / error audit

- [x] 4.1 Audit every route for loading/empty/error states with chrome intact: map, shelter detail, submit, login/register/reset, verify/account (account = contact change page). For any route missing a state (e.g. no explicit empty state, error not via Banner, loading not shown), fix it; verify per-route spec coverage exists for loading/empty/error and `npx ng test` green
- [x] 4.2 Verify keyboard-operable navigation (focus visible, no icon-only buttons without labels/aria) across pages; fix any violations found; verify tests pass
- [x] 4.3 Manual happy-path console check: run backend (:8080) + frontend (:5173), walk browse → register → login → verify EMAIL (dev sender) → submit → review, watch the browser console; verify zero console errors and report findings

## 5. Production build + environment

- [x] 5.1 Update `frontend/src/environments/environment.ts` to document production values (`production: true`, `apiUrl` from a documented mechanism — e.g. placeholder + README note, or per-environment override) while `environment.development.ts` stays `http://localhost:8080`; verify both files type-check against their usage
- [x] 5.2 Measure and justify the bundle budget: try route-level lazy loading (`loadComponent`) for `/shelters/:id` and `/submit` (leaflet-heavy), re-run `ng build`; if the initial chunk still exceeds the 500 kB warning because leaflet is on the default `/map` route, document the rationale and set a justified `maximumWarning` (keep 1 MB error cap or justify it too); verify `ng build` (production) succeeds with no unexplained warnings
- [x] 5.3 Verify `ng build` output (`dist/`) is sane: index references hashed assets, no absolute-path issues for the deploy base; verify a static file check

## 6. Documentation + puml sync

- [x] 6.1 Rewrite `frontend/README.md` (replace the Angular-CLI boilerplate): stack, structure (core/gateways/features/shared), dev run (backend then frontend, ports 8080/5173, CORS), test command, prod build + env config, token-storage tradeoff, and the v1 deferral list (`GET /me`, `GET /reviews/mine`, review paging, i18n, MapLibre, httpOnly cookies); verify it reads correctly and is accurate against the code
- [x] 6.2 Update the root `README.md` frontend note (currently says out of scope) to point at `frontend/README.md`; update `frontend/docs/agent/00-README.md` status (M1–M6 done, M6 final) and `frontend/docs/agent/07-STEPS.md` M6 status if it carries one; verify no stale "planned / not started" text remains
- [x] 6.3 Reconcile `frontend/docs/01-frontend-architecture.puml` with any route/title/layout changes (and re-render via `./render.sh` if the diagram changed); report exactly what changed and confirm no dangling route references

## 7. Milestone acceptance

- [x] 7.1 Run `npx ng test --watch=false` green across the full suite and confirm TypeScript clean (`tsc --noEmit` for app + spec configs); note the count vs the M5 baseline (226)
- [x] 7.2 Final manual E2E against the live stack (backend :8080 + frontend :5173): browse → register → verify → submit → review → account change; confirm no console errors, titles update per route, layout usable at a narrow width; report the journey
