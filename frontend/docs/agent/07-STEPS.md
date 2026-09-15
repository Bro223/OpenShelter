# Build Plan — Milestones M0–M6

**Rule (from `01-TASK.md`):** execute **one milestone per run**. After each milestone: tests green,
report files created + how to verify manually, then **STOP and wait for the human to review**.

Each milestone lists its **inputs** (puml + context files), **deliverables**, **key decisions**,
**acceptance criteria** (must all pass), and a **manual review checklist**.

**Status:** M0–M6 DONE (all milestones complete; M6 verified 2026-09-06 against the real
running API — `mvn spring-boot:run` at the repo root, port 8080, with the dev server at
`http://localhost:5173`). Every milestone was verified against the real running API. The
post-M6 trust wave (shelter-trust-and-reports) is documented at the end of this file, followed
by the admin-moderation wave.

---

## M0 — Project skeleton

**Status: DONE.** Angular 22 scaffold (`frontend/`), standalone + zoneless + SCSS + Vitest,
`npm start` → port 5173 (same-origin API; dev proxy → `http://localhost:8080`), no nested git
repo. This doc pack (`docs/`) is the last piece of M0.

**Acceptance (verified)**

- `npm start` serves the default page on `http://localhost:5173`.
- `src/environments/environment.development.ts` exists with `apiUrl: ''` (same-origin; dev proxy → `:8080`).
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
`/login`, `/register`, `/reset` with the three pages (LoginPage, RegisterPage, ResetPage —
reset = request → sent, the 6-digit code + new password entered IN the page, no emailed
link); login/logout in the shell header. Component + store tests.

**Key decisions:** returnUrl handling; generic login errors (no enumeration); register success
screen directs to login then `/verify` (M3); reset confirm on success → `/login?reset=ok`.

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

## M5 — Shelter detail & submission

**Inputs:** `05-shelter-review-flow.puml`, `06-CONTEXT-SHELTER.md`.

**Deliverables** — `ShelterDetailPage` (route `/shelters/:id`, public) — shelter info + trust
badges + derived display status + the trust report pickers with auth/verify branching;
`SubmitShelterPage` (route `/submit`, AuthGuard + VerifiedGuard) — form + mini-map location
pick + Estonia bbox pre-check; refetch-after-write.
Tests for gateways, page branches (anonymous / unverified / verified).

