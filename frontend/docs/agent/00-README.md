# OpenShelter Frontend — AI Agent Build Pack

## What this is

Step-by-step build instructions + context files for an AI coding agent that will implement the
**OpenShelter frontend** (Angular SPA), one reviewable milestone at a time — the exact mirror of
the backend pack in `context-and-tasks/agent/`.

The **PlantUML diagrams** (`*.puml` in this folder) are the source of truth for structure
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
| `05-CONTEXT-MAP.md`            | Map & browse: Leaflet wrapper, public shelter list, source filter (M4).                                |
| `06-CONTEXT-SHELTER.md`        | Shelter detail, reviews (upsert), verified-only submission (M5). Polish & prod build (M6) notes.       |
| `07-STEPS.md`                  | The ordered build plan — milestones M0–M6 with acceptance criteria and stop points.                    |

## Source-of-truth UML

`01-frontend-architecture.puml` … `05-shelter-review-flow.puml` in this folder
(render with `./render.sh`; PNGs + SVGs land in `out/` — same script as the backend pack).

| Diagram                             | Content                                                              | Used by    |
| ----------------------------------- | -------------------------------------------------------------------- | ---------- |
| `01-frontend-architecture.puml`     | Layering (core/gateways/features/shared), classes, guards, route map | every step |
| `02-auth-flow.puml`                 | register/login/silent-refresh/401-handling/logout sequence           | M1–M2      |
| `03-verification-account-flow.puml` | verify + cross-channel contact change                                | M3         |
| `04-map-browse-flow.puml`           | public list + Leaflet map + filter                                   | M4         |
| `05-shelter-review-flow.puml`       | detail, review upsert, verified submission                           | M5         |

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
- **M5 (shelter detail, reviews & submission)** — DONE: public detail (incl. static
  Location map) + reviews (upsert,
  delete own), verified-only `/submit` (map point picking, in-Estonia pre-check) → 201 →
  detail.
- **M6 (polish, hardening & prod build)** — DONE: design tokens (`styles.scss` + audit
  spec), 375px reflow, route titles + favicon, loading/empty/error audit, production
  `environment.ts`, documented bundle budget (initial 530.5 kB → 560 kB warning),
  README rewritten, full manual E2E (headless Chromium driver, zero console errors).
  See `openspec/changes/frontend-m6-polish-prod/`.
