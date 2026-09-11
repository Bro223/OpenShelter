# OpenShelter Frontend — Build Task for the AI Agent

## 1. Project

**OpenShelter** — the web frontend for the Estonia bomb-shelter map. A single-page app where
anyone can:

- **browse shelters on a public map** (registry + user-submitted, with a source filter),
- **register, log in, verify** their email/phone (OTP codes arrive by email/SMS),
- **change their email or phone** — cross-channel proof (email change needs an SMS code to the
  current phone; phone change needs an email code to the current email),
- **contribute**: verified users submit shelters and rate/review shelters (the rating system IS
  the moderation — there is no moderator).

The backend (Spring Boot, same repo, `src/`) is **complete and green (321 tests, counted
2026-09-11 pre-fix-wave)**. This task pack covers the **frontend only**.

## 2. Tech stack (fixed — do not change without asking)

- **Angular 22** (standalone components, **zoneless** — no `zone.js` in the scaffold), **TypeScript
  ~6.0** (strict)
- **Angular Signals** for state (no NgRx in v1), RxJS only where async streams demand it
- **SCSS** + small design-token file (CSS custom properties — the single `--color-cta`
  crisis-orange is consumed ONLY by the map page's "Nearest shelter" CTA; `.num-tabular` is the
  tabular-figures utility for coordinate readouts) — **no heavy component library**. The `:root`
  token block is the single source of truth for visual values, with ONE persisted
  `[data-theme='high-contrast']` override block on `<html>` (shell-header toggle, `aria-pressed`,
  localStorage key `openshelter-theme`, applied pre-paint by the inline `index.html` script —
  accessibility-and-provenance D1/D2; same token names, values differ by theme, default is light;
  the HC block's contrast is audit-verified — every text pair ≥ 4.5:1, asserted in
  `design-tokens.spec.ts`)
