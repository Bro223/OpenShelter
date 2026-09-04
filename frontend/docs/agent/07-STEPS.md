# Build Plan — Milestones M0–M6

**Rule (from `01-TASK.md`):** execute **one milestone per run**. After each milestone: tests green,
report files created + how to verify manually, then **STOP and wait for the human to review**.

Each milestone lists its **inputs** (puml + context files), **deliverables**, **key decisions**,
**acceptance criteria** (must all pass), and a **manual review checklist**.

**Status:** M0 DONE. M1–M6 pending. The backend is complete — every milestone is verified against
the real running API (`mvn spring-boot:run` at the repo root, port 8080).

---

## M0 — Project skeleton

**Status: DONE.** Angular 22 scaffold (`frontend/`), standalone + zoneless + SCSS + Vitest,
`npm start` → port 5173, `environment.development.ts` → `http://localhost:8080`, no nested git
repo. This doc pack (`docs/`) is the last piece of M0.

**Acceptance (verified)**
- `npm start` serves the default page on `http://localhost:5173`.
- `src/environments/environment.development.ts` exists with `apiUrl: 'http://localhost:8080'`.
- No `frontend/.git` nested repository.
- CORS: `http://localhost:5173` is in the backend allowlist.

**Manual review:** scaffold, package.json, angular.json — approve before M1.

---

## M1 — Core plumbing (API client, models, auth store)

**Inputs:** `01-frontend-architecture.puml` (core + gateways), `02-auth-flow.puml` (boot/refresh
sections), `02-CONTEXT-API.md`, `03-CONTEXT-CORE-AUTH.md`.

**Deliverables** — `core/`: `ApiError`, `ApiClient`, models (`02-CONTEXT-API.md`, field-for-field),
`TokenStore`, `AuthStore` (with single-flight `refresh()` + `init()`), `ApiInterceptor`;
`gateways/AuthGateway`; wire `provideHttpClient(withInterceptors([...]))` in `app.config.ts`.
Unit tests for `ApiClient` error mapping, `TokenStore`, `AuthStore` refresh single-flight
(hand-written fakes — inject a fake gateway).

**Key decisions:** access token in memory / refresh in localStorage; 401 handled once in the
interceptor; register ≠ login (no auto-session).

**Acceptance**
- `ApiClient` maps HTTP 400/401/403/404/409/429 + network errors to `ApiError` (tested).
- `AuthStore.init()`: no refresh token → anonymous; valid token → silent refresh rotates pair
  (fake gateway); expired → cleared.
- Two concurrent 401s trigger exactly ONE refresh call (test asserts the fake gateway call count).
- Refresh failure → logout path clears storage.
- `npx ng test` green; `npm start` boots.

**Manual review:** core classes, interceptor registration, model fidelity against the backend
DTOs — approve before M2.

**STOP — wait for review.**

---

## M2 — Auth UI (login / register / reset + guards)

**Inputs:** `02-auth-flow.puml`, `03-CONTEXT-CORE-AUTH.md` (features/auth + guards).

**Deliverables** — `shared/PageShell` + `BannerComponent`; `AuthGuard`, `GuestGuard`; routes
`/login`, `/register`, `/reset` with the three pages (LoginPage, RegisterPage, ResetPage incl.
`?token=` confirm state); login/logout in the shell header. Component + store tests.

**Key decisions:** returnUrl handling; generic login errors (no enumeration); register success
screen directs to login then `/verify` (M3); reset confirm on success → `/login`.

**Acceptance**
- Register → 201 → success view (no session). Register duplicate email → 409 inline error.
- Login wrong password → generic banner (never "wrong password"); correct → redirected to
  `returnUrl` or `/map`.
- Reload while "logged in" → silent refresh restores the session (no login flash).
- Logout clears storage and returns to `/map`; guarded route redirects anonymous users to
  `/login?returnUrl=…`.
- Manual E2E against the live backend: register → login → see the shell change.
- `npx ng test` green.

**Manual review:** pages, guard wiring, refresh-on-reload behavior — approve before M3.

**STOP — wait for review.**

---

## M3 — Verification & account screens (verify + cross-channel contact change)

**Inputs:** `03-verification-account-flow.puml`, `04-CONTEXT-ACCOUNT-VERIFY.md`.

**Deliverables** — `gateways/VerifyGateway`, `gateways/AccountGateway`; `VerifyPage` (route
`/verify`, AuthGuard) for EMAIL/PHONE; `ContactChangePage` (route `/account`, AuthGuard) with the
four-step change flows (idle → form → proof-with-named-channel → success). `AuthStore` gains
`levels()` state + optimistic `addLevel()` after confirm. Tests for both pages + gateways.

