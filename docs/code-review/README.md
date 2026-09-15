# Code review — multi-agent run (2026-09-08)

Full-repo, review-only code review of OpenShelter, completed **2026-09-08** at
commit `44d7bae` (M3 committed; 271 backend tests and 329 frontend tests
green, `tsc` clean). No file was modified by any review agent; the fix
campaign that executes the agreed batches runs separately and documents
itself here (see [Fix campaign](#fix-campaign-to-follow)).

## Structure

1 main orchestrator agent + 4 lead (parent) review agents + 13 child review
agents = 18 agents. All 17 non-orchestrator agents ran on the free local
model `hpc-vllm/Qwen3.8-27B` (vLLM); the orchestrator ran on DeepSeek.

| Lead | Sub-scopes (one child each) |
|---|---|
| backend | auth & account · shelter & review domain/API · persistence & ingestion · test quality |
| frontend | core & state · map & shelter · account & contributions · shared, styles & test quality |
| architecture | backend layering & config · frontend architecture · API contract + docs consistency |
| security | authn/authz & IDOR · codes, brute force & rates · input, transport & data exposure |

Full tree with runIds (provenance):
[review-process.md](review-process.md#agent-tree--runids).

## Method (summary)

Each lead first grounded itself in the repo's agent doc packs
(`context-and-tasks/agent/`, `frontend/docs/agent/`), then spawned its
children via `subagent_spawn` with self-contained briefs (explicit model
param, type review, cwd = repo root), waited via `subagent_wait_all`, and
**independently re-verified every high/med claim against source** before
consolidating. The orchestrator deduplicated across leads and agreed the
fix priority batches P0–P4. Full methodology:
[review-process.md](review-process.md).

## Outcome (summary only)

~90 findings after cross-lead dedup — **4 high**, many med, many low — plus
nits; 3 false positives dropped with written reasons. Per-area verdicts:
backend pass-with-issues, frontend no blocking defects, architecture sound
(docs drift concentrated in the docs), security fail in the
codes/rate-limiting area (remaining sub-areas pass).

## Detailed output (gitignored)

The full verbatim reports — all 4 lead reports + the cross-lead dedup — are
preserved in `2026-09-08-review-output.md` in this folder. That file is
**gitignored and not part of the repository**: it documents vulnerabilities
that were unfixed in-tree at the time of writing, with actionable detail,
and the remote's visibility could not be verified from the authoring
environment. Evidence, decision rule, and decision:
[review-process.md](review-process.md#git-push-safety-analysis). This
committed README therefore carries no finding detail beyond the
count/severity summary above.

## Fix campaign (to follow)

A separate fix campaign (its own subagent tree) executes the P0–P4 batches.
It will document itself in this folder:

- `fix-process.md` — how the fix campaign ran (written by the fix orchestrator).
- `2026-09-08-fix-log.md` — per-issue fix log; **gitignored**, same
  sensitivity class as the review output (listed in the local `.gitignore`).

## How to re-run a similar review

See [review-process.md](review-process.md#re-running-a-similar-review).
Short form: freeze a green baseline → spawn one lead per area with the lead
brief (ground in the agent doc packs → spawn 3–4 children with
self-contained briefs → wait in ≤960 s windows → re-verify every high/med
claim → dedupe and verdict) → cross-lead dedup + P0–P4 at orchestrator
level → preserve the verbatim output (gitignored) and refresh this README.