- **Vitest** (via `ng test` — the scaffold's test runner) + `jsdom`; JUnit-style unit tests are
  mandatory per milestone
- **Leaflet** (npm `leaflet`, used directly behind a thin service) for the map — MapLibre GL is a
  documented future swap, not v1
- Dev server on **port 5173** (backend CORS already allows `http://localhost:5173`), API base URL
  from `environment.development.ts` (`http://localhost:8080`)

## 3. Source of truth

1. **The puml files in this folder are the contract** (`01-frontend-architecture.puml` …
   `05-shelter-review-flow.puml`). They define the classes, layering, routes, and flows.
2. **The context files** (`02-…06-CONTEXT-*.md`) add decisions and rationale.
3. **The backend contract is fixed** (documented in `02-CONTEXT-API.md`, mirrored from the real
   Spring controllers/DTOs). If a context file and the puml disagree, **the puml wins** — report
   the discrepancy instead of silently picking one.

## 4. Source layout (under `src/app/`)

| Folder Contents Source diagram |
| ------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- -------------- |
| `core/` `ApiClient`, `ApiError`, `TokenStore`, `ThemeStore` (persisted high-contrast theme: `highContrast` signal + `openshelter-theme` localStorage + the `<html>` `data-theme` attribute — same persistence shape as `TokenStore`), guards, `ApiInterceptor`, typed models (NO session state — that moved to `session/`) `01` |
| `session/` `AuthStore` — session state (profile + real verified claims). Moved out of `core/` in the 2026-09-08 arch pass; `core/` keeps the guards + interceptor, which import it — the core→session edge is intentional `01` |
| `gateways/` `AuthGateway`, `VerifyGateway`, `ShelterGateway` (`list`/`get`/`create`/`mine`/`update`/`remove`), `ReviewGateway` (`list`/`add`/`updateMine`/`deleteMine`), `AccountGateway` (`me`/`updateProfile`/contact-change/`myReviews`), `GeoGateway` (`resolve` — POST /api/geo/resolve, short links), `GeocodeGateway` (`search` — client-side OSM Nominatim; the ONE documented raw-fetch exception to the ApiClient rule) — one per backend controller group + the one external-service door `01` |
| `features/auth/` `LoginPage`, `RegisterPage`, `ResetPage` `01`+`02` |
| `features/account/` `VerifyPage`, `AccountPage`, `ContributionsPanel` (M8; moved here in the 2026-09-08 arch pass — `features/contributions/` was deleted) `01`+`03`+`05` |
| `features/map/` `MapPage` (public map: markers + sidebar list, filter chips, legend; crisis actions — the "Nearest shelter" CTA (`--color-cta`, geolocation + Haversine nearest over the loaded list, per-error copy, row emphasis) and the authenticated-only "Add shelter" → /submit; the Leaflet wrapper lives in `shared/` now; sidebar rows carry the four-valued provenance badge (D4)) `01`+`04` |
| `features/shelter/` `ShelterDetailPage` (header carries the coordinate line + the "Navigate" / "Open in Apple Maps" deep links; header badge = the four-valued provenance chip per D4), `SubmitShelterPage`, `ReviewForm` (`RatingStars` moved to `shared/`) `01`+`05` |
| `shared/` `PageShell` (brand + nav + shell actions, incl. the high-contrast theme toggle bound to `ThemeStore`), `BannerComponent`, `LoadingIndicator` (a REAL component now, `role=status`, tokens only), `RatingStars`, `LeafletService` — plus non-component helpers `form-helpers.ts` (readCoordinate, capacity/name validators, `CODE_SIX_DIGITS`), `shelter-copy.ts` (canonical source/rating copy + `provenanceLabel` — the single-sourced four-valued provenance badge: "Paasteamet registry" / "Municipal registry" / "Verified user" / "User-submitted"; legend/filter chip wording stays the two-valued `sourceLabel` copy) and `location-input.ts` (pure location-string parser: `parseLocationInput`, `isGooShortLink`, `normalizeShortLinkUrl` — fixture-table-tested, no Angular imports) `01` |

**Dependency rule (never break it):** `features` → `gateways` → `core`; `features` also reach
`shared/` and `session/` directly, and `shared/` may import `core/` (established:
`leaflet-service.ts`, `error-copy.ts`). Components never call
`HttpClient` or touch `TokenStore` internals; gateways are the only door to the API. No cycles.

## 5. Non-negotiable rules

1. **Milestone discipline.** Implement only the milestone you were asked for (`07-STEPS.md`). No
   "while I'm here" extras, no jumping ahead. After tests pass: report the files created, how to
   verify manually, and **stop**.
2. **Components are thin shells** (backend rule §7 mirrored): parse events, delegate to gateways/
   stores, bind signals. Zero business logic in templates/components. Tests must cover the logic
   that _is_ in services.
3. **Typed models, field-for-field.** Every backend DTO has an exact TypeScript model
   (`02-CONTEXT-API.md`). Never use `any` for API payloads. JSON is camelCase already — map 1:1.
4. **One uniform error path.** `ApiClient` converts every failure (HTTP + network) into an
   `ApiError` mirroring the backend `ErrorResponse` (`timestamp,status,error,message,path`);
   pages show the message through `BannerComponent`. 401 mid-session is handled once, in the
   interceptor (single-flight refresh), never per-page.
5. **Auth/session rules.** Access token lives **in memory** (signal); refresh token in
   `localStorage` (v1 tradeoff — document in the README; httpOnly-cookie migration is a deferred
   backend change). Never put tokens or secrets in `environment.ts`. Logout clears local state
   **and** calls `POST /auth/logout`.
6. **Guards mirror backend authorization.** Public: map/detail/reviews. `AuthGuard`: /verify,
   /account, submitting. `VerifiedGuard`: /submit — mirrors the backend's "verified account
   required" 403. A 403 from the API is still handled gracefully (banner + link to /verify).
7. **Loading & empty states everywhere** — no silent hangs, no blank pages; the dev backend may
   simply be off.
8. **Tests are mandatory in every milestone** — Vitest unit tests for stores/gateways/services
   (hand-written fakes, no mocking framework gymnastics) and component tests for the interactive
   parts. All tests green before reporting done.
9. **Accessibility & sanity:** forms use real `<label>`s, buttons have text (not icon-only),
   keyboard-operable. Rating uses 1–5 stars with an accessible control.
10. **No secret leaks.** `.env`-style secrets never exist in `frontend/`. Only public config
    (API URL) goes into `environment*.ts`.

## 6. How to work

1. Read the requested milestone in `07-STEPS.md`. Read the puml + context files it lists.
2. Implement the classes in the folders from section 4, following the puml.
3. Run `npx ng test` (unit) and `npm start` for a manual check against the running backend
   (`mvn spring-boot:run` from the repo root). Fix failures until green.
4. Report: files created, tests run/passed, and the exact commands the human can run to verify
   manually. Then **stop** — do not continue to the next milestone.

## 7. Environment notes

- Node/npm are prerequisites (`npm -v` ≥ 11). Install deps with `npm install` inside `frontend/`.
- Angular CLI is a devDependency — use `npx ng …` (or the `npm run` scripts), never a global `ng`.
- Port 5173 is the agreed dev port (`npm start` already aliases `ng serve --port 5173`).
- The backend must be running for manual verification: `mvn spring-boot:run` at the repo root
  (loads `.env` automatically via spring-dotenv).
