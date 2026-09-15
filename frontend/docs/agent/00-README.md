# OpenShelter Frontend — AI Agent Build Pack

## What this is

Step-by-step build instructions + context files for an AI coding agent that will implement the
**OpenShelter frontend** (Angular SPA), one reviewable milestone at a time — the exact mirror of
the backend pack in `context-and-tasks/agent/`.

The **PlantUML diagrams** (`*.puml` in `frontend/docs/`) are the source of truth for structure
(components, services, routes, data flow). The files in `agent/` add the **decisions, rationale,
conventions, and build order** that the diagrams don't carry.

The backend it talks to lives in the same repo (`src/`, Spring Boot, see
`context-and-tasks/agent/`). The API contract the frontend mirrors field-for-field is documented
in `02-CONTEXT-API.md`.

## Folder map

| File                           | Purpose                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `00-README.md`                 | **This file.** How to run the agent, one milestone at a time.                                          |
| `01-TASK.md`                   | **The task contract.** Read this first — project goal, stack, rules, conventions.                      |
| `02-CONTEXT-API.md`            | Backend API contract: endpoints, DTO models (field-for-field), error shape, status semantics.          |
| `03-CONTEXT-CORE-AUTH.md`      | Core layer + auth: ApiClient, ApiError, TokenStore/AuthStore, interceptor, guards, auth pages (M1–M2). |
| `04-CONTEXT-ACCOUNT-VERIFY.md` | Verification + cross-channel contact change screens (M3).                                              |
| `05-CONTEXT-MAP.md`            | Map & browse: Leaflet wrapper, public shelter list, source + trust filters, reported marker (M4).      |
| `06-CONTEXT-SHELTER.md`        | Shelter detail, community reports, verified-only submission (M5). Polish & prod build (M6) notes.      |
| `07-STEPS.md`                  | The ordered build plan — milestones M0–M6 with acceptance criteria and stop points.                    |

## Source-of-truth UML

`01-frontend-architecture.puml` … `05-shelter-review-flow.puml` in `frontend/docs/`
(render with `./render.sh`; PNGs + SVGs land in `out/` — same script as the backend pack).

| Diagram                             | Content                                                              | Used by    |
| ----------------------------------- | -------------------------------------------------------------------- | ---------- |
| `01-frontend-architecture.puml`     | Layering (core/gateways/features/shared), classes, guards, route map | every step |
| `02-auth-flow.puml`                 | register/login/silent-refresh/401-handling/logout sequence           | M1–M2      |
| `03-verification-account-flow.puml` | verify + cross-channel contact change                                | M3         |
| `04-map-browse-flow.puml`           | public list + Leaflet map + filter                                   | M4         |
| `05-shelter-review-flow.puml`       | detail, trust reports, verified submission                           | M5         |

## How to run the agent (one milestone at a time)

1. Give the agent: `01-TASK.md` + `00-README.md` + the **context file(s)** and **puml file(s)**
   referenced by the milestone (each milestone in `07-STEPS.md` lists its inputs).
2. Tell it **which milestone** to execute (e.g. "do M2").
3. The agent builds **only that milestone**, runs the tests, reports what it created, and **stops**.
4. You review the diff manually. On approval, run the next milestone.

## The hard rule

**One milestone per run.** The agent must never continue past the requested milestone, never
"improve" unrelated code, and never start the next milestone without an explicit go-ahead. This is
what lets you check and build every file manually — exactly how the backend was built.

## Status

- **M0 (skeleton)** — DONE: Angular 22 scaffold in `frontend/` (standalone, zoneless, SCSS,
  Vitest), `npm start` → port 5173 (same-origin API; dev proxy forwards to
  `http://localhost:8080` via `proxy.conf.json`), no nested git repo. This doc pack is part of M0.
- **M1 (core plumbing)** — DONE: ApiClient/ApiError, TokenStore + AuthStore (silent refresh,
  401 → session-expired), guest/auth guards, models mirroring the API contract.
- **M2 (auth UI)** — DONE: login / register / reset pages, `returnUrl` + `session=expired`
  handling, first route table.
- **M3 (verification & account)** — DONE: cross-channel verify screen (EMAIL + PHONE,
  409/429/400/5xx handling) and cross-channel contact change (email ⇄ phone).
- **M4 (map & browse)** — DONE: public Leaflet map (registry blue / user green / pick red),
  list + source filter, click-to-zoom selection (street level, stays on /map) +
  explicit "View details" link.
- **M5 (shelter detail & submission)** — DONE: public detail (incl. static
  Location map), verified-only `/submit` (map point picking, in-Estonia pre-check) → 201 →
  detail.
- **M6 (polish, hardening & prod build)** — DONE: design tokens (`styles.scss` + audit
  spec), 375px reflow, route titles + favicon, loading/empty/error audit, production
  `environment.ts`, documented bundle budget (initial 530.5 kB → 560 kB warning),
  README rewritten, full manual E2E (headless Chromium driver, zero console errors).
  See `openspec/changes/frontend-m6-polish-prod/`.
- **Trust & reports (shelter-trust-and-reports)** — DONE: map trust filter chips
  (`Open`, client-side / `Has capacity`, server-refetched with the source filter), the
  orange reported marker + `Reported` legend entry (`--color-reported` token,
  contrast-pinned in `design-tokens.spec.ts`), the row/header trust badges ("Reported",
  status flag, occupancy — single-sourced in `shelter-copy.ts`), the detail-page report
  pickers ("Report this shelter" — three types, optional detail field; "Report how full" —
  the 3-band picker pre-selected from `yourOccupancyBand`; "Report open/closed" — the
  2-state picker pre-selected from `yourOpenStatus`), the contributions panel's hidden-row
  mark + the 409 shelter-cap server message. `npx ng test` green — 657 tests across 35 spec
  files (counted 2026-09-11).
- **Admin moderation (admin-moderation)** — DONE: the `/admin` route (lazy, `AdminGuard` —
  anonymous AND authenticated non-admins redirect home), the admin-only "Admin" nav item,
  `AuthStore.isAdmin` from `GET /account/me` (fail-closed false on a failed profile fetch),
  the account-page "Admin" provenance-style badge, `AdminGateway` (all fifteen `/admin/*`
  endpoints) and `features/admin/` — six tabs: Unconfirmed (the NEW community locations —
  "Mark confirmed" / "Reject" with a required reason), Shelters (search + inline
  Hide/Activate, two-tap Delete with confirm; registry rows read-only), Shelter reports
  (queue + dismiss, dismissed rows dimmed, "Restore shelter" shortcut on hidden-shelter
  rows), Alerts (M3 abuse alerts), Users (accounts, suspend / unsuspend), Audit log (the
  moderation trail) — all on the existing tokens with 48px action targets.
  `npx ng test` green — **953 tests across 45 spec files** (counted 2026-09-15). The
  pack's own context files also describe the later waves: community-review-queue,
  abuse-limits, provenance-taxonomy, entry-verification-meta, location-navigation,
  open-status, moderation-dashboard.