**Key decisions:** cross-channel proof messaging names the delivery channel (security affordance);
429 → cooldown hint, no auto-retry; SMART_ID hidden; duplicate/same-value handled inline.

**Acceptance**
- Register → log in → `/verify`: request EMAIL → (dev sender logs code to backend console) →
  confirm code → level shows verified, button disappears. Same for PHONE.
- Re-requesting a verified level → handled as "already verified" (409 mapped, no error noise).
- Email change → copy names the SMS-to-current-phone proof → code confirm → email updated
  (re-login not required — sessions survive contact change).
- Phone change → email-to-current-email proof → confirm → updated.
- 429/cooldown → friendly message, no retry storm.
- `npx ng test` green + manual E2E against the live backend.

**Manual review:** channel-named copy, claim-state handling, throttle UX — approve before M4.

**STOP — wait for review.**

---

## M4 — Map & browse (public read)

**Inputs:** `04-map-browse-flow.puml`, `05-CONTEXT-MAP.md`.

**Deliverables** — `npm i leaflet` + types; `ShelterGateway.list/get`; `LeafletService` (thin
leaflet wrapper, divIcon markers by source, destroy on ngOnDestroy); `MapPage` (route `/map`,
default route, public) with map + sidebar + source filter chips (All/Registry/User) + legend +
loading/empty/error states. Tests: gateway, service marker building (fake DOM/jsdom),
component (mock gateway).

**Key decisions:** server-side source filter; fetch-all (no paging); leaflet directly (no ngx
wrapper); divIcon markers (no asset-path pitfall); map instance destroyed on page leave.

**Acceptance**
- `/map` (and `/`) shows the live Estonia shelter set from the running backend.
- Filter chips refetch per source; REGISTRY vs USER markers visually distinct with a legend.
- Clicking a marker/list row navigates to `/shelters/:id` (M5 stub route returns "coming in M5"
  or the page shell — acceptable until M5 lands).
- Backend down → banner, page chrome intact; empty DB → empty state.
- `npx ng test` green.

**Manual review:** map UX, filter behavior, marker styling — approve before M5.

**STOP — wait for review.**

---

## M5 — Shelter detail, reviews & submission

**Inputs:** `05-shelter-review-flow.puml`, `06-CONTEXT-SHELTER.md`.

**Deliverables** — `ReviewGateway`; `RatingStars` (display + input), `ReviewForm`;
`ShelterDetailPage` (route `/shelters/:id`, public) — shelter info + rating summary + reviews +
"my review" area with auth/verify branching; `SubmitShelterPage` (route `/submit`, AuthGuard +
VerifiedGuard) — form + mini-map location pick + Estonia bbox pre-check; refetch-after-write.
Tests for gateways, forms, page branches (anonymous / unverified / verified).

**Key decisions:** backend owns correctness (banners from ApiError); rating null = "no ratings
yet"; author-only server-enforced (no delete UI for others); USER/REGISTRY rendering differs;
after write → refetch shelter.

**Acceptance**
- Detail page shows registry AND user shelters with correct null handling.
- Anonymous review attempt → login prompt with returnUrl; unverified → verify banner.
- Verified user: submit review → appears; re-submit (same user+shelter) → updates, not duplicates
  (POST 200 path); delete own review works.
- `/submit`: verified user creates a shelter (name + map point + description/capacity) → 201 →
  navigates to its detail; out-of-Estonia point → client pre-check error (and backend 400 if it
  slips through); unverified user → redirected to `/verify`.
- Full manual journey against live backend: register → login → verify EMAIL → submit shelter →
  review it → see the rating summary update.
- `npx ng test` green.

**Manual review:** review upsert UX, submit form, guard behavior — approve before M6.

**STOP — wait for review.**

---

## M6 — Polish, hardening & prod build

**Inputs:** all context files, `01-frontend-architecture.puml`.

**Deliverables** — design tokens applied consistently; responsive layout; loading/empty/error
audit across all routes; route titles + favicon; README (frontend section: stack, dev, prod
build, token-storage tradeoff, deferrals incl. `GET /me`, `GET /reviews/mine`, paging, i18n,
MapLibre, httpOnly cookies); `environment.ts` prod values documented; final `ng build` green.

**Acceptance**
- `ng build` (production) succeeds; `dist/` output sane.
- All routes have loading + error states; keyboard-usable nav; no console errors in devtools on
  the happy path.
- README documents how to run (backend + frontend) and the v1 deferrals honestly.
- Full suite green; manual E2E of the whole product (browse → register → verify → submit →
  review → account change).

**Manual review:** the whole app + docs.

**STOP — final review.**