**Key decisions:** backend owns correctness (banners from ApiError); author-only server-
enforced (no delete UI for others' shelters); USER/REGISTRY rendering differs; after write →
refetch shelter.

**Acceptance**

- Detail page shows registry AND user shelters with correct null handling.
- Anonymous trust-report attempt → login prompt with returnUrl; unverified → verify banner.
- Verified user: report a shelter → 200 (the dampening outcome); duplicate (same shelter+user+
  type) → 409 with the server message; occupancy report → one live band per user, latest wins.
- `/submit`: verified user creates a shelter (name + map point + description/capacity) → 201 →
  navigates to its detail; out-of-Estonia point → client pre-check error (and backend 400 if it
  slips through); unverified user → redirected to `/verify`.
- Full manual journey against live backend: register → login → verify EMAIL → submit shelter →
  report it → see the trust badges update.
- `npx ng test` green.

**Manual review:** trust-report UX, submit form, guard behavior — approve before M6.

**STOP — wait for review.**

---

## M6 — Polish, hardening & prod build

**Status: DONE.** Design tokens (`styles.scss` + `design-tokens.spec.ts` audit), 375px
reflow, route titles + favicon, loading/empty/error audit, production `environment.ts`,
documented bundle budget (initial 530.5 kB → justified 560 kB warning), README rewritten,
manual E2E via headless Chromium/CDP driver — 16/16 journey steps, zero console errors.
See `openspec/changes/frontend-m6-polish-prod/`.

**Inputs:** all context files, `01-frontend-architecture.puml`.

**Deliverables** — design tokens applied consistently; responsive layout; loading/empty/error
audit across all routes; route titles + favicon; README (frontend section: stack, dev, prod
build, token-storage tradeoff, deferrals incl. paging, i18n,
MapLibre, httpOnly cookies); `environment.ts` prod values documented; final `ng build` green.

**Acceptance**

- `ng build` (production) succeeds; `dist/` output sane.
- All routes have loading + error states; keyboard-usable nav; no console errors in devtools on
  the happy path.
- README documents how to run (backend + frontend) and the v1 deferrals honestly.
- Full suite green; manual E2E of the whole product (browse → register → verify → submit →
  report → account change).

**Manual review:** the whole app + docs.

**STOP — final review.**

---

## Trust & reports wave (shelter-trust-and-reports, post-M6)

**Status: DONE.** The frontend half of the community trust layer — no new routes, only the
existing pages grow: `MapPage` (the practical filter chips — "Open" client-side, "Has
capacity" server-side — the orange reported marker + `Reported` legend entry, row trust
badges), `ShelterDetailPage` (the trust header badges, "Report this shelter" — five radio
types, and "Report how full" — three large band buttons pre-selected from
`yourOccupancyBand`), the `ContributionsPanel` (auto-hidden rows marked "Hidden — reported
by the community (N reports)", no restore action; the 409 shelter-cap surfaces the server
message in the row error), and the `--color-reported` design token (light `#c2410c`, high-
contrast `#ffa94d` — contrast pinned in `design-tokens.spec.ts`). Gateway additions:
`ShelterGateway.report` / `reportOccupancy`; `ShelterGateway.list` takes the optional
`ShelterTrustFilter`; `ShelterGateway.get` returns the detail projection
(`ShelterDetailDto`). All trust state is rendered from the DTO fields — never
re-derived client-side; a 409 duplicate shows the server's message inline (`role=status`), a
429 throttle uses the generic "slow down" banner copy, and every successful report
refetches. See `02-CONTEXT-API.md` (trust-reports section), `05-CONTEXT-MAP.md`,
`06-CONTEXT-SHELTER.md` and the two updated pumls (`04-map-browse-flow.puml`,
`05-shelter-review-flow.puml`).

**Acceptance:** `npx ng test` green — **657 tests across 35 spec files** (counted
2026-09-11); backend half: 433 tests green (same count). `tsc` + `prettier` clean.

**STOP — final review.**

---

## Admin moderation wave (admin-moderation, post-trust)

**Status: DONE.** The frontend half of the env-provisioned admin: a moderation panel for the
trust layer, visible to the ADMIN-kind account only. No change to any existing page except
the shell nav (one admin-only item) and the account page (one badge).

**Route & guard** — `GET` the route map: `/admin` → `AdminPage`, **lazy** (`loadComponent` —
the moderation tool is a rare route; bundle budget) + `TitleGuard` ("Admin") + `AdminGuard`
(`core/guards.ts`): authenticated AND `AuthStore.isAdmin()`? else redirect **home** — anonymous
AND an authenticated non-admin alike (deliberately no `/login` offer). The backend re-checks
the admin kind per request, so the guard is UX, not enforcement (backend 401/403 remains the
enforcement point).

**Session store** — `AuthStore.isAdmin` signal: adopted from the fetched profile (`GET
/account/me` gains `isAdmin`, always present, false for every regular user), reset to false
with the profile; a failed profile fetch leaves it false — fail-closed for the nav item, the
badge and the guard.

**Nav** — the shell nav gains a single "Admin" item, rendered only when `isAdmin()` (regular
users see the nav unchanged).

**Account page** — the identity card shows a provenance-style "Admin" badge next to the name,
rendered only when `isAdmin()` (consistency with the provenance-badge system).

**`AdminGateway`** (`gateways/admin-gateway.ts`) — the door to the `/admin/*` group, one method
per endpoint (all return typed promises, `ApiError` on failure): `listShelters(filters?)` (the
optional `status`/`source`/`q` fields are omitted from the URL when absent),
`setShelterStatus(id, status)`, `deleteShelter(id)`, `listShelterReports(shelterId?)`,
`dismissShelterReport(id)` — the later waves add `reviewShelter(id, request)` (the CONFIRM/
REJECT community-review-queue override), `listShelterHistory(id)`, `requestInfo(id, message)`,
`markInaccurate(id, reason?)` / `clearInaccurate(id)`, `listAudit()`, `listAlerts(limit?)`,
`listUsers()`, `suspendUser(id)` / `unsuspendUser(id)`. Models: `AdminShelterDto`/
`AdminShelterFilters`/`AdminShelterReportDto`/`AdminOccupancy` and the per-tab row models in
`core/models.ts` (field-for-field; see `02-CONTEXT-API.md`).

**`features/admin/` — six tabs** (three at this wave, grown by the later ones), each a table
with 48px action targets on the existing tokens (own feature folder — the
no-cross-feature-imports rule holds):

1. **Unconfirmed** (first, default) — the community review queue: every USER row in the NEW
   state (a client-side filter of the shelters list), "Mark confirmed" direct, "Reject" with a
   required reason (≤500 chars) → `reviewShelter`.
2. **Shelters** — every row incl. hidden; USER rows actionable (Hide/Activate inline, Delete
   with a two-tap inline confirm — no `window.confirm`), registry rows **read-only** (the UI
   never offers actions for them — the backend 409s them anyway); columns
   name/source/status/reports/occupancy/submitter; a name/address search box (submit-on-enter;
   the server does the substring match — no client-side filtering).
3. **Shelter reports** — the queue: shelter (link to its detail), type, reporter (name +
   email), age, dismiss. Dismissed rows **stay in the queue, dimmed** (the audit trail — the
   choice over filtering: the admin sees what was resolved). Rows whose shelter is INACTIVE
   get a "Restore shelter" shortcut (the same manual-restore endpoint as tab 2; both
   in-memory caches stay in sync).
4. **Alerts** — the throttle-abuse ring (abuse-limits): the daily submission cap (429), the
   per-contact OTP cap (429) and the near-duplicate rejection (409), newest first; read-only.
5. **Users** — the account list (name, e-mail, kind, status) with suspend/unsuspend (two-tap
   inline confirm).
6. **Audit log** (last) — the read-only moderation trail, newest 100, lazy-loaded on first
   switch (when / moderator / shelter / action / change / reason).

**Behaviour** — the default tab (Unconfirmed) filters the shelters list, which loads
immediately; the other tabs load lazily on first switch (and keep their rows in memory on
later visits). Mutations patch the in-memory row in place (the backend answers 204 with no
body — no full refetch); the CONFIRM/REJECT actions are the exception — they refetch the
shelters list so the queue and the Shelters tab both reflect the new state. A rejected
mutation surfaces the server message through the page-level banner (403/409 echo the
backend message; 401 mid-session is the global interceptor's job). One in-flight mutation at a time.

**Acceptance:** `npx ng test` green — **723 tests across 38 spec files** (counted
2026-09-12: admin-page spec — tabs, guard redirect, admin-only nav, actions + confirm dialog;
session store `isAdmin` assertions; account-page badge; admin-gateway endpoint mapping);
backend half: 464 tests green (same count). `tsc` (both configs) + `prettier` clean.

**STOP — final review.**
