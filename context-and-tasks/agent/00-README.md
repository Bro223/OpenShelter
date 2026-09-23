# Shelter Map — AI Agent Build Pack

## What this is

Step-by-step build instructions + context files for an AI coding agent that will implement the
**Shelter Map** backend (Spring Boot), one reviewable step at a time.

The **UML diagrams** (the `context-and-tasks/` folder — `../` relative to this file) are the source of truth for structure (classes, method
signatures, relationships, packages). The files in this folder add the **decisions, rationale,
conventions, and build order** that the diagrams don't carry.

## Status

The build is complete through the **admin-moderation wave** (post-step-7 additions):
steps 0–6 (core, verification, auth, ingestion, shelter API) plus the trust &
reports layer (V9) and the env-provisioned admin + moderation API (V10, `/admin/*`).
`mvn test` is green — **788 tests / 0 failures** (latest run 2026-09-15; 464 was the
2026-09-12 count at the end of the admin-moderation wave). This pack is now also a
reference: every context file and diagram below reflects the implemented reality.
The pack does NOT cover the later waves — the crisis-guidance subsystem
(`V23__crisis_guidance.sql`, `ee.sheltermap.guidance`, the guidance/media controllers,
the public `GET /api/guidance/**` and `/api/media/**` routes), the V22 open-status layer
and the V20 mark-inaccurate layer.

## Folder map

| File | Purpose |
|---|---|
| `01-TASK.md` | **The task contract.** Read this first — project goal, stack, rules, conventions. |
| `02-CONTEXT-DOMAIN.md` | Domain core: users (incl. `AdminUser`), verification claims, policy, shelter, reviews, trust entities — reports (incl. `dismissedAt`), occupancy, status flag (from `01` puml). |
| `03-CONTEXT-VERIFICATION.md` | Verification providers & service (from `01` puml). |
| `04-CONTEXT-AUTH.md` | Password login, JWT sessions, password reset, the env-provisioned `AdminSeeder` (admin-moderation D1) (from `03` puml). |
| `05-CONTEXT-INGESTION.md` | Registry ingestion (from `04` puml). |
| `06-CONTEXT-API.md` | Shelter API: read/write + community reviews + the trust layer (reports, occupancy, filters, V9) + the admin moderation surface (`/admin/*`, D3/D4) (from `05` puml). |
| `07-STEPS.md` | The ordered build plan — steps 0–6 with acceptance criteria and stop points, plus the post-step-7 trust & reports + admin-moderation additions. |

## Source-of-truth UML

`../01-user-verification.puml` … `../05-shelter-api.puml` (i.e. `context-and-tasks/`)
(render with `../render.sh`; PNGs land in `../out/`).

## How to run the agent (one step at a time)

1. Give the agent: `01-TASK.md` + `00-README.md` + the **context file(s)** and **puml file(s)**
   referenced by the step (each step in `07-STEPS.md` lists its inputs).
2. Tell it **which step number** to execute (e.g. "do Step 2").
3. The agent builds **only that step**, runs the tests, reports what it created, and **stops**.
4. You review the diff manually. On approval, run the next step.

## The hard rule

**One step per run.** The agent must never continue past the requested step, never "improve"
unrelated code, and never start the next step without an explicit go-ahead. This is what lets you
check and build every file manually.
