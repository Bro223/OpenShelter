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

The backend (Spring Boot, same repo, `src/`) is **complete and green (216 tests)**. This task pack
covers the **frontend only**.

## 2. Tech stack (fixed — do not change without asking)

- **Angular 22** (standalone components, **zoneless** — no `zone.js` in the scaffold), **TypeScript
  ~6.0** (strict)
- **Angular Signals** for state (no NgRx in v1), RxJS only where async streams demand it
- **SCSS** + small design-token file (CSS custom properties) — **no heavy component library**
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

| Folder              | Contents                                                                                                                                                                                                                                                                                                 | Source diagram |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `core/`             | `ApiClient`, `ApiError`, `TokenStore`, guards, `ApiInterceptor`, typed models (NO session state — that moved to `session/`)                                                                                                                                                                              | `01`           |
| `session/`          | `AuthStore` — session state (profile + real verified claims). Moved out of `core/` in the 2026-09-08 arch pass; `core/` keeps the guards + interceptor, which import it — the core→session edge is intentional                                                                                           | `01`           |
| `gateways/`         | `AuthGateway`, `VerifyGateway`, `ShelterGateway` (`list`/`get`/`create`/`mine`/`update`/`remove`), `ReviewGateway` (`list`/`add`/`updateMine`/`deleteMine`), `AccountGateway` (`me`/`updateProfile`/contact-change/`myReviews`) — one per backend controller group                                       | `01`           |
| `features/auth/`    | `LoginPage`, `RegisterPage`, `ResetPage`                                                                                                                                                                                                                                                                 | `01`+`02`      |
| `features/account/` | `VerifyPage`, `AccountPage`, `ContributionsPanel` (M8; moved here in the 2026-09-08 arch pass — `features/contributions/` was deleted)                                                                                                                                                                   | `01`+`03`+`05` |
| `features/map/`     | `MapPage` (the Leaflet wrapper lives in `shared/` now)                                                                                                                                                                                                                                                   | `01`+`04`      |
| `features/shelter/` | `ShelterDetailPage`, `SubmitShelterPage`, `ReviewForm` (`RatingStars` moved to `shared/`)                                                                                                                                                                                                                | `01`+`05`      |
| `shared/`           | `PageShell`, `BannerComponent`, `LoadingIndicator` (a REAL component now, `role=status`, tokens only), `RatingStars`, `LeafletService` — plus non-component helpers `form-helpers.ts` (readCoordinate, capacity/name validators, `CODE_SIX_DIGITS`) and `shelter-copy.ts` (canonical source/rating copy) | `01`           |

**Dependency rule (never break it):** `features` → `gateways` → `core`. Components never call
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
