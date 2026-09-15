## Context

- The app is feature-complete (M1–M5, 226 tests green): map/browse, auth, verify + contact
  change, shelter detail + reviews, verified submission. All pages already follow a common
  shape (signal state, BannerComponent error, page-shell chrome) built ad hoc per milestone.
- Styling today: a small token layer exists at the top of `src/styles.scss` (`--color-text`,
  `--color-muted`, `--color-primary`, `--color-border`, `--color-shelter-registry/user`,
  `--font-sans`) plus the M4 leaflet css import and a `.shelter-marker--pick` fix. Components
  each carry their own `.scss` with some hardcoded values. `app.scss`/shell and pages are not yet
  fully token-driven nor responsive-audited.
- `index.html` has an Angular default title ("Frontend") + the CLI default favicon.
- `frontend/README.md` is untouched Angular-CLI boilerplate (59 lines); the root `README.md`
  still says the frontend is "out of scope". `docs/agent/00-README.md` status says "M1–M6 —
  planned below, none started" (stale since M1–M5 are done).
- `angular.json` budget: initial 500 kB warning / 1 MB error. The leaflet-bearing initial chunk
  already exceeded the 500 kB warning at M4 (~508 kB) and grew at M5 (~551 kB) — inside the error
  budget but over the warning.
- `environment.ts` currently mirrors development (`production: false`,
  `apiUrl: http://localhost:8080`).

## Goals / Non-Goals

**Goals:**

- Land M6's acceptance criteria verbatim: prod `ng build` green with sane output, all routes have
  loading/empty/error states + keyboard nav + quiet happy-path console, real titles + favicon,
  README documents run steps and honest deferrals, full suite stays green.
- Make the token layer the single source of visual truth without a visual redesign (same colors,
  same look — just sourced from tokens).
- Keep docs/puml in sync: `01-frontend-architecture.puml` and the milestone docs reflect the
  shipped routes and structure; `docs/agent/00-README.md` status updated to reality.

**Non-Goals:**

- No backend changes, no API contract changes.
- No new features, no framework/library migration (MapLibre, i18n lib, NgRx, component library
  are all documented deferrals).
- No redesign: this is polish and consistency, not a new visual language.
- Auth-storage change (httpOnly cookies) is a documented deferral, not this milestone.

## Decisions

1. **Tokens live in `src/styles.scss` `:root` and grow only as needed.**
   Add spacing/type/radius scales alongside the existing color tokens. Component styles switch
   hardcoded values to tokens where a token already exists; where a component legitimately needs
   a value the scale lacks, add the token (not a per-component literal) — or keep a documented
   exception with a comment. Rationale: one source of truth, minimal diff, no visual change.
   Alternative: a dedicated `tokens.scss` imported everywhere — rejected for churn; the global
   stylesheet is already imported once and custom properties cascade.

2. **Responsive via CSS, page-by-page, tested by layout not by visual snapshots.**
   A shared shell-level breakpoint (e.g. `--bp-narrow: 720px` token) + per-page media queries
   for map/sidebar and forms. Vitest/jsdom can't do real layout, so the acceptance is: media
   queries exist per page, no `overflow-x` regressions by inspection, manual browser check at
   narrow width. Rationale: honest about what unit tests can verify; keeps M6's "manual E2E"
   acceptance meaningful.

3. **Route titles via a small title service hook, not per-page duplication.**
   A `TitleService` (or a guard/data-title convention in `app.routes.ts`) sets
   `document.title = "<Page> — OpenShelter"` on navigation. Rationale: central, testable,
   avoids each component importing `Title`. Route `data: { title }` + one navigation handler
   keeps titles declarative.
   Favicon: replace `public/favicon.ico` with a small project mark (an SVG favicon + fallback
   `.ico`), referenced from `index.html`.

4. **Bundle budget: lazy-load the two leaflet-heavy/shelter routes rather than raising the cap.**
   `SubmitShelterPage` and `ShelterDetailPage` (and the map feature) load leaflet-heavy code on
   the default `/map` route anyway, so the realistic lever is route-level lazy loading
   (`loadComponent`) for `/shelters/:id` and `/submit` and re-checking the initial chunk; if
   leaflet must stay in the initial bundle (map is the default route), document the warning with
   a rationale and set `maximumWarning` to a justified value rather than silently ignoring it.
   Decision deferred to the implementer's measurement — the acceptance is a *justified* budget
   (either lazy-loading lands it under warning, or the budget is documented and bumped with
   reason), never an unexplained silent warning.

5. **README rewrite is content-first.**
   New `frontend/README.md`: stack, structure map (core/gateways/features/shared per
   `01-frontend-architecture.puml`), dev run (backend then frontend, ports, CORS), test command,
   prod build + env config, token-storage tradeoff (access in memory / refresh in localStorage —
   httpOnly deferral), and the v1 deferral list from `06-CONTEXT-SHELTER.md`. Root `README.md`
   gets a short "Frontend" pointer replacing the stale "out of scope" note. `docs/agent/00-
   README.md` status updated M1–M6 to reality.

## Risks / Trade-offs

- [Token/formatting churn across many component styles] → token migration is value-swap only;
  run the formatter once and keep the diff reviewable; tests must stay green (they assert
  structure/behavior, not pixels).
- [jsdom cannot verify responsive layout] → unit tests assert the *mechanism* (tokens referenced,
  media queries present, title service sets document.title, no regressions in rendered class
  names); real narrow-width check is the manual M6 E2E step, honestly labeled.
- [Lazy routes can shift test setup (loadComponent + standalone)] → Vitest handles lazy routes
  via the router's `loadChildren`/`loadComponent` with the same TestBed; existing specs that
  navigate must still pass — if lazy loading breaks many specs, prefer the documented-budget
  option.
- [Budget warning persists if leaflet stays in the initial chunk] → document with rationale and
  a justified `maximumWarning` bump; never leave it silent.
- [README drift after this milestone] → M6 is the last milestone; the README lists deferrals so
  future work has an explicit checklist rather than editing prose blindly.
